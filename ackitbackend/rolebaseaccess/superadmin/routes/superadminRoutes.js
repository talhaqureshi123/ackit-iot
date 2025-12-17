const express = require("express");
const router = express.Router();
const superAdminController = require("../controller/superadminController");
const superAdminAuth = require("../authentication/superAdminAuth");

// AUTHENTICATION ROUTES
// Super Admin login (no auth required)
router.post("/login", superAdminController.loginSuperAdmin);

// Super Admin logout (no auth required)
router.post("/logout", superAdminAuth.logout);

// Test session endpoint (no auth required)
router.get("/test-session", superAdminAuth.testSession);

// Apply authentication middleware to all other routes
router.use(superAdminAuth.authenticateSuperAdmin);

// ADMIN MANAGEMENT ROUTES
// Create a new admin
router.post("/admins", superAdminController.createAdmin);

// VIEW-ONLY ACCESS ROUTES
// Get all admins (view-only)
router.get("/admins", superAdminController.getAllAdmins);

// Get specific admin details (view-only)
router.get("/admins/:adminId", superAdminController.getAdminDetails);

// ADMIN MANAGEMENT ROUTES (continued)
// Suspend an admin (with cascade effect)
router.post("/admins/:adminId/suspend", superAdminController.suspendAdmin);

// Resume an admin (with state restoration)
router.post("/admins/:adminId/resume", superAdminController.resumeAdmin);

// ACTIVITY LOGS ROUTES
// Get activity logs (read-only)
router.get("/logs", superAdminController.getActivityLogs);

// Get activity logs with filters
router.get("/logs/filter", superAdminController.getActivityLogs);

module.exports = router;
