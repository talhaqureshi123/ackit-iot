/**
 * Migration: Make venueId column nullable in organizations table
 *
 * The old venueId column has a NOT NULL constraint which is causing errors.
 * Since Venue model now uses organizationId instead, we make venueId nullable.
 *
 * Run: node migrations/make-venueId-nullable.js
 */

const sequelize = require("../config/database/postgresql");
const { QueryTypes } = require("sequelize");

async function runMigration() {
  const transaction = await sequelize.transaction();

  try {
    console.log(
      "🔄 Making venueId column nullable in organizations table...\n"
    );

    // Make venueId nullable
    await sequelize.query(
      `
      ALTER TABLE organizations 
      ALTER COLUMN "venueId" DROP NOT NULL;
    `,
      { transaction, type: QueryTypes.RAW }
    );

    console.log("✅ Made venueId column nullable\n");

    await transaction.commit();
    console.log("✅ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Migration failed:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

runMigration();
