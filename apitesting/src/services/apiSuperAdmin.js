import axios from "axios";
import { BACKEND_BASE_URL, BACKEND_IP, BACKEND_PORT } from "../config/api";

// Determine API base URL based on environment
// Production: Use full backend URL (Railway)
// Development: Use Vite proxy (/api)
const isProduction =
  import.meta.env.PROD || import.meta.env.MODE === "production";
const USE_PROXY = !isProduction; // Use proxy in development
const API_BASE_URL = isProduction
  ? `${BACKEND_BASE_URL}/api` // Production: Full backend URL
  : "/api"; // Development: Vite proxy

// Track login time to prevent immediate logout after login
let lastLoginTime = 0;
const LOGIN_GRACE_PERIOD = 30000; // 30 seconds grace period after login

export const apiSuperAdmin = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Enable cookies for session-based auth
});

// Function to mark login time (called after successful login)
export const markSuperAdminLogin = () => {
  lastLoginTime = Date.now();
  console.log("✅ SuperAdmin login marked, grace period started");
};

// Request interceptor for session-based auth
apiSuperAdmin.interceptors.request.use(
  (config) => {
    // Log request for debugging
    console.log(
      `📤 SuperAdmin API Request: ${config.method?.toUpperCase()} ${config.url}`
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
apiSuperAdmin.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
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

      // CRITICAL: Never logout on login operations - these are expected to fail during auto-detection
      if (isLoginOperation) {
        console.log(
          "ℹ️ 401 on login operation (expected during auto-detection) - not logging out"
        );
        return Promise.reject(error); // DO NOT logout on login attempts
      }

      // Don't auto-logout for lock/unlock operations, status checks, view details
      // Also don't auto-logout immediately after login (give session time to establish)
      const loginTime = parseInt(localStorage.getItem("loginTime") || "0");
      const timeSinceLogin = Date.now() - loginTime;
      const isRecentLogin = timeSinceLogin < LOGIN_GRACE_PERIOD; // Use same grace period constant

      // Check both localStorage loginTime and in-memory lastLoginTime (for SuperAdmin)
      const isRecentLoginInMemory =
        Date.now() - lastLoginTime < LOGIN_GRACE_PERIOD;
      const isRecentLoginAny = isRecentLogin || isRecentLoginInMemory;

      // Also check if we have user data in localStorage - if yes, don't clear on first 401
      // Check both localStorage role key AND user object's role field (fallback)
      const storedUser = localStorage.getItem("user");
      const storedRole = localStorage.getItem("role");
      let userRoleFromObject = null;

      try {
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          userRoleFromObject = parsedUser?.role;
        }
      } catch (e) {
        // Ignore parse errors
      }

      // hasUserData = true if we have user AND (role key OR role in user object)
      const hasUserData =
        !!storedUser && (!!storedRole || !!userRoleFromObject);

      console.log("🔍 SuperAdmin API Interceptor - 401 Error Check:");
      console.log("  URL:", url);
      console.log("  Login time (localStorage):", loginTime);
      console.log("  Login time (in-memory):", lastLoginTime);
      console.log("  Time since login (localStorage):", timeSinceLogin, "ms");
      console.log(
        "  Time since login (in-memory):",
        Date.now() - lastLoginTime,
        "ms"
      );
      console.log("  Is recent login (localStorage):", isRecentLogin);
      console.log("  Is recent login (in-memory):", isRecentLoginInMemory);
      console.log("  Is recent login (any):", isRecentLoginAny);
      console.log("  Has user data:", hasUserData);
      console.log("  Stored user:", storedUser ? "Present" : "Missing");
      console.log("  Stored role (key):", storedRole || "Missing");
      console.log(
        "  User role (from object):",
        userRoleFromObject || "Missing"
      );
      console.log("  Is login operation:", isLoginOperation);

      if (
        !isStatusOperation &&
        !isToggleOperation &&
        !isUnlockOperation &&
        !isLockOperation &&
        !isViewDetailsOperation &&
        !isLoginOperation &&
        !isRecentLoginAny &&
        !hasUserData // Don't clear if we have user data (might be session issue, not auth issue)
      ) {
        console.warn("⚠️ 401 error detected - auto-logging out");
        console.warn("⚠️ URL:", url);
        console.warn("⚠️ Is recent login (any):", isRecentLoginAny);
        console.warn("⚠️ Has user data:", hasUserData);
        // Silent logout - no console logs
        localStorage.removeItem("user");
        localStorage.removeItem("role");
        localStorage.removeItem("sessionId");
        localStorage.removeItem("loginTime");
        lastLoginTime = 0; // Reset in-memory login time
        window.location.href = "/login";
      } else if (isRecentLoginAny || hasUserData) {
        console.log(
          "ℹ️ 401 error on recent login or with user data - ignoring (session establishing or session issue)"
        );
        console.log(
          "  Reason:",
          isRecentLoginAny ? "Recent login" : "Has user data"
        );
      }
    }
    // All other errors (403, 500, etc.) - silent handling, no console logs

    return Promise.reject(error);
  }
);

// SuperAdmin API endpoints
export const superAdminAPI = {
  // Super Admin
  superAdminLogin: (credentials) =>
    apiSuperAdmin.post("/superadmin/login", credentials),
  getAllAdmins: () => apiSuperAdmin.get("/superadmin/admins"),
  getAdminDetails: (adminId) =>
    apiSuperAdmin.get(`/superadmin/admins/${adminId}`),
  createAdmin: (adminData) =>
    apiSuperAdmin.post("/superadmin/admins", adminData),
  suspendAdmin: (adminId, reason) =>
    apiSuperAdmin.post(`/superadmin/admins/${adminId}/suspend`, { reason }),
  resumeAdmin: (adminId) =>
    apiSuperAdmin.post(`/superadmin/admins/${adminId}/resume`),
  getSuperAdminActivityLogs: () => apiSuperAdmin.get("/superadmin/logs"),
  updateAdminPlan: (adminId, planData) =>
    apiSuperAdmin.patch(`/superadmin/admins/${adminId}/plan`, planData),
  getPlanRequests: () => apiSuperAdmin.get("/superadmin/plan-requests"),
  approvePlanRequest: (requestId) =>
    apiSuperAdmin.post(`/superadmin/plan-requests/${requestId}/approve`),
  rejectPlanRequest: (requestId, reason) =>
    apiSuperAdmin.post(`/superadmin/plan-requests/${requestId}/reject`, {
      reason,
    }),
};

export default apiSuperAdmin;
