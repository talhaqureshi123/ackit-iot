// Check all users in database
require("dotenv").config();
const sequelize = require("../config/database/postgresql");
const SuperAdmin = require("../models/Roleaccess/superadmin");
const Admin = require("../models/Roleaccess/admin");
const Manager = require("../models/Roleaccess/manager");

async function checkUsers() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    // Check SuperAdmins
    const superAdmins = await SuperAdmin.findAll({
      attributes: ['id', 'name', 'email', 'isActive']
    });
    console.log("📋 SuperAdmins:");
    if (superAdmins.length === 0) {
      console.log("  ❌ No SuperAdmins found");
    } else {
      superAdmins.forEach(sa => {
        console.log(`  ✅ ID: ${sa.id}, Email: ${sa.email}, Name: ${sa.name}, Active: ${sa.isActive}`);
      });
    }

    // Check Admins
    const admins = await Admin.findAll({
      attributes: ['id', 'name', 'email', 'status'],
      limit: 5
    });
    console.log("\n📋 Admins (first 5):");
    if (admins.length === 0) {
      console.log("  ❌ No Admins found");
    } else {
      admins.forEach(a => {
        console.log(`  ✅ ID: ${a.id}, Email: ${a.email}, Name: ${a.name}, Status: ${a.status}`);
      });
    }

    // Check Managers
    const managers = await Manager.findAll({
      attributes: ['id', 'name', 'email', 'status'],
      limit: 5
    });
    console.log("\n📋 Managers (first 5):");
    if (managers.length === 0) {
      console.log("  ❌ No Managers found");
    } else {
      managers.forEach(m => {
        console.log(`  ✅ ID: ${m.id}, Email: ${m.email}, Name: ${m.name}, Status: ${m.status}`);
      });
    }

    console.log("\n💡 Login Credentials:");
    console.log("  SuperAdmin: Use the email shown above");
    console.log("  Password: superadmin123 (or check .env file)");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await sequelize.close();
  }
}

checkUsers();






