/**
 * Migration Script: Create plan_requests table
 * 
 * This migration creates the plan_requests table to support plan upgrade requests
 * from admins to superadmins.
 * 
 * Run: node migrations/create-plan-requests-table.js
 */

const sequelize = require("../config/database/postgresql");
const { QueryTypes } = require("sequelize");

async function runMigration() {
  const transaction = await sequelize.transaction();

  try {
    console.log("🔄 Starting migration: Create plan_requests table...\n");

    // Check if table already exists
    const checkTable = await sequelize.query(
      `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'plan_requests';
    `,
      { type: QueryTypes.SELECT }
    );

    if (checkTable.length > 0) {
      console.log("✅ Table 'plan_requests' already exists");
      await transaction.rollback();
      process.exit(0);
    }

    // Step 1: Create ENUM type for status if it doesn't exist
    console.log("Step 1: Creating status ENUM type...");
    await sequelize.query(
      `
      DO $$ BEGIN
        CREATE TYPE plan_request_status AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `,
      { transaction, type: QueryTypes.RAW }
    );
    console.log("✅ Status ENUM type created\n");

    // Step 2: Create plan_requests table
    console.log("Step 2: Creating plan_requests table...");
    await sequelize.query(
      `
      CREATE TABLE plan_requests (
        id SERIAL PRIMARY KEY,
        "adminId" INTEGER NOT NULL,
        "currentPlan" VARCHAR(255) NOT NULL DEFAULT 'basic',
        "requestedPlan" VARCHAR(255) NOT NULL,
        message TEXT,
        status plan_request_status DEFAULT 'pending',
        "rejectionReason" TEXT,
        "reviewedBy" INTEGER,
        "reviewedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_plan_requests_admin 
          FOREIGN KEY ("adminId") 
          REFERENCES admins(id) 
          ON DELETE CASCADE 
          ON UPDATE CASCADE,
        CONSTRAINT fk_plan_requests_reviewed_by 
          FOREIGN KEY ("reviewedBy") 
          REFERENCES superadmins(id) 
          ON DELETE SET NULL 
          ON UPDATE CASCADE
      );
    `,
      { transaction, type: QueryTypes.RAW }
    );
    console.log("✅ plan_requests table created\n");

    // Step 3: Create indexes for better query performance
    console.log("Step 3: Creating indexes...");
    await sequelize.query(
      `
      CREATE INDEX idx_plan_requests_admin_id ON plan_requests("adminId");
      CREATE INDEX idx_plan_requests_status ON plan_requests(status);
      CREATE INDEX idx_plan_requests_created_at ON plan_requests("createdAt");
    `,
      { transaction, type: QueryTypes.RAW }
    );
    console.log("✅ Indexes created\n");

    await transaction.commit();
    console.log("✅ Migration completed successfully!");
    console.log("\n📝 Summary:");
    console.log("   - Created plan_request_status ENUM type");
    console.log("   - Created plan_requests table with all columns");
    console.log("   - Added foreign key constraints (adminId -> admins, reviewedBy -> superadmins)");
    console.log("   - Created indexes for better performance");
    console.log("\n✨ Plan requests feature is now ready!");

    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Migration failed:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

// Run migration
runMigration();





