// SuperAdmin Module - IoTify Super Admin System
// This module provides complete super admin functionality for the ACKit IoT system

const superAdminController = require("./controller/superadminController");
const superAdminRoutes = require("./routes/superadminRoutes");
const superAdminAuth = require("./authentication/superAdminAuth");
const suspensionService = require("./services/suspensionService");
const notificationService = require("../../realtimes/email/superadminNotifications");

module.exports = {
  // Controller functions
  controller: superAdminController,

  // API Routes
  routes: superAdminRoutes,

  // Authentication middleware
  auth: superAdminAuth,

  // Services
  suspensionService: suspensionService,
  notificationService: notificationService,

  // Main functionality
  SuperAdmin: {
    // View-only access functions
    getAllAdmins: superAdminController.getAllAdmins,
    getAllManagers: superAdminController.getAllManagers,
    getAllOrganizations: superAdminController.getAllOrganizations,
    getAllVenues: superAdminController.getAllVenues,
    getAllACs: superAdminController.getAllACs,
    getAdminDetails: superAdminController.getAdminDetails,

    // Admin management functions
    suspendAdmin: superAdminController.suspendAdmin,
    resumeAdmin: superAdminController.resumeAdmin,

    // Activity logging
    getActivityLogs: superAdminController.getActivityLogs,

    // Authentication
    login: superAdminAuth.login,
    authenticate: superAdminAuth.authenticateSuperAdmin,
    requireSuperAdmin: superAdminAuth.requireSuperAdmin,
  },
};
