const AC = require("../../../models/AC/ac");
const Organization = require("../../../models/Organization/organization");
const Venue = require("../../../models/Venue/venue");
const {
  getEnergyRate,
  getStartupRate,
  getEnergyRateWithTemperature,
  getTemperatureMultiplier,
  STARTUP_DURATION_MINUTES,
} = require("../../../config/energyConsumption");
const { Op } = require("sequelize");

class EnergyConsumptionService {
  /**
   * Calculate energy consumed for an AC since last calculation
   * @param {Object} ac - AC instance
   * @returns {Object} - { energyConsumed, shouldUpdateStartup }
   */
  static calculateACEnergy(ac) {
    if (!ac.isOn) {
      return { energyConsumed: 0, shouldUpdateStartup: false };
    }

    const now = new Date();

    // Determine the starting point for energy calculation
    // Priority: startupStartTime (if still in startup) > lastEnergyCalculation > lastPowerChangeAt > createdAt
    // We prioritize startupStartTime only if still in startup period, otherwise use lastEnergyCalculation
    let lastCalc = null;

    // Check if AC is in startup period and startup period hasn't ended
    let isInStartupPeriod = false;
    if (ac.isOnStartup && ac.startupStartTime) {
      const startupEndTime = new Date(
        ac.startupStartTime.getTime() + STARTUP_DURATION_MINUTES * 60 * 1000
      );
      isInStartupPeriod = now < startupEndTime;
    }

    // Use startupStartTime only if still in startup period
    if (isInStartupPeriod && ac.startupStartTime) {
      lastCalc = new Date(ac.startupStartTime);
    }
    // Use lastEnergyCalculation if it exists and is not too recent (most accurate for normal operation)
    else if (ac.lastEnergyCalculation) {
      const timeSinceLastCalc =
        (now - new Date(ac.lastEnergyCalculation)) / 1000; // seconds
      // Only use lastEnergyCalculation if it's been more than 5 seconds (to avoid immediate recalc issues)
      if (timeSinceLastCalc >= 5) {
        lastCalc = new Date(ac.lastEnergyCalculation);
      } else {
        // Too recent, use lastPowerChangeAt or createdAt as fallback
        lastCalc = ac.lastPowerChangeAt 
          ? new Date(ac.lastPowerChangeAt) 
          : (ac.createdAt ? new Date(ac.createdAt) : now);
      }
    }
    // Use lastPowerChangeAt if AC was turned on (indicates when power state changed to ON)
    else if (ac.lastPowerChangeAt) {
      lastCalc = new Date(ac.lastPowerChangeAt);
    }
    // Fallback to createdAt if AC was created while on, or use now as absolute last resort
    else {
      lastCalc = ac.createdAt ? new Date(ac.createdAt) : now;
    }

    const timeDiffHours = (now - lastCalc) / (1000 * 60 * 60); // Convert ms to hours

    // If timeDiff is 0 or negative, return 0 (shouldn't happen but safety check)
    // But allow very small positive values (even milliseconds) to accumulate
    if (timeDiffHours <= 0) {
      return { energyConsumed: 0, shouldUpdateStartup: ac.isOnStartup };
    }

    let energyConsumed = 0;
    let shouldUpdateStartup = ac.isOnStartup;

    // If AC is in startup period (use the same check as above)
    if (isInStartupPeriod) {
      // Still in startup period - use startup rate
      const startupRate = getStartupRate(ac.ton);
      energyConsumed = startupRate * timeDiffHours;
      shouldUpdateStartup = true;
    } else if (ac.isOnStartup && ac.startupStartTime) {
      // Startup period just ended - calculate both startup and normal energy
      // This handles the case where startup period ended between last calculation and now
      const startupEndTime = new Date(
        ac.startupStartTime.getTime() + STARTUP_DURATION_MINUTES * 60 * 1000
      );
      
      // Calculate startup energy for the full startup period
      const startupDurationHours = STARTUP_DURATION_MINUTES / 60;
      const startupRate = getStartupRate(ac.ton);
      const startupEnergy = startupRate * startupDurationHours;

      // Calculate remaining time after startup (from startupEndTime to now)
      const remainingTimeHours = (now - startupEndTime) / (1000 * 60 * 60);
      const currentMode = ac.currentMode || "high";
      const temperature = ac.temperature || 24;
      // Use temperature-adjusted rate for normal operation
      const normalRate = getEnergyRateWithTemperature(
        ac.ton,
        currentMode,
        temperature
      );
      const normalEnergy = normalRate * Math.max(0, remainingTimeHours); // Ensure non-negative

      energyConsumed = startupEnergy + normalEnergy;
      shouldUpdateStartup = false; // Startup period is over
    } else {
      // Normal operation - use current mode rate with temperature adjustment
      const currentMode = ac.currentMode || "high";
      const temperature = ac.temperature || 24;
      const rate = getEnergyRateWithTemperature(
        ac.ton,
        currentMode,
        temperature
      );
      energyConsumed = rate * timeDiffHours;
    }

    return {
      energyConsumed: Math.max(0, energyConsumed), // Ensure non-negative
      shouldUpdateStartup,
    };
  }

