const express = require("express");
const router = express.Router();
const adminController = require("../controller/adminController");
const AdminAuth = require("../authentication/adminAuth");

// ==================== AUTHENTICATION ROUTES ====================
// Note: Login route is not protected by authentication middleware
router.post("/login", async (req, res, next) => {
  try {
    console.log("📥 Admin login route hit");
    await AdminAuth.login(req, res);
  } catch (error) {
    console.error("❌ Error in admin login route wrapper:", error);
    next(error); // Pass to global error handler
  }
});

// Admin logout (no auth required)
router.post("/logout", AdminAuth.logout);

// Apply authentication middleware to all other admin routes
router.use(AdminAuth.authenticateAdmin);
router.use(AdminAuth.requireAdmin);

// Test routes removed for production
// router.post("/system/test-session", adminController.testSystemLockWithSession);
// router.patch("/organizations/:orgId/temperature-session", adminController.setOrganizationTemperatureWithSession);
// router.patch("/acs/:acId/temperature-session", adminController.setACTemperatureWithSession);

// ==================== MANAGER MANAGEMENT ROUTES ====================
// Create a new manager
router.post("/managers", adminController.createManager);

// Unused routes - commented for production
// router.get("/managers", adminController.getManagers); // Not used - only /my-managers is used
// router.get("/managers/:managerId", adminController.getManagerDetails); // Not used in frontend
// router.patch("/managers/:managerId/status", adminController.toggleManagerStatus); // Not used in frontend

// Lock manager (admin-specific)
router.post("/managers/lock", adminController.lockManager);

// Unlock manager (admin-specific)
router.post("/managers/unlock", adminController.unlockManager);

// Restricted unlock manager (admin-specific) - allows login but restricts actions
router.post(
  "/managers/restricted-unlock",
  adminController.restrictedUnlockManager
);

// Get admin's managers only
router.get("/my-managers", adminController.getMyManagers);

// Unused route - commented for production
// router.post("/assign-organization", adminController.assignOrganizationToManager); // Not used - only unassign is used

// Unassign organization from manager (undo assignment)
router.post(
  "/unassign-organization",
  adminController.unassignOrganizationFromManager
);

// Assign multiple organizations to manager
router.post(
  "/managers/:managerId/assign",
  adminController.assignManagerToOrganizations
);

// Assign multiple venues to manager
router.post(
  "/managers/:managerId/assign-venues",
  adminController.assignManagerToVenues
);

// ==================== ORGANIZATION MANAGEMENT ROUTES ====================
// Lock organization (Admin-controlled)
router.post(
  "/organizations/:organizationId/lock",
  adminController.lockOrganization
);

// Unlock organization (Admin-controlled)
router.post(
  "/organizations/:organizationId/unlock",
  adminController.unlockOrganization
);

// Remote lock organization (Remote lock all devices in organization)
router.post(
  "/organizations/:organizationId/remote-lock",
  adminController.remoteLockOrganization
);

// Remote unlock organization (Remote unlock all devices in organization)
router.post(
  "/organizations/:organizationId/remote-unlock",
  adminController.remoteUnlockOrganization
);
// Create new organization
router.post("/organizations", adminController.createOrganization);

// Get all organizations under this admin
router.get("/organizations", adminController.getOrganizations);

// Get specific organization details
router.get(
  "/organizations/:organizationId",
  adminController.getOrganizationDetails
);

// Delete organization with cascade deletion
router.delete(
  "/organizations/:organizationId",
  adminController.deleteOrganization
);

// Note: Organization suspension functionality has been removed
// Organizations can only be active or split

// ==================== VENUE MANAGEMENT ROUTES ====================
// Get all venues under this admin
router.get("/venues", adminController.getVenues);

// Get specific venue details
router.get("/venues/:venueId", adminController.getVenueDetails);

// Create new venue
router.post("/venues", adminController.createVenue);

// Delete venue with cascade deletion
router.delete("/venues/:venueId", adminController.deleteVenue);

// Remote lock venue (Remote lock all devices in venue)
router.post("/venues/:venueId/remote-lock", adminController.remoteLockVenue);

// Remote unlock venue (Remote unlock all devices in venue)
router.post(
  "/venues/:venueId/remote-unlock",
  adminController.remoteUnlockVenue
);

// ==================== AC MANAGEMENT ROUTES ====================
// Create new AC device
router.post("/acs", adminController.createACDevice);

// Get all ACs under this admin (through organizations)
router.get("/acs", adminController.getACs);

// Get specific AC details
router.get("/acs/:acId", adminController.getACDetails);

// Delete AC device with cascade deletion
router.delete("/acs/:acId", adminController.deleteACDevice);

// Unused route - commented for production
// router.get("/organizations/:organizationId/acs", adminController.getACsByOrganization); // Not used in frontend

// Lock/Unlock AC
router.patch("/acs/:acId/status", adminController.toggleACStatus);

// Lock/Unlock AC device (separate from power status)
router.patch("/acs/:acId/lock", adminController.toggleACLockStatus);

