import axios from "axios";
import { BACKEND_BASE_URL } from "../config/api";

// Determine API base URL based on environment
// Production: Use full backend URL (Railway)
// Development: Use Vite proxy (/api)
const isProduction =
  import.meta.env.PROD || import.meta.env.MODE === "production";
const API_BASE_URL = isProduction
  ? `${BACKEND_BASE_URL}/api` // Production: Full backend URL
  : "/api"; // Development: Vite proxy

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Enable cookies for session-based auth
});

// Request interceptor for session-based auth
api.interceptors.request.use(
  (config) => {
    // Log request for debugging
    console.log(
      `📤 API Request: ${config.method?.toUpperCase()} ${config.url}`
    );
    console.log(`   └─ Full URL: ${config.baseURL}${config.url}`);
    console.log(`   └─ Target: ${config.baseURL}`);
    console.log(`   └─ With credentials: ${config.withCredentials}`);
    // Session is handled automatically by cookies
    // Ensure withCredentials is always true for cookie sending
    config.withCredentials = true;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Silent error handling - no console logs
    // Handle network errors (no response from server)
    if (!error.response) {
      const errorMessage = error.message || "Network error";
      const errorCode = error.code || "NETWORK_ERROR";
      const targetURL = error.config?.url || "/api";
      const backendIP = `${BACKEND_IP}:${BACKEND_PORT}`;
      const connectionType = USE_PROXY ? "proxy (via Vite)" : "direct";
      const fullURL = USE_PROXY
        ? `http://localhost:${
            import.meta.env.VITE_PORT || 3000
          }${targetURL} (proxied to ${API_BASE_URL})`
        : `${API_BASE_URL}${targetURL}`;

      return Promise.reject({
        ...error,
        isNetworkError: true,
        message: `Unable to connect to server. Please ensure the backend server is running at ${backendIP} and the Vite dev server proxy is configured correctly.`,
        diagnosticInfo: {
          backendIP,
          targetURL,
          fullURL,
          connectionType,
          errorCode,
          errorMessage,
        },
      });
    }

    if (error.response?.status === 401) {
      // Session expired or invalid
      const url = error.config?.url || "";
      const isStatusOperation =
        url.includes("/system/status") || url.includes("/status");
      const isToggleOperation =
        url.includes("/toggle") || url.includes("/power");
      const isUnlockOperation =
        url.includes("/unlock") || url.includes("/system/unlock");
      const isLockOperation =
        url.includes("/lock/from-remote") ||
        url.includes("/lock/from-manager") ||
        url.includes("/system/lock");
      const isViewDetailsOperation =
        url.includes("/organizations/") && url.match(/\/organizations\/[^/]+$/);
      const isLoginOperation =
        url.includes("/login") ||
        url.includes("/superadmin/login") ||
        url.includes("/admin/login") ||
        url.includes("/manager/login");

      // Don't auto-logout for lock/unlock operations, status checks, view details, or login attempts
      // Also don't auto-logout immediately after login (give session time to establish)
      const isRecentLogin =
        Date.now() - parseInt(localStorage.getItem("loginTime") || "0") < 5000; // 5 seconds grace period

      if (
        !isStatusOperation &&
        !isToggleOperation &&
        !isUnlockOperation &&
        !isLockOperation &&
        !isViewDetailsOperation &&
        !isLoginOperation &&
        !isRecentLogin
      ) {
        console.warn("⚠️ 401 error detected - auto-logging out");
        console.warn("⚠️ URL:", url);
        console.warn("⚠️ Is recent login:", isRecentLogin);
        // Silent logout - no console logs
        localStorage.removeItem("user");
        localStorage.removeItem("role");
        localStorage.removeItem("sessionId");
        localStorage.removeItem("loginTime");
        window.location.href = "/login";
      } else if (isRecentLogin) {
        console.log(
          "ℹ️ 401 error on recent login - ignoring (session establishing)"
        );
      }
    }
    // All other errors (403, 500, etc.) - silent handling, no console logs

    return Promise.reject(error);
  }
);

// Shared API endpoints (Super Admin and general)
// Note: Admin and Manager endpoints are now in separate files:
// - apiAdmin.js for admin endpoints
// - apiManager.js for manager endpoints
export const superAdminAPI = {
  // Super Admin
  superAdminLogin: (credentials) => api.post("/superadmin/login", credentials),
  getAllAdmins: () => api.get("/superadmin/admins"),
  getAdminDetails: (adminId) => api.get(`/superadmin/admins/${adminId}`),
  createAdmin: (adminData) => api.post("/superadmin/admins", adminData),
  suspendAdmin: (adminId, reason) =>
    api.post(`/superadmin/admins/${adminId}/suspend`, { reason }),
  resumeAdmin: (adminId) => api.post(`/superadmin/admins/${adminId}/resume`),
  getSuperAdminActivityLogs: () => api.get("/superadmin/logs"),
};

// Legacy export for backward compatibility (will be removed later)
// Use adminAPI from apiAdmin.js or managerAPI from apiManager.js instead
export const authAPI = {
  ...superAdminAPI,
};

export default api;
