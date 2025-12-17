// Manager Middleware - IoTify Manager System
// This middleware handles manager authentication and authorization

const managerModule = require("../rolebaseaccess/manager");
const ManagerAuth = managerModule.auth;
const ManagerOrganizationService = managerModule.organizationService;
const ManagerACService = managerModule.acService;

class ManagerMiddleware {
    // Manager authentication middleware
    static authenticateManager = ManagerAuth.authenticateManager;

    // Require manager role middleware
    static requireManager = ManagerAuth.requireManager;

    // Combined authentication and authorization
    static authenticate = [this.authenticateManager, this.requireManager];

    // Organization access validation
    static validateOrganizationAccess = async (req, res, next) => {
        try {
            const { organizationId } = req.params;
            const managerId = req.manager.id;

            // Check if organization belongs to manager
            const hasAccess = await ManagerOrganizationService.getAssignedOrganizations(managerId);
            const organization = hasAccess.organizations.find(org => org.id == organizationId);

            if (!organization) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. Organization not assigned to this manager.",
                });
            }

            req.organization = organization;
            next();
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Error validating organization access",
            });
        }
    };

    // AC device access validation
    static validateACAccess = async (req, res, next) => {
        try {
            const { acId } = req.params;
            const managerId = req.manager.id;

            // Check if AC belongs to manager's organizations
            const hasAccess = await ManagerACService.getManagerACs(managerId);
            const ac = hasAccess.acs.find(device => device.id == acId);

            if (!ac) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. AC device not in your assigned organizations.",
                });
            }

            req.ac = ac;
            next();
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Error validating AC access",
            });
        }
    };

    // Temperature validation middleware (uses controller utility)
    static validateTemperature = (req, res, next) => {
        const { temperature } = req.body;

        // Use the same validation logic as controller
        const ManagerController = require("../rolebaseaccess/manager/controller/managerController");
        const validation = ManagerController.validateTemperature(temperature);

        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: validation.message,
            });
        }

        next();
    };

    // Lock status validation
    static validateLockAction = (req, res, next) => {
        const { action } = req.body;

        if (!action || !["lock", "unlock"].includes(action)) {
            return res.status(400).json({
                success: false,
                message: "Action must be 'lock' or 'unlock'",
            });
        }

        next();
    };
}

module.exports = ManagerMiddleware;