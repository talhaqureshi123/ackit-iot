// Admin Creation Script for Talha
// Run: node making/create-admin-talha.js

require("dotenv").config();
const bcrypt = require("bcryptjs");
const sequelize = require("../config/database/postgresql");

// Import models
const Admin = require("../models/Roleaccess/admin");

async function createAdmin() {
  console.log("🚀 Creating Admin for Talha...\n");

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log("✅ Database connection established\n");

    // Admin details
    const adminEmail = "talhaqureshi00123@gmail.com";
    const adminPassword = "admin2@123";
    const adminName = "Talha Qureshi";

    // Check if Admin already exists
    const existingAdmin = await Admin.findOne({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      console.log("⚠️  Admin already exists!");
      console.log("📧 Email:", existingAdmin.email);
      console.log("🆔 ID:", existingAdmin.id);
      console.log("📅 Created:", existingAdmin.createdAt);
      console.log("📊 Status:", existingAdmin.status);
      return;
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
    console.log("🔐 Password hashed successfully\n");

    // Create Admin
    const admin = await Admin.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      status: "active",
    });

    console.log("🎉 Admin created successfully!\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Email:", admin.email);
    console.log("🔑 Password:", adminPassword);
    console.log("👤 Name:", admin.name);
    console.log("🆔 ID:", admin.id);
    console.log("📊 Status:", admin.status);
    console.log("📅 Created:", admin.createdAt);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error) {
    console.error("❌ Error creating Admin:", error.message);
    if (error.errors) {
      error.errors.forEach((err) => {
        console.error(`   - ${err.path}: ${err.message}`);
      });
    }
    console.error("\nFull error:", error);
  } finally {
    await sequelize.close();
    console.log("🔌 Database connection closed");
  }
}

// Run the script
createAdmin();


