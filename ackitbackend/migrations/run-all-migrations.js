/**
 * Master Migration Script - Run All Critical Migrations
 * 
 * This script runs all critical database migrations in the correct order:
 * 1. Add missing columns to events table (controlDevicePower, deviceOnTime, deviceOffTime)
 * 2. Fix timezone issues (convert to TIMESTAMPTZ if needed)
 * 
 * Run via npm: npm run migrate:all
 * Run directly: node migrations/run-all-migrations.js
 * Run via Railway CLI: railway run npm run migrate:all
 */

// Load .env file only in non-production environments
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: "./config/environment/.env" });
}

const sequelize = require("../config/database/postgresql");
const { QueryTypes } = require("sequelize");

async function runAllMigrations() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log("🔄 Starting all critical migrations...\n");

    // Test database connection
    await sequelize.authenticate();
    console.log("✅ Database connection established\n");

    // ============================================
    // Migration 1: Add Missing Columns to Events Table
    // ============================================
    console.log("📋 Migration 1: Adding missing columns to events table...\n");

    const checkColumns = await sequelize.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'events' 
       AND column_name IN ('controlDevicePower', 'deviceOnTime', 'deviceOffTime')`,
      { type: QueryTypes.SELECT, transaction }
    );

    const existingColumns = checkColumns.map(row => row.column_name);
    console.log("   Existing columns:", existingColumns.length > 0 ? existingColumns : "None");

    // Add controlDevicePower if missing
    if (!existingColumns.includes('controlDevicePower')) {
      console.log("   ➕ Adding controlDevicePower column...");
      await sequelize.query(
        `ALTER TABLE events 
         ADD COLUMN IF NOT EXISTS "controlDevicePower" BOOLEAN DEFAULT false;`,
        { type: QueryTypes.RAW, transaction }
      );
      console.log("   ✅ controlDevicePower column added");
    } else {
      console.log("   ✅ controlDevicePower column already exists");
    }

    // Add deviceOnTime if missing
    if (!existingColumns.includes('deviceOnTime')) {
      console.log("   ➕ Adding deviceOnTime column...");
      await sequelize.query(
        `ALTER TABLE events 
         ADD COLUMN IF NOT EXISTS "deviceOnTime" TIMESTAMPTZ;`,
        { type: QueryTypes.RAW, transaction }
      );
      console.log("   ✅ deviceOnTime column added");
    } else {
      console.log("   ✅ deviceOnTime column already exists");
    }

    // Add deviceOffTime if missing
    if (!existingColumns.includes('deviceOffTime')) {
      console.log("   ➕ Adding deviceOffTime column...");
      await sequelize.query(
        `ALTER TABLE events 
         ADD COLUMN IF NOT EXISTS "deviceOffTime" TIMESTAMPTZ;`,
        { type: QueryTypes.RAW, transaction }
      );
      console.log("   ✅ deviceOffTime column added");
    } else {
      console.log("   ✅ deviceOffTime column already exists");
    }

    console.log("\n✅ Migration 1 completed!\n");

    // ============================================
    // Migration 2: Fix Timezone Columns (if needed)
    // ============================================
    console.log("📋 Migration 2: Checking timezone columns...\n");

    const timezoneColumns = await sequelize.query(
      `SELECT column_name, data_type, udt_name
       FROM information_schema.columns 
       WHERE table_name = 'events' 
       AND column_name IN ('startTime', 'endTime')
       ORDER BY column_name`,
      { type: QueryTypes.SELECT, transaction }
    );

    let needsTimezoneFix = false;
    timezoneColumns.forEach(col => {
      if (col.udt_name === 'timestamp' && col.data_type === 'timestamp without time zone') {
        console.log(`   ⚠️ ${col.column_name} needs timezone fix (currently: ${col.udt_name})`);
        needsTimezoneFix = true;
      } else {
        console.log(`   ✅ ${col.column_name} is already TIMESTAMPTZ`);
      }
    });

    if (needsTimezoneFix) {
      console.log("\n   🔄 Converting timestamp columns to TIMESTAMPTZ...");
      
      // Convert startTime
      if (timezoneColumns.find(c => c.column_name === 'startTime' && c.udt_name === 'timestamp')) {
        console.log("   ➕ Converting startTime to TIMESTAMPTZ...");
        await sequelize.query(
          `ALTER TABLE events
           ALTER COLUMN "startTime"
           TYPE TIMESTAMPTZ
           USING "startTime" AT TIME ZONE 'UTC';`,
          { type: QueryTypes.RAW, transaction }
        );
        console.log("   ✅ startTime converted to TIMESTAMPTZ");
      }

      // Convert endTime
      if (timezoneColumns.find(c => c.column_name === 'endTime' && c.udt_name === 'timestamp')) {
        console.log("   ➕ Converting endTime to TIMESTAMPTZ...");
        await sequelize.query(
          `ALTER TABLE events
           ALTER COLUMN "endTime"
           TYPE TIMESTAMPTZ
           USING "endTime" AT TIME ZONE 'UTC';`,
          { type: QueryTypes.RAW, transaction }
        );
        console.log("   ✅ endTime converted to TIMESTAMPTZ");
      }
    } else {
      console.log("   ✅ All timezone columns are already correct");
    }

    console.log("\n✅ Migration 2 completed!\n");

    // ============================================
    // Verification
    // ============================================
    console.log("📋 Verifying migrations...\n");

    const verifyColumns = await sequelize.query(
      `SELECT column_name, data_type, udt_name, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_name = 'events' 
       AND column_name IN ('controlDevicePower', 'deviceOnTime', 'deviceOffTime', 'startTime', 'endTime')
       ORDER BY column_name`,
      { type: QueryTypes.SELECT, transaction }
    );

    console.log("✅ Verification - Events table columns:");
    verifyColumns.forEach(col => {
      const type = col.udt_name || col.data_type;
      const nullable = col.is_nullable === 'YES' ? 'nullable' : 'not null';
      const defaultVal = col.column_default || 'none';
      console.log(`   - ${col.column_name}: ${type} (${nullable}, default: ${defaultVal})`);
    });

    // Commit transaction
    await transaction.commit();

    console.log("\n✅ All migrations completed successfully!");
    console.log("\n📝 Summary:");
    console.log("   ✅ Added missing columns to events table");
    console.log("   ✅ Fixed timezone columns (if needed)");
    console.log("   ✅ Database schema is now synchronized with models");

    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error("\n❌ Migration failed:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log("\n🔌 Database connection closed");
  }
}

// Run all migrations
runAllMigrations();

