const Manager = require("../../../models/Roleaccess/manager");
const Organization = require("../../../models/Organization/organization");
const AC = require("../../../models/AC/ac");
const ActivityLog = require("../../../models/Activity log/activityLog");
const { Op } = require("sequelize");

class ManagerService {
  // Create a new manager
  static async createManager(adminId, managerData) {
    const transaction = await Manager.sequelize.transaction();

    try {
      // Check if manager with email already exists
      const existingManager = await Manager.findOne({
        where: { email: managerData.email },
        transaction,
      });

      if (existingManager) {
        throw new Error("Manager with this email already exists");
      }

      // Validate organization if provided
      if (managerData.organizationId) {
        const organization = await Organization.findOne({
          where: {
            id: managerData.organizationId,
            adminId: adminId,
          },
          transaction,
        });

        if (!organization) {
          throw new Error(
            "Organization not found or does not belong to this admin"
          );
        }
      }

      // Hash the password
      const bcrypt = require("bcryptjs");
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(
        managerData.password,
        saltRounds
      );

      // Create manager with hashed password
      const manager = await Manager.create(
        {
          name: managerData.name,
          email: managerData.email,
          password: hashedPassword, // Hashed password
          adminId: adminId,
          organizationId: managerData.organizationId || null,
          status: "unlocked",
        },
        { transaction }
      );

      // Log activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: "CREATE_MANAGER",
          targetType: "manager",
          targetId: manager.id,
          details: `Created manager: ${manager.name} (${manager.email})`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: "Manager created successfully",
        data: {
          manager: {
            id: manager.id,
            name: manager.name,
            email: manager.email,
            adminId: manager.adminId,
            organizationId: manager.organizationId,
            status: manager.status,
          },
        },
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Lock manager ACCOUNT (admin can only lock their own managers)
  // IMPORTANT: This is SEPARATE from remote access lock
  // - This locks the manager's ACCOUNT (prevents login and actions)
  // - This is NOT the same as locking remote access (which managers can do when unlocked)
  // - When manager account is locked, they cannot use remote access lock feature
  static async lockManager(adminId, managerId, lockReason) {
    const transaction = await Manager.sequelize.transaction();

    try {
      // Find manager and verify it belongs to this admin
      const manager = await Manager.findOne({
        where: {
          id: managerId,
          adminId: adminId, // Only admin's own managers
        },
        transaction,
      });

      if (!manager) {
        throw new Error("Manager not found or does not belong to this admin");
      }

      // Check current status
      if (manager.status === "locked") {
        throw new Error("Manager is already locked");
      }

      // Lock manager ACCOUNT (this is separate from remote access lock)
      // Manager account status: locked = cannot login at all
      await Manager.update(
        {
          status: "locked",
          lockedAt: new Date(),
          lockReason: lockReason || "Locked by admin",
        },
        {
          where: { id: managerId },
          transaction,
        }
      );

      // Log activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: "LOCK_MANAGER",
          targetType: "manager",
          targetId: managerId,
          details: `Locked manager: ${manager.name} - Reason: ${
            lockReason || "No reason provided"
          }`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: "Manager locked successfully",
        data: {
          managerId: managerId,
          managerName: manager.name,
          lockReason: lockReason,
          status: "locked",
        },
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Fully unlock manager ACCOUNT (admin can only unlock their own managers)
  // IMPORTANT: This is SEPARATE from remote access lock
  // - This unlocks the manager's ACCOUNT (allows login and full access)
  // - This is NOT the same as unlocking remote access
  // - When manager account is unlocked, they can use remote access lock feature
  static async unlockManager(adminId, managerId) {
    const transaction = await Manager.sequelize.transaction();

    try {
      // Find manager and verify it belongs to this admin
      const manager = await Manager.findOne({
        where: {
          id: managerId,
          adminId: adminId, // Only admin's own managers
        },
        transaction,
      });

      if (!manager) {
        throw new Error("Manager not found or does not belong to this admin");
      }

      // Check current status
      if (manager.status === "unlocked") {
        throw new Error("Manager is already unlocked");
      }

      // Unlock manager ACCOUNT (this is separate from remote access lock)
      // Manager account status: unlocked = can login and perform all actions including remote access lock
      await Manager.update(
        {
          status: "unlocked",
          lockedAt: null,
          lockReason: null,
        },
        {
          where: { id: managerId },
          transaction,
        }
      );

      // Log activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: "UNLOCK_MANAGER",
          targetType: "manager",
          targetId: managerId,
          details: `Unlocked manager: ${manager.name}`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: "Manager unlocked successfully",
        data: {
          managerId: managerId,
          managerName: manager.name,
          status: "unlocked",
        },
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Restricted unlock manager account (admin can only unlock their own managers with restricted access)
  // IMPORTANT: This is SEPARATE from remote access lock
  // - This sets manager ACCOUNT to "restricted" status (can login but limited permissions)
  // - Restricted managers CANNOT use remote access lock feature (only unlocked managers can)
  // - This is NOT the same as locking/unlocking remote access
  static async restrictedUnlockManager(adminId, managerId) {
    const transaction = await Manager.sequelize.transaction();

    try {
      // Find manager and verify it belongs to this admin
      const manager = await Manager.findOne({
        where: {
          id: managerId,
          adminId: adminId, // Only admin's own managers
        },
        transaction,
      });

      if (!manager) {
        throw new Error("Manager not found or does not belong to this admin");
      }

      // Check current status
      if (manager.status === "restricted") {
        throw new Error("Manager is already unlocked with restricted access");
      }

      // Set manager ACCOUNT to restricted status (this is separate from remote access lock)
      // Manager account status: restricted = can login but cannot perform restricted actions
      // Restricted managers CANNOT lock/unlock remote access (only unlocked managers can)
      await Manager.update(
        {
          status: "restricted",
          lockedAt: null,
          lockReason: null,
        },
        {
          where: { id: managerId },
          transaction,
        }
      );

      // Log activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: "RESTRICTED_UNLOCK_MANAGER",
          targetType: "manager",
          targetId: managerId,
          details: `Unlocked manager with restricted access: ${manager.name}`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: "Manager unlocked with restricted access successfully",
        data: {
          managerId: managerId,
          managerName: manager.name,
          status: "restricted",
        },
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Get admin's managers only
  static async getAdminManagers(adminId) {
    try {
      const managers = await Manager.findAll({
        where: {
          adminId: adminId, // Only this admin's managers
        },
        attributes: [
          "id",
          "name",
          "email",
          "organizationId",
          "status",
          "lockedAt",
          "lockReason",
          "createdAt",
        ],
        order: [["createdAt", "DESC"]],
      });

      // Ensure default status is 'unlocked' for any managers without status
      const managersWithStatus = managers.map((manager) => {
        if (!manager.status) {
          manager.status = "unlocked";
        }
        return manager;
      });

      return {
        success: true,
        data: {
          managers: managersWithStatus,
          count: managersWithStatus.length,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Lock/Unlock manager
  static async toggleManagerStatus(adminId, managerId, action, reason = null) {
    const transaction = await Manager.sequelize.transaction();

    try {
      const manager = await Manager.findByPk(managerId, { transaction });

      if (!manager) {
        throw new Error("Manager not found");
      }

      if (manager.adminId !== adminId) {
        throw new Error("Unauthorized: Manager does not belong to this admin");
      }

      const newStatus = action === "lock" ? "locked" : "unlocked";
      const updateData = {
        status: newStatus,
        lockedAt: action === "lock" ? new Date() : null,
        lockReason: action === "lock" ? reason : null,
      };

      await manager.update(updateData, { transaction });

      // If locking manager, also lock all their organizations and ACs
      if (action === "lock") {
        await this.cascadeLockManagerEntities(managerId, reason, transaction);
      } else {
        // If unlocking manager, unlock all their organizations and ACs
        await this.cascadeUnlockManagerEntities(managerId, transaction);
      }

      // Log activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: action === "lock" ? "LOCK_MANAGER" : "UNLOCK_MANAGER",
          targetType: "manager",
          targetId: managerId,
          details: `${action === "lock" ? "Locked" : "Unlocked"} manager: ${
            manager.name
          }${reason ? ` - Reason: ${reason}` : ""}`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: `Manager ${
          action === "lock" ? "locked" : "unlocked"
        } successfully`,
        manager: {
          id: manager.id,
          name: manager.name,
          email: manager.email,
          status: newStatus,
          lockedAt: updateData.lockedAt,
          lockReason: updateData.lockReason,
        },
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Cascade lock all manager's entities - STRONG HIERARCHY
  static async cascadeLockManagerEntities(managerId, reason, transaction) {
    // HIERARCHY: Managers can only lock ACs in their assigned organizations
    // Organizations are never suspended/locked - they remain active

    // Get all organizations assigned to this manager
    const organizations = await Organization.findAll({
      where: { managerId: managerId },
      transaction,
    });

    // Lock all ACs in these assigned organizations (not suspend - just lock)
    for (const org of organizations) {
      await AC.update(
        {
          currentState: "locked",
          lockedAt: new Date(),
          lockReason: `Manager locked: ${reason}`,
          lockedBy: "admin",
        },
        {
          where: { organizationId: org.id },
          transaction,
        }
      );
    }
  }

  // Cascade unlock all manager's entities - STRONG HIERARCHY
  static async cascadeUnlockManagerEntities(managerId, transaction) {
    // HIERARCHY: Managers can only unlock ACs in their assigned organizations
    // Organizations are never suspended/locked - they remain active

    // Get all organizations assigned to this manager
    const organizations = await Organization.findAll({
      where: { managerId: managerId },
      transaction,
    });

    // Unlock all ACs in these assigned organizations
    for (const org of organizations) {
      await AC.update(
        {
          currentState: "unlocked",
          lockedAt: null,
          lockReason: null,
          lockedBy: null,
        },
        {
          where: { organizationId: org.id },
          transaction,
        }
      );
    }
  }

  // Get all managers under an admin
  static async getManagersByAdmin(adminId) {
    try {
      const managers = await Manager.findAll({
        where: { adminId: adminId },
        attributes: [
          "id",
          "name",
          "email",
          "status",
          "lockedAt",
          "lockReason",
          "createdAt",
          "updatedAt",
        ],
        order: [["createdAt", "DESC"]],
      });

      return {
        success: true,
        managers: managers,
      };
    } catch (error) {
      throw error;
    }
  }

  // Get manager details
  static async getManagerDetails(adminId, managerId) {
    try {
      const manager = await Manager.findOne({
        where: {
          id: managerId,
          adminId: adminId,
        },
        attributes: [
          "id",
          "name",
          "email",
          "status",
          "lockedAt",
          "lockReason",
          "createdAt",
          "updatedAt",
        ],
        include: [
          {
            model: Organization,
            as: "organizations",
            attributes: ["id", "name", "status"],
          },
        ],
      });

      if (!manager) {
        throw new Error("Manager not found or unauthorized");
      }

      return {
        success: true,
        manager: manager,
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ManagerService;
