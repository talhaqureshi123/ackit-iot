// Manager LockService - References Admin LockService for consistency
// This ensures both admin and manager use the same locking logic

const adminModule = require("../../admin");
const AdminLockService = adminModule.Services?.LockService || require("../../admin/services/lockService");

class ManagerLockService {
    // Manager can only lock system from remote users
    static async lockSystemFromRemote(managerId, reason, lockedBy) {
        return await AdminLockService.managerLockSystem(managerId, reason, lockedBy);
    }

    // Manager can unlock their own locks
    static async unlockSystem(managerId, unlockedBy) {
        return await AdminLockService.unlockSystem(
            "system",
            managerId,
            unlockedBy,
            "manager"
        );
    }

    // Check if manager can change temperature
    static async canChangeTemperature(acId, managerId) {
        return await AdminLockService.canChangeTemperature(acId, "manager", managerId);
    }

    // Restore temperature if unauthorized change detected
    static async restoreTemperature(acId) {
        return await AdminLockService.restoreTemperature(acId);
    }

    // Get manager's locked temperatures
    static async getLockedTemperatures(managerId) {
        try {
            const SystemState = require("../../../models/SystemState/systemState");

            const activeLocks = await SystemState.findAll({
                where: {
                    managerId: managerId,
                    isActive: true,
                    lockedTemperatures: { [require("sequelize").Op.ne]: null },
                },
                order: [["lockedAt", "DESC"]],
            });

            if (activeLocks.length > 0) {
                return {
                    success: true,
                    temperatures: activeLocks[0].lockedTemperatures,
                    lockedAt: activeLocks[0].lockedAt,
                };
            }

            return {
                success: false,
                message: "No locked temperatures found",
            };
        } catch (error) {
            console.error("Error getting locked temperatures:", error);
            return {
                success: false,
                message: "Error retrieving locked temperatures",
            };
        }
    }
}

module.exports = ManagerLockService;