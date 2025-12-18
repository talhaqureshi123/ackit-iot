const path = require("path");
const { Sequelize } = require("sequelize");

// Load .env file only in non-production environments (Railway uses environment variables directly)
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({
    path: path.resolve(__dirname, "../environment/.env"),
  });
}

console.log("🔍 Checking env values...");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);

// Support Railway DATABASE_URL or individual DB credentials
let sequelize;
if (process.env.DATABASE_URL) {
  // Railway provides DATABASE_URL in format: postgresql://user:password@host:port/database
  console.log("✅ Using DATABASE_URL from Railway");
  // Mask password in logs for security
  const maskedUrl = process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@");
  console.log("DATABASE_URL:", maskedUrl);
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    timezone: "+05:00", // Pakistan/Karachi timezone (PKT - UTC+5)
    dialectOptions: {
      ssl:
        process.env.NODE_ENV === "production"
          ? {
              require: true,
              rejectUnauthorized: false,
            }
          : false,
    },
  });
} else {
  // Fallback to individual credentials (for local development)
  // In production, DATABASE_URL should always be set
  if (process.env.NODE_ENV === "production") {
    console.error("❌ ERROR: DATABASE_URL is required in production!");
    console.error("Please set DATABASE_URL in Railway Variables tab.");
    console.error("Go to: Railway Dashboard → Your Service → Variables → Add DATABASE_URL");
    process.exit(1);
  }

  console.log("⚠️ DATABASE_URL not found, using individual DB credentials (local development)");
  console.log("DB_NAME:", process.env.DB_NAME);
  console.log("DB_USER:", process.env.DB_USER);
  console.log("DB_HOST:", process.env.DB_HOST || "localhost (default)");
  console.log(
    "DB_PASSWORD:",
    process.env.DB_PASSWORD ? "✅ Loaded" : "❌ Missing"
  );

  if (!process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
    console.error("❌ ERROR: Missing database credentials!");
    console.error("Required: DB_NAME, DB_USER, DB_PASSWORD");
    process.exit(1);
  }

  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 5432,
      dialect: process.env.DB_DIALECT || "postgres",
      logging: process.env.NODE_ENV === "development" ? console.log : false,
      pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
      timezone: "+05:00", // Pakistan/Karachi timezone (PKT - UTC+5)
      // Note: Sequelize stores dates in UTC in database, but this setting affects how dates are interpreted
    }
  );
}

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error);
  }
})();

module.exports = sequelize;
