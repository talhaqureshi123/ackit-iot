/**
 * Migration: Make organizationId nullable in acs table
 * 
 * After adding venueId, organizationId is no longer needed.
 * Make it nullable so old code doesn't break, but new code uses venueId.
 * 
 * Run: node migrations/make-organizationId-nullable-in-acs.js
 */

const sequelize = require('../config/database/postgresql');
const { QueryTypes } = require('sequelize');

async function runMigration() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔄 Making organizationId nullable in acs table...\n');
    
    // Make organizationId nullable
    await sequelize.query(`
      ALTER TABLE acs 
      ALTER COLUMN "organizationId" DROP NOT NULL;
    `, { transaction, type: QueryTypes.RAW });
    
    console.log('✅ organizationId is now nullable\n');
    
    await transaction.commit();
    console.log('✅ Migration completed successfully!');
    console.log('\n📝 Note: organizationId is now nullable. New ACs should use venueId.');
    
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

runMigration();

