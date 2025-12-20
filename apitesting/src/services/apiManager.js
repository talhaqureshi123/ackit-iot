import axios from "axios";

// Use relative URL - Vite proxy will forward to backend
// This makes requests same-origin so cookies work properly
const API_BASE_URL = "/api";

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
    // Session is handled automatically by cookies
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

      // Check if we're in grace period after login
      const loginTime = parseInt(localStorage.getItem("loginTime") || "0");
      const timeSinceLogin = Date.now() - Math.max(lastLoginTime, loginTime);
      const isInGracePeriod = timeSinceLogin < LOGIN_GRACE_PERIOD;

      // Log detailed error info for debugging
      console.error("🔴 Manager API - 401 Error Details:");
      console.error("  URL:", url);
      console.error("  Request Headers:", error.config?.headers);
      console.error("  Response:", error.response?.data);
      console.error("  Cookies sent:", document.cookie);
      console.error("  localStorage user:", localStorage.getItem("user"));
      console.error("  localStorage role:", localStorage.getItem("role"));
      console.error("  Time since login:", timeSinceLogin, "ms");
      console.error("  In grace period:", isInGracePeriod);

      // Don't auto-logout if we're in grace period after login
      if (isInGracePeriod) {
        console.log(
          "⚠️ Manager API - 401 error during login grace period, not logging out"
        );
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
