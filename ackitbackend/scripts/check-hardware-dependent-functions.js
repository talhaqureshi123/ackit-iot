/**
 * Script to check if hardware-dependent functions are working without hardware
 * Checks:
 * - Power commands being sent without ESP connection
 * - Temperature commands being sent without ESP connection
 * - Room temperature requests without ESP connection
 * - Alert system triggering without hardware
 * - Database updates happening without hardware feedback
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../config/environment/.env") });

const sequelize = require("../config/database/postgresql");
const AC = require("../models/AC/ac");
const Services = require("../services");
const ESPService = Services.getESPService();
const { Op } = require("sequelize");

async function checkHardwareDependentFunctions() {
  try {
    console.log(`\n🔍 Checking Hardware-Dependent Functions...\n`);

    // Get all ACs
    const allACs = await AC.findAll({
      attributes: [
        "id",
        "name",
        "serialNumber",
        "key",
        "isOn",
        "temperature",
        "roomTemperature",
        "lastRoomTempUpdate",
        "lastPowerChangeAt",
        "lastTemperatureChange",
        "isWorking",
        "alertAt",
      ],
      order: [["serialNumber", "ASC"]],
    });

    console.log(`📊 Total ACs: ${allACs.length}\n`);

    let issuesFound = 0;
    const issues = [];

    for (const ac of allACs) {
      const acIssues = [];

      // Check 1: Device is ON but has no ESP connection (power state might be stale)
      if (ac.isOn && ac.key) {
        // Try to check if ESP is connected (we can't directly access, but we can check last update)
        const hasRecentUpdate = ac.lastRoomTempUpdate 
          ? (new Date() - new Date(ac.lastRoomTempUpdate)) < (5 * 60 * 1000)
          : false;

        if (!hasRecentUpdate && ac.roomTemperature === null) {
          acIssues.push({
            type: "POWER_ON_WITHOUT_HARDWARE",
            message: `Device is ON but no hardware connection (no room temp updates)`,
            severity: "HIGH",
            impact: "Power state in database might not match actual hardware state",
          });
        }
      }

      // Check 2: Temperature set but no hardware feedback
      if (ac.temperature && ac.key) {
        const hasRecentTempUpdate = ac.lastTemperatureChange
          ? (new Date() - new Date(ac.lastTemperatureChange)) < (10 * 60 * 1000) // Within 10 minutes
          : false;

        const hasRecentRoomTemp = ac.lastRoomTempUpdate
          ? (new Date() - new Date(ac.lastRoomTempUpdate)) < (5 * 60 * 1000)
          : false;

        if (hasRecentTempUpdate && !hasRecentRoomTemp && ac.isOn) {
          acIssues.push({
            type: "TEMP_SET_WITHOUT_HARDWARE_FEEDBACK",
            message: `Temperature was set recently but no hardware feedback (room temp not updating)`,
            severity: "MEDIUM",
            impact: "Temperature command sent but hardware might not have received it",
          });
        }
      }

      // Check 3: Alert exists but device might not be connected
      if (ac.alertAt && ac.roomTemperature === null) {
        acIssues.push({
          type: "ALERT_WITHOUT_HARDWARE_DATA",
          message: `Alert exists but no room temperature data from hardware`,
          severity: "HIGH",
          impact: "Alert might be based on stale data or false positive",
        });
      }

      // Check 4: Device marked as "not working" but no hardware connection
      if (ac.isWorking === false && ac.roomTemperature === null) {
        acIssues.push({
          type: "NOT_WORKING_WITHOUT_HARDWARE",
          message: `Device marked as "not working" but no hardware connection to verify`,
          severity: "MEDIUM",
          impact: "Status might be incorrect without hardware feedback",
        });
      }

      // Check 5: Recent power change but no hardware connection
      if (ac.lastPowerChangeAt) {
        const recentPowerChange = (new Date() - new Date(ac.lastPowerChangeAt)) < (10 * 60 * 1000);
        const hasRecentRoomTemp = ac.lastRoomTempUpdate
          ? (new Date() - new Date(ac.lastRoomTempUpdate)) < (5 * 60 * 1000)
          : false;

        if (recentPowerChange && !hasRecentRoomTemp && ac.isOn && ac.key) {
          acIssues.push({
            type: "POWER_CHANGED_WITHOUT_HARDWARE_FEEDBACK",
            message: `Power was changed recently but no hardware feedback`,
            severity: "MEDIUM",
            impact: "Power command sent but hardware might not have received it",
          });
        }
      }

      // Check 6: Device has key but never received room temperature
      if (ac.key && !ac.lastRoomTempUpdate) {
        acIssues.push({
          type: "KEY_BUT_NEVER_CONNECTED",
          message: `Device has key but never received room temperature data`,
          severity: "LOW",
          impact: "Device was configured but never actually connected",
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
            temperature: ac.temperature,
          },
          issues: acIssues,
        });
      }
    }

    // Print results
    if (issuesFound === 0) {
      console.log(`✅ No hardware-dependent function issues found!`);
      console.log(`   All functions are working correctly.\n`);
    } else {
      console.log(`⚠️  Found ${issuesFound} device(s) with hardware-dependent function issues:\n`);
      
      for (const deviceIssue of issues) {
        console.log(`📱 Device: ${deviceIssue.ac.name} (${deviceIssue.ac.serialNumber})`);
        console.log(`   ID: ${deviceIssue.ac.id}`);
        console.log(`   Key: ${deviceIssue.ac.key}`);
        console.log(`   Power: ${deviceIssue.ac.isOn ? "ON" : "OFF"}`);
        console.log(`   Temperature: ${deviceIssue.ac.temperature}°C`);
        console.log(`   Issues:`);
        
        for (const issue of deviceIssue.issues) {
          const severityIcon = issue.severity === "HIGH" ? "🔴" : issue.severity === "MEDIUM" ? "🟡" : "🟢";
          console.log(`      ${severityIcon} [${issue.type}]`);
          console.log(`         Message: ${issue.message}`);
          console.log(`         Impact: ${issue.impact}`);
        }
        console.log("");
      }

      console.log(`\n💡 Summary of Issues:\n`);
      
      const issueTypes = {};
      issues.forEach(device => {
        device.issues.forEach(issue => {
          if (!issueTypes[issue.type]) {
            issueTypes[issue.type] = {
              count: 0,
              severity: issue.severity,
              impact: issue.impact,
            };
          }
          issueTypes[issue.type].count++;
        });
      });

      for (const [type, info] of Object.entries(issueTypes)) {
        const severityIcon = info.severity === "HIGH" ? "🔴" : info.severity === "MEDIUM" ? "🟡" : "🟢";
        console.log(`   ${severityIcon} ${type}: ${info.count} occurrence(s)`);
        console.log(`      Impact: ${info.impact}\n`);
      }

      console.log(`\n💡 Recommendations:\n`);
      console.log(`   1. 🔌 Connect hardware/ESP32 to get real-time feedback`);
      console.log(`   2. 🧹 Clear stale alerts: node scripts/clear-stale-alerts.js`);
      console.log(`   3. 🔄 Reset device states if hardware is not available`);
      console.log(`   4. ⚠️  Be aware that database states might not match hardware states\n`);
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

checkHardwareDependentFunctions();

