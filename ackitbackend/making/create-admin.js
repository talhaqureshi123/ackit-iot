// Admin Creation Script
require("dotenv").config();
const bcrypt = require("bcryptjs");
const sequelize = require("../config/database/postgresql");

// Import models
const Admin = require("../models/Roleaccess/admin");

async function createAdmin() {
  console.log("🚀 Creating Admin...");

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    // Recreate schema to match models since DB is fresh
    await sequelize.sync({ force: true });
    console.log("✅ Database tables synchronized");

    // Check if Admin already exists
    const adminEmail =
      process.env.SEED_ADMIN_EMAIL || "usman.abid00321@gmail.com";
    const existingAdmin = await Admin.findOne({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      console.log("⚠️  Admin already exists!");
      console.log("📧 Email:", existingAdmin.email);
      console.log("🆔 ID:", existingAdmin.id);
      console.log("📅 Created:", existingAdmin.createdAt);
      return;
    }

    // Hash password
    const saltRounds = 12;
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin123";
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
    console.log("🔐 Password hashed successfully");

    // Create Admin
    const admin = await Admin.create({
      name: process.env.SEED_ADMIN_NAME || "System Admin",
      email: adminEmail,
      password: hashedPassword,
      status: "active",
    });

    console.log("🎉 Admin created successfully!");
    console.log("📧 Email:", admin.email);
    console.log("🔑 Password:", adminPassword);
    console.log("🆔 ID:", admin.id);
    console.log("📅 Created:", admin.createdAt);
  } catch (error) {
    console.error("❌ Error creating Admin:", error.message);
    console.error("Full error:", error);
  } finally {
    await sequelize.close();
    console.log("🔌 Database connection closed");
  }
}

// Run the script
createAdmin();
