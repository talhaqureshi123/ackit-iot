const Admin = require("../../../models/Roleaccess/admin");
const Manager = require("../../../models/Roleaccess/manager");
const Organization = require("../../../models/Organization/organization");
const Venue = require("../../../models/Venue/venue");
const AC = require("../../../models/AC/ac");
const ActivityLog = require("../../../models/Activity log/activityLog");
const SystemState = require("../../../models/SystemState/systemState");
const SuspensionService = require("../services/suspensionService");
const { Op } = require("sequelize");
const SessionHelper = require("../../../middleware/sessionHelper");

class SuperAdminController {
  // Session helper method
  static ensureSession(req, res) {
    return SessionHelper.ensureSession(req, res, 'superadmin');
  }

  // 0. SUPER ADMIN LOGIN - Use SuperAdminAuth for consistency
  async loginSuperAdmin(req, res) {
    try {
      const SuperAdminAuth = require("../authentication/superAdminAuth");
      return await SuperAdminAuth.login(req, res);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Login service unavailable",
        error: error.message
      });
    }
  }

  // 1. CREATE ADMIN - Create a new admin
  async createAdmin(req, res) {
    try {
      // Session validated by authenticateSuperAdmin middleware
      const { name, email, password } = req.body || {};
      const superAdminId = req.user.id; // From JWT token

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Name, email, and password are required",
        });
      }

      // Check if admin with email already exists
      const existingAdmin = await Admin.findOne({
        where: { email: email },
      });

      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: "Admin with this email already exists",
        });
      }

      // Hash the password
      const bcrypt = require("bcryptjs");
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create admin
      const admin = await Admin.create({
        name,
        email,
        password: hashedPassword,
        status: "active",
      });

      // Log activity (don't fail if logging fails)
      try {
        await this.logActivity(
          superAdminId,
          "CREATE_ADMIN",
          "admin",
          admin.id,
          { message: `Admin ${name} (${email}) created by Super Admin` },
          null,
          req
        );
      } catch (logError) {
        console.error("Error logging admin creation activity:", logError);
        // Don't throw - admin creation succeeded, logging is secondary
      }

      res.status(201).json({
        success: true,
        data: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          status: admin.status,
          createdAt: admin.createdAt,
        },
        message: "Admin created successfully",
      });
    } catch (error) {
      console.error("Create admin error:", error);
      res.status(500).json({
        success: false,
        message: "Error creating admin",
        error: error.message,
      });
    }
  }

  // 2. VIEW-ONLY ACCESS - Get all Admins
  async getAllAdmins(req, res) {
    try {
      // Session validated by authenticateSuperAdmin middleware
      const admins = await Admin.findAll({
        attributes: [
          "id",
          "name",
          "email",
          "status",
          "suspendedAt",
          "suspensionReason",
          "createdAt",
        ],
        order: [["createdAt", "DESC"]],
      });

      res.status(200).json({
        success: true,
        data: admins,
        message: "All admins retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error retrieving admins",
        error: error.message,
      });
    }
  }

  // 2. VIEW-ONLY ACCESS - Get all Managers
  async getAllManagers(req, res) {
    try {
      // Session validated by authenticateSuperAdmin middleware
      const managers = await Manager.findAll({
        include: [
          {
            model: Admin,
            as: "admin",
            attributes: ["id", "name", "email"],
          },
        ],
        attributes: [
          "id",
          "name",
          "email",
          "adminId",
          "status",
          "suspendedAt",
          "suspensionReason",
          "createdAt",
        ],
        order: [["createdAt", "DESC"]],
      });

      res.status(200).json({
        success: true,
        data: managers,
        message: "All managers retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error retrieving managers",
        error: error.message,
      });
    }
  }

  // 3. VIEW-ONLY ACCESS - Get all Organizations
  async getAllOrganizations(req, res) {
    try {
      // Session validated by authenticateSuperAdmin middleware
      const organizations = await Organization.findAll({
        include: [
          {
            model: Admin,
            as: "admin",
            attributes: ["id", "name", "email"],
          },
          {
            model: Manager,
            as: "manager",
            attributes: ["id", "name", "email"],
          },
        ],
        attributes: [
          "id",
          "name",
          "description",
          "address",
          "adminId",
          "managerId",
          "status",
          "splitFromId",
          "splitIntoIds",
          "splitAt",
          "createdAt",
        ],
        order: [["createdAt", "DESC"]],
      });

      res.status(200).json({
        success: true,
        data: organizations,
        message: "All organizations retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error retrieving organizations",
        error: error.message,
      });
    }
  }

  // 4. VIEW-ONLY ACCESS - Get all Venues
  async getAllVenues(req, res) {
    try {
      // Session validated by authenticateSuperAdmin middleware
      const venues = await Venue.findAll({
        include: [
          {
            model: Admin,
            as: "admin",
            attributes: ["id", "name", "email"],
          },
          {
            model: Organization,
            as: "organizations",
            attributes: ["id", "name", "status"],
          },
        ],
        attributes: ["id", "name", "adminId", "createdAt"],
        order: [["createdAt", "DESC"]],
      });

      res.status(200).json({
        success: true,
        data: venues,
        message: "All venues retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error retrieving venues",
        error: error.message,
      });
    }
  }

  // 5. VIEW-ONLY ACCESS - Get all ACs
  async getAllACs(req, res) {
    try {
      // Session validated by authenticateSuperAdmin middleware
      const acs = await AC.findAll({
        include: [
          {
            model: Organization,
            as: "organization",
            attributes: ["id", "name", "adminId"],
            include: [
              {
                model: Admin,
                as: "admin",
                attributes: ["id", "name", "email"],
              },
            ],
          },
        ],
        attributes: [
          "id",
          "name",
          "model",
          "serialNumber",
          "organizationId",
          "status",
          "currentState",
          "temperature",
          "isOn",
          "lastSeen",
          "suspendedAt",
          "suspensionReason",
          "createdAt",
        ],
        order: [["createdAt", "DESC"]],
      });

      res.status(200).json({
        success: true,
        data: acs,
        message: "All ACs retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error retrieving ACs",
        error: error.message,
      });
    }
  }

  // 2. VIEW-ONLY ACCESS - Get specific Admin details
  async getAdminDetails(req, res) {
    try {
      // Session validated by authenticateSuperAdmin middleware
      const { adminId } = req.params;

      const admin = await Admin.findByPk(adminId, {
        attributes: [
          "id",
          "name",
          "email",
          "status",
          "suspendedAt",
          "suspendedBy",
          "suspensionReason",
          "createdAt",
        ],
      });

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      res.status(200).json({
        success: true,
        data: admin,
        message: "Admin details retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error retrieving admin details",
        error: error.message,
      });
    }
  }

  // 4. SUSPEND ADMIN - Main suspension function
  async suspendAdmin(req, res) {
    try {
      // Session validated by authenticateSuperAdmin middleware
      const { adminId } = req.params;
      const { reason = "Suspended by Super Admin" } = req.body || {};
      const superAdminId = req.user.id; // From JWT token

      const admin = await Admin.findByPk(adminId);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      if (admin.status === "suspended") {
        return res.status(400).json({
          success: false,
          message: "Admin is already suspended",
        });
      }

      // Use SuspensionService for proper suspension handling
      const result = await SuspensionService.suspendAdmin(
        adminId,
        superAdminId,
        reason
      );

      // Send notification email
      try {
        console.log(
          `📬 DEBUG: Sending suspension email to: ${admin.email} (Admin: ${admin.name})`
        );
        const notificationService = require("../../../realtimes/email/superadminNotifications");
        await notificationService.sendSuspensionNotification(
          admin.email,
          admin.name,
          reason,
          `Super Admin (ID: ${superAdminId})`
        );
        console.log(`✅ Suspension notification sent to ${admin.email}`);
      } catch (notificationError) {
        console.error(
          `❌ Error sending suspension notification:`,
          notificationError.message
        );
        // Don't throw error to prevent breaking the main flow
      }

      res.status(200).json({
        success: true,
        message: "Admin suspended successfully with cascade effect",
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error suspending admin",
        error: error.message,
      });
    }
  }

  // 5. RESUME ADMIN - Resume admin and restore states
  async resumeAdmin(req, res) {
    try {
      // Session validated by authenticateSuperAdmin middleware
      const { adminId } = req.params;
      const superAdminId = req.user.id;

      const admin = await Admin.findByPk(adminId);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      if (admin.status === "active") {
        return res.status(400).json({
          success: false,
          message: "Admin is already active",
        });
      }

      // Use SuspensionService for proper resumption handling
      const result = await SuspensionService.resumeAdmin(adminId, superAdminId);

      // Send notification email
      try {
        const notificationService = require("../../../realtimes/email/superadminNotifications");
        await notificationService.sendResumptionNotification(
          admin.email,
          admin.name,
          `Super Admin (ID: ${superAdminId})`
        );
        console.log(`✅ Resumption notification sent to ${admin.email}`);
      } catch (notificationError) {
        console.error(
          `❌ Error sending resumption notification:`,
          notificationError.message
        );
        // Don't throw error to prevent breaking the main flow
      }

      res.status(200).json({
        success: true,
        message: "Admin resumed successfully with all related entities",
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error resuming admin",
        error: error.message,
      });
    }
  }

  // 3. GET ACTIVITY LOGS - Only admin activities (admin actions on AC, organization, etc.)
  async getActivityLogs(req, res) {
    try {
      // Session validated by authenticateSuperAdmin middleware
      const { page = 1, limit = 50, action, adminId } = req.query;
      const offset = (page - 1) * limit;

      // Superadmin views only admin activities
      const whereClause = {
        adminId: { [Op.ne]: null }, // Only admin activities (not manager activities)
      };
      if (adminId) whereClause.adminId = adminId;
      if (action) whereClause.action = { [Op.like]: `%${action}%` };

      const logs = await ActivityLog.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Admin,
            as: "admin",
            attributes: ["id", "name", "email"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      res.status(200).json({
        success: true,
        data: {
          logs: logs.rows,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(logs.count / limit),
            totalLogs: logs.count,
            hasNext: offset + logs.rows.length < logs.count,
            hasPrev: page > 1,
          },
        },
        message: "Admin activity logs retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error retrieving activity logs",
        error: error.message,
      });
    }
  }

  // Helper Methods

  // Save system state before suspension
  async saveSystemState(adminId, transaction) {
    try {
      // Get all ACs under this admin's organizations
      const organizations = await Organization.findAll({
        where: { adminId: adminId },
        attributes: ["id"],
        transaction,
      });

      const orgIds = organizations.map((org) => org.id);

      const acs = await AC.findAll({
        where: { organizationId: { [Op.in]: orgIds } },
        attributes: ["id", "currentState", "temperature", "isOn"],
        transaction,
      });

      // Save the state data
      const stateData = {
        acs: acs.map((ac) => ({
          id: ac.id,
          currentState: ac.currentState,
          temperature: ac.temperature,
          isOn: ac.isOn,
        })),
        savedAt: new Date(),
      };

      await SystemState.create(
        {
          adminId: adminId,
          entityType: "admin",
          lockLevel: "superadmin",
          lockType: "suspend",
          stateData: stateData, // For backward compatibility
          previousState: stateData, // New structure
          isActive: true,
          reason: "Admin suspended by Super Admin",
          lockedBy: `Super Admin (ID: ${superAdminId})`,
          suspendedAt: new Date(),
        },
        { transaction }
      );

      console.log(`System state saved for admin ${adminId}`);
    } catch (error) {
      console.error(`Error saving system state for admin ${adminId}:`, error);
    }
  }

  // Restore system state after resumption
  async restoreSystemState(adminId, transaction) {
    try {
      // Find the most recent system state for this admin
      const systemState = await SystemState.findOne({
        where: {
          adminId: adminId,
          isRestored: false,
        },
        order: [["suspendedAt", "DESC"]],
        transaction,
      });

      // Check both stateData (legacy) and previousState (new)
      const stateToRestore =
        systemState?.stateData || systemState?.previousState;

      if (systemState && stateToRestore && stateToRestore.acs) {
        // Restore AC states
        for (const acState of stateToRestore.acs) {
          await AC.update(
            {
              currentState: acState.currentState,
              temperature: acState.temperature,
              isOn: acState.isOn,
            },
            {
              where: { id: acState.id },
              transaction,
            }
          );
        }

        // Mark system state as restored
        await systemState.update(
          {
            isActive: false,
            isRestored: true,
            restoredAt: new Date(),
          },
          { transaction }
        );

        console.log(`System state restored for admin ${adminId}`);
      }
    } catch (error) {
      console.error(
        `Error restoring system state for admin ${adminId}:`,
        error
      );
    }
  }

  // Freeze operations (WebSocket, scheduling, etc.)
  async freezeOperations(adminId) {
    // Implementation for freezing WebSocket updates and scheduled operations
    console.log(`Freezing operations for admin ${adminId}`);
  }

  // Resume operations
  async resumeOperations(adminId) {
    // Implementation for resuming WebSocket updates and scheduled operations
    console.log(`Resuming operations for admin ${adminId}`);
  }

  // Log activity
  async logActivity(
    superAdminId,
    action,
    targetType,
    targetId,
    details,
    transaction,
    req = null
  ) {
    try {
      await ActivityLog.create(
        {
          superAdminId: superAdminId,
          action: action,
          targetType: targetType,
          targetId: targetId,
          details: details,
          ipAddress: req?.ip || null,
          userAgent: req?.get("User-Agent") || null,
        },
        { transaction }
      );

      console.log(
        `Activity logged: ${action} on ${targetType} ${targetId} by super admin ${superAdminId}`
      );
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  }

  // Send notification email
  async sendSuspensionNotification(
    email,
    adminName,
    status,
    reason,
    superAdminId
  ) {
    try {
      const notificationService = require("../../../realtimes/email/superadminNotifications");

      if (status === "suspended") {
        await notificationService.sendSuspensionNotification(
          email,
          adminName,
          reason,
          `Super Admin (ID: ${superAdminId})`
        );
      } else if (status === "resumed") {
        await notificationService.sendResumptionNotification(
          email,
          adminName,
          `Super Admin (ID: ${superAdminId})`
        );
      }

      console.log(`✅ ${status} notification sent to ${email}: ${reason}`);
    } catch (error) {
      console.error(`❌ Error sending ${status} notification:`, error);
      // Don't throw error to prevent breaking the main flow
    }
  }
}

module.exports = new SuperAdminController();
