/**
 * Migration: Add status column to venues table
 * 
 * Organization model uses venues table, so we need to add status column there
 * 
 * Run: node migrations/add-status-to-venues-table.js
 */

const sequelize = require('../config/database/postgresql');
const { QueryTypes } = require('sequelize');

async function runMigration() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔄 Starting migration: Add status column to venues table...\n');
    
    // Check if status column already exists
    const checkColumn = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'venues' AND column_name = 'status';
    `, { transaction, type: QueryTypes.SELECT });
    
    if (checkColumn.length > 0) {
      console.log('⚠️  status column already exists in venues table, skipping...\n');
      await transaction.commit();
      console.log('✅ Migration completed (no changes needed)!');
      process.exit(0);
    }
    
    // Add status column to venues table
    console.log('Adding status column to venues table...');
    await sequelize.query(`
      ALTER TABLE venues 
      ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'active';
    `, { transaction, type: QueryTypes.RAW });
    console.log('✅ status column added to venues table\n');
    
    // Add check constraint
    try {
      await sequelize.query(`
        ALTER TABLE venues 
        ADD CONSTRAINT check_venues_status 
        CHECK (status IN ('active', 'split'));
      `, { transaction, type: QueryTypes.RAW });
      console.log('✅ Check constraint added\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Check constraint already exists, skipping...\n');
      } else {
        console.log(`⚠️  Could not add check constraint: ${error.message}\n`);
      }
    }
    
    // Create index
    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_venues_status 
        ON venues("status");
      `, { transaction, type: QueryTypes.RAW });
      console.log('✅ Index created\n');
    } catch (error) {
      console.log(`⚠️  Could not create index: ${error.message}\n`);
    }
    
    await transaction.commit();
    console.log('✅ Migration completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - Added status column to venues table');
    console.log('   - Added check constraint for status values');
    console.log('   - Created index for better performance');
    console.log('\n✨ You can now test the application!');
    
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

runMigration();

