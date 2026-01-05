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

// Dynamic cookie settings based on request origin
// This allows cookies to work in both localhost (same-origin) and cross-origin scenarios
const getCookieSettings = (req) => {
  const requestOrigin = req.headers.origin || req.headers.referer || "";
  const isLocalhost =
    requestOrigin.includes("localhost") ||
    requestOrigin.includes("127.0.0.1") ||
    req.headers.host?.includes("localhost") ||
    req.headers.host?.includes("127.0.0.1");
  const isRailway =
    requestOrigin.includes(".railway.app") ||
    requestOrigin.includes(".up.railway.app") ||
    req.headers.host?.includes(".railway.app") ||
    req.headers.host?.includes(".up.railway.app");
  const isProduction = process.env.NODE_ENV === "production";
  const backendIsHTTPS =
    req.protocol === "https" || req.headers["x-forwarded-proto"] === "https";

  // Default settings for localhost (same-origin HTTP)
  let cookieSecure = false;
  let cookieSameSite = "lax";

  // Case 1: Cross-origin - localhost frontend -> HTTPS Railway backend
  if (isLocalhost && backendIsHTTPS) {
    cookieSecure = true;
    cookieSameSite = "none";
  }
  // Case 2: Same-origin - localhost frontend -> localhost backend (HTTP)
  else if (isLocalhost && !backendIsHTTPS) {
    cookieSecure = false;
    cookieSameSite = "lax";
  }
  // Case 3: Production - Railway frontend -> Railway backend (HTTPS)
  else if (isRailway || (isProduction && backendIsHTTPS)) {
    cookieSecure = true;
    cookieSameSite = "none";
  }
  // Case 4: Fallback - Use secure if backend is HTTPS
  else {
    cookieSecure = backendIsHTTPS;
    cookieSameSite = backendIsHTTPS ? "none" : "lax";
  }

  return {
    secure: cookieSecure,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: cookieSameSite,
    path: "/",
    domain: undefined, // Don't set domain for cross-origin
  };
};

app.use(
  session({
    store: sessionStore,
    secret:
      process.env.SESSION_SECRET || "AADFDDDDDDDDDDDDDDD342332436737WQWEWQASDD",
    resave: true, // Save session even if not modified (needed for cross-origin cookie setting)
    saveUninitialized: true, // Save uninitialized sessions (needed for login to set cookie)
    rolling: true, // Reset expiration on each request
    cookie: {
      // Default cookie settings (will be overridden by res.cookie() in login routes)
      // These are fallback settings for non-login requests
      secure: false, // Default to false, will be set dynamically per request
      httpOnly: true, // Prevent XSS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "lax", // Default to lax, will be set dynamically per request
      path: "/", // Ensure cookie is sent for all paths
      domain: undefined, // Don't set domain for cross-origin
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

// Middleware to dynamically update cookie settings based on request origin
app.use((req, res, next) => {
  if (req.session) {
    const cookieSettings = getCookieSettings(req);
    // Update session cookie settings dynamically
    req.session.cookie.secure = cookieSettings.secure;
    req.session.cookie.sameSite = cookieSettings.sameSite;
    
    // Log cookie settings for debugging (only on first request or login)
    if (req.path.includes("/login") || req.path.includes("/auth/login")) {
      console.log("🔐 Dynamic Cookie Settings:", {
        path: req.path,
        origin: req.headers.origin || req.headers.referer,
        secure: cookieSettings.secure,
        sameSite: cookieSettings.sameSite,
        host: req.headers.host,
        protocol: req.protocol,
        forwardedProto: req.headers["x-forwarded-proto"],
      });
    }
  }
  next();
});

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
