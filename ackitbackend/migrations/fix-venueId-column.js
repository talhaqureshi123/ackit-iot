/**
 * Migration: Fix old venueId column in organizations table
 *
 * The old organizations table had a venueId column that's no longer needed.
 * This migration makes it nullable or removes it.
 *
 * Run: node migrations/fix-venueId-column.js
 */

const sequelize = require("../config/database/postgresql");
const { QueryTypes } = require("sequelize");

async function runMigration() {
  const transaction = await sequelize.transaction();

  try {
    console.log("🔄 Fixing venueId column in organizations table...\n");

    // Check if venueId column exists
    const [results] = await sequelize.query(
      `
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_name = 'organizations' AND column_name = 'venueId';
    `,
      { transaction, type: QueryTypes.SELECT }
    );

    if (results && results.length > 0) {
      console.log("Found venueId column, making it nullable...");

      // First, drop the NOT NULL constraint if it exists
      await sequelize.query(
        `
        ALTER TABLE organizations 
        ALTER COLUMN "venueId" DROP NOT NULL;
      `,
        { transaction, type: QueryTypes.RAW }
      );

      console.log("✅ Made venueId column nullable\n");

      // Optionally, you can drop the column entirely if not needed
      // Uncomment the following if you want to remove it:
      /*
      await sequelize.query(`
        ALTER TABLE organizations 
        DROP COLUMN IF EXISTS "venueId";
      `, { transaction, type: QueryTypes.RAW });
      console.log('✅ Removed venueId column\n');
      */
    } else {
      console.log("⚠️  venueId column not found, nothing to fix\n");
    }

    await transaction.commit();
    console.log("✅ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    if (
      error.message.includes("does not exist") ||
      error.message.includes("column")
    ) {
      console.log(
        "⚠️  Column might not exist or already fixed:",
        error.message
      );
      console.log("✅ Continuing...");
      process.exit(0);
    } else {
      console.error("❌ Migration failed:", error.message);
      console.error("\nFull error:", error);
      process.exit(1);
    }
  }
}

runMigration();
