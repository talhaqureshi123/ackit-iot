const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const Manager = require("../../../models/Roleaccess/manager");
const Admin = require("../../../models/Roleaccess/admin");

// In-memory token store for managers (you can replace this with database later)
const managerTokenStore = new Map();

class ManagerAuth {
  // Generate JWT token for manager
  static generateToken(manager) {
    return jwt.sign(
      {
        id: manager.id,
        email: manager.email,
        role: "manager",
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );
  }

  // Store token on backend and create session
  static async createSession(req, manager) {
    try {
      // Ensure session exists
      if (!req.session) {
        console.error("❌ No session object available for manager");
        throw new Error("Session not available");
      }

      // Generate JWT token
      const token = this.generateToken(manager);

      // Generate unique session ID
      const sessionId = uuidv4();

      // Store token on backend with session ID
      managerTokenStore.set(sessionId, {
        token: token,
        userId: manager.id,
        userRole: "manager",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        lastUsed: new Date(),
        ipAddress: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
      });

      // Store only session ID in session (not the token)
      req.session.sessionId = sessionId;
      req.session.user = {
        id: manager.id,
        name: manager.name,
        email: manager.email,
        role: "manager",
      };

      // Mark session as modified to ensure it gets saved
      if (req.session.touch) {
        req.session.touch();
      }

      // Ensure session is saved and wait for it to complete
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("❌ Manager session save error:", err);
            reject(err);
          } else {
            console.log("✅ Manager session saved successfully");
            console.log("   - req.sessionID (express-session ID):", req.sessionID);
            console.log("   - req.session.sessionId (custom ID):", req.session.sessionId);
            console.log("   - req.session.user:", req.session.user);
            
            // Verify session was saved to store
            const sessionStore = req.app?.get("sessionStore");
            if (sessionStore && sessionStore.get) {
              sessionStore.get(req.sessionID, (storeErr, storeData) => {
                if (storeErr) {
                  console.error("❌ Error verifying session in store:", storeErr);
                } else if (storeData) {
                  console.log("✅ Session verified in store:", {
                    hasSessionId: !!storeData.sessionId,
                    hasUser: !!storeData.user,
                    sessionId: storeData.sessionId,
                    userRole: storeData.user?.role,
                  });
                } else {
                  console.warn("⚠️ Session not found in store after save!");
                  console.warn("   This might indicate a session store issue.");
                }
                resolve();
              });
            } else {
              console.warn("⚠️ Session store not available for verification");
              resolve();
            }
          }
        });
      });

      return sessionId;
    } catch (error) {
      console.error("❌ Manager createSession error:", error);
      throw error;
    }
  }

  // Get token from backend using session ID
  static getTokenFromSession(sessionId) {
    const sessionData = managerTokenStore.get(sessionId);
    if (!sessionData) return null;

    // Check if token is expired
    if (new Date() > sessionData.expiresAt) {
      managerTokenStore.delete(sessionId);
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

  // Authenticate manager JWT token
  static async authenticateManager(req, res, next) {
    try {
      // Log cookie information first
      const cookieHeader = req.headers.cookie || "";
      const hasAckitSidCookie = cookieHeader.includes("ackit.sid");
      const cookieMatch = cookieHeader.match(/ackit\.sid=([^;]+)/);
      const cookieSessionId = cookieMatch ? cookieMatch[1] : null;
      
      console.log("🔐 Manager Auth - Session check:");
      console.log("- Request URL:", req.method, req.path);
      console.log("- Cookie header exists:", !!cookieHeader);
      console.log("- Cookie header value:", cookieHeader || "(none)");
      console.log("- Has ackit.sid cookie:", hasAckitSidCookie);
      console.log("- Cookie session ID:", cookieSessionId || "(not found)");
      console.log("- req.session exists:", !!req.session);
      console.log("- req.session.sessionId:", req.session?.sessionId);
      console.log("- req.session.user:", req.session?.user);
      console.log("- req.sessionID:", req.sessionID);
      console.log("- req.headers.origin:", req.headers.origin);
      console.log("- req.headers.referer:", req.headers.referer);

      // Check if session exists
      if (!req.session) {
        console.log("❌ Session validation failed - no session object");
        console.log("   This usually means express-session middleware didn't create a session");
        console.log("   Check if cookie was sent and if session middleware is configured correctly");
        return res.status(401).json({
          success: false,
          message: "Access denied. Please login first.",
        });
      }
      
      // If cookie is not being sent, log a warning
      if (!hasAckitSidCookie) {
        console.warn("⚠️ WARNING: ackit.sid cookie not found in request headers!");
        console.warn("   This means the browser is not sending the cookie.");
        console.warn("   Possible reasons:");
        console.warn("   1. Cookie was never set during login");
        console.warn("   2. Cookie was set with wrong attributes (domain, path, SameSite, Secure)");
        console.warn("   3. Browser is blocking the cookie");
        console.warn("   4. Cookie expired or was deleted");
      }

      // CRITICAL FIX: If session exists but custom data is missing, reload from database
      // This happens when express-session loads a new empty session instead of the one from cookie
      if (req.session && req.sessionID && (!req.session.sessionId || !req.session.user)) {
        console.log("⚠️ Session exists but custom data missing - reloading from store");
        
        // Extract session ID from cookie (might be different from req.sessionID if express-session created new session)
        const cookieMatch = req.headers.cookie?.match(/ackit\.sid=([^;]+)/);
        const cookieSessionIdRaw = cookieMatch ? cookieMatch[1] : null;
        
        // Remove URL encoding and signature prefix if present (s:UUID.signature -> UUID)
        let cookieSessionId = cookieSessionIdRaw;
        if (cookieSessionIdRaw) {
          try {
            cookieSessionId = decodeURIComponent(cookieSessionIdRaw);
            // Remove signature prefix if present (format: s:UUID.signature)
            if (cookieSessionId.startsWith('s:')) {
              cookieSessionId = cookieSessionId.split('.')[0].substring(2);
            }
          } catch (e) {
            // If decoding fails, use raw value
            cookieSessionId = cookieSessionIdRaw;
          }
        }
        
        console.log("   Cookie session ID (raw):", cookieSessionIdRaw);
        console.log("   Cookie session ID (parsed):", cookieSessionId);
        console.log("   req.sessionID (express-session):", req.sessionID);
        
        // Try both session IDs - cookie's ID first (the actual session), then req.sessionID
        const sessionIdsToTry = [];
        if (cookieSessionId && cookieSessionId !== req.sessionID) {
          sessionIdsToTry.push(cookieSessionId); // Try cookie's session ID first
        }
        sessionIdsToTry.push(req.sessionID); // Then try express-session's ID
        
        console.log("   Will try session IDs in order:", sessionIdsToTry);
        
        try {
          const sessionStore = req.app.get("sessionStore");
          if (sessionStore && sessionStore.get) {
            let sessionFound = false;
            
            for (const sessionIdToLoad of sessionIdsToTry) {
              if (sessionFound) break;
              
              await new Promise((resolve) => {
                sessionStore.get(sessionIdToLoad, (err, sessionData) => {
                  if (err) {
                    console.error(`❌ Error loading session with ID ${sessionIdToLoad}:`, err.message);
                    resolve();
                  } else if (sessionData) {
                    console.log(`✅ Session found in store with ID: ${sessionIdToLoad}`);
                    console.log("📦 Session data loaded from store:", {
                      hasSessionId: !!sessionData.sessionId,
                      hasUser: !!sessionData.user,
                      sessionId: sessionData.sessionId,
                      user: sessionData.user,
                      allKeys: Object.keys(sessionData || {}),
                    });
                    
                    // Note: If sessionIdToLoad !== req.sessionID, it means express-session created a new session
                    // We'll restore the data to the current session, which will work for authentication
                    if (sessionIdToLoad !== req.sessionID) {
                      console.log(`   ⚠️ Session ID mismatch: cookie has ${sessionIdToLoad}, but req.sessionID is ${req.sessionID}`);
                      console.log(`   → Restoring data to current session (${req.sessionID})`);
                    }
                    
                    // Restore custom properties
                    if (sessionData.sessionId) {
                      req.session.sessionId = sessionData.sessionId;
                    }
                    if (sessionData.user) {
                      req.session.user = sessionData.user;
                    }
                    
                    // Mark as modified and save to ensure it persists
                    if (req.session.touch) {
                      req.session.touch();
                    }
                    
                    // Save the session again to ensure it's persisted
                    req.session.save((saveErr) => {
                      if (saveErr) {
                        console.error("❌ Error saving reloaded session:", saveErr);
                      } else {
                        console.log("✅ Session reloaded and re-saved successfully");
                        console.log("   - sessionId:", req.session.sessionId);
                        console.log("   - user:", req.session.user);
                      }
                      sessionFound = true;
                      resolve();
                    });
                  } else {
                    console.log(`❌ No session found in store for ID: ${sessionIdToLoad}`);
                    resolve();
                  }
                });
              });
            }
            
            if (!sessionFound) {
              console.log("❌ No session data found in store for any of the tried IDs");
              console.log("   This means:");
              console.log("   1. Session was never saved during login");
              console.log("   2. Session expired or was deleted");
              console.log("   3. Session ID mismatch");
              console.log("   → User needs to login again");
            }
          } else {
            console.log("⚠️ Session store not available for reload");
            console.log("   req.app exists:", !!req.app);
            console.log("   sessionStore exists:", !!req.app?.get("sessionStore"));
          }
        } catch (reloadError) {
          console.error("❌ Failed to reload session:", reloadError);
          console.error("   Error stack:", reloadError.stack);
        }
      }

      // Check if session exists and has session ID after reload attempt
      if (!req.session.sessionId || !req.session.user) {
        console.log("❌ Session validation failed - missing session data after reload attempt");
        return res.status(401).json({
          success: false,
          message: "Access denied. Please login first.",
        });
      }

      // Get JWT token from backend using session ID
      let token = ManagerAuth.getTokenFromSession(req.session.sessionId);
      
      // If token not found but session exists (server restart scenario)
      // Regenerate token from session user data
      if (!token && req.session.user && req.session.user.id) {
        console.log("🔄 Token store empty but session exists - regenerating from session user data...");
        try {
          const Manager = require("../../../models/Roleaccess/manager");
          const manager = await Manager.findByPk(req.session.user.id, {
            include: [{
              model: require("../../../models/Roleaccess/admin"),
              as: 'admin',
              attributes: ['id', 'name', 'email', 'status']
            }]
          });
          
          if (manager && manager.status !== "locked") {
            // Check if admin is suspended
            if (manager.admin && manager.admin.status === "suspended") {
              req.session.destroy();
              return res.status(403).json({
                success: false,
                message: "Access denied. Your administrator account has been suspended.",
              });
            }
            
            // Create new session data entry
            const newToken = this.generateToken(manager);
            const sessionData = {
              token: newToken,
              userId: manager.id,
              userRole: "manager",
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
              lastUsed: new Date(),
              ipAddress: req.ip || "unknown",
              userAgent: req.get("User-Agent") || "unknown",
            };
            managerTokenStore.set(req.session.sessionId, sessionData);
            token = newToken;
            console.log("✅ Manager token regenerated from session user data");
          } else {
            console.log("❌ Manager not found or locked, cannot regenerate token");
            req.session.destroy();
            return res.status(401).json({
              success: false,
              message: "Session expired. Please login again.",
            });
          }
        } catch (regenError) {
          console.error("❌ Error regenerating manager token from session:", regenError);
          req.session.destroy();
          return res.status(401).json({
            success: false,
            message: "Session expired. Please login again.",
          });
        }
      }
      
      if (!token) {
        // Clear invalid session
        req.session.destroy();
        return res.status(401).json({
          success: false,
          message: "Session expired. Please login again.",
        });
      }

      // Verify JWT token
      const decoded = ManagerAuth.verifyToken(token);

      // Check if user has manager role
      if (decoded.role !== "manager") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Manager role required.",
        });
      }

      const manager = await Manager.findByPk(decoded.id, {
        include: [{
          model: Admin,
          as: 'admin',
          attributes: ['id', 'name', 'email', 'status']
        }]
      });

      if (!manager) {
        // Clear invalid session and token
        managerTokenStore.delete(req.session.sessionId);
        req.session.destroy();
        return res.status(401).json({
          success: false,
          message: "Invalid token. Manager not found.",
        });
      }

      // Block managers if their admin is suspended
      if (manager.admin && manager.admin.status === "suspended") {
        console.log(
          `❌ Manager ${manager.email} access blocked - admin (${manager.admin.email}) is suspended`
        );
        // Invalidate session
        if (req.session && req.session.sessionId) {
          managerTokenStore.delete(req.session.sessionId);
        }
        req.session.destroy();
        return res.status(403).json({
          success: false,
          message: "Access denied. Your administrator account has been suspended. Please contact support.",
          adminSuspended: true,
        });
      }

      // Block locked managers from accessing any resources
      if (manager.status === "locked") {
        console.log(
          "❌ Manager is locked - invalidating session and blocking access"
        );
        // Invalidate session
        if (req.session && req.session.sessionId) {
          managerTokenStore.delete(req.session.sessionId);
        }
        req.session.destroy();
        return res.status(403).json({
          success: false,
          message: "Your account has been locked by an administrator. Please contact support.",
          accountLocked: true,
        });
      }

      req.manager = manager;
      next();
    } catch (error) {
      console.error("Manager authentication error:", error);
      res.status(500).json({
        success: false,
        message: "Authentication error.",
        error: error.message,
      });
    }
  }

  // Require manager role
  static requireManager(req, res, next) {
    if (!req.manager) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Manager role required.",
      });
    }
    next();
  }

  // Manager login
  static async login(req, res) {
    try {
      console.log("🔐 Manager Login - Starting login process...");
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

      console.log(`🔐 Attempting login for email: ${email}`);

      // Find manager by email with admin info - use fresh query to get latest status
      console.log(`🔍 Searching for Manager with email: ${email}`);
      const { Sequelize } = require("sequelize");
      const trimmedEmail = email ? email.trim() : email;
      
      // Try exact match first
      let manager = await Manager.findOne({ 
        where: { email: trimmedEmail },
        include: [{
          model: Admin,
          as: 'admin',
          attributes: ['id', 'name', 'email', 'status']
        }],
        // Force fresh read from database (don't use cache)
        logging: false
      });
      
      // If not found, try case-insensitive search
      if (!manager) {
        console.log(`🔍 Trying case-insensitive search...`);
        manager = await Manager.findOne({ 
          where: Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('Manager.email')),
            trimmedEmail.toLowerCase()
          ),
          include: [{
            model: Admin,
            as: 'admin',
            attributes: ['id', 'name', 'email', 'status']
          }],
          logging: false
        });
      }

      if (!manager) {
        console.log(`❌ Manager not found with email: ${email}`);
        // Log available managers for debugging (only in development or if explicitly enabled)
        // Log available managers for debugging (only in development or if explicitly enabled)
        if (process.env.NODE_ENV !== "production" || process.env.DEBUG_LOG_USERS === "true") {
          try {
            const allManagers = await Manager.findAll({ 
              attributes: ['id', 'email', 'name', 'status'],
              limit: 10 
            });
            console.log(`❌ Available Manager emails in database (${allManagers.length} found):`);
            allManagers.forEach(m => {
              console.log(`   - ${m.email} (${m.name}, Status: ${m.status})`);
            });
          } catch (logError) {
            console.error("⚠️ Could not log available managers:", logError.message);
          }
        }
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
      }

      console.log(`✅ Manager found: ${manager.name} (ID: ${manager.id}, Status: ${manager.status})`);

      // Reload manager to ensure we have the latest status from database
      await manager.reload();

      // Block managers if their admin is suspended
      if (manager.admin && manager.admin.status === "suspended") {
        console.log(
          `❌ Manager ${manager.email} cannot login because their admin (${manager.admin.email}) is suspended`
        );
        return res.status(403).json({
          success: false,
          message: "Access denied. Your administrator account has been suspended. Please contact support.",
          adminSuspended: true,
        });
      }

      // Block locked managers from logging in
      if (manager.status === "locked") {
        console.log(
          "❌ Manager is locked and cannot login"
        );
        return res.status(403).json({
          success: false,
          message: "Your account has been locked by an administrator. Please contact support.",
          accountLocked: true,
        });
      }

      // Verify password
      console.log("🔍 Password Debug:");
      console.log("   - Manager ID:", manager.id);
      console.log("   - Manager email:", manager.email);
      console.log("   - Manager status:", manager.status);
      console.log("   - Input password:", password ? "***" : "null");
      console.log("   - Stored password hash:", manager.password ? manager.password.substring(0, 20) + "..." : "null");
      console.log("   - Password length:", manager.password ? manager.password.length : 0);
      console.log("   - Is bcrypt hash?", manager.password ? manager.password.startsWith("$2b$") : false);

      // Check if password is stored as plaintext (shouldn't happen, but handle it)
      if (!manager.password || manager.password.length < 20) {
        console.error("❌ Manager password is not properly hashed!");
        return res.status(500).json({
          success: false,
          message: "Manager password is not properly configured. Please contact administrator.",
        });
      }

      let isPasswordValid = false;
      try {
        // Trim password to remove any whitespace
        const trimmedPassword = password ? password.trim() : password;
        console.log("   - Input password length:", password ? password.length : 0);
        console.log("   - Trimmed password length:", trimmedPassword ? trimmedPassword.length : 0);
        console.log("   - Has whitespace:", password ? (password !== password.trim()) : false);
        
        isPasswordValid = await bcrypt.compare(trimmedPassword, manager.password);
        console.log("   - Password valid?", isPasswordValid);
        
        // If failed, try with original password (in case trimming was the issue)
        if (!isPasswordValid && password !== trimmedPassword) {
          console.log("   - Retrying with original password (no trim)...");
          isPasswordValid = await bcrypt.compare(password, manager.password);
          console.log("   - Password valid (retry)?", isPasswordValid);
        }
      } catch (bcryptError) {
        console.error("❌ Bcrypt compare error:", bcryptError);
        console.error("❌ Bcrypt error stack:", bcryptError.stack);
        return res.status(500).json({
          success: false,
          message: "Error verifying password. Please try again.",
        });
      }

      if (!isPasswordValid) {
        console.log("❌ Password validation failed for manager:", email);
        console.log("❌ Manager found but password doesn't match");
        console.log("❌ Manager ID:", manager.id, "Name:", manager.name, "Status:", manager.status);
        
        const errorResponse = {
          success: false,
          message: "Invalid email or password.",
        };
        
        // Always include debug info to help frontend distinguish between "not found" and "wrong password"
        try {
          errorResponse.debug = {
            message: "Email found but password is incorrect.",
            managerEmail: manager?.email || email,
            managerStatus: manager?.status || 'unknown',
            managerId: manager?.id || 'unknown',
            emailExists: true, // Key flag: email exists in manager table
            hint: "Email is registered as MANAGER. Check if you're using the correct password."
          };
        } catch (debugError) {
          console.error("❌ Error creating debug info:", debugError);
          errorResponse.debug = {
            message: "Email found but password is incorrect.",
            emailExists: true,
            hint: "Email is registered as MANAGER. Check if you're using the correct password."
          };
        }
        
        return res.status(401).json(errorResponse);
      }

      console.log("✅ Password validated successfully for manager:", email);

      // Check if session object exists
      if (!req.session) {
        console.error("❌ No session object available for manager login");
        return res.status(500).json({
          success: false,
          message: "Session initialization failed. Please try again.",
        });
      }

      // Create session with backend-stored token
      let sessionId;
      try {
        sessionId = await ManagerAuth.createSession(req, manager);
        
        if (!sessionId) {
          console.error("❌ Failed to create session for manager:", email);
          return res.status(500).json({
            success: false,
            message: "Failed to create session. Please try again.",
          });
        }
        
        console.log("✅ Manager login successful - Session created:");
        console.log("- Session ID:", sessionId);
        console.log("- req.session exists:", !!req.session);
        console.log("- req.session.sessionId:", req.session?.sessionId);
        console.log("- req.session.user:", req.session?.user);
        console.log("- req.sessionID:", req.sessionID);
        console.log("- Session cookie name:", req.session?.cookie?.name || "ackit.sid");
        
        // Double-check session was saved
        if (!req.session.sessionId) {
          console.error("❌ Session ID not found in session after creation!");
          return res.status(500).json({
            success: false,
            message: "Failed to create session",
          });
        }
        
      } catch (sessionError) {
        console.error("❌ Session creation error:", sessionError);
        console.error("❌ Session error stack:", sessionError.stack);
        return res.status(500).json({
          success: false,
          message: "Failed to create session. Please try again.",
          error: sessionError.message,
        });
      }

      // Ensure session is saved one final time before response
      // This ensures cookie is set properly
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("❌ Final manager session save error:", err);
            reject(err);
          } else {
            console.log("✅ Final manager session save completed before response");
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

      const requestOrigin = req.headers.origin || req.headers.referer || '';
      const isLocalhost = requestOrigin.includes("localhost") || requestOrigin.includes("127.0.0.1");
      const isRailway = requestOrigin.includes('.railway.app') || requestOrigin.includes('.up.railway.app');
      const isProduction = process.env.NODE_ENV === "production";

      console.log("🔐 Login response - Request origin:", requestOrigin);
      console.log("🔐 Login response - Is localhost:", isLocalhost);
      console.log("🔐 Login response - Is Railway:", isRailway);
      console.log("🔐 Login response - Is production:", isProduction);

      // Determine cookie settings based on origin
      let cookieSecure = false;
      let cookieSameSite = 'lax';
      
      if (isLocalhost) {
        cookieSecure = false;
        cookieSameSite = 'lax';
        console.log("🔐 Login response - Setting cookie for localhost (no Secure)");
      } else if (isRailway || isProduction) {
        cookieSecure = true;
        cookieSameSite = "none";
        console.log("🔐 Login response - Setting cookie for Railway/production (Secure, SameSite=None)");
      } else {
        cookieSecure = isProduction;
        cookieSameSite = isProduction ? "none" : "lax";
        console.log("🔐 Login response - Setting cookie with fallback settings");
      }

      res.cookie(cookieName, req.sessionID, {
        path: cookieOptions.path || '/',
        maxAge: cookieOptions.maxAge,
        httpOnly: cookieOptions.httpOnly !== false,
        secure: cookieSecure,
        sameSite: cookieSameSite,
        domain: undefined,
      });

      console.log(`🔐 Login response - Setting cookie using res.cookie(): ${cookieName}=${req.sessionID}`);
      console.log("🔐 Login response - Cookie set using res.cookie()");

      res.status(200).json({
        success: true,
        message:
          manager.status === "restricted" || manager.status === "locked"
            ? "Manager login successful (Restricted access)"
            : "Manager login successful",
        data: {
          user: {
            id: manager.id,
            name: manager.name,
            email: manager.email,
            role: "manager",
            status: manager.status,
          },
          sessionId: sessionId, // Only for debugging, not used by frontend
        },
      });
    } catch (error) {
      console.error("Manager login error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error during login.",
      });
    }
  }

  // Logout method
  static logout(req, res) {
    // Clear backend token if session exists
    if (req.session && req.session.sessionId) {
      managerTokenStore.delete(req.session.sessionId);
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Error logging out",
        });
      }

      res.clearCookie("ackit.sid"); // Clear session cookie with correct name
      return res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    });
  }

  // Check if manager has unrestricted access (only "unlocked" account status allowed)
  // 
  // IMPORTANT SEPARATION OF CONCEPTS:
  // 1. MANAGER ACCOUNT STATUS (Admin-controlled: locked/unlocked/restricted)
  //    - This middleware checks manager.account.status field
  //    - Admin controls whether manager can login and perform actions
  //
  // 2. REMOTE ACCESS LOCK (Manager-controlled when account is "unlocked")
  //    - This is a SEPARATE feature that managers can use to lock remote access
  //    - Only managers with "unlocked" account status can lock/unlock remote access
  //
  // This middleware ensures that only managers with "unlocked" account status can perform
  // restricted actions like locking/unlocking remote access, managing ACs, etc.
  // Managers with "restricted" or "locked" account status are blocked from these actions.
  static requireUnrestrictedManager(req, res, next) {
    if (!req.manager) {
      return res.status(401).json({
        success: false,
        message: "Manager authentication required.",
      });
    }

    // Only "unlocked" account status managers can perform restricted actions
    // "restricted" account status: managers can login and view but cannot perform actions
    // "locked" account status: managers cannot login at all
    //
    // NOTE: This checks MANAGER ACCOUNT STATUS (not remote access lock)
    // Remote access lock is a separate feature that unlocked managers can control
    if (
      req.manager.status === "restricted" ||
      req.manager.status === "locked"
    ) {
      const statusMsg = req.manager.status === "locked" 
        ? "Your account has been locked by an administrator." 
        : "Your account has restricted access.";
        
      return res.status(403).json({
        success: false,
        message: `${statusMsg} Contact admin for full permissions to perform this action.`,
        restricted: true,
        managerStatus: req.manager.status,
      });
    }

    // Manager account status is "unlocked" - allow access to restricted actions
    // (including the ability to lock/unlock remote access)
    next();
  }

  // Combined authentication for admin or manager
  static async authenticateAdminOrManager(req, res, next) {
    try {
      console.log("🔐 Admin or Manager Auth - Session check:");
      console.log("- req.session exists:", !!req.session);
      console.log("- req.session.sessionId:", req.session?.sessionId);
      console.log("- req.session.user:", req.session?.user);
      console.log("- req.sessionID:", req.sessionID);

      // Check if admin is logged in
      if (
        req.session &&
        req.session.user &&
        req.session.user.role === "admin"
      ) {
        console.log("✅ Admin session found, setting req.admin");
        req.admin = req.session.user;
        return next();
      }

      // Check if manager is logged in
      if (
        req.session &&
        req.session.user &&
        req.session.user.role === "manager"
      ) {
        console.log("✅ Manager session found, loading full manager object");
        // Load full manager object with status for restriction checks
        const manager = await Manager.findByPk(req.session.user.id, {
          include: [{
            model: Admin,
            as: 'admin',
            attributes: ['id', 'name', 'email', 'status']
          }]
        });
        
        if (!manager) {
          return res.status(401).json({
            success: false,
            message: "Manager not found. Please login again.",
          });
        }
        
        req.manager = manager;
        return next();
      }

      // No valid session found
      console.log("❌ No valid admin or manager session found");
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login as admin or manager.",
      });
    } catch (error) {
      console.error("Admin or Manager authentication error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during authentication.",
      });
    }
  }

  // Require admin or manager role
  static requireAdminOrManager(req, res, next) {
    if (!req.admin && !req.manager) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin or Manager role required.",
      });
    }
    next();
  }

  // Require unrestricted manager or admin
  static requireUnrestrictedManagerOrAdmin(req, res, next) {
    if (!req.admin && !req.manager) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    // Admin has full access
    if (req.admin) {
      return next();
    }

    // Check manager restrictions
    if (req.manager) {
      if (
        req.manager.status === "restricted" ||
        req.manager.status === "locked"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Manager account has restricted access. Contact admin for full permissions.",
          restricted: true,
        });
      }
    }

    next();
  }

  // Invalidate all sessions for a specific manager
  static invalidateManagerSessions(managerId) {
    let invalidatedCount = 0;
    for (const [sessionId, sessionData] of managerTokenStore.entries()) {
      if (sessionData.userId === managerId) {
        managerTokenStore.delete(sessionId);
        invalidatedCount++;
        console.log(`🗑️ Invalidated manager session: ${sessionId} for manager ${managerId}`);
      }
    }
    console.log(`✅ Invalidated ${invalidatedCount} session(s) for manager ${managerId}`);
    return invalidatedCount;
  }

  // Invalidate all sessions for all managers under a specific admin
  static async invalidateAllManagerSessionsForAdmin(adminId) {
    try {
      // Find all managers under this admin
      const managers = await Manager.findAll({
        where: { adminId: adminId },
        attributes: ['id', 'email']
      });

      let totalInvalidated = 0;
      
      // Invalidate all tokens for managers under this admin
      for (const manager of managers) {
        const count = this.invalidateManagerSessions(manager.id);
        totalInvalidated += count;
      }

      // Note: Express sessions will be automatically destroyed on next request attempt
      // because:
      // 1. Tokens are removed from managerTokenStore (invalidated above)
      // 2. authenticateManager middleware checks admin status on every request
      // 3. If admin is suspended or token not found, session is destroyed immediately
      
      console.log(`✅ Invalidated ${totalInvalidated} token(s) for ${managers.length} manager(s) under admin ${adminId}`);
      console.log(`🔒 Manager sessions will expire immediately on next request attempt`);

      return { 
        managersAffected: managers.length, 
        sessionsInvalidated: totalInvalidated,
        message: "Manager tokens invalidated. Sessions will expire on next request."
      };
    } catch (error) {
      console.error(`❌ Error invalidating manager sessions for admin ${adminId}:`, error);
      throw error;
    }
  }
}

module.exports = ManagerAuth;
