const Event = require("../../../models/Event/event");
const Organization = require("../../../models/Organization/organization");
const AC = require("../../../models/AC/ac");
const Manager = require("../../../models/Roleaccess/manager");
const Venue = require("../../../models/Venue/venue");
const { Op, Sequelize } = require("sequelize");
const Services = require("../../../services");
const ESPService = Services.getESPService();
const timezoneUtils = require("../../../utils/timezone");

class ManagerEventService {
  // Create a new event (manager) - independent, no parent admin event required
  static async createEvent(managerId, eventData) {
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
        if (
          !eventData.daysOfWeek ||
          !Array.isArray(eventData.daysOfWeek) ||
          eventData.daysOfWeek.length === 0
        ) {
          throw new Error("daysOfWeek array is required for recurring events");
        }

        // Validate daysOfWeek values (0-6, where 0=Sunday, 1=Monday, etc.)
        const validDays = eventData.daysOfWeek.every(
          (day) => Number.isInteger(day) && day >= 0 && day <= 6
        );
        if (!validDays) {
          throw new Error(
            "daysOfWeek must be an array of integers between 0-6 (0=Sunday, 1=Monday, etc.)"
          );
        }

        if (!eventData.recurringStartDate) {
          throw new Error(
            "recurringStartDate is required for recurring events"
          );
        }

        if (!eventData.recurringEndDate) {
          throw new Error("recurringEndDate is required for recurring events");
        }

        if (!eventData.timeStart) {
          throw new Error(
            "timeStart is required for recurring events (format: HH:mm:ss)"
          );
        }

        if (!eventData.timeEnd) {
          throw new Error(
            "timeEnd is required for recurring events (format: HH:mm:ss)"
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

        // Validate time format (HH:mm:ss)
        const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
        if (!timeRegex.test(eventData.timeStart)) {
          throw new Error(
            "timeStart must be in format HH:mm:ss (e.g., 09:00:00)"
          );
        }
        if (!timeRegex.test(eventData.timeEnd)) {
          throw new Error(
            "timeEnd must be in format HH:mm:ss (e.g., 17:00:00)"
          );
        }

        // Validate time range
        const [startHour, startMin, startSec] = eventData.timeStart
          .split(":")
          .map(Number);
        const [endHour, endMin, endSec] = eventData.timeEnd
          .split(":")
          .map(Number);
        const startTimeMs =
          startHour * 3600000 + startMin * 60000 + startSec * 1000;
        const endTimeMs = endHour * 3600000 + endMin * 60000 + endSec * 1000;

        if (endTimeMs <= startTimeMs) {
          throw new Error("timeEnd must be after timeStart");
        }

        // For recurring events, startTime and endTime are set to recurringStartDate + timeStart/End
        // These are used as template dates, actual instances will be created by scheduler
        const firstOccurrenceDate = new Date(recurringStartDate);
        firstOccurrenceDate.setHours(startHour, startMin, startSec, 0);
        startTime = firstOccurrenceDate;

        const firstEndDate = new Date(recurringStartDate);
        firstEndDate.setHours(endHour, endMin, endSec, 0);
        endTime = firstEndDate;

        // If end time is before start time on same day, it means it spans to next day
        if (endTime <= startTime) {
          endTime.setDate(endTime.getDate() + 1);
        }
      } else {
        // For non-recurring events, use startTime and endTime as before
        // Note: Times are received in UTC from frontend, but we validate them
        // The frontend sends UTC times converted from Pakistan local time
        // CRITICAL: Frontend sends ISO strings in UTC format (with 'Z' or without)
        // We MUST ensure they are parsed as UTC, not local time
        let startTimeStr = String(eventData.startTime).trim();
        let endTimeStr = String(eventData.endTime).trim();

        // CRITICAL FIX: Frontend already sends UTC time (e.g., "2025-12-21T03:40:00.000Z")
        // We must parse it as UTC and store it as-is, without any timezone conversion
        // Ensure ISO strings are treated as UTC
        // If no timezone indicator, assume it's UTC and add 'Z'
        if (
          startTimeStr.includes("T") &&
          !startTimeStr.endsWith("Z") &&
          !startTimeStr.match(/[+-]\d{2}:?\d{2}$/)
        ) {
          startTimeStr = startTimeStr.replace(/\.\d{3,}$/, "") + "Z";
        }
        if (
          endTimeStr.includes("T") &&
          !endTimeStr.endsWith("Z") &&
          !endTimeStr.match(/[+-]\d{2}:?\d{2}$/)
        ) {
          endTimeStr = endTimeStr.replace(/\.\d{3,}$/, "") + "Z";
        }

        // CRITICAL: Parse as UTC explicitly
        startTime = new Date(startTimeStr);
        endTime = new Date(endTimeStr);

        // CRITICAL: Verify the parsed times are correct UTC
        // Extract expected UTC time from the ISO string
        const startTimeMatch = startTimeStr.match(/T(\d{2}):(\d{2})/);
        const endTimeMatch = endTimeStr.match(/T(\d{2}):(\d{2})/);

        if (startTimeMatch && endTimeMatch) {
          const expectedStartHour = parseInt(startTimeMatch[1], 10);
          const expectedStartMin = parseInt(startTimeMatch[2], 10);
          const expectedEndHour = parseInt(endTimeMatch[1], 10);
          const expectedEndMin = parseInt(endTimeMatch[2], 10);

          // Verify parsing is correct
          if (
            startTime.getUTCHours() !== expectedStartHour ||
            startTime.getUTCMinutes() !== expectedStartMin
          ) {
            console.error("❌ CRITICAL: Start time parsing mismatch!", {
              received: startTimeStr,
              expectedUTC: `${String(expectedStartHour).padStart(
                2,
                "0"
              )}:${String(expectedStartMin).padStart(2, "0")} UTC`,
              parsedUTC: `${String(startTime.getUTCHours()).padStart(
                2,
                "0"
              )}:${String(startTime.getUTCMinutes()).padStart(2, "0")} UTC`,
            });
            // Force correct UTC time
            startTime = new Date(
              Date.UTC(
                startTime.getUTCFullYear(),
                startTime.getUTCMonth(),
                startTime.getUTCDate(),
                expectedStartHour,
                expectedStartMin,
                0,
                0
              )
            );
          }

          if (
            endTime.getUTCHours() !== expectedEndHour ||
            endTime.getUTCMinutes() !== expectedEndMin
          ) {
            console.error("❌ CRITICAL: End time parsing mismatch!", {
              received: endTimeStr,
              expectedUTC: `${String(expectedEndHour).padStart(
                2,
                "0"
              )}:${String(expectedEndMin).padStart(2, "0")} UTC`,
              parsedUTC: `${String(endTime.getUTCHours()).padStart(
                2,
                "0"
              )}:${String(endTime.getUTCMinutes()).padStart(2, "0")} UTC`,
            });
            // Force correct UTC time
            endTime = new Date(
              Date.UTC(
                endTime.getUTCFullYear(),
                endTime.getUTCMonth(),
                endTime.getUTCDate(),
                expectedEndHour,
                expectedEndMin,
                0,
                0
              )
            );
          }
        }

        // Verify dates are valid
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          throw new Error("Invalid startTime or endTime format");
        }

        // Log for debugging - show what was received and how it was parsed
        console.log("📅 Manager Event time parsing (non-recurring):", {
          receivedStartTime: eventData.startTime,
          parsedStartTime: startTime.toISOString(),
          receivedEndTime: eventData.endTime,
          parsedEndTime: endTime.toISOString(),
          startTimePKT: timezoneUtils.formatPakistanTime(
            startTime,
            "YYYY-MM-DD HH:mm:ss"
          ),
          endTimePKT: timezoneUtils.formatPakistanTime(
            endTime,
            "YYYY-MM-DD HH:mm:ss"
          ),
        });

        if (endTime <= startTime) {
          throw new Error("endTime must be after startTime");
        }
      }

      // Log times in Pakistan/Karachi timezone for debugging
      const currentPKT = timezoneUtils.getCurrentPakistanTimeString(
        "YYYY-MM-DD HH:mm:ss"
      );
      console.log(`📅 Manager Event creation - Time details:`, {
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

      // Get manager to check admin
      const manager = await Manager.findByPk(managerId, { transaction });
      if (!manager) {
        throw new Error("Manager not found");
      }

      // Verify ownership/assignment - manager can only create events on their organization/devices
      // ACs are connected to organizations through venues, so we need to check via venues
      // First, get all organizations assigned to this manager
      const managerOrgs = await Organization.findAll({
        where: { managerId: managerId },
        attributes: ["id", "name", "adminId"],
        transaction,
      });

      const orgIds = managerOrgs.map((org) => org.id);

      console.log(
        `🔍 [EVENT-CREATE] Manager ${managerId} has ${orgIds.length} organizations:`,
        orgIds
      );

      if (orgIds.length === 0) {
        throw new Error("No organizations assigned to this manager");
      }

      // Get all venues under manager's organizations
      const adminId = managerOrgs[0]?.adminId;

      if (!adminId) {
        throw new Error("Manager admin not found");
      }

      // Get venues for additional lookup (some ACs might reference venue IDs)
      const venues = await Venue.findAll({
        where: {
          adminId: adminId,
          organizationId: { [Op.in]: orgIds },
        },
        attributes: ["id"],
        transaction,
      });
      const venueIds = venues.map((v) => v.id);
      console.log(
        `🔍 [EVENT-CREATE] Found ${venueIds.length} venues:`,
        venueIds
      );

      // ACs have venueId which references organizations table
      // But to be safe, check both orgIds and venueIds (in case of data inconsistency)
      // Combine both for lookup
      const allPossibleIds = [...orgIds, ...venueIds];
      const uniqueIds = [...new Set(allPossibleIds)];
      console.log(
        `🔍 [EVENT-CREATE] Checking device with venueId in:`,
        uniqueIds
      );

      // Verify device belongs to manager if deviceId is provided
      if (eventData.deviceId) {
        console.log(
          `🔍 [EVENT-CREATE] Looking for device ${eventData.deviceId} with venueId in:`,
          uniqueIds
        );

        // First, check if device exists at all
        const deviceExists = await AC.findByPk(eventData.deviceId, {
          attributes: ["id", "name", "venueId"],
          transaction,
        });

        if (deviceExists) {
          console.log(
            `🔍 [EVENT-CREATE] Device ${eventData.deviceId} exists with venueId: ${deviceExists.venueId}`
          );
          console.log(
            `🔍 [EVENT-CREATE] Checking if venueId ${deviceExists.venueId} is in orgIds:`,
            orgIds.includes(deviceExists.venueId)
          );
          console.log(
            `🔍 [EVENT-CREATE] Checking if venueId ${deviceExists.venueId} is in venueIds:`,
            venueIds.includes(deviceExists.venueId)
          );
        } else {
          console.log(
            `❌ [EVENT-CREATE] Device ${eventData.deviceId} does not exist in database`
          );
        }

        // Find AC where venueId matches manager's organizations OR venues
        const device = await AC.findOne({
          where: {
            id: eventData.deviceId,
            venueId: { [Op.in]: uniqueIds },
          },
          include: [
            {
              model: Venue,
              as: "venue",
              required: false,
              attributes: ["id", "name", "organizationId"],
            },
            {
              model: Organization,
              as: "organization",
              required: false,
              attributes: ["id", "name", "adminId"],
            },
          ],
          transaction,
        });

        if (!device) {
          console.error(
            `❌ [EVENT-CREATE] Device ${eventData.deviceId} not found or venueId (${deviceExists?.venueId}) does not match manager's orgIds:`,
            orgIds
          );
          throw new Error("Device not found or not assigned to this manager");
        }

        console.log(
          `✅ [EVENT-CREATE] Device ${device.id} (${device.name}) found with venueId: ${device.venueId}`
        );
      }

      // No organization events - only device events are allowed

      // CONFLICT CHECK: Check if there's an admin event at the same time on same device
      // If admin event exists, block manager from creating event
      const conflictingAdminEvent = await Event.findOne({
        where: {
          createdBy: "admin",
          adminId: manager.adminId,
          eventType: "device", // Only device events now
          deviceId: eventData.deviceId, // Only check device conflicts
          isDisabled: false, // Only check non-disabled admin events
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

      if (conflictingAdminEvent) {
        throw new Error(
          "There is an admin event scheduled for this device at this time. Please choose a different time or device."
        );
      }

      // Get device to set temperature when event is created (device state is NOT changed)
      // Reuse the same validation - device was already validated above, so we can use the same uniqueIds
      // But we need to fetch the device again with full details for temperature setting
      const device = await AC.findOne({
        where: {
          id: eventData.deviceId,
          venueId: { [Op.in]: uniqueIds },
        },
        include: [
          {
            model: Venue,
            as: "venue",
            required: false,
            attributes: ["id", "name", "organizationId"],
          },
          {
            model: Organization,
            as: "organization",
            required: false,
            attributes: ["id", "name", "adminId"],
          },
        ],
        transaction,
      });

      // Determine initial event status
      // For non-recurring events: Start immediately if device is ON, or turn device ON and start
      // For recurring events: Keep as scheduled (templates)
      let initialStatus = "scheduled";
      let shouldStartImmediately = false;

      if (!isRecurring && device) {
        // Non-recurring event: Start immediately
        if (device.isOn) {
          // Device is ON → Start event immediately
          initialStatus = "active";
          shouldStartImmediately = true;
        } else {
          // Device is OFF → Turn ON and start event immediately
          device.isOn = true;
          device.lastPowerChangeAt = new Date();
          device.lastPowerChangeBy = "manager";
          initialStatus = "active";
          shouldStartImmediately = true;
        }
      }

      // Set temperature when event is created
      if (device) {
        device.temperature = temperature; // Set temperature when event is created
        device.lastTemperatureChange = new Date();
        device.changedBy = "manager"; // Manager created the event
        await device.save({ transaction });
      }

      // CRITICAL: Sequelize's timezone: "+05:00" setting causes it to convert dates
      // CRITICAL: Frontend sends UTC ISO strings (e.g., "2025-12-21T11:54:00.000Z")
      // PostgreSQL TIMESTAMPTZ will automatically store as UTC
      // Use Date objects directly - Sequelize will handle UTC conversion properly with TIMESTAMPTZ columns

      // Get UTC timestamps as ISO strings (already in UTC format)
      const startTimeUTCString = startTime.toISOString();
      const endTimeUTCString = endTime.toISOString();

      // CRITICAL: Verify the UTC times are correct before storing
      console.log("🔍 [MANAGER] Pre-storage UTC verification:", {
        startTimeISO: startTimeUTCString,
        startTimeUTC: `${String(startTime.getUTCHours()).padStart(
          2,
          "0"
        )}:${String(startTime.getUTCMinutes()).padStart(2, "0")} UTC`,
        endTimeISO: endTimeUTCString,
        endTimeUTC: `${String(endTime.getUTCHours()).padStart(2, "0")}:${String(
          endTime.getUTCMinutes()
        ).padStart(2, "0")} UTC`,
        receivedFromFrontend: {
          startTime: eventData.startTime,
          endTime: eventData.endTime,
        },
      });

      // CRITICAL: Frontend sends UTC ISO strings (e.g., "2025-12-21T11:54:00.000Z")
      // PostgreSQL TIMESTAMPTZ will automatically store as UTC
      // Use Date objects directly - Sequelize will handle UTC conversion properly
      // No need for Sequelize.literal - just use the Date objects

      // Create manager event - ONLY device events
      const eventDataToCreate = {
        name: eventData.name,
        eventType: "device", // Always device
        deviceId: eventData.deviceId,
        organizationId: null, // No organization events
        createdBy: "manager",
        adminId: manager.adminId,
        managerId: managerId,
        startTime: startTime, // Date object - Sequelize will store as UTC TIMESTAMPTZ
        endTime: endTime, // Date object - Sequelize will store as UTC TIMESTAMPTZ
        originalEndTime: endTime, // Store original end time
        temperature: temperature, // Temperature is required
        powerOn: true, // Event will turn device ON when it starts
        status: initialStatus, // "active" for immediate start, "scheduled" for recurring
        parentAdminEventId: null, // No parent required - independent event
        isDisabled: false,
      };

      // Add recurring event fields if this is a recurring event
      if (isRecurring) {
        eventDataToCreate.isRecurring = true;
        eventDataToCreate.recurringType = "weekly";
        eventDataToCreate.daysOfWeek = eventData.daysOfWeek;
        eventDataToCreate.recurringStartDate = new Date(
          eventData.recurringStartDate
        );
        eventDataToCreate.recurringEndDate = new Date(
          eventData.recurringEndDate
        );
        eventDataToCreate.timeStart = eventData.timeStart;
        eventDataToCreate.timeEnd = eventData.timeEnd;
        eventDataToCreate.parentRecurringEventId = null; // This is the parent template
      }

      // CRITICAL: Log what we're about to store
      console.log("📅 Storing manager event with times:", {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        startTimeUTC: `${String(startTime.getUTCHours()).padStart(
          2,
          "0"
        )}:${String(startTime.getUTCMinutes()).padStart(2, "0")} UTC`,
        endTimeUTC: `${String(endTime.getUTCHours()).padStart(2, "0")}:${String(
          endTime.getUTCMinutes()
        ).padStart(2, "0")} UTC`,
        startTimePKT: timezoneUtils.formatPakistanTime(
          startTime,
          "YYYY-MM-DD HH:mm:ss"
        ),
        endTimePKT: timezoneUtils.formatPakistanTime(
          endTime,
          "YYYY-MM-DD HH:mm:ss"
        ),
      });

      const event = await Event.create(eventDataToCreate, { transaction });

      // CRITICAL: Log what was actually stored
      console.log("📅 Manager event stored, retrieved times:", {
        startTime: event.startTime ? event.startTime.toISOString() : "null",
        endTime: event.endTime ? event.endTime.toISOString() : "null",
        startTimeUTC: event.startTime
          ? `${String(event.startTime.getUTCHours()).padStart(2, "0")}:${String(
              event.startTime.getUTCMinutes()
            ).padStart(2, "0")} UTC`
          : "null",
        endTimeUTC: event.endTime
          ? `${String(event.endTime.getUTCHours()).padStart(2, "0")}:${String(
              event.endTime.getUTCMinutes()
            ).padStart(2, "0")} UTC`
          : "null",
        startTimePKT: event.startTime
          ? timezoneUtils.formatPakistanTime(
              event.startTime,
              "YYYY-MM-DD HH:mm:ss"
            )
          : "null",
        endTimePKT: event.endTime
          ? timezoneUtils.formatPakistanTime(
              event.endTime,
              "YYYY-MM-DD HH:mm:ss"
            )
          : "null",
      });

      // If event should start immediately, apply event settings
      if (shouldStartImmediately) {
        event.startedAt = new Date();
        await event.save({ transaction });
        await this.applyEventSettings(event, transaction);
        console.log(
          `✅ [EVENT-CREATE] Manager event started immediately - Device ${
            device.isOn ? "was ON" : "turned ON"
          }`
        );
      }

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

      return {
        success: true,
        message: "Event created successfully",
        data: { event },
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

  // Get all events for manager
  static async getManagerEvents(managerId, filters = {}) {
    try {
      const manager = await Manager.findByPk(managerId);
      if (!manager) {
        throw new Error("Manager not found");
      }

      const where = {
        managerId: managerId,
        createdBy: "manager",
      };

      // Apply filters
      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.eventType) {
        where.eventType = filters.eventType;
      }

      // By default, include all events (active, scheduled, completed, disabled)
      // Only filter by isDisabled if explicitly requested
      if (filters.includeDisabled === false) {
        where.isDisabled = false;
      }
      // If includeDisabled is true or not specified, include all events

      const events = await Event.findAll({
        where,
        include: [
          {
            model: AC,
            as: "device",
            required: false,
            attributes: [
              "id",
              "name",
              "serialNumber",
              "temperature",
              "isOn",
              "venueId",
            ],
          },
          {
            model: Organization,
            as: "organization",
            required: false,
            attributes: ["id", "name", "managerId"],
          },
          {
            model: Event,
            as: "parentAdminEvent",
            required: false,
            attributes: ["id", "name", "status", "startTime", "endTime"],
          },
        ],
        order: [
          ["isDisabled", "ASC"], // Show enabled events first
          ["startTime", "ASC"], // Then sort by start time
        ],
      });

      console.log(
        `📅 [MANAGER-EVENTS] Found ${events.length} events for manager ${managerId}`
      );

      // CRITICAL: Convert Sequelize instances to plain objects and ensure dates are UTC
      const plainEvents = events.map((event) => {
        const plainEvent = event.get({ plain: true });

        // CRITICAL FIX: Ensure dates are in UTC format
        // Sequelize might return dates with timezone conversion applied
        // We need to ensure they're returned as UTC ISO strings
        if (plainEvent.startTime) {
          // If it's a Date object, convert to UTC ISO string
          if (plainEvent.startTime instanceof Date) {
            plainEvent.startTime = plainEvent.startTime.toISOString();
          } else if (typeof plainEvent.startTime === "string") {
            // If it's already a string, ensure it's UTC (ends with 'Z')
            if (
              !plainEvent.startTime.endsWith("Z") &&
              !plainEvent.startTime.match(/[+-]\d{2}:?\d{2}$/)
            ) {
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
          } else if (typeof plainEvent.endTime === "string") {
            // If it's already a string, ensure it's UTC (ends with 'Z')
            if (
              !plainEvent.endTime.endsWith("Z") &&
              !plainEvent.endTime.match(/[+-]\d{2}:?\d{2}$/)
            ) {
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
        message: `Found ${events.length} event(s)`,
        data: { events: plainEvents },
        count: events.length,
      };
    } catch (error) {
      console.error("Get manager events error:", error);
      throw error;
    }
  }

  // Get single event by ID
  static async getEventById(managerId, eventId) {
    try {
      const event = await Event.findOne({
        where: {
          id: eventId,
          managerId: managerId,
          createdBy: "manager",
        },
        include: [
          {
            model: AC,
            as: "device",
            attributes: ["id", "name", "serialNumber"],
          },
          {
            model: Organization,
            as: "organization",
            attributes: ["id", "name"],
          },
          {
            model: Event,
            as: "parentAdminEvent",
            attributes: ["id", "name", "status", "startTime", "endTime"],
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

  // Start event manually (manager)
  static async startEvent(managerId, eventId) {
    const transaction = await Event.sequelize.transaction();

    try {
      const event = await Event.findOne({
        where: {
          id: eventId,
          managerId: managerId,
          createdBy: "manager",
        },
        transaction,
      });

      if (!event) {
        throw new Error("Event not found");
      }

      if (event.status === "active") {
        throw new Error("Event is already active");
      }

      if (event.status === "completed" || event.status === "cancelled") {
        throw new Error(`Cannot start event with status: ${event.status}`);
      }

      // Check if disabled
      if (event.isDisabled) {
        throw new Error("Cannot start disabled event. Enable it first.");
      }

      // CONFLICT CHECK: Check if there's an active admin event on same device
      // Manager event cannot start if admin event is active on same device
      if (event.eventType === "device" && event.deviceId) {
        const conflictingAdminEvent = await Event.findOne({
          where: {
            createdBy: "admin",
            adminId: event.adminId,
            eventType: "device",
            deviceId: event.deviceId,
            isDisabled: false,
            status: "active",
          },
          transaction,
        });
        if (conflictingAdminEvent) {
          throw new Error(
            "There is an admin event currently active on this device. Please wait for it to complete or stop it first."
          );
        }
      }

      // Update event status
      event.status = "active";
      event.startedAt = new Date();
      await event.save({ transaction });

      // Apply event settings
      await this.applyEventSettings(event, transaction);

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

  // Stop event manually (manager) - Turn device OFF
  static async stopEvent(managerId, eventId) {
    const transaction = await Event.sequelize.transaction();

    try {
      const event = await Event.findOne({
        where: {
          id: eventId,
          managerId: managerId,
          createdBy: "manager",
        },
        transaction,
      });

      if (!event) {
        throw new Error("Event not found");
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
          }
        }
      }

      // Update event status
      event.status = "stopped";
      event.stoppedAt = new Date();
      event.autoEnded = true;
      await event.save({ transaction });

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
              `🗑️ Auto-deleted stopped manager event: ${eventToDelete.name} (ID: ${eventToDelete.id})`
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

  // Apply event settings - Turn device ON and set temperature
  static async applyEventSettings(event, transaction) {
    try {
      // Only device events are supported
      if (event.eventType === "device" && event.deviceId) {
        const device = await AC.findByPk(event.deviceId, { transaction });
        if (device) {
          // Get current temperature BEFORE updating (for pulse calculation)
          const currentTemp = device.temperature || 16;
          const wasDeviceOn = device.isOn || false;

          // Set temperature if provided
          if (event.temperature !== null) {
            device.temperature = event.temperature;
            device.lastTemperatureChange = new Date();
            device.changedBy = "manager"; // Manager event started
          }

          // Check device status: If OFF, turn ON; If ON, keep ON
          if (!wasDeviceOn) {
            // Device is OFF - turn it ON at start time
            device.isOn = true;
            console.log(
              `🔌 [EVENT] Device ${
                device.serialNumber || device.id
              } was OFF - Turning ON at event start time`
            );
          } else {
            // Device is already ON - event will start normally
            console.log(
              `✅ [EVENT] Device ${
                device.serialNumber || device.id
              } is already ON - Event starting normally`
            );
          }

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

            // Only send power ON command if device was OFF
            if (!wasDeviceOn) {
              await ESPService.sendPowerCommand(device.serialNumber, true);
              console.log(
                `✅ [EVENT] Turned ON device ${device.serialNumber} at event start time`
              );
            } else {
              console.log(
                `✅ [EVENT] Device ${device.serialNumber} already ON - Event started successfully`
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Error applying event settings:", error);
      // Don't throw - event can still be marked as active
    }
  }

  // Update event
  static async updateEvent(managerId, eventId, updateData) {
    const transaction = await Event.sequelize.transaction();

    try {
      const event = await Event.findOne({
        where: {
          id: eventId,
          managerId: managerId,
          createdBy: "manager",
        },
        transaction,
      });

      if (!event) {
        throw new Error("Event not found");
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
        if (event.endTime <= event.startTime) {
          throw new Error("endTime must be after startTime");
        }
      }

      await event.save({ transaction });

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

  // Delete/Cancel event
  static async deleteEvent(managerId, eventId) {
    const transaction = await Event.sequelize.transaction();

    try {
      const event = await Event.findOne({
        where: {
          id: eventId,
          managerId: managerId,
          createdBy: "manager",
        },
        transaction,
      });

      if (!event) {
        throw new Error("Event not found");
      }

      if (event.status === "active") {
        throw new Error("Cannot delete active event. Stop it first.");
      }

      await event.destroy({ transaction });

      await transaction.commit();

      return {
        success: true,
        message: "Event deleted successfully",
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Disable event (manager)
  static async disableEvent(managerId, eventId) {
    const transaction = await Event.sequelize.transaction();

    try {
      const event = await Event.findOne({
        where: {
          id: eventId,
          managerId: managerId,
          createdBy: "manager",
        },
        transaction,
      });

      if (!event) {
        throw new Error("Event not found");
      }

      // Can only disable active or scheduled events
      if (!["active", "scheduled"].includes(event.status)) {
        throw new Error("Event must be active or scheduled to disable");
      }

      if (event.isDisabled) {
        throw new Error("Event is already disabled");
      }

      // Set originalEndTime if not set
      if (!event.originalEndTime) {
        event.originalEndTime = event.endTime;
      }

      // Disable manager event
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
          }
        }
      }

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

  // Enable event (manager)
  static async enableEvent(managerId, eventId) {
    const transaction = await Event.sequelize.transaction();

    try {
      const event = await Event.findOne({
        where: {
          id: eventId,
          managerId: managerId,
          createdBy: "manager",
        },
        transaction,
      });

      if (!event) {
        throw new Error("Event not found");
      }

      if (!event.isDisabled) {
        throw new Error("Event is not disabled");
      }

      // Check if original end time has passed
      const now = new Date();
      const originalEndTime = event.originalEndTime || event.endTime;

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
      }

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
}

module.exports = ManagerEventService;
