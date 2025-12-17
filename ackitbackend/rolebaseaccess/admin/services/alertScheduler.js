const cron = require("node-cron");
const Admin = require("../../../models/Roleaccess/admin");
const Manager = require("../../../models/Roleaccess/manager");
const Organization = require("../../../models/Organization/organization");
const AlertService = require("./alertService");
const timezoneUtils = require("../../../utils/timezone");

// Prevent blocking - track if scheduler is already running
let isRunning = false;

class AlertScheduler {
  static start() {
    console.log("🕐 Starting alert scheduler...");

    // FEATURE 3: Run every 5 minutes for more frequent room temperature monitoring
    // Cron expression: "*/5 * * * *" means every 5 minutes
    // Timezone: "Asia/Karachi" (Pakistani Standard Time)
    cron.schedule(
      "*/5 * * * *",
      async () => {
        // Prevent blocking - skip if already running
        if (isRunning) {
          console.log("⏳ Alert scheduler: Skipping, already running...");
          return;
        }

        isRunning = true;
        try {
          const now = timezoneUtils.getCurrentUTCTime();
          const pktTimeStr = timezoneUtils.getCurrentPKTTimeString('YYYY-MM-DD HH:mm:ss');
          console.log(`🕐 Running scheduled alert check at UTC: ${now.toISOString()}, PKT: ${pktTimeStr}...`);
          console.log("🔍 Running scheduled alert check...");

          // Get all active admins
          const admins = await Admin.findAll({
            where: { status: "active" },
            attributes: ["id", "name", "email"],
          });

          console.log(
            `📊 Checking alerts for ${admins.length} active admins...`
          );

          // Check alerts for each admin
          for (const admin of admins) {
            try {
              await AlertService.checkAndCreateAlerts(admin.id);
            } catch (error) {
              console.error(
                `❌ Error checking alerts for admin ${admin.id} (${admin.email}):`,
                error.message
              );
              // Continue with other admins even if one fails
            }
          }

          // Get all active managers (unlocked status) and check their assigned organizations
          const managers = await Manager.findAll({
            where: { status: "unlocked" },
            attributes: ["id", "name", "email"],
          });

          console.log(
            `📊 Checking alerts for ${managers.length} active managers...`
          );

          // Check alerts for each manager (using admin services with organization filter)
          for (const manager of managers) {
            try {
              // Get manager's assigned organizations
              const organizations = await Organization.findAll({
                where: { managerId: manager.id },
                attributes: ["id", "adminId"],
              });

              if (organizations.length === 0) {
                continue; // Skip if no organizations assigned
              }

              // Get adminId and organizationIds
              const adminId = organizations[0].adminId;
              const organizationIds = organizations.map((org) => org.id);

              // Use admin alert service with manager's organization filter
              await AlertService.checkAndCreateAlerts(adminId, organizationIds);
            } catch (error) {
              console.error(
                `❌ Error checking alerts for manager ${manager.id} (${manager.email}):`,
                error.message
              );
              // Continue with other managers even if one fails
            }
          }

          console.log("✅ Scheduled alert check completed");
        } catch (error) {
          console.error("❌ Error in scheduled alert check:", error);
        } finally {
          isRunning = false;
        }
      },
      {
        timezone: "Asia/Karachi", // Pakistani Standard Time (PKT - UTC+5)
      }
    );

    console.log(
      "✅ AC Alert scheduler started (runs every 5 minutes in Pakistani time - PKT/UTC+5)"
    );
  }

  static stop() {
    console.log("🛑 Stopping alert scheduler...");
    // Cron jobs don't need explicit stopping, but we can add cleanup if needed
  }
}

module.exports = AlertScheduler;
