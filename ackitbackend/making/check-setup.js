// Setup Verification Script
require("dotenv").config();
const sequelize = require("./config/database/postgresql");

// Import all models
const SuperAdmin = require("./models/Roleaccess/superadmin");
const Admin = require("./models/Roleaccess/admin");
const Manager = require("./models/Roleaccess/manager");
const Venue = require("./models/Venue/venue");
const Organization = require("./models/Organization/organization");
const AC = require("./models/AC/ac");
const ActivityLog = require("./models/Activity log/activityLog");
const SystemState = require("./models/SystemState/systemState");

async function checkSetup() {
  console.log("🔍 Checking Super Admin setup...");

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log("✅ Database connection: OK");

    // Test model imports
    console.log("✅ Models imported successfully");

    // Check if tables exist
    await sequelize.sync({ force: false });
    console.log("✅ Database tables: OK");

    // Count records
    const superAdminCount = await SuperAdmin.count();
    const adminCount = await Admin.count();
    const managerCount = await Manager.count();
    const orgCount = await Organization.count();
    const acCount = await AC.count();
    const logCount = await ActivityLog.count();

    console.log("\n📊 Database Records:");
    console.log(`👤 Super Admins: ${superAdminCount}`);
    console.log(`👥 Admins: ${adminCount}`);
    console.log(`👨‍💼 Managers: ${managerCount}`);
    console.log(`🏢 Organizations: ${orgCount}`);
    console.log(`❄️ ACs: ${acCount}`);
    console.log(`📋 Activity Logs: ${logCount}`);

    // Check Super Admin
    if (superAdminCount > 0) {
      const superAdmin = await SuperAdmin.findOne();
      console.log("\n🔐 Super Admin Found:");
      console.log(`📧 Email: ${superAdmin.email}`);
      console.log(`👤 Name: ${superAdmin.name}`);
      console.log(`🆔 ID: ${superAdmin.id}`);
      console.log(`📅 Created: ${superAdmin.createdAt}`);
    } else {
      console.log(
        "\n⚠️  No Super Admin found. Run create-superadmin.js first!"
      );
    }

    console.log("\n🎯 Next Steps:");
    if (superAdminCount === 0) {
      console.log("1. Run: node create-superadmin.js");
    } else if (adminCount === 0) {
      console.log("1. Run: node create-test-data.js");
    } else {
      console.log("1. Start server: npm run dev");
      console.log("2. Test with Postman using provided JSON data");
    }
  } catch (error) {
    console.error("❌ Setup check failed:", error.message);

    if (error.name === "SequelizeConnectionError") {
      console.log("\n🔧 Database Issues:");
      console.log("1. Check PostgreSQL is running");
      console.log("2. Verify .env file settings");
      console.log("3. Ensure database exists");
    }

    if (error.name === "SequelizeValidationError") {
      console.log("\n🔧 Model Issues:");
      console.log("Check model definitions");
    }
  } finally {
    await sequelize.close();
  }
}

// Run the check
checkSetup();
