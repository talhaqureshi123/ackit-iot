const ManagerOrganizationService = require("../services/managerOrganizationService");
const ManagerACService = require("../services/managerACService");
const ManagerEventService = require("../services/managerEventService");
const Services = require("../../../services");
const ESPService = Services.getESPService();
const AC = require("../../../models/AC/ac");
const Organization = require("../../../models/Organization/organization");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Manager = require("../../../models/Roleaccess/manager");
const SessionHelper = require("../../../middleware/sessionHelper");

class ManagerController {
  // ==================== UTILITY FUNCTIONS ====================
  static validateTemperature(temperature) {
    if (!temperature || temperature < 16 || temperature > 30) {
      return {
        isValid: false,
        message: "Temperature must be between 16°C and 30°C",
      };
    }
    return { isValid: true };
  }

  // Session helper method
  static ensureSession(req, res) {
    return SessionHelper.ensureSession(req, res, "manager");
  }

  // ==================== LOGIN MOVED TO ManagerAuth ====================
  // Login functionality has been moved to ManagerAuth.login for security
  // This ensures tokens are stored only on backend and never exposed to frontend

  // ==================== 2. ORGANIZATION MANAGEMENT ====================
  async getAssignedOrganizations(req, res) {
    try {
      // Session validated by authenticateManager middleware

      const managerId = req.manager.id;
      console.log(
        `📋 Getting assigned organizations for manager ID: ${managerId}`
      );

      const result = await ManagerOrganizationService.getAssignedOrganizations(
        managerId
      );

      console.log(
        `✅ Found ${
          result.organizations?.length || 0
        } organizations for manager ${managerId}`
      );
      if (result.organizations && result.organizations.length > 0) {
        console.log(
          `   Organization IDs: ${result.organizations
            .map((o) => o.id)
            .join(", ")}`
        );
      }

      res.json(result);
    } catch (error) {
      console.error("Get assigned organizations error:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  async getOrganizationDetails(req, res) {
    try {
      // Session validated by authenticateManager middleware

      const { organizationId } = req.params;
      const managerId = req.manager.id;

      const result = await ManagerOrganizationService.getOrganizationDetails(
        managerId,
        organizationId
      );

      res.json(result);
    } catch (error) {
      console.error("Get organization details error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error fetching organization details",
      });
    }
  }

  async splitOrganization(req, res) {
    try {
      const { organizationId } = req.params;
      const body = req.body || {};
      const managerId = req.manager.id;

      // Handle different request formats
      let splits = body.splits;

      // If frontend sends { parts: 2 }, convert it to splits format
      if (body.parts && typeof body.parts === "number" && !splits) {
        // Auto-generate splits based on number of parts
        // Get ACs from organization first to split them evenly
        const ManagerOrganizationService = require("../services/managerOrganizationService");
        const result =
          await ManagerOrganizationService.getAssignedOrganizations(managerId);
        const org = result.organizations?.find((o) => o.id == organizationId);

        if (!org) {
          return res.status(404).json({
            success: false,
            message: "Organization not found.",
          });
        }

        // Validate organization size before splitting
        const orgSize = org.organizationSize;
        if (!orgSize) {
          return res.status(400).json({
            success: false,
            message: "Organization size is not set. Cannot split organization.",
          });
        }

        if (orgSize === "Small") {
          return res.status(400).json({
            success: false,
            message: "Small organizations cannot be split.",
          });
        }

        // Validate that exactly 2 parts are requested
        if (body.parts !== 2) {
          const splitSize = orgSize === "Medium" ? "Small" : "Medium";
          return res.status(400).json({
            success: false,
            message: `A ${orgSize} organization must be split into exactly 2 ${splitSize} organizations.`,
          });
        }

        if (!org.acs || org.acs.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Cannot split organization with no ac devices.",
          });
        }

        const acsPerSplit = Math.ceil(org.acs.length / body.parts);
        splits = [];

        for (let i = 0; i < body.parts; i++) {
          const startIdx = i * acsPerSplit;
          const endIdx = Math.min(startIdx + acsPerSplit, org.acs.length);
          const acIds = org.acs.slice(startIdx, endIdx).map((ac) => ac.id);

          splits.push({
            name: `${org.name} - Part ${i + 1}`,
            acIds: acIds,
          });
        }
      }

      if (!splits || !Array.isArray(splits)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid splits data. 'splits' must be an array with at least 2 split configurations.",
          received: body,
          example: {
            splits: [
              { name: "Split Organization 1", acIds: [1, 2] },
              { name: "Split Organization 2", acIds: [3, 4] },
            ],
          },
        });
      }

      // Validate that exactly 2 splits are provided (for size-based splitting rules)
      if (splits.length !== 2) {
        return res.status(400).json({
          success: false,
          message:
            "Exactly 2 split configurations are required. Medium organizations split into 2 Small, and Large organizations split into 2 Medium.",
          received: splits.length,
          required: 2,
        });
      }

      const result = await ManagerOrganizationService.splitOrganization(
        managerId,
        organizationId,
        { splits }
      );

      res.json(result);
    } catch (error) {
      console.error("Split organization error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  async undoOrganizationSplit(req, res) {
    try {
      // Session validated by authenticateManager middleware

      const { organizationId } = req.params;
      const managerId = req.manager.id;

      console.log(
        `🔄 Manager ${managerId} attempting to undo split for organization ${organizationId}`
      );

      const result = await ManagerOrganizationService.undoOrganizationSplit(
        managerId,
        organizationId
      );

      console.log(
        `✅ Successfully undone split for organization ${organizationId}`
      );

      res.json(result);
    } catch (error) {
      console.error("❌ Undo organization split error:", error);
      console.error("❌ Error stack:", error.stack);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
        error: error.message,
      });
    }
  }

  // Set organization temperature with session auth (bypass JWT)
  async setOrganizationTemperatureWithSession(req, res) {
    try {
      // Session validated by authenticateManager middleware

      const { organizationId } = req.params;
      const { temperature } = req.body || {};

      // Check if admin or manager is making the request
      let userId, userRole, userName;
      if (req.session?.user?.role === "admin") {
        userId = req.session.user.id;
        userRole = "admin";
        userName = req.session.user.name;
        console.log(
          "🌡️ Admin setting organization temperature with session:",
          userId,
          userName
        );
      } else if (req.session?.user?.role === "manager") {
        userId = req.session.user.id;
        userRole = "manager";
        userName = req.session.user.name;
        console.log(
          "🌡️ Manager setting organization temperature with session:",
          userId,
          userName
        );
      } else {
        return res.status(401).json({
          success: false,
          message: "Authentication required. Please login as admin or manager.",
        });
      }

      const tempValidation = ManagerController.validateTemperature(temperature);
      if (!tempValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: tempValidation.message,
        });
      }

      // Use appropriate service based on user role
      let result;
      if (userRole === "admin") {
        // Admin can control any organization under their adminId (with override capability)
        console.log(
          "🔓 Admin using override capability for organization temperature"
        );
        result =
          await ManagerOrganizationService.setOrganizationTemperatureByAdmin(
            userId,
            organizationId,
            temperature
          );
        // Add admin override flag to result
        result.adminOverride = true;
        result.message = `${result.message} (Admin Override - bypasses manager locks)`;
      } else {
        // Manager can only control their assigned organizations (respects locks)
        result = await ManagerOrganizationService.setOrganizationTemperature(
          userId,
          organizationId,
          temperature
        );
      }

      // Session refreshed by ensureSession helper

      res.json({
        ...result,
        method: "session_auth",
      });
    } catch (error) {
      console.error(
        "❌ Set organization temperature with session error:",
        error
      );
      console.error("❌ Error stack:", error.stack);

      // Session error handling managed by SessionHelper

      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
        details: "Temperature change failed. Your session is still active.",
      });
    }
  }

  // Set AC temperature with session auth (bypass JWT)
  async setACTemperatureWithSession(req, res) {
    try {
      // Session validated by authenticateManager middleware

      const { acId } = req.params;
      const { temperature } = req.body || {};

      // Check if admin or manager is making the request
      let userId, userRole, userName;
      if (req.session?.user?.role === "admin") {
        userId = req.session.user.id;
        userRole = "admin";
        userName = req.session.user.name;
        console.log(
          "🌡️ Admin setting AC temperature with session:",
          userId,
          userName
        );
      } else if (req.session?.user?.role === "manager") {
        userId = req.session.user.id;
        userRole = "manager";
        userName = req.session.user.name;
        console.log(
          "🌡️ Manager setting AC temperature with session:",
          userId,
          userName
        );
      } else {
        return res.status(401).json({
          success: false,
          message: "Authentication required. Please login as admin or manager.",
        });
      }

      const tempValidation = ManagerController.validateTemperature(temperature);
      if (!tempValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: tempValidation.message,
        });
      }

      // Use appropriate service based on user role
      let result;
      if (userRole === "admin") {
        // Admin can control any AC under their organizations (with override capability)
        console.log("🔓 Admin using override capability for AC temperature");
        result = await ManagerACService.setACTemperatureByAdmin(
          userId,
          acId,
          temperature
        );
        // Add admin override flag to result
        result.adminOverride = true;
        result.message = `${result.message} (Admin Override - bypasses manager locks)`;
      } else {
        // Manager can only control ACs in their assigned organizations (respects locks)
        result = await ManagerACService.setACTemperature(
          userId,
          acId,
          temperature
        );
      }

      // Session refreshed by ensureSession helper

      res.json({
        ...result,
        method: "session_auth",
      });
    } catch (error) {
      console.error("❌ Set AC temperature with session error:", error);
      console.error("❌ Error stack:", error.stack);

      // Session error handling managed by SessionHelper

      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
        details: "Temperature change failed. Your session is still active.",
      });
    }
  }

  async setOrganizationTemperature(req, res) {
    try {
      // Session validated by authenticateManager middleware

      const { organizationId } = req.params;
      const { temperature } = req.body || {};

      // Check if admin or manager is making the request
      let userId, userRole, userName;
      if (req.admin) {
        userId = req.admin.id;
        userRole = "admin";
        userName = req.admin.name;
        console.log(
          "🌡️ Admin setting organization temperature:",
          userId,
          userName
        );
      } else if (req.manager) {
        userId = req.manager.id;
        userRole = "manager";
        userName = req.manager.name;
        console.log(
          "🌡️ Manager setting organization temperature:",
          userId,
          userName
        );
      } else {
        return res.status(401).json({
          success: false,
          message: "Authentication required. Please login as admin or manager.",
        });
      }

      console.log("- Session ID:", req.session?.sessionId);
      console.log("- Organization ID:", organizationId);
      console.log("- Temperature:", temperature);

      const tempValidation = ManagerController.validateTemperature(temperature);
      if (!tempValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: tempValidation.message,
        });
      }

      // Use appropriate service based on user role
      let result;
      if (userRole === "admin") {
        // Admin can control any organization under their adminId (with override capability)
        console.log(
          "🔓 Admin using override capability for organization temperature"
        );
        result =
          await ManagerOrganizationService.setOrganizationTemperatureByAdmin(
            userId,
            organizationId,
            temperature
          );
        // Add admin override flag to result
        result.adminOverride = true;
        result.message = `${result.message} (Admin Override - bypasses manager locks)`;
      } else {
        // Manager can only control their assigned organizations (respects locks)
        result = await ManagerOrganizationService.setOrganizationTemperature(
          userId,
          organizationId,
          temperature
        );
      }

      // Session refreshed by ensureSession helper

      res.json(result);
    } catch (error) {
      console.error("❌ Set organization temperature error:", error);
      console.error("❌ Error stack:", error.stack);

      // Session error handling managed by SessionHelper

      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
        details: "Temperature change failed. Your session is still active.",
      });
    }
  }

  // Note: Organization suspension functionality has been removed
  // Organizations can only be active or split

  // Toggle organization power (ON/OFF)
  async toggleOrganizationPower(req, res) {
    try {
      // Session validated by authenticateManager middleware

      const { organizationId } = req.params;
      const { powerState } = req.body || {}; // true/false or "on"/"off"

      // Check if admin or manager is making the request
      let userId, userRole, userName;
      if (req.admin) {
        userId = req.admin.id;
        userRole = "admin";
        userName = req.admin.name;
        console.log("🔌 Admin toggling organization power:", userId, userName);
      } else if (req.manager) {
        userId = req.manager.id;
        userRole = "manager";
        userName = req.manager.name;
        console.log(
          "🔌 Manager toggling organization power:",
          userId,
          userName
        );
      } else {
        return res.status(401).json({
          success: false,
          message: "Authentication required. Please login as admin or manager.",
        });
      }

      console.log("- Session ID:", req.session?.sessionId);
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

      // Use appropriate service based on user role
      let result;
      if (userRole === "admin") {
        // Admin can control any organization under their adminId
        const OrganizationService = require("../../admin/services/organizationService");
        result = await OrganizationService.toggleOrganizationPower(
          parseInt(organizationId),
          powerState,
          "admin",
          userId
        );
        result.adminOverride = true;
        result.message = `${result.message} (Admin Override)`;
      } else {
        // Manager can only control their assigned organizations
        result = await ManagerOrganizationService.toggleOrganizationPower(
          userId,
          parseInt(organizationId),
          powerState
        );
      }

      res.json(result);
    } catch (error) {
      console.error("❌ Toggle organization power error:", error);
      console.error("Error stack:", error.stack);

      // Don't return 401/403 for business logic errors - these are not authentication issues
      const statusCode =
        error.message?.includes("not found") ||
        error.message?.includes("unauthorized")
          ? 404
          : error.message?.includes("locked") ||
            error.message?.includes("Cannot create")
          ? 400
          : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message || "Error toggling organization power",
        details:
          statusCode === 500
            ? "Organization power toggle failed. Your session is still active."
            : error.message,
      });
    }
  }

  // ==================== 3. AC MANAGEMENT ====================
  async setACTemperature(req, res) {
    try {
      // Session validated by authenticateManager middleware

      const { acId } = req.params;
      const { temperature } = req.body || {};

      // Check if admin or manager is making the request
      let userId, userRole, userName;
      if (req.admin) {
        userId = req.admin.id;
        userRole = "admin";
        userName = req.admin.name;
        console.log("🌡️ Admin setting AC temperature:", userId, userName);
      } else if (req.manager) {
        userId = req.manager.id;
        userRole = "manager";
        userName = req.manager.name;
        console.log("🌡️ Manager setting AC temperature:", userId, userName);
      } else {
        return res.status(401).json({
          success: false,
          message: "Authentication required. Please login as admin or manager.",
        });
      }

      console.log("- Session ID:", req.session?.sessionId);
      console.log("- AC ID:", acId);
      console.log("- Temperature:", temperature);

      const tempValidation = ManagerController.validateTemperature(temperature);
      if (!tempValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: tempValidation.message,
        });
      }

      // Use appropriate service based on user role
      let result;
      if (userRole === "admin") {
        // Admin can control any AC under their organizations (with override capability)
        console.log("🔓 Admin using override capability for AC temperature");
        result = await ManagerACService.setACTemperatureByAdmin(
          userId,
          acId,
          temperature
        );
        // Add admin override flag to result
        result.adminOverride = true;
        result.message = `${result.message} (Admin Override - bypasses manager locks)`;
      } else {
        // Manager can only control ACs in their assigned organizations (respects locks)
        result = await ManagerACService.setACTemperature(
          userId,
          acId,
          temperature
        );
      }

      // Session refreshed by ensureSession helper

      res.json(result);
    } catch (error) {
      console.error("❌ Set AC temperature error:", error);
      console.error("❌ Error stack:", error.stack);

      // Session error handling managed by SessionHelper

      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
        details: "Temperature change failed. Your session is still active.",
      });
    }
  }

  async toggleACPower(req, res) {
    try {
      // Session validated by authenticateManager middleware

      const { acId } = req.params;
      // Accept both isOn and powerState for compatibility
      const { isOn, powerState } = req.body || {};
      const managerId = req.manager.id;

      // Use isOn if provided, otherwise use powerState
      const power = isOn !== undefined ? isOn : powerState;

      if (typeof power !== "boolean") {
        return res.status(400).json({
          success: false,
          message:
            "Power state must be true or false (use 'isOn' or 'powerState' in request body)",
        });
      }

      console.log(
        `🔌 Manager ${managerId} toggling AC ${acId} power to: ${power}`
      );

      const result = await ManagerACService.toggleACPower(
        managerId,
        acId,
        power
      );

      res.json(result);
    } catch (error) {
      console.error("Toggle AC power error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  async getManagerACs(req, res) {
    try {
      // Session validated by authenticateManager middleware

      const managerId = req.manager.id;
      console.log(`📋 Getting ACs for manager ID: ${managerId}`);

      const result = await ManagerACService.getManagerACs(managerId);

      console.log(
        `✅ Found ${result.acs?.length || 0} ACs for manager ${managerId}`
      );
      if (result.acs && result.acs.length > 0) {
        console.log(`   AC IDs: ${result.acs.map((a) => a.id).join(", ")}`);
      }

      res.json(result);
    } catch (error) {
      console.error("Get manager ACs error:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // ==================== MANAGER REMOTE LOCK ORGANIZATION/VENUE ====================
  // Manager remote lock all devices in an assigned organization
  async remoteLockOrganization(req, res) {
    try {
      // Session validated by authenticateManager middleware
      const { organizationId } = req.params;
      const { reason } = req.body || {}; // Optional reason
      const managerId = req.manager.id;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      const LockService = require("../../admin/services/lockService");

      const result = await LockService.managerRemoteLockOrganization(
        managerId,
        parseInt(organizationId),
        reason || ""
      );

      res.json(result);
    } catch (error) {
      console.error("Manager remote lock organization error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error remote locking organization",
      });
    }
  }

  // Manager remote unlock all devices in an assigned organization
  async remoteUnlockOrganization(req, res) {
    try {
      // Session validated by authenticateManager middleware
      const { organizationId } = req.params;
      const managerId = req.manager.id;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      const LockService = require("../../admin/services/lockService");

      const result = await LockService.managerRemoteUnlockOrganization(
        managerId,
        parseInt(organizationId)
      );

      res.json(result);
    } catch (error) {
      console.error("Manager remote unlock organization error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error remote unlocking organization",
      });
    }
  }

  // Manager remote lock all devices in a venue (venue must be in manager's assigned organization)
  async remoteLockVenue(req, res) {
    try {
      // Session validated by authenticateManager middleware
      const { venueId } = req.params;
      const { reason } = req.body || {}; // Optional reason
      const managerId = req.manager.id;

      if (!venueId) {
        return res.status(400).json({
          success: false,
          message: "Venue ID is required",
        });
      }

      const LockService = require("../../admin/services/lockService");

      const result = await LockService.managerRemoteLockVenue(
        managerId,
        parseInt(venueId),
        reason || ""
      );

      res.json(result);
    } catch (error) {
      console.error("Manager remote lock venue error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error remote locking venue",
      });
    }
  }

  // Manager remote unlock all devices in a venue (venue must be in manager's assigned organization)
  async remoteUnlockVenue(req, res) {
    try {
      // Session validated by authenticateManager middleware
      const { venueId } = req.params;
      const managerId = req.manager.id;

      if (!venueId) {
        return res.status(400).json({
          success: false,
          message: "Venue ID is required",
        });
      }

      const LockService = require("../../admin/services/lockService");

      const result = await LockService.managerRemoteUnlockVenue(
        managerId,
        parseInt(venueId)
      );

      res.json(result);
    } catch (error) {
      console.error("Manager remote unlock venue error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error remote unlocking venue",
      });
    }
  }

  async setACTemperatureWithProtection(req, res) {
    try {
      const { acId } = req.params;
      const { temperature } = req.body || {};
      const managerId = req.manager.id;

      const tempValidation = ManagerController.validateTemperature(temperature);
      if (!tempValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: tempValidation.message,
        });
      }

      const LockService = require("../../admin/services/lockService");

      const permission = await LockService.canChangeTemperature(
        acId,
        "manager",
        managerId
      );

      if (!permission.allowed) {
        await LockService.restoreTemperature(acId);

        return res.status(403).json({
          success: false,
          message: permission.reason,
          action: "Temperature restored to locked state",
        });
      }

      const result = await ManagerACService.setACTemperature(
        managerId,
        acId,
        temperature
      );

      res.json(result);
    } catch (error) {
      console.error("Set AC temperature with protection error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // Lock/Unlock AC device
  async lockAC(req, res) {
    try {
      const { acId } = req.params;
      const managerId = req.manager.id;

      const result = await ManagerACService.lockAC(managerId, acId);

      // Broadcast lock status change via WebSocket for real-time sync
      try {
        const Services = require("../../../services");
        const ESPService = Services.getESPService();
        ESPService.broadcastToFrontend({
          type: "ac_lock_status_changed",
          acId: acId,
          currentState: result.ac.currentState,
          lockedBy: result.ac.lockedBy || `Manager-${managerId}`,
          lockedAt: new Date(),
        });
      } catch (wsError) {
        console.error("WebSocket broadcast error:", wsError);
        // Don't fail the operation if WebSocket fails
      }

      res.json(result);
    } catch (error) {
      console.error("Lock AC error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  async unlockAC(req, res) {
    try {
      const { acId } = req.params;
      const managerId = req.manager.id;

      const result = await ManagerACService.unlockAC(managerId, acId);

      // Broadcast lock status change via WebSocket for real-time sync
      try {
        const Services = require("../../../services");
        const ESPService = Services.getESPService();
        ESPService.broadcastToFrontend({
          type: "ac_lock_status_changed",
          acId: acId,
          currentState: "unlocked",
          lockedBy: null,
          lockedAt: null,
        });
      } catch (wsError) {
        console.error("WebSocket broadcast error:", wsError);
        // Don't fail the operation if WebSocket fails
      }

      res.json(result);
    } catch (error) {
      console.error("Unlock AC error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // Log manager action
  async logManagerAction(req, res) {
    try {
      const { action, details } = req.body;
      const managerId = req.manager.id;

      if (!action || !details) {
        return res.status(400).json({
          success: false,
          message: "Action and details are required",
        });
      }

      const ActivityLog = require("../../../models/Activity log/activityLog");

      // Get manager's admin ID for logging
      const Manager = require("../../../models/Roleaccess/manager");
      const manager = await Manager.findByPk(managerId);

      if (!manager) {
        return res.status(404).json({
          success: false,
          message: "Manager not found",
        });
      }

      await ActivityLog.create({
        adminId: manager.adminId,
        action: `MANAGER_${action.toUpperCase()}`,
        targetType: "manager",
        targetId: managerId,
        details: `Manager action: ${action}. Details: ${JSON.stringify(
          details
        )}`,
        timestamp: new Date(),
      });

      res.json({
        success: true,
        message: "Action logged successfully",
        action: action,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Log manager action error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // ==================== ALERT MANAGEMENT ====================
  async getActiveAlerts(req, res) {
    try {
      const managerId = req.manager.id;

      // Get manager's assigned organizations
      const Organization = require("../../../models/Organization/organization");
      const organizations = await Organization.findAll({
        where: { managerId: managerId },
        attributes: ["id", "adminId"],
      });

      if (organizations.length === 0) {
        return res.json({
          success: true,
          data: [],
          count: 0,
        });
      }

      // Get adminId from first organization (all should have same adminId)
      const adminId = organizations[0].adminId;
      const organizationIds = organizations.map((org) => org.id);

      // Use admin alert service with manager's organization filter
      const AlertService = require("../../admin/services/alertService");
      const alerts = await AlertService.getActiveAlerts(
        adminId,
        organizationIds
      );

      res.json({
        success: true,
        data: alerts,
        count: alerts.length,
      });
    } catch (error) {
      console.error("Get manager active alerts error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  async checkAlerts(req, res) {
    try {
      const managerId = req.manager.id;

      // Get manager's assigned organizations
      const Organization = require("../../../models/Organization/organization");
      const organizations = await Organization.findAll({
        where: { managerId: managerId },
        attributes: ["id", "adminId"],
      });

      if (organizations.length === 0) {
        return res.json({
          success: true,
          message: "No organizations assigned to manager",
          data: [],
          count: 0,
        });
      }

      // Get adminId from first organization (all should have same adminId)
      const adminId = organizations[0].adminId;
      const organizationIds = organizations.map((org) => org.id);

      // Use admin alert service with manager's organization filter
      const AlertService = require("../../admin/services/alertService");
      const alerts = await AlertService.checkAndCreateAlerts(
        adminId,
        organizationIds
      );

      res.json({
        success: true,
        message: `Alert check completed. Found ${alerts.length} alert(s).`,
        data: alerts,
        count: alerts.length,
      });
    } catch (error) {
      console.error("Check manager alerts error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // ==================== ROOM TEMPERATURE ALERT MANAGEMENT ====================
  async getActiveRoomTempAlerts(req, res) {
    try {
      const managerId = req.manager.id;

      // Get manager's assigned organizations
      const Organization = require("../../../models/Organization/organization");
      const organizations = await Organization.findAll({
        where: { managerId: managerId },
        attributes: ["id", "adminId"],
      });

      if (organizations.length === 0) {
        return res.json({
          success: true,
          data: [],
          count: 0,
        });
      }

      // Get adminId from first organization (all should have same adminId)
      const adminId = organizations[0].adminId;
      const organizationIds = organizations.map((org) => org.id);

      // Use admin alert service with manager's organization filter
      const AlertService = require("../../admin/services/alertService");
      const alerts = await AlertService.getActiveAlerts(
        adminId,
        organizationIds
      );

      res.json({
        success: true,
        data: alerts,
        count: alerts.length,
      });
    } catch (error) {
      console.error("Get manager active room temperature alerts error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  async checkRoomTemperature(req, res) {
    try {
      const managerId = req.manager.id;

      // Get manager's assigned organizations
      const Organization = require("../../../models/Organization/organization");
      const organizations = await Organization.findAll({
        where: { managerId: managerId },
        attributes: ["id", "adminId"],
      });

      if (organizations.length === 0) {
        return res.json({
          success: true,
          message: "No organizations assigned to manager",
          data: [],
          count: 0,
        });
      }

      // Get adminId from first organization (all should have same adminId)
      const adminId = organizations[0].adminId;
      const organizationIds = organizations.map((org) => org.id);

      // Use admin alert service with manager's organization filter
      const AlertService = require("../../admin/services/alertService");
      const alerts = await AlertService.checkAndCreateAlerts(
        adminId,
        organizationIds
      );

      res.json({
        success: true,
        message: `Room temperature check completed. Found ${alerts.length} alert(s).`,
        data: alerts,
        count: alerts.length,
      });
    } catch (error) {
      console.error("Check manager room temperature error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  async requestRoomTemperature(req, res) {
    try {
      const managerId = req.manager.id;
      const { acId } = req.params;

      // Verify AC belongs to manager's assigned organization
      const ac = await AC.findOne({
        where: { id: acId },
        include: [
          {
            model: Organization,
            as: "organization",
            where: { managerId: managerId },
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
      console.error("Request manager room temperature error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // ==================== ENERGY CONSUMPTION METHODS ====================
  async getACEnergy(req, res) {
    try {
      // Session validated by authenticateManager middleware

      const { acId } = req.params;
      const managerId = req.manager.id;

      // Get manager's organizations
      const managerOrgs = await Organization.findAll({
        where: { managerId: managerId },
        attributes: ["id", "name", "adminId"],
      });

      const orgIds = managerOrgs.map((org) => org.id);

      if (orgIds.length === 0) {
        return res.status(404).json({
          success: false,
          message: "AC not found or unauthorized",
        });
      }

      // Get venues under manager's organizations
      const Venue = require("../../../models/Venue/venue");
      const { Op } = require("sequelize");

      const adminId = managerOrgs[0]?.adminId;
      if (!adminId) {
        return res.status(404).json({
          success: false,
          message: "AC not found or unauthorized",
        });
      }

      const venues = await Venue.findAll({
        where: {
          adminId: adminId,
          organizationId: { [Op.in]: orgIds },
        },
        attributes: ["id"],
      });
      const venueIds = venues.map((v) => v.id);

      // Verify AC belongs to manager (through venues or organizations)
      const allPossibleIds = [...orgIds, ...venueIds];
      const ac = await AC.findOne({
        where: {
          id: acId,
          venueId: { [Op.in]: allPossibleIds },
        },
        include: [
          {
            model: Venue,
            as: "venue",
            required: false,
            attributes: ["id", "name", "organizationId"],
            include: [
              {
                model: Organization,
                as: "organization",
                required: false,
                attributes: ["id", "name"],
              },
            ],
          },
          {
            model: Organization,
            as: "organization",
            required: false,
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

      // Use shared energy consumption service
      const EnergyConsumptionService = require("../../admin/services/energyConsumptionService");

      const energyData = await EnergyConsumptionService.getACEnergy(acId);

      res.status(200).json({
        success: true,
        data: energyData,
      });
    } catch (error) {
      console.error("Get AC energy error:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        success: false,
        message: "Error retrieving AC energy consumption",
        error: error.message,
      });
    }
  }

  async getOrganizationEnergy(req, res) {
    try {
      // Session validated by authenticateManager middleware

      const { organizationId } = req.params;
      const managerId = req.manager.id;

      // Verify organization belongs to manager
      const organization = await Organization.findOne({
        where: {
          id: organizationId,
          managerId: managerId,
        },
      });

      if (!organization) {
        return res.status(404).json({
          success: false,
          message: "Organization not found or unauthorized",
        });
      }

      // Use shared energy consumption service
      const EnergyConsumptionService = require("../../admin/services/energyConsumptionService");

      const energyData = await EnergyConsumptionService.getOrganizationEnergy(
        organizationId
      );

      res.status(200).json({
        success: true,
        data: energyData,
      });
    } catch (error) {
      console.error("Get organization energy error:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        success: false,
        message: "Error retrieving organization energy consumption",
        error: error.message,
      });
    }
  }

  // ==================== EVENT MANAGEMENT ====================
  // Create event
  async createEvent(req, res) {
    try {
      // Session validated by authenticateManager middleware
      const managerId = req.manager.id;
      const result = await ManagerEventService.createEvent(managerId, req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error("Create event error:", error);
      console.error("Error stack:", error.stack);

      // Determine appropriate status code
      let statusCode = 500;
      if (
        error.message.includes("not found") ||
        error.message.includes("not assigned")
      ) {
        statusCode = 404;
      } else if (
        error.message.includes("required") ||
        error.message.includes("Invalid") ||
        error.message.includes("must be")
      ) {
        statusCode = 400;
      } else if (
        error.message.includes("admin event") ||
        error.message.includes("conflict")
      ) {
        statusCode = 409;
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
      // Session validated by authenticateManager middleware
      const managerId = req.manager.id;
      const filters = {
        status: req.query.status,
        eventType: req.query.eventType,
        includeDisabled: req.query.includeDisabled !== "false", // Include disabled by default
      };

      console.log(
        `📅 [MANAGER] Getting events for manager ${managerId} with filters:`,
        filters
      );

      const result = await ManagerEventService.getManagerEvents(
        managerId,
        filters
      );

      console.log(
        `✅ [MANAGER] Retrieved ${result.data?.events?.length || 0} events`
      );

      res.json(result);
    } catch (error) {
      console.error("Get events error:", error);
      console.error("Error stack:", error.stack);
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
      // Session validated by authenticateManager middleware
      const managerId = req.manager.id;
      const { eventId } = req.params;
      const result = await ManagerEventService.getEventById(managerId, eventId);
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
      // Session validated by authenticateManager middleware
      const managerId = req.manager.id;
      const { eventId } = req.params;
      const result = await ManagerEventService.startEvent(managerId, eventId);
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
      // Session validated by authenticateManager middleware
      const managerId = req.manager.id;
      const { eventId } = req.params;
      const result = await ManagerEventService.stopEvent(managerId, eventId);
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

  // Update event
  async updateEvent(req, res) {
    try {
      // Session validated by authenticateManager middleware
      const managerId = req.manager.id;
      const { eventId } = req.params;
      const result = await ManagerEventService.updateEvent(
        managerId,
        eventId,
        req.body
      );
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

  // Disable event
  async disableEvent(req, res) {
    try {
      // Session validated by authenticateManager middleware
      const managerId = req.manager.id;
      const { eventId } = req.params;
      const result = await ManagerEventService.disableEvent(managerId, eventId);
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
      // Session validated by authenticateManager middleware
      const managerId = req.manager.id;
      const { eventId } = req.params;
      const result = await ManagerEventService.enableEvent(managerId, eventId);
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

  // Delete event
  async deleteEvent(req, res) {
    try {
      // Session validated by authenticateManager middleware
      const managerId = req.manager.id;
      const { eventId } = req.params;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: "Event ID is required",
        });
      }

      const result = await ManagerEventService.deleteEvent(managerId, eventId);
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

  // ==================== VENUE MANAGEMENT ====================
  async getVenueDetails(req, res) {
    try {
      const managerId = req.manager.id;
      const { venueId } = req.params;

      // Verify venue belongs to manager's organization
      const managerOrgs = await Organization.findAll({
        where: { managerId: managerId },
        attributes: ["id", "adminId"],
      });

      if (managerOrgs.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Venue not found or unauthorized",
        });
      }

      const orgIds = managerOrgs.map((org) => org.id);
      const adminId = managerOrgs[0]?.adminId;

      if (!adminId) {
        return res.status(404).json({
          success: false,
          message: "Venue not found or unauthorized",
        });
      }

      const { Op } = require("sequelize");
      const Venue = require("../../../models/Venue/venue");

      // Find venue that belongs to manager's organization
      const venue = await Venue.findOne({
        where: {
          id: venueId,
          adminId: adminId,
          organizationId: { [Op.in]: orgIds },
        },
        attributes: [
          "id",
          "name",
          "organizationSize",
          "status",
          "managerId",
          "temperature",
          "isVenueOn",
          "venuePowerChangedAt",
          "venuePowerChangedBy",
          "isLocked",
          "lockedTemperature",
          "lockedAt",
          "lockedByAdminId",
          "createdAt",
          "updatedAt",
        ],
        include: [
          {
            model: AC,
            as: "acs",
            required: false,
            attributes: [
              "id",
              "name",
              "model",
              "serialNumber",
              "temperature",
              "isOn",
            ],
          },
          {
            model: Organization,
            as: "organization",
            required: false,
            attributes: ["id", "name"],
          },
        ],
      });

      if (!venue) {
        return res.status(404).json({
          success: false,
          message: "Venue not found or unauthorized",
        });
      }

      const venueData = venue.toJSON();
      venueData.acsOffCount = 0;
      venueData.acsOff = [];

      if (venueData.isVenueOn && venueData.acs && venueData.acs.length > 0) {
        venueData.acsOff = venueData.acs.filter((ac) => !ac.isOn);
        venueData.acsOffCount = venueData.acsOff.length;
      }

      // Calculate hasMixedTemperatures
      let hasMixedTemperatures = false;
      const venueTemp = venueData.temperature || 16;

      if (venueData.acs && venueData.acs.length > 1) {
        hasMixedTemperatures = venueData.acs.some((ac) => {
          const acTemp = ac.temperature || 16;
          return acTemp !== venueTemp;
        });
      }

      venueData.hasMixedTemperatures = hasMixedTemperatures;

      res.json({
        success: true,
        venue: venueData,
      });
    } catch (error) {
      console.error("Get venue details error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  async setVenueTemperature(req, res) {
    try {
      const managerId = req.manager?.id;
      const adminId = req.admin?.id;
      const { venueId } = req.params;
      const { temperature } = req.body || {};

      const tempValidation = ManagerController.validateTemperature(temperature);
      if (!tempValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: tempValidation.message,
        });
      }

      const tempValue = parseFloat(temperature);
      const { Op } = require("sequelize");
      const Venue = require("../../../models/Venue/venue");

      // Verify venue belongs to manager's organization
      if (managerId) {
        const managerOrgs = await Organization.findAll({
          where: { managerId: managerId },
          attributes: ["id", "adminId"],
        });

        if (managerOrgs.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Venue not found or unauthorized",
          });
        }

        const orgIds = managerOrgs.map((org) => org.id);
        const managerAdminId = managerOrgs[0]?.adminId;

        const venue = await Venue.findOne({
          where: {
            id: venueId,
            adminId: managerAdminId,
            organizationId: { [Op.in]: orgIds },
          },
        });

        if (!venue) {
          return res.status(404).json({
            success: false,
            message: "Venue not found or unauthorized",
          });
        }
      } else if (adminId) {
        // Admin can set temperature for any venue
        const venue = await Venue.findOne({
          where: { id: venueId, adminId: adminId },
        });

        if (!venue) {
          return res.status(404).json({
            success: false,
            message: "Venue not found or unauthorized",
          });
        }
      } else {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const venue = await Venue.findByPk(venueId);
      await venue.update({
        temperature: tempValue,
        lastTemperatureChange: new Date(),
        changedBy: managerId ? "manager" : "admin",
      });

      // Update ALL ACs in this venue
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
      const Event = require("../../../models/Event/event");
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
          `⚠️ [MANAGER-VENUE-TEMP] Skipping ${
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
            changedBy: managerId ? "manager" : "admin",
          },
          {
            where: {
              venueId: venueId,
              id: { [Op.in]: deviceIdsToUpdate },
            },
          }
        );
        console.log(
          `✅ [MANAGER-VENUE-TEMP] Updated ${devicesToUpdate.length} ACs in venue to ${tempValue}°C (${devicesSkipped.length} skipped due to active events)`
        );
      }

      // Send temperature command to all ESP devices in venue
      try {
        console.log(
          `🔌 [MANAGER-VENUE-TEMP] Initiating WebSocket commands for ${acs.length} devices`
        );
        const servicesGateway = require("../../../services");
        const ESPService = servicesGateway.getESPService();

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

        console.log(`✅ [MANAGER-VENUE-TEMP] WebSocket commands completed:`);
        console.log(`   └─ Commands sent: ${sentCount}`);
        console.log(`   └─ Commands skipped: ${skippedCount}`);
      } catch (wsError) {
        console.error(
          "❌ [MANAGER-VENUE-TEMP] WebSocket commands failed (database already updated):",
          wsError.message
        );
        // Don't fail the whole operation if WebSocket fails
      }

      // Get organization info for response
      const orgId = venue.organizationId;
      const organization = await Organization.findByPk(orgId);

      // Get main venue (organization temperature entry)
      const mainVenue = await Venue.findOne({
        where: {
          organizationId: orgId,
          name: organization?.name,
        },
        attributes: ["id", "temperature"],
      });

      // Get all venue temperatures to check if organization has mixed temps
      const orgVenues = await Venue.findAll({
        where: { organizationId: orgId },
        attributes: ["temperature"],
      });

      const allTemps = orgVenues
        .map((v) => v.temperature)
        .filter((t) => t !== null && t !== undefined);
      const uniqueTemps = [...new Set(allTemps)];
      const organizationHasMixed = uniqueTemps.length > 1;

      res.json({
        success: true,
        message: `Venue temperature set to ${tempValue}°C${
          devicesSkipped.length > 0
            ? `. ${devicesSkipped.length} device(s) skipped due to active events`
            : ""
        }`,
        venue: {
          id: venue.id,
          name: venue.name,
          temperature: tempValue,
        },
        organization: organization
          ? {
              id: organization.id,
              name: organization.name,
              temperature: mainVenue?.temperature || null,
              hasMixedTemperatures: organizationHasMixed,
            }
          : null,
      });
    } catch (error) {
      console.error("Set venue temperature error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  async toggleVenuePower(req, res) {
    try {
      const managerId = req.manager?.id;
      const adminId = req.admin?.id;
      const { venueId } = req.params;
      const { powerState } = req.body || {};

      // Check if admin or manager is making the request
      let userId, userRole, userName;
      if (adminId) {
        userId = adminId;
        userRole = "admin";
        userName = req.admin.name;
        console.log("🔌 Admin toggling venue power:", userId, userName);
      } else if (managerId) {
        userId = managerId;
        userRole = "manager";
        userName = req.manager.name;
        console.log("🔌 Manager toggling venue power:", userId, userName);
      } else {
        return res.status(401).json({
          success: false,
          message: "Authentication required. Please login as admin or manager.",
        });
      }

      console.log("- Session ID:", req.session?.sessionId);
      console.log("- Venue ID:", venueId);
      console.log("- Power State:", powerState);

      // Validate powerState
      if (powerState === undefined || powerState === null) {
        return res.status(400).json({
          success: false,
          message: "Power state is required (true/false or 'on'/'off')",
        });
      }

      // Verify venue belongs to manager's organization
      if (managerId) {
        const managerOrgs = await Organization.findAll({
          where: { managerId: managerId },
          attributes: ["id", "adminId"],
        });

        if (managerOrgs.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Venue not found or unauthorized",
          });
        }

        const orgIds = managerOrgs.map((org) => org.id);
        const managerAdminId = managerOrgs[0]?.adminId;

        const { Op } = require("sequelize");
        const Venue = require("../../../models/Venue/venue");

        const venue = await Venue.findOne({
          where: {
            id: venueId,
            adminId: managerAdminId,
            organizationId: { [Op.in]: orgIds },
          },
        });

        if (!venue) {
          return res.status(404).json({
            success: false,
            message: "Venue not found or unauthorized",
          });
        }
      }

      // Use VenueService to toggle venue power
      const VenueService = require("../../admin/services/venueService");
      const result = await VenueService.toggleVenuePower(
        parseInt(venueId),
        powerState,
        userRole,
        userId
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
        message: error.message || "Internal server error",
      });
    }
  }

  async getACDetails(req, res) {
    try {
      const managerId = req.manager.id;
      const { acId } = req.params;

      // Verify AC belongs to manager's organization through venues
      const managerOrgs = await Organization.findAll({
        where: { managerId: managerId },
        attributes: ["id", "adminId"],
      });

      if (managerOrgs.length === 0) {
        return res.status(404).json({
          success: false,
          message: "AC device not found or unauthorized",
        });
      }

      const orgIds = managerOrgs.map((org) => org.id);
      const adminId = managerOrgs[0]?.adminId;

      if (!adminId) {
        return res.status(404).json({
          success: false,
          message: "AC device not found or unauthorized",
        });
      }

      const { Op } = require("sequelize");
      const Venue = require("../../../models/Venue/venue");

      // Get venues for additional lookup (some ACs might reference venue IDs)
      const venues = await Venue.findAll({
        where: {
          adminId: adminId,
          organizationId: { [Op.in]: orgIds },
        },
        attributes: ["id"],
      });
      const venueIds = venues.map((v) => v.id);

      // ACs have venueId which references organizations table
      // But to be safe, check both orgIds and venueIds (in case of data inconsistency)
      // Combine both for lookup
      const allPossibleIds = [...orgIds, ...venueIds];
      const uniqueIds = [...new Set(allPossibleIds)];

      console.log(
        `🔍 [GET-AC-DETAILS] Manager ${managerId} looking for AC ${acId}`
      );
      console.log(`🔍 [GET-AC-DETAILS] Checking with orgIds:`, orgIds);
      console.log(`🔍 [GET-AC-DETAILS] Checking with venueIds:`, venueIds);
      console.log(`🔍 [GET-AC-DETAILS] Combined uniqueIds:`, uniqueIds);

      const ac = await AC.findOne({
        where: {
          id: acId,
          venueId: { [Op.in]: uniqueIds },
        },
        include: [
          {
            model: Organization,
            as: "organization",
            required: false,
            attributes: ["id", "name", "adminId"],
          },
          {
            model: Venue,
            as: "venue",
            required: false,
            attributes: ["id", "name", "organizationId"],
          },
        ],
        attributes: [
          "id",
          "name",
          "brand",
          "model",
          "serialNumber",
          "temperature",
          "isOn",
          "isWorking",
          "ton",
          "currentMode",
          "totalEnergyConsumed",
          "lastEnergyCalculation",
          "isOnStartup",
          "startupStartTime",
          "currentState",
          "venueId",
          "createdAt",
          "updatedAt",
        ],
      });

      if (!ac) {
        // Debug: Check if device exists at all
        const deviceExists = await AC.findByPk(acId, {
          attributes: ["id", "name", "venueId"],
        });

        if (deviceExists) {
          console.error(
            `❌ [GET-AC-DETAILS] Device ${acId} exists but venueId ${deviceExists.venueId} not in manager's orgIds/venueIds`
          );
          console.error(`   Device venueId: ${deviceExists.venueId}`);
          console.error(`   Manager orgIds:`, orgIds);
          console.error(`   Manager venueIds:`, venueIds);
        } else {
          console.error(
            `❌ [GET-AC-DETAILS] Device ${acId} does not exist in database`
          );
        }

        return res.status(404).json({
          success: false,
          message: "AC device not found or unauthorized",
        });
      }

      console.log(
        `✅ [GET-AC-DETAILS] Device ${ac.id} (${ac.name}) found with venueId: ${ac.venueId}`
      );

      res.json({
        success: true,
        data: {
          ac: ac,
        },
      });
    } catch (error) {
      console.error("Get AC details error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }
}

module.exports = new ManagerController();
