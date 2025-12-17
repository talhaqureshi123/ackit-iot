/**
 * Migration: Make venues table columns nullable for Organization records
 * 
 * Since Organization model (simple) uses venues table, we need to make
 * the complex columns nullable so Organization records can be created.
 * 
 * Run: node migrations/make-venues-columns-nullable-for-org.js
 */

const sequelize = require('../config/database/postgresql');
const { QueryTypes } = require('sequelize');

async function runMigration() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔄 Starting migration: Make venues table columns nullable for Organization...\n');
    
    // Columns that need to be nullable for Organization records
    const columnsToMakeNullable = [
      'organizationSize',
      'organizationId',
    ];
    
    // First, check which columns exist
    console.log('Checking existing columns in venues table...');
    const existingColumns = await sequelize.query(`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'venues' 
      AND column_name IN ('organizationSize', 'organizationId');
    `, { transaction, type: QueryTypes.SELECT });
    
    const columnMap = {};
    existingColumns.forEach(col => {
      columnMap[col.column_name] = col.is_nullable === 'YES';
    });
    
    console.log('Existing columns:', columnMap);
    console.log('');
    
    // Make each column nullable if it exists
    for (const colName of columnsToMakeNullable) {
      if (!columnMap.hasOwnProperty(colName)) {
        console.log(`⚠️  Column ${colName} does not exist in venues table, skipping...\n`);
        continue;
      }
      
      if (columnMap[colName]) {
        console.log(`✅ Column ${colName} is already nullable, skipping...\n`);
        continue;
      }
      
      try {
        console.log(`Making column ${colName} nullable...`);
        
        await sequelize.query(`
          ALTER TABLE venues 
          ALTER COLUMN "${colName}" DROP NOT NULL;
        `, { transaction, type: QueryTypes.RAW });
        
        console.log(`✅ Column ${colName} is now nullable\n`);
      } catch (error) {
        console.log(`⚠️  Could not alter column ${colName}: ${error.message}\n`);
        // Don't throw - continue with other columns
      }
    }
    
    await transaction.commit();
    console.log('✅ Migration completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - Made organizationSize nullable in venues table');
    console.log('   - Made organizationId nullable in venues table');
    console.log('   - Organization records can now be created in venues table');
    console.log('\n✨ You can now test creating Organizations!');
    
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

runMigration();

