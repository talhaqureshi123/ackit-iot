/**
 * Script to clear all stale hardware-dependent data
 * Clears:
 * - Room temperatures
 * - Room temp history
 * - Last room temp updates
 * - Alerts (if device is not connected)
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../config/environment/.env") });

const sequelize = require("../config/database/postgresql");
const AC = require("../models/AC/ac");
const { Op } = require("sequelize");

async function clearAllStaleData() {
  try {
    console.log(`\n🧹 Clearing all stale hardware-dependent data...\n`);

    // Get all ACs with room temperature data
    const acsWithRoomTemp = await AC.findAll({
      where: {
        [Op.or]: [
          { roomTemperature: { [Op.ne]: null } },
          { roomTempHistory: { [Op.ne]: null } },
          { lastRoomTempUpdate: { [Op.ne]: null } },
        ],
      },
      attributes: [
        "id",
        "name",
        "serialNumber",
        "roomTemperature",
        "lastRoomTempUpdate",
      ],
    });

    console.log(`📊 Found ${acsWithRoomTemp.length} AC(s) with room temperature data\n`);

    if (acsWithRoomTemp.length === 0) {
      console.log(`✅ No stale data found. All clean!\n`);
      await sequelize.close();
      return;
    }

    let clearedCount = 0;

    for (const ac of acsWithRoomTemp) {
      const oldRoomTemp = ac.roomTemperature;
      
      await ac.update({
        roomTemperature: null,
        lastRoomTempUpdate: null,
        roomTempHistory: [],
        lastRoomTempCheck: null,
        // Clear alerts if device is not working (might be stale)
        // But keep isWorking and alertAt if they were set recently
      });

      clearedCount++;
      console.log(`✅ Cleared data for: ${ac.name} (${ac.serialNumber})`);
      if (oldRoomTemp) {
        console.log(`   Old room temp: ${oldRoomTemp}°C`);
      }
    }

    console.log(`\n✅ Successfully cleared stale data for ${clearedCount} AC(s)`);
    console.log(`\n💡 Note: This only clears room temperature data.`);
    console.log(`   Power states and other settings are preserved.\n`);

    await sequelize.close();
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ask for confirmation
console.log(`⚠️  WARNING: This will clear ALL room temperature data from ALL devices.`);
console.log(`   This action cannot be undone.\n`);

// For safety, require a flag
if (process.argv[2] !== "--confirm") {
  console.log(`💡 To confirm, run: node scripts/clear-all-stale-data.js --confirm\n`);
  process.exit(0);
}

clearAllStaleData();

