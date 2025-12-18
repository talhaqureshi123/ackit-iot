const app = require("./app");
const path = require("path");
const http = require("http");
const os = require("os");

// Load .env file only in non-production environments (Railway uses environment variables directly)
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({
    path: path.resolve(__dirname, "../environment/.env"),
  });
}

// Initialize timezone utilities
const timezoneUtils = require("./utils/timezone");
console.log(`🌍 Timezone configured: ${timezoneUtils.PAKISTAN_TIMEZONE}`);
console.log(
  `🕐 Current UTC time: ${timezoneUtils.getCurrentUTCTime().toISOString()}`
);
console.log(
  `🕐 Current Pakistan/Karachi time: ${timezoneUtils.getCurrentPKTTimeString()}`
);

// Import server configuration
const serverConfig = require("./config/server.config");
const { SERVER_IP, PORT, BIND_ADDRESS, CORS_ORIGINS } = serverConfig;

// Create HTTP server from Express app
const server = http.createServer(app);

// Initialize services through services gateway
// IMPORTANT: Initialize WebSocket servers BEFORE Express routes
// This ensures WebSocket upgrade requests are handled before Express intercepts them
const Services = require("./services");

// Initialize ESP service (native WebSocket server for ESP32 and frontend connections)
Services.initialize.esp(server);

// NOTE: No Express route on "/" to avoid conflicts with WebSocket on root path
// WebSocket server handles all requests to "/" path
// Use /health endpoint for server status checks

// Add error handler to server before listening (catches WebSocket errors too)
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌ ERROR: Port ${PORT} is already in use!`);
    console.error("═══════════════════════════════════════════════════════");
    console.error("🔍 To fix this, run one of these commands:");
    console.error("");
    console.error("   Option 1: Find and kill the process manually");
    console.error(`   └─ netstat -ano | findstr :${PORT}`);
    console.error("   └─ taskkill /PID <PID> /F");
    console.error("");
    console.error("   Option 2: Kill all Node.js processes (⚠️ Use carefully)");
    console.error("   └─ taskkill /F /IM node.exe");
    console.error("");
    console.error("   Option 3: Change the port in config/server.config.js");
    console.error(
      `   └─ Change PORT from "${PORT}" to another port (e.g., "5052")`
    );
    console.error("═══════════════════════════════════════════════════════\n");
    process.exit(1);
  } else {
    console.error("❌ Server error:", err);
    process.exit(1);
  }
});

// Start all schedulers (alert, room temperature, energy, event)
Services.initialize.schedulers();

// Verify timezone configuration on startup
console.log("\n🕐 Timezone Verification:");
console.log("  Current UTC:", timezoneUtils.getCurrentUTCTime().toISOString());
console.log(
  "  Current PKT:",
  timezoneUtils.getCurrentPKTTimeString("YYYY-MM-DD HH:mm:ss")
);
console.log(
  "  Server timezone:",
  Intl.DateTimeFormat().resolvedOptions().timeZone
);
console.log("");

// Start the server
server.listen(PORT, BIND_ADDRESS, () => {
  console.log(`🚀 ACKit Backend Server running on ${BIND_ADDRESS}:${PORT}`);
  console.log(`📊 Health check: http://${SERVER_IP}:${PORT}/health`);
  console.log(`🔐 Super Admin API: http://${SERVER_IP}:${PORT}/api/superadmin`);
  console.log(`🔌 ESP32 WebSocket: ws://${SERVER_IP}:${PORT}/esp32`);
  console.log(`📱 Frontend WebSocket: ws://${SERVER_IP}:${PORT}/frontend`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  const { getServerIP } = serverConfig;
  const detectedIP = getServerIP();
  console.log(
    `🌐 Server IP: ${SERVER_IP} ${
      process.env.SERVER_IP
        ? "(from env)"
        : detectedIP === SERVER_IP
        ? "(auto-detected)"
        : "(from config)"
    } | Bound to: ${BIND_ADDRESS}`
  );
  if (!process.env.SERVER_IP && detectedIP !== SERVER_IP) {
    console.log(
      `   ⚠️  Note: Detected IP (${detectedIP}) differs from configured IP (${SERVER_IP})`
    );
  }
  const { FRONTEND_PORT } = serverConfig;
  console.log(
    `\n📱 Frontend should be accessed at: http://${SERVER_IP}:${FRONTEND_PORT}`
  );
  console.log(`🔗 API Base URL: http://${SERVER_IP}:${PORT}/api`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down gracefully...");
  process.exit(0);
});
