const express = require("express");
const router = express.Router();
const managerController = require("../controller/managerController");
const ManagerAuth = require("../authentication/managerAuth");

// ==================== AUTHENTICATION ROUTES ====================
// Login route (not protected)
router.post("/login", ManagerAuth.login);

// Manager logout (no auth required)
router.post("/logout", ManagerAuth.logout);

// Temperature control with session auth (no JWT required) - RESTRICTED ACTION
router.patch(
  "/organizations/:organizationId/temperature-session",
  ManagerAuth.authenticateAdminOrManager,
  ManagerAuth.requireUnrestrictedManagerOrAdmin,
  managerController.setOrganizationTemperatureWithSession
);
router.patch(
  "/acs/:acId/temperature-session",
  ManagerAuth.authenticateAdminOrManager,
  ManagerAuth.requireUnrestrictedManagerOrAdmin,
  managerController.setACTemperatureWithSession
);

// Apply authentication middleware to all other routes
router.use(ManagerAuth.authenticateManager);
router.use(ManagerAuth.requireManager);

// ==================== ORGANIZATION MANAGEMENT ROUTES ====================
// Get assigned organizations (manager only sees assigned ones) - READ ONLY
router.get("/organizations", managerController.getAssignedOrganizations);

// Get organization details - READ ONLY
router.get(
  "/organizations/:organizationId",
  managerController.getOrganizationDetails
);

// Split organization into multiple organizations - RESTRICTED ACTION
router.post(
  "/organizations/:organizationId/split",
  ManagerAuth.requireUnrestrictedManager,
  managerController.splitOrganization
);

// Undo organization split (merge back) - RESTRICTED ACTION
router.post(
  "/organizations/:organizationId/undo-split",
  ManagerAuth.requireUnrestrictedManager,
  managerController.undoOrganizationSplit
);

// Set temperature for entire organization - RESTRICTED ACTION
// Allow both admin and manager access
router.patch(
  "/organizations/:organizationId/temperature",
  ManagerAuth.authenticateAdminOrManager,
  ManagerAuth.requireUnrestrictedManagerOrAdmin,
  managerController.setOrganizationTemperature
);

// Toggle organization power (ON/OFF) - RESTRICTED ACTION
// Allow both admin and manager access (unlocked managers only)
router.patch(
  "/organizations/:organizationId/power",
  ManagerAuth.authenticateAdminOrManager,
  ManagerAuth.requireUnrestrictedManagerOrAdmin,
  managerController.toggleOrganizationPower
);

// Remote lock organization (Remote lock all devices in organization) - RESTRICTED ACTION
router.post(
  "/organizations/:organizationId/remote-lock",
  ManagerAuth.requireUnrestrictedManager,
  managerController.remoteLockOrganization
);

// Remote unlock organization (Remote unlock all devices in organization) - RESTRICTED ACTION
router.post(
  "/organizations/:organizationId/remote-unlock",
  ManagerAuth.requireUnrestrictedManager,
  managerController.remoteUnlockOrganization
);

// Note: Organization suspension functionality has been removed
// Organizations can only be active or split

// ==================== AC DEVICE MANAGEMENT ROUTES ====================
// Get all ACs in manager's organizations - READ ONLY
router.get("/acs", managerController.getManagerACs);

// Get AC details - READ ONLY
router.get("/acs/:acId", managerController.getACDetails);

// Set temperature for individual AC device - RESTRICTED ACTION
// Allow both admin and manager access
router.patch(
  "/acs/:acId/temperature",
  ManagerAuth.authenticateAdminOrManager,
  ManagerAuth.requireUnrestrictedManagerOrAdmin,
  managerController.setACTemperature
);

// Turn AC on/off - RESTRICTED ACTION
router.patch(
  "/acs/:acId/power",
  ManagerAuth.requireUnrestrictedManager,
  managerController.toggleACPower
);

// Lock/Unlock AC device - RESTRICTED ACTION
router.post(
  "/acs/:acId/lock",
  ManagerAuth.requireUnrestrictedManager,
  managerController.lockAC
);

router.post(
  "/acs/:acId/unlock",
  ManagerAuth.requireUnrestrictedManager,
  managerController.unlockAC
);

