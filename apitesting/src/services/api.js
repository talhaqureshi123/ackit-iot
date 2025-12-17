import axios from "axios";
import { API_BASE_URL, BACKEND_IP, BACKEND_PORT } from "../config/api";

// Use Vite proxy by default (relative URL goes through vite.config.js proxy)
// This avoids IP configuration issues and works better with cookies
// To use direct connection, change "/api" to API_BASE_URL
const USE_PROXY = true; // Set to false to use direct connection

export const api = axios.create({
  baseURL: USE_PROXY ? "/api" : API_BASE_URL, // Use proxy or direct connection
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
    // Session is handled automatically by cookies
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

      // Don't auto-logout for lock/unlock operations, status checks, or view details
      if (
        !isStatusOperation &&
        !isToggleOperation &&
        !isUnlockOperation &&
        !isLockOperation &&
        !isViewDetailsOperation
      ) {
        // Silent logout - no console logs
        localStorage.removeItem("user");
        localStorage.removeItem("role");
        localStorage.removeItem("sessionId");
        window.location.href = "/login";
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