// Set organization temperature (admin control)
router.patch(
  "/organizations/:orgId/temperature",
  adminController.setOrganizationTemperature
);

// Toggle organization power (ON/OFF) - admin control
router.patch(
  "/organizations/:organizationId/power",
  adminController.toggleOrganizationPower
);

// Toggle venue power (ON/OFF) - admin control (power control moved to Venue)
router.patch("/venues/:venueId/power", adminController.toggleVenuePower);

// Set venue temperature (admin control)
router.patch(
  "/venues/:venueId/temperature",
  adminController.setVenueTemperature
);

// Set AC temperature (admin control)
router.patch(
  "/acs/:acId/temperature",
  (req, res, next) => {
    console.log(
      "🔔 [ROUTE-MIDDLEWARE] PATCH /admin/acs/:acId/temperature hit!"
    );
    console.log("🔔 [ROUTE-MIDDLEWARE] Params:", req.params);
    console.log("🔔 [ROUTE-MIDDLEWARE] Body:", req.body);
    console.log("🔔 [ROUTE-MIDDLEWARE] Method:", req.method);
    next();
  },
  adminController.setACTemperature
);

// ==================== ENERGY CONSUMPTION ROUTES ====================
// Get AC energy consumption
router.get("/acs/:acId/energy", adminController.getACEnergy);

// Get organization energy consumption
router.get(
  "/organizations/:organizationId/energy",
  adminController.getOrganizationEnergy
);

// Change AC mode (eco/normal/high)
router.patch("/acs/:acId/mode", adminController.setACMode);

// Manually trigger energy calculation for an AC
router.post("/acs/:acId/energy/calculate", adminController.calculateACEnergy);

// ==================== MONITORING & LOGS ROUTES ====================
// Unused routes - commented for production
// router.get("/logs/manager-activity", adminController.getManagerActivityLogs); // Not used in frontend
// router.get("/logs/manager-activity/:managerId", adminController.getManagerActivityLogs); // Not used in frontend

// ==================== NOTIFICATION ROUTES ====================
// Unused route - commented for production
// router.post("/alerts/critical", adminController.sendCriticalAlert); // Not used in frontend

// ==================== DASHBOARD ROUTES ====================
// Get activity logs with filters
router.get("/logs/filter", adminController.getActivityLogs);

// ==================== LOCKING SYSTEM ROUTES ====================
// Lock system from manager access
router.post("/lock/from-manager", adminController.lockSystemFromManager);

// Lock system from remote access
router.post("/lock/from-remote", adminController.lockSystemFromRemote);

// System-wide lock/unlock (admin control)
router.post("/system/lock", adminController.lockSystem);
router.post("/system/unlock", adminController.unlockSystem);
router.get("/system/status", adminController.getSystemStatus);
// Debug/test routes removed for production security
// router.post("/system/test", adminController.testSystemLock);
// router.post("/system/debug", adminController.debugSystemLock);
// router.post("/system/ultra-simple", adminController.ultraSimpleSystemLock);

// Unused route - commented for production
// router.get("/temperature-permission/:acId", adminController.checkTemperaturePermission); // Not used in frontend

// ==================== ALERT ROUTES ====================
// Get active alerts (includes both device and organization alerts)
router.get("/alerts", adminController.getActiveAlerts);
// Check alerts (trigger manual check and request room temperature from ESP)
router.post("/alerts/check", adminController.checkAlerts);
// Unused route - commented for production
// router.post("/acs/:acId/request-room-temp", adminController.requestRoomTemperature); // Not used in frontend

// ==================== DASHBOARD ROUTES ====================
// Get admin dashboard data
router.get("/dashboard", adminController.getDashboardData);

// ==================== ADMIN OVERRIDE ROUTES - SUPERIORITY OVER MANAGER ACTIONS ====================
// Admin can undo any manager's organization split
router.post(
  "/organizations/:organizationId/undo-split",
  adminController.undoManagerOrganizationSplit
);

// Unused route - commented for production
// router.post("/acs/:acId/unlock-manager-lock", adminController.unlockManagerLockedAC); // Not used in frontend

// ==================== EVENT MANAGEMENT ROUTES ====================
// Create event
router.post("/events", adminController.createEvent);

// Get all events
router.get("/events", adminController.getEvents);

// Get single event
router.get("/events/:eventId", adminController.getEvent);

// Start event manually
router.post("/events/:eventId/start", adminController.startEvent);

// Stop event manually
router.post("/events/:eventId/stop", adminController.stopEvent);

// Disable event
router.post("/events/:eventId/disable", adminController.disableEvent);

// Enable event
router.post("/events/:eventId/enable", adminController.enableEvent);

// Update event
router.patch("/events/:eventId", adminController.updateEvent);

// Delete event
router.delete("/events/:eventId", adminController.deleteEvent);

// ==================== TEST ROUTES ====================
// Test routes removed for production
// router.post("/test/hardcode-temperature", adminController.testHardcodeTemperature);

module.exports = router;
