const AC = require("../../../models/AC/ac");
const Organization = require("../../../models/Organization/organization");
const ActivityLog = require("../../../models/Activity log/activityLog");
const Services = require("../../../services");
const ESPService = Services.getESPService();
const { Op } = require("sequelize");

class ManagerRoomTemperatureAlertService {
  /**
   * Check room temperature cooling pattern for manager's assigned ACs
   * Logic:
   * - Hour 0: Request room temp, save to history (no alert)
   * - Hour 1: Request room temp, check if changed/increased, save (no alert)
   * - Hour 2: Request room temp, check if decreased. If NO decrease, create alert
   */
  static async checkAndRequestRoomTemperature(managerId) {
    try {
      console.log(
        `🌡️ [ROOM_TEMP_ALERT] Checking room temperature for manager ${managerId}...`
      );

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
              "key",
              "temperature",
              "isOn",
              "roomTemperature",
              "roomTempHistory",
              "lastRoomTempCheck",
              "lastRoomTempUpdate",
              "isWorking",
              "alertAt",
              "organizationId",
            ],
          },
        ],
      });

      const alerts = [];
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000); // Changed from 1 hour to 5 minutes

      for (const org of organizations) {
        for (const ac of org.acs || []) {
          // Only check ACs that are ON
          if (!ac.isOn) {
            console.log(
              `⏸️ [ROOM_TEMP_ALERT] AC ${ac.name} (${ac.id}) is OFF, skipping`
            );
            continue;
          }

          // Check if device is connected
          if (!ac.key) {
            console.log(
              `⚠️ [ROOM_TEMP_ALERT] AC ${ac.name} (${ac.id}) has no key, skipping`
            );
            continue;
          }

          const isConnected = ESPService.isDeviceConnected(ac.key);
          if (!isConnected) {
            console.log(
              `⚠️ [ROOM_TEMP_ALERT] AC ${ac.name} (${ac.id}) is not connected, skipping`
            );
            continue;
          }

          // Parse room temperature history
          let history = [];
          if (ac.roomTempHistory) {
            if (typeof ac.roomTempHistory === "string") {
              try {
                history = JSON.parse(ac.roomTempHistory);
              } catch (e) {
                history = [];
              }
            } else if (Array.isArray(ac.roomTempHistory)) {
              history = ac.roomTempHistory;
            }
          }

          // Check if we need to request room temperature (every 5 minutes)
          let shouldRequest = false;
          if (!ac.lastRoomTempCheck) {
            // First time - need to request
            shouldRequest = true;
            console.log(
              `🆕 [ROOM_TEMP_ALERT] First room temp check for AC ${ac.name} (${ac.id})`
            );
          } else {
            const lastCheck = new Date(ac.lastRoomTempCheck);
            if (lastCheck < fiveMinutesAgo) {
              shouldRequest = true;
              console.log(
                `⏰ [ROOM_TEMP_ALERT] It's been over 5 minutes since last check for AC ${ac.name} (${ac.id})`
              );
            }
          }

          if (shouldRequest) {
            // Request room temperature from ESP
            console.log(
              `📤 [ROOM_TEMP_ALERT] Requesting room temperature from ESP for AC ${ac.name} (${ac.id})`
            );
            const requestResult =
              await ESPService.requestRoomTemperature(ac.key);

            if (requestResult.success) {
              // Update last check time
              await ac.update({
                lastRoomTempCheck: now,
              });

              console.log(
                `✅ [ROOM_TEMP_ALERT] Room temperature request sent for AC ${ac.name} (${ac.id})`
              );
            } else {
              console.log(
                `❌ [ROOM_TEMP_ALERT] Failed to request room temperature for AC ${ac.name} (${ac.id}): ${requestResult.message}`
              );
            }
          }

          // Process cooling pattern if we have room temperature data
          if (ac.roomTemperature !== null && ac.roomTemperature !== undefined) {
            // Check if we need to add to history and evaluate cooling pattern
            const shouldEvaluate = await this.evaluateCoolingPattern(
              ac,
              history,
              managerId,
              org
            );

            if (shouldEvaluate.alert) {
              alerts.push(shouldEvaluate.alertData);
            }
          }
        }
      }

      console.log(
        `✅ [ROOM_TEMP_ALERT] Manager room temperature check completed. Found ${alerts.length} alerts.`
      );
      return alerts;
    } catch (error) {
      console.error(
        "❌ Error checking manager room temperature alerts:",
        error
      );
      throw error;
    }
  }

  /**
   * Evaluate cooling pattern based on 3-hour history
   * Returns: { alert: boolean, alertData: object }
   */
  static async evaluateCoolingPattern(ac, history, managerId, org) {
    const now = new Date();
    const currentTemp = ac.roomTemperature;

    // Sort history by timestamp (oldest first)
    history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Check if current temperature is already in history (within last 5 minutes)
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const recentEntry = history.find(
      (entry) => new Date(entry.timestamp) > fiveMinutesAgo
    );

    if (!recentEntry || Math.abs(recentEntry.temp - currentTemp) > 0.1) {
      // Add current temperature to history
      history.push({
        temp: currentTemp,
        timestamp: now.toISOString(),
      });

      // Keep only last 4 entries (for 4-hour tracking)
      if (history.length > 4) {
        history = history.slice(-4);
      }

      // Update history in database
      await ac.update({
        roomTempHistory: history,
      });
    }

    // Now evaluate cooling pattern
    // We need at least 3 entries (0h, 1h, 2h ago) to check for cooling
    if (history.length < 3) {
      console.log(
        `📊 [ROOM_TEMP_ALERT] AC ${ac.name} (${ac.id}) has only ${history.length} entries, need at least 3 for cooling check`
      );
      return { alert: false };
    }

    // Get the last 3 entries
    const lastThree = history.slice(-3);
    const temp0h = lastThree[0].temp; // Hour 0 (oldest)
    const temp1h = lastThree[1].temp; // Hour 1
    const temp2h = lastThree[2].temp; // Hour 2 (most recent)

    console.log(
      `📊 [ROOM_TEMP_ALERT] AC ${ac.name} (${ac.id}) cooling pattern:`
    );
    console.log(`   └─ Hour 0: ${temp0h}°C`);
    console.log(`   └─ Hour 1: ${temp1h}°C`);
    console.log(`   └─ Hour 2: ${temp2h}°C`);

    // Check if temperature decreased from hour 1 to hour 2
    const tempDecreased = temp2h < temp1h;
    const tempDecreaseAmount = temp1h - temp2h;

    // If temperature did NOT decrease (or increased), create alert
    if (!tempDecreased) {
      console.log(
        `⚠️ [ROOM_TEMP_ALERT] AC ${ac.name} (${ac.id}) - NO TEMPERATURE DECREASE detected!`
      );
      console.log(
        `   └─ Hour 1: ${temp1h}°C → Hour 2: ${temp2h}°C (Change: ${tempDecreaseAmount.toFixed(
          1
        )}°C)`
      );

      // Check if alert was already created in last 2 hours
      let shouldCreateAlert = true;
      if (ac.alertAt) {
        const lastAlert = new Date(ac.alertAt);
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        if (lastAlert > twoHoursAgo) {
          shouldCreateAlert = false;
          console.log(
            `⏸️ [ROOM_TEMP_ALERT] Alert already created recently for AC ${ac.name} (${ac.id})`
          );
        }
      }

      if (shouldCreateAlert) {
        // Create alert
        await ac.update({
          isWorking: false,
          alertAt: now,
        });

        // Get manager's admin ID for logging
        const Manager = require("../../../models/Roleaccess/manager");
        const manager = await Manager.findByPk(managerId);

        // Create activity log entry
        await ActivityLog.create({
          adminId: manager ? manager.adminId : null,
          action: "MANAGER_AC_ROOM_TEMP_ALERT",
          targetType: "ac",
          targetId: ac.id,
          details: {
            acName: ac.name,
            organizationName: org.name,
            managerId: managerId,
            issue: "Room temperature not decreasing after 3 hours",
            roomTempHistory: {
              hour0: temp0h,
              hour1: temp1h,
              hour2: temp2h,
            },
            temperature: ac.temperature,
            roomTemperature: ac.roomTemperature,
            isOn: ac.isOn,
            serialNumber: ac.serialNumber,
          },
        });

        const alertData = {
          acId: ac.id,
          acName: ac.name,
          brand: ac.brand,
          model: ac.model,
          serialNumber: ac.serialNumber,
          organizationId: org.id,
          organizationName: org.name,
          issue: "Room temperature not decreasing after 3 hours",
          roomTempHistory: {
            hour0: temp0h,
            hour1: temp1h,
            hour2: temp2h,
          },
          temperature: ac.temperature,
          roomTemperature: ac.roomTemperature,
          isOn: ac.isOn,
          alertAt: now,
          severity: "high",
        };

        console.log(
          `⚠️ [ROOM_TEMP_ALERT] Manager Alert created for AC ${ac.name} (${ac.id}): Room temperature not cooling`
        );

        return { alert: true, alertData };
      }
    } else {
      console.log(
        `✅ [ROOM_TEMP_ALERT] AC ${ac.name} (${
          ac.id
        }) - Temperature DECREASED by ${tempDecreaseAmount.toFixed(
          1
        )}°C (cooling working)`
      );

      // If temperature decreased, mark as working if it was previously not working
      if (ac.isWorking === false) {
        // Check if this is a room temp alert (not other issue)
        // Only clear if alert was recent (within last 3 hours)
        if (ac.alertAt) {
          const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
          if (new Date(ac.alertAt) > threeHoursAgo) {
            // Might be room temp alert, clear it
            await ac.update({
              isWorking: true,
              alertAt: null,
            });
            console.log(
              `✅ [ROOM_TEMP_ALERT] AC ${ac.name} (${ac.id}) - Marked as working (cooling detected)`
            );
          }
        }
      }
    }

    return { alert: false };
  }

  /**
   * Get all active room temperature alerts for a manager (only for their assigned organizations)
   */
  static async getActiveRoomTempAlerts(managerId) {
    try {
      const organizations = await Organization.findAll({
        where: { managerId: managerId },
        include: [
          {
            model: AC,
            as: "acs",
            where: {
              [Op.and]: [
                { isOn: true },
                { roomTemperature: { [Op.ne]: null } },
                { isWorking: false },
                { alertAt: { [Op.ne]: null } },
              ],
            },
            required: false,
            attributes: [
              "id",
              "name",
              "brand",
              "model",
              "serialNumber",
              "temperature",
              "roomTemperature",
              "roomTempHistory",
              "isOn",
              "isWorking",
              "alertAt",
            ],
          },
        ],
      });

      const alerts = [];
      for (const org of organizations) {
        for (const ac of org.acs || []) {
          // Check if alert is related to room temperature
          if (ac.roomTemperature !== null && ac.roomTempHistory) {
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

            if (history.length >= 3) {
              const lastThree = history.slice(-3);
              alerts.push({
                acId: ac.id,
                acName: ac.name,
                brand: ac.brand,
                model: ac.model,
                serialNumber: ac.serialNumber,
                organizationId: org.id,
                organizationName: org.name,
                issue: "Room temperature not decreasing after 3 hours",
                roomTempHistory: {
                  hour0: lastThree[0].temp,
                  hour1: lastThree[1].temp,
                  hour2: lastThree[2].temp,
                },
                temperature: ac.temperature,
                roomTemperature: ac.roomTemperature,
                isOn: ac.isOn,
                isWorking: ac.isWorking,
                alertAt: ac.alertAt,
                severity: "high",
              });
            }
          }
        }
      }

      return alerts;
    } catch (error) {
      console.error(
        "❌ Error getting manager active room temperature alerts:",
        error
      );
      throw error;
    }
  }
}

module.exports = ManagerRoomTemperatureAlertService;
