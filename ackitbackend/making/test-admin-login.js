// Test Admin Login
require("dotenv").config();
const bcrypt = require("bcryptjs");
const sequelize = require("../config/database/postgresql");
const Admin = require("../models/Roleaccess/admin");

async function testAdminLogin() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    // Test with different admin emails from database
    const testEmails = [
      "talhaqureshi00123@gmail.com",
      "usman.abid00321@gmail.com",
      "talha123@gmail.com",
      "iotfiy@gmail.com"
    ];

    for (const email of testEmails) {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`🔍 Testing Admin Login for: ${email}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      // Find Admin
      const { Sequelize } = require("sequelize");
      const trimmedEmail = email.trim();
      
      console.log(`🔍 Step 1: Exact match search for: "${trimmedEmail}"`);
      let admin = await Admin.findOne({ where: { email: trimmedEmail } });
      
      if (!admin) {
        console.log(`⚠️ Exact match not found, trying case-insensitive...`);
        admin = await Admin.findOne({ 
          where: Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('email')),
            trimmedEmail.toLowerCase()
          )
        });
      }

      if (!admin) {
        console.log("❌ Admin not found in database!\n");
        continue;
      }

      console.log("✅ Admin found:");
      console.log(`   ID: ${admin.id}`);
      console.log(`   Name: ${admin.name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Status: ${admin.status}`);
      console.log(`   Password hash exists: ${!!admin.password}`);
      console.log(`   Password hash length: ${admin.password ? admin.password.length : 0}`);
      console.log(`   Is bcrypt hash?: ${admin.password ? admin.password.startsWith('$2') : false}\n`);

      // Test with common passwords
      const testPasswords = [
        "admin123",
        "admin2@123",
        "password",
        process.env.SEED_ADMIN_PASSWORD || "admin123"
      ];

      console.log("🔐 Testing password verification...");
      let passwordFound = false;
      
      for (const testPassword of testPasswords) {
        try {
          const trimmedPassword = testPassword.trim();
          const isValid = await bcrypt.compare(trimmedPassword, admin.password);
          
          if (isValid) {
            console.log(`   ✅ Password MATCH: "${testPassword}"`);
            passwordFound = true;
            break;
          } else {
            console.log(`   ❌ Password mismatch: "${testPassword}"`);
          }
        } catch (bcryptError) {
          console.log(`   ❌ Error testing password "${testPassword}": ${bcryptError.message}`);
        }
      }

      if (!passwordFound) {
        console.log("\n❌ No matching password found!");
        console.log("💡 You may need to reset the admin password.");
      } else {
        console.log("\n✅ Login would succeed with correct password!");
      }
      
      console.log("\n");
    }

    // List all admins
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 All Admins in Database:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const allAdmins = await Admin.findAll({
      attributes: ['id', 'name', 'email', 'status'],
      order: [['createdAt', 'DESC']]
    });
    
    allAdmins.forEach(a => {
      console.log(`   ✅ ID: ${a.id}, Email: ${a.email}, Name: ${a.name}, Status: ${a.status}`);
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Full error:", error);
  } finally {
    await sequelize.close();
  }
}

testAdminLogin();


