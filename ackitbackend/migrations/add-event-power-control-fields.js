/**
 * Migration Script: Add device power control fields to events table
 *
 * This migration adds fields to support device power control in events:
 * - controlDevicePower: boolean flag to enable/disable power control
 * - deviceOnTime: timestamp for when to turn device ON
 * - deviceOffTime: timestamp for when to turn device OFF
 *
 * Run: node migrations/add-event-power-control-fields.js
 */

const sequelize = require("../config/database/postgresql");
const { QueryTypes } = require("sequelize");

async function runMigration() {
  const transaction = await sequelize.transaction();

  try {
    console.log(
      "🔄 Starting migration: Add device power control fields to events table...\n"
    );

    // Step 1: Add controlDevicePower column
    console.log("Step 1: Adding controlDevicePower column...");
    await sequelize.query(
      `
      ALTER TABLE events 
      ADD COLUMN IF NOT EXISTS "controlDevicePower" BOOLEAN DEFAULT false;
    `,
      { transaction, type: QueryTypes.RAW }
    );
    console.log("✅ controlDevicePower column added\n");

    // Step 2: Add deviceOnTime column
    console.log("Step 2: Adding deviceOnTime column...");
    await sequelize.query(
      `
      ALTER TABLE events 
      ADD COLUMN IF NOT EXISTS "deviceOnTime" TIMESTAMPTZ;
    `,
      { transaction, type: QueryTypes.RAW }
    );
    console.log("✅ deviceOnTime column added\n");

    // Step 3: Add deviceOffTime column
    console.log("Step 3: Adding deviceOffTime column...");
    await sequelize.query(
      `
      ALTER TABLE events 
      ADD COLUMN IF NOT EXISTS "deviceOffTime" TIMESTAMPTZ;
    `,
      { transaction, type: QueryTypes.RAW }
    );
    console.log("✅ deviceOffTime column added\n");

    // Step 4: Add column comments
    console.log("Step 4: Adding column comments...");
    await sequelize.query(
      `
      COMMENT ON COLUMN events."controlDevicePower" IS 'Whether this event controls device power (on/off)';
      COMMENT ON COLUMN events."deviceOnTime" IS 'When to turn device ON (for non-recurring events, stored as UTC TIMESTAMPTZ; for recurring events, stored as TIME)';
      COMMENT ON COLUMN events."deviceOffTime" IS 'When to turn device OFF (for non-recurring events, stored as UTC TIMESTAMPTZ; for recurring events, stored as TIME)';
    `,
      { transaction, type: QueryTypes.RAW }
    );
    console.log("✅ Column comments added\n");

    await transaction.commit();
    console.log("✅ Migration completed successfully!");
    console.log("\n📝 Summary:");
    console.log("   - Added controlDevicePower column (BOOLEAN, default: false)");
    console.log("   - Added deviceOnTime column (TIMESTAMPTZ, nullable)");
    console.log("   - Added deviceOffTime column (TIMESTAMPTZ, nullable)");
    console.log("   - Added column comments");
    console.log("\n✨ You can now use device power control in events!");

    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Migration failed:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

// Run migration
runMigration();









