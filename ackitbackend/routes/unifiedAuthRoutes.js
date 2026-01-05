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
    const isLocalhost =
      requestOrigin.includes("localhost") ||
      requestOrigin.includes("127.0.0.1");
    const isRailway =
      requestOrigin.includes(".railway.app") ||
      requestOrigin.includes(".up.railway.app");
    const isProduction = process.env.NODE_ENV === "production";

    console.log("🔐 Unified Login - Cookie settings:");
    console.log("   Request origin:", requestOrigin);
    console.log("   Is localhost:", isLocalhost);
    console.log("   Is Railway:", isRailway);
    console.log("   Is production:", isProduction);

    // Determine cookie settings based on origin
    let cookieSecure = false;
    let cookieSameSite = "lax";

    if (isLocalhost) {
      cookieSecure = false;
      cookieSameSite = "lax";
      console.log(
        "🔐 Unified Login - Setting cookie for localhost (no Secure, SameSite=Lax)"
      );
    } else if (isRailway && !isLocalhost) {
      cookieSecure = true;
      cookieSameSite = "none";
      console.log(
        "🔐 Unified Login - Setting cookie for Railway frontend (Secure, SameSite=None)"
      );
    } else if (isProduction && !isLocalhost) {
      cookieSecure = true;
      cookieSameSite = "none";
      console.log(
        "🔐 Unified Login - Setting cookie for production (Secure, SameSite=None)"
      );
    } else {
      // Development: Backend on Railway, Frontend on localhost
      cookieSecure = false;
      cookieSameSite = "lax";
      console.log(
        "🔐 Unified Login - Setting cookie for development (local frontend, Railway backend)"
      );
    }

    // Explicitly set the session cookie
    res.cookie(cookieName, req.sessionID, {
      path: "/",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      domain: undefined, // Don't set domain for cross-origin
    });

    console.log(
      `🔐 Unified Login - Cookie set: ${cookieName}=${req.sessionID}`
    );
    console.log("🔐 Unified Login - Cookie settings:", {
      secure: cookieSecure,
      sameSite: cookieSameSite,
      httpOnly: true,
      path: "/",
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
