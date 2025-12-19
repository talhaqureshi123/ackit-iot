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
console.log("DATABASE_PUBLIC_URL exists:", !!process.env.DATABASE_PUBLIC_URL);

// Support Railway DATABASE_URL or individual DB credentials
// Prefer DATABASE_PUBLIC_URL over DATABASE_URL (for Railway internal DNS issues)
let sequelize;
const databaseUrlEnv =
  process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;

if (databaseUrlEnv) {
  // Railway provides DATABASE_URL in format: postgresql://user:password@host:port/database
  // Clean DATABASE_URL - remove any leading '=' or whitespace
  let databaseUrl = databaseUrlEnv.trim();

  // Remove leading '=' if present (Railway sometimes adds this)
  if (databaseUrl.startsWith("=")) {
    databaseUrl = databaseUrl.substring(1).trim();
    console.log("⚠️ Removed leading '=' from DATABASE_URL");
  }

  // Validate URL format
  if (
    !databaseUrl.startsWith("postgresql://") &&
    !databaseUrl.startsWith("postgres://")
  ) {
    console.error(
      "❌ ERROR: DATABASE_URL must start with 'postgresql://' or 'postgres://'"
    );
    console.error(
      "Current DATABASE_URL:",
      databaseUrl.substring(0, 50) + "..."
    );
    process.exit(1);
  }

  const urlSource = process.env.DATABASE_PUBLIC_URL
    ? "DATABASE_PUBLIC_URL"
    : "DATABASE_URL";
  console.log(`✅ Using ${urlSource} from Railway`);
  // Mask password in logs for security
  const maskedUrl = databaseUrl.replace(/:[^:@]+@/, ":****@");
  console.log("Database URL:", maskedUrl);

  sequelize = new Sequelize(databaseUrl, {
    dialect: "postgres",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 60000, // Increased to 60 seconds for Railway
      idle: 10000,
      evict: 1000, // Check for idle connections every second
    },
    retry: {
      max: 3, // Retry failed queries up to 3 times
    },
    timezone: "+05:00", // Pakistan/Karachi timezone (PKT - UTC+5)
    dialectOptions: {
      ssl:
        process.env.NODE_ENV === "production"
          ? {
              require: true,
              rejectUnauthorized: false,
            }
          : false,
      // Keep connection alive
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    },
    // Handle connection errors gracefully
    hooks: {
      beforeConnect: async (config) => {
        console.log("🔌 Attempting database connection...");
      },
      afterConnect: async (connection, config) => {
        console.log("✅ Database connection established");
      },
    },
  });
} else {
  // Fallback to individual credentials (for local development)
  // In production, DATABASE_URL should always be set
  if (process.env.NODE_ENV === "production") {
    console.error("❌ ERROR: DATABASE_URL is required in production!");
    console.error("Please set DATABASE_URL in Railway Variables tab.");
    console.error(
      "Go to: Railway Dashboard → Your Service → Variables → Add DATABASE_URL"
    );
    process.exit(1);
  }

  console.log(
    "⚠️ DATABASE_URL not found, using individual DB credentials (local development)"
  );
  console.log("DB_NAME:", process.env.DB_NAME);
  console.log("DB_USER:", process.env.DB_USER);
  console.log("DB_HOST:", process.env.DB_HOST || "localhost (default)");
  console.log(
    "DB_PASSWORD:",
    process.env.DB_PASSWORD ? "✅ Loaded" : "❌ Missing"
  );

  if (
    !process.env.DB_NAME ||
    !process.env.DB_USER ||
    !process.env.DB_PASSWORD
  ) {
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

// Test connection with retry logic
(async () => {
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await sequelize.authenticate();
      console.log("✅ Database connection established successfully.");
      break;
    } catch (error) {
      retries++;
      console.error(
        `❌ Database connection attempt ${retries}/${maxRetries} failed:`,
        error.message
      );

      if (retries >= maxRetries) {
        console.error(
          "❌ Unable to connect to the database after",
          maxRetries,
          "attempts"
        );
        console.error("Full error:", error);
      } else {
        console.log(`⏳ Retrying in 2 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }
})();

// Note: Pool event listeners removed - Sequelize handles connection errors internally
// Connection errors are already handled by:
// 1. The authenticate() call with retry logic above
// 2. Sequelize's built-in error handling
// 3. The hooks (beforeConnect/afterConnect) defined in the Sequelize config

module.exports = sequelize;
