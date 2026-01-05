/**
 * Unified API Service
 * 
 * This service uses a single login endpoint that automatically
 * detects user role (admin, superadmin, manager) from email.
 * 
 * Endpoint: POST /api/auth/login
 */

import axios from 'axios';
import { BACKEND_BASE_URL, API_BASE_URL } from '../config/api';

// Determine API base URL based on environment
// Production: Use full backend URL (Railway)
// Development: Use Vite proxy (/api)
const isProduction =
  import.meta.env.PROD || import.meta.env.MODE === "production";
const UNIFIED_API_BASE = isProduction
  ? `${BACKEND_BASE_URL}/api/auth` // Production: Full backend URL
  : "/api/auth"; // Development: Vite proxy

// Create axios instance for unified auth
const apiUnified = axios.create({
  baseURL: UNIFIED_API_BASE,
  timeout: 30000,
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiUnified.interceptors.request.use(
  (config) => {
    console.log('📤 Unified API Request:', config.method?.toUpperCase(), config.url);
    console.log('   └─ Full URL:', config.url);
    console.log('   └─ Target:', config.baseURL);
    console.log('   └─ With credentials: true');
    return config;
  },
  (error) => {
    console.error('❌ Unified API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiUnified.interceptors.response.use(
  (response) => {
    console.log('📥 Unified API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      console.log('ℹ️ 401 on unified login operation (expected during auto-detection) - not logging out');
    } else {
      console.error('❌ Unified API Error:', error);
      console.error('   Error response:', error.response?.data);
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
    console.log('🔐 Unified Login - Attempting login...');
    console.log('   Email:', email);
    console.log('   Using unified endpoint: /api/auth/login');
    
    const response = await apiUnified.post('/login', {
      email: email.trim(),
      password: password.trim(),
    });

    console.log('✅ Unified Login - Success!');
    console.log('   Response:', response.data);
    console.log('   User role:', response.data.user?.role);
    
    return {
      success: true,
      user: response.data.user,
      token: response.data.token,
      role: response.data.role || response.data.user?.role,
      message: response.data.message,
    };
  } catch (error) {
    console.error('❌ Unified Login Error:', error);
    console.error('   Error message:', error.message);
    console.error('   Error response:', error.response?.data);
    console.error('   Error status:', error.response?.status);
    
    // Extract error message
    const errorMessage = error.response?.data?.message || error.message || 'Login failed';
    
    throw {
      message: errorMessage,
      status: error.response?.status,
      response: error.response?.data,
      error: error,
    };
  }
};

export default apiUnified;

