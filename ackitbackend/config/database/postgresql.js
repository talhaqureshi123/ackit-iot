const path = require("path");
const { Sequelize } = require("sequelize");

// Use absolute path to ensure dotenv finds the file
require("dotenv").config({ path: path.resolve(__dirname, "../environment/.env") });

console.log("🔍 Checking env values...");
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD ? "✅ Loaded" : "❌ Missing");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: process.env.DB_DIALECT || "postgres",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    timezone: '+05:00', // Pakistan/Karachi timezone (PKT - UTC+5)
    // Note: Sequelize stores dates in UTC in database, but this setting affects how dates are interpreted
  }
);

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error);
  }
})();

module.exports = sequelize;
  