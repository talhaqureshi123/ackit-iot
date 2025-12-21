const Organization = require("../../../models/Organization/organization");
const AC = require("../../../models/AC/ac");
const Venue = require("../../../models/Venue/venue");
const Event = require("../../../models/Event/event");
const ActivityLog = require("../../../models/Activity log/activityLog");
const { Op, Sequelize } = require("sequelize");
const sequelize = require("../../../config/database/postgresql");

class ManagerOrganizationService {
  // Get all organizations assigned to manager
  static async getAssignedOrganizations(managerId) {
    try {
      console.log(`🔍 Querying organizations for managerId: ${managerId}`);

      const organizations = await Organization.findAll({
        where: {
          managerId: managerId,
        },
        include: [
          {
            model: AC,
            as: "acs",
            required: false, // LEFT JOIN - include orgs even if no ACs
            attributes: [
              "id",
              "name",
              "model",
              "serialNumber",
              "temperature",
              "isOn",
              "totalEnergyConsumed",
              "ton",
              "currentMode",
              "currentState",
              "venueId",
            ],
          },
        ],
        attributes: [
          "id",
          "name",
          "batchNumber",
          "managerId",
          "adminId",
          // Organization model uses venues table, status column exists there
          // Use the model's attribute name - Sequelize will map it to the correct table column
          "status",
          "createdAt",
          "updatedAt",
        ],
        order: [["createdAt", "DESC"]],
      });

      console.log(
        `📊 Found ${organizations.length} organizations for manager ${managerId}`
      );
      if (organizations.length === 0) {
        console.log(
          `⚠️  No organizations assigned to manager ${managerId}. Manager needs to be assigned organizations by admin.`
        );
      } else {
        organizations.forEach((org) => {
          console.log(
            `   - Org ${org.id}: ${org.name} (${org.acs?.length || 0} ACs)`
          );
        });
      }

      // Get venues for all organizations (including temperature entries)
      const orgIds = organizations.map((org) => org.id);
      const allVenues = await Venue.findAll({
        where: {
          organizationId: { [Op.in]: orgIds },
        },
        attributes: [
          "id",
          "name",
          "organizationSize",
          "status",
          "organizationId",
          "temperature",
          "isVenueOn",
          "totalEnergyConsumed",
          "isLocked",
          "lockedTemperature",
          "lockedAt",
          "lockedByAdminId",
        ],
        order: [["createdAt", "DESC"]],
      });

      // Separate temperature entries (venues with same name as organization) from actual venues
      const orgTempEntries = {}; // For temperature/lock data
      const venuesByOrg = {}; // For actual venues

      allVenues.forEach((venue) => {
        const venueData = venue.toJSON();
        const org = organizations.find((o) => o.id === venue.organizationId);

        // If venue name matches organization name, it's a temperature entry
        if (org && venue.name === org.name) {
          orgTempEntries[venue.organizationId] = venueData;
        } else {
          // It's an actual venue
          if (!venuesByOrg[venue.organizationId]) {
            venuesByOrg[venue.organizationId] = [];
          }
          venuesByOrg[venue.organizationId].push(venueData);
        }
      });

      // Calculate hasMixedTemperatures for each organization and add venues
      const organizationsWithMixedFlag = organizations.map((org) => {
        const orgData = org.toJSON();

        // Merge temperature entry data if exists
        const tempEntry = orgTempEntries[org.id];
        if (tempEntry) {
          orgData.temperature = tempEntry.temperature || 16;
          orgData.isOrganizationOn = tempEntry.isVenueOn || false;
          orgData.isLocked = tempEntry.isLocked || false;
          orgData.lockedTemperature = tempEntry.lockedTemperature;
          orgData.lockedAt = tempEntry.lockedAt;
          orgData.lockedByAdminId = tempEntry.lockedByAdminId;
          orgData.status = tempEntry.status || "active";
        } else {
          // Default values if no temperature entry
          orgData.temperature = 16;
          orgData.isOrganizationOn = false;
          orgData.isLocked = false;
          orgData.status = "active";
        }

        const orgTemp = Math.round(orgData.temperature || 16);

        // Check if any AC has different temperature than organization
        let hasMixedTemperatures = false;
        if (orgData.acs && orgData.acs.length > 0) {
          hasMixedTemperatures = orgData.acs.some((ac) => {
            const acTemp = Math.round(ac.temperature || 16);
            return acTemp !== orgTemp;
          });
        }

        orgData.hasMixedTemperatures = hasMixedTemperatures;

        // Add ACs that are off when organization is on
        orgData.acsOffCount = 0;
        orgData.acsOff = [];

        if (orgData.isOrganizationOn && orgData.acs && orgData.acs.length > 0) {
          orgData.acsOff = orgData.acs.filter((ac) => !ac.isOn);
          orgData.acsOffCount = orgData.acsOff.length;
        }

        // Add venues for this organization (exclude temperature entries)
        orgData.venues = venuesByOrg[org.id] || [];

        return orgData;
      });

      return {
        success: true,
        organizations: organizationsWithMixedFlag,
      };
    } catch (error) {
      console.error("❌ Error in getAssignedOrganizations:", error);
      throw error;
    }
  }

