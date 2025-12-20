const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

// Import database connection and models
require("../../../config/database/postgresql");
require("../../../models");

const Admin = require("../../../models/Roleaccess/admin");

// In-memory token store for admins (you can replace this with database later)
const adminTokenStore = new Map();

class AdminAuth {
  // Generate JWT token for admin
  static generateToken(admin) {
    return jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: "admin",
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );
  }

  // Store token on backend and create session
  static async createSession(req, admin) {
    try {
      console.log("🔐 createSession called - Checking session object...");

      // Ensure session exists
      if (!req.session) {
        console.error("❌ No session object available in req.session");
        console.error("   └─ req object keys:", Object.keys(req));
        console.error("   └─ req.session:", req.session);
        throw new Error(
          "Session not available - session middleware may not be configured"
        );
      }

      console.log("✅ Session object found:", !!req.session);

      // Generate JWT token
      const token = this.generateToken(admin);

      // Generate unique session ID
      const sessionId = uuidv4();

      // Store token on backend with session ID
      adminTokenStore.set(sessionId, {
        token: token,
        userId: admin.id,
        userRole: "admin",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        lastUsed: new Date(),
        ipAddress: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
      });

      // Store only session ID in session (not the token)
      req.session.sessionId = sessionId;
      req.session.user = {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: "admin",
      };

      // Mark session as modified to ensure it gets saved
      if (req.session.touch) {
        req.session.touch();
      }

      // Ensure session is saved and wait for it to complete
      // Handle both callback-based and promise-based session.save
      try {
        console.log("💾 Attempting to save session to database...");
        console.log("   Session cookie ID:", req.sessionID);
        console.log("   Session data to save:", {
          sessionId: req.session.sessionId,
          user: req.session.user,
        });

        if (typeof req.session.save === "function") {
          if (req.session.save.length > 0) {
            // Callback-based (Express 4)
            await new Promise((resolve, reject) => {
              req.session.save((err) => {
                if (err) {
                  console.error("❌ Session save error:", err);
                  console.error("   Error details:", err.message, err.stack);
                  reject(err);
                } else {
                  console.log("✅ Session saved successfully to database");
                  console.log("   Session cookie ID:", req.sessionID);
                  console.log(
                    "   Verify session was saved by checking database"
                  );
                  resolve();
                }
              });
            });
          } else {
            // Promise-based (Express 5)
            await req.session.save();
            console.log("✅ Session saved successfully to database");
            console.log("   Session cookie ID:", req.sessionID);
          }
        } else {
          console.log(
            "⚠️ Session save method not available, session may not persist"
          );
        }

        // Verify session was saved by checking the store
        try {
          const sessionStore = req.app.get("sessionStore");
          if (sessionStore && sessionStore.get) {
            await new Promise((resolve) => {
              sessionStore.get(req.sessionID, (err, savedData) => {
                if (err) {
                  console.error("⚠️ Could not verify session save:", err);
                } else if (savedData) {
                  console.log("✅ Session verified in database:");
                  console.log("   - sessionId:", savedData.sessionId);
                  console.log("   - user:", savedData.user);
                } else {
                  console.error("❌ Session NOT found in database after save!");
                  console.error(
                    "   This means the session was not saved properly!"
                  );
                }
                resolve();
              });
            });
          }
        } catch (verifyError) {
          console.error("⚠️ Error verifying session save:", verifyError);
        }
      } catch (saveError) {
        console.error("❌ Session save error:", saveError);
        throw saveError;
      }

      return sessionId;
    } catch (error) {
      console.error("❌ createSession error:", error);
      throw error;
    }
  }

  // Get token from backend using session ID
  static async getTokenFromSession(sessionId, req = null) {
    console.log("🔍 getTokenFromSession called with sessionId:", sessionId);
    console.log("🔍 adminTokenStore size:", adminTokenStore.size);
    console.log("🔍 adminTokenStore keys:", Array.from(adminTokenStore.keys()));

    const sessionData = adminTokenStore.get(sessionId);
    console.log("🔍 Session data found:", !!sessionData);

    if (!sessionData) {
      console.log("❌ No session data found for sessionId:", sessionId);
      return null;
    }

    // Check if token is expired
    const now = new Date();
    if (now > sessionData.expiresAt) {
      console.log("⚠️ Token expired for sessionId:", sessionId);
      console.log("   Token expired at:", sessionData.expiresAt.toISOString());
      console.log("   Current time:", now.toISOString());

      // ALWAYS try to regenerate if we have ANY valid Express session (don't require specific role check)
      // This prevents accidental logout due to temporary session data inconsistencies
      if (req && req.session && req.session.sessionId === sessionId) {
        console.log("🔄 Regenerating expired token - Express session exists");
        try {
          // Get admin from database to regenerate token using userId from token store
          const Admin = require("../../../models/Roleaccess/admin");
          const admin = await Admin.findByPk(sessionData.userId);

          if (admin && admin.status === "active") {
            // Regenerate token and update session data
            const newToken = this.generateToken(admin);
            const newExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            sessionData.token = newToken;
            sessionData.expiresAt = newExpiration;
            sessionData.lastUsed = new Date();
            adminTokenStore.set(sessionId, sessionData);

            // Ensure Express session user data is correct
            if (
              req.session &&
              (!req.session.user || req.session.user.id !== admin.id)
            ) {
              req.session.user = {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: "admin",
              };
              req.session.save((err) => {
                if (err)
                  console.error(
                    "⚠️ Session save error during token regeneration:",
                    err
                  );
              });
            }

            console.log(
              "✅ Token regenerated successfully for sessionId:",
              sessionId
            );
            console.log("   New expiration:", newExpiration.toISOString());
            return newToken;
          } else {
            console.log(
              "❌ Admin not found or inactive, cannot regenerate token"
            );
            // Only delete if admin is actually inactive - don't delete on temporary errors
            if (!admin) {
              adminTokenStore.delete(sessionId);
              return null;
            }
            // If admin exists but inactive, still don't delete - let authentication middleware handle it
            console.warn(
              "⚠️ Admin inactive but keeping token for session validation"
            );
            return null;
          }
        } catch (error) {
          console.error("❌ Error regenerating token:", error);
          // Don't delete token on error - might be temporary DB issue
          console.warn("⚠️ Keeping expired token due to regeneration error");
          return null;
        }
      } else {
        // No Express session found - this might be a stale token or session cookie mismatch
        console.log("⚠️ No matching Express session found for expired token");
        console.log("   SessionId in token store:", sessionId);
        console.log(
          "   SessionId in Express session:",
          req?.session?.sessionId
        );
        // Don't delete immediately - might be session synchronization issue
        // Let it be handled by authentication middleware which has better context
        return null;
      }
    }

    // Update last used and extend expiration if token is still valid
    sessionData.lastUsed = new Date();

    // Extend token expiration by 24 hours from now (rolling expiration)
    // This prevents tokens from expiring during long operations
    const newExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (newExpiration > sessionData.expiresAt) {
      sessionData.expiresAt = newExpiration;
      adminTokenStore.set(sessionId, sessionData);
      console.log(
        "🔄 Token expiration extended to:",
        newExpiration.toISOString()
      );
    }

    console.log("✅ Token found and valid for sessionId:", sessionId);
    return sessionData.token;
  }

  // Verify JWT token
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    } catch (error) {
      return null;
    }
  }

  // Authenticate admin middleware
  static async authenticateAdmin(req, res, next) {
    try {
      console.log("🔐 Admin Auth - Session check:");
      console.log("- req.session exists:", !!req.session);
      console.log("- req.session.sessionId:", req.session?.sessionId);
      console.log("- req.session.user:", req.session?.user);
      console.log("- req.sessionID:", req.sessionID);
      console.log("- Full req.session:", JSON.stringify(req.session, null, 2));

      // Check if session exists
      if (!req.session) {
        console.log("❌ Session validation failed - no session object");
        return res.status(401).json({
          success: false,
          message: "Access denied. Please login first.",
        });
      }

      // CRITICAL FIX: If session exists but custom data is missing, reload from database
      // This happens when express-session loads a new empty session instead of the one from cookie
      if (req.session && req.sessionID && (!req.session.sessionId || !req.session.user)) {
        console.log("⚠️ Session exists but custom data missing - reloading from store");
        console.log("   Cookie session ID:", req.headers.cookie?.match(/ackit\.sid=([^;]+)/)?.[1]);
        console.log("   req.sessionID:", req.sessionID);
        
        // Extract session ID from cookie header
        const cookieMatch = req.headers.cookie?.match(/ackit\.sid=([^;]+)/);
        const cookieSessionId = cookieMatch ? cookieMatch[1] : null;
        
        // Use cookie session ID if available, otherwise use req.sessionID
        const sessionIdToLoad = cookieSessionId || req.sessionID;
        
        console.log("   Attempting to load session:", sessionIdToLoad);
        
        try {
          const sessionStore = req.app.get("sessionStore");
          if (sessionStore && sessionStore.get) {
            await new Promise((resolve, reject) => {
              sessionStore.get(sessionIdToLoad, (err, sessionData) => {
                if (err) {
                  console.error("❌ Error loading session from store:", err);
                  reject(err);
                } else if (sessionData) {
                  console.log("📦 Session data loaded from store:", {
                    hasSessionId: !!sessionData.sessionId,
                    hasUser: !!sessionData.user,
                    sessionId: sessionData.sessionId,
                    user: sessionData.user
                  });
                  
                  // Restore custom properties
                  if (sessionData.sessionId) {
                    req.session.sessionId = sessionData.sessionId;
                  }
                  if (sessionData.user) {
                    req.session.user = sessionData.user;
                  }
                  
                  // Also ensure req.sessionID is correctly set for express-session
                  req.sessionID = sessionIdToLoad;
                  
                  // Mark as modified and save
                  if (req.session.touch) {
                    req.session.touch();
                  }
                  
                  console.log("✅ Session reloaded successfully");
                  console.log("   - sessionId:", req.session.sessionId);
                  console.log("   - user:", req.session.user);
                } else {
                  console.log("❌ No session data found in store for ID:", sessionIdToLoad);
                  console.log("   This means:");
                  console.log("   1. Session was never saved during login");
                  console.log("   2. Session expired or was deleted");
                  console.log("   3. Session ID mismatch");
                }
                resolve();
              });
            });
          } else {
            console.log("⚠️ Session store not available for reload");
          }
        } catch (reloadError) {
          console.error("❌ Failed to reload session:", reloadError);
        }
      }

      // Check if session exists and has session ID after reload attempt
      if (!req.session.sessionId || !req.session.user) {
        console.log(
          "❌ Session validation failed - missing session data after reload attempt"
        );
        console.log("   This usually means:");
        console.log("   1. Session was never saved to the database");
        console.log("   2. Session expired or was deleted");
        console.log("   3. Session cookie ID doesn't match database");
        console.log("   4. PostgreSQL session store connection issue");
        return res.status(401).json({
          success: false,
          message: "Access denied. Please login first.",
        });
      }

      // Get JWT token from backend using session ID (pass req for token regeneration)
      console.log("🔍 Getting token from session ID:", req.session.sessionId);
      const token = await AdminAuth.getTokenFromSession(
        req.session.sessionId,
        req
      );
      console.log("🔍 Token found:", !!token);

      if (!token) {
        console.log("❌ No token found for session ID:", req.session.sessionId);
        console.log(
          "   Checking if token exists in store but validation failed..."
        );

        // Double-check: Maybe token was expired and regeneration failed
        // Try to recover by checking if we have session data
        let sessionData = adminTokenStore.get(req.session.sessionId);
        
        // If token store is empty but session exists (server restart scenario)
        // Regenerate token from session user data
        if (!sessionData && req.session.user && req.session.user.id) {
          console.log("🔄 Token store empty but session exists - regenerating from session user data...");
          try {
            const Admin = require("../../../models/Roleaccess/admin");
            const admin = await Admin.findByPk(req.session.user.id);
            if (admin && admin.status === "active") {
              // Create new session data entry
              const newToken = AdminAuth.generateToken(admin);
              sessionData = {
                token: newToken,
                userId: admin.id,
                userRole: "admin",
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                lastUsed: new Date(),
                ipAddress: req.ip || "unknown",
                userAgent: req.get("User-Agent") || "unknown",
              };
              adminTokenStore.set(req.session.sessionId, sessionData);
              console.log("✅ Token regenerated from session user data");
              
              // Use the regenerated token
              const decoded = AdminAuth.verifyToken(newToken);
              if (decoded && decoded.role === "admin") {
                req.admin = decoded;
                req.token = newToken;
                console.log("✅ Admin authenticated with regenerated token");
                // Touch session to refresh expiration
                if (req.session.touch) {
                  req.session.touch();
                }
                if (req.session.save) {
                  req.session.save((err) => {
                    if (err)
                      console.error(
                        "⚠️ Session save error in authenticateAdmin (non-fatal):",
                        err.message
                      );
                  });
                }
                return next();
              }
            } else {
              console.log("❌ Admin not found or inactive, cannot regenerate token");
              return res.status(401).json({
                success: false,
                message: "Session expired. Please login again.",
              });
            }
          } catch (regenError) {
            console.error("❌ Error regenerating token from session:", regenError);
            return res.status(401).json({
              success: false,
              message: "Session expired. Please login again.",
            });
          }
        }
        
        if (sessionData && req.session.user) {
          console.log("🔄 Attempting emergency token regeneration...");
          try {
            const Admin = require("../../../models/Roleaccess/admin");
            const admin = await Admin.findByPk(
              sessionData.userId || req.session.user.id
            );
            if (admin && admin.status === "active") {
              const newToken = this.generateToken(admin);
              sessionData.token = newToken;
              sessionData.expiresAt = new Date(
                Date.now() + 24 * 60 * 60 * 1000
              );
              sessionData.lastUsed = new Date();
              adminTokenStore.set(req.session.sessionId, sessionData);
              console.log("✅ Emergency token regeneration successful");

              // Use the regenerated token
              const decoded = AdminAuth.verifyToken(newToken);
              if (decoded && decoded.role === "admin") {
                // Continue with authentication instead of returning error
                const admin = await Admin.findByPk(decoded.id);
                if (admin && admin.status === "active") {
                  req.admin = {
                    id: admin.id,
                    email: admin.email,
                    name: admin.name,
                    role: "admin",
                  };
                  if (req.session && req.session.touch) {
                    req.session.touch();
                  }
                  if (req.session && req.session.save) {
                    req.session.save((err) => {
                      if (err)
                        console.error(
                          "⚠️ Session save error (non-fatal):",
                          err.message
                        );
                    });
                  }
                  return next();
                }
              }
            }
          } catch (recoveryError) {
            console.error(
              "❌ Emergency token regeneration failed:",
              recoveryError
            );
          }
        }

        // Only clear session if we truly can't recover
        console.log("❌ No valid token, session must be re-authenticated");
        // DON'T destroy session here - let frontend handle logout gracefully
        return res.status(401).json({
          success: false,
          message: "Session expired. Please login again.",
        });
      }

      // Verify JWT token
      const decoded = AdminAuth.verifyToken(token);

      if (!decoded) {
        // Clear invalid session and token
        adminTokenStore.delete(req.session.sessionId);
        if (req.session && req.session.destroy) {
          req.session.destroy();
        }
        return res.status(401).json({
          success: false,
          message: "Invalid token.",
        });
      }

      // Check if user has admin role
      if (decoded.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin role required.",
        });
      }

      // Check if admin exists and is active
      const admin = await Admin.findByPk(decoded.id);

      if (!admin) {
        // Clear invalid session and token
        adminTokenStore.delete(req.session.sessionId);
        if (req.session && req.session.destroy) {
          req.session.destroy();
        }
        return res.status(401).json({
          success: false,
          message: "Admin not found.",
        });
      }

      if (admin.status !== "active") {
        // Clear session for suspended admin
        adminTokenStore.delete(req.session.sessionId);
        if (req.session && req.session.destroy) {
          req.session.destroy();
        }
        return res.status(401).json({
          success: false,
          message: "Admin account is suspended.",
        });
      }

      // Add admin info to request
      req.admin = {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: "admin",
      };

      // Refresh session to prevent expiration
      if (req.session && req.session.touch) {
        req.session.touch();
      }

      // Explicitly save session after authentication to ensure it persists
      // Use callback (non-blocking) to avoid slowing down requests
      if (req.session && req.session.save) {
        req.session.save((err) => {
          if (err) {
            console.error(
              "⚠️ Session save error in authenticateAdmin (non-fatal):",
              err.message
            );
          }
          // Continue even if save fails - don't block request
        });
      }

      next();
    } catch (error) {
      console.error("Admin authentication error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during authentication.",
      });
    }
  }

  // Admin login
  static async login(req, res) {
    try {
      console.log("🔐 Admin Login - Starting login process...");
      console.log("🔐 Login request body:", req.body);
      console.log("🔐 Login request headers:", req.headers);
      console.log("🔐 Login session state:", req.session);

      const { email, password } = req.body || {};

      if (!email || !password) {
        console.log("❌ Login failed - Missing email or password");
        return res.status(400).json({
          success: false,
          message: "Email and password are required.",
        });
      }

      console.log(`🔐 Attempting login for email: ${email}`);

      // Find admin by email
      console.log(`🔍 Searching for admin with email: ${email}`);
      let admin;
      try {
        admin = await Admin.findOne({ where: { email } });
      } catch (dbError) {
        console.error("❌ Database error finding admin:", dbError);
        throw new Error(`Database error: ${dbError.message}`);
      }

      if (!admin) {
        console.log(`❌ Admin not found with email: ${email}`);
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
      }

      console.log(
        `✅ Admin found: ${admin.name} (ID: ${admin.id}, Status: ${admin.status})`
      );

      // Check if admin is active
      if (admin.status !== "active") {
        console.log(`❌ Admin account status is: ${admin.status}, not active`);
        return res.status(401).json({
          success: false,
          message: "Admin account is suspended.",
        });
      }

      // Verify password
      console.log(`🔐 Verifying password...`);
      let isPasswordValid;
      try {
        if (!admin.password) {
          console.error("❌ Admin password field is null or undefined");
          throw new Error("Admin password not set in database");
        }
        isPasswordValid = await bcrypt.compare(password, admin.password);
      } catch (bcryptError) {
        console.error("❌ Bcrypt error:", bcryptError);
        throw new Error(`Password verification error: ${bcryptError.message}`);
      }

      if (!isPasswordValid) {
        console.log(`❌ Password verification failed for email: ${email}`);
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
      }

      console.log(`✅ Password verified successfully`);

      // Update last login
      try {
        await admin.update({ lastLogin: new Date() });
        console.log(`✅ Last login updated for admin ${admin.id}`);
      } catch (updateError) {
        console.error(
          "⚠️ Failed to update last login (non-critical):",
          updateError
        );
        // Don't fail login if last login update fails
      }

      // Create session with backend-stored token
      console.log(`🔐 Creating session for admin ${admin.id}...`);
      let sessionId;
      try {
        sessionId = await AdminAuth.createSession(req, admin);
      } catch (sessionError) {
        console.error("❌ Session creation error:", sessionError);
        throw new Error(`Session creation failed: ${sessionError.message}`);
      }

      console.log("✅ Admin login successful - Session created:");
      console.log("- Session ID:", sessionId);
      console.log("- req.session:", req.session);
      console.log("- req.sessionID:", req.sessionID);
      console.log(
        "- Session cookie name:",
        req.session?.cookie?.name || "ackit.sid"
      );

      // Double-check session was saved
      if (!req.session.sessionId) {
        console.error("❌ Session ID not found in session after creation!");
        return res.status(500).json({
          success: false,
          message: "Failed to create session",
        });
      }

      // Ensure session is saved one more time before response
      // This ensures cookie is set properly
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("❌ Final session save error:", err);
            reject(err);
          } else {
            console.log("✅ Final session save completed before response");
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

      // Explicitly set the session cookie using res.cookie()
      const cookieName = req.session.cookie.name || 'ackit.sid';
      const cookieOptions = req.session.cookie;

      const requestOrigin = req.headers.origin;
      const isLocalhost = requestOrigin && requestOrigin.includes("localhost");

      console.log("🔐 Login response - Request origin:", requestOrigin);
      console.log("🔐 Login response - Is localhost:", isLocalhost);

      res.cookie(cookieName, req.sessionID, {
        path: cookieOptions.path || '/',
        maxAge: cookieOptions.maxAge,
        httpOnly: cookieOptions.httpOnly !== false,
        secure: isLocalhost ? false : (process.env.NODE_ENV === "production"), // Set secure based on origin
        sameSite: isLocalhost ? "lax" : (process.env.NODE_ENV === "production" ? "none" : "lax"), // Set sameSite based on origin
        domain: undefined,
      });

      console.log(`🔐 Login response - Setting cookie using res.cookie(): ${cookieName}=${req.sessionID}`);
      console.log("🔐 Login response - Cookie set using res.cookie()");

      // Send response with session cookie
      res.status(200).json({
        success: true,
        message: "Admin login successful",
        data: {
          user: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: "admin",
            lastLogin: admin.lastLogin,
          },
          sessionId: sessionId, // Only for debugging, not used by frontend
        },
      });
    } catch (error) {
      console.error("❌ Admin login error:", error);
      console.error("❌ Error stack:", error.stack);
      console.error("❌ Error details:", {
        name: error.name,
        message: error.message,
        code: error.code,
      });
      res.status(500).json({
        success: false,
        message: "Internal server error during login.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Require admin role middleware
  static requireAdmin(req, res, next) {
    if (req.admin && req.admin.role === "admin") {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }
  }

  // Logout method
  static logout(req, res) {
    try {
      // Clear backend token if session exists
      if (req.session && req.session.sessionId) {
        adminTokenStore.delete(req.session.sessionId);
        console.log("✅ Token cleared from store");
      }

      if (req.session && req.session.destroy) {
        req.session.destroy((err) => {
          if (err) {
            console.error("❌ Session destroy error:", err);
            return res.status(500).json({
              success: false,
              message: "Error logging out",
            });
          }

          res.clearCookie("ackit.sid"); // Clear session cookie with correct name
          console.log("✅ Session destroyed and cookie cleared");
          return res.status(200).json({
            success: true,
            message: "Logged out successfully",
          });
        });
      } else {
        // No session to destroy
        res.clearCookie("ackit.sid");
        return res.status(200).json({
          success: true,
          message: "Logged out successfully",
        });
      }
    } catch (error) {
      console.error("❌ Logout error:", error);
      return res.status(500).json({
        success: false,
        message: "Error logging out",
      });
    }
  }

  // Clean expired tokens (utility method)
  static cleanExpiredTokens() {
    const now = new Date();
    let cleaned = 0;
    for (const [sessionId, sessionData] of adminTokenStore.entries()) {
      if (now > sessionData.expiresAt) {
        adminTokenStore.delete(sessionId);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired tokens`);
    }
  }

  // Auto-cleanup expired tokens every 5 minutes
  static startTokenCleanup() {
    setInterval(() => {
      this.cleanExpiredTokens();
    }, 5 * 60 * 1000); // 5 minutes
  }
}

module.exports = AdminAuth;
module.exports.adminTokenStore = adminTokenStore;