  /**
   * Update energy consumption for a single AC
   * @param {Number} acId - AC ID
   * @returns {Object} - Updated AC data
   */
  static async updateACEnergy(acId) {
    try {
      const ac = await AC.findByPk(acId);
      if (!ac) {
        throw new Error(`AC with ID ${acId} not found`);
      }

      // If AC is ON but doesn't have proper energy tracking initialized, initialize it
      if (ac.isOn) {
        let needsInit = false;
        let initStartTime = null;

        // Determine if initialization is needed and what time to use
        if (!ac.lastEnergyCalculation && !ac.startupStartTime) {
          needsInit = true;
          // Use lastPowerChangeAt if available, otherwise use createdAt, or now as last resort
          initStartTime = ac.lastPowerChangeAt || ac.createdAt || new Date();
        } else if (
          ac.lastEnergyCalculation &&
          !ac.startupStartTime &&
          !ac.lastPowerChangeAt
        ) {
          // Has lastEnergyCalculation but no startup tracking - might be old data
          needsInit = true;
          initStartTime =
            ac.createdAt || ac.lastEnergyCalculation || new Date();
        }

        if (needsInit) {
          console.log(
            `⚠️ AC ${acId} is ON but energy tracking not properly initialized. Initializing with start time: ${initStartTime}`
          );
          await ac.update({
            isOnStartup: true,
            startupStartTime: initStartTime,
            lastEnergyCalculation: initStartTime, // Set to start time, not now, so calculation includes time since then
            currentMode: ac.currentMode || "high",
          });
          // Reload AC to get updated values
          await ac.reload();
        }
      }

      const { energyConsumed, shouldUpdateStartup } =
        this.calculateACEnergy(ac);

      // Update AC energy consumption
      const updateData = {
        totalEnergyConsumed: (ac.totalEnergyConsumed || 0) + energyConsumed,
        lastEnergyCalculation: new Date(),
        isOnStartup: shouldUpdateStartup,
      };

      await ac.update(updateData);

      // Update organization energy consumption
      // AC.venueId references organizations table
      await this.updateOrganizationEnergy(ac.venueId);

      return {
        acId: ac.id,
        energyConsumed,
        totalEnergyConsumed: updateData.totalEnergyConsumed,
      };
    } catch (error) {
      console.error(`❌ Error updating energy for AC ${acId}:`, error);
      throw error;
    }
  }

