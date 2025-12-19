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
  // Use DATABASE_PUBLIC_URL if available (for Railway), otherwise DATABASE_URL or individual credentials
  const databaseUrl =
    process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  let conString;

  if (databaseUrl) {
    // Clean DATABASE_URL - remove any leading '=' or whitespace
    let cleanUrl = databaseUrl.trim();
    if (cleanUrl.startsWith("=")) {
      cleanUrl = cleanUrl.substring(1).trim();
    }
    conString = cleanUrl;
    console.log("✅ Using DATABASE_URL for session store");
  } else {
    // Fallback to individual credentials
    conString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
    console.log("✅ Using individual DB credentials for session store");
  }

  sessionStore = new pgSession({
    conString: conString,
    tableName: "session", // Use 'session' table
    createTableIfMissing: true, // Create table if it doesn't exist
    pruneSessionInterval: 60, // Clean up expired sessions every 60 seconds
  });
  console.log("✅ Using PostgreSQL session store");
} catch (error) {
  console.error(
    "⚠️ PostgreSQL session store failed, using memory store:",
    error.message
  );
  console.error("⚠️ Session store error details:", error);
  sessionStore = new MemoryStore({
    checkPeriod: 86400000, // prune expired entries every 24h
  });
  console.log("✅ Using memory session store (fallback)");
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
      // In production (Railway), use secure cookies with sameSite: "none" for cross-origin
      // In development, use lax for same-origin
      // Note: When frontend is on localhost (HTTP) and backend is on Railway (HTTPS),
      // the cookie will be modified by Vite proxy to remove Secure flag
      secure: process.env.NODE_ENV === "production", // HTTPS in production, HTTP in development
      httpOnly: true, // Prevent XSS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Allow cross-site in production
      path: "/", // Ensure cookie is sent for all paths
      // Don't set domain - allows cookie to work with proxy and cross-origin
      domain: undefined,
    },
    // Force session to be saved even if not modified (helps with cross-origin)
    genid: (req) => {
      const sessionId = require("uuid").v4();
      console.log("🔐 Generated session ID:", sessionId);
      return sessionId;
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
// 🍪 Session test endpoint (for debugging)
// ----------------------
app.get("/api/test-session", (req, res) => {
  console.log("🔍 Session Test - Request received");
  console.log("🔍 Session Test - Session exists:", !!req.session);
  console.log("🔍 Session Test - Session ID:", req.sessionID);
  console.log("🔍 Session Test - Session data:", req.session);
  console.log("🔍 Session Test - Cookies:", req.cookies);
  console.log("🔍 Session Test - Headers:", {
    cookie: req.headers.cookie,
    origin: req.headers.origin,
    referer: req.headers.referer,
  });

  res.status(200).json({
    success: true,
    message: "Session test endpoint",
    session: {
      exists: !!req.session,
      sessionID: req.sessionID,
      sessionId: req.session?.sessionId,
      user: req.session?.user,
      cookie: req.session?.cookie,
    },
    cookies: req.cookies,
    headers: {
      origin: req.headers.origin,
      referer: req.headers.referer,
    },
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
