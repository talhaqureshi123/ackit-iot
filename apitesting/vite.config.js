import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Import from api.js - it now works in both Node.js and browser contexts
import { FRONTEND_PORT, BACKEND_BASE_URL } from "./src/config/api.js";

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
              proxyRes.headers["set-cookie"] = setCookieHeaders.map((cookie) => {
                // Remove domain attribute to allow cookie on any domain
                return cookie
                  .split(";")
                  .filter((part) => !part.trim().toLowerCase().startsWith("domain"))
                  .join(";");
              });
            }
          });
        },
      },
    },
  },
});
