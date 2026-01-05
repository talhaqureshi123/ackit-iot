/**
 * Diagnostic Script: Check User Email in All Tables
 * 
 * This script checks if an email exists in admin, superadmin, or manager tables
 * and shows password status for debugging login issues.
 * 
 * Usage: railway run node migrations/check-user-in-all-tables.js
 * Or: node migrations/check-user-in-all-tables.js
 */

// Load .env file only in non-production environments
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: "./config/environment/.env" });
}

const sequelize = require("../config/database/postgresql");
const { QueryTypes } = require("sequelize");

async function checkUserInAllTables() {
  const email = process.argv[2] || "usman.abid00321@gmail.com";
  
  console.log("🔍 Checking email in all user tables...\n");
  console.log(`📧 Email: ${email}\n`);
  console.log("=".repeat(60));

  try {
    // Check SuperAdmin
    console.log("\n1️⃣  Checking SUPERADMIN table...");
    const superAdmin = await sequelize.query(
      `SELECT id, email, name, "isActive",
              CASE 
                WHEN password IS NULL THEN 'NULL'
                WHEN password = '' THEN 'EMPTY'
                WHEN password NOT LIKE '$2%' THEN 'INVALID_HASH'
                ELSE 'VALID'
              END as password_status,
              LENGTH(password) as password_length
       FROM superadmins
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      { 
        type: QueryTypes.SELECT,
        bind: [email]
      }
    );

    if (superAdmin.length > 0) {
      const sa = superAdmin[0];
      console.log(`   ✅ FOUND in superadmins table`);
      console.log(`      ID: ${sa.id}`);
      console.log(`      Name: ${sa.name}`);
      console.log(`      Email: ${sa.email}`);
      console.log(`      Active: ${sa.isActive}`);
      console.log(`      Password Status: ${sa.password_status}`);
      console.log(`      Password Length: ${sa.password_length || 0}`);
    } else {
      console.log(`   ❌ NOT FOUND in superadmins table`);
    }

    // Check Admin
    console.log("\n2️⃣  Checking ADMIN table...");
    const admin = await sequelize.query(
      `SELECT id, email, name, status,
              CASE 
                WHEN password IS NULL THEN 'NULL'
                WHEN password = '' THEN 'EMPTY'
                WHEN password NOT LIKE '$2%' THEN 'INVALID_HASH'
                ELSE 'VALID'
              END as password_status,
              LENGTH(password) as password_length
       FROM admins
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      { 
        type: QueryTypes.SELECT,
        bind: [email]
      }
    );

    if (admin.length > 0) {
      const a = admin[0];
      console.log(`   ✅ FOUND in admins table`);
      console.log(`      ID: ${a.id}`);
      console.log(`      Name: ${a.name}`);
      console.log(`      Email: ${a.email}`);
      console.log(`      Status: ${a.status}`);
      console.log(`      Password Status: ${a.password_status}`);
      console.log(`      Password Length: ${a.password_length || 0}`);
    } else {
      console.log(`   ❌ NOT FOUND in admins table`);
    }

    // Check Manager
    console.log("\n3️⃣  Checking MANAGER table...");
    const manager = await sequelize.query(
      `SELECT id, email, name, status,
              CASE 
                WHEN password IS NULL THEN 'NULL'
                WHEN password = '' THEN 'EMPTY'
                WHEN password NOT LIKE '$2%' THEN 'INVALID_HASH'
                ELSE 'VALID'
              END as password_status,
              LENGTH(password) as password_length
       FROM managers
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      { 
        type: QueryTypes.SELECT,
        bind: [email]
      }
    );

    if (manager.length > 0) {
      const m = manager[0];
      console.log(`   ✅ FOUND in managers table`);
      console.log(`      ID: ${m.id}`);
      console.log(`      Name: ${m.name}`);
      console.log(`      Email: ${m.email}`);
      console.log(`      Status: ${m.status}`);
      console.log(`      Password Status: ${m.password_status}`);
      console.log(`      Password Length: ${m.password_length || 0}`);
    } else {
      console.log(`   ❌ NOT FOUND in managers table`);
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 SUMMARY:");
    console.log("=".repeat(60));
    
    const foundIn = [];
    if (superAdmin.length > 0) foundIn.push("SUPERADMIN");
    if (admin.length > 0) foundIn.push("ADMIN");
    if (manager.length > 0) foundIn.push("MANAGER");

    if (foundIn.length === 0) {
      console.log(`\n❌ Email "${email}" NOT FOUND in any table!`);
      console.log("\n💡 Solution:");
      console.log("   → Run: railway run npm run setup-users");
      console.log("   → This will create/reset users in all tables");
    } else {
      console.log(`\n✅ Email "${email}" found in: ${foundIn.join(", ")}`);
      
      // Check password status
      const allUsers = [...superAdmin, ...admin, ...manager];
      const invalidPasswords = allUsers.filter(u => u.password_status !== 'VALID');
      
      if (invalidPasswords.length > 0) {
        console.log(`\n⚠️  Password Issues Found:`);
        invalidPasswords.forEach(u => {
          console.log(`   - ${u.email}: ${u.password_status}`);
        });
        console.log("\n💡 Solution:");
        console.log("   → Run: railway run npm run setup-users");
        console.log("   → This will reset passwords to default values");
      } else {
        console.log(`\n✅ All passwords are VALID`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Diagnostic complete!");
    console.log("=".repeat(60) + "\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log("🔌 Database connection closed\n");
  }
}

// Run the diagnostic
checkUserInAllTables();

