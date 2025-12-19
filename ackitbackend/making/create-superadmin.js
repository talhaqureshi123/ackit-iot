// Super Admin Creation Script
require("dotenv").config();
const bcrypt = require("bcryptjs");
const sequelize = require("../config/database/postgresql");

// Import models
const SuperAdmin = require("../models/Roleaccess/superadmin");

async function createSuperAdmin() {
  console.log("🚀 Creating Super Admin...");

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    // Sync schema (create tables if they don't exist, don't drop existing)
    // Use force: false to preserve existing data
    await sequelize.sync({ force: false, alter: false });
    console.log("✅ Database tables synchronized");

    // Check if Super Admin already exists
    const superAdminEmail =
      process.env.SEED_SUPERADMIN_EMAIL || "talhaabid400@gmail.com";
    const existingSuperAdmin = await SuperAdmin.findOne({
      where: { email: superAdminEmail },
    });

    if (existingSuperAdmin) {
      console.log("⚠️  Super Admin already exists!");
      console.log("📧 Email:", existingSuperAdmin.email);
      console.log("🆔 ID:", existingSuperAdmin.id);
      console.log("📅 Created:", existingSuperAdmin.createdAt);
      return;
    }

    // Hash password
    const saltRounds = 12;
    const superAdminPassword =
      process.env.SEED_SUPERADMIN_PASSWORD || "superadmin123";
    const hashedPassword = await bcrypt.hash(superAdminPassword, saltRounds);
    console.log("🔐 Password hashed successfully");

    // Create Super Admin
    const superAdmin = await SuperAdmin.create({
      name: process.env.SEED_SUPERADMIN_NAME || "IoTify Super Admin",
      email: superAdminEmail,
      password: hashedPassword,
      role: "superadmin",
      isActive: true,
      lastLogin: null,
    });

    console.log("🎉 Super Admin created successfully!");
    console.log("📧 Email:", superAdmin.email);
    console.log("🔑 Password:", superAdminPassword);
    console.log("🆔 ID:", superAdmin.id);
    console.log("📅 Created:", superAdmin.createdAt);
  } catch (error) {
    console.error("❌ Error creating Super Admin:", error.message);

    if (error.name === "SequelizeConnectionError") {
      console.log("\n🔧 Database Connection Issues:");
      console.log("1. Check if PostgreSQL is running");
      console.log("2. Verify database credentials in .env file");
      console.log("3. Ensure database 'ac-kit' exists");
    }

    if (error.name === "SequelizeValidationError") {
      console.log("\n🔧 Validation Issues:");
      console.log("Check model definitions and field requirements");
    }
  } finally {
    // Close database connection
    await sequelize.close();
    console.log("🔌 Database connection closed");
  }
}

// Run the script
createSuperAdmin();
