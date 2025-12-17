/**
 * Migration Script: Add organizationId to organizations table
 *
 * This migration adds the organizationId column to organizations table
 * which is needed because Venue model (using organizations table) needs
 * to reference parent Organization (stored in venues table).
 *
 * Run: node migrations/run-migration.js
 */

const sequelize = require("../config/database/postgresql");
const { QueryTypes } = require("sequelize");

async function runMigration() {
  const transaction = await sequelize.transaction();

  try {
    console.log(
      "🔄 Starting migration: Add organizationId to organizations table...\n"
    );

    // Step 1: Add organizationId column
    console.log("Step 1: Adding organizationId column...");
    await sequelize.query(
      `
      ALTER TABLE organizations 
      ADD COLUMN IF NOT EXISTS "organizationId" INTEGER;
    `,
      { transaction, type: QueryTypes.RAW }
    );
    console.log("✅ organizationId column added\n");

    // Step 2: Add foreign key constraint
    console.log("Step 2: Adding foreign key constraint...");
    try {
      await sequelize.query(
        `
        ALTER TABLE organizations 
        ADD CONSTRAINT fk_organizations_organizationId 
        FOREIGN KEY ("organizationId") 
        REFERENCES venues(id) 
        ON DELETE CASCADE;
      `,
        { transaction, type: QueryTypes.RAW }
      );
      console.log("✅ Foreign key constraint added\n");
    } catch (error) {
      if (error.message.includes("already exists")) {
        console.log("⚠️  Foreign key constraint already exists, skipping...\n");
      } else {
        throw error;
      }
    }

    // Step 3: Create index
    console.log("Step 3: Creating index...");
    await sequelize.query(
      `
      CREATE INDEX IF NOT EXISTS idx_organizations_organizationId 
      ON organizations("organizationId");
    `,
      { transaction, type: QueryTypes.RAW }
    );
    console.log("✅ Index created\n");

    await transaction.commit();
    console.log("✅ Migration completed successfully!");
    console.log("\n📝 Summary:");
    console.log("   - Added organizationId column to organizations table");
    console.log("   - Added foreign key constraint (references venues table)");
    console.log("   - Created index for better performance");
    console.log("\n✨ You can now test the application!");

    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Migration failed:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

runMigration();
