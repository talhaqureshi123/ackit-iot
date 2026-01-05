// Create Admin User: talhaqureshi987@gmail.com
// Usage: railway run node making/create-admin-talhaqureshi.js

// Load .env file only in non-production environments
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: "./config/environment/.env" });
}

const bcrypt = require("bcryptjs");
const sequelize = require("../config/database/postgresql");
const Admin = require("../models/Roleaccess/admin");

async function createAdmin() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established\n");

    const email = "talhaqureshi987@gmail.com";
    const password = process.env.ADMIN_PASSWORD || "admin123";
    const name = process.env.ADMIN_NAME || "Talha Qureshi";
    const saltRounds = 12;

    console.log("📋 Creating Admin User...\n");
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}`);
    console.log(`   Password: ${password}\n`);

    // Check if admin already exists
    let admin = await Admin.findOne({ where: { email: email } });

    if (admin) {
      console.log("⚠️  Admin already exists, updating password and status...");
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      await admin.update({ 
        password: hashedPassword, 
        status: "active",
        name: name
      });
      console.log("✅ Admin password and status updated");
    } else {
      console.log("➕ Creating new Admin...");
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      admin = await Admin.create({
        name: name,
        email: email,
        password: hashedPassword,
        status: "active",
        plan: "basic" // Default plan
      });
      console.log("✅ Admin created successfully");
    }

    console.log("\n📝 Admin Details:");
    console.log(`   ID: ${admin.id}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Status: ${admin.status}`);
    console.log(`   Plan: ${admin.plan || 'basic'}`);

    console.log("\n✅ Admin user setup completed!");
    console.log("\n💡 Login Credentials:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);

  } catch (error) {
    console.error("❌ Error creating admin:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log("\n🔌 Database connection closed");
  }
}

// Run the script
createAdmin();

