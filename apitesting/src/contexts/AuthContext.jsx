import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiAdmin } from '../services/apiAdmin';
import { apiManager } from '../services/apiManager';
import { markAdminLogin } from '../services/apiAdmin';
import { markManagerLogin } from '../services/apiManager';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user data exists in localStorage
        const storedUser = localStorage.getItem('user');
        const storedRole = localStorage.getItem('role');
        
        console.log('AuthContext - Checking stored data:');
        console.log('  Stored user:', storedUser);
        console.log('  Stored role:', storedRole);
        
        if (storedUser && storedRole) {
          try {
            const parsedUser = JSON.parse(storedUser);
            console.log('  Parsed user:', parsedUser);
            
            // Validate parsed user has required fields
            if (parsedUser && parsedUser.email && parsedUser.role) {
              setUser(parsedUser);
              console.log('✅ User restored from localStorage');
            } else {
              console.warn('⚠️ Invalid user data in localStorage, clearing...');
              // Clear invalid data directly
              localStorage.removeItem('user');
              localStorage.removeItem('role');
              localStorage.removeItem('sessionId');
              setUser(null);
            }
          } catch (parseError) {
            console.error('❌ Failed to parse user data from localStorage:', parseError);
            // Clear corrupted data directly
            localStorage.removeItem('user');
            localStorage.removeItem('role');
            localStorage.removeItem('sessionId');
            setUser(null);
          }
        } else {
          console.log('ℹ️ No stored user data found');
        }
      } catch (error) {
        console.error('❌ Auth check failed:', error);
        // Don't logout on check error, just set loading to false
      }
      setLoading(false);
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email, password, role) => {
    try {
      let endpoint = '';
      switch (role) {
        case 'superadmin':
          endpoint = '/superadmin/login';
          break;
        case 'admin':
          endpoint = '/admin/login';
          break;
        case 'manager':
          endpoint = '/manager/login';
          break;
        default:
          throw new Error('Invalid role');
      }

      console.log('Attempting login:', { email, role, endpoint });
      
      // Use proxy-based API clients (apiAdmin/apiManager) instead of direct connection
      // This ensures cookies work properly with Vite proxy
      let response;
      if (role === 'admin') {
        response = await apiAdmin.post(endpoint, { email, password });
      } else if (role === 'manager') {
        response = await apiManager.post(endpoint, { email, password });
      } else {
        // SuperAdmin uses direct connection (no proxy needed for now)
        const { api } = await import('../services/api');
        response = await api.post(endpoint, { email, password });
      }
      
      console.log('Login response:', response.data);
      
      if (response.data.success) {
        // Handle different response structures
        const userData = response.data.data?.user || response.data.user || response.data.data;
        const sessionId = response.data.data?.sessionId || response.data.sessionId;
        
        if (!userData) {
          console.error('No user data in response:', response.data);
          throw new Error('Login response missing user data');
        }
        
        console.log('Login successful - User data:', userData);
        console.log('Login successful - Session ID:', sessionId);
        console.log('Login successful - Role:', role);
        
        // Ensure userData has required fields
        const userDataToStore = {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role || role,
          status: userData.status,
          ...userData
        };
        
        // Store user data and session info (session is handled by cookies)
        localStorage.setItem('user', JSON.stringify(userDataToStore));
        localStorage.setItem('role', userDataToStore.role || role);
        if (sessionId) {
          localStorage.setItem('sessionId', sessionId);
        }
        
        // Set user state immediately
        setUser(userDataToStore);
        
        console.log('✅ User set in context:', userDataToStore);
        console.log('✅ User stored in localStorage:', JSON.parse(localStorage.getItem('user')));
        console.log('✅ Role stored:', localStorage.getItem('role'));
        
        // Mark login time for grace period (prevents immediate logout on 401 errors)
        if (role === 'admin') {
          markAdminLogin();
        } else if (role === 'manager') {
          markManagerLogin();
        }
        
        // Small delay to ensure state is updated and session cookie is set
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify state was set correctly
        const verifyUser = localStorage.getItem('user');
        const verifyRole = localStorage.getItem('role');
        console.log('✅ Verification - User in localStorage:', verifyUser ? 'Present' : 'Missing');
        console.log('✅ Verification - Role in localStorage:', verifyRole || 'Missing');
        
        return { success: true, user: userDataToStore };
      } else {
        const errorMessage = response.data.message || 'Login failed';
        console.error('Login failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        code: error.code,
        isNetworkError: error.isNetworkError,
        config: error.config
      });
      
      // Handle network errors (backend not reachable)
      if (!error.response || error.isNetworkError || error.code === 'ERR_NETWORK') {
        const errorMsg = error.message || 'Network error';
        console.error('🔴 Network Error Details:');
        console.error('  - Backend may not be running');
        console.error('  - Vite proxy may not be configured correctly');
        console.error('  - Check if backend is accessible at:', error.config?.baseURL || '/api');
        throw new Error('Unable to connect to server. Please ensure the backend server is running and the Vite dev server proxy is configured correctly.');
      }
      
      // Provide more helpful error messages
      if (error.response?.status === 401) {
        throw new Error(error.response?.data?.message || 'Invalid email or password');
      } else if (error.response?.status === 403) {
        throw new Error(error.response?.data?.message || 'Access denied');
      } else if (error.response?.status >= 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.removeItem('sessionId');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
    role: user?.role || localStorage.getItem('role')
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
