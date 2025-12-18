const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const MemoryStore = require("memorystore")(session);
const path = require("path");

// Load .env file only in non-production environments (Railway uses environment variables directly)
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: "./config/environment/.env" });
}

// Import database connection
require("./config/database/postgresql");

// Import models to set up associations
require("./models");

// Import routes
const routes = require("./routes/routes");

const app = express();

// ----------------------
// 🔒 Security middleware
// ----------------------
app.use(helmet());

// Import server configuration
const serverConfig = require("./config/server.config");
const { CORS_ORIGINS } = serverConfig;

// Log CORS configuration on startup
console.log("🌐 CORS Configuration:");
console.log("   └─ Allowed Origins:", CORS_ORIGINS);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Check if origin matches any allowed origin (string or regex)
      const isAllowed = CORS_ORIGINS.some((allowedOrigin) => {
        if (typeof allowedOrigin === "string") {
          return allowedOrigin === origin;
        } else if (allowedOrigin instanceof RegExp) {
          return allowedOrigin.test(origin);
        }
        return false;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`⚠️ CORS: Blocked origin: ${origin}`);
        console.warn(
          `   └─ Allowed origins:`,
          CORS_ORIGINS.filter((o) => typeof o === "string")
        );
        callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
      }
    },
    credentials: true, // Allow cookies to be sent
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ----------------------
// 🧾 Logging middleware
// ----------------------
app.use(morgan("combined"));

// ----------------------
// 🍪 Session middleware with PostgreSQL store
// ----------------------
// Try PostgreSQL session store, fallback to memory store
let sessionStore;
try {
  sessionStore = new pgSession({
    conString:
      process.env.DATABASE_URL ||
      `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    tableName: "session", // Use 'session' table
    createTableIfMissing: true, // Create table if it doesn't exist
    pruneSessionInterval: 60, // Clean up expired sessions every 60 seconds
  });
  console.log("✅ Using PostgreSQL session store");
} catch (error) {
  console.log(
    "⚠️ PostgreSQL session store failed, using memory store:",
    error.message
  );
  sessionStore = new MemoryStore({
    checkPeriod: 86400000, // prune expired entries every 24h
  });
}

app.use(
  session({
    store: sessionStore,
    secret:
      process.env.SESSION_SECRET || "AADFDDDDDDDDDDDDDDD342332436737WQWEWQASDD",
    resave: false, // Don't save session if not modified (prevents race conditions)
    saveUninitialized: false, // Don't save uninitialized sessions
    rolling: true, // Reset expiration on each request
    cookie: {
      secure: process.env.NODE_ENV === "production", // HTTPS in production, HTTP in development
      httpOnly: true, // Prevent XSS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Allow cross-site in production
      path: "/", // Ensure cookie is sent for all paths
      // Don't set domain in development - allows cookie to work with proxy
      domain: undefined,
    },
    name: "ackit.sid", // Custom session name
  })
);

// Make sessionStore accessible globally for session invalidation
app.set("sessionStore", sessionStore);

// ----------------------
// 📦 Body parsing
// ----------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ----------------------
// 🩺 Health check endpoint
// ----------------------
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ACKit Backend Server is running",
    timestamp: new Date().toISOString(),
  });
});

// ----------------------
// 🧭 API Routes
// ----------------------
app.use("/api", routes);

// ----------------------
// 🚫 404 Handler (Express 5 compatible)
// ----------------------
app.use(/.*/, (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ----------------------
// 💥 Global Error Handler
// ----------------------
app.use((err, req, res, next) => {
  console.error("❌ Global Error Handler:");
  console.error("   └─ Error:", err);
  console.error("   └─ Message:", err.message);
  console.error("   └─ Stack:", err.stack);
  console.error("   └─ Route:", req.method, req.path);
  console.error("   └─ Status:", err.status || 500);

  // If response already sent, don't try to send again
  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

module.exports = app;
