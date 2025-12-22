import axios from "axios";
import { BACKEND_BASE_URL } from "../config/api";

// Determine API base URL based on environment
// Production: Use full backend URL (Railway)
// Development: Use Vite proxy (/api)
const isProduction = import.meta.env.PROD || import.meta.env.MODE === "production";
const API_BASE_URL = isProduction 
  ? `${BACKEND_BASE_URL}/api`  // Production: Full backend URL
  : "/api";  // Development: Vite proxy

// Track login time to prevent immediate logout after login
let lastLoginTime = 0;
const LOGIN_GRACE_PERIOD = 5000; // 5 seconds grace period after login

export const apiAdmin = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased to 30 seconds to match main api.js
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Enable cookies for session-based auth
});

// Function to mark login time (called after successful login)
export const markAdminLogin = () => {
  lastLoginTime = Date.now();
  console.log("✅ Admin login marked, grace period started");
};

// Request interceptor for session-based auth
apiAdmin.interceptors.request.use(
  (config) => {
    // Session is handled automatically by cookies
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiAdmin.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error("Admin API Error:", error);
    console.error("Error response:", error.response);

    // Handle network errors (no response from server)
    if (!error.response) {
      // Network error: ECONNREFUSED, ECONNRESET, timeout, etc.
      const errorMessage = error.message || "Network error";
      const errorCode = error.code || "NETWORK_ERROR";

      console.error("🔴 Admin API - Network Error (No Response):");
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
        url.includes("/organizations/") && url.match(/\/organizations\/[^/]+$/); // Pattern: /organizations/{id} but not /organizations/{id}/something

      // Check if we're in grace period after login
      const timeSinceLogin = Date.now() - lastLoginTime;
      const isInGracePeriod = timeSinceLogin < LOGIN_GRACE_PERIOD;

      // Log detailed error info for debugging
      console.error("🔴 Admin API - 401 Error Details:");
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
          "⚠️ Admin API - 401 error during login grace period, not logging out"
        );
        return Promise.reject(error);
      }

      // Don't auto-logout for lock/unlock operations, status checks, or view details (these might fail for reasons other than session)
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
          `⚠️ Admin API - 401 error on ${operationType} operation (${url}) - may be session issue but not logging out automatically`
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

// Admin API endpoints ONLY
export const adminAPI = {
  // Authentication
  adminLogin: (credentials) => apiAdmin.post("/admin/login", credentials),

  // Manager Management
  getMyManagers: () => apiAdmin.get("/admin/my-managers"),
  createManager: (managerData) => apiAdmin.post("/admin/managers", managerData),
  lockManager: (managerId, reason) =>
    apiAdmin.post("/admin/managers/lock", { managerId, lockReason: reason }),
  unlockManager: (managerId) =>
    apiAdmin.post("/admin/managers/unlock", { managerId }),
  restrictedUnlockManager: (managerId) =>
    apiAdmin.post("/admin/managers/restricted-unlock", { managerId }),

  // Organization Management
  getOrganizations: () => apiAdmin.get("/admin/organizations"),
  createOrganization: (orgData) =>
    apiAdmin.post("/admin/organizations", orgData),
  getOrganizationDetails: (orgId) =>
    apiAdmin.get(`/admin/organizations/${orgId}`),
  getOrganizationEnergy: (organizationId) =>
    apiAdmin.get(`/admin/organizations/${organizationId}/energy`),
  setAdminOrganizationTemperature: (orgId, temperature) =>
    apiAdmin.patch(`/admin/organizations/${orgId}/temperature`, {
      temperature,
    }),
  toggleOrganizationPower: (organizationId, powerState) =>
    apiAdmin.patch(`/admin/organizations/${organizationId}/power`, {
      powerState,
    }),
  lockOrganization: (organizationId, reason) =>
    apiAdmin.post(`/admin/organizations/${organizationId}/lock`, { reason }),
  unlockOrganization: (organizationId) =>
    apiAdmin.post(`/admin/organizations/${organizationId}/unlock`),
  remoteLockOrganization: (organizationId, reason) =>
    apiAdmin.post(`/admin/organizations/${organizationId}/remote-lock`, {
      reason,
    }),
  remoteUnlockOrganization: (organizationId) =>
    apiAdmin.post(`/admin/organizations/${organizationId}/remote-unlock`),
  remoteLockVenue: (venueId, reason) =>
    apiAdmin.post(`/admin/venues/${venueId}/remote-lock`, { reason }),
  remoteUnlockVenue: (venueId) =>
    apiAdmin.post(`/admin/venues/${venueId}/remote-unlock`),
  deleteOrganization: (organizationId) =>
    apiAdmin.delete(`/admin/organizations/${organizationId}`),
  unassignOrganizationFromManager: (organizationId) =>
    apiAdmin.post("/admin/unassign-organization", { organizationId }),
  assignManagerToOrganizations: (managerId, organizationIds) =>
    apiAdmin.post(`/admin/managers/${managerId}/assign`, { organizationIds }),

  // Manager Status Management
  lockManager: (managerId, reason) =>
    apiAdmin.post("/admin/managers/lock", { managerId, reason }),
  unlockManager: (managerId) =>
    apiAdmin.post("/admin/managers/unlock", { managerId }),
  restrictedUnlockManager: (managerId) =>
    apiAdmin.post("/admin/managers/restricted-unlock", { managerId }),

  // Venue Management
  getVenues: () => apiAdmin.get("/admin/venues"),
  getVenueDetails: (venueId) => apiAdmin.get(`/admin/venues/${venueId}`),
  createVenue: (venueData) => apiAdmin.post("/admin/venues", venueData),
  deleteVenue: (venueId) => apiAdmin.delete(`/admin/venues/${venueId}`),
  toggleVenuePower: (venueId, powerState) =>
    apiAdmin.patch(`/admin/venues/${venueId}/power`, { powerState }),
  setVenueTemperature: (venueId, temperature) =>
    apiAdmin.patch(`/admin/venues/${venueId}/temperature`, { temperature }),

  // AC Management
  getACs: () => apiAdmin.get("/admin/acs"),
  createAC: (acData) => apiAdmin.post("/admin/acs", acData),
  getACDetails: (acId) => apiAdmin.get(`/admin/acs/${acId}`),
  deleteAC: (acId) => apiAdmin.delete(`/admin/acs/${acId}`),
  getACEnergy: (acId) => apiAdmin.get(`/admin/acs/${acId}/energy`),
  setAdminACTemperature: (acId, temperature) =>
    apiAdmin.patch(`/admin/acs/${acId}/temperature`, { temperature }),
  toggleAdminACPower: (acId, status) =>
    apiAdmin.patch(`/admin/acs/${acId}/status`, { status }),
  toggleACLockStatus: (acId, action, reason) => {
    // Admin endpoint for lock/unlock AC device
    return apiAdmin.patch(`/admin/acs/${acId}/lock`, { action, reason });
  },
  setACMode: (acId, mode) =>
    apiAdmin.patch(`/admin/acs/${acId}/mode`, { mode }),
  calculateACEnergy: (acId) =>
    apiAdmin.post(`/admin/acs/${acId}/energy/calculate`),

  // Dashboard & Logs
  getDashboard: () => apiAdmin.get("/admin/dashboard"),
  getActivityLogs: () => apiAdmin.get("/admin/logs/filter"),

  // System Control
  lockSystem: () => apiAdmin.post("/admin/system/lock"),
  unlockSystem: () => apiAdmin.post("/admin/system/unlock"),
  getSystemStatus: () => apiAdmin.get("/admin/system/status"),
  adminLockSystemFromRemote: (reason) =>
    apiAdmin.post("/admin/lock/from-remote", { reason }),

  // Alerts
  getActiveAlerts: () => apiAdmin.get("/admin/alerts"),
  checkAlerts: () => apiAdmin.post("/admin/alerts/check"),

  // Events Management
  getEvents: () => apiAdmin.get("/admin/events"),
  getEvent: (eventId) => apiAdmin.get(`/admin/events/${eventId}`),
  createEvent: (eventData) => apiAdmin.post("/admin/events", eventData),
  updateEvent: (eventId, eventData) =>
    apiAdmin.patch(`/admin/events/${eventId}`, eventData),
  deleteEvent: (eventId) => apiAdmin.delete(`/admin/events/${eventId}`),
  startEvent: (eventId) => apiAdmin.post(`/admin/events/${eventId}/start`),
  stopEvent: (eventId) => apiAdmin.post(`/admin/events/${eventId}/stop`),
  disableEvent: (eventId) => apiAdmin.post(`/admin/events/${eventId}/disable`),
  enableEvent: (eventId) => apiAdmin.post(`/admin/events/${eventId}/enable`),
};

export default apiAdmin;
