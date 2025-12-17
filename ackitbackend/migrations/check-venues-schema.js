/**
 * Check venues table schema
 */

const sequelize = require('../config/database/postgresql');
const { QueryTypes } = require('sequelize');

async function checkSchema() {
  try {
    console.log('🔍 Checking venues table schema...\n');
    
    const columns = await sequelize.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'venues'
      ORDER BY ordinal_position;
    `, { type: QueryTypes.SELECT });
    
    console.log('Columns in venues table:');
    console.log('='.repeat(80));
    columns.forEach(col => {
      console.log(`${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} nullable: ${col.is_nullable} default: ${col.column_default || 'NULL'}`);
    });
    console.log('='.repeat(80));
    
    // Check constraints
    const constraints = await sequelize.query(`
      SELECT 
        constraint_name,
        constraint_type
      FROM information_schema.table_constraints 
      WHERE table_name = 'venues';
    `, { type: QueryTypes.SELECT });
    
    console.log('\nConstraints on venues table:');
    console.log('='.repeat(80));
    constraints.forEach(con => {
      console.log(`${con.constraint_name.padEnd(50)} ${con.constraint_type}`);
    });
    console.log('='.repeat(80));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSchema();

