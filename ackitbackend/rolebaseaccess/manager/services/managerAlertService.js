const AC = require("../../../models/AC/ac");
const Organization = require("../../../models/Organization/organization");
const ActivityLog = require("../../../models/Activity log/activityLog");
const { Op } = require("sequelize");

class ManagerAlertService {
  /**
   * Check all AC devices in manager's assigned organizations and create alerts for issues
   * NOTE: AC temperature alerts (temperature_out_of_range, temperature_stuck, device_not_working) have been removed.
   * Only room temperature alerts are used now (handled by AlertService).
   */
  static async checkAndCreateAlerts(managerId) {
    try {
      console.log(`🔍 Checking alerts for manager ${managerId}...`);

      // Get all organizations assigned to this manager
      const organizations = await Organization.findAll({
        where: { managerId: managerId },
        include: [
          {
            model: AC,
            as: "acs",
            attributes: [
              "id",
              "name",
              "brand",
              "model",
              "serialNumber",
              "temperature",
              "isOn",
              "isWorking",
              "alertAt",
              "lastTemperatureChange",
              "lastPowerChangeAt",
              "organizationId",
            ],
          },
        ],
      });

      const alerts = [];
      const now = new Date();
      const twentyMinutesAgo = new Date(now.getTime() - 20 * 60 * 1000);

      for (const org of organizations) {
        for (const ac of org.acs || []) {
          const issues = [];
          let shouldAlert = false;

          // All AC temperature alert checks have been removed
          // (temperature_out_of_range, temperature_stuck, device_not_working)
          // Only room temperature alerts are used now

          // Create/update alert if issues found
          if (shouldAlert && issues.length > 0) {
            // Check if alert was already created in last 20 minutes
            let shouldCreateAlert = true;
            if (ac.alertAt) {
              const lastAlert = new Date(ac.alertAt);
              if (lastAlert > twentyMinutesAgo) {
                shouldCreateAlert = false; // Already alerted recently
              }
            }

            if (shouldCreateAlert) {
              // Update AC alert timestamp
              await ac.update({
                isWorking: false, // Mark as not working if there are issues
                alertAt: now,
              });

              // Get manager's admin ID for logging
              const Manager = require("../../../models/Roleaccess/manager");
              const manager = await Manager.findByPk(managerId);

              // Create activity log entry
              await ActivityLog.create({
                adminId: manager ? manager.adminId : null,
                action: "MANAGER_AC_ALERT",
                targetType: "ac",
                targetId: ac.id,
                details: {
                  acName: ac.name,
                  organizationName: org.name,
                  managerId: managerId,
                  issues: issues,
                  temperature: ac.temperature,
                  isOn: ac.isOn,
                  serialNumber: ac.serialNumber,
                },
              });

              alerts.push({
                acId: ac.id,
                acName: ac.name,
                brand: ac.brand,
                model: ac.model,
                serialNumber: ac.serialNumber,
                organizationId: org.id,
                organizationName: org.name,
                temperature: ac.temperature,
                isOn: ac.isOn,
                issues: issues,
                alertAt: now,
              });

              console.log(
                `⚠️ Manager Alert created for AC ${ac.name} (${ac.id}):`,
                issues
              );
            }
          } else if (ac.isWorking === false && issues.length === 0) {
            // No issues found, mark as working if it was previously marked as not working
            await ac.update({
              isWorking: true,
              alertAt: null,
            });
          }
        }
      }

      console.log(`✅ Manager alert check completed. Found ${alerts.length} alerts.`);
      return alerts;
    } catch (error) {
      console.error("❌ Error checking manager alerts:", error);
      throw error;
    }
  }

  /**
   * Get all active alerts for a manager (only for their assigned organizations)
   */
  static async getActiveAlerts(managerId) {
    try {
      const organizations = await Organization.findAll({
        where: { managerId: managerId },
        include: [
          {
            model: AC,
            as: "acs",
            where: {
              [Op.or]: [{ isWorking: false }, { alertAt: { [Op.ne]: null } }],
            },
            required: false,
            attributes: [
              "id",
              "name",
              "brand",
              "model",
              "serialNumber",
              "temperature",
              "isOn",
              "isWorking",
              "alertAt",
              "lastTemperatureChange",
              "lastPowerChangeAt",
            ],
          },
        ],
      });

      const alerts = [];
      for (const org of organizations) {
        for (const ac of org.acs || []) {
          if (ac.alertAt || ac.isWorking === false) {
            // All AC temperature alert checks have been removed
            // (temperature_out_of_range, temperature_stuck, device_not_working)
            // Only room temperature alerts are used now
            const issues = [];

            if (issues.length > 0) {
              alerts.push({
                acId: ac.id,
                acName: ac.name,
                brand: ac.brand,
                model: ac.model,
                serialNumber: ac.serialNumber,
                organizationId: org.id,
                organizationName: org.name,
                temperature: ac.temperature,
                isOn: ac.isOn,
                isWorking: ac.isWorking,
                issues: issues,
                alertAt: ac.alertAt,
                lastTemperatureChange: ac.lastTemperatureChange,
                lastPowerChangeAt: ac.lastPowerChangeAt,
              });
            }
          }
        }
      }

      return alerts;
    } catch (error) {
      console.error("❌ Error getting manager active alerts:", error);
      throw error;
    }
  }
}

module.exports = ManagerAlertService;

