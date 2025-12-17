/**
 * Check acs table schema
 */

const sequelize = require("../config/database/postgresql");
const { QueryTypes } = require("sequelize");

async function checkSchema() {
  try {
    console.log("🔍 Checking acs table schema...\n");

    // Get all columns
    const columns = await sequelize.query(
      `
      SELECT 
        column_name, 
        data_type, 
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'acs'
      ORDER BY ordinal_position;
    `,
      { type: QueryTypes.SELECT }
    );

    console.log("Columns in acs table:");
    columns.forEach((col) => {
      console.log(
        `  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`
      );
    });

    // Check for venueId and organizationId
    console.log("\nChecking for foreign key columns:");
    const hasVenueId = columns.some((c) => c.column_name === "venueId");
    const hasOrganizationId = columns.some(
      (c) => c.column_name === "organizationId"
    );
    console.log(`  - venueId: ${hasVenueId ? "✅ EXISTS" : "❌ MISSING"}`);
    console.log(
      `  - organizationId: ${hasOrganizationId ? "✅ EXISTS" : "❌ MISSING"}`
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

checkSchema();
