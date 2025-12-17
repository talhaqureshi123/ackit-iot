/**
 * Script to check and clear room temperature from database
 * Usage: node scripts/check-room-temp.js [serialNumber]
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../config/environment/.env") });

const sequelize = require("../config/database/postgresql");
const AC = require("../models/AC/ac");

async function checkRoomTemperature(serialNumber = "AC-222872-485") {
  try {
    console.log(`\n🔍 Checking room temperature for AC: ${serialNumber}\n`);

    const ac = await AC.findOne({
      where: { serialNumber: serialNumber },
      attributes: [
        "id",
        "name",
        "serialNumber",
        "roomTemperature",
        "lastRoomTempUpdate",
        "isOn",
        "key",
      ],
    });

    if (!ac) {
      console.log(`❌ AC with serial number "${serialNumber}" not found in database`);
      return;
    }

    console.log("📊 AC Device Details:");
    console.log(`   ID: ${ac.id}`);
    console.log(`   Name: ${ac.name}`);
    console.log(`   Serial Number: ${ac.serialNumber}`);
    console.log(`   Key: ${ac.key || "No key (not connected)"}`);
    console.log(`   Power Status: ${ac.isOn ? "ON" : "OFF"}`);
    console.log(`   Room Temperature: ${ac.roomTemperature !== null ? ac.roomTemperature + "°C" : "NULL (not set)"}`);
    console.log(`   Last Room Temp Update: ${ac.lastRoomTempUpdate ? ac.lastRoomTempUpdate.toLocaleString() : "Never"}`);

    if (ac.roomTemperature !== null) {
      console.log(`\n⚠️  Room temperature is set to ${ac.roomTemperature}°C`);
      console.log(`   This value was likely saved from a previous ESP32/Simulator connection.`);
      console.log(`   Since hardware is not connected, this is old/stale data.`);
      
      // Ask if user wants to clear it
      console.log(`\n💡 To clear this value, run:`);
      console.log(`   node scripts/clear-room-temp.js ${serialNumber}`);
    } else {
      console.log(`\n✅ Room temperature is NULL (no stored value)`);
    }

    await sequelize.close();
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Get serial number from command line argument
const serialNumber = process.argv[2] || "AC-222872-485";

checkRoomTemperature(serialNumber);

