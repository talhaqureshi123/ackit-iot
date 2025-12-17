const AC = require("../../../models/AC/ac");
const Organization = require("../../../models/Organization/organization");
const Venue = require("../../../models/Venue/venue");
const ActivityLog = require("../../../models/Activity log/activityLog");
const { Op } = require("sequelize");

class ACService {
  // Generate unique serial number
  static async generateSerialNumber() {
    const prefix = "AC";
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0"); // 3-digit random number

    let serialNumber = `${prefix}-${timestamp}-${random}`;

    // Check if serial number already exists
    let exists = await AC.findOne({ where: { serialNumber } });
    let counter = 1;

    while (exists) {
      serialNumber = `${prefix}-${timestamp}-${random}-${counter}`;
      exists = await AC.findOne({ where: { serialNumber } });
      counter++;
    }

    console.log(`🔢 Generated unique serial number: ${serialNumber}`);
    return serialNumber;
  }

  // Generate base64 key for AC device (deterministic from serial number)
  // Same serial number always generates same key - allows ESP32 to use this as device_id
  static generateBase64Key(serialNumber) {
    if (!serialNumber) {
      throw new Error("Serial number is required to generate base64 key");
    }
    const crypto = require("crypto");
    // Use hash-based approach: same serial number always generates same key
    // This allows ESP32 to use this key as device_id
    const hash = crypto
      .createHash("sha256")
      .update(serialNumber)
      .digest("base64");
    // Take first 32 characters for shorter key
    const base64Key = hash.substring(0, 32);
    console.log(
      `🔑 Generated base64 key (from serial ${serialNumber}): ${base64Key}`
    );
    return base64Key;
  }

  // Helper method to ensure AC has a key (generates if missing)
  static async ensureACHasKey(ac) {
    if (!ac.key && ac.serialNumber) {
      const key = ACService.generateBase64Key(ac.serialNumber);
      await ac.update({ key: key });
      console.log(
        `🔑 Generated and saved key for AC ${ac.serialNumber}: ${key}`
      );
      return key;
    }
    return ac.key;
  }

