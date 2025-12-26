/**
 * Server Configuration
 * Central configuration for server IP, ports, and URLs
 * Change the IP address here to update it across the entire backend
 */

const os = require("os");

// ============================================
// 🔧 CONFIGURATION - CHANGE IP HERE
// ============================================
// Helper function to get current network IP (defined below)
function getServerIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      // Skip Windows virtual adapters (vEthernet)
      if (
        iface.family === "IPv4" &&
        !iface.internal &&
        !name.includes("vEthernet")
      ) {
        return iface.address;
      }
    }
  }
  return "192.168.1.105"; // Fallback IP (change this if needed)
}

// Auto-detect server IP, or use environment variable, or fallback to current IP
// This ensures the IP updates automatically when Wi-Fi changes
//
// Priority order:
// 1. Environment variable (SERVER_IP from .env file)
// 2. Auto-detect from network interfaces
// 3. Fallback to hardcoded IP above
//
// To change IP: Update .env file at: ackitbackend/environment/.env
// Add: SERVER_IP=your_ip_here
const SERVER_IP = process.env.SERVER_IP || getServerIP();

// ============================================
// Port Configuration
// ============================================
const PORT = process.env.PORT || "5050";
const FRONTEND_PORT = process.env.FRONTEND_PORT || "3000";
const VITE_PORT = process.env.VITE_PORT || "5173";

// ============================================
// Network Configuration
// ============================================
const BIND_ADDRESS = process.env.BIND_ADDRESS || "0.0.0.0"; // Listen on all interfaces

// ============================================
// URL Configuration
// ============================================
const BACKEND_BASE_URL = `http://${SERVER_IP}:${PORT}`;
const API_BASE_URL = `${BACKEND_BASE_URL}/api`;
const FRONTEND_BASE_URL = `http://${SERVER_IP}:${FRONTEND_PORT}`;
const VITE_BASE_URL = `http://${SERVER_IP}:${VITE_PORT}`;

// ============================================
// CORS Origins
// ============================================
// Allow requests from frontend URLs
// This ensures frontend can connect to backend from any network IP
const CORS_ORIGINS = [
  process.env.FRONTEND_URL || FRONTEND_BASE_URL,
  VITE_BASE_URL,
  FRONTEND_BASE_URL,
  "http://localhost:3000", // ✅ Local development
  "http://localhost:5173", // ✅ Vite default port
  `http://localhost:${PORT}`, // ✅ Backend port (for direct access)
  // Railway frontend URLs (will be set via environment variable)
  process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : null,
  "https://ackit-iot.up.railway.app", // ✅ Railway production frontend
  // Allow any localhost with any port (for development)
  /^http:\/\/localhost:\d+$/,
  // Allow any IP from same network (for network access)
  new RegExp(`^http://${SERVER_IP.replace(/\./g, "\\.")}:\\d+$`),
  // Allow Railway domains (regex patterns for any Railway domain)
  /^https:\/\/.*\.railway\.app$/,
  /^https:\/\/.*\.up\.railway\.app$/,
].filter((value, index, self) => {
  // Remove null/undefined values
  if (!value) return false;
  // Remove duplicates for strings
  if (typeof value === "string") {
    return self.indexOf(value) === index;
  }
  return true; // Keep regex patterns
});

// ============================================
// Helper Functions
// ============================================
// getServerIP() is now defined above and used for SERVER_IP initialization
// This function is exported for use in other files if needed

// ============================================
// Exports
// ============================================
module.exports = {
  // IP and Network
  SERVER_IP,
  BIND_ADDRESS,
  getServerIP,

  // Ports
  PORT,
  FRONTEND_PORT,
  VITE_PORT,

  // URLs
  BACKEND_BASE_URL,
  API_BASE_URL,
  FRONTEND_BASE_URL,
  VITE_BASE_URL,

  // CORS
  CORS_ORIGINS,
};
