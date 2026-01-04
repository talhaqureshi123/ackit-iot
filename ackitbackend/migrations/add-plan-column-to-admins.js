/**
 * Migration Script: Add plan column to admins table
 * 
 * This migration adds the 'plan' column to the admins table
 * to support plan management (basic, advanced, premium, custom)
 * 
 * Run: node migrations/add-plan-column-to-admins.js
 */

const sequelize = require("../config/database/postgresql");
const { QueryTypes } = require("sequelize");

async function runMigration() {
  const transaction = await sequelize.transaction();

  try {
    console.log("🔄 Starting migration: Add plan column to admins table...\n");

    // Check if column already exists
    const checkColumn = await sequelize.query(
      `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'admins' AND column_name = 'plan';
    `,
      { type: QueryTypes.SELECT }
    );

    if (checkColumn.length > 0) {
      console.log("✅ Column 'plan' already exists in admins table");
      await transaction.rollback();
      process.exit(0);
    }

    // Step 1: Add plan column
    console.log("Step 1: Adding plan column...");
    await sequelize.query(
      `
      ALTER TABLE admins 
      ADD COLUMN "plan" VARCHAR(20) DEFAULT 'basic' 
      CHECK ("plan" IN ('basic', 'advanced', 'premium', 'custom'));
    `,
      { transaction, type: QueryTypes.RAW }
    );
    console.log("✅ plan column added\n");

    // Step 2: Update existing admins to have 'basic' plan
    console.log("Step 2: Setting default plan for existing admins...");
    await sequelize.query(
      `
      UPDATE admins 
      SET "plan" = 'basic' 
      WHERE "plan" IS NULL;
    `,
      { transaction, type: QueryTypes.RAW }
    );
    console.log("✅ Default plan set for existing admins\n");

    await transaction.commit();
    console.log("✅ Migration completed successfully!");
    console.log("\n📝 Summary:");
    console.log("   - Added plan column (VARCHAR(20), default: 'basic')");
    console.log("   - Added CHECK constraint for valid plan values");
    console.log("   - Set default plan for existing admins");
    console.log("\n✨ Admins can now have plan management!");

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



