const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const SuperAdmin = require("../../../models/Roleaccess/superadmin");

// In-memory token store (you can replace this with database later)
const tokenStore = new Map();

class SuperAdminAuth {
  // Generate JWT token
  static generateToken(superAdmin) {
    return jwt.sign(
      {
        id: superAdmin.id,
        email: superAdmin.email,
        role: "superadmin",
      },
      process.env.JWT_SECRET ||
        (() => {
          throw new Error("JWT_SECRET environment variable is required");
        })(),
      { expiresIn: "24h" }
    );
  }

  // Store token on backend and create session
  static createSession(req, superAdmin) {
    try {
      // Check if session exists
      if (!req.session) {
        throw new Error("Session middleware not configured");
      }

      console.log("🔐 Creating session - Initial session state:", req.session);
      console.log("🔐 Creating session - Session ID:", req.sessionID);

      // Generate JWT token
      const token = this.generateToken(superAdmin);

      // Generate unique session ID
      const sessionId = uuidv4();

      // Store token on backend with session ID
      tokenStore.set(sessionId, {
        token: token,
        userId: superAdmin.id,
        userRole: "superadmin",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        lastUsed: new Date(),
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      // Store only session ID in session (not the token)
      req.session.sessionId = sessionId;
      req.session.user = {
        id: superAdmin.id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: "superadmin",
      };

      console.log(
        `✅ Session created for SuperAdmin: ${superAdmin.email} (ID: ${sessionId})`
      );
      console.log(`✅ Session data:`, req.session);
      console.log(`✅ Session cookie ID:`, req.sessionID);
      console.log(`✅ Token store size:`, tokenStore.size);

      // Mark session as modified to ensure it gets saved
      if (req.session.touch) {
        req.session.touch();
      }

      // Force session to be saved immediately
      return new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("❌ Error saving session:", err);
            reject(err);
          } else {
            console.log("✅ Session saved successfully");
            console.log(`✅ After save - Session data:`, req.session);
            resolve(sessionId);
          }
        });
      });
    } catch (error) {
      console.error("❌ Error creating session:", error);
      throw error;
    }
  }

  // Get token from backend using session ID
  static getTokenFromSession(sessionId) {
    const sessionData = tokenStore.get(sessionId);
    if (!sessionData) return null;

    // Check if token is expired
    if (new Date() > sessionData.expiresAt) {
      tokenStore.delete(sessionId);
      return null;
    }

    // Update last used
    sessionData.lastUsed = new Date();

    return sessionData.token;
  }

  // Verify JWT token
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    } catch (error) {
      throw new Error("Invalid token");
    }
  }

  // Authentication middleware
  static async authenticateSuperAdmin(req, res, next) {
    try {
      console.log("🔐 SuperAdmin Auth - Checking session...");
      console.log("🔐 Session exists:", !!req.session);
      console.log("🔐 Session ID:", req.session?.sessionId);
      console.log("🔐 Session user:", req.session?.user);
      console.log("🔐 Full session object:", req.session);
      console.log("🔐 Session cookie:", req.sessionID);

      // Check if session exists and has session ID
      if (!req.session || !req.session.sessionId || !req.session.user) {
        console.log("❌ No valid session found");
        return res.status(401).json({
          success: false,
          message: "Access denied. Please login first.",
        });
      }

      // Get JWT token from backend using session ID
      const token = SuperAdminAuth.getTokenFromSession(req.session.sessionId);
      if (!token) {
        // Clear invalid session
        req.session.destroy();
        return res.status(401).json({
          success: false,
          message: "Session expired. Please login again.",
        });
      }

      // Verify JWT token
      const decoded = SuperAdminAuth.verifyToken(token);

      // Check if user has superadmin role
      if (decoded.role !== "superadmin") {
        return res.status(403).json({
          success: false,
          message: "Access denied. SuperAdmin role required.",
        });
      }

      // Verify superadmin still exists in database
      const superAdmin = await SuperAdmin.findByPk(decoded.id);
      if (!superAdmin || !superAdmin.isActive) {
        // Clear invalid session and token
        tokenStore.delete(req.session.sessionId);
        req.session.destroy();
        return res.status(401).json({
          success: false,
          message: "Invalid token or super admin not found.",
        });
      }

      // Add super admin info to request
      req.user = superAdmin;

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Authentication error.",
        error: error.message,
      });
    }
  }

  // Super admin login
  static async login(req, res) {
    try {
      console.log("🔐 SuperAdmin Login - Starting login process...");
      console.log("🔐 Login request body:", req.body);
      console.log("🔐 Login session state:", req.session);

      const { email, password } = req.body || {};

      if (!email || !password) {
        console.log("❌ Login failed - Missing email or password");
        return res.status(400).json({
          success: false,
          message: "Email and password are required.",
        });
      }

      // Find super admin by email
      console.log(`🔍 Searching for SuperAdmin with email: ${email}`);
      const superAdmin = await SuperAdmin.findOne({ where: { email } });

      if (!superAdmin) {
        console.log(`❌ SuperAdmin not found with email: ${email}`);
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
      }

      console.log(`✅ SuperAdmin found: ${superAdmin.name} (ID: ${superAdmin.id}, Active: ${superAdmin.isActive})`);

      // Check if super admin is active
      if (!superAdmin.isActive) {
        console.log(`❌ SuperAdmin account is deactivated`);
        return res.status(401).json({
          success: false,
          message: "Super admin account is deactivated.",
        });
      }

      // Compare password using bcrypt
      console.log(`🔐 Verifying password...`);
      const isPasswordValid = await bcrypt.compare(
        password,
        superAdmin.password
      );

      console.log(`🔐 Password valid: ${isPasswordValid}`);

      if (!isPasswordValid) {
        console.log(`❌ Password verification failed`);
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
      }

      // Update last login
      await superAdmin.update({ lastLogin: new Date() });

      // Create session with backend-stored token
      console.log("🔐 Creating session for SuperAdmin:", superAdmin.email);
      let sessionId;
      try {
        sessionId = await SuperAdminAuth.createSession(req, superAdmin);
        console.log("✅ Session created successfully - Session ID:", sessionId);
      } catch (sessionError) {
        console.error("❌ Session creation error:", sessionError);
        console.error("❌ Session error stack:", sessionError.stack);
        return res.status(500).json({
          success: false,
          message: "Failed to create session. Please try again.",
          error: sessionError.message,
        });
      }

      // Mark session as modified to ensure it gets saved
      req.session.sessionId = sessionId;
      req.session.user = {
        id: superAdmin.id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: "superadmin",
      };
      
      // Force session to be saved
      req.session.save((err) => {
        if (err) {
          console.error("❌ Error saving session before response:", err);
        } else {
          console.log("✅ Session saved before response");
        }
      });

      // Ensure session is saved one more time before response
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("❌ Final SuperAdmin session save error:", err);
            reject(err);
          } else {
            console.log("✅ Final SuperAdmin session save completed before response");
            console.log("✅ Session ID after save:", req.sessionID);
            console.log("✅ Session data after save:", req.session);
            resolve();
          }
        });
      });

      // Touch session to refresh expiration
      if (req.session.touch) {
        req.session.touch();
      }

      console.log("🔐 Login response - Session ID:", sessionId);
      console.log("🔐 Login response - Session cookie:", req.sessionID);
      console.log("🔐 Login response - Session data:", req.session);
      console.log("🔐 Login response - Session cookie settings:", req.session.cookie);
      
      // Manually ensure cookie is set in response headers
      // This is a workaround for cross-origin cookie issues
      const cookieValue = req.sessionID;
      const cookieOptions = req.session.cookie;
      const cookieString = `ackit.sid=${cookieValue}; Path=${cookieOptions.path || '/'}; Max-Age=${Math.floor(cookieOptions.maxAge / 1000)}; HttpOnly; ${cookieOptions.secure ? 'Secure;' : ''} SameSite=${cookieOptions.sameSite || 'Lax'}`;
      
      console.log("🔐 Login response - Setting cookie manually:", cookieString);
      res.setHeader('Set-Cookie', cookieString);
      
      // Also let express-session set it (will override if needed)
      console.log("🔐 Login response - Response headers (before send):", {
        'set-cookie': res.getHeader('set-cookie'),
        'all-headers': Object.keys(res.getHeaders())
      });

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          user: {
            id: superAdmin.id,
            name: superAdmin.name,
            email: superAdmin.email,
            role: "superadmin",
            lastLogin: superAdmin.lastLogin,
          },
          sessionId: sessionId, // Only for debugging, not used by frontend
        },
      });
      
      // Log after response is sent
      console.log("🔐 Login response - Response sent, cookie should be set");
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Login failed",
        error: error.message,
      });
    }
  }

  // Logout method
  static logout(req, res) {
    // Clear backend token if session exists
    if (req.session && req.session.sessionId) {
      tokenStore.delete(req.session.sessionId);
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Error logging out",
        });
      }

      res.clearCookie("ackit.sid"); // Clear session cookie
      return res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    });
  }

  // Clean expired tokens (utility method)
  static cleanExpiredTokens() {
    const now = new Date();
    for (const [sessionId, sessionData] of tokenStore.entries()) {
      if (now > sessionData.expiresAt) {
        tokenStore.delete(sessionId);
      }
    }
  }

  // Get all active sessions (for debugging)
  static getActiveSessions() {
    const activeSessions = [];
    for (const [sessionId, sessionData] of tokenStore.entries()) {
      if (new Date() <= sessionData.expiresAt) {
        activeSessions.push({
          sessionId,
          userId: sessionData.userId,
          userRole: sessionData.userRole,
          createdAt: sessionData.createdAt,
          lastUsed: sessionData.lastUsed,
          expiresAt: sessionData.expiresAt,
        });
      }
    }
    return activeSessions;
  }

  // Test session endpoint for frontend verification
  static testSession(req, res) {
    try {
      console.log("🔍 SuperAdmin Test Session - Checking session...");
      console.log("🔍 Session exists:", !!req.session);
      console.log("🔍 Session ID:", req.session?.sessionId);
      console.log("🔍 Session user:", req.session?.user);

      // Check if session exists and has session ID
      if (!req.session || !req.session.sessionId || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: "No valid session found",
        });
      }

      // Get JWT token from backend using session ID
      const token = SuperAdminAuth.getTokenFromSession(req.session.sessionId);
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Session expired",
        });
      }

      // Verify JWT token
      const decoded = SuperAdminAuth.verifyToken(token);

      res.json({
        success: true,
        message: "Session is valid",
        data: {
          user: req.session.user,
          sessionId: req.session.sessionId,
          tokenValid: true,
        },
      });
    } catch (error) {
      console.error("❌ Test session error:", error);
      res.status(500).json({
        success: false,
        message: "Session test failed",
        error: error.message,
      });
    }
  }

  // Check if user is super admin (for additional security)
  static requireSuperAdmin(req, res, next) {
    if (req.user && req.user.role === "superadmin") {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: "Access denied. Super admin privileges required.",
      });
    }
  }
}

module.exports = SuperAdminAuth;
