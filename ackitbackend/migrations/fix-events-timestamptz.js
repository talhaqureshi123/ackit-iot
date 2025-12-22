/**
 * Migration: Fix Events Table - Convert timestamp to timestamptz
 *
 * This migration converts startTime and endTime columns from timestamp to timestamptz
 * to properly handle UTC timezone storage.
 *
 * IMPORTANT: Backend already sends UTC times (e.g., "2025-12-21T12:25:00.000Z")
 * So we use 'UTC' timezone in the migration, not 'Asia/Karachi'
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;

    console.log(
      "🔄 Starting migration: Convert events timestamp columns to timestamptz..."
    );

    try {
      // Step 1: Check current column types
      const [results] = await queryInterface.sequelize.query(`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'events' 
        AND column_name IN ('startTime', 'endTime', 'originalEndTime', 'startedAt', 'completedAt', 'stoppedAt', 'disabledAt')
        ORDER BY column_name;
      `);

      console.log("📊 Current column types:", results);

      // Step 2: Convert startTime to TIMESTAMPTZ
      // CRITICAL: Backend already sends UTC times (e.g., "2025-12-21T12:25:00.000Z")
      // So we must use 'UTC' timezone, not 'Asia/Karachi'
      console.log("🔄 Converting startTime to TIMESTAMPTZ...");
      await queryInterface.sequelize.query(`
         ALTER TABLE events
         ALTER COLUMN "startTime"
         TYPE TIMESTAMPTZ
         USING "startTime" AT TIME ZONE 'UTC';
       `);
      console.log("✅ startTime converted to TIMESTAMPTZ");

      // Step 3: Convert endTime to TIMESTAMPTZ
      console.log("🔄 Converting endTime to TIMESTAMPTZ...");
      await queryInterface.sequelize.query(`
         ALTER TABLE events
         ALTER COLUMN "endTime"
         TYPE TIMESTAMPTZ
         USING "endTime" AT TIME ZONE 'UTC';
       `);
      console.log("✅ endTime converted to TIMESTAMPTZ");

      // Step 4: Convert originalEndTime to TIMESTAMPTZ (if exists)
      const hasOriginalEndTime = results.some(
        (r) => r.column_name === "originalEndTime"
      );
      if (hasOriginalEndTime) {
        console.log("🔄 Converting originalEndTime to TIMESTAMPTZ...");
        await queryInterface.sequelize.query(`
           ALTER TABLE events
           ALTER COLUMN "originalEndTime"
           TYPE TIMESTAMPTZ
           USING "originalEndTime" AT TIME ZONE 'UTC';
         `);
        console.log("✅ originalEndTime converted to TIMESTAMPTZ");
      }

      // Step 5: Convert other timestamp columns to TIMESTAMPTZ (if they exist)
      const timestampColumns = [
        "startedAt",
        "completedAt",
        "stoppedAt",
        "disabledAt",
      ];
      for (const col of timestampColumns) {
        const exists = results.some((r) => r.column_name === col);
        if (exists) {
          const isTimestamp =
            results.find((r) => r.column_name === col)?.udt_name ===
            "timestamp";
          if (isTimestamp) {
            console.log(`🔄 Converting ${col} to TIMESTAMPTZ...`);
            await queryInterface.sequelize.query(`
               ALTER TABLE events
               ALTER COLUMN "${col}"
               TYPE TIMESTAMPTZ
               USING "${col}" AT TIME ZONE 'UTC';
             `);
            console.log(`✅ ${col} converted to TIMESTAMPTZ`);
          }
        }
      }

      // Step 6: Verify the changes
      const [verifyResults] = await queryInterface.sequelize.query(`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'events' 
        AND column_name IN ('startTime', 'endTime', 'originalEndTime', 'startedAt', 'completedAt', 'stoppedAt', 'disabledAt')
        ORDER BY column_name;
      `);

      console.log("✅ Migration completed! New column types:", verifyResults);
      console.log(
        "📝 All timestamp columns are now TIMESTAMPTZ (with timezone)"
      );
    } catch (error) {
      console.error("❌ Migration failed:", error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Rollback: Convert back to timestamp (without timezone)
    // WARNING: This will lose timezone information
    console.log("⚠️ Rolling back: Converting timestamptz back to timestamp...");

    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE events
        ALTER COLUMN "startTime"
        TYPE TIMESTAMP
        USING "startTime" AT TIME ZONE 'UTC';
      `);

      await queryInterface.sequelize.query(`
        ALTER TABLE events
        ALTER COLUMN "endTime"
        TYPE TIMESTAMP
        USING "endTime" AT TIME ZONE 'UTC';
      `);

      console.log("✅ Rollback completed (timestamp without timezone)");
    } catch (error) {
      console.error("❌ Rollback failed:", error);
      throw error;
    }
  },
};
