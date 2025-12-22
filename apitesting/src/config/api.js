/**
 * API Configuration
 * Central configuration for API base URL and backend server IP
 *
 * ⚠️ IMPORTANT: Change the IP address here to update it across the entire frontend
 *
 * This config should match the backend config in: ackitbackend/config/server.config.js
 * Keep both configs in sync when changing the IP address!
 *
 * This config is used by:
 * - vite.config.js (proxy configuration)
 * - All API service files (via proxy)
 * - Frontend base URLs
 */

// ============================================
// 🔧 CONFIGURATION - CHANGE IP HERE
// ============================================
// Set your server IP address here
// ⚠️ MUST MATCH: ackitbackend/environment/.env -> SERVER_IP
//
// Priority order:
// 1. Environment variable (VITE_BACKEND_IP from .env file)
// 2. Fallback to hardcoded IP (if .env not set)
//
// To change IP: Update .env file at: apitesting/.env
// Add: VITE_BACKEND_IP=your_ip_here
//
// ⚠️ IMPORTANT: Verify this matches your current network IP
// Run 'ipconfig' on Windows to check your current IP

// Support both Node.js context (vite.config.js) and browser context
// In Node.js: use process.env
// In browser: use import.meta.env
const getEnvVar = (key, defaultValue) => {
  // Check if we're in Node.js context (vite.config.js)
  if (typeof process !== "undefined" && process.env) {
    return process.env[key] || defaultValue;
  }
  // Browser context (import.meta.env)
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env[key] || defaultValue;
  }
  return defaultValue;
};

// ============================================
// Railway Production URL Support
// ============================================
// Priority: Railway Backend URL > Environment Variable > Local IP
const RAILWAY_BACKEND_URL = getEnvVar("VITE_RAILWAY_BACKEND_URL", null);
export const BACKEND_IP = getEnvVar("VITE_BACKEND_IP", "192.168.1.105");

// ============================================
// Port Configuration
// ============================================
// Backend server port
// ⚠️ MUST MATCH: ackitbackend/config/server.config.js -> PORT
export const BACKEND_PORT = "5050";

// Frontend WebSocket port (for real-time updates)
// ⚠️ MUST MATCH: ackitbackend/services/esp.js -> frontendWSS port (same as ESP32 port 5050)
export const FRONTEND_WS_PORT = "5050";

// WebSocket URL for real-time connections (Frontend)
// Uses Railway WebSocket URL in production, local IP in development
export const WS_URL = (() => {
  if (RAILWAY_BACKEND_URL) {
    // Convert Railway HTTPS URL to WSS for WebSocket
    // Always use secure WebSocket (wss) for Railway, just like ESP simulator
    const wsProtocol = "wss";
    return RAILWAY_BACKEND_URL.replace(/^https?/, wsProtocol) + "/frontend";
  }
  return `ws://${BACKEND_IP}:${FRONTEND_WS_PORT}/frontend`;
})();

// WebSocket URL for ESP32 devices
// Uses Railway WebSocket URL in production, local IP in development
export const ESP_WS_URL = (() => {
  if (RAILWAY_BACKEND_URL) {
    // Convert Railway HTTPS URL to WSS for WebSocket
    // ESP32 devices can use wss:// for secure connections
    const wsProtocol = "wss"; // Always use secure WebSocket for Railway
    return RAILWAY_BACKEND_URL.replace(/^https?/, wsProtocol) + "/esp32";
  }
  return `ws://${BACKEND_IP}:${FRONTEND_WS_PORT}/esp32`;
})();

// Frontend port (for Vite dev server)
// ⚠️ MUST MATCH: ackitbackend/config/server.config.js -> FRONTEND_PORT
export const FRONTEND_PORT = "3000";

// Vite default port (alternative)
export const VITE_PORT = "5173";

// ============================================
// URL Configuration
// ============================================
// Backend base URL (without /api) - uses Railway URL in production, local IP in development
export const BACKEND_BASE_URL =
  RAILWAY_BACKEND_URL || `http://${BACKEND_IP}:${BACKEND_PORT}`;

// API base URL (with /api)
export const API_BASE_URL = `${BACKEND_BASE_URL}/api`;

// Frontend base URL
export const FRONTEND_BASE_URL = `http://${BACKEND_IP}:${FRONTEND_PORT}`;

// Vite base URL
export const VITE_BASE_URL = `http://${BACKEND_IP}:${VITE_PORT}`;
