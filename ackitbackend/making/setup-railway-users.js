// Setup Users for Railway Production
// Run this script on Railway to create initial users
// Usage: railway run node ackitbackend/making/setup-railway-users.js

// Load .env file only in non-production environments (Railway uses environment variables directly)
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: "./config/environment/.env" });
}

const bcrypt = require("bcryptjs");
const sequelize = require("../config/database/postgresql");

// Import models
const SuperAdmin = require("../models/Roleaccess/superadmin");
const Admin = require("../models/Roleaccess/admin");
const Manager = require("../models/Roleaccess/manager");

async function setupUsers() {
  console.log("🚀 Setting up users for Railway Production...\n");

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log("✅ Database connection established\n");

    // Sync schema (create tables if they don't exist, don't drop existing)
    await sequelize.sync({ force: false, alter: false });
    console.log("✅ Database tables synchronized\n");

    const saltRounds = 12;

    // ============================================
    // 1. Create/Update SuperAdmin
    // ============================================
    console.log("📋 Step 1: Setting up SuperAdmin...");
    const superAdminEmail = process.env.SEED_SUPERADMIN_EMAIL || "talhaabid400@gmail.com";
    const superAdminPassword = process.env.SEED_SUPERADMIN_PASSWORD || "superadmin123";
    const superAdminName = process.env.SEED_SUPERADMIN_NAME || "IoTify Super Admin";

    let superAdmin = await SuperAdmin.findOne({ where: { email: superAdminEmail } });

    if (superAdmin) {
      console.log("⚠️  SuperAdmin already exists, updating password...");
      const hashedPassword = await bcrypt.hash(superAdminPassword, saltRounds);
      await superAdmin.update({ password: hashedPassword, isActive: true });
      console.log("✅ SuperAdmin password updated");
    } else {
      console.log("➕ Creating new SuperAdmin...");
      const hashedPassword = await bcrypt.hash(superAdminPassword, saltRounds);
      superAdmin = await SuperAdmin.create({
        name: superAdminName,
        email: superAdminEmail,
        password: hashedPassword,
        role: "superadmin",
        isActive: true,
      });
      console.log("✅ SuperAdmin created");
    }
    console.log(`   📧 Email: ${superAdminEmail}`);
    console.log(`   🔑 Password: ${superAdminPassword}\n`);

    // ============================================
    // 2. Create/Update Admin
    // ============================================
    console.log("📋 Step 2: Setting up Admin...");
    const adminEmail = process.env.SEED_ADMIN_EMAIL || "usman.abid00321@gmail.com";
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin123";
    const adminName = process.env.SEED_ADMIN_NAME || "System Admin";

    let admin = await Admin.findOne({ where: { email: adminEmail } });

    if (admin) {
      console.log("⚠️  Admin already exists, updating password...");
      const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
      await admin.update({ password: hashedPassword, status: "active" });
      console.log("✅ Admin password updated");
    } else {
      console.log("➕ Creating new Admin...");
      const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
      admin = await Admin.create({
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        status: "active",
      });
      console.log("✅ Admin created");
    }
    console.log(`   📧 Email: ${adminEmail}`);
    console.log(`   🔑 Password: ${adminPassword}\n`);

    // ============================================
    // 3. List all existing users
    // ============================================
    console.log("📋 Step 3: Listing all existing users...\n");

    const allSuperAdmins = await SuperAdmin.findAll({
      attributes: ['id', 'email', 'name', 'isActive']
    });
    console.log(`📋 SuperAdmins (${allSuperAdmins.length}):`);
    allSuperAdmins.forEach(sa => {
      console.log(`   ✅ ${sa.email} (${sa.name}, Active: ${sa.isActive})`);
    });

    const allAdmins = await Admin.findAll({
      attributes: ['id', 'email', 'name', 'status']
    });
    console.log(`\n📋 Admins (${allAdmins.length}):`);
    allAdmins.forEach(a => {
      console.log(`   ✅ ${a.email} (${a.name}, Status: ${a.status})`);
    });

    const allManagers = await Manager.findAll({
      attributes: ['id', 'email', 'name', 'status']
    });
    console.log(`\n📋 Managers (${allManagers.length}):`);
    allManagers.forEach(m => {
      console.log(`   ✅ ${m.email} (${m.name}, Status: ${m.status})`);
    });

    console.log("\n✅ User setup completed successfully!");
    console.log("\n💡 Login Credentials:");
    console.log(`   SuperAdmin: ${superAdminEmail} / ${superAdminPassword}`);
    console.log(`   Admin: ${adminEmail} / ${adminPassword}`);

  } catch (error) {
    console.error("❌ Error setting up users:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log("\n🔌 Database connection closed");
  }
}

// Run the script
setupUsers();

