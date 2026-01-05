// Check Manager Login Credentials
require("dotenv").config();
const bcrypt = require("bcryptjs");
const sequelize = require("../config/database/postgresql");
const Manager = require("../models/Roleaccess/manager");
const Admin = require("../models/Roleaccess/admin");

async function checkManagerLogin() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    // Check if the email exists as Admin
    const testEmail = "usman.abid00321@gmail.com";
    console.log(`🔍 Checking email: ${testEmail}\n`);

    // Check in Admin table
    const admin = await Admin.findOne({ where: { email: testEmail } });
    if (admin) {
      console.log("❌ This email is registered as ADMIN, not MANAGER!");
      console.log(`   Admin ID: ${admin.id}`);
      console.log(`   Admin Name: ${admin.name}`);
      console.log(`   Admin Status: ${admin.status}\n`);
    }

    // Check in Manager table
    const manager = await Manager.findOne({ where: { email: testEmail } });
    if (manager) {
      console.log("✅ This email is registered as MANAGER!");
      console.log(`   Manager ID: ${manager.id}`);
      console.log(`   Manager Name: ${manager.name}`);
      console.log(`   Manager Status: ${manager.status}\n`);
    } else {
      console.log("❌ This email is NOT registered as MANAGER!\n");
    }

    // List all managers
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 All Managers in Database:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const allManagers = await Manager.findAll({
      attributes: ['id', 'name', 'email', 'status', 'adminId'],
      order: [['createdAt', 'DESC']]
    });
    
    if (allManagers.length === 0) {
      console.log("   ❌ No managers found in database!");
      console.log("   💡 You need to create a manager first.\n");
    } else {
      allManagers.forEach(m => {
        console.log(`   ✅ ID: ${m.id}, Email: ${m.email}, Name: ${m.name}, Status: ${m.status}`);
        if (m.adminId) {
          console.log(`      └─ Admin ID: ${m.adminId}`);
        }
      });
      console.log("\n💡 Use one of these manager emails to login as manager!");
    }

    // List all admins
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 All Admins in Database:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const allAdmins = await Admin.findAll({
      attributes: ['id', 'name', 'email', 'status'],
      order: [['createdAt', 'DESC']]
    });
    
    allAdmins.forEach(a => {
      console.log(`   ✅ ID: ${a.id}, Email: ${a.email}, Name: ${a.name}, Status: ${a.status}`);
    });
    console.log("\n💡 Use one of these admin emails to login as admin!");

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Full error:", error);
  } finally {
    await sequelize.close();
  }
}

checkManagerLogin();