  // Get organization details with all ACs
  static async getOrganizationDetails(managerId, organizationId) {
    try {
      console.log(
        `🔍 Getting organization details for manager ${managerId}, org ${organizationId}`
      );

      const organization = await Organization.findOne({
        where: {
          id: organizationId,
          managerId: managerId,
        },
        attributes: [
          "id",
          "name",
          "batchNumber",
          "status",
          "managerId",
          "adminId",
          "createdAt",
          "updatedAt",
        ],
      });

      if (!organization) {
        throw new Error("Organization not found or unauthorized");
      }

      // Get ACs for this organization (where venueId = organizationId)
      const acs = await AC.findAll({
        where: {
          venueId: organizationId,
        },
        attributes: [
          "id",
          "name",
          "brand",
          "model",
          "serialNumber",
          "temperature",
          "isOn",
          "isWorking",
          "ton",
          "currentMode",
          "totalEnergyConsumed",
          "lastEnergyCalculation",
          "isOnStartup",
          "startupStartTime",
          "currentState",
          "venueId",
          "createdAt",
          "updatedAt",
        ],
      });

      // Get venues for this organization
      const venues = await Venue.findAll({
        where: {
          organizationId: organizationId,
        },
        attributes: [
          "id",
          "name",
          "organizationSize",
          "status",
          "organizationId",
          "temperature",
          "isVenueOn",
          "totalEnergyConsumed",
          "isLocked",
          "lockedTemperature",
          "lockedAt",
          "lockedByAdminId",
        ],
      });

      // Get temperature entry (venue with same name as organization)
      const tempEntry = venues.find((v) => v.name === organization.name);

      // Get actual venues (excluding temperature entry)
      const actualVenues = venues.filter((v) => v.name !== organization.name);

      // Build organization data
      const orgData = organization.toJSON();

      // Add temperature and power data from temperature entry
      if (tempEntry) {
        orgData.temperature = tempEntry.temperature || 16;
        orgData.isOrganizationOn = tempEntry.isVenueOn || false;
        orgData.isLocked = tempEntry.isLocked || false;
        orgData.lockedTemperature = tempEntry.lockedTemperature;
        orgData.lockedAt = tempEntry.lockedAt;
        orgData.lockedByAdminId = tempEntry.lockedByAdminId;
      } else {
        orgData.temperature = 16;
        orgData.isOrganizationOn = false;
        orgData.isLocked = false;
      }

      // Add ACs and venues
      orgData.acs = acs.map((ac) => ac.toJSON());
      orgData.venues = actualVenues.map((v) => v.toJSON());

      // Calculate hasMixedTemperatures
      const orgTemp = Math.round(orgData.temperature || 16);
      let hasMixedTemperatures = false;
      if (orgData.acs && orgData.acs.length > 0) {
        hasMixedTemperatures = orgData.acs.some((ac) => {
          const acTemp = Math.round(ac.temperature || 16);
          return acTemp !== orgTemp;
        });
      }
      orgData.hasMixedTemperatures = hasMixedTemperatures;

      // Add ACs that are off when organization is on
      orgData.acsOffCount = 0;
      orgData.acsOff = [];

      if (orgData.isOrganizationOn && orgData.acs && orgData.acs.length > 0) {
        orgData.acsOff = orgData.acs.filter((ac) => !ac.isOn);
        orgData.acsOffCount = orgData.acsOff.length;
      }

      console.log(
        `✅ Found organization: ${orgData.name} with ${
          orgData.acs?.length || 0
        } ACs`
      );

      return {
        success: true,
        organization: orgData,
      };
    } catch (error) {
      console.error("❌ Error in getOrganizationDetails:", error);
      throw error;
    }
  }

