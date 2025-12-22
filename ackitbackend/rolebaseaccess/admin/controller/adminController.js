const bcrypt = require("bcryptjs");
const Admin = require("../../../models/Roleaccess/admin");
const Manager = require("../../../models/Roleaccess/manager");
const Organization = require("../../../models/Organization/organization");
const Venue = require("../../../models/Venue/venue");
const AC = require("../../../models/AC/ac");
const ActivityLog = require("../../../models/Activity log/activityLog");
const Event = require("../../../models/Event/event");
const { Op } = require("sequelize");
// Import services
const ManagerService = require("../services/managerService");
const OrganizationService = require("../services/organizationService");
const VenueService = require("../services/venueService");
const ACService = require("../services/acService");
const LockService = require("../services/lockService");
const AlertService = require("../services/alertService");
// RoomTemperatureAlertService removed - AlertService handles all alert functionality
const Services = require("../../../services");
const ESPService = Services.getESPService();
const EnergyConsumptionService = require("../services/energyConsumptionService");
const EventService = require("../services/eventService");
// Import session helper
const SessionHelper = require("../../../middleware/sessionHelper");
class AdminController {
  // 1. LOGIN MOVED TO AdminAuth for security
  // Login functionality has been moved to AdminAuth.login for secure backend-only token storage
  // Helper method to ensure session exists and refresh it
  static ensureSession(req, res) {
    return SessionHelper.ensureSession(req, res, "admin");
  }
  // 2. CREATE MANAGER
  async createManager(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const { name, email, password, organizationId } = req.body || {};
      const adminId = req.admin.id;
      console.log("📥 Received manager creation request:");
      console.log("Request body:", req.body);
      console.log("Admin ID:", adminId);
      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Name, email, and password are required",
        });
      }
      const result = await ManagerService.createManager(adminId, {
        name,
        email,
        password,
        organizationId,
      });
      res.status(201).json(result);
    } catch (error) {
      console.error("Create manager error:", error);
      res.status(500).json({
        success: false,
        message: "Error creating manager",
        error: error.message,
      });
    }
  }
  // 3. GET MANAGERS - UNUSED (Route commented out, only /my-managers is used)
  /*
  async getManagers(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const adminId = req.admin.id;
      const managers = await Manager.findAll({
        where: { adminId: adminId },
        attributes: { exclude: ["password"] },
        order: [["createdAt", "DESC"]],
      });
      res.json({
        success: true,
        data: { managers },
      });
    } catch (error) {
      console.error("Get managers error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching managers",
        error: error.message,
      });
    }
  }
  */
  // 4. GET MY MANAGERS (admin-specific)
  async getMyManagers(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const adminId = req.admin.id;
      const managers = await Manager.findAll({
        where: { adminId: adminId },
        attributes: { exclude: ["password"] },
        include: [
          {
            model: Venue,
            as: "venues",
            where: { status: "active" }, // Only show active venues in manager card (exclude split)
            required: false, // LEFT JOIN - include managers even if no active venues
            attributes: ["id", "name", "status"],
          },
          {
            model: Organization,
            as: "organizations",
            required: false, // LEFT JOIN - include managers even if no organizations
            attributes: [
              "id",
              "name",
              "status",
              "managerId",
              "adminId",
              "batchNumber",
            ],
          },
        ],
        order: [["createdAt", "DESC"]],
      });
      res.json({
        success: true,
        data: { managers },
      });
    } catch (error) {
      console.error("Get my managers error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching managers",
        error: error.message,
      });
    }
  }
  // 5. GET MANAGER DETAILS - UNUSED (Route commented out, not used in frontend)
  /*
  async getManagerDetails(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const { managerId } = req.params;
      const adminId = req.admin.id;
      const manager = await Manager.findOne({
        where: { id: managerId, adminId: adminId },
        attributes: { exclude: ["password"] },
        include: [
          {
            model: Venue,
            as: "venues",
            attributes: ["id", "name", "status", "temperature"],
          },
        ],
      });
      if (!manager) {
        return res.status(404).json({
          success: false,
          message: "Manager not found",
        });
      }
      res.json({
        success: true,
        data: { manager },
      });
    } catch (error) {
      console.error("Get manager details error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching manager details",
        error: error.message,
      });
    }
  }
  */
  // 6. LOCK MANAGER ACCOUNT (Admin-controlled)
  // IMPORTANT: This is SEPARATE from remote access lock
  // - This locks the manager's ACCOUNT (prevents login and actions)
  // - This is NOT the same as locking remote access (which managers can do when unlocked)
  // - When manager account is locked, they cannot use remote access lock feature
  async lockManager(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const { managerId, lockReason } = req.body;
      const adminId = req.admin.id;
      if (!managerId) {
        return res.status(400).json({
          success: false,
          message: "Manager ID is required",
        });
      }
      const manager = await Manager.findOne({
        where: { id: managerId, adminId: adminId },
      });
      if (!manager) {
        return res.status(404).json({
          success: false,
          message: "Manager not found",
        });
      }
      // Lock manager ACCOUNT (this is separate from remote access lock)
      // Manager account status: locked = cannot login at all
      await manager.update({
        status: "locked",
        // lockReason removed from model
        lockedAt: new Date(),
        lockedByAdminId: adminId,
      });

      // Invalidate all active sessions for this manager
      try {
        const ManagerAuth = require("../../manager/authentication/managerAuth");
        const invalidatedCount =
          ManagerAuth.invalidateManagerSessions(managerId);
        console.log(
          `🔒 Manager ${managerId} locked. Invalidated ${invalidatedCount} active session(s).`
        );
      } catch (error) {
        console.error("Error invalidating manager sessions:", error);
        // Don't fail the lock operation if session invalidation fails
      }

      // Log activity
      await ActivityLog.create({
        adminId: adminId,
        action: "LOCK_MANAGER",
        targetType: "manager",
        targetId: managerId,
        details: `Manager ${manager.name} locked by admin. Reason: ${
          lockReason || "Locked by Admin"
        }`,
        // createdAt is handled automatically by Sequelize timestamps
      });
      res.json({
        success: true,
        message: "Manager locked successfully",
        manager: {
          id: manager.id,
          name: manager.name,
          status: manager.status,
          // lockReason removed from model
        },
      });
    } catch (error) {
      console.error("Lock manager error:", error);
      res.status(500).json({
        success: false,
        message: "Error locking manager",
        error: error.message,
      });
    }
  }
  // 7. UNLOCK MANAGER ACCOUNT (Admin-controlled)
  // IMPORTANT: This is SEPARATE from remote access lock
  // - This unlocks the manager's ACCOUNT (allows login and full access)
  // - This is NOT the same as unlocking remote access
  // - When manager account is unlocked, they can use remote access lock feature
  async unlockManager(req, res) {
    try {
      console.log("🔓 Unlock Manager - Request received");
      console.log("   - Request body:", req.body);
      console.log("   - Admin ID:", req.admin?.id);
      console.log("   - Session:", req.session?.user);

      // Session validated by authenticateAdmin middleware
      const { managerId } = req.body;
      const adminId = req.admin?.id;

      if (!adminId) {
        console.error("❌ No admin ID in request");
        return res.status(401).json({
          success: false,
          message: "Admin authentication required",
        });
      }

      if (!managerId) {
        console.error("❌ Manager ID missing in request body");
        return res.status(400).json({
          success: false,
          message: "Manager ID is required",
        });
      }

      console.log(`🔍 Looking for manager ${managerId} under admin ${adminId}`);
      const manager = await Manager.findOne({
        where: { id: managerId, adminId: adminId },
      });

      if (!manager) {
        console.error(
          `❌ Manager ${managerId} not found under admin ${adminId}`
        );
        return res.status(404).json({
          success: false,
          message: "Manager not found",
        });
      }

      console.log(
        `✅ Manager found: ${manager.name} (Status: ${manager.status})`
      );
      // Unlock manager ACCOUNT (this is separate from remote access lock)
      // Manager account status: unlocked = can login and perform all actions including remote access lock
      await manager.update({
        status: "unlocked",
        lockedAt: null,
        lockedByAdminId: null,
      });

      // Reload manager from database to get updated status
      await manager.reload();

      console.log(
        `🔓 Manager ${managerId} ACCOUNT unlocked. Manager can now login and perform actions (including remote access lock).`
      );
      console.log(`   - Updated status: ${manager.status}`);

      // Log activity
      await ActivityLog.create({
        adminId: adminId,
        action: "UNLOCK_MANAGER",
        targetType: "manager",
        targetId: managerId,
        details: `Manager ${manager.name} unlocked by admin`,
        // createdAt is handled automatically by Sequelize timestamps
      });
      res.json({
        success: true,
        message: "Manager unlocked successfully",
        manager: {
          id: manager.id,
          name: manager.name,
          status: manager.status,
        },
      });
    } catch (error) {
      console.error("Unlock manager error:", error);
      res.status(500).json({
        success: false,
        message: "Error unlocking manager",
        error: error.message,
      });
    }
  }
  // 8. RESTRICTED UNLOCK MANAGER ACCOUNT (Admin-controlled)
  // IMPORTANT: This is SEPARATE from remote access lock
  // - This sets manager account to "restricted" status (can login but limited permissions)
  // - Restricted managers CANNOT use remote access lock feature (only unlocked managers can)
  // - This is NOT the same as locking/unlocking remote access
  async restrictedUnlockManager(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const { managerId } = req.body;
      const adminId = req.admin.id;
      if (!managerId) {
        return res.status(400).json({
          success: false,
          message: "Manager ID is required",
        });
      }
      const manager = await Manager.findOne({
        where: { id: managerId, adminId: adminId },
      });
      if (!manager) {
        return res.status(404).json({
          success: false,
          message: "Manager not found",
        });
      }
      // Set manager ACCOUNT to restricted status (this is separate from remote access lock)
      // Manager account status: restricted = can login but cannot perform restricted actions
      // Restricted managers CANNOT lock/unlock remote access (only unlocked managers can)
      await manager.update({
        status: "restricted",
        lockedAt: null,
        lockedByAdminId: null,
      });

      // Reload manager from database to get updated status
      await manager.reload();

      console.log(
        `🔓 Manager ${managerId} ACCOUNT set to restricted. Manager can login but with limited permissions (cannot use remote access lock feature).`
      );
      console.log(`   - Updated status: ${manager.status}`);

      // Log activity
      await ActivityLog.create({
        adminId: adminId,
        action: "RESTRICTED_UNLOCK_MANAGER",
        targetType: "manager",
        targetId: managerId,
        details: `Manager ${manager.name} given restricted access by admin`,
        // createdAt is handled automatically by Sequelize timestamps
      });
      res.json({
        success: true,
        message: "Manager unlocked with restricted access",
        manager: {
          id: manager.id,
          name: manager.name,
          status: manager.status,
          // lockReason removed from model
        },
      });
    } catch (error) {
      console.error("Restricted unlock manager error:", error);
      res.status(500).json({
        success: false,
        message: "Error unlocking manager with restrictions",
        error: error.message,
      });
    }
  }
  // 9. TOGGLE MANAGER STATUS - UNUSED (Route commented out, not used in frontend)
  /*
  async toggleManagerStatus(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const { managerId } = req.params;
      const { status, reason } = req.body;
      const adminId = req.admin.id;
      const manager = await Manager.findOne({
        where: { id: managerId, adminId: adminId },
      });
      if (!manager) {
        return res.status(404).json({
          success: false,
          message: "Manager not found",
        });
      }
      const oldStatus = manager.status;
      await manager.update({
        status: status,
        // lockReason removed from model
        lockedAt: status !== "unlocked" ? new Date() : null,
        lockedByAdminId: status !== "unlocked" ? adminId : null,
      });

      // If locking manager, invalidate all active sessions
      if (status === "locked") {
        try {
          const ManagerAuth = require("../../manager/authentication/managerAuth");
          const invalidatedCount =
            ManagerAuth.invalidateManagerSessions(managerId);
          console.log(
            `🔒 Manager ${managerId} locked via toggle. Invalidated ${invalidatedCount} active session(s).`
          );
        } catch (error) {
          console.error("Error invalidating manager sessions:", error);
        }
      }

      // Log activity
      await ActivityLog.create({
        adminId: adminId,
        action: "TOGGLE_MANAGER_STATUS",
        targetType: "manager",
        targetId: managerId,
        details: `Manager ${manager.name} status changed from ${oldStatus} to ${status}`,
        // createdAt is handled automatically by Sequelize timestamps
      });
      res.json({
        success: true,
        message: `Manager status updated to ${status}`,
        manager: {
          id: manager.id,
          name: manager.name,
          status: manager.status,
          // lockReason removed from model
        },
      });
    } catch (error) {
      console.error("Toggle manager status error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating manager status",
        error: error.message,
      });
    }
  }
  */
  // 10. ASSIGN ORGANIZATION TO MANAGER - UNUSED (Route commented out, only unassign is used)
  /*
  async assignOrganizationToManager(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const { organizationId, managerId } = req.body;
      const adminId = req.admin.id;
      if (!organizationId || !managerId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID and Manager ID are required",
        });
      }
      // Verify organization belongs to admin
      const organization = await Organization.findOne({
        where: { id: organizationId, adminId: adminId },
      });
      if (!organization) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }
      // Verify manager belongs to admin
      const manager = await Manager.findOne({
        where: { id: managerId, adminId: adminId },
      });
      if (!manager) {
        return res.status(404).json({
          success: false,
          message: "Manager not found",
        });
      }
      // Update organization with manager assignment
      await organization.update({ managerId: managerId });
      // Log activity
      await ActivityLog.create({
        adminId: adminId,
        action: "ASSIGN_ORGANIZATION_TO_MANAGER",
        targetType: "organization",
        targetId: organizationId,
        details: `Organization ${organization.name} assigned to manager ${manager.name}`,
        // createdAt is handled automatically by Sequelize timestamps
      });
      res.json({
        success: true,
        message: "Organization assigned to manager successfully",
        organization: {
          id: organization.id,
          name: organization.name,
          managerId: managerId,
        },
        manager: {
          id: manager.id,
          name: manager.name,
        },
      });
    } catch (error) {
      console.error("Assign organization to manager error:", error);
      res.status(500).json({
        success: false,
        message: "Error assigning organization to manager",
        error: error.message,
      });
    }
  }
  */
  // 16B. UNASSIGN ORGANIZATION FROM MANAGER (UNDO ASSIGNMENT)
  async unassignOrganizationFromManager(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const { organizationId } = req.body;
      const adminId = req.admin.id;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      // Verify organization belongs to admin
      const organization = await Organization.findOne({
        where: { id: organizationId, adminId: adminId },
      });

      if (!organization) {
        return res.status(404).json({
          success: false,
          message: "Organization not found or unauthorized",
        });
      }

      // Check if organization has a manager assigned
      if (!organization.managerId) {
        return res.status(400).json({
          success: false,
          message: "Organization is not assigned to any manager",
        });
      }

      // Get manager details for logging
      const manager = await Manager.findOne({
        where: { id: organization.managerId },
      });

      const managerName = manager ? manager.name : "Unknown";

      // Update organization to remove manager assignment (set managerId to null)
      await organization.update({ managerId: null });

      // Log activity
      await ActivityLog.create({
        adminId: adminId,
        action: "UNASSIGN_ORGANIZATION_FROM_MANAGER",
        targetType: "organization",
        targetId: organizationId,
        details: `Organization ${organization.name} unassigned from manager ${managerName}`,
      });

      // Broadcast unassignment change to all frontend clients (admin and manager)
      try {
        const Services = require("../../../services");
        const ESPService = Services.getESPService();
        ESPService.broadcastToFrontend({
          type: "ORGANIZATION_UNASSIGNED",
          managerId: organization.managerId,
          managerName: managerName,
          organizationId: organizationId,
          organizationName: organization.name,
          timestamp: new Date().toISOString(),
        });
        console.log(
          `📡 [ADMIN-CONTROLLER] Broadcasted organization unassignment to all frontend clients`
        );
      } catch (broadcastError) {
        console.error(
          "⚠️ Error broadcasting unassignment change:",
          broadcastError
        );
        // Don't fail the operation if broadcast fails
      }

      res.json({
        success: true,
        message: "Organization unassigned from manager successfully",
        organization: {
          id: organization.id,
          name: organization.name,
          managerId: null,
        },
        previousManager: manager
          ? {
              id: manager.id,
              name: manager.name,
            }
          : null,
      });
    } catch (error) {
      console.error("Unassign organization from manager error:", error);
      res.status(500).json({
        success: false,
        message: "Error unassigning organization from manager",
        error: error.message,
      });
    }
  }
  // 11. GET ORGANIZATIONS
  async getOrganizations(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const adminId = req.admin.id;
      const result = await OrganizationService.getOrganizationsByAdmin(adminId);
      res.json({
        success: true,
        data: result.organizations || [],
      });
    } catch (error) {
      console.error("Get organizations error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching organizations",
        error: error.message,
      });
    }
  }
  // 12. GET ORGANIZATION DETAILS
  async getOrganizationDetails(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const { organizationId } = req.params;
      const adminId = req.admin.id;
      const result = await OrganizationService.getOrganizationDetails(
        adminId,
        organizationId
      );
      res.json({
        success: true,
        data: { organization: result.organization },
      });
    } catch (error) {
      console.error("Get organization details error:", error);
      if (
        error.message.includes("not found") ||
        error.message.includes("unauthorized")
      ) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      res.status(500).json({
        success: false,
        message: "Error fetching organization details",
        error: error.message,
      });
    }
  }
  // 12B. UPDATE ORGANIZATION STATUS - UNUSED (No route defined, not used)
  /*
  async updateOrganizationStatus(req, res) {
    try {
      const { organizationId } = req.params;
      const { status } = req.body;
      const adminId = req.admin.id;
      const organization = await Organization.findOne({
        where: { id: organizationId, adminId: adminId },
        include: [
          {
            model: Manager,
            as: "manager",
            attributes: ["id", "name", "email", "status"],
          },
          {
            model: AC,
            as: "acs",
            attributes: [
              "id",
              "name",
              "brand",
              "model",
              "serialNumber",
              "key",
              "temperature",
              "isOn",
              "isWorking",
            ],
          },
        ],
      });
      if (!organization) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      // Add organization power state and ACs that are off when org is on
      const orgData = organization.toJSON();
      orgData.acsOffCount = 0;
      orgData.acsOff = [];

      if (orgData.isOrganizationOn && orgData.acs && orgData.acs.length > 0) {
        orgData.acsOff = orgData.acs.filter((ac) => !ac.isOn);
        orgData.acsOffCount = orgData.acsOff.length;
      }

      res.json({
        success: true,
        data: { organization: orgData },
      });
    } catch (error) {
      console.error("Get organization details error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching organization details",
        error: error.message,
      });
    }
  }
  */
  // 13. TOGGLE ORGANIZATION STATUS - UNUSED (No route defined, not used)
  /*
  async toggleOrganizationStatus(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const { organizationId } = req.params;
      const { status, reason } = req.body;
      const adminId = req.admin.id;
      const organization = await Organization.findOne({
        where: { id: organizationId, adminId: adminId },
      });
      if (!organization) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }
      const oldStatus = organization.status;
      await organization.update({ status: status });
      // Log activity
      await ActivityLog.create({
        adminId: adminId,
        action: "TOGGLE_ORGANIZATION_STATUS",
        targetType: "organization",
        targetId: organizationId,
        details: `Organization ${organization.name} status changed from ${oldStatus} to ${status}`,
        // createdAt is handled automatically by Sequelize timestamps
      });
      res.json({
        success: true,
        message: `Organization status updated to ${status}`,
        organization: {
          id: organization.id,
          name: organization.name,
          status: organization.status,
        },
      });
    } catch (error) {
      console.error("Toggle organization status error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating organization status",
        error: error.message,
      });
    }
  }
  */
  // 14. GET VENUES
  async getVenues(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const adminId = req.admin.id;
      const venueResult = await VenueService.getVenuesByAdmin(adminId);
      res.json({
        success: true,
        data: {
          venues: venueResult.venues || [],
        },
      });
    } catch (error) {
      console.error("Get venues error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching venues",
        error: error.message,
      });
    }
  }
  // 15. GET VENUE DETAILS
  async getVenueDetails(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const { venueId } = req.params;
      const adminId = req.admin.id;
      const venue = await VenueService.getVenueDetails(adminId, venueId);
      if (!venue) {
        return res.status(404).json({
          success: false,
          message: "Venue not found",
        });
      }
      res.json({
        success: true,
        data: { venue },
      });
    } catch (error) {
      console.error("Get venue details error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching venue details",
        error: error.message,
      });
    }
  }
  // 15A. CREATE VENUE
  async createVenue(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      console.log("📥 Received venue creation request:");
      console.log("Request body:", req.body);
      console.log("Admin ID:", req.admin.id);
      const { name, organizationSize, temperature, organizationId, managerId } =
        req.body || {};
      const adminId = req.admin.id;
      console.log("📋 Extracted data:");
      console.log("- name:", name);
      console.log("- organizationSize:", organizationSize);
      console.log("- temperature:", temperature);
      console.log("- organizationId:", organizationId);
      console.log("- adminId:", adminId);
      if (!name || !organizationId || !organizationSize) {
        return res.status(400).json({
          success: false,
          message: "Name, organizationId, and organizationSize are required",
        });
      }
      const result = await VenueService.createVenue(
        { name, organizationSize, temperature, organizationId, managerId },
        adminId
      );
      res.status(201).json(result);
    } catch (error) {
      console.error("Create venue error:", error);
      res.status(500).json({
        success: false,
        message: "Error creating venue",
        error: error.message,
      });
    }
  }
  // 15B. CREATE ORGANIZATION
  async createOrganization(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      console.log("📥 Received organization creation request:");
      console.log("Request body:", req.body);
      console.log("Admin ID:", req.admin.id);
      const { name, batchNumber } = req.body || {};
      const adminId = req.admin.id;
      console.log("📋 Extracted data:");
      console.log("- name:", name);
      console.log("- batchNumber:", batchNumber);
      console.log("- adminId:", adminId);
      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Name is required",
        });
      }
      const result = await OrganizationService.createOrganization(adminId, {
        name,
        batchNumber,
      });
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating organization",
        error: error.message,
      });
    }
  }
  // 15C. CREATE AC DEVICE
  async createACDevice(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      console.log("📥 Received AC device creation request:");
      console.log("Request body:", req.body);
      console.log("Admin ID:", req.admin.id);
      const {
        name,
        brand,
        model,
        ton,
        serialNumber,
        venueId,
        organizationId,
        temperature,
      } = req.body || {};
      const adminId = req.admin.id;
      console.log("📋 Extracted data:");
      console.log("- name:", name);
      console.log("- brand:", brand);
      console.log("- model:", model);
      console.log("- ton:", ton);
      console.log("- serialNumber:", serialNumber);
      console.log("- organizationId:", organizationId);
      console.log("- temperature:", temperature);
      console.log("- adminId:", adminId);
      if (!name || !brand || !model || !venueId || !ton) {
        return res.status(400).json({
          success: false,
          message: "Name, brand, model, venueId, and ton are required",
        });
      }

      // Note: serialNumber is optional - will be auto-generated if not provided
      const result = await ACService.createAC(adminId, {
        name,
        brand,
        model,
        ton,
        serialNumber,
        venueId,
        organizationId: null, // AC belongs to venue only
        temperature: temperature || 16,
      });
      res.status(201).json(result);
    } catch (error) {
      console.error("Create AC device error:", error);
      res.status(500).json({
        success: false,
        message: "Error creating AC device",
        error: error.message,
      });
    }
  }

  // 16A. LOCK ORGANIZATION (Admin-controlled)
  async lockOrganization(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const { organizationId } = req.params;
      const { reason } = req.body;
      const adminId = req.admin.id;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      const result = await OrganizationService.lockOrganization(
        adminId,
        parseInt(organizationId),
        reason
      );

      res.json(result);
    } catch (error) {
      console.error("Lock organization error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error locking organization",
      });
    }
  }

  // 16B. UNLOCK ORGANIZATION (Admin-controlled)
  async unlockOrganization(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const { organizationId } = req.params;
      const adminId = req.admin.id;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      const result = await OrganizationService.unlockOrganization(
        adminId,
        parseInt(organizationId)
      );

      res.json(result);
    } catch (error) {
      console.error("Unlock organization error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error unlocking organization",
      });
    }
  }

  // 16C. REMOTE LOCK ORGANIZATION (Remote lock all devices in organization)
  async remoteLockOrganization(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const { organizationId } = req.params;
      const { reason } = req.body; // Optional reason
      const adminId = req.admin.id;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      const result = await LockService.remoteLockOrganization(
        adminId,
        parseInt(organizationId),
        reason || ""
      );

      res.json(result);
    } catch (error) {
      console.error("Remote lock organization error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error remote locking organization",
      });
    }
  }

  // 16D. REMOTE UNLOCK ORGANIZATION (Remote unlock all devices in organization)
  async remoteUnlockOrganization(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const { organizationId } = req.params;
      const adminId = req.admin.id;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      const result = await LockService.remoteUnlockOrganization(
        adminId,
        parseInt(organizationId)
      );

      res.json(result);
    } catch (error) {
      console.error("Remote unlock organization error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error remote unlocking organization",
      });
    }
  }

  // 16E. REMOTE LOCK VENUE (Remote lock all devices in venue)
  async remoteLockVenue(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const { venueId } = req.params;
      const { reason } = req.body; // Optional reason
      const adminId = req.admin.id;

      if (!venueId) {
        return res.status(400).json({
          success: false,
          message: "Venue ID is required",
        });
      }

      const result = await LockService.remoteLockVenue(
        adminId,
        parseInt(venueId),
        reason || ""
      );

      res.json(result);
    } catch (error) {
      console.error("Remote lock venue error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error remote locking venue",
      });
    }
  }

  // 16F. REMOTE UNLOCK VENUE (Remote unlock all devices in venue)
  async remoteUnlockVenue(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const { venueId } = req.params;
      const adminId = req.admin.id;

      if (!venueId) {
        return res.status(400).json({
          success: false,
          message: "Venue ID is required",
        });
      }

      const result = await LockService.remoteUnlockVenue(
        adminId,
        parseInt(venueId)
      );

      res.json(result);
    } catch (error) {
      console.error("Remote unlock venue error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error remote unlocking venue",
      });
    }
  }

  // 16. ASSIGN MANAGER TO ORGANIZATIONS
  async assignManagerToOrganizations(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const { managerId } = req.params;
      const { organizationIds } = req.body;
      const adminId = req.admin.id;

      console.log("🔍 Assign Manager to Organizations - Request received:", {
        managerId,
        organizationIds,
        adminId,
        managerIdType: typeof managerId,
        organizationIdsType: Array.isArray(organizationIds)
          ? organizationIds.map((id) => typeof id)
          : typeof organizationIds,
      });

      // Convert managerId to integer
      const managerIdInt = parseInt(managerId, 10);
      if (isNaN(managerIdInt)) {
        return res.status(400).json({
          success: false,
          message: "Invalid manager ID",
        });
      }

      if (!organizationIds || !Array.isArray(organizationIds)) {
        return res.status(400).json({
          success: false,
          message: "organizationIds array is required",
        });
      }

      // Convert organizationIds to integers
      const organizationIdsInt = organizationIds
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id));
      if (organizationIdsInt.length !== organizationIds.length) {
        return res.status(400).json({
          success: false,
          message: "Invalid organization IDs provided",
        });
      }

      // Verify manager belongs to admin
      const manager = await Manager.findOne({
        where: { id: managerIdInt, adminId: adminId },
      });
      if (!manager) {
        console.error("❌ Manager not found:", {
          managerId: managerIdInt,
          adminId,
        });
        return res.status(404).json({
          success: false,
          message: "Manager not found or unauthorized",
        });
      }

      console.log("✅ Manager found:", { id: manager.id, name: manager.name });

      // Verify organizations belong to admin
      // Organization model uses venues table, so we need to be careful with the query
      const organizations = await Organization.findAll({
        where: {
          id: { [Op.in]: organizationIdsInt },
          adminId: adminId,
        },
        attributes: [
          "id",
          "name",
          "batchNumber",
          "adminId",
          "managerId",
          "createdAt",
          "updatedAt",
        ],
      });

      console.log("📊 Organizations found:", {
        requested: organizationIdsInt.length,
        found: organizations.length,
        foundIds: organizations.map((org) => org.id),
      });

      if (organizations.length !== organizationIdsInt.length) {
        const foundIds = organizations.map((org) => org.id);
        const missingIds = organizationIdsInt.filter(
          (id) => !foundIds.includes(id)
        );
        console.error("❌ Some organizations not found:", {
          missingIds,
          adminId,
        });
        return res.status(400).json({
          success: false,
          message: `Some organizations not found or unauthorized. Missing IDs: ${missingIds.join(
            ", "
          )}`,
        });
      }

      // Update organizations with manager assignment
      // Organization model uses venues table, so update will affect venues table
      let updateResult;
      try {
        updateResult = await Organization.update(
          { managerId: managerIdInt },
          {
            where: {
              id: { [Op.in]: organizationIdsInt },
              adminId: adminId,
            },
          }
        );
        console.log("✅ Organization.update result:", updateResult);
        console.log("✅ Organizations updated:", {
          rowsAffected: updateResult[0],
          managerId: managerIdInt,
          organizationIds: organizationIdsInt,
        });
      } catch (updateError) {
        console.error("❌ Organization.update error:", updateError);
        console.error("Error details:", {
          message: updateError.message,
          name: updateError.name,
          original: updateError.original?.message,
          sql: updateError.sql,
        });
        throw updateError;
      }
      // Log activity
      await ActivityLog.create({
        adminId: adminId,
        action: "ASSIGN_MANAGER_TO_ORGANIZATIONS",
        targetType: "manager",
        targetId: managerIdInt,
        details: `Assigned manager ${manager.name} to ${organizationIdsInt.length} organization(s)`,
        // createdAt is handled automatically by Sequelize timestamps
      });

      // Broadcast assignment change to all frontend clients (admin and manager)
      try {
        const Services = require("../../../services");
        const ESPService = Services.getESPService();
        ESPService.broadcastToFrontend({
          type: "ORGANIZATION_ASSIGNED",
          managerId: managerIdInt,
          managerName: manager.name,
          organizationIds: organizationIdsInt,
          organizations: organizations.map((org) => ({
            id: org.id,
            name: org.name,
          })),
          timestamp: new Date().toISOString(),
        });
        console.log(
          `📡 [ADMIN-CONTROLLER] Broadcasted organization assignment to all frontend clients`
        );
      } catch (broadcastError) {
        console.error(
          "⚠️ Error broadcasting assignment change:",
          broadcastError
        );
        // Don't fail the operation if broadcast fails
      }

      console.log("✅ Manager assignment successful:", {
        managerId: managerIdInt,
        managerName: manager.name,
        organizationsCount: organizationIdsInt.length,
      });

      res.json({
        success: true,
        message: `Manager assigned to ${organizationIdsInt.length} organization(s)`,
        manager: {
          id: manager.id,
          name: manager.name,
          email: manager.email,
        },
        organizations: organizations.map((org) => ({
          id: org.id,
          name: org.name,
          managerId: managerIdInt,
        })),
      });
    } catch (error) {
      console.error("❌ Assign manager to organizations error:", error);
      console.error("Error stack:", error.stack);
      console.error("Error details:", {
        message: error.message,
        name: error.name,
        original: error.original?.message,
        sql: error.sql,
        parameters: error.parameters,
      });

      // Provide more detailed error message
      let errorMessage = "Error assigning manager to organizations";
      if (error.original?.message) {
        errorMessage = error.original.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: error.message,
        details:
          process.env.NODE_ENV === "development"
            ? {
                original: error.original?.message,
                sql: error.sql,
              }
            : undefined,
      });
    }
  }

  // 16B. ASSIGN MANAGER TO VENUES
  async assignManagerToVenues(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const { managerId } = req.params;
      const { venueIds } = req.body;
      const adminId = req.admin.id;

      console.log("🔍 Assign Manager to Venues - Request received:", {
        managerId,
        venueIds,
        adminId,
        managerIdType: typeof managerId,
        venueIdsType: Array.isArray(venueIds)
          ? venueIds.map((id) => typeof id)
          : typeof venueIds,
      });

      // Convert managerId to integer
      const managerIdInt = parseInt(managerId, 10);
      if (isNaN(managerIdInt)) {
        return res.status(400).json({
          success: false,
          message: "Invalid manager ID",
        });
      }

      if (!venueIds || !Array.isArray(venueIds)) {
        return res.status(400).json({
          success: false,
          message: "venueIds array is required",
        });
      }

      // Convert venueIds to integers
      const venueIdsInt = venueIds
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id));
      if (venueIdsInt.length !== venueIds.length) {
        return res.status(400).json({
          success: false,
          message: "Invalid venue IDs provided",
        });
      }

      // Verify manager belongs to admin
      const manager = await Manager.findOne({
        where: { id: managerIdInt, adminId: adminId },
      });
      if (!manager) {
        console.error("❌ Manager not found:", {
          managerId: managerIdInt,
          adminId,
        });
        return res.status(404).json({
          success: false,
          message: "Manager not found or unauthorized",
        });
      }

      console.log("✅ Manager found:", { id: manager.id, name: manager.name });

      // Verify venues belong to admin
      const venues = await Venue.findAll({
        where: {
          id: { [Op.in]: venueIdsInt },
          adminId: adminId,
          status: { [Op.ne]: "split" }, // Exclude split venues
        },
        attributes: [
          "id",
          "name",
          "organizationId",
          "adminId",
          "managerId",
          "status",
          "createdAt",
          "updatedAt",
        ],
      });

      console.log("📊 Venues found:", {
        requested: venueIdsInt.length,
        found: venues.length,
        foundIds: venues.map((venue) => venue.id),
      });

      if (venues.length !== venueIdsInt.length) {
        const foundIds = venues.map((venue) => venue.id);
        const missingIds = venueIdsInt.filter((id) => !foundIds.includes(id));
        console.error("❌ Some venues not found:", {
          missingIds,
          adminId,
        });
        return res.status(400).json({
          success: false,
          message: `Some venues not found or unauthorized. Missing IDs: ${missingIds.join(
            ", "
          )}`,
        });
      }

      // Update venues with manager assignment
      const updateResult = await Venue.update(
        { managerId: managerIdInt },
        {
          where: {
            id: { [Op.in]: venueIdsInt },
            adminId: adminId,
          },
        }
      );
      console.log("✅ Venue.update result:", updateResult);
      console.log("✅ Venues updated:", {
        rowsAffected: updateResult[0],
        managerId: managerIdInt,
        venueIds: venueIdsInt,
      });

      // Log activity
      await ActivityLog.create({
        adminId: adminId,
        action: "ASSIGN_MANAGER_TO_VENUES",
        targetType: "manager",
        targetId: managerIdInt,
        details: `Assigned manager ${manager.name} to ${venueIdsInt.length} venue(s)`,
      });

      // Broadcast assignment change to all frontend clients (admin and manager)
      try {
        const Services = require("../../../services");
        const ESPService = Services.getESPService();
        ESPService.broadcastToFrontend({
          type: "VENUE_ASSIGNED",
          managerId: managerIdInt,
          managerName: manager.name,
          venueIds: venueIdsInt,
          venues: venues.map((venue) => ({
            id: venue.id,
            name: venue.name,
          })),
          timestamp: new Date().toISOString(),
        });
        console.log(
          `📡 [ADMIN-CONTROLLER] Broadcasted venue assignment to all frontend clients`
        );
      } catch (broadcastError) {
        console.error(
          "⚠️ Error broadcasting assignment change:",
          broadcastError
        );
        // Don't fail the operation if broadcast fails
      }

      console.log("✅ Manager venue assignment successful:", {
        managerId: managerIdInt,
        managerName: manager.name,
        venuesCount: venueIdsInt.length,
      });

      res.json({
        success: true,
        message: `Manager assigned to ${venueIdsInt.length} venue(s)`,
        manager: {
          id: manager.id,
          name: manager.name,
          email: manager.email,
        },
        venues: venues.map((venue) => ({
          id: venue.id,
          name: venue.name,
          managerId: managerIdInt,
        })),
      });
    } catch (error) {
      console.error("❌ Assign manager to venues error:", error);
      console.error("Error stack:", error.stack);
      console.error("Error details:", {
        message: error.message,
        name: error.name,
        original: error.original?.message,
        sql: error.sql,
        parameters: error.parameters,
      });

      // Provide more detailed error message
      let errorMessage = "Error assigning manager to venues";
      if (error.original?.message) {
        errorMessage = error.original.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: error.message,
        details:
          process.env.NODE_ENV === "development"
            ? {
                original: error.original?.message,
                sql: error.sql,
              }
            : undefined,
      });
    }
  }

  // 17. SYSTEM LOCK/UNLOCK (ADMIN CONTROL)
  async lockSystem(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const adminId = req.admin.id;
      const { reason = "System locked by admin" } = req.body || {};
      console.log("🔒 Admin locking system:");
      console.log("- Admin ID:", adminId);
      console.log("- Reason:", reason);
      // Add activity log before locking (with error handling)
      try {
        await ActivityLog.create({
          adminId: adminId,
          action: "LOCK_SYSTEM",
          targetType: "manager", // ActivityLog enum doesn't include "system"
          targetId: 0, // Use 0 for system-wide operations
          details: `Admin locked system from remote access (managers remain unlocked). Reason: ${reason}`,
          // createdAt is handled automatically by Sequelize timestamps
        });
        console.log("✅ Activity log created successfully");
      } catch (logError) {
        console.error("⚠️ Failed to create activity log:", logError.message);
        // Continue with system lock even if activity log fails
      }
      // Test basic database connectivity first
      console.log("🔍 Testing database connectivity...");
      const testAdmin = await Admin.findByPk(adminId);
      if (!testAdmin) {
        console.error("❌ Admin not found in database");
        return res.status(404).json({
          success: false,
          message: "Admin not found in database",
        });
      }
      console.log("✅ Admin found:", testAdmin.name);
      // Use LockService to properly create SystemState record
      // Changed to use "lock_from_remote" so managers remain unlocked (remote-only lock)
      try {
        console.log(
          "🔄 Attempting system lock using LockService (remote-only lock)..."
        );
        const LockService = require("../services/lockService");
        const result = await LockService.adminLockSystem(
          adminId,
          "lock_from_remote",
          reason,
          `Admin: ${req.admin.name || adminId}`
        );
        console.log(
          "✅ System lock successful (managers remain unlocked):",
          result
        );
        // Session refreshed by ensureSession helper
        res.json(result);
      } catch (lockError) {
        console.error("❌ LockService error:", lockError);
        console.error("❌ LockService error stack:", lockError.stack);
        // If LockService fails, try simple fallback
        try {
          console.log("🔄 Attempting simple fallback lock...");
          const simpleResult = await AdminController.simpleSystemLock(
            adminId,
            reason
          );
          console.log(
            "✅ Simple system lock successful (fallback):",
            simpleResult
          );
          res.json({
            ...simpleResult,
            warning:
              "System locked using fallback method. Status tracking may be limited.",
          });
        } catch (simpleError) {
          console.error("❌ Simple system lock also failed:", simpleError);
          // Session refreshed by ensureSession helper
          res.status(500).json({
            success: false,
            message: "Failed to lock system",
            error: lockError.message,
            details:
              "Both LockService and fallback methods failed. Please try again.",
          });
        }
      }
    } catch (error) {
      console.error("❌ System lock controller error:", error);
      console.error("❌ Error stack:", error.stack);
      // Session error handling managed by SessionHelper
      res.status(500).json({
        success: false,
        message: "System lock operation failed",
        error: error.message,
        details: "An unexpected error occurred. Your session is still active.",
      });
    }
  }
  // Simple system lock fallback method
  // NOTE: Changed to remote-only lock (does NOT lock managers)
  static async simpleSystemLock(adminId, reason) {
    try {
      console.log(
        "🔒 Simple system lock fallback (remote-only - managers remain unlocked):"
      );
      console.log("- Admin ID:", adminId);
      console.log("- Reason:", reason);
      // Remote-only lock: Do NOT lock managers
      const managerResult = [0]; // No managers locked for remote-only lock

      // Remote-only lock: Do NOT lock ACs
      let acResult = 0;

      // Create SystemState record for tracking
      try {
        const SystemState = require("../../../models/SystemState/systemState");
        await SystemState.create({
          adminId: adminId,
          entityType: "admin",
          entityId: adminId,
          actionType: "lock",
          isActive: true,
          reason: reason,
          lockedBy: "admin",
          lockedAt: new Date(),
        });
      } catch (stateError) {
        console.error(
          "⚠️ Failed to create SystemState in fallback:",
          stateError.message
        );
      }

      return {
        success: true,
        message:
          "System locked from remote access successfully (managers remain unlocked)",
        lockType: "lock_from_remote",
        lockedBy: "admin",
        reason: reason,
        managersAffected: 0, // No managers locked for remote-only lock
        acsAffected: 0, // No ACs locked for remote-only lock
        method: "simple_fallback",
      };
    } catch (error) {
      console.error("❌ Simple system lock error:", error);
      throw error;
    }
  }
  async unlockSystem(req, res) {
    // Preserve session data before operation (outside try block for error handling)
    const sessionPreserved = {
      sessionId: req.session?.sessionId,
      userId: req.session?.user?.id,
      userRole: req.session?.user?.role,
    };

    try {
      // Session is already validated by authenticateAdmin middleware
      // No need to call ensureSession again as it may cause logout on failure
      const adminId = req.admin.id;
      console.log("🔓 Admin unlocking system:");
      console.log("- Admin ID:", adminId);

      // Refresh session to prevent expiration (without validation)
      if (req.session && req.session.touch) {
        req.session.touch();
      }

      // Ensure session data is preserved
      if (req.session && !req.session.sessionId && sessionPreserved.sessionId) {
        req.session.sessionId = sessionPreserved.sessionId;
        if (!req.session.user && sessionPreserved.userId) {
          req.session.user = {
            id: sessionPreserved.userId,
            role: sessionPreserved.userRole,
          };
        }
      }

      // Explicitly save session to ensure it persists
      if (req.session && req.session.save) {
        await new Promise((resolve) => {
          req.session.save((err) => {
            if (err) {
              console.error(
                "⚠️ Session save warning (non-fatal):",
                err.message
              );
            }
            resolve();
          });
        });
      }

      // Use LockService for proper unlock
      try {
        console.log("🔄 Attempting system unlock using LockService...");
        const LockService = require("../services/lockService");
        const result = await LockService.unlockSystem(
          "system",
          adminId,
          `Admin: ${req.admin.name || adminId}`,
          "admin"
        );
        console.log("✅ System unlock successful:", result);

        // Add activity log
        try {
          await ActivityLog.create({
            adminId: adminId,
            action: "UNLOCK_SYSTEM",
            targetType: "manager",
            targetId: 0,
            details: `Admin unlocked system. ${result.message}`,
          });
        } catch (logError) {
          console.error("⚠️ Failed to create activity log:", logError.message);
        }

        // Notify all ESP32 devices about unlock state change
        try {
          const Services = require("../../../services");
          const ESPService = Services.getESPService();
          await ESPService.notifyAllESP32DevicesLockState(adminId, false);
        } catch (notifyError) {
          console.error(
            "⚠️ Error notifying ESP32 devices about unlock state:",
            notifyError
          );
          // Don't fail the operation if notification fails
        }

        res.json(result);
        return;
      } catch (lockServiceError) {
        console.error("❌ LockService unlock error:", lockServiceError);
        console.error("❌ LockService error stack:", lockServiceError.stack);

        // Fallback to simple unlock if LockService fails
        try {
          console.log("🔄 Attempting simple fallback unlock...");
          const simpleResult = await AdminController.simpleSystemUnlock(
            adminId
          );
          console.log(
            "✅ Simple system unlock successful (fallback):",
            simpleResult
          );
          res.json({
            ...simpleResult,
            warning:
              "System unlocked using fallback method. State restoration may be limited.",
          });
          return;
        } catch (simpleError) {
          console.error("❌ Simple unlock also failed:", simpleError);
        }

        // Both methods failed
        res.status(500).json({
          success: false,
          message: "Failed to unlock system",
          error: lockServiceError.message,
          details:
            "Both LockService and fallback methods failed. Please try again.",
        });
        return;
      }

      // Legacy code removed - LockService handles all unlock operations
      // If LockService and fallback both fail, error is already returned above
    } catch (error) {
      console.error("❌ Unlock system error:", error);
      console.error("❌ Unlock system error stack:", error.stack);

      // Ensure session is preserved even on error - do NOT destroy session
      if (req.session && sessionPreserved.sessionId) {
        if (!req.session.sessionId) {
          req.session.sessionId = sessionPreserved.sessionId;
        }
        if (!req.session.user && sessionPreserved.userId) {
          req.session.user = {
            id: sessionPreserved.userId,
            role: sessionPreserved.userRole,
          };
        }
        // Refresh session to keep it alive
        if (req.session.touch) {
          req.session.touch();
        }
        // Explicitly save session even on error
        if (req.session.save) {
          await new Promise((resolve) => {
            req.session.save((err) => {
              if (err) {
                console.error(
                  "⚠️ Session save warning (non-fatal):",
                  err.message
                );
              }
              resolve();
            });
          });
        }
      }

      res.status(500).json({
        success: false,
        message: "Error unlocking system",
        error: error.message,
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }

  // Legacy unlock code removed (lines 1979-2308)
  // This code was unreachable as LockService handles all unlock operations
  // If both LockService and fallback fail, error is returned in catch block above

  // Simple system unlock fallback method
  static async simpleSystemUnlock(adminId) {
    try {
      console.log("🔓 Simple system unlock fallback:");
      console.log("- Admin ID:", adminId);

      // Unlock managers
      console.log("🔄 Unlocking managers...");
      const managerResult = await Manager.update(
        {
          status: "unlocked",
          lockedAt: null,
        },
        {
          where: { adminId: adminId },
        }
      );
      console.log("✅ Managers unlocked:", managerResult[0]);

      // Unlock ACs through organizations
      console.log("🔄 Finding organizations...");
      const organizations = await Organization.findAll({
        where: { adminId: adminId },
        attributes: ["id"],
      });
      console.log("✅ Found organizations:", organizations.length);

      let acResult = 0;
      if (organizations.length > 0) {
        const orgIds = organizations.map((org) => org.id);
        console.log("🔄 Unlocking ACs in organizations:", orgIds);
        const acUpdateResult = await AC.update(
          {
            // AC model doesn't have currentState, lockedAt, lockReason, lockedBy fields
          },
          {
            where: { organizationId: { [Op.in]: orgIds } },
          }
        );
        acResult = acUpdateResult[0];
        console.log("✅ ACs unlocked:", acResult);
      }

      const result = {
        success: true,
        message: "System unlocked successfully (simple method)",
        unlockType: "unlock_from_admin",
        unlockedBy: "admin",
        managersUnlocked: managerResult[0],
        acsUnlocked: acResult,
        method: "simple_fallback",
      };
      console.log("✅ Simple unlock completed:", result);
      return result;
    } catch (error) {
      console.error("❌ Simple system unlock error:", error);
      console.error("❌ Error stack:", error.stack);
      throw error;
    }
  }

  // 17B. REMOTE ACCESS LOCK STATUS CHECK
  // IMPORTANT: This checks REMOTE ACCESS LOCKS, NOT manager account status
  //
  // REMOTE ACCESS LOCKS (what this checks):
  //   - entityType "admin" = Admin locked remote access
  //   - entityType "manager" = Manager locked remote access (when account is "unlocked")
  //   - This is SEPARATE from manager account status (locked/unlocked/restricted)
  //
  // MANAGER ACCOUNT STATUS (checked separately in statistics):
  //   - This is stored in Manager.status field (locked/unlocked/restricted)
  //   - Controlled by admin, affects whether manager can login and perform actions
  async getSystemStatus(req, res) {
    // Preserve session data before operation (outside try block for error handling)
    const sessionPreserved = {
      sessionId: req.session?.sessionId,
      userId: req.session?.user?.id,
      userRole: req.session?.user?.role,
    };

    try {
      // Session is already validated by authenticateAdmin middleware
      // No need to call ensureSession again as it may cause logout on failure
      const adminId = req.admin.id;

      // Refresh session to prevent expiration (without validation)
      if (req.session && req.session.touch) {
        req.session.touch();
      }

      // Ensure session data is preserved
      if (req.session && !req.session.sessionId && sessionPreserved.sessionId) {
        req.session.sessionId = sessionPreserved.sessionId;
        if (!req.session.user && sessionPreserved.userId) {
          req.session.user = {
            id: sessionPreserved.userId,
            role: sessionPreserved.userRole,
          };
        }
      }
      console.log("📊 Admin checking REMOTE ACCESS LOCK status:");
      console.log("- Admin ID:", adminId);

      // Check for active REMOTE ACCESS locks (not manager account locks)
      // entityType "admin" or "manager" means who locked remote access, not account status
      const SystemState = require("../../../models/SystemState/systemState");
      const { Op } = require("sequelize");

      // Check for remote access locks created by admin or manager
      // NOTE: entityType refers to WHO locked remote access, not manager account status
      const activeLocks = await SystemState.findAll({
        where: {
          adminId: adminId,
          isActive: true,
          entityType: { [Op.in]: ["admin", "manager"] }, // Who locked remote access
        },
        order: [["lockedAt", "DESC"]],
      });

      console.log(
        `📊 Found ${activeLocks.length} active lock(s) for admin ${adminId}`
      );
      // Get system statistics
      const Manager = require("../../../models/Roleaccess/manager");
      const Organization = require("../../../models/Organization/organization");
      const AC = require("../../../models/AC/ac");
      const Venue = require("../../../models/Venue/venue");

      // Get all data with error handling
      let managers = [];
      let organizations = [];
      let acs = [];

      try {
        managers = await Manager.findAll({
          where: { adminId: adminId },
          attributes: ["id", "status", "lockedAt"],
        });
      } catch (err) {
        console.error("Error fetching managers:", err);
      }

      try {
        organizations = await Organization.findAll({
          where: { adminId: adminId },
          attributes: ["id", "status"],
        });
      } catch (err) {
        console.error("Error fetching organizations:", err);
      }

      try {
        // Get venues for this admin first, then get ACs
        const venues = await Venue.findAll({
          where: { adminId: adminId },
          attributes: ["id"],
        });
        const venueIds = venues.map((v) => v.id);

        if (venueIds.length > 0) {
          acs = await AC.findAll({
            where: { venueId: { [Op.in]: venueIds } },
            attributes: ["id", "isOn", "temperature"],
          });
        }
      } catch (err) {
        console.error("Error fetching ACs:", err);
      }
      // Build response separating remote access locks from manager account status
      const systemStatus = {
        isLocked: activeLocks.length > 0, // Remote access is locked (NOT manager account status)
        activeLocks: activeLocks.map((lock) => ({
          id: lock.id,
          entityType: lock.entityType, // "admin" or "manager" = who locked remote access
          entityId: lock.entityId,
          actionType: lock.actionType,
          reason: lock.reason || null,
          lockedAt: lock.lockedAt,
          lockedBy: lock.lockedBy || null,
        })),
        statistics: {
          // Manager account status statistics (SEPARATE from remote access locks)
          totalManagers: managers.length,
          lockedManagers: managers.filter((m) => m.status === "locked").length, // Account locked
          unlockedManagers: managers.filter((m) => m.status === "unlocked")
            .length, // Account unlocked
          restrictedManagers: managers.filter((m) => m.status === "restricted")
            .length, // Account restricted
          totalOrganizations: organizations.length,
          suspendedOrganizations: 0, // Organization suspension functionality removed
          totalACs: acs.length,
          lockedACs: 0, // AC model doesn't have currentState field
        },
      };

      console.log(
        `📊 Remote access lock: ${
          systemStatus.isLocked ? "LOCKED" : "UNLOCKED"
        }`
      );
      console.log(
        `📊 Manager accounts - Locked: ${systemStatus.statistics.lockedManagers}, Unlocked: ${systemStatus.statistics.unlockedManagers}, Restricted: ${systemStatus.statistics.restrictedManagers}`
      );

      // Ensure session is saved before sending response
      if (req.session && req.session.save) {
        await new Promise((resolve) => {
          req.session.save((err) => {
            if (err) {
              console.error(
                "⚠️ Session save warning (non-fatal):",
                err.message
              );
            }
            resolve();
          });
        });
      }

      res.json({
        success: true,
        message: "System status retrieved successfully",
        data: systemStatus,
      });
    } catch (error) {
      console.error("Get system status error:", error);

      // Ensure session is preserved even on error - do NOT destroy session
      if (req.session && !req.session.sessionId && sessionPreserved.sessionId) {
        req.session.sessionId = sessionPreserved.sessionId;
        if (!req.session.user && sessionPreserved.userId) {
          req.session.user = {
            id: sessionPreserved.userId,
            role: sessionPreserved.userRole,
          };
        }

        // Try to save session even on error
        if (req.session.save) {
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error(
                "⚠️ Session save error (non-fatal):",
                saveErr.message
              );
            }
          });
        }
      }

      res.status(500).json({
        success: false,
        message: "Error retrieving system status",
        error: error.message,
      });
    }
  }
  // 18. ADMIN TEMPERATURE CONTROL
  async setOrganizationTemperature(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const { orgId } = req.params;
      const { temperature } = req.body;
      const adminId = req.admin.id;
      console.log("🌡️ Setting organization temperature:");
      console.log("- Admin ID:", adminId);
      console.log("- Organization ID:", orgId);
      console.log("- Temperature:", temperature, "Type:", typeof temperature);
      console.log("- Request body:", req.body);
      console.log("- Session ID:", req.session?.sessionId);

      // Convert temperature to number if it's a string
      const tempValue = parseFloat(temperature);
      console.log("- Parsed temperature:", tempValue);

      if (
        !temperature ||
        isNaN(tempValue) ||
        tempValue < 16 ||
        tempValue > 30
      ) {
        console.log("❌ Temperature validation failed:", {
          temperature,
          tempValue,
          isNaN: isNaN(tempValue),
          lessThan16: tempValue < 16,
          greaterThan30: tempValue > 30,
        });
        return res.status(400).json({
          success: false,
          message: "Temperature must be between 16 and 30 degrees",
        });
      }

      // Use the parsed value
      const finalTemperature = tempValue;
      // Verify organization belongs to admin
      const organization = await Organization.findOne({
        where: { id: orgId, adminId: adminId },
      });
      if (!organization) {
        console.error("❌ Organization not found or unauthorized");
        return res.status(404).json({
          success: false,
          message: "Organization not found or unauthorized",
        });
      }
      console.log("✅ Organization found:", organization.name);
      const oldOrgTemp = organization.temperature;
      console.log(`🌡️ [ADMIN-ORG-TEMP] Temperature Change Request:`);
      console.log(`   └─ Organization: ${organization.name} (ID: ${orgId})`);
      console.log(`   └─ Old Temperature: ${oldOrgTemp}°C`);
      console.log(`   └─ New Temperature: ${finalTemperature}°C`);
      console.log(`   └─ Changed By: Admin (ID: ${adminId})`);
      console.log(`   └─ Timestamp: ${new Date().toISOString()}`);

      // Get all venues under this organization (including child venues)
      const Venue = require("../../../models/Venue/venue");
      const allOrgVenues = await Venue.findAll({
        where: {
          organizationId: orgId,
          adminId: adminId,
        },
        attributes: ["id", "name", "temperature", "organizationId"],
      });
      console.log(`📊 Found ${allOrgVenues.length} venues in organization`);

      // Get all ACs from all venues under this organization
      const venueIds = allOrgVenues.map((v) => v.id);
      const { Op } = require("sequelize");
      const acs =
        venueIds.length > 0
          ? await AC.findAll({
              where: { venueId: { [Op.in]: venueIds } },
              attributes: [
                "id",
                "name",
                "temperature",
                "serialNumber",
                "key",
                "isOn",
                "venueId",
              ],
            })
          : [];
      console.log(
        `📊 Found ${acs.length} ACs in organization (from ${allOrgVenues.length} venues)`
      );

      // Filter ACs by ON/OFF status for logging
      const acsOn = acs.filter((ac) => ac.isOn);
      const acsOff = acs.filter((ac) => !ac.isOn);

      // Log all ACs that will be updated
      if (acs.length > 0) {
        console.log(
          `🌡️ [ADMIN-ORG-TEMP] Will update ${acs.length} AC devices (${acsOn.length} ON, ${acsOff.length} OFF):`
        );
        acs.forEach((ac) => {
          console.log(
            `   └─ AC: ${ac.name} (${ac.serialNumber}) - Status: ${
              ac.isOn ? "ON" : "OFF"
            }`
          );
          console.log(
            `      Old Temp: ${ac.temperature}°C → New Temp: ${finalTemperature}°C`
          );
        });
      }

      // IMPORTANT: Organization model uses "venues" table (simple structure, no temperature field)
      // Venue model uses "organizations" table (complex structure with temperature field)
      // So we need to update Venue model for temperature, not Organization model

      // Find or create main Venue entry for this organization (for organization-level temperature)
      let mainVenue = await Venue.findOne({
        where: {
          organizationId: organization.id,
          adminId: adminId,
          name: organization.name, // Main venue has same name as organization
        },
      });

      // If not found, try by organizationId only (backward compatibility)
      if (!mainVenue) {
        mainVenue = await Venue.findOne({
          where: {
            organizationId: organization.id,
            adminId: adminId,
          },
        });
      }

      // If still not found, try by name (backward compatibility)
      if (!mainVenue) {
        mainVenue = await Venue.findOne({
          where: {
            name: organization.name,
            adminId: adminId,
          },
        });

        // If found by name but organizationId doesn't match, update it
        if (mainVenue && mainVenue.organizationId !== organization.id) {
          console.log(
            `⚠️ [ADMIN-ORG-TEMP] Found venue by name but organizationId mismatch. Updating organizationId...`
          );
          await mainVenue.update({ organizationId: organization.id });
        }
      }

      if (!mainVenue) {
        // Create main venue entry if it doesn't exist (for temperature control)
        console.log(
          `📝 [ADMIN-ORG-TEMP] Creating new main venue entry for organization: ${organization.name} (ID: ${organization.id})`
        );
        mainVenue = await Venue.create({
          name: organization.name,
          adminId: adminId,
          organizationId: organization.id,
          organizationSize: "Medium", // Required field, using default value
          status: organization.status || "active",
          temperature: finalTemperature,
          lastTemperatureChange: new Date(),
          changedBy: "admin",
        });
        console.log(
          `✅ [ADMIN-ORG-TEMP] Created main venue entry for temperature control: ${organization.name} (ID: ${mainVenue.id})`
        );
      } else {
        // Update main venue entry
        console.log(
          `📝 [ADMIN-ORG-TEMP] Updating main venue entry: ${mainVenue.name} (ID: ${mainVenue.id})`
        );
        await mainVenue.update({
          temperature: finalTemperature,
          lastTemperatureChange: new Date(),
          changedBy: "admin",
          organizationId: organization.id,
        });
        console.log(
          `✅ [ADMIN-ORG-TEMP] Updated main venue temperature: ${oldOrgTemp}°C → ${finalTemperature}°C`
        );
      }

      // Update ALL venues under this organization (including main venue)
      // Main venue already updated above, but we'll update all venues together to ensure consistency
      if (allOrgVenues.length > 0) {
        await Venue.update(
          {
            temperature: finalTemperature,
            lastTemperatureChange: new Date(),
            changedBy: "admin",
          },
          {
            where: {
              organizationId: orgId,
              adminId: adminId,
            },
          }
        );
        console.log(
          `✅ [ADMIN-ORG-TEMP] Updated ALL ${allOrgVenues.length} venues (including main) to ${finalTemperature}°C`
        );
      }

      // Check for devices with active events (skip them from temperature update)
      const deviceIds = acs.map((ac) => ac.id);
      const activeEvents =
        deviceIds.length > 0
          ? await Event.findAll({
              where: {
                deviceId: { [Op.in]: deviceIds },
                status: "active",
                isDisabled: false,
                eventType: "device",
              },
              attributes: ["deviceId"],
            })
          : [];
      const devicesWithActiveEvents = new Set(
        activeEvents.map((e) => e.deviceId)
      );
      const devicesToUpdate = acs.filter(
        (ac) => !devicesWithActiveEvents.has(ac.id)
      );
      const devicesSkipped = acs.filter((ac) =>
        devicesWithActiveEvents.has(ac.id)
      );

      if (devicesSkipped.length > 0) {
        console.log(
          `⚠️ [ADMIN-ORG-TEMP] Skipping ${
            devicesSkipped.length
          } device(s) with active events: ${devicesSkipped
            .map((ac) => ac.name)
            .join(", ")}`
        );
      }

      // Update ALL AC temperatures (ON and OFF both) - EXCEPT devices with active events
      if (devicesToUpdate.length > 0 && venueIds.length > 0) {
        const deviceIdsToUpdate = devicesToUpdate.map((ac) => ac.id);
        await AC.update(
          {
            temperature: finalTemperature,
            lastTemperatureChange: new Date(),
            changedBy: "admin",
          },
          {
            where: {
              venueId: { [Op.in]: venueIds },
              id: { [Op.in]: deviceIdsToUpdate },
              // Removed isOn: true - Update ALL devices (ON/OFF both) except those with active events
            },
          }
        );
        console.log(
          `✅ [ADMIN-ORG-TEMP] Updated ${
            devicesToUpdate.length
          } AC temperatures (${
            devicesToUpdate.filter((ac) => ac.isOn).length
          } ON, ${
            devicesToUpdate.filter((ac) => !ac.isOn).length
          } OFF): ${oldOrgTemp}°C → ${finalTemperature}°C`
        );
      }

      // Update energy consumption for all ACs after temperature change (only for ACs that are ON)
      try {
        for (const ac of acsOn) {
          await EnergyConsumptionService.updateACEnergy(ac.id);
        }
        // Update organization energy total
        await EnergyConsumptionService.updateOrganizationEnergy(orgId);
      } catch (energyError) {
        console.error(
          "⚠️ Error updating energy after temperature change:",
          energyError
        );
        // Don't fail the transaction - energy update is not critical
      }

      // Send temperature command to all ESP devices in organization
      try {
        console.log(
          `🔌 [ADMIN-CONTROLLER-ORG] Initiating WebSocket commands for ${acs.length} devices`
        );
        const Services = require("../../../services");
        const ESPService = Services.getESPService();

        let sentCount = 0;
        let skippedCount = 0;

        // Only send WebSocket commands to devices without active events
        for (const ac of devicesToUpdate) {
          if (ac.serialNumber) {
            console.log(`   └─ Processing device: ${ac.serialNumber}`);
            // Use startTemperatureSync with serial number for proper sync
            await ESPService.startTemperatureSync(
              ac.serialNumber,
              finalTemperature
            );
            sentCount++;
          } else {
            skippedCount++;
            console.log(
              `   └─ ⚠️ Device ${ac.id} has no serial number, skipped`
            );
          }
        }

        // Log skipped devices with active events
        for (const ac of devicesSkipped) {
          skippedCount++;
          console.log(
            `   └─ ⚠️ Device ${
              ac.serialNumber || ac.id
            } skipped (has active event)`
          );
        }

        console.log(`✅ [ADMIN-CONTROLLER-ORG] WebSocket commands completed:`);
        console.log(`   └─ Commands sent: ${sentCount}`);
        console.log(`   └─ Commands skipped: ${skippedCount}`);
      } catch (wsError) {
        console.error(
          "❌ [ADMIN-CONTROLLER-ORG] WebSocket commands failed (database already updated):",
          wsError.message
        );
        console.error(`   └─ Stack:`, wsError.stack);
        // Don't fail the whole operation if WebSocket fails
      }

      // Log activity (with error handling)
      try {
        await ActivityLog.create({
          adminId: adminId,
          action: "SET_ORGANIZATION_TEMPERATURE",
          targetType: "organization",
          targetId: orgId,
          details: `Set temperature to ${finalTemperature}°C for organization ${
            organization.name
          } (updated ${devicesToUpdate.length} ACs${
            devicesSkipped.length > 0
              ? `, ${devicesSkipped.length} skipped due to active events`
              : ""
          })`,
          // createdAt is handled automatically by Sequelize timestamps
        });
        console.log("✅ Activity log created successfully");
      } catch (logError) {
        console.error("⚠️ Failed to create activity log:", logError.message);
        // Continue even if activity log fails
      }
      // Reload main venue to get actual updated temperature from database
      // IMPORTANT: Reload after ALL updates are complete (venues and ACs)
      const updatedVenue = mainVenue
        ? await Venue.findByPk(mainVenue.id, {
            attributes: ["id", "name", "temperature", "organizationId"],
          })
        : null;

      // Use updatedVenue temperature if available, otherwise use finalTemperature
      const actualTemperature =
        updatedVenue?.temperature !== null &&
        updatedVenue?.temperature !== undefined
          ? updatedVenue.temperature
          : finalTemperature;

      console.log(
        `🌡️ [ADMIN-ORG-TEMP] Final temperature: ${actualTemperature}°C`
      );
      console.log(
        `   └─ Main Venue ID: ${updatedVenue?.id}, Temp: ${updatedVenue?.temperature}°C`
      );
      console.log(`   └─ Requested: ${finalTemperature}°C`);
      console.log(
        `   └─ Main Venue Name: ${updatedVenue?.name}, OrgId: ${updatedVenue?.organizationId}`
      );

      // Session refreshed by ensureSession helper
      res.json({
        success: true,
        message: `Organization temperature set to ${actualTemperature}°C. Updated ${
          allOrgVenues.length
        } venues and ${devicesToUpdate.length} devices (${
          devicesToUpdate.filter((ac) => ac.isOn).length
        } ON, ${devicesToUpdate.filter((ac) => !ac.isOn).length} OFF)${
          devicesSkipped.length > 0
            ? `. ${devicesSkipped.length} device(s) skipped due to active events`
            : ""
        }`,
        organization: {
          id: organization.id,
          name: organization.name,
          temperature: actualTemperature,
          hasMixedTemperatures: false, // Organization temp set, so no mixed (all venues now have same temp)
        },
        venuesUpdated: allOrgVenues.length,
        acsUpdated: acs.length,
        acsOnUpdated: acsOn.length,
        acsOffUpdated: acsOff.length,
        note: "Admin override: Temperature changed for all venues and devices (ON/OFF both). Manager locks are temporarily bypassed.",
        adminOverride: true,
      });
    } catch (error) {
      console.error("❌ Set organization temperature error:", error);
      console.error("❌ Error stack:", error.stack);
      // Session error handling managed by SessionHelper
      res.status(500).json({
        success: false,
        message: "Error setting organization temperature",
        error: error.message,
        details: "Temperature change failed. Your session is still active.",
      });
    }
  }

  // Toggle organization power (ON/OFF)
  async toggleOrganizationPower(req, res) {
    try {
      // Session validated by authenticateAdmin middleware

      const { organizationId } = req.params;
      const { powerState } = req.body; // true/false or "on"/"off"
      const adminId = req.admin.id;

      console.log("🔌 Toggling organization power:");
      console.log("- Admin ID:", adminId);
      console.log("- Organization ID:", organizationId);
      console.log("- Power State:", powerState);
      console.log("- Power State Type:", typeof powerState);

      // Validate organizationId
      if (!organizationId || isNaN(parseInt(organizationId))) {
        return res.status(400).json({
          success: false,
          message: "Invalid organization ID",
        });
      }

      // Validate powerState
      if (powerState === undefined || powerState === null) {
        return res.status(400).json({
          success: false,
          message: "Power state is required (true/false or 'on'/'off')",
        });
      }

      // Verify organization belongs to admin
      const organization = await Organization.findOne({
        where: { id: parseInt(organizationId), adminId: adminId },
      });

      if (!organization) {
        return res.status(404).json({
          success: false,
          message: "Organization not found or unauthorized",
        });
      }

      // Use OrganizationService to toggle organization power with hierarchical control
      const OrganizationService = require("../services/organizationService");
      const result = await OrganizationService.toggleOrganizationPower(
        parseInt(organizationId),
        powerState,
        "admin",
        adminId
      );

      res.json({
        success: true,
        message: result.message,
        organization: result.organization,
        venuesUpdated: result.venuesUpdated,
        acsUpdated: result.acsUpdated,
      });
    } catch (error) {
      console.error("Toggle organization power error:", error);
      res.status(500).json({
        success: false,
        message: "Error toggling organization power",
        error: error.message,
      });
    }
  }
  async toggleVenuePower(req, res) {
    try {
      const { venueId } = req.params;
      const { powerState } = req.body;
      const adminId = req.admin.id;

      if (!venueId || isNaN(parseInt(venueId))) {
        return res.status(400).json({
          success: false,
          message: "Invalid venue ID",
        });
      }

      if (powerState === undefined || powerState === null) {
        return res.status(400).json({
          success: false,
          message: "Power state is required (true/false or 'on'/'off')",
        });
      }

      const result = await VenueService.toggleVenuePower(
        parseInt(venueId),
        powerState,
        "admin",
        adminId
      );

      res.json({
        success: true,
        message: result.message,
        venue: result.venue,
        acsUpdated: result.acsUpdated,
      });
    } catch (error) {
      console.error("Toggle venue power error:", error);
      res.status(500).json({
        success: false,
        message: "Error toggling venue power",
        error: error.message,
      });
    }
  }
  async setVenueTemperature(req, res) {
    try {
      const { venueId } = req.params;
      const { temperature } = req.body;
      const adminId = req.admin.id;

      const tempValue = parseFloat(temperature);

      if (
        !temperature ||
        isNaN(tempValue) ||
        tempValue < 16 ||
        tempValue > 30
      ) {
        return res.status(400).json({
          success: false,
          message: "Temperature must be between 16 and 30 degrees",
        });
      }

      const venue = await Venue.findOne({
        where: { id: venueId, adminId: adminId },
      });

      if (!venue) {
        return res.status(404).json({
          success: false,
          message: "Venue not found or unauthorized",
        });
      }

      await venue.update({
        temperature: tempValue,
        lastTemperatureChange: new Date(),
        changedBy: "admin",
      });

      // Update ALL ACs in this venue (ON/OFF both) - User requirement
      const acs = await AC.findAll({
        where: { venueId: venueId },
        attributes: [
          "id",
          "name",
          "temperature",
          "serialNumber",
          "key",
          "isOn",
          "venueId",
        ],
      });

      // Check for devices with active events (skip them from temperature update)
      const deviceIds = acs.map((ac) => ac.id);
      const activeEvents =
        deviceIds.length > 0
          ? await Event.findAll({
              where: {
                deviceId: { [Op.in]: deviceIds },
                status: "active",
                isDisabled: false,
                eventType: "device",
              },
              attributes: ["deviceId"],
            })
          : [];
      const devicesWithActiveEvents = new Set(
        activeEvents.map((e) => e.deviceId)
      );
      const devicesToUpdate = acs.filter(
        (ac) => !devicesWithActiveEvents.has(ac.id)
      );
      const devicesSkipped = acs.filter((ac) =>
        devicesWithActiveEvents.has(ac.id)
      );

      if (devicesSkipped.length > 0) {
        console.log(
          `⚠️ [ADMIN-VENUE-TEMP] Skipping ${
            devicesSkipped.length
          } device(s) with active events: ${devicesSkipped
            .map((ac) => ac.name)
            .join(", ")}`
        );
      }

      if (devicesToUpdate.length > 0) {
        const deviceIdsToUpdate = devicesToUpdate.map((ac) => ac.id);
        await AC.update(
          {
            temperature: tempValue,
            lastTemperatureChange: new Date(),
            changedBy: "admin",
          },
          {
            where: {
              venueId: venueId,
              id: { [Op.in]: deviceIdsToUpdate },
            },
          }
        );
        console.log(
          `✅ [ADMIN-VENUE-TEMP] Updated ${devicesToUpdate.length} ACs in venue to ${tempValue}°C (${devicesSkipped.length} skipped due to active events)`
        );
      }

      // Send temperature command to all ESP devices in venue
      try {
        console.log(
          `🔌 [ADMIN-VENUE-TEMP] Initiating WebSocket commands for ${acs.length} devices`
        );
        const Services = require("../../../services");
        const ESPService = Services.getESPService();

        let sentCount = 0;
        let skippedCount = 0;

        // Only send WebSocket commands to devices without active events
        for (const ac of devicesToUpdate) {
          if (ac.serialNumber) {
            try {
              console.log(`   └─ Processing device: ${ac.serialNumber}`);
              await ESPService.startTemperatureSync(ac.serialNumber, tempValue);
              sentCount++;
            } catch (wsError) {
              skippedCount++;
              console.error(
                `   └─ ⚠️ WebSocket error for ${ac.serialNumber}:`,
                wsError.message
              );
            }
          } else {
            skippedCount++;
            console.log(
              `   └─ ⚠️ Device ${ac.id} has no serial number, skipped`
            );
          }
        }

        // Log skipped devices with active events
        for (const ac of devicesSkipped) {
          skippedCount++;
          console.log(
            `   └─ ⚠️ Device ${
              ac.serialNumber || ac.id
            } skipped (has active event)`
          );
        }

        console.log(`✅ [ADMIN-VENUE-TEMP] WebSocket commands completed:`);
        console.log(`   └─ Commands sent: ${sentCount}`);
        console.log(`   └─ Commands skipped: ${skippedCount}`);
      } catch (wsError) {
        console.error(
          "❌ [ADMIN-VENUE-TEMP] WebSocket commands failed (database already updated):",
          wsError.message
        );
        // Don't fail the whole operation if WebSocket fails
      }

      // Check if organization has mixed temperatures after venue change
      let organizationHasMixed = false;
      let organizationId = null;
      let organizationTemp = null;

      if (venue.organizationId) {
        organizationId = venue.organizationId;
        const { Op } = require("sequelize");
        const Organization = require("../../../models/Organization/organization");

        // Get organization
        const organization = await Organization.findByPk(organizationId);

        if (!organization) {
          console.error(
            `❌ [ADMIN-VENUE-TEMP] Organization ${organizationId} not found`
          );
        } else {
          // Get main venue (organization's temperature entry) - try multiple ways
          let mainVenue = await Venue.findOne({
            where: {
              organizationId: organizationId,
              adminId: adminId,
              name: organization.name, // Main venue has same name as organization
            },
            attributes: ["id", "temperature", "name"],
          });

          // If not found, try by organizationId only
          if (!mainVenue) {
            mainVenue = await Venue.findOne({
              where: {
                organizationId: organizationId,
                adminId: adminId,
              },
              attributes: ["id", "temperature", "name"],
              order: [["createdAt", "ASC"]], // Get the first one created
            });
          }

          // Get all venues in this organization (including main venue)
          const orgVenues = await Venue.findAll({
            where: { organizationId: organizationId, adminId: adminId },
            attributes: ["id", "temperature", "name"],
          });

          // Get organization temperature from main venue
          organizationTemp = mainVenue?.temperature || null;

          // Get all venue temperatures
          const allVenueTemps = [];
          orgVenues.forEach((v) => {
            if (v.temperature !== null && v.temperature !== undefined) {
              allVenueTemps.push(v.temperature);
            }
          });

          // Check if we have multiple different temperatures
          if (allVenueTemps.length > 1) {
            const uniqueTemps = [...new Set(allVenueTemps)];
            organizationHasMixed = uniqueTemps.length > 1;
          }

          // Also check if organization temp (main venue) is different from any other venue temp
          if (
            !organizationHasMixed &&
            organizationTemp !== null &&
            organizationTemp !== undefined &&
            allVenueTemps.length > 1
          ) {
            // Check if any venue has different temp than main venue
            organizationHasMixed = orgVenues.some((v) => {
              if (v.id === mainVenue?.id) return false; // Skip main venue
              return (
                v.temperature !== null &&
                v.temperature !== undefined &&
                v.temperature !== organizationTemp
              );
            });
          }

          console.log(
            `🔍 [ADMIN-VENUE-TEMP] Organization mixed check: ${
              organizationHasMixed ? "MIXED" : "UNIFORM"
            }`
          );
          console.log(
            `   Org Temp (main venue): ${organizationTemp}, Main Venue ID: ${mainVenue?.id}`
          );
          console.log(`   All Venue Temps: [${allVenueTemps.join(", ")}]`);
          console.log(
            `   Venue Details:`,
            orgVenues.map((v) => ({
              id: v.id,
              name: v.name,
              temp: v.temperature,
            }))
          );
        }
      }

      // Reload venue to get actual updated temperature from database
      const updatedVenue = await Venue.findOne({
        where: { id: venueId, adminId: adminId },
        attributes: ["id", "name", "temperature"],
      });

      const actualTemperature = updatedVenue?.temperature || tempValue;

      console.log(`🌡️ [ADMIN-VENUE-TEMP] Response data:`, {
        venue: {
          id: updatedVenue.id,
          name: updatedVenue.name,
          temperature: actualTemperature,
        },
        organization: organizationId
          ? {
              id: organizationId,
              temperature: organizationTemp,
              hasMixedTemperatures: organizationHasMixed,
            }
          : null,
      });

      res.json({
        success: true,
        message: `Venue temperature updated to ${actualTemperature}°C. Updated ${
          devicesToUpdate.length
        } devices${
          devicesSkipped.length > 0
            ? `. ${devicesSkipped.length} device(s) skipped due to active events`
            : ""
        }.`,
        venue: {
          id: updatedVenue.id,
          name: updatedVenue.name,
          temperature: actualTemperature,
          hasMixedTemperatures: false, // Venue temp set, so no mixed
        },
        organization: organizationId
          ? {
              id: organizationId,
              temperature:
                organizationTemp !== null && organizationTemp !== undefined
                  ? organizationTemp
                  : null,
              hasMixedTemperatures: organizationHasMixed,
            }
          : undefined,
        acsUpdated: acs.length,
      });
    } catch (error) {
      console.error("Set venue temperature error:", error);
      res.status(500).json({
        success: false,
        message: "Error setting venue temperature",
        error: error.message,
      });
    }
  }
  async setACTemperature(req, res) {
    console.log("🔔 [ROUTE-HIT] setACTemperature called!");
    console.log("🔔 [ROUTE-HIT] Method:", req.method);
    console.log("🔔 [ROUTE-HIT] URL:", req.url);
    console.log("🔔 [ROUTE-HIT] Params:", req.params);
    console.log("🔔 [ROUTE-HIT] Body:", req.body);
    try {
      // Session validated by authenticateAdmin middleware
      const { acId } = req.params;
      const { temperature } = req.body;
      const adminId = req.admin?.id;
      console.log("🌡️ Setting AC temperature:");
      console.log("- Admin ID:", adminId);
      console.log("- AC ID:", acId);
      console.log("- Temperature:", temperature, "Type:", typeof temperature);
      console.log("- Request body:", req.body);
      console.log("- Session ID:", req.session?.sessionId);

      // Convert temperature to number if it's a string
      const tempValue = parseFloat(temperature);
      console.log("- Parsed temperature:", tempValue);

      if (
        !temperature ||
        isNaN(tempValue) ||
        tempValue < 16 ||
        tempValue > 30
      ) {
        console.log("❌ Temperature validation failed:", {
          temperature,
          tempValue,
          isNaN: isNaN(tempValue),
          lessThan16: tempValue < 16,
          greaterThan30: tempValue > 30,
        });
        return res.status(400).json({
          success: false,
          message: "Temperature must be between 16 and 30 degrees",
        });
      }

      // Use the parsed value
      const finalTemperature = tempValue;

      // Verify AC belongs to admin through venue
      // ACs belong to Venues, and Venues belong to Admin
      const Venue = require("../../../models/Venue/venue");
      const ac = await AC.findOne({
        include: [
          {
            model: Venue,
            as: "venue",
            where: { adminId: adminId },
            required: true,
          },
        ],
        where: { id: acId },
      });
      if (!ac) {
        console.error("❌ AC device not found or unauthorized");
        return res.status(404).json({
          success: false,
          message: "AC device not found or unauthorized",
        });
      }
      console.log(
        "✅ AC device found:",
        ac.name,
        "in venue:",
        ac.venue?.name || "Unknown"
      );

      // Check if device is OFF - reject temperature changes when device is OFF
      if (!ac.isOn) {
        console.log(
          `❌ Cannot change temperature: Device ${ac.name} (${ac.serialNumber}) is OFF`
        );
        return res.status(400).json({
          success: false,
          message: "Cannot change temperature: Device is OFF",
        });
      }

      // Capture old temperature BEFORE updating database
      const oldTemp = ac.temperature || 16;

      // Update AC temperature (only when device is ON)
      await ac.update({
        temperature: finalTemperature,
        lastTemperatureChange: new Date(),
        changedBy: "admin",
      });
      console.log("✅ AC temperature updated successfully");

      // Check if venue has mixed temperatures after device change
      // Mixed = any device temp is different from venue temp
      const { Op } = require("sequelize");
      const venue = await Venue.findOne({
        where: { id: ac.venueId },
        attributes: ["id", "temperature"],
      });

      const venueACs = await AC.findAll({
        where: { venueId: ac.venueId },
        attributes: ["id", "temperature"],
      });

      let venueHasMixed = false;
      const venueTemp = venue?.temperature || null;

      // Check if any device has different temperature than venue
      if (
        venueTemp !== null &&
        venueTemp !== undefined &&
        venueACs.length > 0
      ) {
        venueHasMixed = venueACs.some((device) => {
          const deviceTemp = device.temperature || null;
          return (
            deviceTemp !== null &&
            deviceTemp !== undefined &&
            deviceTemp !== venueTemp
          );
        });
      } else if (venueACs.length > 1) {
        // If venue temp is null, check if devices have different temps among themselves
        const firstTemp = venueACs[0].temperature;
        venueHasMixed = venueACs.some(
          (device) => device.temperature !== firstTemp
        );
      }

      console.log(
        `🔍 [ADMIN-AC-TEMP] Venue mixed check: ${
          venueHasMixed ? "MIXED" : "UNIFORM"
        }`
      );
      console.log(
        `   Venue Temp: ${venueTemp}, Device Temps: [${venueACs
          .map((d) => d.temperature)
          .join(", ")}]`
      );

      // Check if organization has mixed temperatures
      // Mixed = any venue temp is different from organization temp (main venue temp)
      let organizationHasMixed = false;
      let organizationTemp = null;

      if (ac.venue?.organizationId) {
        const Organization = require("../../../models/Organization/organization");
        const organization = await Organization.findByPk(
          ac.venue.organizationId
        );

        if (organization) {
          // Get main venue (organization's temperature entry)
          const mainVenue = await Venue.findOne({
            where: {
              organizationId: ac.venue.organizationId,
              adminId: adminId,
              name: organization.name, // Main venue has same name as organization
            },
            attributes: ["id", "temperature", "name"],
          });

          // If not found, try by organizationId only
          const mainVenueFallback =
            mainVenue ||
            (await Venue.findOne({
              where: {
                organizationId: ac.venue.organizationId,
                adminId: adminId,
              },
              attributes: ["id", "temperature", "name"],
              order: [["createdAt", "ASC"]],
            }));

          organizationTemp = mainVenueFallback?.temperature || null;

          // Get all venues in this organization
          const orgVenues = await Venue.findAll({
            where: {
              organizationId: ac.venue.organizationId,
              adminId: adminId,
            },
            attributes: ["id", "temperature", "name"],
          });

          // Check if any venue has different temp than organization (main venue)
          if (
            organizationTemp !== null &&
            organizationTemp !== undefined &&
            orgVenues.length > 0
          ) {
            organizationHasMixed = orgVenues.some((v) => {
              if (v.id === mainVenueFallback?.id) return false; // Skip main venue
              const venueTemp = v.temperature || null;
              return (
                venueTemp !== null &&
                venueTemp !== undefined &&
                venueTemp !== organizationTemp
              );
            });
          } else if (orgVenues.length > 1) {
            // If org temp is null, check if venues have different temps among themselves
            const firstVenueTemp = orgVenues[0].temperature;
            organizationHasMixed = orgVenues.some(
              (v) => v.temperature !== firstVenueTemp
            );
          }

          console.log(
            `🔍 [ADMIN-AC-TEMP] Organization mixed check: ${
              organizationHasMixed ? "MIXED" : "UNIFORM"
            }`
          );
          console.log(
            `   Org Temp (main venue): ${organizationTemp}, Main Venue ID: ${mainVenueFallback?.id}`
          );
          console.log(
            `   All Venue Temps: [${orgVenues
              .map((v) => v.temperature)
              .join(", ")}]`
          );
        }
      }

      // Update energy consumption after temperature change
      try {
        await EnergyConsumptionService.updateACEnergy(acId);
        // Get organizationId from venue if available
        if (ac.venue?.organizationId) {
          await EnergyConsumptionService.updateOrganizationEnergy(
            ac.venue.organizationId
          );
        }
      } catch (energyError) {
        console.error(
          "⚠️ Error updating energy after temperature change:",
          energyError
        );
        // Don't fail the transaction - energy update is not critical
      }

      // Send temperature command to ESP via WebSocket
      try {
        if (ac.key) {
          console.log(
            `🔌 [ADMIN-CONTROLLER-AC] Initiating WebSocket command for device ${ac.serialNumber} (Key: ${ac.key})`
          );
          const Services = require("../../../services");
          const ESPService = Services.getESPService();

          // Calculate direction and always send only 1 pulse
          // oldTemp was captured BEFORE database update
          const tempDiff = finalTemperature - oldTemp;
          console.log(
            `🔍 [ADMIN-CONTROLLER-AC] Temperature difference: ${oldTemp}°C → ${finalTemperature}°C (diff: ${tempDiff}°C)`
          );
          console.log(
            `📊 [CONSOLE] Device ${ac.serialNumber} (Key: ${ac.key}): Current Temp = ${oldTemp}°C, New Temp = ${finalTemperature}°C`
          );
          // Always sync temperature to database value (even if tempDiff is 0 - ensures sync)
          // Database already updated above, now sync ESP32 to match database
          await ESPService.startTemperatureSync(
            ac.serialNumber,
            finalTemperature
          );
          console.log(
            `✅ [ADMIN-CONTROLLER-AC] Temperature sync started: ${oldTemp}°C → ${finalTemperature}°C`
          );
        } else {
          console.log(
            `⚠️ [ADMIN-CONTROLLER-AC] Device ${ac.id} has no serial number, skipping WebSocket command`
          );
        }
      } catch (wsError) {
        console.error(
          "❌ [ADMIN-CONTROLLER-AC] WebSocket command failed (database already updated):",
          wsError.message
        );
        console.error(`   └─ Stack:`, wsError.stack);
        // Don't fail the whole operation if WebSocket fails
      }

      // Broadcast real-time update to all frontend clients (admin and manager)
      try {
        ESPService.broadcastToFrontend({
          device_id: ac.serialNumber,
          serialNumber: ac.serialNumber,
          temperature: finalTemperature,
          isOn: ac.isOn,
          changedBy: "admin",
          organizationId: ac.organizationId,
          venueId: ac.venueId,
          timestamp: new Date().toISOString(),
        });
        console.log(
          `📡 [ADMIN-CONTROLLER-AC] Broadcasted temperature change to all frontend clients`
        );
      } catch (broadcastError) {
        console.error(
          "⚠️ Error broadcasting temperature change:",
          broadcastError
        );
        // Don't fail the operation if broadcast fails
      }

      // Log activity (with error handling)
      try {
        await ActivityLog.create({
          adminId: adminId,
          action: "SET_AC_TEMPERATURE",
          targetType: "ac",
          targetId: acId,
          details: `Set temperature to ${finalTemperature}°C for AC ${ac.name}`,
          // createdAt is handled automatically by Sequelize timestamps
        });
        console.log("✅ Activity log created successfully");
      } catch (logError) {
        console.error("⚠️ Failed to create activity log:", logError.message);
        // Continue even if activity log fails
      }
      // Reload AC to get actual updated temperature from database
      const updatedAC = await AC.findOne({
        where: { id: acId },
        attributes: ["id", "name", "serialNumber", "temperature"],
      });

      const actualTemperature = updatedAC?.temperature || finalTemperature;

      // Session refreshed by ensureSession helper
      res.json({
        success: true,
        message: `AC temperature set to ${actualTemperature}°C (admin override - bypasses manager locks)`,
        ac: {
          id: updatedAC.id,
          name: updatedAC.name,
          serialNumber: updatedAC.serialNumber,
          temperature: actualTemperature,
        },
        venue: ac.venueId
          ? {
              id: ac.venueId,
              hasMixedTemperatures: venueHasMixed,
            }
          : undefined,
        organization: ac.venue?.organizationId
          ? {
              id: ac.venue.organizationId,
              hasMixedTemperatures: organizationHasMixed,
            }
          : undefined,
        note: "Admin override: Temperature changed regardless of manager lock status. Manager locks are temporarily bypassed.",
        adminOverride: true,
      });
    } catch (error) {
      console.error("❌ Set AC temperature error:", error);
      console.error("❌ Error stack:", error.stack);
      // Session error handling managed by SessionHelper
      res.status(500).json({
        success: false,
        message: "Error setting AC temperature",
        error: error.message,
        details: "Temperature change failed. Your session is still active.",
      });
    }
  }
  // 19. GET ACS
  async getACs(req, res) {
    try {
      const adminId = req.admin.id;
      const result = await ACService.getACsByAdmin(adminId);
      res.json({
        success: true,
        data: result.acs,
      });
    } catch (error) {
      console.error("Get ACs error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching AC devices",
        error: error.message,
      });
    }
  }
  // 20. GET AC DETAILS
  async getACDetails(req, res) {
    try {
      const { acId } = req.params;
      const adminId = req.admin.id;
      const result = await ACService.getACDetails(adminId, acId);
      res.json({
        success: true,
        data: { ac: result.ac },
      });
    } catch (error) {
      console.error("Get AC details error:", error);
      if (
        error.message.includes("not found") ||
        error.message.includes("unauthorized")
      ) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      res.status(500).json({
        success: false,
        message: "Error fetching AC details",
        error: error.message,
      });
    }
  }
  // 21. GET ACS BY ORGANIZATION - UNUSED (Route commented out, not used in frontend)
  /*
  async getACsByOrganization(req, res) {
    try {
      const { organizationId } = req.params;
      const adminId = req.admin.id;
      const result = await ACService.getACsByOrganization(adminId, organizationId);
      res.json({
        success: true,
        data: result.acs,
      });
    } catch (error) {
      console.error("Get ACs by organization error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching AC devices",
        error: error.message,
      });
    }
  }
  */
  // 22. TOGGLE AC STATUS
  async toggleACStatus(req, res) {
    try {
      // Session already validated by authenticateAdmin middleware
      // Just refresh it if needed
      if (req.session && req.session.touch) {
        req.session.touch();
      }

      const { acId } = req.params;
      const { status } = req.body;

      // Get adminId from req.admin (set by authenticateAdmin middleware)
      if (!req.admin || !req.admin.id) {
        return res.status(401).json({
          success: false,
          message: "Admin authentication required",
        });
      }

      // Validate status parameter
      if (status === undefined || status === null) {
        return res.status(400).json({
          success: false,
          message:
            "Status is required (true/false, 'on'/'off', or 'active'/'inactive')",
        });
      }

      const adminId = req.admin.id;

      // ACs belong to Venues, and Venues belong to Admin
      const Venue = require("../../../models/Venue/venue");
      const ac = await AC.findOne({
        where: { id: acId },
        include: [
          {
            model: Venue,
            as: "venue",
            where: { adminId: adminId },
            required: true,
          },
        ],
      });
      if (!ac) {
        return res.status(404).json({
          success: false,
          message: "AC device not found or unauthorized",
        });
      }

      // Check venue power state - if venue is OFF, cannot toggle individual AC
      const venue = ac.venue;
      if (venue && venue.isVenueOn === false) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot toggle individual AC: Venue is currently OFF. Please turn on the venue first.",
        });
      }

      const oldStatus = ac.isOn;
      const newStatus =
        status === true || status === "on" || status === "active";

      // Check if AC was locked by manager (admin has superiority to override)
      const wasLockedByManager =
        ac.currentState === "locked" &&
        ac.lockedBy &&
        ac.lockedBy.startsWith("Manager-");
      const wasLocked = ac.currentState === "locked";

      await ac.update({
        isOn: newStatus,
        lastPowerChangeAt: new Date(),
        lastPowerChangeBy: "admin",
        // When turning ON, reset working status and clear alerts (fresh start)
        // Alert system will check if it's actually working after it's been on
        ...(newStatus
          ? {
              isWorking: true,
              alertAt: null,
            }
          : {}),
        // If AC was locked, admin override unlocks it for power control
        ...(wasLocked
          ? {
              currentState: "unlocked",
              lockedAt: null,
              lockReason: null,
              lockedBy: null,
              adminOverride: true,
              adminOverrideAt: new Date(),
            }
          : {}),
      });

      // Log activity with admin override flag if manager lock was bypassed
      const action = wasLockedByManager
        ? "ADMIN_OVERRIDE_TOGGLE_AC_POWER"
        : "TOGGLE_AC_STATUS";
      const details = wasLockedByManager
        ? `Admin override: AC ${ac.name} power changed from ${
            oldStatus ? "ON" : "OFF"
          } to ${
            newStatus ? "ON" : "OFF"
          } (Admin has superiority - bypassed manager lock)`
        : `AC ${ac.name} power changed from ${oldStatus ? "ON" : "OFF"} to ${
            newStatus ? "ON" : "OFF"
          }`;

      await ActivityLog.create({
        adminId: adminId,
        action: action,
        targetType: "ac",
        targetId: acId,
        details: details,
        // createdAt is handled automatically by Sequelize timestamps
      });

      // Handle energy consumption tracking when power state changes
      try {
        if (newStatus && !oldStatus) {
          // AC turned ON - initialize startup period and energy tracking
          await EnergyConsumptionService.handleACPowerOn(acId);
        } else if (!newStatus && oldStatus) {
          // AC turned OFF - finalize energy calculation
          await EnergyConsumptionService.handleACPowerOff(acId);
        }
      } catch (energyError) {
        console.error(
          "⚠️ Error updating energy consumption after power change:",
          energyError
        );
        // Don't fail the whole operation if energy update fails
      }

      // Send power command to ESP via WebSocket
      try {
        if (ac.serialNumber) {
          console.log(
            `🔌 [ADMIN-CONTROLLER-POWER] Initiating WebSocket command for device ${ac.serialNumber}`
          );
          console.log(`   └─ Power state: ${newStatus ? "ON" : "OFF"}`);
          const Services = require("../../../services");
          const ESPService = Services.getESPService();
          const wsResult = await ESPService.sendPowerCommand(
            ac.serialNumber, // Use serialNumber (ESP32 connections are keyed by serialNumber)
            newStatus
          );

          if (wsResult.success) {
            console.log(
              `✅ [ADMIN-CONTROLLER-POWER] WebSocket command sent successfully to ${ac.serialNumber}`
            );
          } else {
            console.log(
              `⚠️ [ADMIN-CONTROLLER-POWER] WebSocket command result: ${wsResult.message}`
            );
          }
        } else {
          console.log(
            `⚠️ [ADMIN-CONTROLLER-POWER] Device ${ac.id} has no serialNumber, skipping WebSocket command`
          );
        }
      } catch (wsError) {
        console.error(
          "❌ [ADMIN-CONTROLLER-POWER] WebSocket command failed (database already updated):",
          wsError.message
        );
        console.error(`   └─ Stack:`, wsError.stack);
        // Don't fail the whole operation if WebSocket fails
      }

      // Broadcast real-time update to all frontend clients (admin and manager)
      try {
        ESPService.broadcastToFrontend({
          device_id: ac.serialNumber,
          serialNumber: ac.serialNumber,
          temperature: ac.temperature,
          isOn: newStatus,
          changedBy: "admin",
          organizationId: ac.organizationId,
          venueId: ac.venueId,
          timestamp: new Date().toISOString(),
        });
        console.log(
          `📡 [ADMIN-CONTROLLER-POWER] Broadcasted power change to all frontend clients`
        );
      } catch (broadcastError) {
        console.error("⚠️ Error broadcasting power change:", broadcastError);
        // Don't fail the operation if broadcast fails
      }

      // Reload AC to get actual updated state from database
      const updatedAC = await AC.findOne({
        where: { id: acId },
        attributes: [
          "id",
          "name",
          "serialNumber",
          "isOn",
          "currentState",
          "lockedBy",
        ],
      });

      const actualIsOn = updatedAC?.isOn ?? newStatus;

      res.json({
        success: true,
        message: `AC power updated to ${actualIsOn ? "ON" : "OFF"}${
          wasLockedByManager ? " (Admin Override - bypassed manager lock)" : ""
        }`,
        adminOverride: wasLockedByManager || wasLocked,
        ac: {
          id: updatedAC.id,
          name: updatedAC.name,
          serialNumber: updatedAC.serialNumber,
          isOn: actualIsOn,
          currentState: updatedAC.currentState,
          lockedBy: updatedAC.lockedBy,
        },
      });
    } catch (error) {
      console.error("Toggle AC status error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating AC status",
        error: error.message,
      });
    }
  }
  // 22B. TOGGLE AC LOCK STATUS (Lock/Unlock Device)
  async toggleACLockStatus(req, res) {
    try {
      // Session validated by authenticateAdmin middleware

      const { acId } = req.params;
      const { action, reason } = req.body; // action: 'lock' or 'unlock'

      if (!action || !["lock", "unlock"].includes(action)) {
        return res.status(400).json({
          success: false,
          message: "Action must be 'lock' or 'unlock'",
        });
      }

      const adminId = req.admin.id;
      const result = await ACService.toggleACStatus(
        adminId,
        acId,
        action,
        reason
      );

      // Broadcast lock status change via WebSocket for real-time sync
      try {
        const Services = require("../../../services");
        const ESPService = Services.getESPService();
        ESPService.broadcastToFrontend({
          type: "ac_lock_status_changed",
          acId: acId,
          currentState: result.ac.currentState,
          lockedBy: result.ac.lockedBy,
          lockedAt: result.ac.lockedAt,
          lockReason: result.ac.lockReason,
        });
      } catch (wsError) {
        console.error("WebSocket broadcast error:", wsError);
        // Don't fail the operation if WebSocket fails
      }

      res.json(result);
    } catch (error) {
      console.error("Toggle AC lock status error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating AC lock status",
        error: error.message,
      });
    }
  }
  // 23. GET MANAGER ACTIVITY LOGS - UNUSED (Route commented out, not used in frontend)
  /*
  async getManagerActivityLogs(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const adminId = req.admin.id;
      const { managerId } = req.params;
      let whereClause = { adminId: adminId };
      if (managerId) {
        whereClause.targetId = managerId;
        whereClause.targetType = "manager";
      }
      const logs = await ActivityLog.findAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
        limit: 100,
      });
      res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      console.error("Get manager activity logs error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching activity logs",
        error: error.message,
      });
    }
  }
  */
  // 24. GET ACTIVITY LOGS WITH FILTERS
  async getActivityLogs(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const adminId = req.admin.id;
      const { targetType, limit = 50 } = req.query;
      let whereClause = { adminId: adminId };
      if (targetType) {
        whereClause.targetType = targetType;
      }
      const logs = await ActivityLog.findAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        include: [
          {
            model: Admin,
            as: "admin",
            attributes: ["id", "name", "email"],
          },
        ],
      });
      res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      console.error("Get activity logs error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching activity logs",
        error: error.message,
      });
    }
  }
  // 25. SEND CRITICAL ALERT - UNUSED (Route commented out, not used in frontend)
  /*
  async sendCriticalAlert(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const { message, severity, targetType, targetId } = req.body;
      const adminId = req.admin.id;
      // Log activity
      await ActivityLog.create({
        adminId: adminId,
        action: "SEND_CRITICAL_ALERT",
        targetType: targetType || "manager", // ActivityLog enum doesn't include "system"
        targetId: targetId || 0, // Use 0 for system-wide operations
        details: `Critical alert sent: ${message}`,
        // createdAt is handled automatically by Sequelize timestamps
      });
      res.json({
        success: true,
        message: "Critical alert sent successfully",
        alert: {
          message,
          severity,
          sentBy: adminId,
          // createdAt is handled automatically by Sequelize timestamps
        },
      });
    } catch (error) {
      console.error("Send critical alert error:", error);
      res.status(500).json({
        success: false,
        message: "Error sending critical alert",
        error: error.message,
      });
    }
  }
  */
  // 26. GET DASHBOARD DATA
  async getDashboardData(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const adminId = req.admin.id;
      console.log("📊 Admin dashboard data request:");
      console.log("- Admin ID:", adminId);
      // Test basic connectivity first
      const testAdmin = await Admin.findByPk(adminId);
      if (!testAdmin) {
        throw new Error("Admin not found in database");
      }
      console.log("✅ Admin found:", testAdmin.name);
      const [
        managersCount,
        organizationsCount,
        venuesCount,
        acsCount,
        recentLogs,
        managers,
        organizations,
        acs,
        systemStatus,
      ] = await Promise.all([
        Manager.count({ where: { adminId: adminId } }).catch((err) => {
          console.error("❌ Error counting managers:", err);
          return 0;
        }),
        Organization.count({
          where: {
            adminId: adminId,
            status: { [Op.ne]: "split" }, // Exclude split organizations from count
          },
        }).catch((err) => {
          console.error("❌ Error counting organizations:", err);
          return 0;
        }),
        // Get venue count (exclude split venues and organization temperature entries)
        Venue.count({
          where: {
            adminId: adminId,
            status: { [Op.ne]: "split" }, // Exclude split venues
          },
          include: [
            {
              model: Organization,
              as: "organization",
              required: false,
              attributes: ["id", "name"],
            },
          ],
        })
          .then(async (count) => {
            // Filter out organization temperature entries (venues with same name as organization)
            const allVenues = await Venue.findAll({
              where: {
                adminId: adminId,
                status: { [Op.ne]: "split" },
              },
              include: [
                {
                  model: Organization,
                  as: "organization",
                  required: false,
                  attributes: ["id", "name"],
                },
              ],
              attributes: ["id", "name", "organizationId"],
            });

            const organizations = await Organization.findAll({
              where: { adminId: adminId },
              attributes: ["id", "name"],
            });

            const orgNames = new Set(organizations.map((org) => org.name));
            const actualVenues = allVenues.filter((venue) => {
              if (
                venue.organization &&
                venue.organization.name === venue.name
              ) {
                return false; // This is a temperature entry
              }
              if (orgNames.has(venue.name) && venue.organizationId) {
                const parentOrg = organizations.find(
                  (org) => org.id === venue.organizationId
                );
                if (parentOrg && parentOrg.name === venue.name) {
                  return false; // Temperature entry
                }
              }
              return true;
            });

            return actualVenues.length;
          })
          .catch((err) => {
            console.error("❌ Error counting venues:", err);
            return 0;
          }),
        AC.count({
          include: [
            {
              model: Organization,
              as: "organization",
              where: { adminId: adminId },
            },
          ],
        }).catch((err) => {
          console.error("❌ Error counting ACs:", err);
          return 0;
        }),
        ActivityLog.findAll({
          where: { adminId: adminId },
          order: [["createdAt", "DESC"]],
          limit: 10,
          attributes: [
            "id",
            "action",
            "targetType",
            "targetId",
            "details",
            "createdAt",
          ],
        }).catch((err) => {
          console.error("❌ Error fetching activity logs:", err);
          return [];
        }),
        // Get detailed manager data
        Manager.findAll({
          where: { adminId: adminId },
          attributes: [
            "id",
            "name",
            "email",
            "status",
            "lockedAt",
            "lockedByAdminId",
            "createdAt",
          ],
          order: [["createdAt", "DESC"]],
          limit: 5,
        }).catch((err) => {
          console.error("❌ Error fetching managers:", err);
          return [];
        }),
        // Get detailed organization data (exclude split organizations)
        // Note: Organization model maps to venues table (no temperature column)
        // Temperature is stored in organizations table (Venue model)
        // For dashboard, we don't need temperature here - it's fetched via organizationService
        Organization.findAll({
          where: {
            adminId: adminId,
            status: { [Op.ne]: "split" }, // Exclude split organizations - show only active ones
          },
          attributes: ["id", "name", "status", "createdAt"],
          order: [["createdAt", "DESC"]],
          limit: 5,
        }).catch((err) => {
          console.error("❌ Error fetching organizations:", err);
          return [];
        }),
        // Get detailed AC data
        AC.findAll({
          include: [
            {
              model: Organization,
              as: "organization",
              where: { adminId: adminId },
              attributes: ["id", "name"],
            },
          ],
          attributes: [
            "id",
            "name",
            "brand",
            "model",
            "serialNumber",
            "key",
            "temperature",
            "isOn",
            "createdAt",
          ],
          order: [["createdAt", "DESC"]],
          limit: 10,
        }).catch((err) => {
          console.error("❌ Error fetching ACs:", err);
          return [];
        }),
        // Get system status
        AdminController.getSystemStatusData(adminId).catch((err) => {
          console.error("❌ Error fetching system status:", err);
          return { isLocked: false, activeLocks: [] };
        }),
      ]);
      console.log("✅ Dashboard data loaded successfully:");
      console.log("- Managers:", managersCount);
      console.log("- Organizations:", organizationsCount);
      console.log("- ACs:", acsCount);
      console.log("- Recent logs:", recentLogs.length);
      console.log("- System locked:", systemStatus.isLocked);
      res.json({
        success: true,
        data: {
          admin: {
            id: req.admin.id,
            name: req.admin.name,
            email: req.admin.email,
            role: req.admin.role,
          },
          stats: {
            managers: managersCount,
            organizations: organizationsCount,
            venues: venuesCount,
            acs: acsCount,
            lockedManagers: managers.filter((m) => m.status === "locked")
              .length,
            suspendedOrganizations: organizations.filter(
              (o) => o.status === "suspended"
            ).length,
            lockedACs: 0, // AC model doesn't have currentState field
            activeACs: acs.filter((ac) => ac.isOn === true).length,
          },
          recentData: {
            managers: managers,
            organizations: organizations,
            acs: acs,
          },
          recentLogs: recentLogs,
          systemStatus: systemStatus,
        },
      });
    } catch (error) {
      console.error("Get dashboard data error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching dashboard data",
        error: error.message,
      });
    }
  }
  // Helper method to get system status data
  static async getSystemStatusData(adminId) {
    try {
      const SystemState = require("../../../models/SystemState/systemState");
      // SystemState entityType enum doesn't include "system", so we check all entity types
      const activeLocks = await SystemState.findAll({
        where: {
          adminId: adminId,
          isActive: true,
        },
        order: [["lockedAt", "DESC"]],
      });
      return {
        isLocked: activeLocks.length > 0,
        activeLocks: activeLocks.map((lock) => ({
          id: lock.id,
          lockType: lock.lockType,
          lockLevel: lock.lockLevel,
          reason: lock.reason,
          lockedAt: lock.lockedAt,
          lockedBy: lock.lockedBy,
        })),
      };
    } catch (error) {
      console.error("Error getting system status data:", error);
      return {
        isLocked: false,
        activeLocks: [],
      };
    }
  }
  // 27. LOCK SYSTEM FROM MANAGER
  async lockSystemFromManager(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const adminId = req.admin.id;
      const { managerId, reason } = req.body;
      // Log activity (use "manager" as targetType since system enum doesn't exist)
      await ActivityLog.create({
        adminId: adminId,
        action: "LOCK_SYSTEM_FROM_MANAGER",
        targetType: "manager", // ActivityLog enum doesn't include "system"
        targetId: 0, // Use 0 for system-wide operations
        details: `System locked from manager ${managerId}. Reason: ${reason}`,
      });
      res.json({
        success: true,
        message: "System locked from manager",
        lockedBy: "admin",
        adminId: adminId,
        // createdAt is handled automatically by Sequelize timestamps
      });
    } catch (error) {
      console.error("Lock system from manager error:", error);
      res.status(500).json({
        success: false,
        message: "Error locking system from manager",
        error: error.message,
      });
    }
  }
  // 28. LOCK SYSTEM FROM REMOTE ACCESS (Admin-controlled)
  // IMPORTANT: This is SEPARATE from manager account status (locked/unlocked/restricted)
  // - This locks REMOTE ACCESS to the system (blocks remote users)
  // - This does NOT lock manager accounts (managers remain unlocked)
  // - This is different from locking a manager's account
  // - Managers with "unlocked" account status can also lock remote access
  async lockSystemFromRemote(req, res) {
    // Preserve session data before operation (outside try block for error handling)
    const sessionPreserved = {
      sessionId: req.session?.sessionId,
      userId: req.session?.user?.id,
      userRole: req.session?.user?.role,
    };

    try {
      // Session is already validated by authenticateAdmin middleware
      // No need to call ensureSession again as it may cause logout on failure
      const adminId = req.admin.id;
      const { reason } = req.body || {}; // Reason is optional

      console.log(
        "🔒 Admin locking REMOTE ACCESS (not locking manager accounts):"
      );
      console.log("- Admin ID:", adminId);
      console.log("- Reason:", reason);

      // Refresh session to prevent expiration (without validation)
      if (req.session && req.session.touch) {
        req.session.touch();
      }

      // Ensure session data is preserved
      if (req.session && !req.session.sessionId && sessionPreserved.sessionId) {
        req.session.sessionId = sessionPreserved.sessionId;
        if (!req.session.user && sessionPreserved.userId) {
          req.session.user = {
            id: sessionPreserved.userId,
            role: sessionPreserved.userRole,
          };
        }
      }

      // Ensure token is valid before proceeding (regenerate if expired)
      if (req.session && req.session.sessionId) {
        try {
          const AdminAuth = require("../authentication/adminAuth");
          const token = await AdminAuth.getTokenFromSession(
            req.session.sessionId,
            req
          );
          if (!token) {
            console.warn(
              "⚠️ Token not found or expired, but Express session is valid - continuing"
            );
          }
        } catch (tokenError) {
          console.warn("⚠️ Token check error (non-fatal):", tokenError.message);
        }
      }

      // Explicitly save session to ensure it persists
      if (req.session && req.session.save) {
        await new Promise((resolve) => {
          req.session.save((err) => {
            if (err) {
              console.error(
                "⚠️ Session save warning (non-fatal):",
                err.message
              );
            } else {
              console.log(
                "✅ Session saved successfully before lock operation"
              );
            }
            resolve();
          });
        });
      }

      // Use LockService for remote-only lock (does NOT lock managers or ACs)
      let lockResult;
      try {
        const LockService = require("../services/lockService");
        lockResult = await LockService.adminLockSystem(
          adminId,
          "lock_from_remote",
          reason || "", // Reason is optional - use empty string if not provided
          `Admin: ${req.admin.name || adminId}`
        );
        console.log(
          "✅ Remote lock successful (managers remain unlocked):",
          lockResult
        );
      } catch (lockError) {
        console.error("❌ Remote lock failed:", lockError);
        console.error("❌ Remote lock error message:", lockError.message);
        console.error("❌ Remote lock error stack:", lockError.stack);
        throw lockError;
      }

      // SystemState record is already created by LockService.adminLockSystem
      // No need to create another one here

      // Log activity (non-blocking - don't fail if logging fails)
      try {
        await ActivityLog.create({
          adminId: adminId,
          action: "LOCK_SYSTEM_FROM_REMOTE",
          targetType: "manager", // ActivityLog enum doesn't include "system"
          targetId: 0, // Use 0 for system-wide operations
          details: reason
            ? `System locked from remote access. Reason: ${reason}`
            : "System locked from remote access",
        });
      } catch (logError) {
        console.error("⚠️ Error logging activity (non-critical):", logError);
        // Don't fail the operation if logging fails
      }

      // Notify all ESP32 devices about lock state change
      try {
        const Services = require("../../../services");
        const ESPService = Services.getESPService();
        await ESPService.notifyAllESP32DevicesLockState(adminId, true);
      } catch (notifyError) {
        console.error(
          "⚠️ Error notifying ESP32 devices about lock state:",
          notifyError
        );
        // Don't fail the operation if notification fails
      }

      // Regenerate/extend token if needed (prevent expiration)
      if (req.session && req.session.sessionId) {
        try {
          const AdminAuth = require("../authentication/adminAuth");
          const token = await AdminAuth.getTokenFromSession(
            req.session.sessionId,
            req
          );
          if (token) {
            console.log("✅ Token verified/extended after lock operation");
          } else {
            console.warn(
              "⚠️ Token not found, but Express session is valid - continuing"
            );
          }
        } catch (tokenError) {
          console.warn(
            "⚠️ Token refresh error (non-fatal):",
            tokenError.message
          );
        }
      }

      // Ensure session is saved one more time before sending response
      if (req.session && req.session.save) {
        await new Promise((resolve) => {
          req.session.save((err) => {
            if (err) {
              console.error(
                "⚠️ Final session save warning (non-fatal):",
                err.message
              );
            } else {
              console.log(
                "✅ Session saved successfully before sending response"
              );
            }
            resolve();
          });
        });
      }

      // Double-check session is still valid before sending response
      if (!req.session || !req.session.sessionId || !req.session.user) {
        console.error("❌ CRITICAL: Session lost during lock operation!");
        // Restore from preserved session data
        if (sessionPreserved.sessionId) {
          req.session.sessionId = sessionPreserved.sessionId;
          req.session.user = {
            id: sessionPreserved.userId,
            role: sessionPreserved.userRole,
          };
          await new Promise((resolve) => {
            req.session.save((saveErr) => {
              if (saveErr) {
                console.error("❌ Failed to restore session:", saveErr);
              } else {
                console.log("✅ Session restored from preserved data");
              }
              resolve();
            });
          });
        }
      }

      res.json({
        success: true,
        message: "System locked from remote access",
        lockedBy: "admin",
        adminId: adminId,
        lockResult: lockResult,
      });
    } catch (error) {
      console.error("Lock system from remote error:", error);

      // Ensure session is preserved even on error - do NOT destroy session
      if (req.session && !req.session.sessionId && sessionPreserved.sessionId) {
        req.session.sessionId = sessionPreserved.sessionId;
        if (!req.session.user && sessionPreserved.userId) {
          req.session.user = {
            id: sessionPreserved.userId,
            role: sessionPreserved.userRole,
          };
        }

        // Try to save session even on error
        if (req.session.save) {
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error(
                "⚠️ Session save error (non-fatal):",
                saveErr.message
              );
            }
          });
        }
      }

      res.status(500).json({
        success: false,
        message: "Error locking system from remote",
        error: error.message,
      });
    }
  }
  // 29A. GET ACTIVE ALERTS
  async getActiveAlerts(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const adminId = req.admin.id;

      const alerts = await AlertService.getActiveAlerts(adminId);

      res.json({
        success: true,
        data: alerts,
        count: alerts.length,
      });
    } catch (error) {
      console.error("Get active alerts error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching active alerts",
        error: error.message,
      });
    }
  }

  // 29B. CHECK ALERTS (trigger manual check)
  async checkAlerts(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const adminId = req.admin.id;

      const alerts = await AlertService.checkAndCreateAlerts(adminId);

      res.json({
        success: true,
        message: `Alert check completed. Found ${alerts.length} alerts.`,
        data: alerts,
        count: alerts.length,
      });
    } catch (error) {
      console.error("Check alerts error:", error);
      res.status(500).json({
        success: false,
        message: "Error checking alerts",
        error: error.message,
      });
    }
  }

  // 29E. REQUEST ROOM TEMPERATURE FOR SPECIFIC AC - UNUSED (Route commented out, not used in frontend)
  /*
  async requestRoomTemperature(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const adminId = req.admin.id;
      const { acId } = req.params;

      // Verify AC belongs to admin's organization
      const ac = await AC.findOne({
        where: { id: acId },
        include: [
          {
            model: Organization,
            as: "organization",
            where: { adminId: adminId },
          },
        ],
      });

      if (!ac) {
        return res.status(404).json({
          success: false,
          message: "AC not found or access denied",
        });
      }

      if (!ac.key) {
        return res.status(400).json({
          success: false,
          message: "AC device has no key",
        });
      }

      const result = await ESPService.requestRoomTemperature(ac.key);

      if (result.success) {
        res.json({
          success: true,
          message: "Room temperature request sent to ESP device",
          data: result,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          data: result,
        });
      }
    } catch (error) {
      console.error("Request room temperature error:", error);
      res.status(500).json({
        success: false,
        message: "Error requesting room temperature",
        error: error.message,
      });
    }
  }
  */

  // 29. CHECK TEMPERATURE PERMISSION - UNUSED (Route commented out, not used in frontend)
  /*
  async checkTemperaturePermission(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const { acId } = req.params;
      const adminId = req.admin.id;
      const ac = await AC.findOne({
        where: { id: acId },
        include: [
          {
            model: Organization,
            as: "organization",
            where: { adminId: adminId },
          },
        ],
      });
      if (!ac) {
        return res.status(404).json({
          success: false,
          message: "AC device not found",
        });
      }
      res.json({
        success: true,
        permission: {
          canChangeTemperature: ac.isOn !== false, // AC model doesn't have status or currentState
          reason: ac.isOn === false ? "AC is off" : "Permission granted",
        },
        ac: {
          id: ac.id,
          name: ac.name,
          isOn: ac.isOn,
          temperature: ac.temperature,
        },
      });
    } catch (error) {
      console.error("Check temperature permission error:", error);
      res.status(500).json({
        success: false,
        message: "Error checking temperature permission",
        error: error.message,
      });
    }
  }
  */

  // ==================== ADMIN OVERRIDE METHODS - SUPERIORITY OVER MANAGER ACTIONS ====================

  // 30. UNDO MANAGER'S ORGANIZATION SPLIT (Admin Override)
  async undoManagerOrganizationSplit(req, res) {
    try {
      // Session validated by authenticateAdmin middleware

      const { organizationId } = req.params;
      const adminId = req.admin.id;

      const result = await OrganizationService.undoOrganizationSplitByAdmin(
        adminId,
        organizationId
      );

      res.json({
        success: true,
        ...result,
        message: `Admin override: ${result.message}`,
      });
    } catch (error) {
      console.error("Undo manager organization split error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error undoing organization split",
        error: error.message,
      });
    }
  }

  // 31. UNLOCK MANAGER-LOCKED AC (Admin Override) - UNUSED (Route commented out, not used in frontend)
  /*
  async unlockManagerLockedAC(req, res) {
    try {
      // Session validated by authenticateAdmin middleware

      const { acId } = req.params;
      const { reason } = req.body || {};
      const adminId = req.admin.id;

      const result = await ACService.unlockManagerLockedAC(
        adminId,
        acId,
        reason
      );

      res.json({
        success: true,
        ...result,
        message: `Admin override: ${result.message}`,
      });
    } catch (error) {
      console.error("Unlock manager-locked AC error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error unlocking AC",
        error: error.message,
      });
    }
  }
  */

  // ==================== ENERGY CONSUMPTION ROUTES ====================

  // Get AC energy consumption
  async getACEnergy(req, res) {
    try {
      // Session validated by authenticateAdmin middleware

      const { acId } = req.params;
      const adminId = req.admin.id;

      // Verify AC belongs to this admin
      // ACs belong to Venues, and Venues belong to Admin
      const Venue = require("../../../models/Venue/venue");
      const ac = await AC.findOne({
        where: { id: acId },
        include: [
          {
            model: Venue,
            as: "venue",
            where: { adminId: adminId },
            required: true,
            attributes: ["id", "name"],
          },
        ],
      });

      if (!ac) {
        return res.status(404).json({
          success: false,
          message: "AC not found or unauthorized",
        });
      }

      const energyData = await EnergyConsumptionService.getACEnergy(acId);

      res.status(200).json({
        success: true,
        data: energyData,
      });
    } catch (error) {
      console.error("Get AC energy error:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving AC energy consumption",
        error: error.message,
      });
    }
  }

  // Get organization energy consumption
  async getOrganizationEnergy(req, res) {
    try {
      // Session validated by authenticateAdmin middleware

      const { organizationId } = req.params;
      const adminId = req.admin.id;

      // Verify organization belongs to this admin
      const organization = await Organization.findOne({
        where: {
          id: organizationId,
          adminId: adminId,
        },
      });

      if (!organization) {
        return res.status(404).json({
          success: false,
          message: "Organization not found or unauthorized",
        });
      }

      const energyData = await EnergyConsumptionService.getOrganizationEnergy(
        organizationId
      );

      res.status(200).json({
        success: true,
        data: energyData,
      });
    } catch (error) {
      console.error("Get organization energy error:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving organization energy consumption",
        error: error.message,
      });
    }
  }

  // Set AC mode (eco/normal/high)
  async setACMode(req, res) {
    try {
      // Session validated by authenticateAdmin middleware

      const { acId } = req.params;
      const { mode } = req.body;
      const adminId = req.admin.id;

      if (!mode || !["eco", "normal", "high"].includes(mode)) {
        return res.status(400).json({
          success: false,
          message: "Invalid mode. Must be one of: eco, normal, high",
        });
      }

      // Verify AC belongs to this admin
      const ac = await AC.findByPk(acId, {
        include: [
          {
            model: Organization,
            as: "organization",
            where: { adminId: adminId },
            attributes: ["id", "name"],
          },
        ],
      });

      if (!ac) {
        return res.status(404).json({
          success: false,
          message: "AC not found or unauthorized",
        });
      }

      await EnergyConsumptionService.handleACModeChange(acId, mode);

      // Log activity
      await ActivityLog.create({
        adminId: adminId,
        action: "CHANGE_AC_MODE",
        targetType: "ac",
        targetId: acId,
        details: `Changed AC ${ac.name} mode to ${mode}`,
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        message: `AC mode changed to ${mode} successfully`,
        data: {
          acId: ac.id,
          name: ac.name,
          mode: mode,
        },
      });
    } catch (error) {
      console.error("Set AC mode error:", error);
      res.status(500).json({
        success: false,
        message: "Error changing AC mode",
        error: error.message,
      });
    }
  }

  // Manually trigger energy calculation for an AC
  async calculateACEnergy(req, res) {
    try {
      // Session validated by authenticateAdmin middleware

      const { acId } = req.params;
      const adminId = req.admin.id;

      // Verify AC belongs to this admin
      const ac = await AC.findByPk(acId, {
        include: [
          {
            model: Organization,
            as: "organization",
            where: { adminId: adminId },
            attributes: ["id", "name"],
          },
        ],
      });

      if (!ac) {
        return res.status(404).json({
          success: false,
          message: "AC not found or unauthorized",
        });
      }

      const result = await EnergyConsumptionService.updateACEnergy(acId);

      res.status(200).json({
        success: true,
        message: "Energy calculation completed",
        data: result,
      });
    } catch (error) {
      console.error("Calculate AC energy error:", error);
      res.status(500).json({
        success: false,
        message: "Error calculating AC energy",
        error: error.message,
      });
    }
  }

  // ==================== EVENT MANAGEMENT ====================
  // Create event
  async createEvent(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const adminId = req.admin.id;
      const result = await EventService.createEvent(adminId, req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error("Create event error:", error);
      console.error("Error stack:", error.stack);

      // Determine appropriate status code based on error message
      let statusCode = 500;
      if (
        error.message.includes("not found") ||
        error.message.includes("does not belong")
      ) {
        statusCode = 404;
      } else if (
        error.message.includes("required") ||
        error.message.includes("Invalid") ||
        error.message.includes("must be")
      ) {
        statusCode = 400;
      } else if (
        error.message.includes("already exists") ||
        error.message.includes("duplicate") ||
        error.message.includes("conflict")
      ) {
        statusCode = 409; // Conflict - duplicate event
      }

      res.status(statusCode).json({
        success: false,
        message: error.message || "Error creating event",
        error: error.message,
      });
    }
  }

  // Get all events
  async getEvents(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const adminId = req.admin.id;
      console.log("📅 AdminController.getEvents - Request received");
      console.log("- adminId:", adminId);
      console.log("- query params:", req.query);

      const filters = {
        status: req.query.status,
        eventType: req.query.eventType,
      };
      const result = await EventService.getAdminEvents(adminId, filters);
      console.log(
        "✅ AdminController.getEvents - Success, returning",
        result.data?.events?.length || 0,
        "events"
      );
      res.json(result);
    } catch (error) {
      console.error("❌ AdminController.getEvents - Error:", error);
      console.error("- Error message:", error.message);
      console.error("- Error stack:", error.stack);
      res.status(500).json({
        success: false,
        message: "Error fetching events",
        error: error.message,
      });
    }
  }

  // Get single event
  async getEvent(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const adminId = req.admin.id;
      const { eventId } = req.params;
      const result = await EventService.getEventById(adminId, eventId);
      res.json(result);
    } catch (error) {
      console.error("Get event error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching event",
        error: error.message,
      });
    }
  }

  // Start event manually
  async startEvent(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const adminId = req.admin.id;
      const { eventId } = req.params;
      const result = await EventService.startEvent(adminId, eventId);
      res.json(result);
    } catch (error) {
      console.error("Start event error:", error);
      res.status(500).json({
        success: false,
        message: "Error starting event",
        error: error.message,
      });
    }
  }

  // Stop event manually
  async stopEvent(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const adminId = req.admin.id;
      const { eventId } = req.params;
      const result = await EventService.stopEvent(adminId, eventId);
      res.json(result);
    } catch (error) {
      console.error("Stop event error:", error);
      res.status(500).json({
        success: false,
        message: "Error stopping event",
        error: error.message,
      });
    }
  }

  // Disable event
  async disableEvent(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const adminId = req.admin.id;
      const { eventId } = req.params;
      const result = await EventService.disableEvent(adminId, eventId);
      res.json(result);
    } catch (error) {
      console.error("Disable event error:", error);
      res.status(500).json({
        success: false,
        message: "Error disabling event",
        error: error.message,
      });
    }
  }

  // Enable event
  async enableEvent(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const adminId = req.admin.id;
      const { eventId } = req.params;
      const result = await EventService.enableEvent(adminId, eventId);
      res.json(result);
    } catch (error) {
      console.error("Enable event error:", error);
      res.status(500).json({
        success: false,
        message: "Error enabling event",
        error: error.message,
      });
    }
  }

  // Update event
  async updateEvent(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const adminId = req.admin.id;
      const { eventId } = req.params;
      const result = await EventService.updateEvent(adminId, eventId, req.body);
      res.json(result);
    } catch (error) {
      console.error("Update event error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating event",
        error: error.message,
      });
    }
  }

  // Delete event
  async deleteEvent(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const adminId = req.admin.id;
      const { eventId } = req.params;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: "Event ID is required",
        });
      }

      const result = await EventService.deleteEvent(adminId, eventId);
      res.json(result);
    } catch (error) {
      console.error("Delete event error:", error);
      console.error("Error stack:", error.stack);

      // Determine appropriate status code based on error message
      let statusCode = 500;
      if (
        error.message.includes("not found") ||
        error.message.includes("does not belong")
      ) {
        statusCode = 404;
      } else if (
        error.message.includes("active event") ||
        error.message.includes("Cannot delete")
      ) {
        statusCode = 400; // Bad request - event is active
      } else if (
        error.message.includes("required") ||
        error.message.includes("Invalid")
      ) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message || "Error deleting event",
        error: error.message,
      });
    }
  }

  // Delete organization with cascade deletion
  async deleteOrganization(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const adminId = req.admin.id;
      const { organizationId } = req.params;

      const result = await OrganizationService.deleteOrganizationCascade(
        adminId,
        organizationId
      );

      res.json(result);
    } catch (error) {
      console.error("Delete organization error:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting organization",
        error: error.message,
      });
    }
  }

  // Delete venue with cascade deletion
  async deleteVenue(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const adminId = req.admin.id;
      const { venueId } = req.params;

      const result = await VenueService.deleteVenueCascade(adminId, venueId);

      res.json(result);
    } catch (error) {
      console.error("Delete venue error:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting venue",
        error: error.message,
      });
    }
  }

  // Delete AC device with cascade deletion
  async deleteACDevice(req, res) {
    try {
      // Session validated by authenticateAdmin middleware
      const adminId = req.admin.id;
      const { acId } = req.params;

      const ACService = require("../services/acService");
      const result = await ACService.deleteACCascade(adminId, acId);

      res.json(result);
    } catch (error) {
      console.error("Delete AC device error:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting AC device",
        error: error.message,
      });
    }
  }
}
module.exports = new AdminController();
