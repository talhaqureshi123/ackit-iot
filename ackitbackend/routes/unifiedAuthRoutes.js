/**
 * Unified Authentication Routes
 *
 * This provides a single login endpoint that automatically detects
 * user role (admin, superadmin, manager) from email and authenticates.
 *
 * Endpoint: POST /api/auth/login
 */

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { Sequelize } = require("sequelize");

// Import models (with associations loaded)
require("../models"); // Load all models and associations
const SuperAdmin = require("../models/Roleaccess/superadmin");
const Admin = require("../models/Roleaccess/admin");
const Manager = require("../models/Roleaccess/manager");

// Import auth classes for token generation
const AdminAuth = require("../rolebaseaccess/admin/authentication/adminAuth");
const SuperAdminAuth = require("../rolebaseaccess/superadmin/authentication/superAdminAuth");
const ManagerAuth = require("../rolebaseaccess/manager/authentication/managerAuth");

/**
 * Unified Login - Auto-detect role from email
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post("/login", async (req, res) => {
  try {
    console.log("🔐 Unified Login - Starting...");
    console.log("🔐 Login request body:", {
      email: req.body?.email,
      password: "***",
    });

    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    console.log(`🔍 Searching for user with email: ${trimmedEmail}`);

    // Search in all three tables (order: superadmin, admin, manager)
    let user = null;
    let userRole = null;
    let userType = null;

    // Search in all three tables (order: superadmin, admin, manager)
    // IMPORTANT: Check ALL tables, don't stop early

    // 1. Check SuperAdmin
    console.log("🔍 [1/3] Checking SuperAdmin table...");
    try {
      let superAdmin = await SuperAdmin.findOne({
        where: Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("email")),
          trimmedEmail.toLowerCase()
        ),
      });

      if (superAdmin) {
        console.log("✅ Found in SuperAdmin table");
        console.log(
          `   SuperAdmin ID: ${superAdmin.id}, Email: ${superAdmin.email}`
        );
        user = superAdmin;
        userRole = "superadmin";
        userType = "SuperAdmin";
      } else {
        console.log("   ❌ Not found in SuperAdmin table");
      }
    } catch (superAdminError) {
      console.error(
        "❌ Error checking SuperAdmin table:",
        superAdminError.message
      );
      // Continue to check other tables
    }

    // 2. Check Admin (only if not found in SuperAdmin)
    if (!user) {
      console.log("🔍 [2/3] Checking Admin table...");
      try {
        let admin = await Admin.findOne({
          where: Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("email")),
            trimmedEmail.toLowerCase()
          ),
        });

        if (admin) {
          console.log("✅ Found in Admin table");
          console.log(
            `   Admin ID: ${admin.id}, Email: ${admin.email}, Status: ${admin.status}`
          );
          user = admin;
          userRole = "admin";
          userType = "Admin";
        } else {
          console.log("   ❌ Not found in Admin table");
        }
      } catch (adminError) {
        console.error("❌ Error checking Admin table:", adminError.message);
        // Continue to check Manager table
      }
    } else {
      console.log("   ⏭️ Skipping Admin check (already found in SuperAdmin)");
    }

    // 3. Check Manager (only if not found in SuperAdmin or Admin)
    if (!user) {
      console.log("🔍 [3/3] Checking Manager table...");
      try {
        // First try without include to avoid association errors
        let manager = await Manager.findOne({
          where: Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("email")),
            trimmedEmail.toLowerCase()
          ),
        });

        // If found, get admin info separately if needed
        if (manager) {
          console.log("✅ Found in Manager table");
          console.log(
            `   Manager ID: ${manager.id}, Email: ${manager.email}, Status: ${manager.status}`
          );

          // Get admin info if needed (for status check)
          try {
            if (manager.adminId) {
              const adminInfo = await Admin.findByPk(manager.adminId, {
                attributes: ["id", "name", "email", "status"],
              });
              if (adminInfo) {
                manager.admin = adminInfo;
                console.log(
                  `   Manager's Admin: ${adminInfo.email}, Status: ${adminInfo.status}`
                );
              }
            }
          } catch (adminFetchError) {
            console.warn(
              "⚠️ Could not fetch admin info for manager:",
              adminFetchError.message
            );
            // Non-critical, continue
          }

          user = manager;
          userRole = "manager";
          userType = "Manager";
        } else {
          console.log("   ❌ Not found in Manager table");
        }
      } catch (managerError) {
        console.error("❌ Error checking Manager table:", managerError.message);
        console.error("   Manager error stack:", managerError.stack);
        console.error("   Full error:", managerError);
      }
    } else {
      console.log(
        `   ⏭️ Skipping Manager check (already found in ${userType})`
      );
    }

    // User not found in any table
    if (!user) {
      console.log(
        "❌ User not found in any table (admin, superadmin, manager)"
      );
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
        debug: {
          message: "Email not found in admin, superadmin, or manager tables",
          emailExists: false,
        },
      });
    }

    console.log(`✅ User found as ${userRole} (ID: ${user.id})`);

    // Check account status
    if (userType === "SuperAdmin" && !user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact administrator.",
      });
    }

    if (userType === "Admin" && user.status === "suspended") {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been suspended. Please contact administrator.",
        accountSuspended: true,
      });
    }

    if (userType === "Manager") {
      if (user.status === "locked") {
        return res.status(403).json({
          success: false,
          message:
            "Your account has been locked. Please contact administrator.",
          accountLocked: true,
        });
      }
      if (user.admin && user.admin.status === "suspended") {
        return res.status(403).json({
          success: false,
          message:
            "Your admin account has been suspended. Please contact administrator.",
          adminSuspended: true,
        });
      }
    }

    // Verify password
    console.log("🔐 Verifying password...");
    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(trimmedPassword, user.password);
    } catch (bcryptError) {
      console.error("❌ Bcrypt error:", bcryptError);
      return res.status(500).json({
        success: false,
        message: "Password verification error.",
        error: bcryptError.message,
      });
    }

    if (!isPasswordValid) {
      console.log("❌ Password incorrect");
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
        debug: {
          message: "Password is incorrect",
          emailExists: true,
          role: userRole,
        },
      });
    }

    console.log("✅ Password verified");

    // Generate token and create session based on role
    let token;
    let userData;

    if (userRole === "superadmin") {
      token = SuperAdminAuth.generateToken(user);
      await SuperAdminAuth.createSession(req, user);
      userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: "superadmin",
        status: user.isActive ? "active" : "inactive",
        lastLogin: user.lastLogin,
      };
    } else if (userRole === "admin") {
      token = AdminAuth.generateToken(user);
      await AdminAuth.createSession(req, user);
      userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: "admin",
        status: user.status,
        plan: user.plan || "basic",
        lastLogin: user.lastLogin,
      };
    } else if (userRole === "manager") {
      token = ManagerAuth.generateToken(user);
      await ManagerAuth.createSession(req, user);

      // createSession already saves the session, but verify it's still there
      // and ensure it's persisted before setting cookie
      if (!req.session.sessionId || !req.session.user) {
        console.error("❌ CRITICAL: Session data missing after createSession!");
        console.error("   - req.session.sessionId:", req.session.sessionId);
        console.error("   - req.session.user:", req.session.user);
        throw new Error("Session data not properly saved during login");
      }

      // Verify session is in store (createSession already does this, but double-check)
      const sessionStore = req.app?.get("sessionStore");
      if (sessionStore && sessionStore.get) {
        await new Promise((resolve) => {
          sessionStore.get(req.sessionID, (storeErr, storeData) => {
            if (storeErr) {
              console.error(
                "❌ Error verifying manager session in store:",
                storeErr
              );
            } else if (storeData) {
              console.log("✅ Manager session verified in store:", {
                hasSessionId: !!storeData.sessionId,
                hasUser: !!storeData.user,
                userRole: storeData.user?.role,
                allKeys: Object.keys(storeData || {}),
              });

              // If session data is missing from store, restore it
              if (!storeData.sessionId || !storeData.user) {
                console.warn("⚠️ Session data missing in store, restoring...");
                req.session.sessionId = req.session.sessionId;
                req.session.user = req.session.user;
                req.session.save((saveErr) => {
                  if (saveErr) {
                    console.error("❌ Error re-saving session:", saveErr);
                  } else {
                    console.log("✅ Session data restored and re-saved");
                  }
                  resolve();
                });
              } else {
                resolve();
              }
            } else {
              console.warn(
                "⚠️ Manager session not found in store after createSession!"
              );
              console.warn("   Session ID:", req.sessionID);
              console.warn("   Re-saving session...");
              req.session.save((saveErr) => {
                if (saveErr) {
                  console.error("❌ Error re-saving session:", saveErr);
                } else {
                  console.log("✅ Session re-saved");
                }
                resolve();
              });
            }
          });
        });
      }

      userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: "manager",
        status: user.status,
        adminId: user.adminId,
        organizationId: user.organizationId,
        lastLogin: user.lastLogin,
      };
    }

    // Update lastLogin
    try {
      if (userType === "SuperAdmin") {
        await user.update({ lastLogin: new Date() });
      } else if (userType === "Admin") {
        await user.update({ lastLogin: new Date() });
      } else if (userType === "Manager") {
        await user.update({ lastLogin: new Date() });
      }
    } catch (updateError) {
      console.error("⚠️ Failed to update lastLogin:", updateError);
      // Non-critical, continue
    }

    console.log(`✅ Unified login successful for ${userRole}: ${user.email}`);

    // Explicitly set session cookie (same logic as individual login routes)
    const cookieName = req.session.cookie.name || "ackit.sid";
    const requestOrigin = req.headers.origin || req.headers.referer || "";
    const requestHost = req.headers.host || "";
    const requestUrl = req.url || "";

    // Detect localhost more reliably
    // Check origin, host, and URL for localhost indicators
    const isLocalhostOrigin =
      requestOrigin.includes("localhost") ||
      requestOrigin.includes("127.0.0.1");
    const isLocalhostHost =
      requestHost.includes("localhost") ||
      requestHost.includes("127.0.0.1") ||
      requestHost.includes(":5050");
    const isLocalhostUrl =
      requestUrl.includes("localhost") || requestUrl.includes("127.0.0.1");
    const isLocalhost = isLocalhostOrigin || isLocalhostHost || isLocalhostUrl;

    // Detect Railway
    const isRailwayOrigin =
      requestOrigin.includes(".railway.app") ||
      requestOrigin.includes(".up.railway.app");
    const isRailwayHost =
      requestHost.includes(".railway.app") ||
      requestHost.includes(".up.railway.app");
    const isRailway = isRailwayOrigin || isRailwayHost;

    const isProduction = process.env.NODE_ENV === "production";
    const backendIsHTTPS =
      req.protocol === "https" || req.headers["x-forwarded-proto"] === "https";

    console.log("🔐 Unified Login - Cookie settings:");
    console.log("   Request origin:", requestOrigin);
    console.log("   Request host:", requestHost);
    console.log("   Request URL:", requestUrl);
    console.log("   Is localhost (origin):", isLocalhostOrigin);
    console.log("   Is localhost (host):", isLocalhostHost);
    console.log("   Is localhost (url):", isLocalhostUrl);
    console.log("   Is localhost (combined):", isLocalhost);
    console.log("   Is Railway:", isRailway);
    console.log("   Is production:", isProduction);
    console.log("   Backend is HTTPS:", backendIsHTTPS);
    console.log("   Protocol:", req.protocol);
    console.log("   X-Forwarded-Proto:", req.headers["x-forwarded-proto"]);

    // Determine cookie settings based on origin
    // CRITICAL: For cross-origin requests, we need SameSite=None and Secure=true
    // This handles both local development (localhost -> Railway) and production (Railway -> Railway)
    let cookieSecure = false;
    let cookieSameSite = "lax";

    // PRIORITY 1: If backend host is localhost (regardless of origin), use localhost settings
    // This handles Vite proxy cases where origin might be different
    if (isLocalhostHost || (!backendIsHTTPS && isLocalhost)) {
      cookieSecure = false;
      cookieSameSite = "lax";
      console.log(
        "🔐 Unified Login - [LOCAL] Same-origin (localhost backend detected): Secure=false, SameSite=Lax"
      );
      console.log(
        "   Note: Using localhost settings because backend host is localhost"
      );
    }
    // Case 1: Cross-origin - localhost frontend -> HTTPS Railway backend (Development)
    else if (isLocalhost && backendIsHTTPS) {
      cookieSecure = true;
      cookieSameSite = "none";
      console.log(
        "🔐 Unified Login - [DEV] Cross-origin (localhost -> Railway HTTPS): Secure=true, SameSite=None"
      );
    }
    // Case 2: Same-origin - localhost frontend -> localhost backend (Local Development)
    // NOTE: Even if ports differ (3000 vs 5050), if using Vite proxy, it's same-origin
    else if (isLocalhost && !backendIsHTTPS) {
      cookieSecure = false;
      cookieSameSite = "lax";
      console.log(
        "🔐 Unified Login - [LOCAL] Same-origin (localhost -> localhost): Secure=false, SameSite=Lax"
      );
      console.log(
        "   Note: If frontend uses Vite proxy (/api), requests are same-origin and cookies work with SameSite=Lax"
      );
    }
    // Case 3: Production - Railway frontend -> Railway backend (Same-origin or cross-subdomain)
    else if (isRailway || (isProduction && backendIsHTTPS)) {
      cookieSecure = true;
      cookieSameSite = "none";
      console.log(
        "🔐 Unified Login - [PROD] Railway/Production (HTTPS): Secure=true, SameSite=None"
      );
    }
    // Case 4: Fallback - Use secure settings if backend is HTTPS
    else {
      cookieSecure = backendIsHTTPS;
      cookieSameSite = backendIsHTTPS ? "none" : "lax";
      console.log(
        `🔐 Unified Login - [FALLBACK] Secure=${cookieSecure}, SameSite=${cookieSameSite}`
      );
    }

    // Update session cookie settings BEFORE saving (so express-session uses correct settings)
    if (req.session && req.session.cookie) {
      req.session.cookie.secure = cookieSecure;
      req.session.cookie.sameSite = cookieSameSite;
      req.session.cookie.httpOnly = true;
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours
      req.session.cookie.path = "/";
      req.session.cookie.domain = undefined;
    }

    // Mark session as modified to ensure it gets saved
    req.session.touch();

    // Ensure session is saved (express-session will automatically set the cookie)
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error("❌ Final unified session save error:", err);
          reject(err);
        } else {
          console.log("✅ Final unified session save completed");
          console.log("   - Session ID:", req.sessionID);
          console.log("   - Session data saved:", {
            hasSessionId: !!req.session.sessionId,
            hasUser: !!req.session.user,
            userRole: req.session.user?.role,
          });
          console.log("   - Cookie settings:", {
            secure: cookieSecure,
            sameSite: cookieSameSite,
            httpOnly: true,
          });
          resolve();
        }
      });
    });

    // Verify cookie was set in response headers
    const setCookieHeader = res.getHeader("set-cookie");
    const allHeaders = res.getHeaders();

    console.log(
      `🔐 Unified Login - Cookie set: ${cookieName}=${req.sessionID}`
    );
    console.log("🔐 Unified Login - Cookie settings:", {
      secure: cookieSecure,
      sameSite: cookieSameSite,
      httpOnly: true,
      path: "/",
      domain: undefined,
      maxAge: 24 * 60 * 60 * 1000,
    });
    console.log("🔐 Unified Login - Set-Cookie header:", setCookieHeader);
    console.log(
      "🔐 Unified Login - All response headers:",
      Object.keys(allHeaders)
    );

    // Verify the Set-Cookie header contains the expected values
    if (setCookieHeader) {
      const setCookieStr = Array.isArray(setCookieHeader)
        ? setCookieHeader.join("; ")
        : setCookieHeader;
      console.log("🔐 Unified Login - Set-Cookie string:", setCookieStr);
      console.log(
        "🔐 Unified Login - Cookie contains Secure:",
        setCookieStr.includes("Secure")
      );
      console.log(
        "🔐 Unified Login - Cookie contains SameSite:",
        setCookieStr.includes("SameSite")
      );
      console.log(
        "🔐 Unified Login - Cookie contains HttpOnly:",
        setCookieStr.includes("HttpOnly")
      );
      console.log(
        "🔐 Unified Login - Cookie contains Path:",
        setCookieStr.includes("Path=")
      );
    } else {
      console.error("❌ Unified Login - Set-Cookie header is missing!");
      console.error("   This means the cookie was not set in the response.");
      console.error("   Check if res.cookie() was called correctly.");
    }

    console.log("🔐 Unified Login - Session data:", {
      sessionId: req.session.sessionId,
      userId: req.session.user?.id,
      userRole: req.session.user?.role,
    });
    console.log("🔐 Unified Login - Session cookie object:", {
      secure: req.session.cookie?.secure,
      sameSite: req.session.cookie?.sameSite,
      httpOnly: req.session.cookie?.httpOnly,
      path: req.session.cookie?.path,
      domain: req.session.cookie?.domain,
    });

    return res.status(200).json({
      success: true,
      message: `Login successful. Welcome, ${user.name}!`,
      token,
      user: userData,
      role: userRole, // Explicit role for frontend
    });
  } catch (error) {
    console.error("❌ Unified login error:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      success: false,
      message: "Internal server error during login.",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
});

module.exports = router;
