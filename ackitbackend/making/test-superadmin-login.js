// Test SuperAdmin Login
require("dotenv").config();
const bcrypt = require("bcryptjs");
const sequelize = require("../config/database/postgresql");
const SuperAdmin = require("../models/Roleaccess/superadmin");

async function testLogin() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    const email = "talhaabid400@gmail.com";
    const password = "superadmin123";

    console.log("🔍 Testing SuperAdmin Login:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}\n`);

    // Find SuperAdmin
    const superAdmin = await SuperAdmin.findOne({ where: { email } });

    if (!superAdmin) {
      console.log("❌ SuperAdmin not found!");
      return;
    }

    console.log("✅ SuperAdmin found:");
    console.log(`   ID: ${superAdmin.id}`);
    console.log(`   Name: ${superAdmin.name}`);
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Active: ${superAdmin.isActive}`);
    console.log(`   Password hash: ${superAdmin.password ? superAdmin.password.substring(0, 30) + '...' : 'null'}`);
    console.log(`   Password length: ${superAdmin.password ? superAdmin.password.length : 0}`);
    console.log(`   Is bcrypt hash?: ${superAdmin.password ? superAdmin.password.startsWith('$2') : false}\n`);

    // Test password
    console.log("🔐 Testing password verification...");
    const isValid = await bcrypt.compare(password, superAdmin.password);
    console.log(`   Password valid: ${isValid}\n`);

    if (!isValid) {
      console.log("❌ Password verification FAILED!");
      console.log("   Resetting password...\n");
      
      const newHash = await bcrypt.hash(password, 12);
      await superAdmin.update({ password: newHash });
      
      console.log("✅ Password reset!");
      console.log("   New hash: " + newHash.substring(0, 30) + '...\n');
      
      // Test again
      const isValidAfterReset = await bcrypt.compare(password, newHash);
      console.log(`   Password valid after reset: ${isValidAfterReset}`);
    } else {
      console.log("✅ Password verification SUCCESS!");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

testLogin();









