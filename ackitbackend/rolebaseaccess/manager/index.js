// Manager Module - IoTify Manager System
// This module provides complete manager functionality for the ACKit IoT system

const managerController = require("./controller/managerController");
const managerRoutes = require("./routes/managerRoutes");
const managerAuth = require("./authentication/managerAuth");
const managerOrganizationService = require("./services/managerOrganizationService");
const managerACService = require("./services/managerACService");

module.exports = {
    // Controller functions
    controller: managerController,

    // API Routes
    routes: managerRoutes,

    // Authentication middleware
    auth: managerAuth,

    // Services
    organizationService: managerOrganizationService,
    acService: managerACService,

    // Main functionality
    Manager: {
        // Organization management functions
        getAssignedOrganizations: managerController.getAssignedOrganizations,
        splitOrganization: managerController.splitOrganization,
        undoOrganizationSplit: managerController.undoOrganizationSplit,
        setOrganizationTemperature: managerController.setOrganizationTemperature,
        toggleOrganizationLock: managerController.toggleOrganizationLock,

        // AC device management functions
        getManagerACs: managerController.getManagerACs,
        setACTemperature: managerController.setACTemperature,
        toggleACPower: managerController.toggleACPower,

        // Organization services
        organizationSplit: managerOrganizationService.splitOrganization,
        organizationUndo: managerOrganizationService.undoOrganizationSplit,
        organizationTempControl: managerOrganizationService.setOrganizationTemperature,
        organizationLockControl: managerOrganizationService.toggleOrganizationLock,

        // AC services
        acTempControl: managerACService.setACTemperature,
        acPowerControl: managerACService.toggleACPower,
        acList: managerACService.getManagerACs,

        // Authentication
        login: managerController.loginManager,
        authenticate: managerAuth.authenticateManager,
        requireManager: managerAuth.requireManager,
    },
};
