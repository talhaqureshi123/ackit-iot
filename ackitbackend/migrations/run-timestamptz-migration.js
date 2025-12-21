/**
 * Run the TIMESTAMPTZ migration for events table
 * 
 * Usage: node migrations/run-timestamptz-migration.js
 */

const sequelize = require('../config/database/postgresql');
const migration = require('./fix-events-timestamptz');

async function runMigration() {
  try {
    console.log('🚀 Starting TIMESTAMPTZ migration for events table...\n');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');
    
    // Run migration
    await migration.up(sequelize.getQueryInterface(), sequelize.constructor);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('📝 Events table columns are now TIMESTAMPTZ');
    console.log('💡 All future events will be stored in UTC properly');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

