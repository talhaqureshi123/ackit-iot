import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { FRONTEND_PORT } from "./src/config/api.js";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
// Check both root and src/config folders for .env file
const rootEnv = loadEnv("development", process.cwd(), "");
const configEnvPath = resolve(__dirname, "src/config");
const configEnv = loadEnv("development", configEnvPath, "");

// Get Railway backend URL from environment (check both locations)
// In development, prefer local IP over Railway URL to avoid DNS issues
const RAILWAY_BACKEND_URL =
  process.env.NODE_ENV === "production"
    ? (rootEnv.VITE_RAILWAY_BACKEND_URL ||
       configEnv.VITE_RAILWAY_BACKEND_URL ||
       process.env.VITE_RAILWAY_BACKEND_URL ||
       null)
    : null; // Force local IP in development
const BACKEND_IP =
  rootEnv.VITE_BACKEND_IP ||
  configEnv.VITE_BACKEND_IP ||
  process.env.VITE_BACKEND_IP ||
  "10.39.58.140";
const BACKEND_PORT = "5050";

// Backend base URL - prefer Railway URL in production, always use local IP in development
const BACKEND_BASE_URL =
  RAILWAY_BACKEND_URL || `http://${BACKEND_IP}:${BACKEND_PORT}`;

console.log("🔧 Vite Config - Environment Check:");
console.log("   NODE_ENV:", process.env.NODE_ENV || "development");
console.log("   VITE_RAILWAY_BACKEND_URL:", RAILWAY_BACKEND_URL || "Not set (using local IP)");
console.log("   Backend IP:", BACKEND_IP);
console.log("   Backend Port:", BACKEND_PORT);
console.log("   ✅ Using Backend URL:", BACKEND_BASE_URL);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Allow access from network (e.g., 10.1.6.x)
    port: parseInt(FRONTEND_PORT), // Use port from config file
    proxy: {
      // Proxy /api requests to backend server
      // This makes requests same-origin so cookies work properly
        "/api": {
        target: BACKEND_BASE_URL,
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket proxying for native WebSocket
        timeout: 30000, // Increase timeout to 30 seconds
        proxyTimeout: 30000, // Increase proxy timeout
        onError: (err, req, res) => {
          console.error("❌ Proxy error:", err.message);
          console.error("   Target was:", BACKEND_BASE_URL);
          if (err.code === "ENOTFOUND" || err.code === "EAI_AGAIN") {
            console.error("   ⚠️ DNS resolution failed. Falling back to local IP...");
            console.error("   💡 Make sure backend is running on:", `http://${BACKEND_IP}:${BACKEND_PORT}`);
          }
        },
        configure: (proxy, _options) => {
          // Log cookies being sent TO backend
          proxy.on("proxyReq", (proxyReq, req, res) => {
            const cookies = req.headers.cookie;
            if (cookies) {
              console.log("🍪 Proxy - Sending cookies to backend:", cookies);
              console.log(
                "🍪 Proxy - Has ackit.sid:",
                cookies.includes("ackit.sid")
              );
            } else {
              console.log("⚠️ Proxy - No cookies being sent to backend");
              console.log("⚠️ Proxy - Request URL:", req.url);
              console.log(
                "⚠️ Proxy - Request headers:",
                Object.keys(req.headers)
              );
            }
          });

          // Handle cookies coming FROM backend
          proxy.on("proxyRes", (proxyRes, req, res) => {
            // Ensure cookies are properly forwarded
            const setCookieHeaders = proxyRes.headers["set-cookie"];
            if (setCookieHeaders) {
              console.log(
                "🍪 Proxy - Received cookies from backend:",
                setCookieHeaders
              );
              console.log(
                "🍪 Proxy - Response URL:",
                req.url,
                "Status:",
                proxyRes.statusCode
              );

              // Modify cookie attributes for local development with Railway HTTPS backend
              proxyRes.headers["set-cookie"] = setCookieHeaders.map(
                (cookie) => {
                  console.log("🍪 Proxy - Original cookie:", cookie);

                  // For local development with Railway backend (HTTPS -> HTTP proxy):
                  // - Remove Secure flag (since localhost is HTTP)
                  // - Change SameSite from "none" to "Lax" for local development
                  // - Remove domain attribute
                  let modifiedCookie = cookie
                    .split(";")
                    .map((part) => part.trim())
                    .filter((part) => {
                      const lower = part.toLowerCase();
                      return (
                        !lower.startsWith("domain") &&
                        !lower.startsWith("secure") &&
                        !lower.startsWith("samesite")
                      );
                    })
                    .join("; ");

                  // Add SameSite=Lax for local development (required for localhost)
                  modifiedCookie += "; SameSite=Lax";

                  console.log("🍪 Proxy - Modified cookie:", modifiedCookie);
                  return modifiedCookie;
                }
              );
            } else {
              console.log("⚠️ Proxy - No cookies received from backend");
              console.log("⚠️ Proxy - Response status:", proxyRes.statusCode);
              console.log("⚠️ Proxy - Response URL:", req.url);
              console.log(
                "⚠️ Proxy - Response headers:",
                Object.keys(proxyRes.headers)
              );

              // Check if this is a login response
              if (req.url && req.url.includes("/login")) {
                console.log(
                  "⚠️ Proxy - This is a login request but no cookies received!"
                );
                console.log(
                  "⚠️ Proxy - Check backend logs for session creation"
                );
              }
            }
          });
        },
      },
    },
  },
});
