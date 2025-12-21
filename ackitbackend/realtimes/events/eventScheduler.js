const cron = require("node-cron");
const Event = require("../../models/Event/event");
const AC = require("../../models/AC/ac");
const Services = require("../../services");
const ESPService = Services.getESPService();
const { Op, Sequelize } = require("sequelize");
const EventService = require("../../rolebaseaccess/admin/services/eventService");
const ManagerEventService = require("../../rolebaseaccess/manager/services/managerEventService");
const timezoneUtils = require("../../utils/timezone");

// Prevent blocking - track if scheduler is already running
let isRunning = false;

class EventScheduler {
  static start() {
    console.log("📅 Starting event scheduler (Pakistan/Karachi timezone)...");

    // Run every second for exact timing (no delay in event start/end)
    // Using Pakistan/Karachi timezone for scheduling
    cron.schedule(
      "* * * * * *",
      async () => {
        // Prevent blocking - skip if already running
        if (isRunning) {
          return; // Skip silently if already running
        }

        isRunning = true;
        try {
          const now = timezoneUtils.getCurrentUTCTime();

          // Check events every second for exact timing
          await this.checkAndStartEvents();
          await this.checkAndEndEvents();

          // Check for events to auto-delete (waiting, started, complete, completed) every second
          await this.checkAndAutoDeleteEvents();

          // Check recurring instances every minute (less frequent, no need for exact timing)
          const seconds = now.getSeconds();
          if (seconds === 0) {
            const pktTimeStr = timezoneUtils.getCurrentPKTTimeString(
              "YYYY-MM-DD HH:mm:ss"
            );
            console.log(
              `⏰ Running scheduled event check at UTC: ${now.toISOString()}, PKT: ${pktTimeStr}...`
            );
            await this.checkAndCreateRecurringInstances();
            // Also cleanup any remaining completed events (safety check)
            await this.cleanupCompletedEvents();
          }
        } catch (error) {
          console.error("❌ Error in scheduled event check:", error);
        } finally {
          isRunning = false;
        }
      },
      {
        timezone: "Asia/Karachi", // Cron runs based on Pakistan/Karachi time
      }
    );

    console.log(
      "✅ Event scheduler started (runs every second for exact timing, uses Pakistan/Karachi time)"
    );
  }

