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
    // alter: true - adds missing columns without dropping existing data
    // force: false - doesn't drop existing tables
    console.log("📊 Creating tables from models...");
    await sequelize.sync({ alter: false, force: false });
    
    console.log("\n✅ Database schema initialized successfully!");
    console.log("\n📝 Tables created:");
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
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Database initialization failed:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

initDatabase();

