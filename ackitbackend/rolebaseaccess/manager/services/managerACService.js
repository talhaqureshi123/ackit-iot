const AC = require("../../../models/AC/ac");
const Organization = require("../../../models/Organization/organization");
const Venue = require("../../../models/Venue/venue");
const ActivityLog = require("../../../models/Activity log/activityLog");

class ManagerACService {
  // Set temperature for individual AC device
  static async setACTemperature(managerId, acId, temperature) {
    const transaction = await AC.sequelize.transaction();

    try {
      // Verify AC belongs to manager's organization through venues
      // First, get all organization IDs assigned to this manager
      const managerOrgs = await Organization.findAll({
        where: { managerId: managerId },
        attributes: ["id", "name", "adminId"],
        transaction,
      });

      const orgIds = managerOrgs.map((org) => org.id);

      if (orgIds.length === 0) {
        if (transaction && !transaction.finished) {
          await transaction.rollback();
        }
        throw new Error("AC device not found or unauthorized");
      }

      // Get all venues under manager's organizations
      const { Op } = require("sequelize");
      const adminId = managerOrgs[0]?.adminId;

      if (!adminId) {
        if (transaction && !transaction.finished) {
          await transaction.rollback();
        }
        throw new Error("AC device not found or unauthorized");
      }

      // Get venues for additional lookup (some ACs might reference venue IDs)
      const Venue = require("../../../models/Venue/venue");
      const venues = await Venue.findAll({
        where: {
          adminId: adminId,
          organizationId: { [Op.in]: orgIds },
        },
        attributes: ["id"],
        transaction,
      });
      const venueIds = venues.map((v) => v.id);

      // ACs have venueId which references organizations table
      // But to be safe, check both orgIds and venueIds (in case of data inconsistency)
      // Combine both for lookup
      const allPossibleIds = [...orgIds, ...venueIds];
      const uniqueIds = [...new Set(allPossibleIds)];

      console.log(`🔍 [MANAGER-AC-TEMP] Looking for AC ${acId}`);
      console.log(`   └─ Manager orgIds:`, orgIds);
      console.log(`   └─ Manager venueIds:`, venueIds);
      console.log(`   └─ Combined uniqueIds:`, uniqueIds);

      // Find AC where venueId matches manager's organizations OR venues
      const ac = await AC.findOne({
        where: {
          id: acId,
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

      if (!ac) {
        // Debug: Check if device exists at all
        const deviceExists = await AC.findByPk(acId, {
          attributes: ["id", "name", "venueId"],
          transaction,
        });

        if (deviceExists) {
          console.error(
            `❌ [MANAGER-AC-TEMP] Device ${acId} exists but venueId ${deviceExists.venueId} not in manager's orgIds/venueIds`
          );
          console.error(`   Device venueId: ${deviceExists.venueId}`);
          console.error(`   Manager orgIds:`, orgIds);
          console.error(`   Manager venueIds:`, venueIds);
        } else {
          console.error(
            `❌ [MANAGER-AC-TEMP] Device ${acId} does not exist in database`
          );
        }

        if (transaction && !transaction.finished) {
          await transaction.rollback();
        }
        throw new Error("AC device not found or unauthorized");
      }

      console.log(
        `✅ [MANAGER-AC-TEMP] Device ${ac.id} (${ac.name}) found with venueId: ${ac.venueId}`
      );

      // Check if device is OFF - reject temperature changes when device is OFF
      if (!ac.isOn) {
        if (transaction && !transaction.finished) {
          await transaction.rollback();
        }
        throw new Error("Cannot change temperature: Device is OFF");
      }

      // Note: Lock checking removed as currentState field doesn't exist in AC model
      // Lock functionality should be handled at organization level

      const oldTemp = ac.temperature;
      const orgName =
        ac.organization?.name ||
        (ac.venue ? `Org ID: ${ac.venue.organizationId}` : "Unknown");
      const orgId = ac.venue?.organizationId || ac.venueId;

      console.log(`🌡️ [MANAGER-AC-TEMP] Temperature Change Request:`);
      console.log(`   └─ AC Device: ${ac.name} (${ac.serialNumber})`);
      console.log(`   └─ AC ID: ${acId}`);
      console.log(`   └─ Organization: ${orgName} (ID: ${orgId})`);
      console.log(`   └─ Old Temperature: ${oldTemp}°C`);
      console.log(`   └─ New Temperature: ${temperature}°C`);
      console.log(`   └─ Changed By: Manager (ID: ${managerId})`);
      console.log(`   └─ Timestamp: ${new Date().toISOString()}`);

      // Update AC temperature
      await ac.update(
        {
          temperature: temperature,
          lastTemperatureChange: new Date(),
          changedBy: "manager",
        },
        { transaction }
      );

      console.log(
        `✅ [MANAGER-AC-TEMP] Temperature updated: ${oldTemp}°C → ${temperature}°C`
      );

      // Get adminId from organization or venue for logging
      const adminIdForLog =
        ac.organization?.adminId ||
        (ac.venue
          ? managerOrgs.find((o) => o.id === ac.venue.organizationId)?.adminId
          : null);

      // Log activity
      if (adminIdForLog) {
        await ActivityLog.create(
          {
            adminId: adminIdForLog,
            action: "SET_AC_TEMPERATURE",
            targetType: "ac",
            targetId: acId,
            details: `Set temperature to ${temperature}°C for AC ${ac.name} (${ac.serialNumber})`,
            timestamp: new Date(),
          },
          { transaction }
        );
      }

      await transaction.commit();
      console.log(
        `✅ [MANAGER-AC] Database transaction committed successfully`
      );

      // Update energy consumption after temperature change
      try {
        const adminModule = require("../admin");
        const EnergyConsumptionService =
          adminModule.Services?.EnergyConsumptionService ||
          require("../admin/services/energyConsumptionService");
        await EnergyConsumptionService.updateACEnergy(acId);
        // Update organization energy total
        const orgIdForEnergy = ac.venue?.organizationId || ac.venueId;
        if (orgIdForEnergy) {
          await EnergyConsumptionService.updateOrganizationEnergy(
            orgIdForEnergy
          );
        }
      } catch (energyError) {
        console.error(
          "⚠️ Error updating energy after temperature change:",
          energyError
        );
        // Don't fail the transaction - energy update is not critical
      }

      // Send temperature command to ESP via WebSocket
      try {
        if (ac.serialNumber) {
          console.log(
            `🔌 [MANAGER-AC] Initiating WebSocket command for device ${ac.serialNumber}`
          );
          const servicesGateway = require("../../../services");
          const ESPService = servicesGateway.getESPService();

          // Always sync temperature to database value (database already updated above)
          await ESPService.startTemperatureSync(ac.serialNumber, temperature);
          console.log(
            `✅ [MANAGER-AC] Temperature sync started: ${oldTemp}°C → ${temperature}°C`
          );
        } else {
          console.log(
            `⚠️ [MANAGER-AC] Device ${ac.id} has no serial number, skipping WebSocket command`
          );
        }
      } catch (wsError) {
        console.error(
          "❌ [MANAGER-AC] WebSocket command failed (database already updated):",
          wsError.message
        );
        console.error(`   └─ Stack:`, wsError.stack);
        // Don't fail the whole operation if WebSocket fails
      }

      // Broadcast real-time update to all frontend clients (admin and manager)
      try {
        const servicesGateway = require("../../../services");
        const ESPService = servicesGateway.getESPService();
        ESPService.broadcastToFrontend({
          device_id: ac.serialNumber,
          serialNumber: ac.serialNumber,
          temperature: temperature,
          isOn: ac.isOn,
          changedBy: "manager",
          organizationId: ac.organizationId,
          venueId: ac.venueId,
          timestamp: new Date().toISOString(),
        });
        console.log(
          `📡 [MANAGER-AC] Broadcasted temperature change to all frontend clients`
        );
      } catch (broadcastError) {
        console.error(
          "⚠️ Error broadcasting temperature change:",
          broadcastError
        );
        // Don't fail the operation if broadcast fails
      }

      return {
        success: true,
        message: `AC temperature set to ${temperature}°C`,
        ac: {
          id: ac.id,
          name: ac.name,
          temperature: temperature,
          lastTemperatureChange: ac.lastTemperatureChange,
        },
      };
    } catch (error) {
      // Only rollback if transaction hasn't been finished
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  }

  // Set temperature for individual AC device (Admin)
  static async setACTemperatureByAdmin(adminId, acId, temperature) {
    const transaction = await AC.sequelize.transaction();

    try {
      console.log(
        `Setting temperature for AC ${acId} to ${temperature}°C by admin ${adminId}`
      );

      // Verify AC belongs to admin's organization
      const ac = await AC.findOne({
        include: [
          {
            model: Organization,
            as: "organization",
            where: { adminId: adminId },
          },
        ],
        where: { id: acId },
        transaction,
      });

      if (!ac) {
        throw new Error("AC device not found or admin not authorized");
      }

      // Check if device is OFF - reject temperature changes when device is OFF
      if (!ac.isOn) {
        await transaction.rollback();
        throw new Error("Cannot change temperature: Device is OFF");
      }

      // Note: AC suspension is handled at organization level, not AC level

      const oldTemp = ac.temperature;
      console.log(`🌡️ [ADMIN-AC-TEMP] Temperature Change Request:`);
      console.log(`   └─ AC Device: ${ac.name} (${ac.serialNumber})`);
      console.log(`   └─ AC ID: ${acId}`);
      console.log(
        `   └─ Organization: ${ac.organization.name} (ID: ${ac.organizationId})`
      );
      console.log(`   └─ Old Temperature: ${oldTemp}°C`);
      console.log(`   └─ New Temperature: ${temperature}°C`);
      console.log(`   └─ Changed By: Admin (ID: ${adminId}) - OVERRIDE MODE`);
      console.log(`   └─ Timestamp: ${new Date().toISOString()}`);

      // Admin can override manager locks - update AC regardless of lock status
      console.log(
        "🔓 Admin overriding manager lock for AC temperature control"
      );
      await ac.update(
        {
          temperature: temperature,
          lastTemperatureChange: new Date(),
          changedBy: "admin",
          // Admin override - temporarily unlock for temperature change
          adminOverride: true,
          adminOverrideAt: new Date(),
        },
        { transaction }
      );

      console.log(
        `✅ [ADMIN-AC-TEMP] Temperature updated: ${oldTemp}°C → ${temperature}°C (Admin Override)`
      );

      // Log activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: "SET_AC_TEMPERATURE_ADMIN_OVERRIDE",
          targetType: "ac",
          targetId: acId,
          details: `Admin override: Set temperature to ${temperature}°C for AC ${ac.name} (${ac.serialNumber}) (bypassed manager locks)`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();
      console.log(`✅ [ADMIN-AC] Database transaction committed successfully`);

      // Update energy consumption after temperature change
      try {
        const adminModule = require("../admin");
        const EnergyConsumptionService =
          adminModule.Services?.EnergyConsumptionService ||
          require("../admin/services/energyConsumptionService");
        await EnergyConsumptionService.updateACEnergy(acId);
        // Update organization energy total
        const orgIdForEnergy = ac.venue?.organizationId || ac.venueId;
        if (orgIdForEnergy) {
          await EnergyConsumptionService.updateOrganizationEnergy(
            orgIdForEnergy
          );
        }
      } catch (energyError) {
        console.error(
          "⚠️ Error updating energy after temperature change:",
          energyError
        );
        // Don't fail the transaction - energy update is not critical
      }

      // Send temperature command to ESP via WebSocket
      try {
        if (ac.key) {
          console.log(
            `🔌 [ADMIN-AC] Initiating WebSocket command for device ${ac.serialNumber} (Key: ${ac.key})`
          );
          const servicesGateway = require("../../../services");
          const ESPService = servicesGateway.getESPService();

          // Always sync temperature to database value (database already updated above)
          await ESPService.startTemperatureSync(ac.serialNumber, temperature);
          console.log(
            `✅ [ADMIN-AC] Temperature sync started: ${oldTemp}°C → ${temperature}°C`
          );
        } else {
          console.log(
            `⚠️ [ADMIN-AC] Device ${ac.id} has no key, skipping WebSocket command`
          );
        }
      } catch (wsError) {
        console.error(
          "❌ [ADMIN-AC] WebSocket command failed (database already updated):",
          wsError.message
        );
        console.error(`   └─ Stack:`, wsError.stack);
        // Don't fail the whole operation if WebSocket fails
      }

      // Broadcast real-time update to all frontend clients (admin and manager)
      try {
        const servicesGateway = require("../../../services");
        const ESPService = servicesGateway.getESPService();
        ESPService.broadcastToFrontend({
          device_id: ac.serialNumber,
          serialNumber: ac.serialNumber,
          temperature: temperature,
          isOn: ac.isOn,
          changedBy: "admin",
          timestamp: new Date().toISOString(),
        });
        console.log(
          `📡 [ADMIN-AC] Broadcasted temperature change to all frontend clients`
        );
      } catch (broadcastError) {
        console.error(
          "⚠️ Error broadcasting temperature change:",
          broadcastError
        );
        // Don't fail the operation if broadcast fails
      }

      return {
        success: true,
        message: `AC temperature set to ${temperature}°C`,
        ac: {
          id: ac.id,
          name: ac.name,
          temperature: temperature,
          lastTemperatureChange: ac.lastTemperatureChange,
        },
      };
    } catch (error) {
      await transaction.rollback();
      console.error("❌ [ADMIN-AC] Set AC temperature by admin error:", error);
      throw error;
    }
  }

  // Turn AC on/off
  static async toggleACPower(managerId, acId, powerState) {
    const transaction = await AC.sequelize.transaction();

    try {
      // Verify AC belongs to manager's organization through venues
      // First, get all organization IDs assigned to this manager
      const managerOrgs = await Organization.findAll({
        where: { managerId: managerId },
        attributes: ["id", "name", "adminId"],
        transaction,
      });

      const orgIds = managerOrgs.map((org) => org.id);

      if (orgIds.length === 0) {
        await transaction.rollback();
        throw new Error("AC device not found or unauthorized");
      }

      // Get all venues under manager's organizations
      const { Op } = require("sequelize");
      const adminId = managerOrgs[0]?.adminId;

      if (!adminId) {
        await transaction.rollback();
        throw new Error("AC device not found or unauthorized");
      }

      // ACs have venueId which references organizations table (not venues table)
      // So we only need to check if venueId matches manager's organizations
      // Note: AC.venueId directly references organizations table, so we use orgIds only

      // Find AC where venueId matches manager's organizations
      const ac = await AC.findOne({
        where: {
          id: acId,
          venueId: { [Op.in]: orgIds },
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

      if (!ac) {
        await transaction.rollback();
        throw new Error("AC device not found or unauthorized");
      }

      // Check organization and venue power state - hierarchical control
      // If organization is OFF, cannot toggle individual AC
      // If venue is OFF, cannot toggle individual AC
      const venueId = ac.venueId;
      const venue = await Venue.findOne({
        where: { id: venueId },
        transaction,
      });

      if (!venue) {
        await transaction.rollback();
        throw new Error("Venue not found for this AC");
      }

      // Check venue power state
      if (!venue.isVenueOn && powerState) {
        await transaction.rollback();
        throw new Error(
          "Cannot turn ON AC: Venue is currently OFF. Please turn on the venue first."
        );
      }

      // Check organization power state if venue belongs to an organization
      if (venue.organizationId) {
        const organization = await Venue.findOne({
          where: {
            id: venue.organizationId,
            adminId: venue.adminId,
          },
          attributes: ["isVenueOn"],
          transaction,
        });

        if (organization && !organization.isVenueOn && powerState) {
          await transaction.rollback();
          throw new Error(
            "Cannot turn ON AC: Organization is currently OFF. Please turn on the organization first."
          );
        }
      }

      // Note: Lock checking removed as currentState field doesn't exist in AC model
      // Lock functionality should be handled at organization level

      // Update AC power state
      // Ensure mode is set to "high" when turning on (default mode)
      const updateData = {
        isOn: powerState,
        lastPowerChangeAt: new Date(),
        lastPowerChangeBy: "manager",
      };

      // If turning on, reset working status and clear alerts (fresh start)
      // Alert system will check if it's actually working after it's been on
      if (powerState) {
        updateData.isWorking = true;
        updateData.alertAt = null;
        // If mode is not set or not "high", set it to "high"
        if (!ac.currentMode || ac.currentMode !== "high") {
          updateData.currentMode = "high";
        }
      }

      await ac.update(updateData, { transaction });

      // Get adminId from organization or venue
      const adminIdForLog =
        ac.organization?.adminId ||
        (ac.venue
          ? managerOrgs.find((o) => o.id === ac.venue.organizationId)?.adminId
          : null);

      // Log activity
      if (adminIdForLog) {
        await ActivityLog.create(
          {
            adminId: adminIdForLog,
            action: "TOGGLE_AC_POWER",
            targetType: "ac",
            targetId: acId,
            details: `AC ${ac.name} turned ${
              powerState ? "on" : "off"
            } by manager`,
            timestamp: new Date(),
          },
          { transaction }
        );
      }

      await transaction.commit();
      console.log(
        `✅ [MANAGER-POWER] Database transaction committed successfully`
      );

      // Handle energy consumption tracking when power state changes
      try {
        const adminModule = require("../admin");
        const EnergyConsumptionService =
          adminModule.Services?.EnergyConsumptionService ||
          require("../admin/services/energyConsumptionService");

        if (powerState) {
          // AC turned ON - initialize startup period and energy tracking
          await EnergyConsumptionService.handleACPowerOn(acId);
          // Don't call updateACEnergy immediately - let background scheduler handle it
          // Immediate call would calculate 0 energy since startupStartTime was just set
          // Organization energy will be updated by background scheduler
        } else {
          // AC turned OFF - finalize energy calculation
          await EnergyConsumptionService.handleACPowerOff(acId);
          // Update organization energy consumption after power off
          const orgIdForEnergy = ac.venue?.organizationId || ac.venueId;
          if (orgIdForEnergy) {
            await EnergyConsumptionService.updateOrganizationEnergy(
              orgIdForEnergy
            );
          }
        }
      } catch (energyError) {
        console.error(
          "⚠️ Error updating energy consumption after power change:",
          energyError
        );
        // Don't fail the whole operation if energy update fails
      }

      // Send power command to ESP via WebSocket
      try {
        if (ac.serialNumber) {
          console.log(
            `🔌 [MANAGER-POWER] Initiating WebSocket command for device ${ac.serialNumber}`
          );
          console.log(`   └─ Power state: ${powerState ? "ON" : "OFF"}`);
          const servicesGateway = require("../../../services");
          const ESPService = servicesGateway.getESPService();
          const wsResult = await ESPService.sendPowerCommand(
            ac.serialNumber, // Use serialNumber (ESP32 connections are keyed by serialNumber)
            powerState
          );

          if (wsResult.success) {
            console.log(
              `✅ [MANAGER-POWER] WebSocket command sent successfully to ${ac.serialNumber}`
            );
          } else {
            console.log(
              `⚠️ [MANAGER-POWER] WebSocket command result: ${wsResult.message}`
            );
          }
        } else {
          console.log(
            `⚠️ [MANAGER-POWER] Device ${ac.id} has no serialNumber, skipping WebSocket command`
          );
        }
      } catch (wsError) {
        console.error(
          "❌ [MANAGER-POWER] WebSocket command failed (database already updated):",
          wsError.message
        );
        console.error(`   └─ Stack:`, wsError.stack);
        // Don't fail the whole operation if WebSocket fails
      }

      // Broadcast real-time update to all frontend clients (admin and manager)
      try {
        const servicesGateway = require("../../../services");
        const ESPService = servicesGateway.getESPService();
        ESPService.broadcastToFrontend({
          device_id: ac.serialNumber,
          serialNumber: ac.serialNumber,
          temperature: ac.temperature,
          isOn: powerState,
          changedBy: "manager",
          organizationId: ac.organizationId,
          venueId: ac.venueId,
          timestamp: new Date().toISOString(),
        });
        console.log(
          `📡 [MANAGER-POWER] Broadcasted power change to all frontend clients`
        );
      } catch (broadcastError) {
        console.error("⚠️ Error broadcasting power change:", broadcastError);
        // Don't fail the operation if broadcast fails
      }

      return {
        success: true,
        message: `AC ${powerState ? "turned on" : "turned off"} successfully`,
        ac: {
          id: ac.id,
          name: ac.name,
          isOn: powerState,
          lastPowerChange: ac.lastPowerChange,
        },
      };
    } catch (error) {
      // Only rollback if transaction hasn't been finished
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  }

  // Get all ACs in manager's organizations
  static async getManagerACs(managerId) {
    try {
      console.log(`🔍 Querying ACs for managerId: ${managerId}`);

      // First, get all organization IDs assigned to this manager
      const managerOrgs = await Organization.findAll({
        where: { managerId: managerId },
        attributes: ["id", "name", "adminId"],
      });

      const orgIds = managerOrgs.map((org) => org.id);
      console.log(
        `📋 Manager ${managerId} has ${
          orgIds.length
        } organizations: [${orgIds.join(", ")}]`
      );

      if (orgIds.length === 0) {
        console.log(`⚠️  Manager ${managerId} has no assigned organizations`);
        return {
          success: true,
          data: [],
          acs: [],
        };
      }

      // Get all venues under manager's organizations (same as admin query)
      const { Op } = require("sequelize");

      // Get adminId from first organization
      const adminId = managerOrgs[0]?.adminId;
      if (!adminId) {
        console.log(`⚠️  Could not find adminId for manager's organizations`);
        return {
          success: true,
          data: [],
          acs: [],
        };
      }

      const venues = await Venue.findAll({
        where: {
          adminId: adminId,
          organizationId: { [Op.in]: orgIds.length > 0 ? orgIds : [-1] },
        },
        attributes: ["id", "name", "organizationId"],
      });
      const venueIds = venues.map((v) => v.id);

      console.log(
        `📋 Found ${
          venues.length
        } venues under manager's organizations: [${venueIds.join(", ")}]`
      );

      if (venueIds.length === 0) {
        console.log(`⚠️  No venues found under manager's organizations`);
        return {
          success: true,
          data: [],
          acs: [],
        };
      }

      // Get all ACs where venueId matches venue IDs (same as admin query)
      console.log(
        `🔍 Searching ACs with venueId in venue IDs: [${venueIds.join(", ")}]`
      );

      const acs = await AC.findAll({
        where: {
          venueId: { [Op.in]: venueIds },
        },
        include: [
          {
            model: Venue,
            as: "venue",
            required: false,
            attributes: ["id", "name", "organizationId"],
            include: [
              {
                model: Organization,
                as: "organization",
                required: false,
                attributes: ["id", "name"],
              },
            ],
          },
          {
            model: Organization,
            as: "organization",
            required: false,
            attributes: ["id", "name", "managerId", "adminId"],
          },
        ],
        attributes: [
          "id",
          "name",
          "model",
          "brand",
          "serialNumber",
          "temperature",
          "isOn",
          "lastPowerChangeAt",
          "currentState",
          "lockedBy",
          "lockedAt",
          "lockReason",
          "totalEnergyConsumed",
          "lastEnergyCalculation",
          "isOnStartup",
          "startupStartTime",
          "ton",
          "currentMode",
          "venueId",
          "createdAt",
        ],
        order: [["createdAt", "DESC"]],
      });

      // Add organization info to each AC
      const acsWithOrg = acs.map((ac) => {
        const acData = ac.toJSON();

        // Try to find organization from venue or direct organization
        let org = null;
        if (acData.venue && acData.venue.organization) {
          org = acData.venue.organization;
        } else if (acData.organization) {
          org = acData.organization;
        } else {
          // Fallback: find by venueId
          org = managerOrgs.find((o) => o.id === ac.venueId);
        }

        if (org) {
          acData.organization = {
            id: org.id,
            name: org.name || "Unknown",
            managerId: managerId,
          };
          acData.organizationId = org.id;
        }

        return acData;
      });

      console.log(`📊 Found ${acsWithOrg.length} ACs for manager ${managerId}`);
      if (acsWithOrg.length === 0) {
        console.log(
          `⚠️  No ACs found for manager ${managerId}. This could mean:`
        );
        console.log(`   1. Manager has no assigned organizations`);
        console.log(`   2. Assigned organizations have no venues`);
        console.log(`   3. Venues have no AC devices`);
        console.log(`   4. ACs have venueId that doesn't match venue IDs`);

        // Debug: Check if there are any ACs in database with these venueIds
        const allACsWithVenueIds = await AC.findAll({
          where: {
            venueId: { [Op.in]: venueIds },
          },
          attributes: ["id", "name", "venueId"],
          limit: 10,
        });
        console.log(
          `🔍 Debug: Found ${
            allACsWithVenueIds.length
          } ACs in database with venueIds matching venue IDs [${venueIds.join(
            ", "
          )}]`
        );
        if (allACsWithVenueIds.length > 0) {
          allACsWithVenueIds.forEach((ac) => {
            console.log(
              `   - AC ${ac.id}: ${ac.name} (venueId: ${ac.venueId})`
            );
          });
        } else {
          // Check all ACs in database
          const allACs = await AC.findAll({
            attributes: ["id", "name", "venueId"],
            limit: 10,
          });
          console.log(`🔍 Debug: Total ACs in database: ${allACs.length}`);
          if (allACs.length > 0) {
            console.log(`   Sample ACs with their venueIds:`);
            allACs.forEach((ac) => {
              console.log(
                `   - AC ${ac.id}: ${ac.name} (venueId: ${ac.venueId})`
              );
            });
          }
        }
      } else {
        acsWithOrg.forEach((ac) => {
          console.log(
            `   - AC ${ac.id}: ${ac.name} (venueId: ${ac.venueId}, Org: ${
              ac.organization?.name || "N/A"
            })`
          );
        });
      }

      return {
        success: true,
        data: acsWithOrg,
        acs: acsWithOrg,
      };
    } catch (error) {
      console.error("❌ Error in getManagerACs:", error);
      throw error;
    }
  }

  // Lock AC device
  static async lockAC(managerId, acId) {
    const transaction = await AC.sequelize.transaction();

    try {
      // Verify AC belongs to manager's organization
      const ac = await AC.findOne({
        include: [
          {
            model: Organization,
            as: "organization",
            where: { managerId: managerId },
          },
        ],
        where: { id: acId },
        transaction,
      });

      if (!ac) {
        throw new Error("AC device not found or unauthorized");
      }

      // Lock AC
      await ac.update(
        {
          currentState: "locked",
          lockedAt: new Date(),
          lockedBy: `Manager-${managerId}`,
        },
        { transaction }
      );

      // Log activity
      await ActivityLog.create(
        {
          adminId: ac.organization.adminId,
          action: "LOCK_AC",
          targetType: "ac",
          targetId: acId,
          details: `AC ${ac.name} locked by manager`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      // Send LOCK command to ESP32 device
      try {
        const Services = require("../../../services");
        const ESPService = Services.getESPService();
        if (ac.serialNumber) {
          // Send LOCK command to ESP32
          const result = ESPService.sendLockCommand(ac.serialNumber, true);
          if (result.success) {
            // When locking, also restore/sync temperature to dashboard value
            // This ensures ESP32 temperature matches database temperature
            const dashboardTemp = ac.temperature || 24;
            await ESPService.startTemperatureSync(
              ac.serialNumber,
              dashboardTemp
            );
            console.log(
              `✅ [LOCK] Sent LOCK command to ESP32: ${ac.serialNumber} (locked at ${dashboardTemp}°C, temperature synced)`
            );
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
        // Don't fail the operation if ESP32 notification fails
      }

      return {
        success: true,
        message: "AC device locked successfully",
        ac: {
          id: ac.id,
          name: ac.name,
          currentState: "locked",
        },
      };
    } catch (error) {
      // Only rollback if transaction hasn't been finished
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  }

  // Unlock AC device
  static async unlockAC(managerId, acId) {
    const transaction = await AC.sequelize.transaction();

    try {
      // Verify AC belongs to manager's organization
      const ac = await AC.findOne({
        include: [
          {
            model: Organization,
            as: "organization",
            where: { managerId: managerId },
          },
        ],
        where: { id: acId },
        transaction,
      });

      if (!ac) {
        throw new Error("AC device not found or unauthorized");
      }

      // Unlock AC
      await ac.update(
        {
          currentState: "unlocked",
          lockedAt: null,
          lockedBy: null,
        },
        { transaction }
      );

      // Log activity
      await ActivityLog.create(
        {
          adminId: ac.organization.adminId,
          action: "UNLOCK_AC",
          targetType: "ac",
          targetId: acId,
          details: `AC ${ac.name} unlocked by manager`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      // Send UNLOCK command to ESP32 device
      try {
        const Services = require("../../../services");
        const ESPService = Services.getESPService();
        if (ac.serialNumber) {
          // Send UNLOCK command to ESP32
          const result = ESPService.sendLockCommand(ac.serialNumber, false);
          if (result.success) {
            console.log(
              `✅ [LOCK] Sent UNLOCK command to ESP32: ${ac.serialNumber}`
            );
          } else {
            console.log(
              `⚠️ [LOCK] Failed to send unlock command to ESP32: ${ac.serialNumber} - ${result.message}`
            );
          }
        } else {
          console.log(
            `⚠️ [LOCK] AC ${ac.id} has no serial number, cannot send unlock command`
          );
        }
      } catch (espError) {
        console.error(
          "⚠️ Error sending lock state to ESP32 (non-critical):",
          espError.message
        );
        // Don't fail the operation if ESP32 notification fails
      }

      return {
        success: true,
        message: "AC device unlocked successfully",
        ac: {
          id: ac.id,
          name: ac.name,
          currentState: "unlocked",
        },
      };
    } catch (error) {
      // Only rollback if transaction hasn't been finished
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  }
}

module.exports = ManagerACService;
