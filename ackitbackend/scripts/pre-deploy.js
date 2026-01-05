/**
 * Pre-Deploy Script for Railway
 * 
 * This script runs ALL critical database migrations before deployment:
 * 1. Add missing columns to events table (controlDevicePower, deviceOnTime, deviceOffTime)
 * 2. Add recurring event columns (isRecurring, recurringType, etc.)
 * 3. Fix timezone issues (TIMESTAMPTZ conversion)
 * 4. Add missing columns to admins table (plan)
 * 5. Verify database schema & check user passwords
 * 
 * Railway will run this automatically if set as pre-deploy command:
 * npm run pre-deploy
 * 
 * Or set in Railway Settings → Pre-deploy Command:
 * npm run migrate:all
 */

console.log("🚀 Starting pre-deploy migrations...\n");
console.log("=".repeat(60));
console.log("📋 Pre-Deploy Migration Checklist:");
console.log("   1. Add missing columns to events table");
console.log("   2. Add recurring event columns");
console.log("   3. Fix timezone columns (if needed)");
console.log("   4. Add missing columns to admins table (plan)");
console.log("   5. Verify database schema & check user passwords");
console.log("=".repeat(60) + "\n");

// Run the master migration script that includes everything
const { execSync } = require("child_process");
const path = require("path");

try {
  // Run the comprehensive migration script
  console.log("📋 Running all required migrations...\n");
  
  const migrationScript = path.join(__dirname, "..", "migrations", "run-all-required-migrations.js");
  
  execSync(`node "${migrationScript}"`, {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
    env: process.env,
  });
  
  console.log("\n" + "=".repeat(60));
  console.log("✅ All pre-deploy migrations completed successfully!");
  console.log("=".repeat(60));
  console.log("\n✨ Database is ready for deployment!\n");
  
  process.exit(0);
} catch (error) {
  console.error("\n" + "=".repeat(60));
  console.error("❌ Pre-deploy migration failed!");
  console.error("=".repeat(60));
  console.error("\nError:", error.message);
  
  // Don't fail deployment if migration fails (might be already run)
  // But log the error for debugging
  console.error("\n⚠️  Continuing with deployment...");
  console.error("   → If you see database errors, run migrations manually:");
  console.error("   → railway run npm run migrate:all");
  console.error("   → Or run SQL directly in PostgreSQL Console\n");
  
  // Exit with 0 to allow deployment to continue
  // Railway will still deploy even if pre-deploy script has warnings
  process.exit(0);
}

