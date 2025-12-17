/**
 * Script to check for hardware/simulator dependent data that might be stale
 * Checks for:
 * - Room temperatures (should be NULL if hardware not connected)
 * - Room temp history
 * - Last room temp updates
 * - WebSocket connection status (key field)
 * - Power states that might be stale
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../config/environment/.env") });

const sequelize = require("../config/database/postgresql");
const AC = require("../models/AC/ac");
const { Op } = require("sequelize");

async function checkHardwareDependentData() {
  try {
    console.log(`\n🔍 Checking for hardware/simulator dependent stale data...\n`);

    // Get all ACs
    const allACs = await AC.findAll({
      attributes: [
        "id",
        "name",
        "serialNumber",
        "key",
        "roomTemperature",
        "lastRoomTempUpdate",
        "roomTempHistory",
        "lastRoomTempCheck",
        "isOn",
        "lastPowerChangeAt",
        "isWorking",
        "alertAt",
      ],
      order: [["serialNumber", "ASC"]],
    });

    console.log(`📊 Total ACs found: ${allACs.length}\n`);

    let issuesFound = 0;
    const issues = [];

    for (const ac of allACs) {
      const acIssues = [];

      // Check 1: Room temperature set but device might not be connected
      if (ac.roomTemperature !== null && ac.roomTemperature !== undefined) {
        acIssues.push({
          type: "ROOM_TEMP_STALE",
          message: `Room temperature is ${ac.roomTemperature}°C but hardware might not be connected`,
          severity: "HIGH",
        });
      }

      // Check 2: Room temp history exists
      if (ac.roomTempHistory && ac.roomTempHistory.length > 0) {
        acIssues.push({
          type: "ROOM_TEMP_HISTORY",
          message: `Room temp history has ${Array.isArray(ac.roomTempHistory) ? ac.roomTempHistory.length : 'data'} entries`,
          severity: "MEDIUM",
        });
      }

      // Check 3: Last room temp update is old (more than 1 hour ago)
      if (ac.lastRoomTempUpdate) {
        const lastUpdate = new Date(ac.lastRoomTempUpdate);
        const now = new Date();
        const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
        
        if (hoursSinceUpdate > 1) {
          acIssues.push({
            type: "OLD_ROOM_TEMP_UPDATE",
            message: `Last room temp update was ${hoursSinceUpdate.toFixed(1)} hours ago (${lastUpdate.toLocaleString()})`,
            severity: "MEDIUM",
          });
        }
      }

      // Check 4: Device has key but might not be connected (we can't verify connection, but we can check if room temp is stale)
      if (ac.key && ac.roomTemperature !== null) {
        // If device has key but room temp is old, it might be disconnected
        if (ac.lastRoomTempUpdate) {
          const lastUpdate = new Date(ac.lastRoomTempUpdate);
          const now = new Date();
          const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
          
          if (hoursSinceUpdate > 24) {
            acIssues.push({
              type: "POSSIBLY_DISCONNECTED",
              message: `Device has key but last room temp update was ${hoursSinceUpdate.toFixed(1)} hours ago - might be disconnected`,
              severity: "LOW",
            });
          }
        }
      }

      // Check 5: Device is ON but has no recent room temp update (might be stale power state)
      if (ac.isOn && ac.roomTemperature === null) {
        acIssues.push({
          type: "ON_BUT_NO_ROOM_TEMP",
          message: `Device is ON but has no room temperature data`,
          severity: "MEDIUM",
        });
      }

      // Check 6: Alert exists but device might not be connected
      if (ac.alertAt && ac.roomTemperature === null) {
        acIssues.push({
          type: "ALERT_WITHOUT_ROOM_TEMP",
          message: `Device has alert but no room temperature data`,
          severity: "HIGH",
        });
      }

      if (acIssues.length > 0) {
        issuesFound++;
        issues.push({
          ac: {
            id: ac.id,
            name: ac.name,
            serialNumber: ac.serialNumber,
            key: ac.key ? "Has key" : "No key",
            isOn: ac.isOn,
          },
          issues: acIssues,
        });
      }
    }

    // Print results
    if (issuesFound === 0) {
      console.log(`✅ No hardware-dependent stale data found!`);
      console.log(`   All devices are clean.\n`);
    } else {
      console.log(`⚠️  Found ${issuesFound} device(s) with potential stale data:\n`);
      
      for (const deviceIssue of issues) {
        console.log(`📱 Device: ${deviceIssue.ac.name} (${deviceIssue.ac.serialNumber})`);
        console.log(`   ID: ${deviceIssue.ac.id}`);
        console.log(`   Key: ${deviceIssue.ac.key}`);
        console.log(`   Power: ${deviceIssue.ac.isOn ? "ON" : "OFF"}`);
        console.log(`   Issues:`);
        
        for (const issue of deviceIssue.issues) {
          const severityIcon = issue.severity === "HIGH" ? "🔴" : issue.severity === "MEDIUM" ? "🟡" : "🟢";
          console.log(`      ${severityIcon} [${issue.type}] ${issue.message}`);
        }
        console.log("");
      }

      console.log(`\n💡 To fix these issues, you can:`);
      console.log(`   1. Clear room temperature: node scripts/clear-room-temp.js <serialNumber>`);
      console.log(`   2. Clear all stale data: node scripts/clear-all-stale-data.js`);
      console.log(`   3. Check WebSocket connections manually\n`);
    }

    // Summary
    console.log(`\n📊 Summary:`);
    console.log(`   Total ACs: ${allACs.length}`);
    console.log(`   ACs with issues: ${issuesFound}`);
    console.log(`   Clean ACs: ${allACs.length - issuesFound}\n`);

    await sequelize.close();
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkHardwareDependentData();

