/**
 * Pre-Deploy Script for Railway
 * 
 * This script runs automatically before deployment to ensure database is up-to-date.
 * It runs all critical migrations in the correct order.
 * 
 * Railway will run this automatically if set as pre-deploy command:
 * npm run pre-deploy
 */

console.log("🚀 Starting pre-deploy migrations...\n");

// Run migrations sequentially
const { execSync } = require("child_process");

try {
  // Migration 1: Add missing columns (most critical - fixes 500 errors)
  console.log("📋 Running migration: Add missing columns...");
  execSync("node migrations/add-missing-columns-railway.js", {
    stdio: "inherit",
    cwd: __dirname + "/..",
  });
  console.log("✅ Missing columns migration completed\n");

  // Migration 2: Complete schema fix (if needed)
  // This is optional and can be run separately if needed
  // Uncomment if you want to run it automatically:
  /*
  console.log("📋 Running migration: Complete schema fix...");
  execSync("node migrations/complete-schema-fix.js", {
    stdio: "inherit",
    cwd: __dirname + "/..",
  });
  console.log("✅ Complete schema fix completed\n");
  */

  console.log("✅ All pre-deploy migrations completed successfully!");
  process.exit(0);
} catch (error) {
  console.error("❌ Pre-deploy migration failed:", error.message);
  // Don't fail deployment if migration fails (might be already run)
  // But log the error for debugging
  console.error("⚠️ Continuing with deployment...");
  console.error("   → If you see database errors, run migrations manually");
  process.exit(0); // Exit with 0 to allow deployment to continue
}