  // Split organization into multiple organizations
  static async splitOrganization(managerId, organizationId, splitData) {
    const transaction = await Organization.sequelize.transaction();

    try {
      // Verify organization belongs to manager
      const originalOrg = await Organization.findOne({
        where: {
          id: organizationId,
          managerId: managerId,
        },
        include: [
          {
            model: AC,
            as: "acs",
          },
        ],
        transaction,
      });

      if (!originalOrg) {
        throw new Error("Organization not found or unauthorized");
      }

      if (originalOrg.status === "suspended") {
        throw new Error("Cannot split suspended organization");
      }

      // Validate organization size for splitting
      const orgSize = originalOrg.organizationSize;
      if (!orgSize) {
        throw new Error(
          "Organization size is not set. Cannot split organization."
        );
      }

      // Size-based split rules:
      // - Small: Cannot split
      // - Medium: Can split into 2 Small organizations
      // - Large: Can split into 2 Medium organizations
      if (orgSize === "Small") {
        throw new Error("Small organizations cannot be split.");
      }

      // Determine the organization size for split organizations
      let splitOrganizationSize;
      if (orgSize === "Medium") {
        splitOrganizationSize = "Small";
      } else if (orgSize === "Large") {
        splitOrganizationSize = "Medium";
      } else {
        throw new Error(
          `Invalid organization size '${orgSize}' for splitting. Only Medium and Large organizations can be split.`
        );
      }

      // Validate that exactly 2 splits are being created
      if (!splitData.splits || splitData.splits.length !== 2) {
        throw new Error(
          `A ${orgSize} organization must be split into exactly 2 ${splitOrganizationSize} organizations.`
        );
      }

      // Create split history record for undo functionality
      const splitHistory = {
        originalOrgId: organizationId,
        originalName: originalOrg.name,
        originalSize: orgSize,
        splitTimestamp: new Date(),
        managerId: managerId,
        splitData: splitData,
      };

      // Get all ACs from original organization for energy updates
      const allOriginalACs = originalOrg.acs || [];

      // Create new organizations from split
      const newOrganizations = [];
      const allMovedACs = []; // Track all ACs that are moved to new organizations

      for (const split of splitData.splits) {
        // Copy temperature and other settings from original organization
        const newOrg = await Organization.create(
          {
            name: split.name,
            organizationSize: splitOrganizationSize, // Set size based on parent organization
            venueId: originalOrg.venueId,
            adminId: originalOrg.adminId,
            managerId: managerId,
            status: "active", // Split organizations are active, so they appear as proper organizations
            temperature: originalOrg.temperature || 16, // Copy temperature from original
            lastTemperatureChange: originalOrg.lastTemperatureChange,
            changedBy: originalOrg.changedBy,
            splitFromId: organizationId, // Track original for undo
            splitHistory: JSON.stringify(splitHistory),
            totalEnergyConsumed: 0, // Initialize energy consumption
            lastEnergyCalculation: new Date(),
          },
          { transaction }
        );

        newOrganizations.push(newOrg);

        // Assign specified ACs to this new organization
        if (split.acIds && split.acIds.length > 0) {
          // Update ACs to belong to new organization and set temperature
          await AC.update(
            {
              organizationId: newOrg.id,
              temperature: originalOrg.temperature || 16, // Copy temperature to ACs
              lastTemperatureChange: new Date(),
              changedBy: "manager",
            },
            {
              where: {
                id: { [Op.in]: split.acIds },
                organizationId: organizationId,
              },
              transaction,
            }
          );

          // Track moved ACs for energy updates
          const movedACs = allOriginalACs.filter((ac) =>
            split.acIds.includes(ac.id)
          );
          allMovedACs.push(...movedACs);
        }
      }

      // Update original organization status to indicate it was split
      await originalOrg.update(
        {
          status: "split",
          splitIntoIds: JSON.stringify(newOrganizations.map((org) => org.id)),
          splitAt: new Date(),
        },
        { transaction }
      );

      // Log activity
      await ActivityLog.create(
        {
          adminId: originalOrg.adminId,
          action: "SPLIT_ORGANIZATION",
          targetType: "organization",
          targetId: organizationId,
          details: `Split organization ${originalOrg.name} into ${newOrganizations.length} organizations`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      // Update energy consumption for all ACs that were moved to new organizations
      try {
        const adminModule = require("../admin");
        const EnergyConsumptionService =
          adminModule.Services?.EnergyConsumptionService ||
          require("../admin/services/energyConsumptionService");

        // Update energy for all moved ACs
        for (const ac of allMovedACs) {
          await EnergyConsumptionService.updateACEnergy(ac.id);
        }

        // Update energy totals for all new split organizations
        for (const newOrg of newOrganizations) {
          await EnergyConsumptionService.updateOrganizationEnergy(newOrg.id);
        }

        console.log(
          `✅ Energy consumption initialized for ${newOrganizations.length} split organizations`
        );
      } catch (energyError) {
        console.error(
          "⚠️ Error updating energy after organization split:",
          energyError
        );
        // Don't fail the transaction - energy update is not critical
      }

      // Reload new organizations with their ACs for proper response
      const newOrgsWithACs = await Organization.findAll({
        where: {
          id: { [Op.in]: newOrganizations.map((org) => org.id) },
        },
        include: [
          {
            model: AC,
            as: "acs",
            required: false,
            attributes: [
              "id",
              "name",
              "model",
              "serialNumber",
              "temperature",
              "isOn",
            ],
          },
        ],
        attributes: [
          "id",
          "name",
          "organizationSize",
          "status",
          "managerId",
          "adminId",
          "temperature",
          "lastTemperatureChange",
          "changedBy",
          "isLocked",
          "splitFromId",
          "createdAt",
          "updatedAt",
        ],
      });

      return {
        success: true,
        message: `Organization split successfully into ${newOrganizations.length} organizations`,
        originalOrganization: {
          id: originalOrg.id,
          name: originalOrg.name,
          status: originalOrg.status,
        },
        newOrganizations: newOrgsWithACs.map((org) => {
          const orgData = org.toJSON();
          // Calculate hasMixedTemperatures for each new organization
          const orgTemp = Math.round(org.temperature || 16);
          let hasMixedTemperatures = false;
          if (orgData.acs && orgData.acs.length > 0) {
            hasMixedTemperatures = orgData.acs.some((ac) => {
              const acTemp = Math.round(ac.temperature || 16);
              return acTemp !== orgTemp;
            });
          }
          orgData.hasMixedTemperatures = hasMixedTemperatures;
          return orgData;
        }),
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Undo organization split (merge back)
  static async undoOrganizationSplit(managerId, originalOrgId) {
    const transaction = await Organization.sequelize.transaction();

    try {
      console.log(
        `🔄 Starting undo split process for organization ${originalOrgId} by manager ${managerId}`
      );

      // Find original organization
      const originalOrg = await Organization.findOne({
        where: {
          id: originalOrgId,
          managerId: managerId,
          status: "split",
        },
        transaction,
      });

      if (!originalOrg) {
        console.error(
          `❌ Organization ${originalOrgId} not found, not split, or not owned by manager ${managerId}`
        );
        throw new Error(
          "Original organization not found, not split, or you don't have permission to undo this split"
        );
      }

      if (!originalOrg.splitIntoIds) {
        console.error(
          `❌ Organization ${originalOrgId} has no splitIntoIds data`
        );
        throw new Error(
          "Organization split data is incomplete. Cannot undo split."
        );
      }

      let splitIntoIds;
      try {
        splitIntoIds = JSON.parse(originalOrg.splitIntoIds);
      } catch (parseError) {
        console.error(
          `❌ Failed to parse splitIntoIds for organization ${originalOrgId}:`,
          parseError
        );
        throw new Error("Invalid split data. Cannot undo split.");
      }

      if (!Array.isArray(splitIntoIds) || splitIntoIds.length === 0) {
        console.error(
          `❌ Organization ${originalOrgId} has invalid or empty splitIntoIds`
        );
        throw new Error(
          "No split organizations found. Split may have already been undone."
        );
      }

      console.log(
        `📋 Found ${splitIntoIds.length} split organization(s) to merge:`,
        splitIntoIds
      );

      // Find all split organizations (verify they belong to same manager)
      const splitOrgs = await Organization.findAll({
        where: {
          id: { [Op.in]: splitIntoIds },
          splitFromId: originalOrgId,
          managerId: managerId, // Ensure all splits belong to same manager
        },
        include: [
          {
            model: AC,
            as: "acs",
          },
        ],
        transaction,
      });

      if (splitOrgs.length === 0) {
        console.error(
          `❌ No split organizations found matching the criteria for organization ${originalOrgId}`
        );
        throw new Error(
          "Split organizations not found. They may have been deleted or modified."
        );
      }

      if (splitOrgs.length !== splitIntoIds.length) {
        console.warn(
          `⚠️ Warning: Expected ${splitIntoIds.length} split organizations but found ${splitOrgs.length}`
        );
      }

      console.log(
        `🔄 Moving ACs from ${splitOrgs.length} split organization(s) back to original organization`
      );

      // Move all ACs back to original organization
      let totalACsMoved = 0;
      for (const splitOrg of splitOrgs) {
        if (splitOrg.acs && splitOrg.acs.length > 0) {
          const acUpdateResult = await AC.update(
            { organizationId: originalOrgId },
            {
              where: {
                organizationId: splitOrg.id,
              },
              transaction,
            }
          );
          totalACsMoved += acUpdateResult[0] || 0;
          console.log(
            `   ✓ Moved ${
              acUpdateResult[0] || 0
            } AC(s) from split organization ${splitOrg.id} (${splitOrg.name})`
          );
        } else {
          console.log(
            `   ℹ No ACs to move from split organization ${splitOrg.id} (${splitOrg.name})`
          );
        }

        // Delete split organization
        await splitOrg.destroy({ transaction });
        console.log(
          `   ✓ Deleted split organization ${splitOrg.id} (${splitOrg.name})`
        );
      }

      // Restore original organization
      await originalOrg.update(
        {
          status: "active",
          splitIntoIds: null,
          splitAt: null,
        },
        { transaction }
      );

      // Log activity
      await ActivityLog.create(
        {
          adminId: originalOrg.adminId,
          action: "UNDO_ORGANIZATION_SPLIT",
          targetType: "organization",
          targetId: originalOrgId,
          details: `Manager ${managerId} undid split for organization ${originalOrg.name}. Merged ${splitOrgs.length} split organization(s) and moved ${totalACsMoved} AC device(s) back.`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      // Update energy consumption for all ACs in organization after temperature change
      try {
        const adminModule = require("../admin");
        const EnergyConsumptionService =
          adminModule.Services?.EnergyConsumptionService ||
          require("../admin/services/energyConsumptionService");
        for (const ac of allACs) {
          await EnergyConsumptionService.updateACEnergy(ac.id);
        }
        // Update organization energy total
        await EnergyConsumptionService.updateOrganizationEnergy(organizationId);
      } catch (energyError) {
        console.error(
          "⚠️ Error updating energy after temperature change:",
          energyError
        );
        // Don't fail the transaction - energy update is not critical
      }

      console.log(
        `✅ Successfully undone split for organization ${originalOrgId}. Restored ${totalACsMoved} AC(s) from ${splitOrgs.length} split organization(s).`
      );

      return {
        success: true,
        message: `Organization split undone successfully. Merged ${splitOrgs.length} split organization(s) and restored ${totalACsMoved} AC device(s).`,
        restoredOrganization: originalOrg,
        splitOrgsMerged: splitOrgs.length,
        acsRestored: totalACsMoved,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Set temperature for entire organization
  static async setOrganizationTemperature(
    managerId,
    organizationId,
    temperature
  ) {
    const transaction = await Organization.sequelize.transaction();

    try {
      // Verify organization belongs to manager
      const organization = await Organization.findOne({
        where: {
          id: organizationId,
          managerId: managerId,
        },
        transaction,
      });

      if (!organization) {
        throw new Error("Organization not found or unauthorized");
      }

      // Check if organization is locked
      if (organization.isLocked) {
        const lockedTemp = organization.lockedTemperature || "N/A";
        throw new Error(
          `Cannot change temperature: Organization is locked at ${lockedTemp}°C`
        );
      }

      if (organization.status === "suspended") {
        throw new Error("Cannot control temperature of suspended organization");
      }

      const oldOrgTemp = organization.temperature;
      console.log(`🌡️ [MANAGER-ORG-TEMP] Temperature Change Request:`);
      console.log(
        `   └─ Organization: ${organization.name} (ID: ${organizationId})`
      );
      console.log(`   └─ Old Temperature: ${oldOrgTemp}°C`);
      console.log(`   └─ New Temperature: ${temperature}°C`);
      console.log(`   └─ Changed By: Manager (ID: ${managerId})`);
      console.log(`   └─ Timestamp: ${new Date().toISOString()}`);

      // Update organization temperature field
      await organization.update(
        {
          temperature: temperature,
          lastTemperatureChange: new Date(),
          changedBy: "manager",
        },
        { transaction }
      );

      // Get all venues under this organization (similar to admin implementation)
      const Venue = require("../../../models/Venue/venue");
      const { Op } = require("sequelize");
      const allOrgVenues = await Venue.findAll({
        where: {
          organizationId: organizationId,
          adminId: organization.adminId,
        },
        attributes: ["id", "name", "temperature", "organizationId"],
        transaction,
      });
      console.log(
        `📊 [MANAGER-ORG-TEMP] Found ${allOrgVenues.length} venues in organization`
      );

      // Update ALL venues under this organization
      if (allOrgVenues.length > 0) {
        await Venue.update(
          {
            temperature: temperature,
            lastTemperatureChange: new Date(),
            changedBy: "manager",
          },
          {
            where: {
              organizationId: organizationId,
              adminId: organization.adminId,
            },
            transaction,
          }
        );
        console.log(
          `✅ [MANAGER-ORG-TEMP] Updated ALL ${allOrgVenues.length} venues to ${temperature}°C`
        );
      }

      // Get all ACs in organization (from all venues)
      const venueIds = allOrgVenues.map((v) => v.id);
      const allACs =
        venueIds.length > 0
          ? await AC.findAll({
              where: { venueId: { [Op.in]: venueIds } },
              attributes: [
                "id",
                "name",
                "temperature",
                "serialNumber",
                "key",
                "isOn",
                "venueId",
              ],
              transaction,
            })
          : [];

      // Filter ACs by ON/OFF status for logging
      const acsOn = allACs.filter((ac) => ac.isOn);
      const acsOff = allACs.filter((ac) => !ac.isOn);

      // Log all ACs that will be updated
      if (allACs.length > 0) {
        console.log(
          `🌡️ [MANAGER-ORG-TEMP] Will update ${allACs.length} AC devices (${acsOn.length} ON, ${acsOff.length} OFF):`
        );
        allACs.forEach((ac) => {
          console.log(
            `   └─ AC: ${ac.name} (${ac.serialNumber}) - Status: ${
              ac.isOn ? "ON" : "OFF"
            }`
          );
          console.log(
            `      Old Temp: ${ac.temperature}°C → New Temp: ${temperature}°C`
          );
        });
      }

      // Check for devices with active events (skip them from temperature update)
      const deviceIds = allACs.map((ac) => ac.id);
      const activeEvents =
        deviceIds.length > 0
          ? await Event.findAll({
              where: {
                deviceId: { [Op.in]: deviceIds },
                status: "active",
                isDisabled: false,
                eventType: "device",
              },
              attributes: ["deviceId"],
              transaction,
            })
          : [];
      const devicesWithActiveEvents = new Set(
        activeEvents.map((e) => e.deviceId)
      );
      const devicesToUpdate = allACs.filter(
        (ac) => !devicesWithActiveEvents.has(ac.id)
      );
      const devicesSkipped = allACs.filter((ac) =>
        devicesWithActiveEvents.has(ac.id)
      );

      if (devicesSkipped.length > 0) {
        console.log(
          `⚠️ [MANAGER-ORG-TEMP] Skipping ${
            devicesSkipped.length
          } device(s) with active events: ${devicesSkipped
            .map((ac) => ac.name)
            .join(", ")}`
        );
      }

      // Update ALL AC temperatures (ON and OFF both) - EXCEPT devices with active events
      let acsUpdated = 0;
      if (devicesToUpdate.length > 0 && venueIds.length > 0) {
        const deviceIdsToUpdate = devicesToUpdate.map((ac) => ac.id);
        const acUpdateResult = await AC.update(
          {
            temperature: temperature,
            lastTemperatureChange: new Date(),
            changedBy: "manager",
          },
          {
            where: {
              venueId: { [Op.in]: venueIds },
              id: { [Op.in]: deviceIdsToUpdate },
              // Removed isOn: true - Update ALL devices (ON/OFF both) except those with active events
            },
            transaction,
          }
        );
        acsUpdated = acUpdateResult[0];
        console.log(
          `✅ [MANAGER-ORG-TEMP] Updated ${
            devicesToUpdate.length
          } AC temperatures (${
            devicesToUpdate.filter((ac) => ac.isOn).length
          } ON, ${
            devicesToUpdate.filter((ac) => !ac.isOn).length
          } OFF): ${oldOrgTemp}°C → ${temperature}°C (${
            devicesSkipped.length
          } skipped due to active events)`
        );
      }

      // Log activity with detailed information
      await ActivityLog.create(
        {
          adminId: organization.adminId,
          action: "SET_ORGANIZATION_TEMPERATURE",
          targetType: "organization",
          targetId: organizationId,
          details: `Set temperature to ${temperature}°C for organization ${organization.name} (updated ${allOrgVenues.length} venues and ${acsUpdated} ACs - ON/OFF both)`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      // Update energy consumption for all ACs in organization after temperature change (only for ACs that are ON)
      try {
        const adminModule = require("../admin");
        const EnergyConsumptionService =
          adminModule.Services?.EnergyConsumptionService ||
          require("../admin/services/energyConsumptionService");
        for (const ac of acsOn) {
          await EnergyConsumptionService.updateACEnergy(ac.id);
        }
        // Update organization energy total
        await EnergyConsumptionService.updateOrganizationEnergy(organizationId);
      } catch (energyError) {
        console.error(
          "⚠️ Error updating energy after temperature change:",
          energyError
        );
        // Don't fail the transaction - energy update is not critical
      }
      console.log(
        `✅ [MANAGER-ORG] Database transaction committed successfully`
      );
      console.log(
        `   └─ Organization: ${organization.name} (ID: ${organizationId})`
      );
      console.log(`   └─ Temperature: ${temperature}°C`);
      console.log(`   └─ Venues updated in database: ${allOrgVenues.length}`);
      console.log(
        `   └─ ACs updated in database: ${acsUpdated} (${acsOn.length} ON, ${acsOff.length} OFF)`
      );

      // Send temperature command to all ESP devices in organization (ON and OFF both)
      try {
        console.log(
          `🔌 [MANAGER-ORG] Initiating WebSocket commands for ${allACs.length} devices`
        );
        const servicesGateway = require("../../../services");
        const ESPService = servicesGateway.getESPService();

        let sentCount = 0;
        let skippedCount = 0;

        // Only send WebSocket commands to devices without active events
        for (const ac of devicesToUpdate) {
          if (ac.serialNumber) {
            console.log(`   └─ Processing device: ${ac.serialNumber}`);
            // Use startTemperatureSync with serial number for proper sync (same as admin)
            await ESPService.startTemperatureSync(ac.serialNumber, temperature);
            sentCount++;
          } else {
            skippedCount++;
            console.log(
              `   └─ ⚠️ Device ${ac.id} has no serial number, skipped`
            );
          }
        }

        // Log skipped devices with active events
        for (const ac of devicesSkipped) {
          skippedCount++;
          console.log(
            `   └─ ⚠️ Device ${
              ac.serialNumber || ac.id
            } skipped (has active event)`
          );
        }

        console.log(`✅ [MANAGER-ORG] WebSocket commands completed:`);
        console.log(`   └─ Commands sent: ${sentCount}`);
        console.log(`   └─ Commands skipped: ${skippedCount}`);
      } catch (wsError) {
        console.error(
          "❌ [MANAGER-ORG] WebSocket commands failed (database already updated):",
          wsError.message
        );
        console.error(`   └─ Stack:`, wsError.stack);
        // Don't fail the whole operation if WebSocket fails
      }

      return {
        success: true,
        message: `Organization temperature set to ${temperature}°C. Updated ${
          allOrgVenues.length
        } venues and ${acsUpdated} devices (${
          devicesToUpdate.filter((ac) => ac.isOn).length
        } ON, ${devicesToUpdate.filter((ac) => !ac.isOn).length} OFF)${
          devicesSkipped.length > 0
            ? `. ${devicesSkipped.length} device(s) skipped due to active events`
            : ""
        }`,
        organization: {
          id: organization.id,
          name: organization.name,
          temperature: temperature,
          hasMixedTemperatures: false, // Organization temp set, so no mixed (all venues now have same temp)
        },
        venuesUpdated: allOrgVenues.length,
        acsUpdated: acsUpdated,
        acsOnUpdated: acsOn.length,
        acsOffUpdated: acsOff.length,
        totalACs: allACs.length,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Set temperature for entire organization (Admin)
  static async setOrganizationTemperatureByAdmin(
    adminId,
    organizationId,
    temperature
  ) {
    const transaction = await Organization.sequelize.transaction();

    try {
      console.log(
        `Setting temperature for organization ${organizationId} to ${temperature}°C by admin ${adminId}`
      );

      // Find organization and verify admin has access
      const organization = await Organization.findOne({
        where: {
          id: organizationId,
          adminId: adminId,
        },
        transaction,
      });

      if (!organization) {
        throw new Error("Organization not found or admin not authorized");
      }

      // Check if organization is suspended
      if (organization.status === "suspended") {
        throw new Error("Cannot control temperature of suspended organization");
      }

      // Update organization temperature field
      await organization.update(
        {
          temperature: temperature,
          lastTemperatureChange: new Date(),
          changedBy: "admin",
        },
        { transaction }
      );

      // Admin can override manager locks - update ALL ACs regardless of lock status
      console.log(
        "🔓 Admin overriding any manager locks for temperature control"
      );
      const acUpdateResult = await AC.update(
        {
          temperature: temperature,
          lastTemperatureChange: new Date(),
          changedBy: "admin",
          // Admin override - temporarily unlock for temperature change
          adminOverride: true,
          adminOverrideAt: new Date(),
        },
        {
          where: {
            organizationId: organizationId,
            status: "active",
            // Admin can control locked ACs - remove currentState restriction
          },
          transaction,
        }
      );

      const acsUpdated = acUpdateResult[0];

      // Log activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: "SET_ORGANIZATION_TEMPERATURE_ADMIN_OVERRIDE",
          targetType: "organization",
          targetId: organizationId,
          details: `Admin override: Set temperature to ${temperature}°C for organization ${organization.name} (updated ${acsUpdated} ACs, bypassed manager locks)`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      // Update energy consumption for all ACs in organization after temperature change
      try {
        const adminModule = require("../admin");
        const EnergyConsumptionService =
          adminModule.Services?.EnergyConsumptionService ||
          require("../admin/services/energyConsumptionService");
        for (const ac of allACs) {
          await EnergyConsumptionService.updateACEnergy(ac.id);
        }
        // Update organization energy total
        await EnergyConsumptionService.updateOrganizationEnergy(organizationId);
      } catch (energyError) {
        console.error(
          "⚠️ Error updating energy after temperature change:",
          energyError
        );
        // Don't fail the transaction - energy update is not critical
      }
      console.log(`✅ [ADMIN-ORG] Database transaction committed successfully`);
      console.log(
        `   └─ Organization: ${organization.name} (ID: ${organizationId})`
      );
      console.log(`   └─ Temperature: ${temperature}°C`);
      console.log(`   └─ ACs updated in database: ${acsUpdated}`);

      // Send temperature command to all ESP devices in organization
      try {
        console.log(
          `🔌 [ADMIN-ORG] Fetching all ACs with keys for WebSocket commands...`
        );
        const servicesGateway = require("../../../services");
        const ESPService = servicesGateway.getESPService();
        const allACsWithSerial = await AC.findAll({
          where: { organizationId },
          attributes: ["serialNumber", "key"],
        });

        console.log(
          `📊 [ADMIN-ORG] Found ${allACsWithSerial.length} ACs in organization`
        );
        console.log(
          `   └─ Sending WebSocket commands to devices that are ON...`
        );

        let sentCount = 0;
        let skippedCount = 0;

        for (const ac of allACsWithSerial) {
          if (ac.key) {
            console.log(
              `   └─ Processing device: ${ac.serialNumber} (Key: ${ac.key})`
            );
            const wsResult = await ESPService.sendTemperatureCommand(
              ac.key, // Use key instead of serial number
              temperature
            );

            if (wsResult.success) {
              sentCount++;
            } else {
              skippedCount++;
              console.log(`      ⚠️ Skipped: ${wsResult.message}`);
            }
          } else {
            skippedCount++;
            console.log(`   └─ ⚠️ Device has no key, skipped`);
          }
        }

        console.log(`✅ [ADMIN-ORG] WebSocket commands completed:`);
        console.log(`   └─ Commands sent: ${sentCount}`);
        console.log(`   └─ Commands skipped: ${skippedCount}`);
      } catch (wsError) {
        console.error(
          "❌ [ADMIN-ORG] WebSocket commands failed (database already updated):",
          wsError.message
        );
        console.error(`   └─ Stack:`, wsError.stack);
        // Don't fail the whole operation if WebSocket fails
      }

      return {
        success: true,
        message: `Organization temperature set to ${temperature}°C`,
        organization: {
          id: organization.id,
          name: organization.name,
          temperature: temperature,
        },
        acsUpdated: acsUpdated,
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Set organization temperature by admin error:", error);
      throw error;
    }
  }

  // Note: Organization suspension functionality has been removed
  // Organizations can only be active or split

  // Toggle organization power state (ON/OFF) - Manager
  static async toggleOrganizationPower(managerId, organizationId, powerState) {
    try {
      // Verify organization belongs to manager
      const organization = await Organization.findOne({
        where: {
          id: organizationId,
          managerId: managerId,
        },
      });

      if (!organization) {
        throw new Error("Organization not found or unauthorized");
      }

      // Check if organization is locked
      if (organization.isLocked) {
        throw new Error("Cannot toggle power: Organization is locked");
      }

      // Use the admin OrganizationService method (which handles transactions internally)
      // We just need to verify manager access first
      const OrganizationService = require("../../admin/services/organizationService");
      const result = await OrganizationService.toggleOrganizationPower(
        organizationId,
        powerState,
        "manager",
        managerId
      );

      return result;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ManagerOrganizationService;
