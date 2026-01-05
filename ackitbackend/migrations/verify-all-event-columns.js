/**
 * Verify All Event Model Columns
 * 
 * This script checks if ALL columns from Event model exist in database
 * and reports any missing columns.
 * 
 * Run: node migrations/verify-all-event-columns.js
 */

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: "./config/environment/.env" });
}

const sequelize = require("../config/database/postgresql");
const { QueryTypes } = require("sequelize");

// All columns from Event model (from event.js)
const EVENT_MODEL_COLUMNS = [
  'id',
  'name',
  'eventType',
  'deviceId',
  'organizationId',
  'createdBy',
  'adminId',
  'managerId',
  'startTime',
  'endTime',
  'temperature',
  'powerOn',
  'controlDevicePower',      // ⚠️ Often missing
  'deviceOnTime',            // ⚠️ Often missing
  'deviceOffTime',           // ⚠️ Often missing
  'status',
  'parentAdminEventId',
  'autoStarted',
  'autoEnded',
  'stoppedAt',
  'startedAt',
  'completedAt',
  'isDisabled',
  'disabledAt',
  'originalEndTime',
  'totalDisabledDuration',
  'isRecurring',
  'recurringType',
  'daysOfWeek',
  'recurringStartDate',
  'recurringEndDate',
  'timeStart',
  'timeEnd',
  'parentRecurringEventId',
  'createdAt',              // Sequelize timestamps
  'updatedAt'                // Sequelize timestamps
];

async function verifyAllColumns() {
  try {
    console.log("🔍 Verifying all Event model columns in database...\n");

    await sequelize.authenticate();
    console.log("✅ Database connection established\n");

    // Get all columns from database
    const dbColumns = await sequelize.query(
      `SELECT column_name, data_type, udt_name, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_name = 'events'
       ORDER BY column_name`,
      { type: QueryTypes.SELECT }
    );

    const dbColumnNames = dbColumns.map(col => col.column_name);
    console.log(`📊 Found ${dbColumnNames.length} columns in database\n`);

    // Check which model columns are missing
    const missingColumns = EVENT_MODEL_COLUMNS.filter(
      modelCol => !dbColumnNames.includes(modelCol)
    );

    // Check for extra columns in database (not in model)
    const extraColumns = dbColumnNames.filter(
      dbCol => !EVENT_MODEL_COLUMNS.includes(dbCol)
    );

    console.log("=".repeat(60));
    console.log("📋 VERIFICATION RESULTS");
    console.log("=".repeat(60));

    if (missingColumns.length === 0) {
      console.log("\n✅ All Event model columns exist in database!");
    } else {
      console.log(`\n❌ Missing ${missingColumns.length} column(s):`);
      missingColumns.forEach(col => {
        console.log(`   - ${col}`);
      });
    }

    if (extraColumns.length > 0) {
      console.log(`\n⚠️  Extra columns in database (${extraColumns.length}):`);
      extraColumns.forEach(col => {
        console.log(`   - ${col} (not in model, might be safe to ignore)`);
      });
    }

    // Check critical columns
    console.log("\n" + "=".repeat(60));
    console.log("🔍 Critical Columns Check:");
    console.log("=".repeat(60));

    const criticalColumns = ['controlDevicePower', 'deviceOnTime', 'deviceOffTime'];
    criticalColumns.forEach(col => {
      if (dbColumnNames.includes(col)) {
        const colInfo = dbColumns.find(c => c.column_name === col);
        console.log(`   ✅ ${col}: EXISTS (${colInfo.udt_name || colInfo.data_type})`);
      } else {
        console.log(`   ❌ ${col}: MISSING (causes 500 errors!)`);
      }
    });

    // Check timezone columns
    console.log("\n🔍 Timezone Columns Check:");
    const timezoneColumns = ['startTime', 'endTime'];
    timezoneColumns.forEach(col => {
      if (dbColumnNames.includes(col)) {
        const colInfo = dbColumns.find(c => c.column_name === col);
        const isTimestamptz = colInfo.udt_name === 'timestamptz';
        const icon = isTimestamptz ? '✅' : '⚠️';
        console.log(`   ${icon} ${col}: ${colInfo.udt_name || colInfo.data_type} ${isTimestamptz ? '(correct)' : '(needs fix)'}`);
      } else {
        console.log(`   ❌ ${col}: MISSING`);
      }
    });

    console.log("\n" + "=".repeat(60));
    if (missingColumns.length === 0) {
      console.log("✅ Database schema is complete!");
      console.log("   → All Event model columns exist");
      console.log("   → No migration needed");
    } else {
      console.log("⚠️  Database schema needs updates");
      console.log(`   → ${missingColumns.length} column(s) missing`);
      console.log("   → Run migration: npm run migrate:all");
    }
    console.log("=".repeat(60) + "\n");

    process.exit(missingColumns.length === 0 ? 0 : 1);
  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

verifyAllColumns();

