const Organization = require("../../../models/Organization/organization");
const Venue = require("../../../models/Venue/venue");
const AC = require("../../../models/AC/ac");
const Event = require("../../../models/Event/event");
const ActivityLog = require("../../../models/Activity log/activityLog");
const SystemState = require("../../../models/SystemState/systemState");
const Manager = require("../../../models/Roleaccess/manager");
const { Op } = require("sequelize");

class OrganizationService {
  // Create a new organization (simple - just name and batchNumber)
  static async createOrganization(adminId, organizationData) {
    const transaction = await Organization.sequelize.transaction();

    try {
      // Check if an organization with this name already exists
      const existingOrg = await Organization.findOne({
        where: {
          name: organizationData.name,
          adminId: adminId,
        },
        transaction,
      });

      if (existingOrg) {
        throw new Error(
          `Organization with name "${organizationData.name}" already exists. Please use a different name.`
        );
      }

      // Also check if a Venue entry exists with this name (temperature entry)
      // Venue model uses organizations table, so this could conflict
      const existingVenue = await Venue.findOne({
        where: {
          name: organizationData.name,
          adminId: adminId,
        },
        transaction,
      });

      if (existingVenue) {
        throw new Error(
          `An entry with name "${organizationData.name}" already exists (possibly a venue). Please use a different name for the organization.`
        );
      }

      // Create organization with name and batch number
      const organization = await Organization.create(
        {
          name: organizationData.name,
          batchNumber: organizationData.batchNumber,
          adminId: adminId,
        },
        { transaction }
      );

      // Log activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: "CREATE_ORGANIZATION",
          targetType: "organization",
          targetId: organization.id,
          details: `Created organization: ${organization.name}`,
          timestamp: organization.createdAt,
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: "Organization created successfully",
        organization: {
          id: organization.id,
          name: organization.name,
          batchNumber: organization.batchNumber,
          adminId: organization.adminId,
          createdAt: organization.createdAt,
        },
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Get all organizations under an admin
  // Note: Organization model is simple, but we also need to get Venue model data (which uses organizations table)
  // to show lock/temperature fields. We'll merge both.
  static async getOrganizationsByAdmin(adminId) {
    try {
      // Get simple organizations (from venues table)
      const simpleOrgs = await Organization.findAll({
        where: { adminId: adminId },
        attributes: [
          "id",
          "name",
          "batchNumber",
          "adminId",
          "createdAt",
          "updatedAt",
        ],
        order: [["createdAt", "DESC"]],
      });

      // Get venues (from organizations table) which have lock/temperature fields
      const venues = await Venue.findAll({
        where: { adminId: adminId },
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
          "lockedTemperature",
          "lockedAt",
          "lockedByAdminId",
          "totalEnergyConsumed",
          "lastEnergyCalculation",
          "isVenueOn",
          "venuePowerChangedAt",
          "venuePowerChangedBy",
          "createdAt",
          "updatedAt",
        ],
        include: [
          {
            model: Manager,
            as: "manager",
            required: false,
            attributes: ["id", "name", "email"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      // IMPORTANT: Venues are child entities of Organizations
      // Only show Organizations in the list, not individual Venues
      // Venues should be shown under their parent Organization

      // Filter out temperature entries (venues with same name as their parent organization)
      // These are not actual child venues, they're just for temperature/lock control
      const actualChildVenues = venues.filter((venue) => {
        if (!venue.organizationId) return false;
        // Find the parent organization
        const parentOrg = simpleOrgs.find(
          (org) => org.id === venue.organizationId
        );
        // If venue name matches parent org name, it's a temperature entry, not a child venue
        if (parentOrg && venue.name === parentOrg.name) {
          return false; // Skip temperature entries
        }
        return true; // This is an actual child venue
      });

      // Create a map of venues by organizationId to attach to organizations
      const venuesByOrgId = new Map();
      actualChildVenues.forEach((venue) => {
        if (venue.organizationId) {
          if (!venuesByOrgId.has(venue.organizationId)) {
            venuesByOrgId.set(venue.organizationId, []);
          }
          venuesByOrgId.get(venue.organizationId).push(venue.toJSON());
        }
      });

      // Merge organizations with venue data
      // Only include actual Organizations, not Venues as separate entries
      // Use Promise.all to handle async operations in map
      const mergedOrganizations = await Promise.all(
        simpleOrgs.map(async (org) => {
          const orgVenues = venuesByOrgId.get(org.id) || [];

          // IMPORTANT: Find main venue (organization's temperature entry)
          // Main venue has same name as organization AND organizationId matches
          // This is the organization's own temperature entry, not a child venue

          // Strategy 1: Find by organizationId + name + adminId (most specific)
          let venueForOrg = venues.find(
            (v) =>
              v.organizationId === org.id &&
              v.adminId === adminId &&
              v.name === org.name
          );

          // Strategy 2: If not found, try by organizationId only (but prefer same name)
          if (!venueForOrg) {
            const orgVenuesList = venues.filter(
              (v) => v.organizationId === org.id && v.adminId === adminId
            );
            if (orgVenuesList.length > 0) {
              // Prefer the one with same name as org (main venue)
              venueForOrg = orgVenuesList.find((v) => v.name === org.name);
              // If no exact name match, use the first one (might be the only venue)
              if (!venueForOrg && orgVenuesList.length === 1) {
                venueForOrg = orgVenuesList[0];
              }
            }
          }

          // Strategy 3: If still not found, try by name + adminId only (backward compatibility)
          // This handles cases where organizationId might not be set yet
          if (!venueForOrg) {
            const nameMatches = venues.filter(
              (v) => v.name === org.name && v.adminId === adminId
            );
            if (nameMatches.length > 0) {
              // Prefer the one with matching organizationId
              venueForOrg = nameMatches.find(
                (v) => v.organizationId === org.id
              );
              // If no organizationId match, use the first one
              if (!venueForOrg) {
                venueForOrg = nameMatches[0];
                // Update organizationId if it doesn't match (fix data inconsistency)
                if (venueForOrg.organizationId !== org.id) {
                  console.log(
                    `⚠️ [ORG-SERVICE] Fixing organizationId mismatch for venue ${venueForOrg.id}: ${venueForOrg.organizationId} → ${org.id}`
                  );
                  try {
                    await Venue.update(
                      { organizationId: org.id },
                      { where: { id: venueForOrg.id } }
                    );
                    venueForOrg.organizationId = org.id; // Update in-memory object
                  } catch (updateError) {
                    console.error(
                      `❌ [ORG-SERVICE] Failed to update organizationId:`,
                      updateError
                    );
                  }
                }
              }
            }
          }

          // Log for debugging
          if (venueForOrg) {
            console.log(
              `📊 [ORG-SERVICE] Found main venue for org ${org.id} (${org.name}):`,
              {
                venueId: venueForOrg.id,
                venueName: venueForOrg.name,
                temperature: venueForOrg.temperature,
                organizationId: venueForOrg.organizationId,
                adminId: venueForOrg.adminId,
              }
            );
          } else {
            // Log all venues to debug why main venue not found
            const allOrgVenues = venues.filter(
              (v) => v.organizationId === org.id && v.adminId === adminId
            );
            const allNameVenues = venues.filter(
              (v) => v.name === org.name && v.adminId === adminId
            );
            console.log(
              `⚠️ [ORG-SERVICE] No main venue found for org ${org.id} (${org.name})`
            );
            console.log(
              `   └─ Venues with orgId ${org.id}:`,
              allOrgVenues.map((v) => ({
                id: v.id,
                name: v.name,
                orgId: v.organizationId,
              }))
            );
            console.log(
              `   └─ Venues with name "${org.name}":`,
              allNameVenues.map((v) => ({
                id: v.id,
                name: v.name,
                orgId: v.organizationId,
              }))
            );
          }

          let orgData;
          if (venueForOrg) {
            // Merge: Use venue data (has lock/temperature) but keep organization's batchNumber and id
            const venueJson = venueForOrg.toJSON();
            orgData = {
              ...venueJson,
              id: org.id, // Keep organization's ID
              batchNumber: org.batchNumber, // Keep batchNumber from Organization
              venues: orgVenues, // Attach child venues
            };

            // IMPORTANT: Preserve temperature from main venue (even if it's 16, 17, etc.)
            // Don't treat 16 as a default - it's a valid temperature value
            if (
              venueJson.temperature !== null &&
              venueJson.temperature !== undefined
            ) {
              const tempNum = parseFloat(venueJson.temperature);
              if (!isNaN(tempNum)) {
                orgData.temperature = tempNum; // Keep the actual temperature from database
              } else {
                console.error(
                  `❌ [ORG-SERVICE] Invalid temperature value for org ${org.id}:`,
                  venueJson.temperature
                );
                orgData.temperature = null;
              }
            } else {
              orgData.temperature = null;
            }
          } else {
            // No venue found, return simple organization with child venues
            orgData = {
              ...org.toJSON(),
              venues: orgVenues, // Attach child venues
              temperature: null, // Explicitly set to null if no main venue found
            };
          }

          // Final validation: Ensure temperature is a number or null (not object or undefined)
          if (
            orgData.temperature !== null &&
            orgData.temperature !== undefined
          ) {
            if (typeof orgData.temperature === "object") {
              // If temperature is an object (shouldn't happen), set to null
              console.error(
                `❌ [ORG-SERVICE] Temperature is object for org ${org.id}:`,
                orgData.temperature
              );
              orgData.temperature = null;
            } else if (typeof orgData.temperature !== "number") {
              // Try to parse if it's a string
              const tempNum = parseFloat(orgData.temperature);
              if (!isNaN(tempNum)) {
                orgData.temperature = tempNum;
              } else {
                console.error(
                  `❌ [ORG-SERVICE] Invalid temperature type for org ${org.id}:`,
                  typeof orgData.temperature,
                  orgData.temperature
                );
                orgData.temperature = null;
              }
            }
            // If it's already a number, keep it as is (including 16, 17, etc.)
          } else {
            // Explicitly set to null if undefined
            orgData.temperature = null;
          }

          console.log(
            `📊 [ORG-SERVICE] Final org data for ${org.id} (${org.name}):`,
            {
              temperature: orgData.temperature,
              temperatureType: typeof orgData.temperature,
              hasMixedTemperatures: orgData.hasMixedTemperatures,
            }
          );

          // Calculate hasMixedTemperatures for organization
          // Check if any venue under this organization has different temperature
          let hasMixedTemperatures = false;
          const orgTemp = orgData.temperature;

          // Get all venue temperatures (main venue + child venues)
          const allVenueTemps = [];
          if (
            venueForOrg &&
            venueForOrg.temperature !== null &&
            venueForOrg.temperature !== undefined
          ) {
            allVenueTemps.push(venueForOrg.temperature);
          }
          orgVenues.forEach((venue) => {
            if (venue.temperature !== null && venue.temperature !== undefined) {
              allVenueTemps.push(venue.temperature);
            }
          });

          // Check if we have multiple different temperatures
          if (allVenueTemps.length > 1) {
            const uniqueTemps = [...new Set(allVenueTemps)];
            hasMixedTemperatures = uniqueTemps.length > 1;
          }

          // Also check if organization temp is different from venue temps
          if (
            !hasMixedTemperatures &&
            orgTemp !== null &&
            orgTemp !== undefined &&
            allVenueTemps.length > 0
          ) {
            hasMixedTemperatures = allVenueTemps.some(
              (temp) => temp !== orgTemp
            );
          }

          orgData.hasMixedTemperatures = hasMixedTemperatures;

          return orgData;
        })
      );

      return {
        success: true,
        organizations: mergedOrganizations,
      };
    } catch (error) {
      throw error;
    }
  }

  // Get organization details
  // Note: Organization model is simple, but Venue model (which uses organizations table) has lock details
  // So we check both - first try Venue model (complex structure with lock fields)
  static async getOrganizationDetails(adminId, organizationId) {
    try {
      // Try Venue model first (uses organizations table with lock fields)
      let organization = await Venue.findOne({
        where: {
          id: organizationId,
          adminId: adminId,
        },
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
          "lockedTemperature",
          "lockedAt",
          "lockedByAdminId",
          "totalEnergyConsumed",
          "lastEnergyCalculation",
          "isVenueOn",
          "venuePowerChangedAt",
          "venuePowerChangedBy",
          "createdAt",
          "updatedAt",
        ],
        include: [
          {
            model: AC,
            as: "acs",
            required: false,
            attributes: [
              "id",
              "name",
              "brand",
              "model",
              "serialNumber",
              "temperature",
              "isOn",
              "currentState",
            ],
          },
        ],
      });

      // If not found in Venue model, try Organization model (simple structure)
      if (!organization) {
        organization = await Organization.findOne({
          where: {
            id: organizationId,
            adminId: adminId,
          },
          attributes: [
            "id",
            "name",
            "batchNumber",
            "adminId",
            "createdAt",
            "updatedAt",
          ],
        });
      }

      if (!organization) {
        throw new Error("Organization not found or unauthorized");
      }

      return {
        success: true,
        organization: organization,
      };
    } catch (error) {
      throw error;
    }
  }

  // Delete organization with cascade deletion
  static async deleteOrganizationCascade(adminId, organizationId) {
    const transaction = await Organization.sequelize.transaction();

    try {
      // Verify organization belongs to admin
      const organization = await Organization.findOne({
        where: {
          id: organizationId,
          adminId: adminId,
        },
        transaction,
      });

      if (!organization) {
        throw new Error("Organization not found or unauthorized");
      }

      const organizationName = organization.name;

      // 1. Find all Venues under this Organization
      const venues = await Venue.findAll({
        where: {
          organizationId: organizationId,
          adminId: adminId,
        },
        include: [
          {
            model: AC,
            as: "acs",
            required: false,
            attributes: ["id"],
          },
        ],
        transaction,
      });

      const venueIds = venues.map((v) => v.id);
      const allAcIds = [];

      // Collect all AC IDs from all venues
      for (const venue of venues) {
        if (venue.acs && venue.acs.length > 0) {
          allAcIds.push(...venue.acs.map((ac) => ac.id));
        }
      }

      // 2. Get all events related to ACs and Organization
      let eventIds = [];
      if (allAcIds.length > 0) {
        const events = await Event.findAll({
          where: {
            [Op.or]: [
              { deviceId: { [Op.in]: allAcIds } },
              { organizationId: organizationId },
            ],
          },
          attributes: ["id"],
          transaction,
        });
        eventIds = events.map((e) => e.id);
      } else {
        // Check for organization-level events even if no ACs
        const events = await Event.findAll({
          where: { organizationId: organizationId },
          attributes: ["id"],
          transaction,
        });
        eventIds = events.map((e) => e.id);
      }

      // 3. Delete child events (events with parentAdminEventId pointing to these events)
      if (eventIds.length > 0) {
        await Event.destroy({
          where: {
            parentAdminEventId: { [Op.in]: eventIds },
          },
          transaction,
        });
      }

      // 4. Delete events related to ACs and Organization
      if (allAcIds.length > 0) {
        await Event.destroy({
          where: {
            [Op.or]: [
              { deviceId: { [Op.in]: allAcIds } },
              { organizationId: organizationId },
            ],
          },
          transaction,
        });
      } else {
        await Event.destroy({
          where: { organizationId: organizationId },
          transaction,
        });
      }

      // 5. Delete activity logs related to ACs and Organization
      if (allAcIds.length > 0) {
        await ActivityLog.destroy({
          where: {
            [Op.or]: [
              { targetType: "ac", targetId: { [Op.in]: allAcIds } },
              { targetType: "organization", targetId: organizationId },
            ],
          },
          transaction,
        });
      } else {
        await ActivityLog.destroy({
          where: {
            targetType: "organization",
            targetId: organizationId,
          },
          transaction,
        });
      }

      // 6. Delete system states related to ACs and Organization
      if (allAcIds.length > 0) {
        await SystemState.destroy({
          where: {
            [Op.or]: [
              { entityType: "ac", entityId: { [Op.in]: allAcIds } },
              { entityType: "organization", entityId: organizationId },
            ],
          },
          transaction,
        });
      } else {
        await SystemState.destroy({
          where: {
            entityType: "organization",
            entityId: organizationId,
          },
          transaction,
        });
      }

      // 7. Delete all AC devices
      if (allAcIds.length > 0) {
        await AC.destroy({
          where: { venueId: { [Op.in]: venueIds } },
          transaction,
        });
      }

      // 8. Handle split relationships for Venues
      // Clear splitFromId references
      if (venueIds.length > 0) {
        await Venue.update(
          { splitFromId: null },
          {
            where: { splitFromId: { [Op.in]: venueIds } },
            transaction,
          }
        );

        // Update splitIntoIds in other venues that reference these venues
        const venuesWithSplits = await Venue.findAll({
          where: {
            splitIntoIds: { [Op.ne]: null },
            adminId: adminId,
          },
          transaction,
        });

        for (const venueWithSplit of venuesWithSplits) {
          try {
            const splitIntoIds = JSON.parse(
              venueWithSplit.splitIntoIds || "[]"
            );
            const filteredIds = splitIntoIds.filter(
              (id) => !venueIds.includes(id)
            );
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
      }

      // 9. Delete all Venues under this Organization
      if (venueIds.length > 0) {
        await Venue.destroy({
          where: {
            id: { [Op.in]: venueIds },
            organizationId: organizationId,
            adminId: adminId,
          },
          transaction,
        });
      }

      // 10. Delete the organization
      await organization.destroy({ transaction });

      // 11. Log organization deletion activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: "DELETE_ORGANIZATION",
          targetType: "organization",
          targetId: organizationId,
          details: `Deleted organization: ${organizationName} (cascade deleted ${venueIds.length} venue(s), ${allAcIds.length} AC(s), ${eventIds.length} event(s), related activity logs, and system states)`,
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: "Organization deleted successfully",
        deletedOrganization: {
          id: organizationId,
          name: organizationName,
        },
        cascadeDeleted: {
          venues: venueIds.length,
          acs: allAcIds.length,
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

  // Lock organization (Admin-controlled)
  // When organization is locked, current temperature is saved as lockedTemperature
  static async lockOrganization(adminId, organizationId, reason = null) {
    const transaction = await Venue.sequelize.transaction();

    try {
      // Try to find organization in Venue model first (uses organizations table with lock fields)
      let organization = await Venue.findOne({
        where: {
          id: organizationId,
          adminId: adminId,
        },
        transaction,
      });

      // If not found in Venue model, try Organization model (simple structure)
      if (!organization) {
        organization = await Organization.findOne({
          where: {
            id: organizationId,
            adminId: adminId,
          },
          transaction,
        });

        // If found in Organization model, we need to create/update in Venue model for lock functionality
        if (organization) {
          // Check if venue exists with same name
          let venue = await Venue.findOne({
            where: {
              name: organization.name,
              adminId: adminId,
            },
            transaction,
          });

          if (!venue) {
            // Create venue entry for lock functionality
            venue = await Venue.create(
              {
                name: organization.name,
                adminId: adminId,
                organizationSize: "medium", // Required field, default to medium
                status: organization.status || "active",
                temperature: organization.temperature || null,
                isLocked: false,
              },
              { transaction }
            );
          }
          organization = venue;
        }
      }

      if (!organization) {
        throw new Error(
          "Organization not found or does not belong to this admin"
        );
      }

      if (organization.isLocked) {
        throw new Error("Organization is already locked");
      }

      // Save current temperature as locked temperature
      const currentTemperature = organization.temperature || null;

      // Lock organization
      await organization.update(
        {
          isLocked: true,
          lockedTemperature: currentTemperature,
          lockedAt: new Date(),
          lockedByAdminId: adminId,
        },
        { transaction }
      );

      // Lock all ACs in organization
      await AC.update(
        {
          currentState: "locked",
          lockedAt: new Date(),
          lockedBy: "admin",
        },
        {
          where: { organizationId: organizationId },
          transaction,
        }
      );

      // Log activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: "LOCK_ORGANIZATION",
          targetType: "organization",
          targetId: organizationId,
          details: `Organization ${
            organization.name
          } locked at ${currentTemperature}°C. Reason: ${
            reason || "No reason provided"
          }`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: `Organization locked at ${currentTemperature}°C`,
        lockedTemperature: currentTemperature,
        organization: {
          id: organization.id,
          name: organization.name,
          isLocked: true,
          lockedTemperature: currentTemperature,
        },
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Unlock organization (Admin-controlled)
  static async unlockOrganization(adminId, organizationId) {
    const transaction = await Venue.sequelize.transaction();

    try {
      // Try to find organization in Venue model first (uses organizations table with lock fields)
      let organization = await Venue.findOne({
        where: {
          id: organizationId,
          adminId: adminId,
        },
        transaction,
      });

      // If not found in Venue model, try Organization model (simple structure)
      if (!organization) {
        const org = await Organization.findOne({
          where: {
            id: organizationId,
            adminId: adminId,
          },
          transaction,
        });

        if (org) {
          // Check if venue exists with same name
          organization = await Venue.findOne({
            where: {
              name: org.name,
              adminId: adminId,
            },
            transaction,
          });
        }
      }

      if (!organization) {
        throw new Error(
          "Organization not found or does not belong to this admin"
        );
      }

      if (!organization.isLocked) {
        throw new Error("Organization is not locked");
      }

      // Unlock organization
      await organization.update(
        {
          isLocked: false,
          lockedTemperature: null,
          lockedAt: null,
          lockedByAdminId: null,
        },
        { transaction }
      );

      // Unlock all ACs in organization
      await AC.update(
        {
          currentState: "unlocked",
          lockedAt: null,
          lockedBy: null,
        },
        {
          where: { organizationId: organizationId },
          transaction,
        }
      );

      // Log activity
      await ActivityLog.create(
        {
          adminId: adminId,
          action: "UNLOCK_ORGANIZATION",
          targetType: "organization",
          targetId: organizationId,
          details: `Organization ${organization.name} unlocked`,
          timestamp: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: "Organization unlocked successfully",
        organization: {
          id: organization.id,
          name: organization.name,
          isLocked: false,
        },
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Toggle organization power state (ON/OFF) with hierarchical control
  // When organization is OFF, all venues and devices under it are turned OFF
  // When organization is ON, venues and devices can be controlled individually
  static async toggleOrganizationPower(
    organizationId,
    powerState,
    changedBy,
    userId
  ) {
    const transaction = await Venue.sequelize.transaction();

    try {
      // First, get the Organization to find its name and adminId
      const org = await Organization.findOne({
        where: { id: organizationId },
        transaction,
      });

      if (!org) {
        throw new Error("Organization not found");
      }

      // Find venue entry for this organization (for power state storage)
      // Organization's venue entry has same name as organization
      let organization = await Venue.findOne({
        where: {
          name: org.name,
          adminId: org.adminId,
        },
        include: [
          {
            model: AC,
            as: "acs",
            required: false,
          },
        ],
        transaction,
      });

      // If venue entry doesn't exist, create it
      if (!organization) {
        // For organization's venue entry, we need to handle self-reference
        // Since organizationId must reference an existing venue, we'll use a workaround:
        // Use raw SQL to temporarily disable the foreign key constraint, create, then re-enable

        // Check if there's any existing venue for this admin we can use as temporary reference
        const tempVenue = await Venue.findOne({
          where: { adminId: org.adminId },
          order: [["id", "DESC"]],
          limit: 1,
          transaction,
        });

        if (!tempVenue) {
          // No existing venues - we can't create a self-referencing venue
          // This should not happen in normal flow, but handle gracefully
          throw new Error(
            "Cannot create organization venue entry: No existing venues found. Please create at least one venue first."
          );
        }

        // Create venue entry for organization
        // The organizationId field in Venue model references venues.id (foreign key constraint)
        // For organization's own venue entry, we need to handle this carefully
        // Since we can't self-reference during creation, we'll use the Organization model's ID
        // The constraint might allow this if Organization model IDs can match venue IDs
        // If not, we'll use a temporary venue ID and handle it in the logic

        // Try using Organization model's ID directly (this might work if IDs overlap)
        try {
          organization = await Venue.create(
            {
              name: org.name,
              adminId: org.adminId,
              organizationId: org.id, // Try using Organization model ID directly
              organizationSize: "medium", // Required field, default to medium
              status: org.status || "active",
              temperature: 24,
              isVenueOn: false,
            },
            { transaction }
          );
        } catch (createError) {
          // If that fails due to foreign key constraint, use temporary venue ID
          if (
            createError.message?.includes("foreign key") ||
            createError.message?.includes("fk_organizations_organizationid")
          ) {
            console.warn(
              "⚠️ Could not create organization venue entry with Organization model ID. Using temporary venue ID."
            );
            organization = await Venue.create(
              {
                name: org.name,
                adminId: org.adminId,
                organizationId: tempVenue.id, // Use temporary venue ID
                organizationSize: "medium",
                status: org.status || "active",
                temperature: 24,
                isVenueOn: false,
              },
              { transaction }
            );
          } else {
            throw createError;
          }
        }
      }

      const oldPowerState = organization.isVenueOn || false;
      const newPowerState = powerState === true || powerState === "on";

      // Update organization power state (stored in Venue model)
      await organization.update(
        {
          isVenueOn: newPowerState,
          venuePowerChangedAt: new Date(),
          venuePowerChangedBy: changedBy,
        },
        { transaction }
      );

      // Find all venues under this organization
      // Note: organizationId parameter is from Organization model
      // We need to find venues where organizationId matches either:
      // 1. The organization's venue entry ID (if self-referencing)
      // 2. The Organization model ID (if using temp reference)
      const orgVenueId = organization.id; // This is the venue entry's ID
      const orgModelId = organizationId; // This is the Organization model ID

      // Find venues that belong to this organization
      // Check both the venue's own ID (self-reference) and the Organization model ID
      // IMPORTANT: Exclude organization's own venue entry (temperature entry) which has same name as organization
      const allVenues = await Venue.findAll({
        where: {
          [Op.and]: [
            {
              [Op.or]: [
                { organizationId: orgVenueId }, // Self-referencing case
                { organizationId: orgModelId }, // Temp reference case
              ],
            },
            { id: { [Op.ne]: orgVenueId } }, // Exclude the organization's own venue entry (by ID)
            { name: { [Op.ne]: org.name } }, // Also exclude venues with same name as organization (temperature entries)
          ],
        },
        include: [
          {
            model: AC,
            as: "acs",
            required: false,
          },
        ],
        transaction,
      });

      let venuesUpdated = 0;
      let acsUpdated = 0;

      if (!newPowerState) {
        // Organization OFF: Turn off all venues and devices
        if (allVenues.length > 0) {
          const venueIdsToUpdate = allVenues.map((v) => v.id);
          const [venueUpdateCount] = await Venue.update(
            {
              isVenueOn: false,
              venuePowerChangedAt: new Date(),
              venuePowerChangedBy: changedBy,
            },
            {
              where: {
                id: { [Op.in]: venueIdsToUpdate },
              },
              transaction,
            }
          );
          venuesUpdated = venueUpdateCount;
        }

        // Turn off all ACs in organization and all venues when organization is OFF
        const allVenueIds = [orgVenueId, ...allVenues.map((v) => v.id)];
        const [acUpdateCount] = await AC.update(
          {
            isOn: false,
            lastPowerChangeAt: new Date(),
            lastPowerChangeBy: changedBy,
          },
          {
            where: {
              venueId: { [Op.in]: allVenueIds },
            },
            transaction,
          }
        );
        acsUpdated = acUpdateCount;
      } else {
        // Organization ON: Turn on all venues and their devices
        if (allVenues.length > 0) {
          const venueIdsToUpdate = allVenues.map((v) => v.id);
          const [venueUpdateCount] = await Venue.update(
            {
              isVenueOn: true,
              venuePowerChangedAt: new Date(),
              venuePowerChangedBy: changedBy,
            },
            {
              where: {
                id: { [Op.in]: venueIdsToUpdate },
              },
              transaction,
            }
          );
          venuesUpdated = venueUpdateCount;

          // Turn on all ACs in all venues when organization is ON
          const allVenueIds = [orgVenueId, ...allVenues.map((v) => v.id)];
          const [acUpdateCount] = await AC.update(
            {
              isOn: true,
              lastPowerChangeAt: new Date(),
              lastPowerChangeBy: changedBy,
            },
            {
              where: {
                venueId: { [Op.in]: allVenueIds },
              },
              transaction,
            }
          );
          acsUpdated = acUpdateCount;
        }
      }

      // Log activity
      await ActivityLog.create(
        {
          adminId: organization.adminId,
          action: "TOGGLE_ORGANIZATION_POWER",
          targetType: "organization",
          targetId: organizationId,
          details: `Organization ${organization.name} power changed from ${
            oldPowerState ? "ON" : "OFF"
          } to ${newPowerState ? "ON" : "OFF"} by ${changedBy}. ${
            venuesUpdated > 0 ? `${venuesUpdated} venue(s) updated. ` : ""
          }${
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
        const allVenueIds = [orgVenueId, ...allVenues.map((v) => v.id)];
        const updatedACs = await AC.findAll({
          where: {
            venueId: { [Op.in]: allVenueIds },
          },
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
                `🔌 [ORGANIZATION-POWER] Sending WebSocket command to device ${ac.serialNumber}`
              );
              console.log(`   └─ Power state: ${newPowerState ? "ON" : "OFF"}`);
              
              const wsResult = await ESPService.sendPowerCommand(
                ac.serialNumber, // ESP32 connections are keyed by serialNumber
                newPowerState
              );

              if (wsResult.success) {
                wsCommandsSent++;
                console.log(
                  `✅ [ORGANIZATION-POWER] WebSocket command sent successfully to ${ac.serialNumber}`
                );
              } else {
                wsCommandsSkipped++;
                console.log(
                  `⚠️ [ORGANIZATION-POWER] WebSocket command failed for ${ac.serialNumber}: ${wsResult.message}`
                );
              }
            } catch (wsError) {
              wsCommandsSkipped++;
              console.error(
                `❌ [ORGANIZATION-POWER] WebSocket command error for ${ac.serialNumber}:`,
                wsError.message
              );
            }
          } else {
            wsCommandsSkipped++;
            console.log(
              `⚠️ [ORGANIZATION-POWER] Device ${ac.id} has no serialNumber, skipping WebSocket command`
            );
          }

          // Broadcast to frontend for real-time UI update
          ESPService.broadcastToFrontend({
            device_id: ac.serialNumber,
            serialNumber: ac.serialNumber,
            temperature: ac.temperature,
            isOn: ac.isOn,
            changedBy: changedBy,
            organizationId: ac.organizationId || organizationId,
            venueId: ac.venueId,
            timestamp: new Date().toISOString(),
          });
        }

        console.log(
          `📡 [ORGANIZATION-POWER] WebSocket commands completed:`
        );
        console.log(`   └─ Commands sent: ${wsCommandsSent}`);
        console.log(`   └─ Commands skipped: ${wsCommandsSkipped}`);
        console.log(
          `📡 [ORGANIZATION-POWER] Broadcasted ${updatedACs.length} AC updates to all frontend clients`
        );
      } catch (broadcastError) {
        console.error(
          "⚠️ Error sending WebSocket commands or broadcasting organization power changes:",
          broadcastError
        );
        // Don't fail the operation if WebSocket/broadcast fails
      }

      return {
        success: true,
        message: `Organization power ${
          newPowerState ? "turned ON" : "turned OFF"
        } successfully`,
        organization: {
          id: organization.id,
          name: organization.name,
          isOrganizationOn: newPowerState,
          venuePowerChangedAt: organization.venuePowerChangedAt,
          venuePowerChangedBy: changedBy,
        },
        venuesUpdated: venuesUpdated,
        acsUpdated: acsUpdated,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = OrganizationService;
