/**
 * Migration: Add lockedTemperature column to organizations table
 * 
 * This migration adds the lockedTemperature field to organizations table
 * which is used to store the temperature when organization/venue is locked.
 * 
 * Run: node migrations/add-locked-temperature-to-organizations.js
 */

const sequelize = require('../config/database/postgresql');
const { QueryTypes } = require('sequelize');

async function runMigration() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔄 Starting migration: Add lockedTemperature column to organizations table...\n');
    
    // Add lockedTemperature column
    await sequelize.query(
      `ALTER TABLE organizations 
       ADD COLUMN IF NOT EXISTS "lockedTemperature" INTEGER;`,
      { 
        type: QueryTypes.RAW,
        transaction 
      }
    );
    
    console.log('✅ Successfully added lockedTemperature column to organizations table\n');
    
    // Add comment to column
    await sequelize.query(
      `COMMENT ON COLUMN organizations."lockedTemperature" IS 'Locked temperature when organization/venue is locked (16-30°C)';`,
      { 
        type: QueryTypes.RAW,
        transaction 
      }
    );
    
    console.log('✅ Successfully added comment to lockedTemperature column\n');
    
    await transaction.commit();
    console.log('✅ Migration completed successfully!\n');
    
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run migration
runMigration();

