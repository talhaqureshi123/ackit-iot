// Admin Module - IoTify Admin System
// This module provides complete admin functionality for the ACKit IoT system

const adminController = require("./controller/adminController");
const adminRoutes = require("./routes/adminRoutes");
const adminAuth = require("./authentication/adminAuth");
const managerService = require("./services/managerService");
const organizationService = require("./services/organizationService");
const acService = require("./services/acService");
const notificationService = require("./services/notificationService");

module.exports = {
  // Controller functions
  controller: adminController,

  // API Routes
  routes: adminRoutes,

  // Authentication middleware
  auth: adminAuth,

  // Services
  managerService: managerService,
  organizationService: organizationService,
  acService: acService,
  notificationService: notificationService,

  // Main functionality
  Admin: {
    // Manager management functions
    createManager: adminController.createManager,
    getManagers: adminController.getManagers,
    getManagerDetails: adminController.getManagerDetails,
    toggleManagerStatus: adminController.toggleManagerStatus,

    // Organization management functions
    getOrganizations: adminController.getOrganizations,
    getOrganizationDetails: adminController.getOrganizationDetails,
    toggleOrganizationStatus: adminController.toggleOrganizationStatus,

    // AC management functions
    getACs: adminController.getACs,
    getACDetails: adminController.getACDetails,
    getACsByOrganization: adminController.getACsByOrganization,
    toggleACStatus: adminController.toggleACStatus,

    // Monitoring and logs
    getManagerActivityLogs: adminController.getManagerActivityLogs,

    // Notifications
    sendCriticalAlert: adminController.sendCriticalAlert,

    // Dashboard
    getDashboardData: adminController.getDashboardData,

    // Authentication
    login: adminController.loginAdmin,
    authenticate: adminAuth.authenticateAdmin,
    requireAdmin: adminAuth.requireAdmin,
  },
};
