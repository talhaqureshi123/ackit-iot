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

// Track login time to prevent immediate logout after login
let lastLoginTime = 0;
const LOGIN_GRACE_PERIOD = 5000; // 5 seconds grace period after login

export const apiManager = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased to 30 seconds to match main api.js
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Enable cookies for session-based auth
});

// Function to mark login time (called after successful login)
export const markManagerLogin = () => {
  lastLoginTime = Date.now();
  console.log("✅ Manager login marked, grace period started");
};

// Request interceptor for session-based auth
apiManager.interceptors.request.use(
  (config) => {
    // Check if session cookie exists (httpOnly cookies won't be visible, but we can check if any cookies exist)
    const cookies = document.cookie || "";
    const hasSessionCookie = cookies.includes("ackit.sid");
    
    // Log cookie status for debugging (only on first request or if cookie is missing)
    if (!hasSessionCookie && localStorage.getItem("user")) {
      console.warn("⚠️ Manager API Request - Session cookie not found in document.cookie");
      console.warn("  Note: httpOnly cookies may not be visible, but should still be sent automatically");
      console.warn("  If requests fail with 401, the cookie may not be set or has wrong domain/path");
    }
    
    // Session is handled automatically by cookies via withCredentials: true
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiManager.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error("Manager API Error:", error);
    console.error("Error response:", error.response);

    // Handle network errors (no response from server)
    if (!error.response) {
      // Network error: ECONNREFUSED, ECONNRESET, timeout, etc.
      const errorMessage = error.message || "Network error";
      const errorCode = error.code || "NETWORK_ERROR";

      console.error("🔴 Manager API - Network Error (No Response):");
      console.error("  Message:", errorMessage);
      console.error("  Code:", errorCode);
      console.error("  URL:", error.config?.url);

      // Don't redirect on network errors - just log and reject
      // The UI should handle this gracefully
      return Promise.reject({
        ...error,
        isNetworkError: true,
        message:
          "Unable to connect to server. Please check if the backend is running.",
      });
    }

    if (error.response?.status === 401) {
      // Session expired or invalid
      // Don't auto-logout for certain operations as they might fail for other reasons
      const url = error.config?.url || "";
      const isStatusOperation = false; // Status operations removed
      const isToggleOperation =
        url.includes("/toggle") || url.includes("/power");
      const isUnlockOperation =
        url.includes("/unlock") && !url.includes("/system/unlock");
      const isLockOperation =
        url.includes("/lock") &&
        !url.includes("/lock/from-remote") &&
        !url.includes("/system/lock");
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

      // Check if we're in grace period after login
      const loginTime = parseInt(localStorage.getItem("loginTime") || "0");
      const timeSinceLogin = Date.now() - Math.max(lastLoginTime, loginTime);
      const isInGracePeriod = timeSinceLogin < LOGIN_GRACE_PERIOD;

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

      // Check cookies (note: httpOnly cookies won't be visible in document.cookie)
      const cookies = document.cookie || "";
      // Note: ackit.sid is httpOnly, so it won't appear in document.cookie
      // But we can check if any cookies are being sent
      const hasAnyCookies = cookies.length > 0;
      
      // Log detailed error info for debugging
      console.error("🔴 Manager API - 401 Error Details:");
      console.error("  URL:", url);
      console.error("  Request Headers:", error.config?.headers);
      console.error("  Response:", error.response?.data);
      console.error("  Cookies visible in document.cookie:", cookies || "(none)");
      console.error("  Note: httpOnly cookies (ackit.sid) won't be visible here");
      console.error("  localStorage user:", localStorage.getItem("user"));
      console.error("  localStorage role:", localStorage.getItem("role"));
      console.error("  Time since login:", timeSinceLogin, "ms");
      console.error("  In grace period:", isInGracePeriod);
      console.error("  Has user data:", hasUserData);

      // CRITICAL: If we have user data but are getting 401s after grace period,
      // it likely means the session cookie wasn't set or expired
      // Check if it's been more than 1 minute since login (beyond grace period)
      const SESSION_TIMEOUT_THRESHOLD = 60000; // 1 minute
      const isBeyondGracePeriod = timeSinceLogin > SESSION_TIMEOUT_THRESHOLD;
      
      // If we have user data but are getting 401s and it's been more than 1 minute,
      // the session likely expired or was never properly set
      if (hasUserData && isBeyondGracePeriod && !isInGracePeriod) {
        console.error("❌ 401 error with user data after grace period - session likely expired");
        console.error("  Time since login:", Math.round(timeSinceLogin / 1000), "seconds");
        console.error("  This indicates the session cookie was never set or has expired");
        console.error("  Clearing localStorage and redirecting to login...");
        
        // Clear all auth data
        localStorage.removeItem("user");
        localStorage.removeItem("role");
        localStorage.removeItem("sessionId");
        localStorage.removeItem("loginTime");
        
        // Redirect to login with clear message
        setTimeout(() => {
          window.location.href = "/login?session=expired";
        }, 100);
        
        return Promise.reject({
          ...error,
          isSessionExpired: true,
          message: "Session expired. Please login again.",
        });
      }

      // Don't auto-logout if we're in grace period after login
      if (isInGracePeriod) {
        console.log(
          `⚠️ Manager API - 401 error during login grace period, not logging out`
        );
        return Promise.reject(error);
      }
      
      // If we have user data but it's been less than 1 minute, might be a temporary issue
      // Don't logout immediately, but log a warning
      if (hasUserData && !isBeyondGracePeriod) {
        console.warn(
          `⚠️ Manager API - 401 error with user data (${Math.round(timeSinceLogin / 1000)}s since login)`
        );
        console.warn("  This might be a temporary session issue. Not logging out yet.");
        return Promise.reject(error);
      }

      // Don't auto-logout for lock/unlock operations, status checks, or view details
      if (
        !isStatusOperation &&
        !isToggleOperation &&
        !isUnlockOperation &&
        !isLockOperation &&
        !isViewDetailsOperation
      ) {
        console.log("Session expired, redirecting to login");
        localStorage.removeItem("user");
        localStorage.removeItem("role");
        localStorage.removeItem("sessionId");
        localStorage.removeItem("loginTime"); // Clear login time on auto-logout
        window.location.href = "/login";
      } else {
        const operationType = isLockOperation
          ? "lock"
          : isUnlockOperation
          ? "unlock"
          : isStatusOperation
          ? "status"
          : isViewDetailsOperation
          ? "view-details"
          : "toggle";
        console.log(
          `⚠️ Manager API - 401 error on ${operationType} operation (${url}) - may be session issue but not logging out automatically`
        );
        console.log(
          "  Error message:",
          error.response?.data?.message || "Unknown error"
        );
      }
    } else if (error.response?.status === 403) {
      // Access denied
      console.log("Access denied");
      // Don't redirect, just show error
    } else if (error.response?.status >= 500) {
      // Server error
      console.log("Server error:", error.response?.data?.message);
    }

    return Promise.reject(error);
  }
);

