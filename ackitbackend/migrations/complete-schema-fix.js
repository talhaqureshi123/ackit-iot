/**
 * Complete Schema Fix Migration
 * 
 * This migration fixes all schema issues:
 * 1. Adds missing columns (controlDevicePower, deviceOnTime, deviceOffTime to events)
 * 2. Converts startTime and endTime to TIMESTAMPTZ in events table
 * 3. Ensures all models match database schema
 * 
 * Run: node ackitbackend/migrations/complete-schema-fix.js
 * Or: railway run node ackitbackend/migrations/complete-schema-fix.js
 */

// Load .env file only in non-production environments (Railway uses environment variables directly)
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: "./config/environment/.env" });
}

const sequelize = require("../config/database/postgresql");
const { QueryTypes } = require("sequelize");

async function fixSchema() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log("🔄 Starting complete schema fix migration...\n");

    // Test database connection
    await sequelize.authenticate();
    console.log("✅ Database connection established\n");

    // ============================================
    // Step 1: Fix Events Table - Add Missing Columns
    // ============================================
    console.log("📋 Step 1: Fixing Events table...\n");

    // Check existing columns
    const eventColumns = await sequelize.query(
      `SELECT column_name, data_type, udt_name
       FROM information_schema.columns 
       WHERE table_name = 'events' 
       AND column_name IN ('controlDevicePower', 'deviceOnTime', 'deviceOffTime', 'startTime', 'endTime')
       ORDER BY column_name`,
      { type: QueryTypes.SELECT, transaction }
    );

    const existingEventColumns = eventColumns.map(row => row.column_name);
    console.log("   Existing columns:", existingEventColumns.length > 0 ? existingEventColumns : "None");

    // Add controlDevicePower if missing
    if (!existingEventColumns.includes('controlDevicePower')) {
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
    if (!existingEventColumns.includes('deviceOnTime')) {
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
    if (!existingEventColumns.includes('deviceOffTime')) {
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

    // ============================================
    // Step 2: Fix Events Table - Convert to TIMESTAMPTZ
    // ============================================
    console.log("\n📋 Step 2: Converting Events timezone columns to TIMESTAMPTZ...\n");

    // Check startTime column type
    const startTimeInfo = eventColumns.find(col => col.column_name === 'startTime');
    if (startTimeInfo && startTimeInfo.udt_name !== 'timestamptz') {
      console.log("   🔄 Converting startTime to TIMESTAMPTZ...");
      await sequelize.query(
        `ALTER TABLE events
         ALTER COLUMN "startTime"
         TYPE TIMESTAMPTZ
         USING "startTime" AT TIME ZONE 'UTC';`,
        { type: QueryTypes.RAW, transaction }
      );
      console.log("   ✅ startTime converted to TIMESTAMPTZ");
    } else {
      console.log("   ✅ startTime is already TIMESTAMPTZ");
    }

    // Check endTime column type
    const endTimeInfo = eventColumns.find(col => col.column_name === 'endTime');
    if (endTimeInfo && endTimeInfo.udt_name !== 'timestamptz') {
      console.log("   🔄 Converting endTime to TIMESTAMPTZ...");
      await sequelize.query(
        `ALTER TABLE events
         ALTER COLUMN "endTime"
         TYPE TIMESTAMPTZ
         USING "endTime" AT TIME ZONE 'UTC';`,
        { type: QueryTypes.RAW, transaction }
      );
      console.log("   ✅ endTime converted to TIMESTAMPTZ");
    } else {
      console.log("   ✅ endTime is already TIMESTAMPTZ");
    }

    // ============================================
    // Step 3: Add Column Comments
    // ============================================
    console.log("\n📋 Step 3: Adding column comments...\n");

    await sequelize.query(
      `COMMENT ON COLUMN events."controlDevicePower" IS 'Whether this event controls device power (on/off)';
       COMMENT ON COLUMN events."deviceOnTime" IS 'When to turn device ON (for non-recurring events, stored as UTC TIMESTAMPTZ; for recurring events, stored as TIME)';
       COMMENT ON COLUMN events."deviceOffTime" IS 'When to turn device OFF (for non-recurring events, stored as UTC TIMESTAMPTZ; for recurring events, stored as TIME)';`,
      { type: QueryTypes.RAW, transaction }
    );
    console.log("   ✅ Column comments added");

    // ============================================
    // Step 4: Verify All Changes
    // ============================================
    console.log("\n📋 Step 4: Verifying changes...\n");

    const verifyColumns = await sequelize.query(
      `SELECT column_name, data_type, udt_name, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_name = 'events' 
       AND column_name IN ('controlDevicePower', 'deviceOnTime', 'deviceOffTime', 'startTime', 'endTime')
       ORDER BY column_name`,
      { type: QueryTypes.SELECT, transaction }
    );

    console.log("   📊 Events table columns:");
    verifyColumns.forEach(col => {
      console.log(`      - ${col.column_name}: ${col.udt_name || col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
    });

    // Commit transaction
    await transaction.commit();
    
    console.log("\n✅ Complete schema fix migration completed successfully!");
    console.log("\n📝 Summary:");
    console.log("   ✅ Added missing columns to events table");
    console.log("   ✅ Converted timezone columns to TIMESTAMPTZ");
    console.log("   ✅ Added column comments");
    console.log("\n✨ Database schema is now fully synchronized with models!");

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

// Run the migration
fixSchema();

