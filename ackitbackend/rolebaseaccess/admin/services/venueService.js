const Venue = require("../../../models/Venue/venue");
const Organization = require("../../../models/Organization/organization");
const AC = require("../../../models/AC/ac");
const ActivityLog = require("../../../models/Activity log/activityLog");
const Event = require("../../../models/Event/event");
const SystemState = require("../../../models/SystemState/systemState");
const { Op } = require("sequelize");

class VenueService {
  // Create a new venue (complex - with organizationSize, organizationId, etc.)
  static async createVenue(venueData, adminId) {
    const transaction = await Venue.sequelize.transaction();

    try {
      // Verify manager belongs to admin if managerId is provided
      if (venueData.managerId) {
        const Manager = require("../../../models/Roleaccess/manager");
        const manager = await Manager.findOne({
          where: {
            id: venueData.managerId,
            adminId: adminId,
          },
          transaction,
        });

        if (!manager) {
          throw new Error("Manager not found or does not belong to this admin");
        }
      }

      // Validate required fields
      if (!venueData.organizationSize) {
        throw new Error("Venue size is required");
      }

      if (!venueData.organizationId) {
        throw new Error("Organization ID is required");
      }

      // Verify organization belongs to admin
      const organization = await Organization.findOne({
        where: {
          id: venueData.organizationId,
          adminId: adminId,
        },
        transaction,
      });

      if (!organization) {
        throw new Error(
          "Organization not found or does not belong to this admin"
        );
      }

      // AUTO-ASSIGNMENT: If organization has a manager assigned, automatically assign venue to same manager
      // This ensures that when a new venue is added to an organization, it automatically goes to the manager
      if (organization.managerId && !venueData.managerId) {
        venueData.managerId = organization.managerId;
        console.log(
          `✅ [AUTO-ASSIGN] Venue will be auto-assigned to manager ${organization.managerId} (from organization)`
        );
      }

      // IMPORTANT: Check if a Venue entry already exists with this name and adminId
      // Venue model uses "organizations" table, so we need to prevent duplicate organizations
      // Also check if this is a temperature entry for the parent organization (same name as organization)
      const existingVenue = await Venue.findOne({
        where: {
          name: venueData.name,
          adminId: adminId,
        },
        transaction,
      });

      if (existingVenue) {
        // Check if this is a temperature entry for the parent organization
        // If it has same name as parent organization and organizationId matches, it's a temperature entry
        // In that case, we should NOT create a duplicate venue with same name
        if (
          existingVenue.name === organization.name &&
          existingVenue.organizationId === venueData.organizationId
        ) {
          throw new Error(
            `Cannot create venue: An entry with name "${venueData.name}" already exists for this organization (used for temperature control). Please use a different name for the venue.`
          );
        }
        // Otherwise, it's a duplicate venue name
        throw new Error(
          `Venue with name "${venueData.name}" already exists. Please use a different name.`
        );
      }

      // Also check: Don't allow creating a venue with same name as its parent organization
      // This would conflict with the temperature entry
      if (venueData.name === organization.name) {
        throw new Error(
          `Venue name cannot be the same as its parent organization name "${organization.name}". Please use a different name for the venue.`
        );
      }

      // Create venue
      console.log("📦 VenueService - Creating venue with data:");
      console.log("- venueData:", venueData);
      console.log("- adminId:", adminId);
      console.log("- organizationId:", venueData.organizationId);
      console.log("- organization name:", organization.name);

      const createData = {
        name: venueData.name,
        organizationSize: venueData.organizationSize,
        temperature: venueData.temperature || 16,
        organizationId: venueData.organizationId,
        adminId: adminId,
        managerId: venueData.managerId || null,
        status: "active",
      };

      console.log("📊 Data being sent to Venue.create:", createData);

      const venue = await Venue.create(createData, {
        transaction,
      });

      // Log activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: "CREATE_VENUE",
          targetType: "venue",
          targetId: venue.id,
          details: `Created venue: ${venue.name}`,
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: "Venue created successfully",
        venue: {
          id: venue.id,
          name: venue.name,
          organizationSize: venue.organizationSize,
          managerId: venue.managerId,
          status: venue.status,
          createdAt: venue.createdAt,
        },
      };
    } catch (error) {
      await transaction.rollback();
      console.log("❌ VenueService createVenue error details:");
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
        throw new Error(
          `Venue with name "${venueData.name}" already exists for this admin`
        );
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

  // Get all venues under an admin
  static async getVenuesByAdmin(adminId) {
    try {
      const AC = require("../../../models/AC/ac");
      const Organization = require("../../../models/Organization/organization");

      // Get all organizations to check for temperature entries
      const organizations = await Organization.findAll({
        where: { adminId: adminId },
        attributes: ["id", "name"],
      });

      // Create a set of organization names to exclude temperature entries
      const orgNames = new Set(organizations.map((org) => org.name));

      const venues = await Venue.findAll({
        where: {
          adminId: adminId,
          status: { [Op.ne]: "split" }, // Exclude split venues
        },
        attributes: [
          "id",
          "name",
          "organizationSize",
          "status",
          "managerId",
          "temperature",
          "organizationId",
          "isVenueOn",
          "venuePowerChangedAt",
          "venuePowerChangedBy",
          "createdAt",
          "updatedAt",
        ],
        include: [
          {
            model: Organization,
            as: "organization",
            required: false,
            attributes: ["id", "name"],
          },
          {
            model: AC,
            as: "acs",
            required: false,
            attributes: ["id", "temperature"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      // Filter out organization's own venue entries (temperature entries)
      // These are venues with same name as their parent organization
      const actualVenues = venues.filter((venue) => {
        const venueData = venue.toJSON();
        // If venue name matches an organization name, it's a temperature entry, not a real venue
        if (orgNames.has(venueData.name)) {
          // Double check: if organizationId matches and name matches, it's definitely a temperature entry
          if (venueData.organizationId) {
            const parentOrg = organizations.find(
              (org) => org.id === venueData.organizationId
            );
            if (parentOrg && parentOrg.name === venueData.name) {
              return false; // This is a temperature entry, exclude it
            }
          }
        }
        return true; // This is an actual venue
      });

      // Calculate hasMixedTemperatures for each venue
      const venuesWithMixed = actualVenues.map((venue) => {
        const venueData = venue.toJSON();
        const venueTemp = venueData.temperature || 16;
        let hasMixedTemperatures = false;

        if (venueData.acs && venueData.acs.length > 1) {
          hasMixedTemperatures = venueData.acs.some((ac) => {
            const acTemp = ac.temperature || 16;
            return acTemp !== venueTemp;
          });
        }

        venueData.hasMixedTemperatures = hasMixedTemperatures;
        // Remove acs from response (we only needed it for calculation)
        delete venueData.acs;

        return venueData;
      });

      return {
        success: true,
        venues: venuesWithMixed,
      };
    } catch (error) {
      throw error;
    }
  }

  // Get venue details with ACs
  static async getVenueDetails(adminId, venueId) {
    try {
      const venue = await Venue.findOne({
        where: {
          id: venueId,
          adminId: adminId,
        },
        attributes: [
          "id",
          "name",
          "organizationSize",
          "status",
          "managerId",
          "temperature",
          "isVenueOn",
          "venuePowerChangedAt",
          "venuePowerChangedBy",
          "isLocked",
          "lockedTemperature",
          "lockedAt",
          "lockedByAdminId",
          "createdAt",
          "updatedAt",
        ],
        include: [
          {
            model: AC,
            as: "acs",
            attributes: [
              "id",
              "name",
              "model",
              "serialNumber",
              "temperature",
              "isOn",
            ],
          },
          {
            model: Organization,
            as: "organization",
            required: false,
            attributes: ["id", "name"],
          },
        ],
      });

      if (!venue) {
        throw new Error("Venue not found or unauthorized");
      }

      // Add ACs that are off when venue is on
      const venueData = venue.toJSON();
      venueData.acsOffCount = 0;
      venueData.acsOff = [];

      if (venueData.isVenueOn && venueData.acs && venueData.acs.length > 0) {
        venueData.acsOff = venueData.acs.filter((ac) => !ac.isOn);
        venueData.acsOffCount = venueData.acsOff.length;
      }

      // Calculate hasMixedTemperatures for venue
      // Check if any device has different temperature than venue
      let hasMixedTemperatures = false;
      const venueTemp = venueData.temperature || 16;

      if (venueData.acs && venueData.acs.length > 1) {
        hasMixedTemperatures = venueData.acs.some((ac) => {
          const acTemp = ac.temperature || 16;
          return acTemp !== venueTemp;
        });
      }

      venueData.hasMixedTemperatures = hasMixedTemperatures;

      return {
        success: true,
        venue: venueData,
      };
    } catch (error) {
      throw error;
    }
  }

  // ==================== ADMIN OVERRIDE: VENUE SPLIT MANAGEMENT ====================
  static async undoVenueSplitByAdmin(adminId, originalVenueId) {
    const transaction = await Venue.sequelize.transaction();

    try {
      const originalVenue = await Venue.findOne({
        where: {
          id: originalVenueId,
          adminId: adminId,
          status: "split",
        },
        transaction,
      });

      if (!originalVenue) {
        throw new Error(
          "Original venue not found, not split, or does not belong to this admin"
        );
      }

      const splitIntoIds = JSON.parse(originalVenue.splitIntoIds || "[]");

      const splitVenues = await Venue.findAll({
        where: {
          id: { [Op.in]: splitIntoIds },
          splitFromId: originalVenueId,
          adminId: adminId,
        },
        include: [
          {
            model: AC,
            as: "acs",
          },
        ],
        transaction,
      });

      // Move all ACs back to original venue
      for (const splitVenue of splitVenues) {
        if (splitVenue.acs && splitVenue.acs.length > 0) {
          await AC.update(
            { venueId: originalVenueId },
            {
              where: {
                venueId: splitVenue.id,
              },
              transaction,
            }
          );
        }

        await splitVenue.destroy({ transaction });
      }

      // Restore original venue
      await originalVenue.update(
        {
          status: "active",
          splitIntoIds: null,
          splitAt: null,
        },
        { transaction }
      );

      await ActivityLog.create(
        {
          adminId: adminId,
          action: "ADMIN_OVERRIDE_UNDO_VENUE_SPLIT",
          targetType: "venue",
          targetId: originalVenueId,
          details: `Admin override: Undid split for venue ${originalVenue.name}`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: "Venue split undone successfully (Admin Override)",
        adminOverride: true,
        restoredVenue: originalVenue,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Toggle venue power state (ON/OFF)
  static async toggleVenuePower(venueId, powerState, changedBy, userId) {
    const transaction = await Venue.sequelize.transaction();

    try {
      const venue = await Venue.findOne({
        where: { id: venueId },
        include: [
          {
            model: AC,
            as: "acs",
            required: false,
          },
        ],
        transaction,
      });

      if (!venue) {
        throw new Error("Venue not found");
      }

      const oldPowerState = venue.isVenueOn || false;
      const newPowerState = powerState === true || powerState === "on";

      // Check if venue belongs to an organization and if organization is ON
      if (venue.organizationId) {
        // Find organization (stored in Venue model with same name)
        const organization = await Venue.findOne({
          where: {
            id: venue.organizationId,
            adminId: venue.adminId,
          },
          transaction,
        });

        // If organization exists and is OFF, cannot turn on venue
        if (organization && !organization.isVenueOn && newPowerState) {
          await transaction.rollback();
          throw new Error(
            "Cannot turn ON venue: Organization is currently OFF. Please turn on the organization first."
          );
        }
      }

      await venue.update(
        {
          isVenueOn: newPowerState,
          venuePowerChangedAt: new Date(),
          venuePowerChangedBy: changedBy,
        },
        { transaction }
      );

      // Update all devices in this venue based on venue power state
      // Venue ON → All devices ON, Venue OFF → All devices OFF
      let acsUpdated = 0;
      const acUpdateData = {
        isOn: newPowerState,
        lastPowerChangeAt: new Date(),
        lastPowerChangeBy: changedBy,
      };

      if (newPowerState) {
        // When venue is turned ON, also initialize device states
        acUpdateData.isWorking = true;
        acUpdateData.alertAt = null;
        acUpdateData.currentMode = "high";
      }

      // Update all ACs in this venue (not just the ones loaded in venue.acs)
      const [updateCount] = await AC.update(acUpdateData, {
        where: { venueId: venueId },
        transaction,
      });

      acsUpdated = updateCount;

      await ActivityLog.create(
        {
          adminId: venue.adminId,
          action: "TOGGLE_VENUE_POWER",
          targetType: "venue",
          targetId: venueId,
          details: `Venue ${venue.name} power changed from ${
            oldPowerState ? "ON" : "OFF"
          } to ${newPowerState ? "ON" : "OFF"} by ${changedBy}. ${
            acsUpdated > 0
              ? `${acsUpdated} AC(s) updated.`
              : "No ACs to update."
          }`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      // Send WebSocket commands to ESP32 devices and broadcast to frontend
      try {
        const Services = require("../../../services");
        const ESPService = Services.getESPService();

        // Get all ACs that were updated
        const updatedACs = await AC.findAll({
          where: { venueId: venueId },
          attributes: [
            "id",
            "serialNumber",
            "key",
            "temperature",
            "isOn",
            "organizationId",
            "venueId",
          ],
        });

        let wsCommandsSent = 0;
        let wsCommandsSkipped = 0;

        // Send WebSocket POWER command to each ESP32 device
        for (const ac of updatedACs) {
          if (ac.serialNumber) {
            try {
              console.log(
                `🔌 [VENUE-POWER] Sending WebSocket command to device ${ac.serialNumber}`
              );
              console.log(`   └─ Power state: ${newPowerState ? "ON" : "OFF"}`);

              const wsResult = await ESPService.sendPowerCommand(
                ac.serialNumber, // ESP32 connections are keyed by serialNumber
                newPowerState
              );

              if (wsResult.success) {
                wsCommandsSent++;
                console.log(
                  `✅ [VENUE-POWER] WebSocket command sent successfully to ${ac.serialNumber}`
                );
              } else {
                wsCommandsSkipped++;
                console.log(
                  `⚠️ [VENUE-POWER] WebSocket command failed for ${ac.serialNumber}: ${wsResult.message}`
                );
              }
            } catch (wsError) {
              wsCommandsSkipped++;
              console.error(
                `❌ [VENUE-POWER] WebSocket command error for ${ac.serialNumber}:`,
                wsError.message
              );
            }
          } else {
            wsCommandsSkipped++;
            console.log(
              `⚠️ [VENUE-POWER] Device ${ac.id} has no serialNumber, skipping WebSocket command`
            );
          }

          // Broadcast to frontend for real-time UI update
          ESPService.broadcastToFrontend({
            device_id: ac.serialNumber,
            serialNumber: ac.serialNumber,
            temperature: ac.temperature,
            isOn: ac.isOn,
            changedBy: changedBy,
            organizationId: ac.organizationId,
            venueId: ac.venueId,
            timestamp: new Date().toISOString(),
          });
        }

        console.log(`📡 [VENUE-POWER] WebSocket commands completed:`);
        console.log(`   └─ Commands sent: ${wsCommandsSent}`);
        console.log(`   └─ Commands skipped: ${wsCommandsSkipped}`);
        console.log(
          `📡 [VENUE-POWER] Broadcasted ${updatedACs.length} AC updates to all frontend clients`
        );
      } catch (broadcastError) {
        console.error(
          "⚠️ Error sending WebSocket commands or broadcasting venue power changes:",
          broadcastError
        );
        // Don't fail the operation if WebSocket/broadcast fails
      }

      return {
        success: true,
        message: `Venue power ${
          newPowerState ? "turned ON" : "turned OFF"
        } successfully`,
        venue: {
          id: venue.id,
          name: venue.name,
          isVenueOn: newPowerState,
          venuePowerChangedAt: venue.venuePowerChangedAt,
          venuePowerChangedBy: changedBy,
        },
        acsUpdated: acsUpdated,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Delete venue with cascade deletion
  static async deleteVenueCascade(adminId, venueId) {
    const transaction = await Venue.sequelize.transaction();

    try {
      const venue = await Venue.findOne({
        where: {
          id: venueId,
          adminId: adminId,
        },
        transaction,
      });

      if (!venue) {
        throw new Error("Venue not found or unauthorized");
      }

      const venueName = venue.name;

      // Get all AC devices in this venue
      const acDevices = await AC.findAll({
        where: { venueId: venueId },
        attributes: ["id"],
        transaction,
      });

      const acIds = acDevices.map((ac) => ac.id);

      // Get all events related to ACs in this venue
      // Note: Events don't have venueId - they link to Venue through AC device (Event → AC → Venue)
      let eventIds = [];
      if (acIds.length > 0) {
        const events = await Event.findAll({
          where: {
            deviceId: { [Op.in]: acIds },
          },
          attributes: ["id"],
          transaction,
        });
        eventIds = events.map((e) => e.id);
      }

      // Delete all events related to ACs in this venue
      if (acIds.length > 0) {
        await Event.destroy({
          where: {
            deviceId: { [Op.in]: acIds },
          },
          transaction,
        });
      }

      // Delete child manager events
      if (eventIds.length > 0) {
        await Event.destroy({
          where: {
            parentAdminEventId: { [Op.in]: eventIds },
          },
          transaction,
        });
      }

      // Delete activity logs
      if (acIds.length > 0) {
        await ActivityLog.destroy({
          where: {
            [Op.or]: [
              { targetType: "ac", targetId: { [Op.in]: acIds } },
              { targetType: "venue", targetId: venueId },
            ],
          },
          transaction,
        });
      } else {
        await ActivityLog.destroy({
          where: { targetType: "venue", targetId: venueId },
          transaction,
        });
      }

      // Delete system states
      // Note: SystemState entityType enum only has: "ac", "organization", "manager", "admin"
      // Venues don't have system states directly - only ACs do
      if (acIds.length > 0) {
        await SystemState.destroy({
          where: {
            entityType: "ac",
            entityId: { [Op.in]: acIds },
          },
          transaction,
        });
      }

      // Delete all AC devices
      if (acIds.length > 0) {
        await AC.destroy({
          where: { venueId: venueId },
          transaction,
        });
      }

      // Handle self-referential relationships
      await Venue.update(
        { splitFromId: null },
        {
          where: { splitFromId: venueId },
          transaction,
        }
      );

      const venuesWithSplits = await Venue.findAll({
        where: {
          splitIntoIds: { [Op.ne]: null },
          adminId: adminId,
        },
        transaction,
      });

      for (const venueWithSplit of venuesWithSplits) {
        try {
          const splitIntoIds = JSON.parse(venueWithSplit.splitIntoIds || "[]");
          const filteredIds = splitIntoIds.filter((id) => id !== venueId);
          if (filteredIds.length !== splitIntoIds.length) {
            await venueWithSplit.update(
              {
                splitIntoIds:
                  filteredIds.length > 0 ? JSON.stringify(filteredIds) : null,
              },
              { transaction }
            );
          }
        } catch (parseError) {
          console.error(
            `Error parsing splitIntoIds for venue ${venueWithSplit.id}:`,
            parseError
          );
        }
      }

      // Delete the venue
      await venue.destroy({ transaction });

      await ActivityLog.create(
        {
          adminId: adminId,
          action: "DELETE_VENUE",
          targetType: "venue",
          targetId: venueId,
          details: `Deleted venue: ${venueName} (cascade deleted ${acIds.length} AC(s), related events, activity logs, and system states)`,
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: "Venue deleted successfully",
        deletedVenue: {
          id: venueId,
          name: venueName,
        },
        cascadeDeleted: {
          acs: acIds.length,
          events: "all related",
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

module.exports = VenueService;
