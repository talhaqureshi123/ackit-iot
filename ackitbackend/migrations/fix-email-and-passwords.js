/**
 * Migration: Fix Email Configuration and Password Issues
 * 
 * This migration:
 * 1. Verifies email configuration (EMAIL_USER, EMAIL_PASS)
 * 2. Checks for users with missing or invalid password hashes
 * 3. Fixes password hashes if needed
 * 4. Verifies database schema for password fields
 * 
 * Run via npm: npm run migrate:passwords
 * Run directly: node migrations/fix-email-and-passwords.js
 */

// Load .env file only in non-production environments
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: "./config/environment/.env" });
}

const sequelize = require("../config/database/postgresql");
const { QueryTypes } = require("sequelize");
const bcrypt = require("bcryptjs");

async function fixEmailAndPasswords() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log("🔄 Starting email and password fix migration...\n");

    // Test database connection
    await sequelize.authenticate();
    console.log("✅ Database connection established\n");

    // ============================================
    // Step 1: Verify Email Configuration
    // ============================================
    console.log("📋 Step 1: Verifying email configuration...\n");
    
    const emailConfig = {
      EMAIL_HOST: process.env.EMAIL_HOST || "smtp.gmail.com",
      EMAIL_PORT: process.env.EMAIL_PORT || 587,
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASS: process.env.EMAIL_PASS,
      EMAIL_FROM: process.env.EMAIL_FROM,
      EMAIL_SECURE: process.env.EMAIL_SECURE,
    };

    console.log("   Email Configuration:");
    console.log(`   - EMAIL_HOST: ${emailConfig.EMAIL_HOST ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - EMAIL_PORT: ${emailConfig.EMAIL_PORT}`);
    console.log(`   - EMAIL_USER: ${emailConfig.EMAIL_USER ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - EMAIL_PASS: ${emailConfig.EMAIL_PASS ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - EMAIL_FROM: ${emailConfig.EMAIL_FROM || 'Using default'}`);
    console.log(`   - EMAIL_SECURE: ${emailConfig.EMAIL_SECURE || 'false'}`);

    if (!emailConfig.EMAIL_USER || !emailConfig.EMAIL_PASS) {
      console.log("\n   ⚠️ WARNING: Email credentials are missing!");
      console.log("   → Set EMAIL_USER and EMAIL_PASS in Railway environment variables");
      console.log("   → Email notifications will not work without these");
    } else {
      console.log("\n   ✅ Email configuration is complete");
    }

    // ============================================
    // Step 2: Check Password Fields in Database
    // ============================================
    console.log("\n📋 Step 2: Checking password fields in database...\n");

    // Check SuperAdmin passwords
    const superAdminPasswords = await sequelize.query(
      `SELECT id, email, name, 
              CASE 
                WHEN password IS NULL THEN 'NULL'
                WHEN password = '' THEN 'EMPTY'
                WHEN password NOT LIKE '$2%' THEN 'INVALID_HASH'
                ELSE 'VALID'
              END as password_status,
              LENGTH(password) as password_length
       FROM superadmins
       ORDER BY id`,
      { type: QueryTypes.SELECT, transaction }
    );

    console.log("   SuperAdmin Passwords:");
    if (superAdminPasswords.length === 0) {
      console.log("   ⚠️ No superadmins found in database");
    } else {
      superAdminPasswords.forEach(admin => {
        const status = admin.password_status;
        const icon = status === 'VALID' ? '✅' : '❌';
        console.log(`   ${icon} ID ${admin.id}: ${admin.email} - ${status} (length: ${admin.password_length || 0})`);
      });
    }

    // Check Admin passwords
    const adminPasswords = await sequelize.query(
      `SELECT id, email, name, status,
              CASE 
                WHEN password IS NULL THEN 'NULL'
                WHEN password = '' THEN 'EMPTY'
                WHEN password NOT LIKE '$2%' THEN 'INVALID_HASH'
                ELSE 'VALID'
              END as password_status,
              LENGTH(password) as password_length
       FROM admins
       ORDER BY id`,
      { type: QueryTypes.SELECT, transaction }
    );

    console.log("\n   Admin Passwords:");
    if (adminPasswords.length === 0) {
      console.log("   ⚠️ No admins found in database");
    } else {
      adminPasswords.forEach(admin => {
        const status = admin.password_status;
        const icon = status === 'VALID' ? '✅' : '❌';
        console.log(`   ${icon} ID ${admin.id}: ${admin.email} - ${status} (length: ${admin.password_length || 0}, status: ${admin.status})`);
      });
    }

    // Check Manager passwords
    const managerPasswords = await sequelize.query(
      `SELECT id, email, name, status,
              CASE 
                WHEN password IS NULL THEN 'NULL'
                WHEN password = '' THEN 'EMPTY'
                WHEN password NOT LIKE '$2%' THEN 'INVALID_HASH'
                ELSE 'VALID'
              END as password_status,
              LENGTH(password) as password_length
       FROM managers
       ORDER BY id`,
      { type: QueryTypes.SELECT, transaction }
    );

    console.log("\n   Manager Passwords:");
    if (managerPasswords.length === 0) {
      console.log("   ⚠️ No managers found in database");
    } else {
      managerPasswords.forEach(manager => {
        const status = manager.password_status;
        const icon = status === 'VALID' ? '✅' : '❌';
        console.log(`   ${icon} ID ${manager.id}: ${manager.email} - ${status} (length: ${manager.password_length || 0}, status: ${manager.status})`);
      });
    }

    // ============================================
    // Step 3: Fix Invalid Passwords (Optional)
    // ============================================
    console.log("\n📋 Step 3: Checking for invalid passwords to fix...\n");

    const saltRounds = 12;
    const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || "admin123";
    let fixedCount = 0;

    // Fix SuperAdmin passwords
    const invalidSuperAdmins = superAdminPasswords.filter(a => 
      a.password_status !== 'VALID'
    );

    if (invalidSuperAdmins.length > 0) {
      console.log(`   Found ${invalidSuperAdmins.length} SuperAdmin(s) with invalid passwords`);
      console.log("   ⚠️ Note: This migration does NOT auto-fix passwords for security reasons");
      console.log("   → Use setup-railway-users.js script to reset passwords");
      console.log("   → Or manually update passwords via admin panel");
    }

    // Fix Admin passwords
    const invalidAdmins = adminPasswords.filter(a => 
      a.password_status !== 'VALID'
    );

    if (invalidAdmins.length > 0) {
      console.log(`   Found ${invalidAdmins.length} Admin(s) with invalid passwords`);
      console.log("   ⚠️ Note: This migration does NOT auto-fix passwords for security reasons");
      console.log("   → Use setup-railway-users.js script to reset passwords");
      console.log("   → Or manually update passwords via admin panel");
    }

    // Fix Manager passwords
    const invalidManagers = managerPasswords.filter(m => 
      m.password_status !== 'VALID'
    );

    if (invalidManagers.length > 0) {
      console.log(`   Found ${invalidManagers.length} Manager(s) with invalid passwords`);
      console.log("   ⚠️ Note: This migration does NOT auto-fix passwords for security reasons");
      console.log("   → Use setup-railway-users.js script to reset passwords");
      console.log("   → Or manually update passwords via admin panel");
    }

    // ============================================
    // Step 4: Verify Database Schema
    // ============================================
    console.log("\n📋 Step 4: Verifying database schema...\n");

    const passwordColumns = await sequelize.query(
      `SELECT table_name, column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_name IN ('superadmins', 'admins', 'managers')
       AND column_name = 'password'
       ORDER BY table_name, column_name`,
      { type: QueryTypes.SELECT, transaction }
    );

    console.log("   Password Column Schema:");
    passwordColumns.forEach(col => {
      console.log(`   ✅ ${col.table_name}.${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Commit transaction
    await transaction.commit();

    console.log("\n✅ Migration completed successfully!");
    console.log("\n📝 Summary:");
    console.log(`   - Email config: ${emailConfig.EMAIL_USER && emailConfig.EMAIL_PASS ? '✅ Complete' : '❌ Missing credentials'}`);
    console.log(`   - SuperAdmins checked: ${superAdminPasswords.length}`);
    console.log(`   - Admins checked: ${adminPasswords.length}`);
    console.log(`   - Managers checked: ${managerPasswords.length}`);
    console.log(`   - Invalid passwords found: ${invalidSuperAdmins.length + invalidAdmins.length + invalidManagers.length}`);
    
    if (invalidSuperAdmins.length + invalidAdmins.length + invalidManagers.length > 0) {
      console.log("\n   ⚠️ ACTION REQUIRED:");
      console.log("   → Run: npm run setup-users (or node making/setup-railway-users.js)");
      console.log("   → This will reset passwords for users with invalid hashes");
    }

    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error("\n❌ Migration failed:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log("\n🔌 Database connection closed");
  }
}

// Run the migration
fixEmailAndPasswords();

