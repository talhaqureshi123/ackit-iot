/**
 * Script to clear room temperature from database
 * Usage: node scripts/clear-room-temp.js [serialNumber]
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../config/environment/.env") });

const sequelize = require("../config/database/postgresql");
const AC = require("../models/AC/ac");

async function clearRoomTemperature(serialNumber = "AC-222872-485") {
  try {
    console.log(`\n🧹 Clearing room temperature for AC: ${serialNumber}\n`);

    const ac = await AC.findOne({
      where: { serialNumber: serialNumber },
      attributes: ["id", "name", "serialNumber", "roomTemperature"],
    });

    if (!ac) {
      console.log(`❌ AC with serial number "${serialNumber}" not found in database`);
      await sequelize.close();
      return;
    }

    if (ac.roomTemperature === null) {
      console.log(`✅ Room temperature is already NULL (nothing to clear)`);
      await sequelize.close();
      return;
    }

    const oldValue = ac.roomTemperature;
    
    // Clear room temperature
    await ac.update({
      roomTemperature: null,
      lastRoomTempUpdate: null,
      roomTempHistory: [],
      lastRoomTempCheck: null,
    });

    console.log(`✅ Room temperature cleared successfully!`);
    console.log(`   Old value: ${oldValue}°C`);
    console.log(`   New value: NULL`);
    console.log(`   Room temp history also cleared`);
    console.log(`\n💡 Alert system will now skip this device until hardware is connected.`);

    await sequelize.close();
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Get serial number from command line argument
const serialNumber = process.argv[2] || "AC-222872-485";

clearRoomTemperature(serialNumber);

