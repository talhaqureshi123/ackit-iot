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
const RAILWAY_BACKEND_URL =
  rootEnv.VITE_RAILWAY_BACKEND_URL ||
  configEnv.VITE_RAILWAY_BACKEND_URL ||
  process.env.VITE_RAILWAY_BACKEND_URL ||
  null;
const BACKEND_IP =
  rootEnv.VITE_BACKEND_IP ||
  configEnv.VITE_BACKEND_IP ||
  process.env.VITE_BACKEND_IP ||
  "192.168.1.105";
const BACKEND_PORT = "5050";

// Backend base URL - prefer Railway URL, fallback to local IP
const BACKEND_BASE_URL =
  RAILWAY_BACKEND_URL || `http://${BACKEND_IP}:${BACKEND_PORT}`;

console.log("🔧 Vite Config - Environment Check:");
console.log("   VITE_RAILWAY_BACKEND_URL:", RAILWAY_BACKEND_URL || "Not set");
console.log("   Backend URL:", BACKEND_BASE_URL);

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
        configure: (proxy, _options) => {
          proxy.on("proxyRes", (proxyRes, req, res) => {
            // Ensure cookies are properly forwarded
            const setCookieHeaders = proxyRes.headers["set-cookie"];
            if (setCookieHeaders) {
              // Modify cookie attributes if needed (remove domain restriction)
              proxyRes.headers["set-cookie"] = setCookieHeaders.map(
                (cookie) => {
                  // Remove domain attribute to allow cookie on any domain
                  return cookie
                    .split(";")
                    .filter(
                      (part) => !part.trim().toLowerCase().startsWith("domain")
                    )
                    .join(";");
                }
              );
            }
          });
        },
      },
    },
  },
});
