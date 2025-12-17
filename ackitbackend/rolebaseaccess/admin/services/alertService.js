const AC = require("../../../models/AC/ac");
const Organization = require("../../../models/Organization/organization");
const ActivityLog = require("../../../models/Activity log/activityLog");
const Services = require("../../../services");
const ESPService = Services.getESPService();
const { Op } = require("sequelize");

class AlertService {
  /**
   * Check AC room temperature using 5-minute pattern
   * Logic:
   * - Every 5 minutes: Check room temp from database (updated via WebSocket from ESP)
   * - Save to history
   * - If AC is ON and temperature not decreasing → Alert
   * @param {number} adminId - Admin ID (required)
   * @param {number[]} organizationIds - Optional: Specific organization IDs to check (for managers)
   */
  static async checkAndCreateAlerts(adminId, organizationIds = null) {
    try {
      console.log(
        `🔍 [AC_ALERT] Checking AC room temperature alerts for admin ${adminId}...`
      );

      // Build where clause - either by adminId or specific organizationIds
      const whereClause = organizationIds
        ? { id: { [Op.in]: organizationIds }, adminId: adminId }
        : { adminId: adminId };

      // Get all venues for this admin (or specific ones if provided)
      // If organizationIds provided, get venues under those organizations
      const Venue = require("../../../models/Venue/venue");
      let venues;

      if (organizationIds) {
        // Get venues under specific organizations
        venues = await Venue.findAll({
          where: {
            organizationId: { [Op.in]: organizationIds },
            adminId: adminId,
          },
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
                "venueId",
                "startupStartTime",
                "lastPowerChangeAt",
              ],
            },
          ],
        });
      } else {
        // Get all venues for admin
        venues = await Venue.findAll({
          where: { adminId: adminId },
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
                "venueId",
                "startupStartTime",
                "lastPowerChangeAt",
              ],
            },
          ],
        });
      }

      const alerts = [];
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      for (const venue of venues) {
        for (const ac of venue.acs || []) {
          // Only check ACs that are ON
          if (!ac.isOn) {
            console.log(
              `⏸️ [AC_ALERT] AC ${ac.name} (${ac.id}) is OFF, skipping`
            );
            continue;
          }

          // Check if device has room temperature data (from WebSocket ESP)
          // roomTemperature is updated in real-time via WebSocket from ESP
          if (ac.roomTemperature === null || ac.roomTemperature === undefined) {
            console.log(
              `⏸️ [AC_ALERT] AC ${ac.name} (${ac.id}) has no room temperature data yet, skipping`
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

          // Get AC startup time (when AC turned ON) for history cleanup
          let acStartTime = null;
          if (ac.startupStartTime) {
            acStartTime = new Date(ac.startupStartTime);
          } else if (ac.lastPowerChangeAt && ac.isOn) {
            acStartTime = new Date(ac.lastPowerChangeAt);
          }

          // Clear history if it's from before AC startup (AC was turned off and back on)
          if (history.length > 0 && acStartTime) {
            const firstHistoryEntry = history[0];
            if (firstHistoryEntry.timestamp) {
              const firstHistoryTime = new Date(firstHistoryEntry.timestamp);
              if (firstHistoryTime < acStartTime) {
                console.log(
                  `🔄 [AC_ALERT] Clearing old room temp history for AC ${ac.name} (${ac.id}) - AC was restarted`
                );
                history = [];
              }
            }
          }

          // Check if we need to add current temperature to history
          // Add if: no recent entry (within 5 minutes) or temperature changed significantly
          const recentEntry = history.find((entry) => {
            if (!entry.timestamp) return false;
            const entryTime = new Date(entry.timestamp);
            return entryTime > fiveMinutesAgo;
          });

          const shouldAddToHistory =
            !recentEntry ||
            (recentEntry &&
              Math.abs(recentEntry.temp - ac.roomTemperature) > 0.1);

          if (shouldAddToHistory) {
            // Add current temperature to history
            history.push({
              temp: ac.roomTemperature,
              timestamp: now.toISOString(),
            });

            // Keep only last 3 entries (for comparison: previous, current)
            if (history.length > 3) {
              history = history.slice(-3);
            }

            // Update history in database
            await ac.update({
              roomTempHistory: history,
              lastRoomTempCheck: now,
            });

            console.log(
              `📊 [AC_ALERT] Added room temp ${ac.roomTemperature}°C to history for AC ${ac.name} (${ac.id})`
            );
          }

          // Evaluate cooling pattern if we have at least 2 readings (previous and current)
          if (history.length >= 2) {
            const shouldEvaluate = await this.evaluateCoolingPattern(
              ac,
              history,
              adminId,
              venue
            );

            if (shouldEvaluate.alert) {
              alerts.push(shouldEvaluate.alertData);
            }
          } else {
            console.log(
              `⏳ [AC_ALERT] AC ${ac.name} (${ac.id}) needs at least 2 readings for cooling check. Current: ${history.length}`
            );
          }
        }
      }

      // REMOVED: Venue-level alerts
      // Only device-level alerts are returned
      // Device-level alerts are shown on Venue and Organization cards in frontend

      console.log(
        `✅ [AC_ALERT] Alert check completed. Found ${alerts.length} device-level alerts.`
      );
      return alerts;
    } catch (error) {
      console.error("❌ Error checking AC alerts:", error);
      throw error;
    }
  }

  /**
   * Evaluate cooling pattern based on 5-minute pattern
   * Compares previous and current room temperature readings (from WebSocket ESP)
   * If temperature not decreasing (current >= previous) → Alert
   * Returns: { alert: boolean, alertData: object }
   */
  static async evaluateCoolingPattern(ac, history, adminId, venue) {
    const now = new Date();
    const currentTemp = ac.roomTemperature;

    // Sort history by timestamp (oldest first)
    history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // We need at least 2 readings (previous and current) to check for cooling
    if (history.length < 2) {
      console.log(
        `📊 [AC_ALERT] AC ${ac.name} (${ac.id}) has only ${history.length} entries, need at least 2 readings for cooling check`
      );
      return { alert: false };
    }

    // Get the last 2 entries (previous and current)
    const lastTwo = history.slice(-2);
    const previousTemp = lastTwo[0].temp; // Previous reading (5 minutes ago)
    const currentTempReading = lastTwo[1].temp; // Current reading (now)

    // Check time difference between readings (should be around 5 minutes)
    const previousTime = new Date(lastTwo[0].timestamp);
    const currentTime = new Date(lastTwo[1].timestamp);
    const minutesSincePrevious = (currentTime - previousTime) / (1000 * 60);

    console.log(
      `📊 [AC_ALERT] AC ${ac.name} (${ac.id}) cooling check (5-minute pattern):`
    );
    console.log(
      `   └─ Previous (${minutesSincePrevious.toFixed(
        1
      )} min ago): ${previousTemp}°C`
    );
    console.log(`   └─ Current (now): ${currentTempReading}°C`);
    console.log(
      `   └─ Change: ${(currentTempReading - previousTemp).toFixed(1)}°C`
    );

    // Check if temperature is not decreasing (current >= previous)
    // AC is ON, so temperature should decrease
    const tempNotDecreasing = currentTempReading >= previousTemp;
    const tempChange = currentTempReading - previousTemp;

    // Create alert if temperature is not decreasing (or increasing)
    if (tempNotDecreasing && ac.isOn) {
      const reason = `Room temperature not decreasing (${previousTemp}°C → ${currentTempReading}°C in ${minutesSincePrevious.toFixed(
        1
      )} minutes)`;

      console.log(
        `⚠️ [AC_ALERT] AC ${ac.name} (${ac.id}) - ALERT TRIGGERED: ${reason}`
      );

      // Check if alert was already created in last 5 minutes (avoid duplicate alerts)
      let shouldCreateAlert = true;
      if (ac.alertAt) {
        const lastAlert = new Date(ac.alertAt);
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        if (lastAlert > fiveMinutesAgo) {
          shouldCreateAlert = false;
          console.log(
            `⏸️ [AC_ALERT] Alert already created recently for AC ${ac.name} (${ac.id})`
          );
        }
      }

      if (shouldCreateAlert) {
        // Create alert
        await ac.update({
          isWorking: false,
          alertAt: now,
        });

        // Create activity log
        await ActivityLog.create({
          adminId: adminId,
          action: "AC_ROOM_TEMP_ALERT",
          targetType: "ac",
          targetId: ac.id,
          details: {
            acName: ac.name,
            venueName: venue.name,
            venueId: venue.id,
            organizationId: venue.organizationId,
            organizationName: venue.organization?.name || null,
            issue: `Room temperature not decreasing (${previousTemp}°C → ${currentTempReading}°C)`,
            roomTempHistory: {
              previous: previousTemp,
              current: currentTempReading,
              change: tempChange,
              minutesSincePrevious: minutesSincePrevious.toFixed(1),
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
          venueId: venue.id,
          venueName: venue.name,
          organizationId: venue.organizationId,
          organizationName: venue.organization?.name || null,
          issue: `Room temperature not decreasing (${previousTemp}°C → ${currentTempReading}°C in ${minutesSincePrevious.toFixed(
            1
          )} min)`,
          roomTempHistory: {
            previous: previousTemp,
            current: currentTempReading,
            change: tempChange,
            minutesSincePrevious: minutesSincePrevious.toFixed(1),
          },
          temperature: ac.temperature,
          roomTemperature: ac.roomTemperature,
          isOn: ac.isOn,
          alertAt: now,
          severity: "high",
        };

        console.log(
          `⚠️ [AC_ALERT] Alert created for AC ${ac.name} (${ac.id}): Room temperature not cooling`
        );

        return { alert: true, alertData };
      }
    } else {
      const tempDecreaseAmount = previousTemp - currentTempReading;
      if (tempDecreaseAmount > 0) {
        console.log(
          `✅ [AC_ALERT] AC ${ac.name} (${
            ac.id
          }) - Cooling working properly (Decreased by ${tempDecreaseAmount.toFixed(
            1
          )}°C in ${minutesSincePrevious.toFixed(1)} min)`
        );
      } else {
        console.log(
          `✅ [AC_ALERT] AC ${ac.name} (${ac.id}) - Temperature stable (${currentTempReading}°C)`
        );
      }

      // If temperature decreased, mark as working if it was previously not working
      if (ac.isWorking === false && tempDecreaseAmount > 0) {
        // Check if alert was recent (within last 10 minutes)
        if (ac.alertAt) {
          const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
          if (new Date(ac.alertAt) > tenMinutesAgo) {
            // Clear alert if cooling is working
            await ac.update({
              isWorking: true,
              alertAt: null,
            });
            console.log(
              `✅ [AC_ALERT] AC ${ac.name} (${ac.id}) - Marked as working (cooling detected)`
            );
          }
        }
      }
    }

    return { alert: false };
  }

  /**
   * Get all active AC room temperature alerts
   * @param {number} adminId - Admin ID (required)
   * @param {number[]} organizationIds - Optional: Specific organization IDs to filter (for managers)
   */
  static async getActiveAlerts(adminId, organizationIds = null) {
    try {
      const Venue = require("../../../models/Venue/venue");

      // Get venues (which have ACs now, not organizations)
      // Get ALL ACs that are ON and have issues (isWorking: false OR alertAt set)
      let venues;

      if (organizationIds) {
        // Get venues under specific organizations (for managers)
        venues = await Venue.findAll({
          where: {
            organizationId: { [Op.in]: organizationIds },
            adminId: adminId,
          },
          include: [
            {
              model: AC,
              as: "acs",
              where: {
                [Op.and]: [
                  { isOn: true },
                  {
                    [Op.or]: [
                      { isWorking: false }, // Only alert when explicitly marked as not working
                      { alertAt: { [Op.ne]: null } }, // Or when alertAt is set
                    ],
                  },
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
                "key",
                "startupStartTime",
                "lastPowerChangeAt",
              ],
            },
          ],
        });
      } else {
        // Get all venues for admin
        venues = await Venue.findAll({
          where: { adminId: adminId },
          include: [
            {
              model: AC,
              as: "acs",
              where: {
                [Op.and]: [
                  { isOn: true },
                  {
                    [Op.or]: [
                      { isWorking: false }, // Only alert when explicitly marked as not working
                      { alertAt: { [Op.ne]: null } }, // Or when alertAt is set
                    ],
                  },
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
                "key",
                "startupStartTime",
                "lastPowerChangeAt",
              ],
            },
          ],
        });
      }

      const alerts = [];
      const now = new Date();

      for (const venue of venues) {
        for (const ac of venue.acs || []) {
          // Only check ACs that are ON
          if (!ac.isOn) continue;

          // Check if device is not working (basic alert)
          // Only alert when isWorking is explicitly false or alertAt is set
          // isWorking: null means "not checked yet" - don't alert for that
          if (ac.isWorking === false || ac.alertAt) {
            // Get AC startup time for room temperature check
            let acStartTime = null;
            if (ac.startupStartTime) {
              acStartTime = new Date(ac.startupStartTime);
            } else if (ac.lastPowerChangeAt && ac.isOn) {
              acStartTime = new Date(ac.lastPowerChangeAt);
            }

            // If device has room temperature data, check cooling pattern (5-minute pattern)
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

              // Check if we have at least 2 readings (previous and current) for 5-minute pattern
              if (history.length >= 2) {
                const lastTwo = history.slice(-2);
                const previousTemp = lastTwo[0].temp;
                const currentTempReading = lastTwo[1].temp;
                const previousTime = new Date(lastTwo[0].timestamp);
                const currentTime = new Date(lastTwo[1].timestamp);
                const minutesSincePrevious =
                  (currentTime - previousTime) / (1000 * 60);

                // Check if temperature is not decreasing (current >= previous)
                const tempNotDecreasing = currentTempReading >= previousTemp;

                // Create alert for room temperature issue (5-minute pattern)
                if (tempNotDecreasing && ac.isOn) {
                  alerts.push({
                    acId: ac.id,
                    acName: ac.name,
                    brand: ac.brand,
                    model: ac.model,
                    serialNumber: ac.serialNumber,
                    venueId: venue.id,
                    venueName: venue.name,
                    organizationId: venue.organizationId || null,
                    organizationName: venue.organization?.name || null,
                    issue: `Room temperature not decreasing (${previousTemp}°C → ${currentTempReading}°C in ${minutesSincePrevious.toFixed(
                      1
                    )} min)`,
                    roomTempHistory: {
                      previous: previousTemp,
                      current: currentTempReading,
                      change: currentTempReading - previousTemp,
                      minutesSincePrevious: minutesSincePrevious.toFixed(1),
                    },
                    temperature: ac.temperature,
                    roomTemperature: ac.roomTemperature,
                    isOn: ac.isOn,
                    isWorking: ac.isWorking,
                    alertAt: ac.alertAt,
                    severity: "high",
                  });
                  continue; // Skip basic alert if we have room temp alert
                }
              }
            }

            // Basic alert: Device is not working properly
            alerts.push({
              acId: ac.id,
              acName: ac.name,
              brand: ac.brand,
              model: ac.model,
              serialNumber: ac.serialNumber,
              venueId: venue.id,
              venueName: venue.name,
              organizationId: venue.organizationId || null,
              organizationName: venue.organization?.name || null,
              issue:
                ac.isWorking === false
                  ? "Device is not working properly"
                  : "Device has an active alert",
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

      // REMOVED: Organization-level and Venue-level alerts
      // Only device-level alerts are returned (alerts array already contains device-level alerts from venues loop above)
      // Device-level alerts are shown on Venue and Organization cards in frontend

      return alerts;
    } catch (error) {
      console.error("❌ Error getting active AC alerts:", error);
      throw error;
    }
  }
}

module.exports = AlertService;
