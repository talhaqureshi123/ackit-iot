// Clear all superadmins and admins, reset sequences
// Usage: node ackitbackend/making/clear-admins.js

require("dotenv").config();
const sequelize = require("../config/database/postgresql");

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connected");

    // TRUNCATE will reset sequences with RESTART IDENTITY; CASCADE handles FKs
    await sequelize.query(
      'TRUNCATE TABLE "activity_logs" RESTART IDENTITY CASCADE;'
    );
    await sequelize.query(
      'TRUNCATE TABLE "system_states" RESTART IDENTITY CASCADE;'
    );
    await sequelize.query(
      'TRUNCATE TABLE "admins" RESTART IDENTITY CASCADE;'
    );
    await sequelize.query(
      'TRUNCATE TABLE "superadmins" RESTART IDENTITY CASCADE;'
    );

    console.log("🧹 Cleared admins/superadmins and reset sequences.");
  } catch (err) {
    console.error("❌ Error:", err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
    console.log("🔌 DB closed");
  }
})();


