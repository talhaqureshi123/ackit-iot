/**
 * Migration: Add missing columns to events table
 * 
 * This migration adds the following columns to the events table:
 * - controlDevicePower: BOOLEAN (default: false)
 * - deviceOnTime: TIMESTAMPTZ (nullable)
 * - deviceOffTime: TIMESTAMPTZ (nullable)
 * 
 * Run via npm: npm run migrate
 * Run directly: node migrations/add-missing-columns-railway.js
 * Run via Railway CLI: railway run npm run migrate
 */

// Load .env file only in non-production environments (Railway uses environment variables directly)
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: "./config/environment/.env" });
}

const sequelize = require("../config/database/postgresql");
const { QueryTypes } = require("sequelize");

async function addMissingColumns() {
  try {
    console.log("🔄 Adding missing columns to events table...\n");

    // Test database connection
    await sequelize.authenticate();
    console.log("✅ Database connection established\n");

    // Check if columns exist
    const checkColumns = await sequelize.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'events' 
       AND column_name IN ('controlDevicePower', 'deviceOnTime', 'deviceOffTime')`,
      { type: QueryTypes.SELECT }
    );

    const existingColumns = checkColumns.map(row => row.column_name);
    console.log("📋 Existing columns:", existingColumns.length > 0 ? existingColumns : "None");

    // Add controlDevicePower if missing
    if (!existingColumns.includes('controlDevicePower')) {
      console.log("➕ Adding controlDevicePower column...");
      await sequelize.query(
        `ALTER TABLE events 
         ADD COLUMN IF NOT EXISTS "controlDevicePower" BOOLEAN DEFAULT false;`,
        { type: QueryTypes.RAW }
      );
      console.log("✅ controlDevicePower column added");
    } else {
      console.log("✅ controlDevicePower column already exists");
    }

    // Add deviceOnTime if missing
    if (!existingColumns.includes('deviceOnTime')) {
      console.log("➕ Adding deviceOnTime column...");
      await sequelize.query(
        `ALTER TABLE events 
         ADD COLUMN IF NOT EXISTS "deviceOnTime" TIMESTAMPTZ;`,
        { type: QueryTypes.RAW }
      );
      console.log("✅ deviceOnTime column added");
    } else {
      console.log("✅ deviceOnTime column already exists");
    }

    // Add deviceOffTime if missing
    if (!existingColumns.includes('deviceOffTime')) {
      console.log("➕ Adding deviceOffTime column...");
      await sequelize.query(
        `ALTER TABLE events 
         ADD COLUMN IF NOT EXISTS "deviceOffTime" TIMESTAMPTZ;`,
        { type: QueryTypes.RAW }
      );
      console.log("✅ deviceOffTime column added");
    } else {
      console.log("✅ deviceOffTime column already exists");
    }

    console.log("\n✅ Migration completed successfully!");
    console.log("\n📝 Summary:");
    console.log("   - controlDevicePower: BOOLEAN, default: false");
    console.log("   - deviceOnTime: TIMESTAMPTZ, nullable");
    console.log("   - deviceOffTime: TIMESTAMPTZ, nullable");
    
    // Verify columns were added
    const verifyColumns = await sequelize.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_name = 'events' 
       AND column_name IN ('controlDevicePower', 'deviceOnTime', 'deviceOffTime')
       ORDER BY column_name`,
      { type: QueryTypes.SELECT }
    );
    
    console.log("\n✅ Verification - Columns in database:");
    verifyColumns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error adding columns:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log("\n🔌 Database connection closed");
  }
}

// Run the script
addMissingColumns();