  /**
   * Update organization energy consumption (sum of all ACs)
   * @param {Number} organizationId - Organization ID
   * @param {Object} transaction - Optional transaction for batch operations
   */
  static async updateOrganizationEnergy(organizationId, transaction = null) {
    try {
      const organization = await Organization.findByPk(organizationId, { transaction });

      if (!organization) {
        return;
      }

      // Get all venues under this organization
      const venues = await Venue.findAll({
        where: {
          organizationId: organizationId,
        },
        attributes: ['id'],
        transaction,
      });
      const venueIds = venues.map(v => v.id);

      // Get all ACs where venueId matches either organizationId OR venueIds
      const allPossibleIds = venueIds.length > 0 ? [organizationId, ...venueIds] : [organizationId];
      const uniqueIds = [...new Set(allPossibleIds)];

      const acs = await AC.findAll({
        where: { venueId: { [Op.in]: uniqueIds } },
        attributes: ["id", "totalEnergyConsumed"],
        transaction,
      });

      // Sum energy from all ACs in the organization
      const totalEnergy = acs.reduce(
        (sum, ac) => sum + (ac.totalEnergyConsumed || 0),
        0
      );

      // Update the Venue model entry (temperature entry) that has the same name as organization
      // Venue model uses organizations table and has totalEnergyConsumed field
      const tempEntry = await Venue.findOne({
        where: {
          organizationId: organizationId,
          name: organization.name,
        },
        transaction,
      });

      if (tempEntry) {
        await tempEntry.update({
          totalEnergyConsumed: totalEnergy,
          lastEnergyCalculation: new Date(),
        }, { transaction });
      }
    } catch (error) {
      console.error(
        `❌ Error updating organization energy for org ${organizationId}:`,
        error
      );
      // Don't throw - this is not critical
    }
  }

  /**
   * Handle AC power on - initialize startup period
   * @param {Number} acId - AC ID
   */
  static async handleACPowerOn(acId) {
    try {
      const ac = await AC.findByPk(acId);
      if (!ac) {
        throw new Error(`AC with ID ${acId} not found`);
      }

      await ac.update({
        isOnStartup: true,
        startupStartTime: new Date(),
        lastEnergyCalculation: new Date(),
        currentMode: ac.currentMode || "high", // Default to high if not set
      });

      console.log(`✅ AC ${acId} power on - startup period initialized`);
    } catch (error) {
      console.error(`❌ Error handling AC power on for AC ${acId}:`, error);
      throw error;
    }
  }

  /**
   * Handle AC power off - finalize energy calculation
   * @param {Number} acId - AC ID
   */
  static async handleACPowerOff(acId) {
    try {
      // Calculate final energy before turning off
      await this.updateACEnergy(acId);

      const ac = await AC.findByPk(acId);
      if (ac) {
        await ac.update({
          isOnStartup: false,
          startupStartTime: null,
        });
      }

      console.log(`✅ AC ${acId} power off - energy calculation finalized`);
    } catch (error) {
      console.error(`❌ Error handling AC power off for AC ${acId}:`, error);
      // Don't throw - logging is enough
    }
  }

  /**
   * Handle AC mode change - recalculate energy with new mode
   * @param {Number} acId - AC ID
   * @param {String} newMode - New mode (eco, normal, high)
   */
  static async handleACModeChange(acId, newMode) {
    try {
      if (!["eco", "normal", "high"].includes(newMode)) {
        throw new Error(
          `Invalid mode: ${newMode}. Must be eco, normal, or high`
        );
      }

      // First, update energy with current mode
      await this.updateACEnergy(acId);

      // Then update mode
      const ac = await AC.findByPk(acId);
      if (ac) {
        await ac.update({
          currentMode: newMode,
          lastEnergyCalculation: new Date(),
        });
      }

      console.log(`✅ AC ${acId} mode changed to ${newMode}`);
    } catch (error) {
      console.error(`❌ Error handling AC mode change for AC ${acId}:`, error);
      throw error;
    }
  }

