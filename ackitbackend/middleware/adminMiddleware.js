// Admin Middleware - Integration point for all admin functionality
const AdminAuth = require("../rolebaseaccess/admin/authentication/adminAuth");

// Apply admin authentication to routes
const authenticateAdmin = AdminAuth.authenticateAdmin;

// Apply admin role requirement
const requireAdmin = AdminAuth.requireAdmin;

// Combined middleware for admin routes
const adminAuth = [authenticateAdmin, requireAdmin];

module.exports = {
  authenticateAdmin,
  requireAdmin,
  adminAuth,
};
