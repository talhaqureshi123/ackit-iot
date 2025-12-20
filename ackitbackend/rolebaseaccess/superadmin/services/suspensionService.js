const Admin = require("../../../models/Roleaccess/admin");
const SystemState = require("../../../models/SystemState/systemState");
const managerModule = require("../../manager");
const ManagerAuth = managerModule.auth;

class SuspensionService {
  // Suspend admin - save previous state first
  static async suspendAdmin(adminId, superAdminId, reason) {
    const transaction = await Admin.sequelize.transaction();

    try {
      const admin = await Admin.findByPk(adminId, { transaction });

      if (!admin) {
        throw new Error("Admin not found");
      }

      if (admin.status === "suspended") {
        throw new Error("Admin is already suspended");
      }

      // Save previous state before suspending
      const previousState = {
        status: admin.status,
        suspendedAt: admin.suspendedAt,
        suspendedBy: admin.suspendedBy,
        suspensionReason: admin.suspensionReason,
        savedAt: new Date(),
      };

      // Suspend the admin
      await admin.update(
        {
          status: "suspended",
          suspendedAt: new Date(),
          suspendedBy: superAdminId,
          suspensionReason: reason,
        },
        { transaction }
      );

      // Save state in SystemState for restoration
      await SystemState.create(
        {
          superAdminId: superAdminId,
          entityType: "admin",
          entityId: adminId,
          actionType: "suspend",
          isActive: true,
          previousState: previousState,
          lockedAt: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      // Invalidate all manager sessions under this admin (non-blocking)
      // Run in background to avoid blocking the response
      setImmediate(async () => {
        try {
          const result = await ManagerAuth.invalidateAllManagerSessionsForAdmin(
            adminId
          );
          console.log(
            `🔒 Admin ${adminId} suspended. Invalidated ${result.sessionsInvalidated} session(s) for ${result.managersAffected} manager(s).`
          );
        } catch (error) {
          console.error(
            "Error invalidating manager sessions during admin suspension:",
            error
          );
          // Don't fail the suspension if session invalidation fails
        }
      });

      return {
        success: true,
        message: "Admin suspended successfully",
        adminId: admin.id,
        suspendedAt: new Date(),
        reason: reason,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Resume admin - restore to previous state
  static async resumeAdmin(adminId, superAdminId) {
    const transaction = await Admin.sequelize.transaction();

    try {
      const admin = await Admin.findByPk(adminId, { transaction });

      if (!admin) {
        throw new Error("Admin not found");
      }

      if (admin.status === "active") {
        throw new Error("Admin is already active");
      }

      // Find the suspension record with previous state
      const systemState = await SystemState.findOne({
        where: {
          entityType: "admin",
          entityId: adminId,
          actionType: "suspend",
          isActive: true,
        },
        order: [["lockedAt", "DESC"]],
        transaction,
      });

      if (!systemState || !systemState.previousState) {
        // No previous state found, just set to active
        await admin.update(
          {
            status: "active",
            suspendedAt: null,
            suspendedBy: null,
            suspensionReason: null,
          },
          { transaction }
        );
      } else {
        // Restore to previous state (where it was before suspension)
        const prevState = systemState.previousState;
        await admin.update(
          {
            status: prevState.status || "active",
            suspendedAt: prevState.suspendedAt || null,
            suspendedBy: prevState.suspendedBy || null,
            suspensionReason: prevState.suspensionReason || null,
          },
          { transaction }
        );
      }

      // Mark SystemState as resumed
      if (systemState) {
        await systemState.update(
          {
            isActive: false,
            unlockedAt: new Date(),
            resumedAt: new Date(),
          },
          { transaction }
        );
      }

      await transaction.commit();

      return {
        success: true,
        message: "Admin resumed successfully to previous state",
        adminId: admin.id,
        resumedAt: new Date(),
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = SuspensionService;
