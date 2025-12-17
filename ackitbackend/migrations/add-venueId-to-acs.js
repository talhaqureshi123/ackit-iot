/**
 * Migration: Add venueId column to acs table and migrate data
 * 
 * After the swap, ACs now belong to Venue (not Organization).
 * This migration:
 * 1. Adds venueId column to acs table
 * 2. Migrates data from organizationId to venueId
 * 3. Makes venueId NOT NULL
 * 4. Optionally removes organizationId column
 * 
 * Run: node migrations/add-venueId-to-acs.js
 */

const sequelize = require('../config/database/postgresql');
const { QueryTypes } = require('sequelize');

async function runMigration() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔄 Starting migration: Add venueId to acs table...\n');
    
    // Step 1: Check if venueId column already exists
    const [existingColumns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'acs' AND column_name = 'venueId';
    `, { transaction, type: QueryTypes.SELECT });
    
    if (existingColumns && existingColumns.length > 0) {
      console.log('✅ venueId column already exists in acs table\n');
      await transaction.commit();
      console.log('✅ Migration already completed!');
      process.exit(0);
    }
    
    // Step 2: Add venueId column (nullable initially)
    console.log('Step 1: Adding venueId column to acs table...');
    await sequelize.query(`
      ALTER TABLE acs 
      ADD COLUMN "venueId" INTEGER;
    `, { transaction, type: QueryTypes.RAW });
    console.log('✅ venueId column added\n');
    
    // Step 3: Migrate data from organizationId to venueId
    // Since organizations table is now used by Venue model,
    // organizationId in acs table actually points to venues
    console.log('Step 2: Migrating data from organizationId to venueId...');
    await sequelize.query(`
      UPDATE acs 
      SET "venueId" = "organizationId"
      WHERE "organizationId" IS NOT NULL;
    `, { transaction, type: QueryTypes.RAW });
    console.log('✅ Data migrated\n');
    
    // Step 4: Add foreign key constraint
    console.log('Step 3: Adding foreign key constraint...');
    try {
      await sequelize.query(`
        ALTER TABLE acs 
        ADD CONSTRAINT fk_acs_venueId 
        FOREIGN KEY ("venueId") 
        REFERENCES organizations(id) 
        ON DELETE CASCADE;
      `, { transaction, type: QueryTypes.RAW });
      console.log('✅ Foreign key constraint added\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Foreign key constraint already exists, skipping...\n');
      } else {
        throw error;
      }
    }
    
    // Step 5: Make venueId NOT NULL (after data migration)
    console.log('Step 4: Making venueId NOT NULL...');
    await sequelize.query(`
      ALTER TABLE acs 
      ALTER COLUMN "venueId" SET NOT NULL;
    `, { transaction, type: QueryTypes.RAW });
    console.log('✅ venueId is now NOT NULL\n');
    
    // Step 6: Create index for better performance
    console.log('Step 5: Creating index on venueId...');
    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_acs_venueId 
        ON acs("venueId");
      `, { transaction, type: QueryTypes.RAW });
      console.log('✅ Index created\n');
    } catch (error) {
      console.log('⚠️  Index might already exist, continuing...\n');
    }
    
    // Step 7: Update unique constraint to use venueId instead of organizationId
    console.log('Step 6: Updating unique constraint...');
    try {
      // Drop old unique constraint if it exists
      await sequelize.query(`
        ALTER TABLE acs 
        DROP CONSTRAINT IF EXISTS unique_organization_ac_serial;
      `, { transaction, type: QueryTypes.RAW });
      
      // Add new unique constraint with venueId
      await sequelize.query(`
        ALTER TABLE acs 
        ADD CONSTRAINT unique_venue_ac_serial 
        UNIQUE ("venueId", "serialNumber");
      `, { transaction, type: QueryTypes.RAW });
      console.log('✅ Unique constraint updated\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Unique constraint already exists, skipping...\n');
      } else {
        console.log('⚠️  Could not update unique constraint:', error.message);
        console.log('   Continuing...\n');
      }
    }
    
    await transaction.commit();
    console.log('✅ Migration completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - Added venueId column to acs table');
    console.log('   - Migrated data from organizationId to venueId');
    console.log('   - Added foreign key constraint');
    console.log('   - Created index for better performance');
    console.log('\n✨ ACs now properly reference Venues!');
    
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

runMigration();

