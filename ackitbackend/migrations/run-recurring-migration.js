/**
 * Migration Runner: Add recurring fields to events table
 *
 * Run: node migrations/run-recurring-migration.js
 */

const sequelize = require("../config/database/postgresql");
const { QueryTypes } = require("sequelize");

async function runMigration() {
  const transaction = await sequelize.transaction();

  try {
    console.log(
      "🔄 Starting migration: Add recurring fields to events table...\n"
    );

    // Step 1: Create enum type for recurringType (check first if exists)
    console.log("Step 1: Creating recurringType enum...");
    const enumCheck = await sequelize.query(
      `
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_events_recurringType'
      ) as exists;
    `,
      { transaction, type: QueryTypes.SELECT }
    );

    if (!enumCheck[0] || !enumCheck[0].exists) {
      await sequelize.query(
        `
        CREATE TYPE "enum_events_recurringType" AS ENUM('weekly');
      `,
        { transaction, type: QueryTypes.RAW }
      );
      console.log("✅ recurringType enum created\n");
    } else {
      console.log("⚠️  Enum type already exists, skipping...\n");
    }

    // Step 2: Add isRecurring column
    console.log("Step 2: Adding isRecurring column...");
    await sequelize.query(
      `
      ALTER TABLE events 
      ADD COLUMN IF NOT EXISTS "isRecurring" BOOLEAN NOT NULL DEFAULT false;
    `,
      { transaction, type: QueryTypes.RAW }
    );
    console.log("✅ isRecurring column added\n");

    // Step 3: Add recurringType column
    console.log("Step 3: Adding recurringType column...");
    await sequelize.query(
      `
      ALTER TABLE events 
      ADD COLUMN IF NOT EXISTS "recurringType" "enum_events_recurringType";
    `,
      { transaction, type: QueryTypes.RAW }
    );
    console.log("✅ recurringType column added\n");

    // Step 4: Add daysOfWeek column (JSONB)
    console.log("Step 4: Adding daysOfWeek column...");
    await sequelize.query(
      `
      ALTER TABLE events 
      ADD COLUMN IF NOT EXISTS "daysOfWeek" JSONB;
    `,
      { transaction, type: QueryTypes.RAW }
    );
    console.log("✅ daysOfWeek column added\n");

    // Step 5: Add recurringStartDate column
    console.log("Step 5: Adding recurringStartDate column...");
    await sequelize.query(
      `
      ALTER TABLE events 
      ADD COLUMN IF NOT EXISTS "recurringStartDate" DATE;
    `,
      { transaction, type: QueryTypes.RAW }
    );
    console.log("✅ recurringStartDate column added\n");

    // Step 6: Add recurringEndDate column
    console.log("Step 6: Adding recurringEndDate column...");
    await sequelize.query(
      `
      ALTER TABLE events 
      ADD COLUMN IF NOT EXISTS "recurringEndDate" DATE;
    `,
      { transaction, type: QueryTypes.RAW }
    );
    console.log("✅ recurringEndDate column added\n");

    // Step 7: Add timeStart column
    console.log("Step 7: Adding timeStart column...");
    await sequelize.query(
      `
      ALTER TABLE events 
      ADD COLUMN IF NOT EXISTS "timeStart" TIME;
    `,
      { transaction, type: QueryTypes.RAW }
    );
    console.log("✅ timeStart column added\n");

    // Step 8: Add timeEnd column
    console.log("Step 8: Adding timeEnd column...");
    await sequelize.query(
      `
      ALTER TABLE events 
      ADD COLUMN IF NOT EXISTS "timeEnd" TIME;
    `,
      { transaction, type: QueryTypes.RAW }
    );
    console.log("✅ timeEnd column added\n");

    // Step 9: Add parentRecurringEventId column
    console.log("Step 9: Adding parentRecurringEventId column...");
    await sequelize.query(
      `
      ALTER TABLE events 
      ADD COLUMN IF NOT EXISTS "parentRecurringEventId" INTEGER;
    `,
      { transaction, type: QueryTypes.RAW }
    );
    console.log("✅ parentRecurringEventId column added\n");

    // Step 10: Add foreign key constraint (check first if exists - case insensitive)
    console.log("Step 10: Adding foreign key constraint...");
    const fkCheck = await sequelize.query(
      `
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE LOWER(conname) = LOWER('fk_events_parentRecurringEventId')
        AND conrelid = 'events'::regclass
      ) as exists;
    `,
      { transaction, type: QueryTypes.SELECT }
    );

    if (!fkCheck[0] || !fkCheck[0].exists) {
      await sequelize.query(
        `
        ALTER TABLE events 
        ADD CONSTRAINT fk_events_parentRecurringEventId 
        FOREIGN KEY ("parentRecurringEventId") 
        REFERENCES events(id) 
        ON UPDATE CASCADE 
        ON DELETE CASCADE;
      `,
        { transaction, type: QueryTypes.RAW }
      );
      console.log("✅ Foreign key constraint added\n");
    } else {
      console.log("⚠️  Foreign key constraint already exists, skipping...\n");
    }

    // Step 11: Create indexes (check first if exist - case insensitive)
    console.log("Step 11: Creating indexes...");

    const index1Check = await sequelize.query(
      `
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE LOWER(indexname) = LOWER('idx_events_isRecurring')
        AND tablename = 'events'
      ) as exists;
    `,
      { transaction, type: QueryTypes.SELECT }
    );

    if (!index1Check[0] || !index1Check[0].exists) {
      await sequelize.query(
        `
        CREATE INDEX idx_events_isRecurring 
        ON events("isRecurring");
      `,
        { transaction, type: QueryTypes.RAW }
      );
      console.log("✅ Index idx_events_isRecurring created\n");
    } else {
      console.log(
        "⚠️  Index idx_events_isRecurring already exists, skipping...\n"
      );
    }

    const index2Check = await sequelize.query(
      `
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE LOWER(indexname) = LOWER('idx_events_parentRecurringEventId')
        AND tablename = 'events'
      ) as exists;
    `,
      { transaction, type: QueryTypes.SELECT }
    );

    if (!index2Check[0] || !index2Check[0].exists) {
      await sequelize.query(
        `
        CREATE INDEX idx_events_parentRecurringEventId 
        ON events("parentRecurringEventId");
      `,
        { transaction, type: QueryTypes.RAW }
      );
      console.log("✅ Index idx_events_parentRecurringEventId created\n");
    } else {
      console.log(
        "⚠️  Index idx_events_parentRecurringEventId already exists, skipping...\n"
      );
    }

    const index3Check = await sequelize.query(
      `
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE LOWER(indexname) = LOWER('idx_events_recurringDates')
        AND tablename = 'events'
      ) as exists;
    `,
      { transaction, type: QueryTypes.SELECT }
    );

    if (!index3Check[0] || !index3Check[0].exists) {
      await sequelize.query(
        `
        CREATE INDEX idx_events_recurringDates 
        ON events("recurringStartDate", "recurringEndDate");
      `,
        { transaction, type: QueryTypes.RAW }
      );
      console.log("✅ Index idx_events_recurringDates created\n");
    } else {
      console.log(
        "⚠️  Index idx_events_recurringDates already exists, skipping...\n"
      );
    }

    await transaction.commit();
    console.log("✅ Migration completed successfully!");
    console.log("\n📝 Summary:");
    console.log("   - Added isRecurring, recurringType, daysOfWeek columns");
    console.log("   - Added recurringStartDate, recurringEndDate columns");
    console.log("   - Added timeStart, timeEnd columns");
    console.log("   - Added parentRecurringEventId column with foreign key");
    console.log("   - Created indexes for better performance");
    console.log("\n✨ Recurring events feature is now ready to use!");

    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Migration failed:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

runMigration();
