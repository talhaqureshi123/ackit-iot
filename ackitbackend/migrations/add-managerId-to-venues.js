/**
 * Migration: Add managerId column to venues table
 * 
 * Organization model uses "venues" table, so we need managerId there
 */

require("dotenv").config();
const sequelize = require("../config/database/postgresql");
const { QueryTypes } = require("sequelize");

async function runMigration() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log("🔄 Adding managerId column to venues table...\n");
    
    // Add managerId column to venues table
    await sequelize.query(
      `ALTER TABLE venues ADD COLUMN IF NOT EXISTS "managerId" INTEGER;`,
      { transaction, type: QueryTypes.RAW }
    );
    console.log("✅ managerId column added to venues table\n");
    
    // Add foreign key constraint
    try {
      await sequelize.query(
        `ALTER TABLE venues 
         ADD CONSTRAINT fk_venues_managerId 
         FOREIGN KEY ("managerId") 
         REFERENCES managers(id) 
         ON DELETE SET NULL;`,
        { transaction, type: QueryTypes.RAW }
      );
      console.log("✅ Foreign key constraint added\n");
    } catch (error) {
      if (error.message.includes("already exists")) {
        console.log("⚠️  Foreign key already exists, skipping...\n");
      } else {
        console.log(`⚠️  Could not add foreign key: ${error.message}\n`);
      }
    }
    
    // Create index
    try {
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_venues_managerId 
         ON venues("managerId");`,
        { transaction, type: QueryTypes.RAW }
      );
      console.log("✅ Index created\n");
    } catch (error) {
      console.log(`⚠️  Could not create index: ${error.message}\n`);
    }
    
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