// ==================== VENUE MANAGEMENT ROUTES ====================
// Get venue details - READ ONLY
router.get("/venues/:venueId", managerController.getVenueDetails);

// Set temperature for venue - RESTRICTED ACTION
router.patch(
  "/venues/:venueId/temperature",
  ManagerAuth.authenticateAdminOrManager,
  ManagerAuth.requireUnrestrictedManagerOrAdmin,
  managerController.setVenueTemperature
);

// Toggle venue power (ON/OFF) - RESTRICTED ACTION
router.patch(
  "/venues/:venueId/power",
  ManagerAuth.authenticateAdminOrManager,
  ManagerAuth.requireUnrestrictedManagerOrAdmin,
  managerController.toggleVenuePower
);

// Remote lock venue (Remote lock all devices in venue) - RESTRICTED ACTION
// Venue must be in manager's assigned organization
router.post(
  "/venues/:venueId/remote-lock",
  ManagerAuth.requireUnrestrictedManager,
  managerController.remoteLockVenue
);

// Remote unlock venue (Remote unlock all devices in venue) - RESTRICTED ACTION
// Venue must be in manager's assigned organization
router.post(
  "/venues/:venueId/remote-unlock",
  ManagerAuth.requireUnrestrictedManager,
  managerController.remoteUnlockVenue
);

// Log manager action - RESTRICTED ACTION
router.post(
  "/log-action",
  ManagerAuth.requireUnrestrictedManager,
  managerController.logManagerAction
);

// Set AC temperature with protection (checks permissions and auto-restores) - RESTRICTED ACTION
router.patch(
  "/acs/:acId/temperature-protected",
  ManagerAuth.requireUnrestrictedManager,
  managerController.setACTemperatureWithProtection
);

// ==================== ALERT MANAGEMENT ROUTES ====================
// Get active alerts (manager only sees alerts for their assigned organizations)
router.get("/alerts", managerController.getActiveAlerts);

// Check alerts (trigger manual check for manager's assigned organizations) - RESTRICTED ACTION
router.post(
  "/alerts/check",
  ManagerAuth.requireUnrestrictedManager,
  managerController.checkAlerts
);

// ==================== ROOM TEMPERATURE ALERT ROUTES ====================
// Get active room temperature alerts (manager only sees alerts for their assigned organizations)
router.get("/alerts/room-temp", managerController.getActiveRoomTempAlerts);

// Check room temperature (trigger manual check and request room temp) - RESTRICTED ACTION
router.post(
  "/alerts/room-temp/check",
  ManagerAuth.requireUnrestrictedManager,
  managerController.checkRoomTemperature
);

// Request room temperature for specific AC
router.post(
  "/acs/:acId/request-room-temp",
  managerController.requestRoomTemperature
);

// ==================== ENERGY CONSUMPTION ROUTES ====================
// Get AC energy consumption
router.get("/acs/:acId/energy", managerController.getACEnergy);

// Get organization energy consumption
router.get(
  "/organizations/:organizationId/energy",
  managerController.getOrganizationEnergy
);

// ==================== EVENT MANAGEMENT ROUTES ====================
// Create event - Only unrestricted managers can create events
router.post(
  "/events",
  ManagerAuth.requireUnrestrictedManager,
  managerController.createEvent
);

// Get all events
router.get("/events", managerController.getEvents);

// Get single event
router.get("/events/:eventId", managerController.getEvent);

// Start event manually
router.post(
  "/events/:eventId/start",
  ManagerAuth.requireUnrestrictedManager,
  managerController.startEvent
);

// Stop event manually
router.post(
  "/events/:eventId/stop",
  ManagerAuth.requireUnrestrictedManager,
  managerController.stopEvent
);

// Disable event
router.post(
  "/events/:eventId/disable",
  ManagerAuth.requireUnrestrictedManager,
  managerController.disableEvent
);

// Enable event
router.post(
  "/events/:eventId/enable",
  ManagerAuth.requireUnrestrictedManager,
  managerController.enableEvent
);

// Update event
router.patch(
  "/events/:eventId",
  ManagerAuth.requireUnrestrictedManager,
  managerController.updateEvent
);

// Delete event
router.delete(
  "/events/:eventId",
  ManagerAuth.requireUnrestrictedManager,
  managerController.deleteEvent
);

module.exports = router;
