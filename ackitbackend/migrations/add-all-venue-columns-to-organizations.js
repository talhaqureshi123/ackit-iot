/**
 * Migration: Add all Venue model columns to organizations table
 *
 * This migration adds all missing columns needed by Venue model
 * to the organizations table.
 *
 * Run: node migrations/add-all-venue-columns-to-organizations.js
 */

const sequelize = require("../config/database/postgresql");
const { QueryTypes } = require("sequelize");

async function runMigration() {
  const transaction = await sequelize.transaction();

  try {
    console.log(
      "🔄 Starting migration: Add all Venue columns to organizations table...\n"
    );

    // List of columns to add (with IF NOT EXISTS check)
    const columns = [
      {
        name: "organizationSize",
        type: "VARCHAR(255)",
        nullable: false,
        default: "'Medium'",
      },
      { name: "managerId", type: "INTEGER", nullable: true },
      { name: "isLocked", type: "BOOLEAN", nullable: false, default: "false" },
      { name: "lockedByAdminId", type: "INTEGER", nullable: true },
      { name: "lockedAt", type: "TIMESTAMP", nullable: true },
      {
        name: "status",
        type: "VARCHAR(20)",
        nullable: false,
        default: "'active'",
        check: "status IN ('active', 'split')",
      },
      { name: "splitFromId", type: "INTEGER", nullable: true },
      { name: "splitIntoIds", type: "TEXT", nullable: true },
      { name: "splitAt", type: "TIMESTAMP", nullable: true },
      { name: "splitHistory", type: "TEXT", nullable: true },
      { name: "rejoinedIntoId", type: "INTEGER", nullable: true },
      { name: "rejoinedAt", type: "TIMESTAMP", nullable: true },
      { name: "rejoinHistory", type: "TEXT", nullable: true },
      { name: "temperature", type: "INTEGER", nullable: true, default: "16" },
      { name: "lasttemperaturechange", type: "TIMESTAMP", nullable: true },
      {
        name: "changedby",
        type: "VARCHAR(20)",
        nullable: true,
        check: "changedby IN ('admin', 'manager')",
      },
      {
        name: "totalEnergyConsumed",
        type: "DOUBLE PRECISION",
        nullable: false,
        default: "0",
      },
      { name: "lastEnergyCalculation", type: "TIMESTAMP", nullable: true },
      { name: "isVenueOn", type: "BOOLEAN", nullable: false, default: "false" },
      { name: "venuePowerChangedAt", type: "TIMESTAMP", nullable: true },
      { name: "venuePowerChangedBy", type: "VARCHAR(255)", nullable: true },
    ];

    // Add each column
    for (const col of columns) {
      try {
        console.log(`Adding column: ${col.name}...`);
        let sql = `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type}`;

        if (col.nullable === false) {
          sql += " NOT NULL";
        }

        if (col.default !== undefined) {
          sql += ` DEFAULT ${col.default}`;
        }

        await sequelize.query(sql, { transaction, type: QueryTypes.RAW });
        console.log(`✅ Column ${col.name} added\n`);
      } catch (error) {
        if (
          error.message.includes("already exists") ||
          error.message.includes("duplicate")
        ) {
          console.log(`⚠️  Column ${col.name} already exists, skipping...\n`);
        } else {
          throw error;
        }
      }
    }

    // Add foreign key constraints
    console.log("Adding foreign key constraints...");
    const foreignKeys = [
      {
        column: "managerId",
        table: "managers",
        name: "fk_organizations_managerId",
      },
      {
        column: "lockedByAdminId",
        table: "admins",
        name: "fk_organizations_lockedByAdminId",
      },
      {
        column: "splitFromId",
        table: "organizations",
        name: "fk_organizations_splitFromId",
      },
      {
        column: "rejoinedIntoId",
        table: "organizations",
        name: "fk_organizations_rejoinedIntoId",
      },
    ];

    for (const fk of foreignKeys) {
      try {
        await sequelize.query(
          `
          ALTER TABLE organizations 
          ADD CONSTRAINT ${fk.name} 
          FOREIGN KEY ("${fk.column}") 
          REFERENCES ${fk.table}(id) 
          ON DELETE SET NULL;
        `,
          { transaction, type: QueryTypes.RAW }
        );
        console.log(`✅ Foreign key ${fk.name} added\n`);
      } catch (error) {
        if (
          error.message.includes("already exists") ||
          error.message.includes("duplicate")
        ) {
          console.log(
            `⚠️  Foreign key ${fk.name} already exists, skipping...\n`
          );
        } else {
          console.log(
            `⚠️  Could not add foreign key ${fk.name}: ${error.message}\n`
          );
        }
      }
    }

    // Create indexes
    console.log("Creating indexes...");
    const indexes = [
      { columns: ["organizationId"], name: "idx_organizations_organizationId" },
      { columns: ["managerId"], name: "idx_organizations_managerId" },
      { columns: ["status"], name: "idx_organizations_status" },
    ];

    for (const idx of indexes) {
      try {
        await sequelize.query(
          `
          CREATE INDEX IF NOT EXISTS ${idx.name} 
          ON organizations(${idx.columns.map((c) => `"${c}"`).join(", ")});
        `,
          { transaction, type: QueryTypes.RAW }
        );
        console.log(`✅ Index ${idx.name} created\n`);
      } catch (error) {
        if (error.message.includes("already exists")) {
          console.log(`⚠️  Index ${idx.name} already exists, skipping...\n`);
        } else {
          console.log(
            `⚠️  Could not create index ${idx.name}: ${error.message}\n`
          );
        }
      }
    }

    await transaction.commit();
    console.log("✅ Migration completed successfully!");
    console.log("\n📝 Summary:");
    console.log("   - Added all Venue model columns to organizations table");
    console.log("   - Added foreign key constraints");
    console.log("   - Created indexes for better performance");
    console.log("\n✨ You can now test the application!");

    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Migration failed:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

runMigration();