  /**
   * Update energy for all ACs that are currently ON
   * Called periodically by background job
   * OPTIMIZED: Uses batch operations to reduce database queries
   */
  static async updateAllActiveACsEnergy() {
    const transaction = await AC.sequelize.transaction();
    
    try {
      // Load all active ACs with related data in one query (optimized)
      const activeACs = await AC.findAll({
        where: {
          isOn: true,
        },
        attributes: [
          "id",
          "ton",
          "temperature",
          "currentMode",
          "totalEnergyConsumed",
          "isOn",
          "isOnStartup",
          "startupStartTime",
          "lastEnergyCalculation",
          "lastPowerChangeAt",
          "createdAt",
          "venueId",
        ],
        transaction,
      });

      console.log(`🔄 Updating energy for ${activeACs.length} active ACs...`);

      if (activeACs.length === 0) {
        await transaction.commit();
        return [];
      }

      // Calculate energy for all ACs
      const updates = [];
      const results = [];
      const organizationIds = new Set(); // Track unique organizations

      for (const ac of activeACs) {
        try {
          // If AC is ON but doesn't have proper energy tracking initialized, initialize it
          let needsInit = false;
          let initStartTime = null;

          if (ac.isOn) {
            if (!ac.lastEnergyCalculation && !ac.startupStartTime) {
              needsInit = true;
              initStartTime = ac.lastPowerChangeAt || ac.createdAt || new Date();
            } else if (
              ac.lastEnergyCalculation &&
              !ac.startupStartTime &&
              !ac.lastPowerChangeAt
            ) {
              needsInit = true;
              initStartTime = ac.createdAt || ac.lastEnergyCalculation || new Date();
            }

            if (needsInit) {
              // Update AC object for calculation
              ac.isOnStartup = true;
              ac.startupStartTime = initStartTime;
              ac.lastEnergyCalculation = initStartTime;
              ac.currentMode = ac.currentMode || "high";
            }
          }

          const { energyConsumed, shouldUpdateStartup } = this.calculateACEnergy(ac);

          // Prepare update data
          const updateData = {
            id: ac.id,
            totalEnergyConsumed: (ac.totalEnergyConsumed || 0) + energyConsumed,
            lastEnergyCalculation: new Date(),
            isOnStartup: shouldUpdateStartup,
          };

          // Add initialization fields if needed
          if (needsInit) {
            updateData.startupStartTime = initStartTime;
            updateData.currentMode = ac.currentMode || "high";
          }

          updates.push(updateData);

          // Track organization for batch update
          if (ac.venueId) {
            organizationIds.add(ac.venueId);
          }

          results.push({
            acId: ac.id,
            energyConsumed,
            totalEnergyConsumed: (ac.totalEnergyConsumed || 0) + energyConsumed,
          });
        } catch (error) {
          console.error(
            `❌ Failed to calculate energy for AC ${ac.id}:`,
            error.message
          );
          results.push({ acId: ac.id, error: error.message });
        }
      }

      // Batch update all ACs in parallel (optimized)
      if (updates.length > 0) {
        // Use Promise.all for parallel updates (much faster than sequential)
        await Promise.all(
          updates.map(update => {
            const updateData = {
              totalEnergyConsumed: update.totalEnergyConsumed,
              lastEnergyCalculation: update.lastEnergyCalculation,
              isOnStartup: update.isOnStartup,
            };
            
            // Add initialization fields if present
            if (update.startupStartTime !== undefined) {
              updateData.startupStartTime = update.startupStartTime;
            }
            if (update.currentMode !== undefined) {
              updateData.currentMode = update.currentMode;
            }
            
            return AC.update(
              updateData,
              {
                where: { id: update.id },
                transaction,
              }
            );
          })
        );
        console.log(`✅ Batch updated ${updates.length} ACs in parallel`);
      }

      // Update organizations in batch (only once per organization) - parallel updates
      const uniqueOrgIds = Array.from(organizationIds);
      if (uniqueOrgIds.length > 0) {
        await Promise.all(
          uniqueOrgIds.map(orgId =>
            this.updateOrganizationEnergy(orgId, transaction).catch(error => {
              console.error(
                `❌ Failed to update organization energy for org ${orgId}:`,
                error.message
              );
              // Don't fail the whole operation - return null for failed updates
              return null;
            })
          )
        );
        console.log(`✅ Updated ${uniqueOrgIds.length} organizations in parallel`);
      }

      await transaction.commit();
      console.log(`✅ Energy update completed for ${results.length} ACs (${uniqueOrgIds.length} organizations)`);
      return results;
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Error updating all ACs energy:", error);
      throw error;
    }
  }