  // Check for recurring events and create daily instances
  static async checkAndCreateRecurringInstances() {
    try {
      const now = timezoneUtils.getCurrentUTCTime();
      const pktNow = timezoneUtils.getCurrentPakistanTime();
      // Use moment object directly for PKT date operations
      const todayMoment = pktNow.clone().startOf("day");
      const today = todayMoment.toDate(); // Convert to Date for comparisons
      const todayDayOfWeek = todayMoment.day(); // 0=Sunday, 1=Monday, etc.
      const todayDateStr = todayMoment.format("YYYY-MM-DD"); // YYYY-MM-DD

      // Find all active recurring event templates
      const recurringTemplates = await Event.findAll({
        where: {
          isRecurring: true,
          isDisabled: false,
          parentRecurringEventId: null, // Only parent templates
          [Op.or]: [{ status: "scheduled" }, { status: "active" }],
        },
      });

      for (const template of recurringTemplates) {
        try {
          // Check if today is in the date range
          const startDate = new Date(template.recurringStartDate);
          const endDate = new Date(template.recurringEndDate);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);

          if (today < startDate || today > endDate) {
            continue; // Skip if today is outside date range
          }

          // Check if today is one of the selected days
          if (
            !template.daysOfWeek ||
            !template.daysOfWeek.includes(todayDayOfWeek)
          ) {
            continue; // Skip if today is not a selected day
          }

          // Check if instance already exists for today
          const existingInstance = await Event.findOne({
            where: {
              parentRecurringEventId: template.id,
              startTime: {
                [Op.gte]: new Date(today.toISOString()),
                [Op.lt]: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Next day
              },
            },
          });

          if (existingInstance) {
            continue; // Instance already exists for today
          }

          // Create instance for today using moment-timezone for proper PKT to UTC conversion
          const pktStartDateTime = `${todayDateStr} ${template.timeStart}`;
          const pktEndDateTime = `${todayDateStr} ${template.timeEnd}`;

          // Convert PKT to UTC using timezone utils
          const utcStartTime = timezoneUtils.pktToUTC(
            pktStartDateTime,
            "YYYY-MM-DD HH:mm:ss"
          );
          const utcEndTime = timezoneUtils.pktToUTC(
            pktEndDateTime,
            "YYYY-MM-DD HH:mm:ss"
          );

          // Validate dates
          if (
            !utcStartTime ||
            !utcEndTime ||
            isNaN(utcStartTime.getTime()) ||
            isNaN(utcEndTime.getTime())
          ) {
            console.error(
              `❌ Invalid date/time for template ${template.id}: startTime=${pktStartDateTime}, endTime=${pktEndDateTime}`
            );
            continue;
          }

          // Create the instance
          const instance = await Event.create({
            name: template.name,
            eventType: template.eventType,
            deviceId: template.deviceId,
            organizationId: template.organizationId,
            createdBy: template.createdBy,
            adminId: template.adminId,
            managerId: template.managerId,
            startTime: utcStartTime,
            endTime: utcEndTime,
            originalEndTime: utcEndTime,
            temperature: template.temperature,
            powerOn: template.powerOn,
            status: "scheduled",
            parentAdminEventId: template.parentAdminEventId,
            parentRecurringEventId: template.id, // Link to parent template
            isRecurring: false, // Instance is not recurring
            isDisabled: false,
          });

          console.log(
            `✅ Created recurring event instance: ${instance.name} (Template ID: ${template.id}, Instance ID: ${instance.id}) for ${todayDateStr}`
          );
        } catch (error) {
          console.error(
            `❌ Error creating recurring instance for template ${template.id}:`,
            error.message
          );
        }
      }
    } catch (error) {
      console.error("❌ Error checking recurring events:", error);
    }
  }

  // Check for events that should start based on startTime
  static async checkAndStartEvents() {
    try {
      // Get current UTC time (events are stored in UTC in database)
      const now = timezoneUtils.getCurrentUTCTime();
      const nowISO = now.toISOString();
      const pktTime = timezoneUtils.getCurrentPKTTimeString(
        "YYYY-MM-DD HH:mm:ss"
      );

      // Find scheduled events that should start now (skip disabled events)
      // CRITICAL: Events are stored in UTC, but Sequelize timezone setting converts Date to PKT
      // We must use Sequelize.literal to force UTC comparison
      // Use a 5-second window to catch events that should start exactly now
      // This prevents events from starting too early while still catching them on time
      const fiveSecondsAgo = new Date(now.getTime() - 5000);
      const nowUTCString = now.toISOString();
      const fiveSecondsAgoUTCString = fiveSecondsAgo.toISOString();

      // Use raw SQL with UTC comparison to bypass Sequelize timezone conversion
      // Only start events that are within the last 5 seconds (not 1 minute)
      const eventsToStart = await Event.findAll({
        where: {
          status: "scheduled",
          isDisabled: false,
          [Op.and]: [
            Sequelize.literal(
              `"startTime" AT TIME ZONE 'UTC' <= '${nowUTCString}'::timestamptz`
            ),
            Sequelize.literal(
              `"startTime" AT TIME ZONE 'UTC' >= '${fiveSecondsAgoUTCString}'::timestamptz`
            ),
          ],
        },
      });

      // Also check for events that should have started but are still scheduled
      const allScheduledEvents = await Event.findAll({
        where: {
          status: "scheduled",
          isDisabled: false,
          [Op.and]: [
            Sequelize.literal(
              `"startTime" AT TIME ZONE 'UTC' <= '${nowUTCString}'::timestamptz`
            ),
          ],
        },
        limit: 10, // Limit to avoid too many logs
      });

      // Debug logging - show all scheduled events
      if (allScheduledEvents.length > 0) {
        console.log(
          `🔍 [SCHEDULER] Checking ${allScheduledEvents.length} scheduled event(s) at UTC: ${nowISO}, PKT: ${pktTime}`
        );
        allScheduledEvents.forEach((event) => {
          const startTimeISO = event.startTime?.toISOString() || "null";
          const timeDiff = event.startTime
            ? (now.getTime() - event.startTime.getTime()) / 1000
            : null;
          console.log(
            `  - Event ${event.id} (${
              event.name
            }): startTime=${startTimeISO}, diff=${
              timeDiff !== null ? `${timeDiff.toFixed(0)}s` : "N/A"
            }, shouldStart=${
              event.startTime && event.startTime <= now ? "YES" : "NO"
            }`
          );
        });
      }

      // Debug logging - show events to start
      if (eventsToStart.length > 0) {
        console.log(
          `✅ [SCHEDULER] Found ${eventsToStart.length} event(s) to start NOW at UTC: ${nowISO}, PKT: ${pktTime}`
        );
        eventsToStart.forEach((event) => {
          console.log(
            `  - Event ${event.id} (${
              event.name
            }): startTime=${event.startTime?.toISOString()}, now=${nowISO}`
          );
        });
      }

      for (const event of eventsToStart) {
        try {
          if (event.createdBy === "admin") {
            await EventService.startEvent(event.adminId, event.id);
            console.log(
              `✅ Auto-started admin event: ${event.name} (ID: ${event.id})`
            );
          } else if (event.createdBy === "manager") {
            // Manager events start independently - no parent event check needed
            // Conflict check is handled in ManagerEventService.startEvent()
            await ManagerEventService.startEvent(event.managerId, event.id);
            console.log(
              `✅ Auto-started manager event: ${event.name} (ID: ${event.id})`
            );
          }
        } catch (error) {
          console.error(
            `❌ Error auto-starting event ${event.id}:`,
            error.message
          );
        }
      }
    } catch (error) {
      console.error("❌ Error checking events to start:", error);
    }
  }

  // Check for events that should end based on endTime
  static async checkAndEndEvents() {
    try {
      // Get current UTC time (events are stored in UTC in database)
      const now = timezoneUtils.getCurrentUTCTime();
      // CRITICAL: Use UTC string to bypass Sequelize timezone conversion
      const nowUTCString = now.toISOString();

      // Find active events that should end now (skip disabled events)
      // Use raw SQL with UTC comparison to bypass Sequelize timezone conversion
      const eventsToEnd = await Event.findAll({
        where: {
          status: "active",
          isDisabled: false, // Skip disabled events
          [Op.and]: [
            Sequelize.literal(
              `"endTime" AT TIME ZONE 'UTC' <= '${nowUTCString}'::timestamptz`
            ),
          ],
        },
      });

      // Check for disabled events whose original end time has passed
      // These should be auto-completed
      const disabledEventsToComplete = await Event.findAll({
        where: {
          isDisabled: true,
          [Op.or]: [{ status: "active" }, { status: "scheduled" }],
        },
      });

      for (const event of disabledEventsToComplete) {
        const originalEndTime = event.originalEndTime || event.endTime;
        if (now >= originalEndTime) {
          try {
            // If event was active when disabled, make sure device is OFF
            if (event.status === "active" && event.deviceId) {
              const device = await AC.findByPk(event.deviceId);
              if (device && device.isOn) {
                device.isOn = false;
                await device.save();

                // Send OFF command to ESP device
                if (device.serialNumber) {
                  ESPService.sendPowerCommand(device.serialNumber, false);
                  console.log(
                    `✅ [EVENT] Auto-completed disabled event - Turned OFF device ${device.serialNumber}`
                  );
                }
              }
            }

            // Event has ended while disabled, mark as completed
            event.status = "completed";
            event.isDisabled = false;
            event.completedAt = now;
            event.disabledAt = null;
            await event.save();
            console.log(
              `✅ Auto-completed disabled event: ${event.name} (ID: ${event.id}) - Original end time passed`
            );

            // Auto-delete completed event from database
            await event.destroy();
            console.log(
              `🗑️ Auto-deleted completed disabled event: ${event.name} (ID: ${event.id})`
            );
          } catch (error) {
            console.error(
              `❌ Error auto-completing disabled event ${event.id}:`,
              error.message
            );
          }
        }
      }

      for (const event of eventsToEnd) {
        try {
          if (event.createdBy === "admin") {
            // Turn device OFF when event completes (only device events are supported)
            if (event.deviceId) {
              const device = await AC.findByPk(event.deviceId);
              if (device) {
                device.isOn = false;

                // Set device temperature to event temperature when event ends
                if (
                  event.temperature !== null &&
                  event.temperature !== undefined
                ) {
                  const eventTemp = parseFloat(event.temperature);
                  if (eventTemp >= 16 && eventTemp <= 30) {
                    const currentTemp = device.temperature || 16;
                    const tempDiff = eventTemp - currentTemp;

                    // Update device temperature in database
                    device.temperature = eventTemp;

                    // Send temperature command to ESP device to set event temp
                    if (device.serialNumber && tempDiff !== 0) {
                      await ESPService.startTemperatureSync(
                        device.serialNumber,
                        event.temperature
                      );
                      console.log(
                        `✅ [EVENT] Set device temp to event temp: ${eventTemp}°C (was ${currentTemp}°C)`
                      );
                    }
                  }
                }

                await device.save();

                // Send OFF command to ESP device
                if (device.serialNumber) {
                  ESPService.sendPowerCommand(device.serialNumber, false);
                  console.log(
                    `✅ [EVENT] Auto-completed - Turned OFF device ${device.serialNumber}`
                  );

                  // Send "event end" message to ESP device
                  ESPService.sendEventStatusMessage(
                    device.serialNumber,
                    "event end",
                    {
                      eventId: event.id,
                      eventName: event.name,
                      temperature: event.temperature,
                    }
                  );
                }
              }
            }

            // Auto-complete admin events
            event.status = "completed";
            event.completedAt = new Date();
            await event.save();
            console.log(
              `✅ Auto-completed admin event: ${event.name} (ID: ${event.id})`
            );

            // Broadcast completion to frontend
            try {
              if (event.deviceId) {
                const device = await AC.findByPk(event.deviceId);
                if (device && device.serialNumber) {
                  ESPService.broadcastToFrontend({
                    type: "EVENT_COMPLETED",
                    eventId: event.id,
                    eventName: event.name,
                    device_id: device.serialNumber,
                    serialNumber: device.serialNumber,
                    timestamp: new Date().toISOString(),
                  });
                }
              }
            } catch (broadcastError) {
              console.error(
                "⚠️ Error broadcasting event completed:",
                broadcastError
              );
            }

            // Auto-delete completed event after 5 seconds
            setTimeout(async () => {
              try {
                const eventToDelete = await Event.findByPk(event.id);
                if (eventToDelete && eventToDelete.status === "completed") {
                  await eventToDelete.destroy();
                  console.log(
                    `🗑️ Auto-deleted completed admin event: ${eventToDelete.name} (ID: ${eventToDelete.id}) after 5 seconds`
                  );

                  // Broadcast deletion to frontend - CRITICAL: Broadcast to ALL clients
                  try {
                    // Broadcast to all frontend clients (both admin and manager)
                    ESPService.broadcastToFrontend({
                      type: "EVENT_DELETED",
                      eventId: event.id,
                      eventName: event.name,
                      createdBy: event.createdBy,
                      timestamp: new Date().toISOString(),
                    });

                    // Also broadcast device-specific if available
                    if (event.deviceId) {
                      const device = await AC.findByPk(event.deviceId);
                      if (device && device.serialNumber) {
                        ESPService.broadcastToFrontend({
                          type: "EVENT_DELETED",
                          eventId: event.id,
                          eventName: event.name,
                          device_id: device.serialNumber,
                          serialNumber: device.serialNumber,
                          createdBy: event.createdBy,
                          timestamp: new Date().toISOString(),
                        });
                      }
                    }

                    console.log(
                      `📡 [SCHEDULER] Broadcasted EVENT_DELETED for completed admin event ${event.id} to all frontend clients`
                    );
                  } catch (broadcastError) {
                    console.error(
                      "⚠️ Error broadcasting event deleted:",
                      broadcastError
                    );
                  }
                }
              } catch (deleteError) {
                console.error(
                  `❌ Error auto-deleting completed event ${event.id}:`,
                  deleteError
                );
              }
            }, 5000); // 5 seconds delay (5000ms)
          } else if (event.createdBy === "manager") {
            // Turn device OFF when manager event completes
            if (event.deviceId) {
              const device = await AC.findByPk(event.deviceId);
              if (device) {
                device.isOn = false;

                // Set device temperature to event temperature when event ends
                if (
                  event.temperature !== null &&
                  event.temperature !== undefined
                ) {
                  const eventTemp = parseFloat(event.temperature);
                  if (eventTemp >= 16 && eventTemp <= 30) {
                    const currentTemp = device.temperature || 16;
                    const tempDiff = eventTemp - currentTemp;

                    // Update device temperature in database
                    device.temperature = eventTemp;

                    // Send temperature command to ESP device to set event temp
                    if (device.serialNumber && tempDiff !== 0) {
                      await ESPService.startTemperatureSync(
                        device.serialNumber,
                        event.temperature
                      );
                      console.log(
                        `✅ [EVENT] Set device temp to event temp: ${eventTemp}°C (was ${currentTemp}°C)`
                      );
                    }
                  }
                }

                await device.save();

                // Send OFF command to ESP device
                if (device.serialNumber) {
                  ESPService.sendPowerCommand(device.serialNumber, false);
                  console.log(
                    `✅ [EVENT] Auto-completed manager event - Turned OFF device ${device.serialNumber}`
                  );

                  // Send "event end" message to ESP device
                  ESPService.sendEventStatusMessage(
                    device.serialNumber,
                    "event end",
                    {
                      eventId: event.id,
                      eventName: event.name,
                      temperature: event.temperature,
                    }
                  );
                }
              }
            }

            // Auto-complete manager events
            event.status = "completed";
            event.completedAt = new Date();
            await event.save();
            console.log(
              `✅ Auto-completed manager event: ${event.name} (ID: ${event.id})`
            );

            // Broadcast completion to frontend
            try {
              if (event.deviceId) {
                const device = await AC.findByPk(event.deviceId);
                if (device && device.serialNumber) {
                  ESPService.broadcastToFrontend({
                    type: "EVENT_COMPLETED",
                    eventId: event.id,
                    eventName: event.name,
                    device_id: device.serialNumber,
                    serialNumber: device.serialNumber,
                    timestamp: new Date().toISOString(),
                  });
                }
              }
            } catch (broadcastError) {
              console.error(
                "⚠️ Error broadcasting event completed:",
                broadcastError
              );
            }

            // Auto-delete completed manager event after 5 seconds
            setTimeout(async () => {
              try {
                const eventToDelete = await Event.findByPk(event.id);
                if (eventToDelete && eventToDelete.status === "completed") {
                  await eventToDelete.destroy();
                  console.log(
                    `🗑️ Auto-deleted completed manager event: ${eventToDelete.name} (ID: ${eventToDelete.id}) after 5 seconds`
                  );

                  // Broadcast deletion to frontend - CRITICAL: Broadcast to ALL clients
                  try {
                    // Broadcast to all frontend clients (both admin and manager)
                    ESPService.broadcastToFrontend({
                      type: "EVENT_DELETED",
                      eventId: event.id,
                      eventName: event.name,
                      createdBy: event.createdBy,
                      timestamp: new Date().toISOString(),
                    });

                    // Also broadcast device-specific if available
                    if (event.deviceId) {
                      const device = await AC.findByPk(event.deviceId);
                      if (device && device.serialNumber) {
                        ESPService.broadcastToFrontend({
                          type: "EVENT_DELETED",
                          eventId: event.id,
                          eventName: event.name,
                          device_id: device.serialNumber,
                          serialNumber: device.serialNumber,
                          createdBy: event.createdBy,
                          timestamp: new Date().toISOString(),
                        });
                      }
                    }

                    console.log(
                      `📡 [SCHEDULER] Broadcasted EVENT_DELETED for completed admin event ${event.id} to all frontend clients`
                    );
                  } catch (broadcastError) {
                    console.error(
                      "⚠️ Error broadcasting event deleted:",
                      broadcastError
                    );
                  }
                }
              } catch (deleteError) {
                console.error(
                  `❌ Error auto-deleting completed event ${event.id}:`,
                  deleteError
                );
              }
            }, 5000); // 5 seconds delay (5000ms)
          }
        } catch (error) {
          console.error(
            `❌ Error auto-ending event ${event.id}:`,
            error.message
          );
        }
      }
    } catch (error) {
      console.error("❌ Error checking events to end:", error);
    }
  }

  // Check and auto-delete events with specific statuses after 5 seconds
  static async checkAndAutoDeleteEvents() {
    try {
      const now = timezoneUtils.getCurrentUTCTime();

      // Find events with status: scheduled (waiting), active (started), or completed
      // that have been in that status for more than 5 seconds
      // Note: Frontend shows "waiting" for scheduled events, "started" for active events
      const fiveSecondsAgo = new Date(now.getTime() - 5000);

      const eventsToDelete = await Event.findAll({
        where: {
          [Op.or]: [
            { status: "scheduled" }, // Frontend shows as "waiting"
            { status: "active" }, // Frontend shows as "started" or "In Process"
            { status: "completed" },
          ],
          updatedAt: {
            [Op.lte]: fiveSecondsAgo, // Updated more than 5 seconds ago
          },
        },
      });

      for (const event of eventsToDelete) {
        try {
          // Double-check status before deleting
          const eventToDelete = await Event.findByPk(event.id);
          if (!eventToDelete) continue;

          const status = eventToDelete.status;
          // Only delete if status is scheduled, active, or completed
          // AND the event's end time has passed (for scheduled/active) or it's already completed
          if (
            status === "scheduled" ||
            status === "active" ||
            status === "completed"
          ) {
            // For scheduled/active events, only delete if end time has passed
            if (
              (status === "scheduled" || status === "active") &&
              eventToDelete.endTime &&
              eventToDelete.endTime > now
            ) {
              continue; // Don't delete if end time hasn't passed yet
            }

            const eventName = eventToDelete.name;
            const eventId = eventToDelete.id;
            const createdBy = eventToDelete.createdBy;

            await eventToDelete.destroy();
            console.log(
              `🗑️ Auto-deleted ${status} ${createdBy} event: ${eventName} (ID: ${eventId}) after 5 seconds`
            );

            // Broadcast deletion to frontend - CRITICAL: Broadcast to ALL clients
            try {
              // Broadcast to all frontend clients (both admin and manager)
              ESPService.broadcastToFrontend({
                type: "EVENT_DELETED",
                eventId: eventId,
                eventName: eventName,
                createdBy: createdBy,
                timestamp: new Date().toISOString(),
              });

              // Also broadcast device-specific if available
              if (eventToDelete.deviceId) {
                const device = await AC.findByPk(eventToDelete.deviceId);
                if (device && device.serialNumber) {
                  ESPService.broadcastToFrontend({
                    type: "EVENT_DELETED",
                    eventId: eventId,
                    eventName: eventName,
                    device_id: device.serialNumber,
                    serialNumber: device.serialNumber,
                    createdBy: createdBy,
                    timestamp: new Date().toISOString(),
                  });
                }
              }

              console.log(
                `📡 [SCHEDULER] Broadcasted EVENT_DELETED for ${status} ${createdBy} event ${eventId} to all frontend clients`
              );
            } catch (broadcastError) {
              console.error(
                "⚠️ Error broadcasting event deleted:",
                broadcastError
              );
            }
          }
        } catch (deleteError) {
          console.error(
            `❌ Error auto-deleting event ${event.id}:`,
            deleteError
          );
        }
      }
    } catch (error) {
      console.error("❌ Error checking events to auto-delete:", error);
    }
  }

  // Cleanup any remaining completed events (safety check)
  static async cleanupCompletedEvents() {
    try {
      const completedEvents = await Event.findAll({
        where: {
          status: "completed",
        },
      });

      if (completedEvents.length > 0) {
        for (const event of completedEvents) {
          await event.destroy();
          console.log(
            `🗑️ Cleaned up completed event: ${event.name} (ID: ${event.id})`
          );
        }
        console.log(
          `✅ Cleaned up ${completedEvents.length} completed event(s)`
        );
      }
    } catch (error) {
      console.error("❌ Error cleaning up completed events:", error);
    }
  }

  static stop() {
    console.log("🛑 Stopping event scheduler...");
    // Note: node-cron doesn't have a built-in stop method
    // If needed, we can store the task and stop it
  }
}

module.exports = EventScheduler;
