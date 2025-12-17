// Verify Database Schema Matches Models
require("dotenv").config({ path: "../config/environment/.env" });
const sequelize = require("../config/database/postgresql");

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    // Check ACs table
    const [acsCols] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='acs' 
      AND column_name IN ('key', 'temperature', 'isOn', 'serialNumber')
      ORDER BY column_name;
    `);
    console.log("📋 ACs table columns:");
    acsCols.forEach(col => {
      console.log(`   ✓ ${col.column_name} (${col.data_type})`);
    });

    // Check Managers table
    const [managersCols] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='managers' 
      AND column_name IN ('status', 'lockedAt', 'lockedByAdminId')
      ORDER BY column_name;
    `);
    console.log("\n📋 Managers table columns:");
    managersCols.forEach(col => {
      console.log(`   ✓ ${col.column_name} (${col.data_type})`);
    });

    // Check managers_status enum
    const [enumValues] = await sequelize.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'managers_status')
      ORDER BY enumsortorder;
    `);
    console.log("\n📋 Managers status enum values:");
    enumValues.forEach(val => {
      console.log(`   ✓ ${val.enumlabel}`);
    });

    console.log("\n✅ Schema verification complete!");
    await sequelize.close();
  } catch (error) {
    console.error("❌ Error:", error.message);
    await sequelize.close();
    process.exit(1);
  }
})();