  /**
   * Get energy consumption for an AC
   * Automatically updates energy consumption if AC is on before returning data
   * @param {Number} acId - AC ID
   * @param {Boolean} skipUpdate - If true, skip automatic energy update (default: false)
   * @returns {Object} - Energy consumption data
   */
  static async getACEnergy(acId, skipUpdate = false) {
    try {
      // First, update energy consumption if AC is on (to get latest data)
      if (!skipUpdate) {
        try {
          await this.updateACEnergy(acId);
        } catch (updateError) {
          // Don't fail the whole operation if update fails, just log it
          console.warn(
            `⚠️ Could not update energy for AC ${acId} before fetching:`,
            updateError.message
          );
        }
      }

      const ac = await AC.findByPk(acId, {
        attributes: [
          "id",
          "name",
          "ton",
          "temperature",
          "currentMode",
          "totalEnergyConsumed",
          "lastEnergyCalculation",
          "isOn",
          "isOnStartup",
          "startupStartTime",
        ],
      });

      if (!ac) {
        throw new Error(`AC with ID ${acId} not found`);
      }

      // Calculate current rate if AC is on (with temperature adjustment)
      let currentRate = 0;
      let baseRate = 0;
      let temperatureMultiplier = 1.0;

      if (ac.isOn) {
        const temperature = ac.temperature || 24;
        if (ac.isOnStartup) {
          // Startup uses startup rate (already high), no temperature adjustment
          currentRate = getStartupRate(ac.ton);
          baseRate = currentRate;
        } else {
          // Normal operation uses temperature-adjusted rate
          baseRate = getEnergyRate(ac.ton, ac.currentMode || "high");
          temperatureMultiplier = getTemperatureMultiplier(temperature);
          currentRate = getEnergyRateWithTemperature(
            ac.ton,
            ac.currentMode || "high",
            temperature
          );
        }
      }

      return {
        acId: ac.id,
        name: ac.name,
        ton: ac.ton,
        currentMode: ac.currentMode || "high",
        temperature: ac.temperature || 24,
        totalEnergyConsumed: ac.totalEnergyConsumed || 0,
        lastEnergyCalculation: ac.lastEnergyCalculation,
        isOn: ac.isOn,
        isOnStartup: ac.isOnStartup,
        currentRate: currentRate, // kWh per hour (temperature-adjusted)
        baseRate: baseRate, // Base rate without temperature adjustment
        temperatureMultiplier: temperatureMultiplier, // Temperature multiplier applied
        startupStartTime: ac.startupStartTime,
      };
    } catch (error) {
      console.error(`❌ Error getting AC energy for AC ${acId}:`, error);
      throw error;
    }
  }

