const Event = require("../../../models/Event/event");
const Organization = require("../../../models/Organization/organization");
const AC = require("../../../models/AC/ac");
const ActivityLog = require("../../../models/Activity log/activityLog");
const { Op, Sequelize } = require("sequelize");
const Services = require("../../../services");
const ESPService = Services.getESPService();
const timezoneUtils = require("../../../utils/timezone");

class EventService {
  // Create a new event (admin)
  static async createEvent(adminId, eventData) {
    const transaction = await Event.sequelize.transaction();

    try {
      // Validate required fields
      if (
        !eventData.name ||
        !eventData.eventType ||
        !eventData.startTime ||
        !eventData.endTime
      ) {
        throw new Error("Name, eventType, startTime, and endTime are required");
      }

      // Validate event type - ONLY device events are allowed
      if (eventData.eventType !== "device") {
        throw new Error(
          "Only device events are allowed. eventType must be 'device'"
        );
      }

      // Validate target - deviceId is required
      if (!eventData.deviceId) {
        throw new Error("deviceId is required for device events");
      }

      // Validate temperature - temperature is REQUIRED for events
      if (
        eventData.temperature === null ||
        eventData.temperature === undefined ||
        eventData.temperature === ""
      ) {
        throw new Error("Temperature is required for events");
      }

      const temperature = parseFloat(eventData.temperature);
      if (isNaN(temperature) || temperature < 16 || temperature > 30) {
        throw new Error(
          "Temperature must be a number between 16 and 30 degrees"
        );
      }

      // Check if this is a recurring event
      const isRecurring =
        eventData.isRecurring === true || eventData.isRecurring === "true";

      // Validate time range
      let startTime, endTime;

      if (isRecurring) {
        // For recurring events, validate recurring fields
        if (!eventData.recurringStartDate || !eventData.recurringEndDate) {
          throw new Error(
            "recurringStartDate and recurringEndDate are required for recurring events"
          );
        }

        if (!eventData.timeStart || !eventData.timeEnd) {
          throw new Error(
            "timeStart and timeEnd are required for recurring events"
          );
        }

        if (
          !eventData.daysOfWeek ||
          !Array.isArray(eventData.daysOfWeek) ||
          eventData.daysOfWeek.length === 0
        ) {
          throw new Error(
            "daysOfWeek array is required for recurring events (e.g., [1,2,3,4,5] for Mon-Fri)"
          );
        }

        // Validate daysOfWeek values (0-6, where 0=Sunday, 1=Monday, etc.)
        const validDays = eventData.daysOfWeek.every(
          (day) => Number.isInteger(day) && day >= 0 && day <= 6
        );
        if (!validDays) {
          throw new Error(
            "daysOfWeek must contain integers between 0-6 (0=Sunday, 1=Monday, ..., 6=Saturday)"
          );
        }

        // Validate date range
        const recurringStartDate = new Date(eventData.recurringStartDate);
        const recurringEndDate = new Date(eventData.recurringEndDate);

        if (
          isNaN(recurringStartDate.getTime()) ||
          isNaN(recurringEndDate.getTime())
        ) {
          throw new Error(
            "Invalid recurringStartDate or recurringEndDate format"
          );
        }

        if (recurringEndDate < recurringStartDate) {
          throw new Error("recurringEndDate must be after recurringStartDate");
        }

        // Validate time format (HH:MM:SS or HH:MM)
        const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
        if (
          !timeRegex.test(eventData.timeStart) ||
          !timeRegex.test(eventData.timeEnd)
        ) {
          throw new Error(
            "timeStart and timeEnd must be in HH:MM:SS or HH:MM format"
          );
        }

        // Parse times and validate
        const [startHour, startMin] = eventData.timeStart
          .split(":")
          .map(Number);
        const [endHour, endMin] = eventData.timeEnd.split(":").map(Number);

        if (
          endHour < startHour ||
          (endHour === startHour && endMin <= startMin)
        ) {
          throw new Error("timeEnd must be after timeStart");
        }

        // For recurring events, startTime and endTime are set to first occurrence
        // These will be used as template, actual instances will be created by scheduler
        const firstOccurrenceDate = this.getNextOccurrenceDate(
          recurringStartDate,
          eventData.daysOfWeek
        );

        if (!firstOccurrenceDate) {
          throw new Error(
            "No valid occurrence dates found in the specified date range"
          );
        }

        // Convert to Date object for comparison
        const endDateObj = new Date(recurringEndDate);
        endDateObj.setHours(23, 59, 59, 999);

        if (firstOccurrenceDate > endDateObj) {
          throw new Error(
            "No valid occurrence dates found in the specified date range"
          );
        }

        // Use moment-timezone to properly create date in PKT timezone
        const firstOccurrenceDateStr =
          firstOccurrenceDate instanceof Date
            ? timezoneUtils.formatPakistanTime(
                firstOccurrenceDate,
                "YYYY-MM-DD"
              )
            : typeof firstOccurrenceDate === "string"
            ? firstOccurrenceDate
            : timezoneUtils.formatPakistanTime(
                firstOccurrenceDate,
                "YYYY-MM-DD"
              );

        // Create date-time string in PKT and convert to UTC
        const pktStartDateTime = `${firstOccurrenceDateStr} ${eventData.timeStart}`;
        const pktEndDateTime = `${firstOccurrenceDateStr} ${eventData.timeEnd}`;

        // Convert PKT to UTC using timezone utils
        startTime = timezoneUtils.pktToUTC(
          pktStartDateTime,
          "YYYY-MM-DD HH:mm:ss"
        );
        endTime = timezoneUtils.pktToUTC(pktEndDateTime, "YYYY-MM-DD HH:mm:ss");

        // Validate dates
        if (
          !startTime ||
          !endTime ||
          isNaN(startTime.getTime()) ||
          isNaN(endTime.getTime())
        ) {
          throw new Error("Invalid date/time created for recurring event");
        }
      } else {
        // For non-recurring events, use provided startTime and endTime
        // CRITICAL: Frontend sends ISO strings in UTC format (with 'Z' or without)
        // We MUST ensure they are parsed as UTC, not local time
        let startTimeStr = String(eventData.startTime).trim();
        let endTimeStr = String(eventData.endTime).trim();
        
        // CRITICAL FIX: Frontend already sends UTC time (e.g., "2025-12-21T03:40:00.000Z")
        // We must parse it as UTC and store it as-is, without any timezone conversion
        // Ensure ISO strings are treated as UTC
        // If no timezone indicator, assume it's UTC and add 'Z'
        if (startTimeStr.includes('T') && !startTimeStr.endsWith('Z') && !startTimeStr.match(/[+-]\d{2}:?\d{2}$/)) {
          startTimeStr = startTimeStr.replace(/\.\d{3,}$/, '') + 'Z';
        }
        if (endTimeStr.includes('T') && !endTimeStr.endsWith('Z') && !endTimeStr.match(/[+-]\d{2}:?\d{2}$/)) {
          endTimeStr = endTimeStr.replace(/\.\d{3,}$/, '') + 'Z';
        }
        
        // CRITICAL: Parse as UTC explicitly
        // new Date() with 'Z' suffix correctly parses as UTC, but we need to ensure
        // the Date object represents the correct UTC time
        startTime = new Date(startTimeStr);
        endTime = new Date(endTimeStr);
        
        // CRITICAL: Verify the parsed times are correct UTC
        // If frontend sent 03:40 UTC, we should get 03:40 UTC, not 08:40 UTC
        const startUTCHours = startTime.getUTCHours();
        const startUTCMinutes = startTime.getUTCMinutes();
        const endUTCHours = endTime.getUTCHours();
        const endUTCMinutes = endTime.getUTCMinutes();
        
        // Extract expected UTC time from the ISO string
        // If string is "2025-12-21T03:40:00.000Z", expected UTC is 03:40
        const startTimeMatch = startTimeStr.match(/T(\d{2}):(\d{2})/);
        const endTimeMatch = endTimeStr.match(/T(\d{2}):(\d{2})/);
        
        if (startTimeMatch && endTimeMatch) {
          const expectedStartHour = parseInt(startTimeMatch[1], 10);
          const expectedStartMin = parseInt(startTimeMatch[2], 10);
          const expectedEndHour = parseInt(endTimeMatch[1], 10);
          const expectedEndMin = parseInt(endTimeMatch[2], 10);
          
          // Verify parsing is correct
          if (startUTCHours !== expectedStartHour || startUTCMinutes !== expectedStartMin) {
            console.error('❌ CRITICAL: Start time parsing mismatch!', {
              received: startTimeStr,
              expectedUTC: `${String(expectedStartHour).padStart(2, '0')}:${String(expectedStartMin).padStart(2, '0')} UTC`,
              parsedUTC: `${String(startUTCHours).padStart(2, '0')}:${String(startUTCMinutes).padStart(2, '0')} UTC`,
              parsedISO: startTime.toISOString()
            });
            // Force correct UTC time
            startTime = new Date(Date.UTC(
              startTime.getUTCFullYear(),
              startTime.getUTCMonth(),
              startTime.getUTCDate(),
              expectedStartHour,
              expectedStartMin,
              0,
              0
            ));
          }
          
          if (endUTCHours !== expectedEndHour || endUTCMinutes !== expectedEndMin) {
            console.error('❌ CRITICAL: End time parsing mismatch!', {
              received: endTimeStr,
              expectedUTC: `${String(expectedEndHour).padStart(2, '0')}:${String(expectedEndMin).padStart(2, '0')} UTC`,
              parsedUTC: `${String(endUTCHours).padStart(2, '0')}:${String(endUTCMinutes).padStart(2, '0')} UTC`,
              parsedISO: endTime.toISOString()
            });
            // Force correct UTC time
            endTime = new Date(Date.UTC(
              endTime.getUTCFullYear(),
              endTime.getUTCMonth(),
              endTime.getUTCDate(),
              expectedEndHour,
              expectedEndMin,
              0,
              0
            ));
          }
        }
        
        console.log('🔍 Backend time parsing verification:', {
          receivedStartTime: eventData.startTime,
          parsedStartTimeISO: startTime.toISOString(),
          parsedStartTimeUTC: `${String(startTime.getUTCHours()).padStart(2, '0')}:${String(startTime.getUTCMinutes()).padStart(2, '0')} UTC`,
          receivedEndTime: eventData.endTime,
          parsedEndTimeISO: endTime.toISOString(),
          parsedEndTimeUTC: `${String(endTime.getUTCHours()).padStart(2, '0')}:${String(endTime.getUTCMinutes()).padStart(2, '0')} UTC`
        });

        // Verify dates are valid
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          throw new Error("Invalid startTime or endTime format");
        }

        if (endTime <= startTime) {
          throw new Error("endTime must be after startTime");
        }
        
        // Log for debugging - show what was received and how it was parsed
        console.log('📅 Event time parsing (non-recurring):', {
          receivedStartTime: eventData.startTime,
          parsedStartTime: startTime.toISOString(),
          receivedEndTime: eventData.endTime,
          parsedEndTime: endTime.toISOString(),
          startTimePKT: timezoneUtils.formatPakistanTime(startTime, "YYYY-MM-DD HH:mm:ss"),
          endTimePKT: timezoneUtils.formatPakistanTime(endTime, "YYYY-MM-DD HH:mm:ss")
        });
      }

      // Log times in Pakistan/Karachi timezone for debugging
      const currentPKT = timezoneUtils.getCurrentPakistanTimeString(
        "YYYY-MM-DD HH:mm:ss"
      );
      console.log(`📅 Event creation - Time details:`, {
        receivedFromFrontend: {
          startTime: eventData.startTime,
          endTime: eventData.endTime,
        },
        parsedAsUTC: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
        displayedInPKT: {
          startTime: timezoneUtils.formatPakistanTime(
            startTime,
            "YYYY-MM-DD HH:mm:ss"
          ),
          endTime: timezoneUtils.formatPakistanTime(
            endTime,
            "YYYY-MM-DD HH:mm:ss"
          ),
        },
        currentServerTimePKT: currentPKT,
        timezone: "Asia/Karachi (PKT - UTC+5)",
      });

      // Verify ownership
      if (eventData.deviceId) {
        const Venue = require("../../../models/Venue/venue");
        const device = await AC.findOne({
          where: { id: eventData.deviceId },
          include: [
            {
              model: Venue,
              as: "venue",
              where: { adminId: adminId },
            },
          ],
          transaction,
        });
        if (!device) {
          throw new Error("Device not found or does not belong to this admin");
        }
      }

      // No organization events - only device events are allowed

      // DUPLICATE CHECK: Check if there's already an admin event at the same time on same device
      // Prevent duplicate admin events from being created
      const duplicateAdminEvent = await Event.findOne({
        where: {
          createdBy: "admin",
          adminId: adminId,
          eventType: "device",
          deviceId: eventData.deviceId,
          isDisabled: false, // Only check non-disabled events
          status: {
            [Op.in]: ["scheduled", "active"],
          },
          [Op.and]: [
            {
              startTime: {
                [Op.lte]: endTime,
              },
            },
            {
              endTime: {
                [Op.gte]: startTime,
              },
            },
          ],
        },
        transaction,
      });

      if (duplicateAdminEvent) {
        throw new Error(
          "An admin event already exists for this device at this time. Please choose a different time or device."
        );
      }

      // CONFLICT CHECK: Find and disable any manager events that conflict with admin event
      // Admin has priority - if admin creates event at same time on same device, disable manager events
      const conflictingManagerEvents = await Event.findAll({
        where: {
          createdBy: "manager",
          adminId: adminId,
          eventType: "device", // Only device events now
          deviceId: eventData.deviceId, // Only check device conflicts
          isDisabled: false, // Only disable non-disabled manager events
          status: {
            [Op.in]: ["scheduled", "active"],
          },
          [Op.and]: [
            {
              startTime: {
                [Op.lte]: endTime,
              },
            },
            {
              endTime: {
                [Op.gte]: startTime,
              },
            },
          ],
        },
        transaction,
      });

      // Disable conflicting manager events
      const disabledManagerEvents = [];
      for (const managerEvent of conflictingManagerEvents) {
        // Set originalEndTime if not set
        if (!managerEvent.originalEndTime) {
          managerEvent.originalEndTime = managerEvent.endTime;
        }
        managerEvent.isDisabled = true;
        managerEvent.disabledAt = new Date();

        // If manager event is active, turn device OFF
        if (
          managerEvent.status === "active" &&
          managerEvent.eventType === "device" &&
          managerEvent.deviceId
        ) {
          const device = await AC.findByPk(managerEvent.deviceId, {
            transaction,
          });
          if (device) {
            device.isOn = false;
            await device.save({ transaction });

            // Send OFF command to ESP device
            if (device.serialNumber) {
              ESPService.sendPowerCommand(device.serialNumber, false);
              console.log(
                `✅ [EVENT] Disabled conflicting manager event - Turned OFF device ${device.serialNumber}`
              );
            }
          }
        }

        await managerEvent.save({ transaction });
        disabledManagerEvents.push(managerEvent.id);
      }

      // Get device to set temperature when event is created (device state is NOT changed)
      // We already validated device exists, so this should not fail
      const Venue = require("../../../models/Venue/venue");
      const device = await AC.findOne({
        where: { id: eventData.deviceId },
        include: [
          {
            model: Venue,
            as: "venue",
            where: { adminId: adminId },
          },
        ],
        transaction,
      });

      // Ensure device exists (should not be null since we validated earlier)
      if (!device) {
        throw new Error("Device not found or does not belong to this admin");
      }

      // Determine initial event status
      // For non-recurring events: Start immediately if device is ON, or turn device ON and start
      // For recurring events: Keep as scheduled (templates)
      let initialStatus = "scheduled";
      let shouldStartImmediately = false;

      if (!isRecurring) {
        // Non-recurring event: Start immediately
        if (device.isOn) {
          // Device is ON → Start event immediately
          initialStatus = "active";
          shouldStartImmediately = true;
        } else {
          // Device is OFF → Turn ON and start event immediately
          device.isOn = true;
          device.lastPowerChangeAt = new Date();
          device.lastPowerChangeBy = "admin";
          initialStatus = "active";
          shouldStartImmediately = true;
        }
      }

      // Set temperature when event is created
      device.temperature = temperature; // Set temperature when event is created
      device.lastTemperatureChange = new Date();
      device.changedBy = "admin"; // Admin created the event
      await device.save({ transaction });

      // CRITICAL: Sequelize's timezone: "+05:00" setting causes it to convert dates
      // When storing a Date object, Sequelize interprets it in the configured timezone
      // and converts to UTC. This causes a 5-hour offset.
      // Solution: Use Sequelize.literal with explicit UTC timestamp
      
      // Get UTC timestamps as ISO strings (already in UTC format)
      const startTimeUTCString = startTime.toISOString();
      const endTimeUTCString = endTime.toISOString();
      
      // CRITICAL: Verify the UTC times are correct before storing
      console.log('🔍 Pre-storage UTC verification:', {
        startTimeISO: startTimeUTCString,
        startTimeUTC: `${String(startTime.getUTCHours()).padStart(2, '0')}:${String(startTime.getUTCMinutes()).padStart(2, '0')} UTC`,
        endTimeISO: endTimeUTCString,
        endTimeUTC: `${String(endTime.getUTCHours()).padStart(2, '0')}:${String(endTime.getUTCMinutes()).padStart(2, '0')} UTC`,
        receivedFromFrontend: {
          startTime: eventData.startTime,
          endTime: eventData.endTime
        }
      });
      
      // CRITICAL: Store exactly what frontend sends - no timezone conversion
      // Extract date-time part: '2025-12-21 04:12:00' (without timezone)
      // PostgreSQL timestamp type stores as-is without timezone conversion
      const startTimeSQL = startTimeUTCString.replace('T', ' ').replace(/\.\d{3}Z$/, '');
      const endTimeSQL = endTimeUTCString.replace('T', ' ').replace(/\.\d{3}Z$/, '');
      
      // Create event - ONLY device events
      const eventDataToCreate = {
        name: eventData.name,
        eventType: "device", // Always device
        deviceId: eventData.deviceId,
        organizationId: null, // No organization events
        createdBy: "admin",
        adminId: adminId,
        managerId: null,
        startTime: Sequelize.literal(`'${startTimeSQL}'::timestamp`),
        endTime: Sequelize.literal(`'${endTimeSQL}'::timestamp`),
        originalEndTime: Sequelize.literal(`'${endTimeSQL}'::timestamp`), // Store original end time
        temperature: temperature, // Temperature is required
        powerOn: true, // Event will turn device ON when it starts
        status: initialStatus || "scheduled", // "active" for immediate start, "scheduled" for recurring - ensure always valid
        parentAdminEventId: null,
        isDisabled: false,
      };

      // Add recurring fields if this is a recurring event
      if (isRecurring) {
        eventDataToCreate.isRecurring = true;
        eventDataToCreate.recurringType = "weekly";
        eventDataToCreate.daysOfWeek = eventData.daysOfWeek;
        eventDataToCreate.recurringStartDate = eventData.recurringStartDate;
        eventDataToCreate.recurringEndDate = eventData.recurringEndDate;
        eventDataToCreate.timeStart = eventData.timeStart;
        eventDataToCreate.timeEnd = eventData.timeEnd;
        eventDataToCreate.parentRecurringEventId = null; // This is the parent template
      }

      // CRITICAL: Log what we're about to store
      console.log('📅 Storing event with times:', {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        startTimeUTC: `${String(startTime.getUTCHours()).padStart(2, '0')}:${String(startTime.getUTCMinutes()).padStart(2, '0')} UTC`,
        endTimeUTC: `${String(endTime.getUTCHours()).padStart(2, '0')}:${String(endTime.getUTCMinutes()).padStart(2, '0')} UTC`,
        startTimePKT: timezoneUtils.formatPakistanTime(startTime, "YYYY-MM-DD HH:mm:ss"),
        endTimePKT: timezoneUtils.formatPakistanTime(endTime, "YYYY-MM-DD HH:mm:ss")
      });
      
      const event = await Event.create(eventDataToCreate, { transaction });
      
      // CRITICAL: Log what was actually stored
      console.log('📅 Event stored, retrieved times:', {
        startTime: event.startTime ? event.startTime.toISOString() : 'null',
        endTime: event.endTime ? event.endTime.toISOString() : 'null',
        startTimeUTC: event.startTime ? `${String(event.startTime.getUTCHours()).padStart(2, '0')}:${String(event.startTime.getUTCMinutes()).padStart(2, '0')} UTC` : 'null',
        endTimeUTC: event.endTime ? `${String(event.endTime.getUTCHours()).padStart(2, '0')}:${String(event.endTime.getUTCMinutes()).padStart(2, '0')} UTC` : 'null',
        startTimePKT: event.startTime ? timezoneUtils.formatPakistanTime(event.startTime, "YYYY-MM-DD HH:mm:ss") : 'null',
        endTimePKT: event.endTime ? timezoneUtils.formatPakistanTime(event.endTime, "YYYY-MM-DD HH:mm:ss") : 'null'
      });

      // If event should start immediately, apply event settings
      if (shouldStartImmediately) {
        event.startedAt = new Date();
        await event.save({ transaction });
        await this.applyEventSettings(event, transaction);
        console.log(
          `✅ [EVENT-CREATE] Event started immediately - Device ${
            device.isOn ? "was ON" : "turned ON"
          }`
        );
      }

      // Log activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: shouldStartImmediately
            ? "CREATE_AND_START_EVENT"
            : "CREATE_EVENT",
          targetType: "ac", // Always device events
          targetId: eventData.deviceId,
          details: {
            eventId: event.id,
            eventName: eventData.name,
            eventType: "device", // Always device
            startTime: startTime,
            endTime: endTime,
            startedImmediately: shouldStartImmediately,
            disabledManagerEventsCount: disabledManagerEvents.length,
            disabledManagerEventIds: disabledManagerEvents,
          },
        },
        { transaction }
      );

      // Commit transaction before external operations (ESP commands, broadcasts)
      await transaction.commit();
      console.log(
        `✅ [EVENT-CREATE] Transaction committed for event ${event.id}`
      );

      // Send commands to ESP device after event is created/started
      // These operations are outside the transaction - if they fail, event is already created
      try {
        if (device && device.serialNumber) {
          // If device is ON, set temperature immediately when event is created
          if (device.isOn) {
            console.log(
              `🔌 [EVENT-CREATE] Device ${device.serialNumber} is ON, setting event temperature immediately`
            );

            // Use startTemperatureSync - backend handles pulse calculation (supports negative pulses)
            await ESPService.startTemperatureSync(
              device.serialNumber,
              temperature
            );
            console.log(
              `✅ [EVENT-CREATE] Starting temperature sync to ${temperature}°C for device ${device.serialNumber}`
            );

            // Send event status message with temperature to show on device
            await ESPService.sendEventStatusMessage(
              device.serialNumber,
              "event created",
              {
                eventId: event.id,
                eventName: event.name,
                temperature: temperature,
              }
            );
            await ESPService.sendEventStatusMessage(
              device.serialNumber,
              "event temp",
              {
                eventId: event.id,
                temperature: temperature,
              }
            );
            console.log(
              `✅ [EVENT-CREATE] Event temperature ${temperature}°C rendered on device ${device.serialNumber}`
            );
          } else {
            // Device is OFF - start temperature sync (will apply when device turns ON)
            await ESPService.startTemperatureSync(
              device.serialNumber,
              temperature
            );
            console.log(
              `✅ [EVENT-CREATE] Temperature sync set to ${temperature}°C for device ${device.serialNumber} (will apply when device turns ON)`
            );
          }

          // If event started immediately, send power ON command
          if (shouldStartImmediately) {
            await ESPService.sendPowerCommand(device.serialNumber, true);
            console.log(
              `✅ [EVENT-CREATE] Turned ON device ${device.serialNumber} (event started immediately)`
            );
          }

          // Send event status message to ESP device (always send, even if device is OFF)
          if (!device.isOn) {
            await ESPService.sendEventStatusMessage(
              device.serialNumber,
              "event created",
              {
                eventId: event.id,
                eventName: event.name,
                temperature: temperature,
              }
            );
          }

          // Broadcast real-time update to frontend
          ESPService.broadcastToFrontend({
            type: shouldStartImmediately ? "EVENT_STARTED" : "EVENT_CREATED",
            device_id: device.serialNumber,
            serialNumber: device.serialNumber,
            temperature: temperature,
            isOn: device.isOn,
            changedBy: "event_creation",
            timestamp: new Date().toISOString(),
            eventId: event.id,
          });
        }
      } catch (espError) {
        // Log ESP errors but don't fail the event creation
        console.error(
          `⚠️ [EVENT-CREATE] ESP command error (non-critical):`,
          espError
        );
        console.error(
          `   Event ${event.id} was created successfully, but ESP commands may have failed`
        );
      }

      const message =
        disabledManagerEvents.length > 0
          ? `Event created successfully. ${disabledManagerEvents.length} conflicting manager event(s) have been disabled.`
          : "Event created successfully";

      return {
        success: true,
        message: message,
        data: {
          event,
          disabledManagerEventsCount: disabledManagerEvents.length,
          disabledManagerEventIds: disabledManagerEvents,
        },
      };
    } catch (error) {
      // Only rollback if transaction hasn't been committed
      if (transaction && !transaction.finished) {
        await transaction.rollback();
        console.error(
          `❌ [EVENT-CREATE] Transaction rolled back due to error:`,
          error.message
        );
      } else {
        console.error(
          `❌ [EVENT-CREATE] Error after transaction commit:`,
          error.message
        );
      }
      throw error;
    }
  }

  // Get all events for admin (includes both admin and manager events)
  static async getAdminEvents(adminId, filters = {}) {
    try {
      console.log("📅 EventService.getAdminEvents - Starting query");
      console.log("- adminId:", adminId);
      console.log("- filters:", filters);

      const { Op } = require("sequelize");

      // Include both admin and manager events for this admin
      const where = {
        adminId: adminId,
        [Op.or]: [
          { createdBy: "admin" },
          { createdBy: "manager" }, // Manager events also have adminId
        ],
      };

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.eventType) {
        where.eventType = filters.eventType;
      }

      console.log("- where clause:", where);

      const Venue = require("../../../models/Venue/venue");
      const Manager = require("../../../models/Roleaccess/manager");

      // Get events with AC and Venue (without nested Organization to avoid association issues)
      const events = await Event.findAll({
        where,
        include: [
          {
            model: AC,
            as: "device",
            attributes: ["id", "name", "serialNumber", "venueId"],
            required: false,
            include: [
              {
                model: Venue,
                as: "venue",
                attributes: ["id", "name", "organizationId"],
                required: false,
              },
            ],
          },
          {
            model: Manager,
            as: "manager",
            required: false,
            attributes: ["id", "name", "email"],
          },
        ],
        order: [
          ["createdBy", "ASC"], // Admin events first, then manager events
          ["startTime", "ASC"],
        ],
      });

      // Manually add organization info if needed
      // Get all organizationIds from venues
      const organizationIds = new Set();
      events.forEach((event) => {
        try {
          // Access venue data safely
          const venue = event.device?.venue;
          if (venue && venue.organizationId) {
            organizationIds.add(venue.organizationId);
          }
        } catch (err) {
          console.warn("⚠️ Error accessing event.device.venue:", err.message);
        }
      });

      // Fetch organizations if needed
      if (organizationIds.size > 0) {
        try {
          const orgIdsArray = Array.from(organizationIds);
          console.log(
            `📋 Fetching ${orgIdsArray.length} organizations:`,
            orgIdsArray
          );

          const organizations = await Organization.findAll({
            where: { id: { [Op.in]: orgIdsArray } },
            attributes: ["id", "name"],
          });

          console.log(`✅ Found ${organizations.length} organizations`);

          const orgMap = new Map(
            organizations.map((org) => [org.id, org.get({ plain: true })])
          );

          // Add organization to each event's device.venue
          events.forEach((event) => {
            try {
              const venue = event.device?.venue;
              if (venue && venue.organizationId) {
                const org = orgMap.get(venue.organizationId);
                if (org) {
                  venue.organization = org;
                }
              }
            } catch (err) {
              console.warn(
                "⚠️ Error adding organization to event:",
                err.message
              );
            }
          });
        } catch (orgError) {
          console.error("❌ Error fetching organizations:", orgError.message);
          // Don't throw - continue without organization data
        }
      }

      console.log(
        `✅ EventService.getAdminEvents - Found ${events.length} events (${
          events.filter((e) => e.createdBy === "admin").length
        } admin, ${
          events.filter((e) => e.createdBy === "manager").length
        } manager)`
      );

      // Convert Sequelize instances to plain objects for JSON serialization
      // CRITICAL: Ensure startTime and endTime are returned as UTC ISO strings
      const plainEvents = events.map((event) => {
        const plainEvent = event.get({ plain: true });
        
        // CRITICAL FIX: Ensure dates are in UTC format
        // Sequelize might return dates with timezone conversion applied
        // We need to ensure they're returned as UTC ISO strings
        if (plainEvent.startTime) {
          // If it's a Date object, convert to UTC ISO string
          if (plainEvent.startTime instanceof Date) {
            plainEvent.startTime = plainEvent.startTime.toISOString();
          } else if (typeof plainEvent.startTime === 'string') {
            // If it's already a string, ensure it's UTC (ends with 'Z')
            if (!plainEvent.startTime.endsWith('Z') && !plainEvent.startTime.match(/[+-]\d{2}:?\d{2}$/)) {
              // Parse and convert to UTC ISO string
              const date = new Date(plainEvent.startTime);
              if (!isNaN(date.getTime())) {
                plainEvent.startTime = date.toISOString();
              }
            }
          }
        }
        
        if (plainEvent.endTime) {
          // If it's a Date object, convert to UTC ISO string
          if (plainEvent.endTime instanceof Date) {
            plainEvent.endTime = plainEvent.endTime.toISOString();
          } else if (typeof plainEvent.endTime === 'string') {
            // If it's already a string, ensure it's UTC (ends with 'Z')
            if (!plainEvent.endTime.endsWith('Z') && !plainEvent.endTime.match(/[+-]\d{2}:?\d{2}$/)) {
              // Parse and convert to UTC ISO string
              const date = new Date(plainEvent.endTime);
              if (!isNaN(date.getTime())) {
                plainEvent.endTime = date.toISOString();
              }
            }
          }
        }
        
        return plainEvent;
      });

      return {
        success: true,
        data: { events: plainEvents },
      };
    } catch (error) {
      console.error("❌ EventService.getAdminEvents - Error:", error);
      console.error("- Error message:", error.message);
      console.error("- Error stack:", error.stack);
      console.error("- Error name:", error.name);
      if (error.original) {
        console.error("- Original error:", error.original);
      }
      throw error;
    }
  }

  // Get single event by ID
  static async getEventById(adminId, eventId) {
    try {
      const event = await Event.findOne({
        where: {
          id: eventId,
          adminId: adminId,
          createdBy: "admin",
        },
        include: [
          {
            model: AC,
            as: "device",
            attributes: ["id", "name", "serialNumber"],
            required: false,
            include: [
              {
                model: Venue,
                as: "venue",
                attributes: ["id", "name"],
                required: false,
                include: [
                  {
                    model: Organization,
                    as: "organization",
                    attributes: ["id", "name"],
                    required: false,
                  },
                ],
              },
            ],
          },
        ],
      });

      if (!event) {
        throw new Error("Event not found");
      }

      return {
        success: true,
        data: { event },
      };
    } catch (error) {
      throw error;
    }
  }

  // Start event manually (admin) - supports both admin and manager events
  static async startEvent(adminId, eventId) {
    const transaction = await Event.sequelize.transaction();

    try {
      const { Op } = require("sequelize");
      const event = await Event.findOne({
        where: {
          id: eventId,
          adminId: adminId,
          [Op.or]: [
            { createdBy: "admin" },
            { createdBy: "manager" }, // Admin can also start manager events
          ],
        },
        transaction,
      });

      if (!event) {
        throw new Error("Event not found");
      }

      // If it's a manager event, use ManagerEventService
      if (event.createdBy === "manager") {
        const ManagerEventService = require("../../manager/services/managerEventService");
        await transaction.rollback(); // Rollback this transaction
        return await ManagerEventService.startEvent(event.managerId, eventId);
      }

      // Check if disabled first (before status checks)
      if (event.isDisabled) {
        throw new Error("Cannot start disabled event. Enable it first.");
      }

      if (event.status === "active") {
        throw new Error("Event is already active");
      }

      if (event.status === "completed" || event.status === "cancelled") {
        throw new Error(`Cannot start event with status: ${event.status}`);
      }

      // Update event status
      event.status = "active";
      event.startedAt = new Date();
      await event.save({ transaction });

      // Apply event settings
      await this.applyEventSettings(event, transaction);

      // Log activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: "START_EVENT",
          targetType: "ac", // Always device events
          targetId: event.deviceId,
          details: {
            eventId: event.id,
            eventName: event.name,
          },
        },
        { transaction }
      );

      await transaction.commit();

      // Send event status messages to ESP device and broadcast to frontend
      try {
        if (event.deviceId) {
          const device = await AC.findByPk(event.deviceId);
          if (device && device.serialNumber) {
            // Start temperature sync when event starts
            if (event.temperature !== null && event.temperature !== undefined) {
              await ESPService.startTemperatureSync(
                device.serialNumber,
                event.temperature
              );
              await ESPService.sendEventStatusMessage(
                device.serialNumber,
                "event temp",
                {
                  eventId: event.id,
                  temperature: event.temperature,
                }
              );
            }

            ESPService.broadcastToFrontend({
              type: "EVENT_STARTED",
              eventId: event.id,
              eventName: event.name,
              device_id: device.serialNumber,
              serialNumber: device.serialNumber,
              status: "active",
              startedAt: event.startedAt,
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (broadcastError) {
        console.error("⚠️ Error broadcasting event started:", broadcastError);
      }

      return {
        success: true,
        message: "Event started successfully",
        data: { event },
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Stop event manually (admin) - Turn device OFF - supports both admin and manager events
  static async stopEvent(adminId, eventId) {
    const transaction = await Event.sequelize.transaction();

    try {
      const { Op } = require("sequelize");
      const event = await Event.findOne({
        where: {
          id: eventId,
          adminId: adminId,
          [Op.or]: [
            { createdBy: "admin" },
            { createdBy: "manager" }, // Admin can also stop manager events
          ],
        },
        transaction,
      });

      if (!event) {
        throw new Error("Event not found");
      }

      // If it's a manager event, use ManagerEventService
      if (event.createdBy === "manager") {
        const ManagerEventService = require("../../manager/services/managerEventService");
        await transaction.rollback(); // Rollback this transaction
        return await ManagerEventService.stopEvent(event.managerId, eventId);
      }

      if (event.status !== "active") {
        throw new Error("Event is not active");
      }

      // Turn device OFF when event stops
      if (event.eventType === "device" && event.deviceId) {
        const device = await AC.findByPk(event.deviceId, { transaction });
        if (device) {
          device.isOn = false;
          await device.save({ transaction });

          // Send OFF command to ESP device
          if (device.serialNumber) {
            ESPService.sendPowerCommand(device.serialNumber, false);
            console.log(`✅ [EVENT] Turned OFF device ${device.serialNumber}`);

            // Send "event stop" message to ESP device
            ESPService.sendEventStatusMessage(
              device.serialNumber,
              "event stop",
              {
                eventId: event.id,
                eventName: event.name,
              }
            );
          }
        }
      }

      // Update event status
      event.status = "stopped";
      event.stoppedAt = new Date();
      await event.save({ transaction });

      // Log activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: "STOP_EVENT",
          targetType: "ac", // Always device events
          targetId: event.deviceId,
          details: {
            eventId: event.id,
            eventName: event.name,
          },
        },
        { transaction }
      );

      await transaction.commit();

      // Broadcast real-time update to frontend
      try {
        if (event.deviceId) {
          const device = await AC.findByPk(event.deviceId);
          if (device && device.serialNumber) {
            ESPService.broadcastToFrontend({
              type: "EVENT_STOPPED",
              eventId: event.id,
              eventName: event.name,
              device_id: device.serialNumber,
              serialNumber: device.serialNumber,
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (broadcastError) {
        console.error("⚠️ Error broadcasting event stopped:", broadcastError);
      }

      // Auto-delete event after 5 seconds
      setTimeout(async () => {
        try {
          const eventToDelete = await Event.findByPk(eventId);
          if (eventToDelete && eventToDelete.status === "stopped") {
            await eventToDelete.destroy();
            console.log(
              `🗑️ Auto-deleted stopped event: ${eventToDelete.name} (ID: ${eventToDelete.id})`
            );

            // Broadcast deletion to frontend
            try {
              if (event.deviceId) {
                const device = await AC.findByPk(event.deviceId);
                if (device && device.serialNumber) {
                  ESPService.broadcastToFrontend({
                    type: "EVENT_DELETED",
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
                "⚠️ Error broadcasting event deleted:",
                broadcastError
              );
            }
          }
        } catch (deleteError) {
          console.error(
            `❌ Error auto-deleting stopped event ${eventId}:`,
            deleteError
          );
        }
      }, 5000); // 5 seconds delay

      return {
        success: true,
        message: "Event stopped successfully. Device turned OFF.",
        data: { event },
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Auto-start manager events when admin event stops
  static async autoStartManagerEvents(adminEventId, transaction) {
    try {
      const managerEvents = await Event.findAll({
        where: {
          parentAdminEventId: adminEventId,
          status: "scheduled",
        },
        transaction,
      });

      for (const managerEvent of managerEvents) {
        managerEvent.status = "active";
        managerEvent.startedAt = new Date();
        managerEvent.autoStarted = true;
        await managerEvent.save({ transaction });

        // Apply event settings
        const ManagerEventService = require("../../manager/services/managerEventService");
        await ManagerEventService.applyEventSettings(managerEvent, transaction);
      }

      return managerEvents;
    } catch (error) {
      throw error;
    }
  }

  // Apply event settings - Turn device ON and set temperature
  static async applyEventSettings(event, transaction) {
    try {
      // Only device events are supported
      if (event.eventType === "device" && event.deviceId) {
        const device = await AC.findByPk(event.deviceId, { transaction });
        if (device) {
          // Get current temperature BEFORE updating (for pulse calculation)
          const currentTemp = device.temperature || 16;

          // Set temperature if provided
          if (event.temperature !== null) {
            device.temperature = event.temperature;
            device.lastTemperatureChange = new Date();
            device.changedBy = "admin"; // Admin event started
          }

          // Always turn device ON when event starts
          device.isOn = true;

          // Save device state first
          await device.save({ transaction });

          // Send commands to ESP device
          if (device.serialNumber) {
            // Send temperature sync if temperature is set (backend handles pulse calculation)
            if (event.temperature !== null) {
              // Use startTemperatureSync - backend will calculate pulses (supports negative pulses)
              await ESPService.startTemperatureSync(
                device.serialNumber,
                event.temperature
              );
              console.log(
                `✅ [EVENT] Starting temperature sync to ${event.temperature}°C for device ${device.serialNumber}`
              );
            }
            // Always send power ON command (using serial number)
            await ESPService.sendPowerCommand(device.serialNumber, true);
            console.log(`✅ [EVENT] Turned ON device ${device.serialNumber}`);
          }
        }
      }
    } catch (error) {
      console.error("Error applying event settings:", error);
      // Don't throw - event can still be marked as active
    }
  }

  // Update event - supports both admin and manager events
  static async updateEvent(adminId, eventId, updateData) {
    const transaction = await Event.sequelize.transaction();

    try {
      const { Op } = require("sequelize");
      const event = await Event.findOne({
        where: {
          id: eventId,
          adminId: adminId,
          [Op.or]: [
            { createdBy: "admin" },
            { createdBy: "manager" }, // Admin can also update manager events
          ],
        },
        transaction,
      });

      if (!event) {
        throw new Error("Event not found");
      }

      // If it's a manager event, use ManagerEventService
      if (event.createdBy === "manager") {
        const ManagerEventService = require("../../manager/services/managerEventService");
        await transaction.rollback(); // Rollback this transaction
        return await ManagerEventService.updateEvent(
          event.managerId,
          eventId,
          updateData
        );
      }

      if (event.status === "active") {
        throw new Error("Cannot update active event. Stop it first.");
      }

      // Store old values for comparison
      const oldValues = {
        name: event.name,
        startTime: event.startTime ? new Date(event.startTime) : null,
        endTime: event.endTime ? new Date(event.endTime) : null,
        temperature: event.temperature,
        powerOn: event.powerOn,
      };

      // Track what actually changed
      const changes = {};

      // Update allowed fields and track changes
      if (updateData.name !== undefined && updateData.name !== event.name) {
        changes.name = { old: event.name, new: updateData.name };
        event.name = updateData.name;
      }

      if (updateData.startTime !== undefined) {
        const newStartTime = new Date(updateData.startTime);
        if (newStartTime.getTime() !== oldValues.startTime?.getTime()) {
          changes.startTime = {
            old: oldValues.startTime?.toISOString(),
            new: newStartTime.toISOString(),
          };
          event.startTime = newStartTime;
        }
      }

      if (updateData.endTime !== undefined) {
        const newEndTime = new Date(updateData.endTime);
        if (newEndTime.getTime() !== oldValues.endTime?.getTime()) {
          changes.endTime = {
            old: oldValues.endTime?.toISOString(),
            new: newEndTime.toISOString(),
          };
          event.endTime = newEndTime;
        }
      }

      if (
        updateData.temperature !== undefined &&
        updateData.temperature !== event.temperature
      ) {
        changes.temperature = {
          old: event.temperature,
          new: updateData.temperature,
        };
        event.temperature = updateData.temperature;
      }

      // powerOn is always true for device events - don't allow changing it
      // Note: Frontend doesn't send powerOn anymore, but if it does, ignore it
      if (updateData.powerOn !== undefined) {
        // Keep powerOn as true (always true for device events)
        event.powerOn = true;
      }

      // Validate time range if both are updated
      if (
        updateData.startTime !== undefined ||
        updateData.endTime !== undefined
      ) {
        // Use updated values if provided, otherwise use existing values
        const finalStartTime =
          updateData.startTime !== undefined
            ? new Date(updateData.startTime)
            : event.startTime;
        const finalEndTime =
          updateData.endTime !== undefined
            ? new Date(updateData.endTime)
            : event.endTime;

        if (finalEndTime <= finalStartTime) {
          throw new Error("endTime must be after startTime");
        }
      }

      await event.save({ transaction });

      // Log activity with detailed changes
      await ActivityLog.create(
        {
          adminId: adminId,
          action: "UPDATE_EVENT",
          targetType: "ac", // Always device events
          targetId: event.deviceId,
          details: {
            eventId: event.id,
            eventName: event.name,
            changes: changes, // Show what actually changed (old vs new)
            changedFields: Object.keys(changes), // List of fields that changed
          },
        },
        { transaction }
      );

      await transaction.commit();

      // Return changes info in response
      return {
        success: true,
        message: "Event updated successfully",
        data: {
          event,
          changes: changes, // Include changes in response
          changedFields: Object.keys(changes),
        },
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Delete/Cancel event - supports both admin and manager events
  static async deleteEvent(adminId, eventId) {
    const transaction = await Event.sequelize.transaction();

    try {
      const { Op } = require("sequelize");
      const event = await Event.findOne({
        where: {
          id: eventId,
          adminId: adminId,
          [Op.or]: [
            { createdBy: "admin" },
            { createdBy: "manager" }, // Admin can also delete manager events
          ],
        },
        transaction,
      });

      if (!event) {
        throw new Error("Event not found");
      }

      // If it's a manager event, use ManagerEventService
      if (event.createdBy === "manager") {
        const ManagerEventService = require("../../manager/services/managerEventService");
        await transaction.rollback(); // Rollback this transaction
        return await ManagerEventService.deleteEvent(event.managerId, eventId);
      }

      if (event.status === "active") {
        throw new Error("Cannot delete active event. Stop it first.");
      }

      // Note: Manager events are now independent, so we don't cascade delete them
      // Each event is managed independently

      await event.destroy({ transaction });

      // Log activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: "DELETE_EVENT",
          targetType: "ac", // Always device events
          targetId: event.deviceId,
          details: {
            eventId: eventId,
            eventName: event.name,
          },
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: "Event deleted successfully",
        data: {},
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Disable event (admin) - also disables all related manager events - supports both admin and manager events
  static async disableEvent(adminId, eventId) {
    const transaction = await Event.sequelize.transaction();

    try {
      const { Op } = require("sequelize");
      const event = await Event.findOne({
        where: {
          id: eventId,
          adminId: adminId,
          [Op.or]: [
            { createdBy: "admin" },
            { createdBy: "manager" }, // Admin can also disable manager events
          ],
        },
        transaction,
      });

      if (!event) {
        throw new Error("Event not found");
      }

      // If it's a manager event, use ManagerEventService
      if (event.createdBy === "manager") {
        const ManagerEventService = require("../../manager/services/managerEventService");
        await transaction.rollback(); // Rollback this transaction
        return await ManagerEventService.disableEvent(event.managerId, eventId);
      }

      // Can only disable active or scheduled events
      if (!["active", "scheduled"].includes(event.status)) {
        throw new Error("Event must be active or scheduled to disable");
      }

      if (event.isDisabled) {
        throw new Error("Event is already disabled");
      }

      // Set originalEndTime if not set (for backward compatibility)
      if (!event.originalEndTime) {
        event.originalEndTime = event.endTime;
      }

      // Disable admin event
      event.isDisabled = true;
      event.disabledAt = new Date();
      await event.save({ transaction });

      // If event is active, turn device OFF
      if (
        event.status === "active" &&
        event.eventType === "device" &&
        event.deviceId
      ) {
        const device = await AC.findByPk(event.deviceId, { transaction });
        if (device) {
          device.isOn = false;
          await device.save({ transaction });

          // Send OFF command to ESP device
          if (device.serialNumber) {
            ESPService.sendPowerCommand(device.serialNumber, false);
            console.log(
              `✅ [EVENT] Disabled event - Turned OFF device ${device.serialNumber}`
            );

            // Send "disable" message to ESP device
            ESPService.sendEventStatusMessage(device.serialNumber, "disable", {
              eventId: event.id,
              eventName: event.name,
            });
          }
        }
      }

      // Log activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: "DISABLE_EVENT",
          targetType: "ac", // Always device events
          targetId: event.deviceId,
          details: {
            eventId: event.id,
            eventName: event.name,
          },
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: "Event disabled successfully",
        data: { event },
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Enable event (admin) - also enables all related manager events - supports both admin and manager events
  static async enableEvent(adminId, eventId) {
    const transaction = await Event.sequelize.transaction();

    try {
      const { Op } = require("sequelize");
      const event = await Event.findOne({
        where: {
          id: eventId,
          adminId: adminId,
          [Op.or]: [
            { createdBy: "admin" },
            { createdBy: "manager" }, // Admin can also enable manager events
          ],
        },
        transaction,
      });

      if (!event) {
        throw new Error("Event not found");
      }

      // If it's a manager event, use ManagerEventService
      if (event.createdBy === "manager") {
        const ManagerEventService = require("../../manager/services/managerEventService");
        await transaction.rollback(); // Rollback this transaction
        return await ManagerEventService.enableEvent(event.managerId, eventId);
      }

      if (!event.isDisabled) {
        throw new Error("Event is not disabled");
      }

      // Check if original end time has passed
      // Times are stored in UTC, so we compare UTC times
      const now = new Date();
      const originalEndTime = event.originalEndTime || event.endTime;

      // Log in Pakistan time for debugging
      console.log(`📅 Event enable check - PKT:`, {
        now: timezoneUtils.formatPakistanTime(now, "YYYY-MM-DD HH:mm:ss"),
        originalEndTime: timezoneUtils.formatPakistanTime(
          originalEndTime,
          "YYYY-MM-DD HH:mm:ss"
        ),
        timezone: "Asia/Karachi (PKT - UTC+5)",
      });

      if (now >= originalEndTime) {
        // Event has ended, mark as completed
        event.status = "completed";
        event.isDisabled = false;
        event.completedAt = now;
        event.disabledAt = null;
        await event.save({ transaction });

        // Auto-delete completed event from database
        await event.destroy({ transaction });
        console.log(
          `🗑️ Auto-deleted completed event: ${event.name} (ID: ${event.id}) - Cannot enable, end time passed`
        );

        await transaction.commit();

        return {
          success: false,
          message:
            "Cannot enable event. Original end time has passed. Event has been marked as completed and deleted.",
          data: { event },
        };
      }

      // Calculate disabled duration
      // Safety check: disabledAt should always be set if isDisabled is true
      if (!event.disabledAt) {
        throw new Error(
          "Event is marked as disabled but disabledAt timestamp is missing. Cannot calculate duration."
        );
      }

      const disabledDuration = now - event.disabledAt;
      const newTotalDisabledDuration =
        (event.totalDisabledDuration || 0) + disabledDuration;

      // Extend end time by disabled duration
      const newEndTime = new Date(event.endTime.getTime() + disabledDuration);
      event.endTime = newEndTime;
      event.isDisabled = false;
      event.totalDisabledDuration = newTotalDisabledDuration;
      event.disabledAt = null;
      await event.save({ transaction });

      // If event was active, turn device ON again
      if (event.status === "active") {
        await this.applyEventSettings(event, transaction);
        console.log(
          `✅ [EVENT] Enabled event - Turned ON device for event ${event.id}`
        );

        // Send "enable" message to ESP device
        if (event.deviceId) {
          const device = await AC.findByPk(event.deviceId);
          if (device && device.serialNumber) {
            ESPService.sendEventStatusMessage(device.serialNumber, "enable", {
              eventId: event.id,
              eventName: event.name,
            });
          }
        }
      }

      // Log activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: "ENABLE_EVENT",
          targetType: "ac", // Always device events
          targetId: event.deviceId,
          details: {
            eventId: event.id,
            eventName: event.name,
            disabledDuration: disabledDuration,
            newEndTime: newEndTime,
          },
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: `Event enabled successfully. End time extended by ${Math.round(
          disabledDuration / 1000 / 60
        )} minutes.`,
        data: {
          event,
          disabledDuration: disabledDuration,
          newEndTime: newEndTime,
        },
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Note: revertEventSettings is no longer used - we directly turn device OFF in disable method

  // Helper function to get next occurrence date for recurring events
  static getNextOccurrenceDate(startDate, daysOfWeek) {
    // Use moment-timezone to properly handle date in PKT
    let date;
    if (typeof startDate === "string") {
      // Parse as PKT date
      date = timezoneUtils.toPakistanTime(startDate, "YYYY-MM-DD");
    } else {
      date = timezoneUtils.toPakistanTime(startDate);
    }

    // Set to start of day in PKT
    date.startOf("day");

    // Get day of week (0=Sunday, 1=Monday, etc.)
    let currentDay = date.day();

    // Check if start date is one of the selected days
    if (daysOfWeek.includes(currentDay)) {
      return date.toDate(); // Return as Date object
    }

    // Find next occurrence
    for (let i = 0; i < 7; i++) {
      date.add(1, "day");
      currentDay = date.day();
      if (daysOfWeek.includes(currentDay)) {
        return date.toDate(); // Return as Date object
      }
    }

    return null; // No occurrence found
  }
}

module.exports = EventService;
