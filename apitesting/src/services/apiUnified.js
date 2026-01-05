/**
 * Unified API Service
 *
 * This service uses a single login endpoint that automatically
 * detects user role (admin, superadmin, manager) from email.
 *
 * Endpoint: POST /api/auth/login
 */

import axios from "axios";
import { BACKEND_BASE_URL, API_BASE_URL } from "../config/api";

// Determine API base URL based on environment
// Production: Use full backend URL (Railway)
// Development: Use Vite proxy (/api)
const isProduction =
  import.meta.env.PROD ||
  import.meta.env.MODE === "production" ||
  (typeof window !== "undefined" &&
    (window.location.hostname.includes("railway.app") ||
      window.location.hostname.includes("up.railway.app")));

// Always use Railway backend URL if available, otherwise use proxy
const UNIFIED_API_BASE = (() => {
  // If we're on Railway frontend, ALWAYS use the production backend URL
  const isRailwayFrontend =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("railway.app") ||
      window.location.hostname.includes("up.railway.app"));

  if (isRailwayFrontend) {
    // Hardcode the Railway backend URL for production
    const railwayBackendUrl = "https://ackit-iot-production.up.railway.app";
    const url = `${railwayBackendUrl}/api/auth`;
    console.log("🔧 [PRODUCTION] Using Railway backend URL:", url);
    return url;
  }

  // Check if BACKEND_BASE_URL contains railway.app (production)
  if (
    BACKEND_BASE_URL &&
    typeof BACKEND_BASE_URL === "string" &&
    BACKEND_BASE_URL.includes("railway.app")
  ) {
    // Production: Use Railway backend URL
    const url = `${BACKEND_BASE_URL}/api/auth`;
    console.log("🔧 Using Railway backend URL from config:", url);
    return url;
  } else if (isProduction) {
    // Production but no Railway URL set - use full backend URL
    const url = `${BACKEND_BASE_URL}/api/auth`;
    console.log("🔧 Using production backend URL:", url);
    return url;
  } else {
    // Development: Use Vite proxy
    console.log("🔧 [DEVELOPMENT] Using Vite proxy: /api/auth");
    return "/api/auth";
  }
})();

console.log("🔧 Unified API Configuration:");
console.log("   isProduction:", isProduction);
console.log("   BACKEND_BASE_URL:", BACKEND_BASE_URL);
console.log("   UNIFIED_API_BASE:", UNIFIED_API_BASE);
console.log(
  "   window.location.hostname:",
  typeof window !== "undefined" ? window.location.hostname : "N/A"
);
console.log("   import.meta.env.PROD:", import.meta.env.PROD);
console.log("   import.meta.env.MODE:", import.meta.env.MODE);

// Create axios instance for unified auth
const apiUnified = axios.create({
  baseURL: UNIFIED_API_BASE,
  timeout: 30000,
  withCredentials: true, // Important for cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
apiUnified.interceptors.request.use(
  (config) => {
    console.log(
      "📤 Unified API Request:",
      config.method?.toUpperCase(),
      config.url
    );
    console.log("   └─ Full URL:", config.url);
    console.log("   └─ Target:", config.baseURL);
    console.log("   └─ With credentials: true");
    return config;
  },
  (error) => {
    console.error("❌ Unified API Request Error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiUnified.interceptors.response.use(
  (response) => {
    console.log(
      "📥 Unified API Response:",
      response.status,
      response.config.url
    );
    
    // Check for HTML response in interceptor (early detection)
    if (
      response.data &&
      typeof response.data === "string" &&
      (response.data.includes("<!doctype html>") ||
        response.data.includes("<html") ||
        response.data.includes("<!DOCTYPE"))
    ) {
      console.error("❌ [INTERCEPTOR] HTML response detected!");
      console.error("   This means request hit frontend instead of backend");
      console.error("   URL used:", response.config.url);
      console.error("   Base URL:", response.config.baseURL);
      
      // Reject with clear error
      const error = new Error("Backend connection error. Received HTML instead of JSON.");
      error.response = {
        status: 500,
        data: {
          message: "Received HTML response instead of JSON. Backend URL may be incorrect.",
        },
      };
      return Promise.reject(error);
    }
    
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      console.log(
        "ℹ️ 401 on unified login operation (expected during auto-detection) - not logging out"
      );
    } else {
      console.error("❌ Unified API Error:", error);
      console.error("   Error response:", error.response?.data);
    }
    return Promise.reject(error);
  }
);

/**
 * Unified Login - Auto-detects role from email
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise} Login response with user data and role
 */
export const unifiedLogin = async (email, password) => {
  try {
    console.log("🔐 Unified Login - Attempting login...");
    console.log("   Email:", email);
    console.log("   Using unified endpoint: /api/auth/login");

    const response = await apiUnified.post("/login", {
      email: email.trim(),
      password: password.trim(),
    });

    console.log("📥 Unified Login - Response received");
    console.log("   Response status:", response.status);
    console.log("   Response headers:", response.headers);
    console.log("   Response data type:", typeof response.data);
    console.log(
      "   Response data (first 200 chars):",
      typeof response.data === "string"
        ? response.data.substring(0, 200)
        : response.data
    );

    // Check if response is HTML (wrong endpoint) - MUST check BEFORE processing
    if (
      typeof response.data === "string" &&
      (response.data.includes("<!doctype html>") ||
        response.data.includes("<html") ||
        response.data.includes("<!DOCTYPE"))
    ) {
      console.error("❌ Unified Login - Received HTML instead of JSON!");
      console.error(
        "   This means the request hit the frontend server instead of backend"
      );
      console.error("   Actual URL used:", UNIFIED_API_BASE);
      console.error("   Expected: Railway backend URL");
      console.error("   Got: HTML page (frontend server)");

      const error = new Error(
        "Backend connection error. Received HTML instead of JSON."
      );
      error.status = 500;
      error.response = {
        message:
          "Received HTML response instead of JSON. Backend URL may be incorrect.",
      };
      throw error;
    }

    // Only log success if we have valid JSON
    console.log("✅ Unified Login - Success! (Valid JSON response)");

    // Validate response structure
    if (!response.data || typeof response.data !== "object") {
      console.error("❌ Unified Login - Invalid response format!");
      console.error("   Response data:", response.data);
      throw {
        message: "Invalid response from server. Please try again.",
        status: 500,
        response: response.data,
        error: new Error("Invalid response format"),
      };
    }

    console.log("   User role:", response.data.user?.role);
    console.log("   Response role:", response.data.role);

    return {
      success: true,
      user: response.data.user,
      token: response.data.token,
      role: response.data.role || response.data.user?.role,
      message: response.data.message,
    };
  } catch (error) {
    console.error("❌ Unified Login Error:", error);
    console.error("   Error message:", error.message);
    console.error("   Error response:", error.response?.data);
    console.error("   Error status:", error.response?.status);

    // Extract error message
    const errorMessage =
      error.response?.data?.message || error.message || "Login failed";

    throw {
      message: errorMessage,
      status: error.response?.status,
      response: error.response?.data,
      error: error,
    };
  }
};

export default apiUnified;