// Manager API endpoints ONLY
export const managerAPI = {
  // Authentication
  managerLogin: (credentials) => apiManager.post("/manager/login", credentials),

  // Organization Management
  getAssignedOrganizations: () => apiManager.get("/manager/organizations"),
  getOrganizationDetails: (orgId) =>
    apiManager.get(`/manager/organizations/${orgId}`),
  setOrganizationTemperature: (orgId, temperature) =>
    apiManager.patch(`/manager/organizations/${orgId}/temperature`, {
      temperature,
    }),
  setVenueTemperature: (venueId, temperature) =>
    apiManager.patch(`/manager/venues/${venueId}/temperature`, {
      temperature,
    }),
  toggleOrganizationPower: (organizationId, powerState) =>
    apiManager.patch(`/manager/organizations/${organizationId}/power`, {
      powerState,
    }),
  toggleVenuePower: (venueId, powerState) =>
    apiManager.patch(`/manager/venues/${venueId}/power`, {
      powerState,
    }),

  // AC Management
  getManagerACs: () => apiManager.get("/manager/acs"),
  setACTemperature: (acId, temperature) =>
    apiManager.patch(`/manager/acs/${acId}/temperature`, { temperature }),
  toggleManagerACPower: (acId, isOn) =>
    apiManager.patch(`/manager/acs/${acId}/power`, { isOn }),
  lockAC: (acId) => apiManager.post(`/manager/acs/${acId}/lock`),
  unlockAC: (acId) => apiManager.post(`/manager/acs/${acId}/unlock`),

  // Activity Logging
  logManagerAction: (action, details) =>
    apiManager.post("/manager/log-action", { action, details }),

  // Alerts
  getManagerActiveAlerts: () => apiManager.get("/manager/alerts"),
  checkManagerAlerts: () => apiManager.post("/manager/alerts/check"),

  // Energy Consumption
  getACEnergy: (acId) => apiManager.get(`/manager/acs/${acId}/energy`),
  getOrganizationEnergy: (organizationId) =>
    apiManager.get(`/manager/organizations/${organizationId}/energy`),
  getEnergyReport: () => apiManager.get("/manager/energy/report"),

  // Events Management
  getEvents: () => apiManager.get("/manager/events"),
  getEvent: (eventId) => apiManager.get(`/manager/events/${eventId}`),
  createEvent: (eventData) => apiManager.post("/manager/events", eventData),
  updateEvent: (eventId, eventData) =>
    apiManager.patch(`/manager/events/${eventId}`, eventData),
  deleteEvent: (eventId) => apiManager.delete(`/manager/events/${eventId}`),
  startEvent: (eventId) => apiManager.post(`/manager/events/${eventId}/start`),
  stopEvent: (eventId) => apiManager.post(`/manager/events/${eventId}/stop`),
  disableEvent: (eventId) =>
    apiManager.post(`/manager/events/${eventId}/disable`),
  enableEvent: (eventId) =>
    apiManager.post(`/manager/events/${eventId}/enable`),

  // Remote Lock Management
  remoteLockOrganization: (organizationId, reason) =>
    apiManager.post(`/manager/organizations/${organizationId}/remote-lock`, {
      reason,
    }),
  remoteUnlockOrganization: (organizationId) =>
    apiManager.post(`/manager/organizations/${organizationId}/remote-unlock`),
  remoteLockVenue: (venueId, reason) =>
    apiManager.post(`/manager/venues/${venueId}/remote-lock`, { reason }),
  remoteUnlockVenue: (venueId) =>
    apiManager.post(`/manager/venues/${venueId}/remote-unlock`),
  remoteLockAC: (acId, reason) =>
    apiManager.post(`/manager/acs/${acId}/remote-lock`, { reason }),
  remoteUnlockAC: (acId) =>
    apiManager.post(`/manager/acs/${acId}/remote-unlock`),

  // Details
  getVenueDetails: (venueId) => apiManager.get(`/manager/venues/${venueId}`),
  getACDetails: (acId) => apiManager.get(`/manager/acs/${acId}`),
};

export default apiManager;
