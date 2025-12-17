/**
 * Check database schema for organizations table
 */

const sequelize = require("../config/database/postgresql");
const { QueryTypes } = require("sequelize");

async function checkSchema() {
  try {
    console.log("🔍 Checking organizations table schema...\n");

    // Get all columns
    const columns = await sequelize.query(
      `
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'organizations'
      ORDER BY ordinal_position;
    `,
      { type: QueryTypes.SELECT }
    );

    console.log("Columns in organizations table:");
    if (Array.isArray(columns) && columns.length > 0) {
      columns.forEach((col) => {
        console.log(
          `  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`
        );
      });
      console.log(`\nTotal columns: ${columns.length}`);
    } else {
      console.log("No columns found or query returned unexpected format");
      console.log("Result:", columns);
    }

    // Check for specific columns we added
    console.log("\nChecking for specific columns:");
    const checkColumns = [
      "organizationSize",
      "organizationId",
      "isVenueOn",
      "managerId",
      "temperature",
    ];
    for (const colName of checkColumns) {
      const exists = columns.some((c) => c.column_name === colName);
      console.log(`  - ${colName}: ${exists ? "✅ EXISTS" : "❌ MISSING"}`);
    }

    // Get constraints
    const [constraints] = await sequelize.query(
      `
      SELECT 
        constraint_name,
        constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'organizations';
    `,
      { type: QueryTypes.SELECT }
    );

    console.log("\nConstraints:");
    console.table(constraints);

    // Check for venueId specifically
    const [venueIdCheck] = await sequelize.query(
      `
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'organizations' AND column_name = 'venueId';
    `,
      { type: QueryTypes.SELECT }
    );

    if (venueIdCheck && venueIdCheck.length > 0) {
      console.log("\n⚠️  Found venueId column:", venueIdCheck);
    } else {
      console.log("\n✅ No venueId column found");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

checkSchema();
