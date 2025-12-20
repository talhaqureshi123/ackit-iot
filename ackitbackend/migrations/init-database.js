/**
 * Initialize Database Schema
 * Creates all tables based on Sequelize models
 *
 * Run: node migrations/init-database.js
 * Or: railway run node migrations/init-database.js
 */

const sequelize = require("../config/database/postgresql");
const models = require("../models");

async function initDatabase() {
  try {
    console.log("🔄 Initializing database schema...\n");

    // Test connection first
    await sequelize.authenticate();
    console.log("✅ Database connection established.\n");

    // Sync all models (create tables)
    // alter: false - doesn't alter existing tables (safer for production)
    // force: false - doesn't drop existing tables
    console.log("📊 Syncing database schema...");

    try {
      await sequelize.sync({ alter: false, force: false });
      console.log("✅ Database schema synced successfully!");
    } catch (syncError) {
      // Handle "already exists" errors gracefully (indexes, constraints, etc.)
      if (
        syncError.name === "SequelizeDatabaseError" &&
        (syncError.parent?.code === "42P07" || // duplicate_table, duplicate_index
          syncError.message?.includes("already exists") ||
          syncError.parent?.message?.includes("already exists"))
      ) {
        console.log("⚠️ Some database objects already exist (this is OK):");
        console.log("   ", syncError.parent?.message || syncError.message);
        console.log("✅ Database schema is up to date!");
      } else {
        // Re-throw if it's a different error
        throw syncError;
      }
    }

    console.log("\n📝 Database tables:");
    console.log("   - admins");
    console.log("   - managers");
    console.log("   - superadmins");
    console.log("   - organizations");
    console.log("   - venues");
    console.log("   - acs");
    console.log("   - events");
    console.log("   - activityLogs");
    console.log("   - systemStates");
    console.log("   - session (for express-session)");
    console.log("\n✨ Database is ready to use!");

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Database initialization failed:", error.message);
    console.error("\nFull error:", error);
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
}

initDatabase();
