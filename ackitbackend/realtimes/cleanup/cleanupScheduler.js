const cron = require("node-cron");
const ActivityLog = require("../../models/Activity log/activityLog");
const SystemState = require("../../models/SystemState/systemState");
const AC = require("../../models/AC/ac");
const { Op } = require("sequelize");

// Prevent blocking - track if scheduler is already running
let isRunning = false;

class CleanupScheduler {
  static start() {
    console.log("🧹 Starting cleanup scheduler...");

    // Run daily at 2 AM (Pakistan/Karachi timezone) to clean up old activity logs
    // Cron expression: "0 2 * * *" means at 2:00 AM every day
    cron.schedule(
      "0 2 * * *",
      async () => {
        // Prevent blocking - skip if already running
        if (isRunning) {
          console.log("⏳ Cleanup scheduler: Skipping, already running...");
          return;
        }

        isRunning = true;
        try {
          console.log("🧹 Running scheduled cleanup task...");
          await this.cleanupOldActivityLogs();
          await this.cleanupOldSystemStates();
          await this.cleanupOldAlerts();
          await this.cleanupLargeRoomTempHistory();
        } catch (error) {
          console.error("❌ Error in scheduled cleanup:", error);
        } finally {
          isRunning = false;
        }
      },
      {
        timezone: "Asia/Karachi", // Cron runs based on Pakistan/Karachi time
      }
    );

    console.log(
      "✅ Cleanup scheduler started (runs daily at 2:00 AM PKT to clean up old data)"
    );
  }

  // Delete activity logs older than 15 days
  static async cleanupOldActivityLogs() {
    try {
      const now = new Date();
      const fifteenDaysAgo = new Date(now);
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      // Find all activity logs older than 15 days
      const oldLogs = await ActivityLog.findAll({
        where: {
          createdAt: {
            [Op.lt]: fifteenDaysAgo,
          },
        },
      });

      if (oldLogs.length > 0) {
        // Delete old logs
        const deletedCount = await ActivityLog.destroy({
          where: {
            createdAt: {
              [Op.lt]: fifteenDaysAgo,
            },
          },
        });

        console.log(
          `🗑️ Deleted ${deletedCount} activity log(s) older than 15 days (before ${fifteenDaysAgo.toISOString()})`
        );
      } else {
        console.log("✅ No old activity logs to clean up");
      }
    } catch (error) {
      console.error("❌ Error cleaning up old activity logs:", error);
      throw error;
    }
  }

  // Delete inactive system states older than 30 days
  static async cleanupOldSystemStates() {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Find all inactive system states older than 30 days
      const deletedCount = await SystemState.destroy({
        where: {
          isActive: false,
          unlockedAt: {
            [Op.lt]: thirtyDaysAgo,
          },
        },
      });

      if (deletedCount > 0) {
        console.log(
          `🗑️ Deleted ${deletedCount} inactive system state(s) older than 30 days`
        );
      } else {
        console.log("✅ No old inactive system states to clean up");
      }
    } catch (error) {
      console.error("❌ Error cleaning up old system states:", error);
      // Don't throw - continue with other cleanup tasks
    }
  }

  // Clear old alerts (alertAt older than 30 days)
  static async cleanupOldAlerts() {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Find all ACs with alerts older than 30 days
      const acsWithOldAlerts = await AC.findAll({
        where: {
          alertAt: {
            [Op.lt]: thirtyDaysAgo,
          },
        },
        attributes: ["id", "name", "serialNumber", "alertAt"],
      });

      if (acsWithOldAlerts.length > 0) {
        // Clear old alerts
        const updatedCount = await AC.update(
          {
            alertAt: null,
            isWorking: true, // Reset to working since alert is old
          },
          {
            where: {
              alertAt: {
                [Op.lt]: thirtyDaysAgo,
              },
            },
          }
        );

        console.log(
          `🗑️ Cleared ${updatedCount[0]} old alert(s) (older than 30 days) from AC devices`
        );
      } else {
        console.log("✅ No old alerts to clean up");
      }
    } catch (error) {
      console.error("❌ Error cleaning up old alerts:", error);
      // Don't throw - continue with other cleanup tasks
    }
  }

  // Safety check: Clean up roomTempHistory that might have grown too large
  // Keep only last 10 entries max (safety limit)
  static async cleanupLargeRoomTempHistory() {
    try {
      // Find all ACs with roomTempHistory
      const acsWithHistory = await AC.findAll({
        where: {
          roomTempHistory: {
            [Op.ne]: null,
          },
        },
        attributes: ["id", "name", "serialNumber", "roomTempHistory"],
      });

      let cleanedCount = 0;

      for (const ac of acsWithHistory) {
        try {
          let history = [];
          if (typeof ac.roomTempHistory === "string") {
            try {
              history = JSON.parse(ac.roomTempHistory);
            } catch (e) {
              history = [];
            }
          } else if (Array.isArray(ac.roomTempHistory)) {
            history = ac.roomTempHistory;
          }

          // If history has more than 10 entries, keep only last 10
          if (history.length > 10) {
            history = history.slice(-10);
            await ac.update({
              roomTempHistory: history,
            });
            cleanedCount++;
            console.log(
              `🧹 Cleaned up roomTempHistory for AC ${ac.name} (${ac.id}) - kept last 10 entries`
            );
          }
        } catch (error) {
          console.error(
            `❌ Error cleaning roomTempHistory for AC ${ac.id}:`,
            error.message
          );
          // Continue with other ACs
        }
      }

      if (cleanedCount > 0) {
        console.log(
          `✅ Cleaned up roomTempHistory for ${cleanedCount} AC device(s)`
        );
      } else {
        console.log("✅ No large roomTempHistory to clean up");
      }
    } catch (error) {
      console.error("❌ Error cleaning up large roomTempHistory:", error);
      // Don't throw - continue with other cleanup tasks
    }
  }

  static stop() {
    console.log("🛑 Stopping cleanup scheduler...");
    // Note: node-cron doesn't have a built-in stop method
    // If needed, we can store the task and stop it
  }
}

module.exports = CleanupScheduler;

