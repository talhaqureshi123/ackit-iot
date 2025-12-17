/**
 * Script to check ESP32 WebSocket connections
 * Shows which devices are connected and which are not
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../config/environment/.env") });

const sequelize = require("../config/database/postgresql");
const AC = require("../models/AC/ac");
const Services = require("../services");
const ESPService = Services.getESPService();

async function checkESPConnections() {
  try {
    console.log(`\n🔍 Checking ESP32 WebSocket Connections...\n`);

    // Get all ACs with keys
    const allACs = await AC.findAll({
      attributes: [
        "id",
        "name",
        "serialNumber",
        "key",
        "isOn",
        "roomTemperature",
        "lastRoomTempUpdate",
      ],
      where: {
        key: { [require("sequelize").Op.ne]: null },
      },
      order: [["serialNumber", "ASC"]],
    });

    console.log(`📊 Total ACs with keys: ${allACs.length}\n`);

    if (allACs.length === 0) {
      console.log(`⚠️  No ACs found with keys in database.\n`);
      await sequelize.close();
      return;
    }

    // Check WebSocket connections
    // Note: We can't directly access the internal connection map, but we can check
    // if room temperature is being updated (which indicates connection)
    
    let connectedCount = 0;
    let disconnectedCount = 0;

    for (const ac of allACs) {
      const hasRecentUpdate = ac.lastRoomTempUpdate 
        ? (new Date() - new Date(ac.lastRoomTempUpdate)) < (5 * 60 * 1000) // Within 5 minutes
        : false;

      const isConnected = hasRecentUpdate && ac.roomTemperature !== null;

      if (isConnected) {
        connectedCount++;
        console.log(`✅ ${ac.name} (${ac.serialNumber})`);
        console.log(`   Key: ${ac.key}`);
        console.log(`   Status: CONNECTED`);
        console.log(`   Room Temp: ${ac.roomTemperature}°C`);
        console.log(`   Last Update: ${ac.lastRoomTempUpdate ? new Date(ac.lastRoomTempUpdate).toLocaleString() : "Never"}`);
      } else {
        disconnectedCount++;
        console.log(`❌ ${ac.name} (${ac.serialNumber})`);
        console.log(`   Key: ${ac.key}`);
        console.log(`   Status: NOT CONNECTED`);
        console.log(`   Room Temp: ${ac.roomTemperature !== null ? ac.roomTemperature + "°C (stale)" : "NULL"}`);
        console.log(`   Last Update: ${ac.lastRoomTempUpdate ? new Date(ac.lastRoomTempUpdate).toLocaleString() + " (old)" : "Never"}`);
      }
      console.log("");
    }

    // Summary
    console.log(`\n📊 Summary:`);
    console.log(`   Total Devices: ${allACs.length}`);
    console.log(`   Connected: ${connectedCount}`);
    console.log(`   Not Connected: ${disconnectedCount}\n`);

    // Reasons why devices might not be connected
    if (disconnectedCount > 0) {
      console.log(`\n💡 Possible reasons why ESP32 is not connected:\n`);
      console.log(`   1. 🔌 Hardware not powered on`);
      console.log(`   2. 📡 WiFi not connected (ESP32 needs WiFi)`);
      console.log(`   3. 🌐 Wrong server IP address in ESP32 code`);
      console.log(`   4. 🔑 Wrong device key/serial number in ESP32 code`);
      console.log(`   5. 🚪 Firewall blocking WebSocket port (5050)`);
      console.log(`   6. 🔧 Backend server not running on port 5050`);
      console.log(`   7. 📱 ESP32 code not uploaded or crashed`);
      console.log(`   8. 🔌 USB cable disconnected (if using serial monitor)`);
      console.log(`\n💡 To check:`);
      console.log(`   - Verify ESP32 is powered on`);
      console.log(`   - Check ESP32 serial monitor for connection logs`);
      console.log(`   - Verify server IP in ESP32 code matches backend IP`);
      console.log(`   - Check if backend is running: netstat -ano | findstr :5050`);
      console.log(`   - Try running ESP32 simulator: node test-esp-simulator.js\n`);
    }

    await sequelize.close();
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkESPConnections();