  // Create a new AC device
  static async createAC(adminId, acData) {
    const transaction = await AC.sequelize.transaction();

    try {
      console.log("🌡️ ACService - Creating AC with data:");
      console.log("- acData:", acData);
      console.log("- adminId:", adminId);

      // Validate required fields
      console.log("🔍 ACService validation:");
      console.log("- acData.venueId:", acData.venueId, typeof acData.venueId);
      console.log("- Boolean check (!acData.venueId):", !acData.venueId);

      if (!acData.venueId) {
        console.log("❌ Venue ID validation failed!");
        throw new Error("Venue ID is required");
      }

      if (!acData.ton) {
        console.log("❌ Ton validation failed!");
        throw new Error(
          "Ton is required. Please select: 0.5, 1, 1.5, or 2 ton"
        );
      }

      // Validate ton value is one of the allowed values
      const allowedTons = ["0.5", "1", "1.5", "2"];
      if (!allowedTons.includes(acData.ton)) {
        throw new Error("Invalid ton value. Must be one of: 0.5, 1, 1.5, or 2");
      }

      console.log("✅ Venue ID validation passed");
      console.log("✅ Ton validation passed");
      console.log("- Final venueId value:", acData.venueId);
      console.log("- Ton value:", acData.ton);

      // Verify that the venue belongs to this admin
      const venue = await Venue.findOne({
        where: {
          id: acData.venueId,
          adminId: adminId,
        },
        transaction,
      });

      if (!venue) {
        throw new Error("Venue not found or does not belong to this admin");
      }

      // Generate serial number if not provided
      const serialNumber =
        acData.serialNumber || (await ACService.generateSerialNumber());

      // Generate base64 key
      const key = ACService.generateBase64Key(serialNumber);

      // Check venue power state - if venue is ON, new AC should be ON
      const shouldBeOn = venue.isVenueOn === true;

      // Create AC device
      const createData = {
        name: acData.name,
        brand: acData.brand,
        model: acData.model,
        ton: acData.ton, // Required field
        serialNumber: serialNumber,
        key: key,
        venueId: acData.venueId,
        temperature: acData.temperature || 16, // Default 16°C
        currentMode: "high", // Default to high mode
        isOn: shouldBeOn, // Respect venue power state
        lastPowerChangeBy: shouldBeOn ? "admin" : null,
        lastPowerChangeAt: shouldBeOn ? new Date() : null,
      };

      console.log("📊 Data being sent to AC.create:", createData);

      const ac = await AC.create(createData, { transaction });

      // If AC is created with power ON (organization is ON), initialize energy tracking
      if (shouldBeOn) {
        try {
          const EnergyConsumptionService = require("./energyConsumptionService");
          await EnergyConsumptionService.handleACPowerOn(ac.id);
        } catch (energyError) {
          console.error(
            `⚠️ Error initializing energy tracking for new AC ${ac.id}:`,
            energyError
          );
          // Don't fail the whole operation if energy initialization fails
        }
      }

      // Log activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: "CREATE_AC",
          targetType: "ac",
          targetId: ac.id,
          details: `Created AC device: ${ac.name} (${
            ac.serialNumber
          }) in venue ${venue.name}${
            shouldBeOn ? " - AC created with power ON (venue is ON)" : ""
          }`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: "ac device created successfully",
        ac: {
          id: ac.id,
          name: ac.name,
          brand: ac.brand,
          model: ac.model,
          ton: ac.ton,
          serialNumber: ac.serialNumber,
          organizationId: ac.organizationId,
          key: ac.key,
          isOn: ac.isOn,
          temperature: ac.temperature,
          createdAt: ac.createdAt,
        },
      };
    } catch (error) {
      await transaction.rollback();
      console.log("❌ ACService createAC error details:");
      console.log("- Error name:", error.name);
      console.log("- Error message:", error.message);

      if (error.name === "SequelizeValidationError") {
        console.log("- Validation errors:");
        error.errors.forEach((err) => {
          console.log(`  * ${err.path}: ${err.message} (value: ${err.value})`);
        });
      }

      if (error.name === "SequelizeUniqueConstraintError") {
        console.log("- Unique constraint errors:");
        error.errors.forEach((err) => {
          console.log(`  * ${err.path}: ${err.message} (value: ${err.value})`);
        });
      }

      if (error.name === "SequelizeDatabaseError") {
        console.log(
          "- Database error:",
          error.original?.message || error.message
        );
      }

      throw error;
    }
  }

  // Lock/Unlock AC
  static async toggleACStatus(adminId, acId, action, reason = null) {
    const transaction = await AC.sequelize.transaction();

    try {
      const ac = await AC.findByPk(acId, {
        include: [
          {
            model: Venue,
            as: "venue",
            attributes: ["id", "name", "adminId"],
            required: false,
            include: [
              {
                model: Organization,
                as: "organization",
                attributes: ["id", "name", "adminId"],
                required: false,
              },
            ],
          },
          {
            model: Organization,
            as: "organization",
            attributes: ["id", "name", "adminId"],
            required: false,
          },
        ],
        transaction,
      });

      if (!ac) {
        throw new Error("AC not found");
      }

      // Check if AC belongs to admin - try venue first, then organization
      let acAdminId = null;
      if (ac.venue && ac.venue.adminId) {
        acAdminId = ac.venue.adminId;
      } else if (
        ac.venue &&
        ac.venue.organization &&
        ac.venue.organization.adminId
      ) {
        acAdminId = ac.venue.organization.adminId;
      } else if (ac.organization && ac.organization.adminId) {
        acAdminId = ac.organization.adminId;
      }

      if (!acAdminId) {
        throw new Error("AC device does not have an associated admin");
      }

      if (acAdminId !== adminId) {
        throw new Error("Unauthorized: AC does not belong to this admin");
      }

      const newState = action === "lock" ? "locked" : "unlocked";

      const updateData = {
        currentState: newState,
        lockedAt: action === "lock" ? new Date() : null,
        lockReason: action === "lock" ? reason : null,
        lockedBy: action === "lock" ? "admin" : null,
      };

      await ac.update(updateData, { transaction });

      // Log activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: action === "lock" ? "LOCK_AC" : "UNLOCK_AC",
          targetType: "ac",
          targetId: acId,
          details: `${action === "lock" ? "Locked" : "Unlocked"} AC: ${
            ac.name
          } (${ac.serialNumber})${reason ? ` - Reason: ${reason}` : ""}`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      // Send LOCK/UNLOCK command to ESP32 device
      try {
        const Services = require("../../../services");
        const ESPService = Services.getESPService();
        if (ac.serialNumber) {
          // Send LOCK or UNLOCK command to ESP32
          const result = ESPService.sendLockCommand(
            ac.serialNumber,
            action === "lock"
          );
          if (result.success) {
            if (action === "lock") {
              // When locking, also restore/sync temperature to dashboard value
              // This ensures ESP32 temperature matches database temperature
              const dashboardTemp = ac.temperature || 24;
              await ESPService.startTemperatureSync(ac.serialNumber, dashboardTemp);
              console.log(
                `✅ [LOCK] Sent LOCK command to ESP32: ${ac.serialNumber} (locked at ${dashboardTemp}°C, temperature synced)`
              );
            } else {
              console.log(
                `✅ [LOCK] Sent UNLOCK command to ESP32: ${ac.serialNumber}`
              );
            }
          } else {
            console.log(
              `⚠️ [LOCK] Failed to send lock command to ESP32: ${ac.serialNumber} - ${result.message}`
            );
          }
        } else {
          console.log(
            `⚠️ [LOCK] AC ${ac.id} has no serial number, cannot send lock command`
          );
        }
      } catch (espError) {
        console.error(
          "⚠️ Error sending lock state to ESP32 (non-critical):",
          espError.message
        );
        console.error("⚠️ Error stack:", espError.stack);
        // Don't fail the operation if ESP32 notification fails
      }

      return {
        success: true,
        message: `AC ${action === "lock" ? "locked" : "unlocked"} successfully`,
        ac: {
          id: ac.id,
          name: ac.name,
          serialNumber: ac.serialNumber,
          currentState: newState,
          lockedAt: updateData.lockedAt,
          lockReason: updateData.lockReason,
          lockedBy: updateData.lockedBy,
        },
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ==================== ADMIN OVERRIDE: UNLOCK MANAGER-LOCKED AC ====================
  // Admin can unlock any AC locked by manager (admin has superiority)
  static async unlockManagerLockedAC(adminId, acId, reason = null) {
    const transaction = await AC.sequelize.transaction();

    try {
      const ac = await AC.findByPk(acId, {
        include: [
          {
            model: Organization,
            as: "organization",
            attributes: ["id", "name", "adminId", "managerId"],
          },
        ],
        transaction,
      });

      if (!ac) {
        throw new Error("AC not found");
      }

      if (ac.organization.adminId !== adminId) {
        throw new Error("Unauthorized: AC does not belong to this admin");
      }

      // Admin can unlock AC regardless of who locked it (manager or admin)
      // This demonstrates admin superiority over manager actions
      const updateData = {
        currentState: "unlocked",
        lockedAt: null,
        lockReason: null,
        lockedBy: null,
        adminOverride: true,
        adminOverrideAt: new Date(),
      };

      await ac.update(updateData, { transaction });

      // Log activity with admin override flag
      await ActivityLog.create(
        {
          adminId: adminId,
          action: "ADMIN_OVERRIDE_UNLOCK_AC",
          targetType: "ac",
          targetId: acId,
          details: `Admin override: Unlocked AC ${ac.name} (${
            ac.serialNumber
          }) - Admin has superiority over manager locks. ${
            reason ? `Reason: ${reason}` : ""
          }`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message:
          "AC unlocked successfully (Admin Override - bypassed manager lock)",
        adminOverride: true,
        ac: {
          id: ac.id,
          name: ac.name,
          serialNumber: ac.serialNumber,
          currentState: "unlocked",
          lockedAt: null,
          lockReason: null,
          lockedBy: null,
        },
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Get all ACs under an admin (through organizations)
  static async getACsByAdmin(adminId) {
    try {
      // Get all venues under admin's organizations
      const organizations = await Organization.findAll({
        where: { adminId: adminId },
        attributes: ["id"],
      });
      const orgIds = organizations.map((o) => o.id);

      const venues = await Venue.findAll({
        where: {
          adminId: adminId,
          organizationId: { [Op.in]: orgIds.length > 0 ? orgIds : [-1] },
        },
        attributes: ["id"],
      });
      const venueIds = venues.map((v) => v.id);

      if (venueIds.length === 0) {
        return { success: true, acs: [] };
      }

      const acs = await AC.findAll({
        where: { venueId: { [Op.in]: venueIds } },
        include: [
          {
            model: Venue,
            as: "venue",
            required: false,
            attributes: ["id", "name"],
            include: [
              {
                model: Organization,
                as: "organization",
                required: false,
                attributes: ["id", "name"],
              },
            ],
          },
        ],
        attributes: [
          "id",
          "name",
          "brand",
          "model",
          "ton",
          "serialNumber",
          "currentState",
          "temperature",
          "isOn",
          "lockedAt",
          "lockReason",
          "lockedBy",
          "venueId",
          "createdAt",
          "updatedAt",
        ],
        order: [["createdAt", "DESC"]],
      });

      return {
        success: true,
        acs: acs,
      };
    } catch (error) {
      throw error;
    }
  }

  // Get AC details
  static async getACDetails(adminId, acId) {
    try {
      const ac = await AC.findByPk(acId, {
        include: [
          {
            model: Venue,
            as: "venue",
            required: false,
            attributes: ["id", "name", "adminId"],
            include: [
              {
                model: Organization,
                as: "organization",
                required: false,
                attributes: ["id", "name"],
              },
            ],
          },
        ],
        attributes: [
          "id",
          "name",
          "brand",
          "model",
          "ton",
          "serialNumber",
          "currentState",
          "temperature",
          "isOn",
          "lockedAt",
          "lockReason",
          "lockedBy",
          "venueId",
          "createdAt",
          "updatedAt",
        ],
      });

      if (!ac) {
        throw new Error("AC not found");
      }

      // Verify ownership
      const belongsToAdmin = ac.venue && ac.venue.adminId === adminId;

      if (!belongsToAdmin) {
        throw new Error("AC not found or unauthorized");
      }

      return {
        success: true,
        ac: ac,
      };
    } catch (error) {
      throw error;
    }
  }

  // Get ACs by organization (get ACs from all venues under this organization)
  static async getACsByOrganization(adminId, organizationId) {
    try {
      // First verify the organization belongs to this admin
      const organization = await Organization.findOne({
        where: {
          id: organizationId,
          adminId: adminId,
        },
      });

      if (!organization) {
        throw new Error("Organization not found or unauthorized");
      }

      // Get all venues under this organization
      const venues = await Venue.findAll({
        where: {
          organizationId: organizationId,
          adminId: adminId,
        },
        attributes: ["id"],
      });

      const venueIds = venues.map((v) => v.id);

      if (venueIds.length === 0) {
        return {
          success: true,
          acs: [],
          organization: {
            id: organization.id,
            name: organization.name,
          },
        };
      }

      // Get all ACs from these venues
      const acs = await AC.findAll({
        where: { venueId: { [Op.in]: venueIds } },
        include: [
          {
            model: Venue,
            as: "venue",
            required: false,
            attributes: ["id", "name"],
          },
        ],
        attributes: [
          "id",
          "name",
          "brand",
          "model",
          "ton",
          "serialNumber",
          "currentState",
          "temperature",
          "isOn",
          "lockedAt",
          "lockReason",
          "lockedBy",
          "venueId",
          "createdAt",
          "updatedAt",
        ],
        order: [["createdAt", "DESC"]],
      });

      return {
        success: true,
        acs: acs,
        organization: {
          id: organization.id,
          name: organization.name,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Get ACs by venue
  static async getACsByVenue(adminId, venueId) {
    try {
      // First verify the venue belongs to this admin
      const venue = await Venue.findOne({
        where: {
          id: venueId,
          adminId: adminId,
        },
      });

      if (!venue) {
        throw new Error("Venue not found or unauthorized");
      }

      // Get ACs directly assigned to this venue
      const acs = await AC.findAll({
        where: { venueId: venueId },
        include: [
          {
            model: Venue,
            as: "venue",
            attributes: ["id", "name"],
            include: [
              {
                model: Organization,
                as: "organization",
                required: false,
                attributes: ["id", "name"],
              },
            ],
          },
        ],
        attributes: [
          "id",
          "name",
          "brand",
          "model",
          "ton",
          "serialNumber",
          "currentState",
          "temperature",
          "isOn",
          "lockedAt",
          "lockReason",
          "lockedBy",
          "venueId",
          "createdAt",
          "updatedAt",
        ],
        order: [["createdAt", "DESC"]],
      });

      return {
        success: true,
        acs: acs,
        venue: {
          id: venue.id,
          name: venue.name,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Delete AC device with cascade deletion
  static async deleteACCascade(adminId, acId) {
    const transaction = await AC.sequelize.transaction();
    const Event = require("../../../models/Event/event");
    const SystemState = require("../../../models/SystemState/systemState");

    try {
      // Verify AC belongs to admin
      const ac = await AC.findByPk(acId, {
        include: [
          {
            model: Venue,
            as: "venue",
            required: false,
            attributes: ["id", "name", "adminId"],
          },
        ],
        transaction,
      });

      if (!ac) {
        throw new Error("AC device not found");
      }

      // Verify ownership through venue
      if (!ac.venue || ac.venue.adminId !== adminId) {
        throw new Error("AC device not found or unauthorized");
      }

      const acName = ac.name;
      const acSerialNumber = ac.serialNumber;

      // 1. Get all events related to this AC
      const events = await Event.findAll({
        where: { deviceId: acId },
        attributes: ["id"],
        transaction,
      });
      const eventIds = events.map((e) => e.id);

      // 2. Delete child events (events with parentAdminEventId pointing to these events)
      if (eventIds.length > 0) {
        await Event.destroy({
          where: {
            parentAdminEventId: { [Op.in]: eventIds },
          },
          transaction,
        });
      }

      // 3. Delete events related to this AC
      await Event.destroy({
        where: { deviceId: acId },
        transaction,
      });

      // 4. Delete activity logs related to this AC
      await ActivityLog.destroy({
        where: {
          targetType: "ac",
          targetId: acId,
        },
        transaction,
      });

      // 5. Delete system states related to this AC
      await SystemState.destroy({
        where: {
          entityType: "ac",
          entityId: acId,
        },
        transaction,
      });

      // 6. Delete the AC device
      await ac.destroy({ transaction });

      // 7. Log deletion activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: "DELETE_AC",
          targetType: "ac",
          targetId: acId,
          details: `Deleted AC device: ${acName} (${acSerialNumber}) - Cascade deleted ${eventIds.length} event(s), related activity logs, and system states`,
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: "AC device deleted successfully",
        deletedAC: {
          id: acId,
          name: acName,
          serialNumber: acSerialNumber,
        },
        cascadeDeleted: {
          events: eventIds.length,
          activityLogs: "all related",
          systemStates: "all related",
        },
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = ACService;