  /**
   * Get energy consumption for an organization
   * Automatically updates energy for all ACs in the organization before returning data
   * @param {Number} organizationId - Organization ID
   * @param {Boolean} skipUpdate - If true, skip automatic energy update (default: false)
   * @returns {Object} - Organization energy consumption data
   */
  static async getOrganizationEnergy(organizationId, skipUpdate = false) {
    try {
      const organization = await Organization.findByPk(organizationId);

      if (!organization) {
        throw new Error(`Organization with ID ${organizationId} not found`);
      }

      // Get all venues under this organization
      const venues = await Venue.findAll({
        where: {
          organizationId: organizationId,
        },
        attributes: ['id']
      });
      const venueIds = venues.map(v => v.id);

      // Get all ACs where venueId matches either organizationId OR venueIds
      // (ACs can have venueId = organizationId OR venueId = venueId)
      const allPossibleIds = venueIds.length > 0 ? [organizationId, ...venueIds] : [organizationId];
      const uniqueIds = [...new Set(allPossibleIds)];

      // Find ACs through venues (same approach as getACsByAdmin)
      const acs = await AC.findAll({
        where: {
          venueId: { [Op.in]: uniqueIds },
        },
        attributes: [
          "id",
          "name",
          "ton",
          "temperature",
          "currentMode",
          "totalEnergyConsumed",
          "isOn",
          "isOnStartup",
          "startupStartTime",
          "lastEnergyCalculation",
        ],
      });

      // Update energy for all active ACs in the organization before returning data
      if (!skipUpdate) {
        const activeACs = acs.filter((ac) => ac.isOn);

        for (const ac of activeACs) {
          try {
            await this.updateACEnergy(ac.id);
          } catch (updateError) {
            console.warn(
              `⚠️ Could not update energy for AC ${ac.id}:`,
              updateError.message
            );
          }
        }

        // Update organization total after updating ACs
        try {
          await this.updateOrganizationEnergy(organizationId);
        } catch (updateError) {
          console.warn(
            `⚠️ Could not update organization energy:`,
            updateError.message
          );
        }

        // Refetch ACs to get updated data
        const updatedAcs = await AC.findAll({
          where: {
            venueId: { [Op.in]: uniqueIds },
          },
          attributes: [
            "id",
            "name",
            "ton",
            "temperature",
            "currentMode",
            "totalEnergyConsumed",
            "isOn",
            "isOnStartup",
            "startupStartTime",
            "lastEnergyCalculation",
          ],
        });
        
        // Update acs array with fresh data
        acs.length = 0;
        acs.push(...updatedAcs);
      }

      // Get organization energy data (from Venue model if it exists)
      let totalEnergy = 0;
      let lastEnergyCalculation = null;
      
      // Try to get energy data from Venue model (temperature entry)
      try {
        const tempEntry = await Venue.findOne({
          where: {
            organizationId: organizationId,
            name: organization.name,
          },
          attributes: ['totalEnergyConsumed', 'lastEnergyCalculation'],
        });
        
        if (tempEntry) {
          totalEnergy = tempEntry.totalEnergyConsumed || 0;
          lastEnergyCalculation = tempEntry.lastEnergyCalculation;
        } else {
          // Fallback: calculate from ACs
          totalEnergy = acs.reduce((sum, ac) => sum + (ac.totalEnergyConsumed || 0), 0);
        }
      } catch (venueError) {
        // If Venue lookup fails, just calculate from ACs
        console.warn(`⚠️ Could not get venue energy data: ${venueError.message}`);
        totalEnergy = acs.reduce((sum, ac) => sum + (ac.totalEnergyConsumed || 0), 0);
      }

      const activeACs = acs.filter((ac) => ac.isOn);

      return {
        organizationId: organization.id,
        organizationName: organization.name,
        totalEnergyConsumed: totalEnergy,
        lastEnergyCalculation: lastEnergyCalculation,
        totalACs: acs.length,
        activeACs: activeACs.length,
        acs: acs.map((ac) => ({
          id: ac.id,
          name: ac.name,
          ton: ac.ton,
          mode: ac.currentMode || "high",
          energyConsumed: ac.totalEnergyConsumed || 0,
          isOn: ac.isOn,
        })),
      };
    } catch (error) {
      console.error(
        `❌ Error getting organization energy for org ${organizationId}:`,
        error
      );
      throw error;
    }
  }
}

module.exports = EnergyConsumptionService;
