/**
 * Script to clear stale alerts that are based on old/stale data
 * Clears alerts when:
 * - Device has alert but no room temperature data (hardware not connected)
 * - Alert is old and device is not connected
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../config/environment/.env") });

const sequelize = require("../config/database/postgresql");
const AC = require("../models/AC/ac");
const { Op } = require("sequelize");

async function clearStaleAlerts() {
  try {
    console.log(`\n🧹 Clearing stale alerts...\n`);

    // Get all ACs with alerts
    const acsWithAlerts = await AC.findAll({
      where: {
        [Op.or]: [
          { alertAt: { [Op.ne]: null } },
          { isWorking: false },
        ],
      },
      attributes: [
        "id",
        "name",
        "serialNumber",
        "alertAt",
        "isWorking",
        "roomTemperature",
        "lastRoomTempUpdate",
        "key",
      ],
    });

    console.log(`📊 Found ${acsWithAlerts.length} AC(s) with alerts\n`);

    if (acsWithAlerts.length === 0) {
      console.log(`✅ No alerts found. All clean!\n`);
      await sequelize.close();
      return;
    }

    let clearedCount = 0;
    const clearedAlerts = [];

    for (const ac of acsWithAlerts) {
      let shouldClear = false;
      const reasons = [];

      // Check 1: Alert exists but no room temperature data (hardware not connected)
      if (ac.alertAt && ac.roomTemperature === null) {
        shouldClear = true;
        reasons.push("Alert exists but no room temperature data (hardware not connected)");
      }

      // Check 2: Device marked as "not working" but no room temperature data
      if (ac.isWorking === false && ac.roomTemperature === null) {
        shouldClear = true;
        reasons.push("Device marked as 'not working' but no hardware data to verify");
      }

      // Check 3: Alert is old (more than 24 hours) and no recent room temp update
      if (ac.alertAt) {
        const alertTime = new Date(ac.alertAt);
        const now = new Date();
        const hoursSinceAlert = (now - alertTime) / (1000 * 60 * 60);
        
        const hasRecentUpdate = ac.lastRoomTempUpdate
          ? (new Date() - new Date(ac.lastRoomTempUpdate)) < (1 * 60 * 60 * 1000) // Within 1 hour
          : false;

        if (hoursSinceAlert > 24 && !hasRecentUpdate) {
          shouldClear = true;
          reasons.push(`Alert is ${hoursSinceAlert.toFixed(1)} hours old and no recent hardware updates`);
        }
      }

      if (shouldClear) {
        const oldAlertAt = ac.alertAt;
        const oldIsWorking = ac.isWorking;

        await ac.update({
          alertAt: null,
          isWorking: true, // Reset to working since we can't verify without hardware
        });

        clearedCount++;
        clearedAlerts.push({
          ac: ac.name,
          serialNumber: ac.serialNumber,
          reasons: reasons,
          oldAlertAt: oldAlertAt,
          oldIsWorking: oldIsWorking,
        });

        console.log(`✅ Cleared alerts for: ${ac.name} (${ac.serialNumber})`);
        reasons.forEach(reason => {
          console.log(`   └─ Reason: ${reason}`);
        });
      } else {
        console.log(`⏸️  Keeping alert for: ${ac.name} (${ac.serialNumber})`);
        console.log(`   └─ Alert seems valid (has hardware data or recent)`);
      }
    }

    console.log(`\n✅ Successfully cleared stale alerts for ${clearedCount} AC(s)\n`);

    if (clearedAlerts.length > 0) {
      console.log(`📋 Summary of cleared alerts:\n`);
      clearedAlerts.forEach(alert => {
        console.log(`   • ${alert.ac} (${alert.serialNumber})`);
        if (alert.oldAlertAt) {
          console.log(`     Alert was created: ${new Date(alert.oldAlertAt).toLocaleString()}`);
        }
        if (alert.oldIsWorking === false) {
          console.log(`     Was marked as: Not Working`);
        }
        console.log(`     Now: Working (alert cleared)\n`);
      });
    }

    console.log(`💡 Note: Alerts will be re-created when hardware connects and provides real data.\n`);

    await sequelize.close();
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ask for confirmation
console.log(`⚠️  This will clear stale alerts that are based on old/stale data.`);
console.log(`   Alerts will be cleared if:`);
console.log(`   - Device has alert but no room temperature data (hardware not connected)`);
console.log(`   - Device marked as 'not working' but no hardware data to verify`);
console.log(`   - Alert is old (24+ hours) and no recent hardware updates\n`);

// For safety, require a flag
if (process.argv[2] !== "--confirm") {
  console.log(`💡 To confirm, run: node scripts/clear-stale-alerts.js --confirm\n`);
  process.exit(0);
}

clearStaleAlerts();

