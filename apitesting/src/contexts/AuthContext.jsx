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
        console.log('  All localStorage keys:', Object.keys(localStorage));
        
        if (storedUser && storedRole) {
          try {
            const parsedUser = JSON.parse(storedUser);
            console.log('  Parsed user:', parsedUser);
            
            // Validate parsed user has required fields
            if (parsedUser && parsedUser.email && parsedUser.role) {
              // CRITICAL: Set user state immediately to prevent redirect
              setUser(parsedUser);
              console.log('✅ User restored from localStorage');
              console.log('✅ Restored user details:', {
                id: parsedUser.id,
                email: parsedUser.email,
                role: parsedUser.role,
                name: parsedUser.name
              });
              // Set loading to false immediately after setting user
              setLoading(false);
              return; // Exit early since we have valid user
            } else {
              console.warn('⚠️ Invalid user data in localStorage, clearing...');
              console.warn('⚠️ Missing fields:', {
                hasEmail: !!parsedUser?.email,
                hasRole: !!parsedUser?.role,
                hasId: !!parsedUser?.id
              });
              // Clear invalid data directly
              localStorage.removeItem('user');
              localStorage.removeItem('role');
              localStorage.removeItem('sessionId');
              setUser(null);
            }
          } catch (parseError) {
            console.error('❌ Failed to parse user data from localStorage:', parseError);
            console.error('❌ Raw stored user data:', storedUser);
            // Clear corrupted data directly
            localStorage.removeItem('user');
            localStorage.removeItem('role');
            localStorage.removeItem('sessionId');
            setUser(null);
          }
        } else {
          console.log('ℹ️ No stored user data found');
          console.log('ℹ️ Checking if data was cleared by another process...');
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
    // Declare endpoint at function scope to ensure it's accessible in catch block
    let endpoint = '';
    try {
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

      console.log('🔐 Attempting login:', { email, role, endpoint });
      
      // Use proxy-based API clients (apiAdmin/apiManager) instead of direct connection
      // This ensures cookies work properly with Vite proxy
      let response;
      try {
        if (role === 'admin') {
          console.log('🔐 Using apiAdmin for login');
          response = await apiAdmin.post(endpoint, { email, password });
        } else if (role === 'manager') {
          console.log('🔐 Using apiManager for login');
          response = await apiManager.post(endpoint, { email, password });
        } else {
          // SuperAdmin uses dedicated apiSuperAdmin for consistency and cookie support
          console.log('🔐 Using apiSuperAdmin for login');
          const { apiSuperAdmin } = await import('../services/apiSuperAdmin');
          response = await apiSuperAdmin.post(endpoint, { email, password });
        }
      } catch (apiError) {
        console.error('❌ API call error:', apiError);
        console.error('   Error message:', apiError.message);
        console.error('   Error response:', apiError.response?.data);
        console.error('   Error status:', apiError.response?.status);
        throw apiError; // Re-throw to be caught by outer catch
      }
      
      console.log('📥 Login response received:', response);
      console.log('📥 Login response.data:', response.data);
      console.log('📥 Login response.status:', response.status);
      console.log('📥 Login response.headers:', response.headers);
      console.log('📥 Login response.headers.set-cookie:', response.headers['set-cookie']);
      
      // Check if cookie was set in browser
      const cookiesAfterLogin = document.cookie;
      console.log('🍪 Cookies in browser after login:', cookiesAfterLogin);
      console.log('🍪 Has ackit.sid after login:', cookiesAfterLogin.includes('ackit.sid'));
      
      // Check response structure
      console.log('🔍 Checking response structure:');
      console.log('   response.data exists:', !!response.data);
      console.log('   response.data.success:', response.data?.success);
      console.log('   response.data.data exists:', !!response.data?.data);
      console.log('   response.data.data.user exists:', !!response.data?.data?.user);
      console.log('   response.data.user exists:', !!response.data?.user);
      
      if (response.data && response.data.success) {
        // Handle different response structures
        const userData = response.data.data?.user || response.data.user || response.data.data;
        const sessionId = response.data.data?.sessionId || response.data.sessionId;
        
        console.log('🔍 Extracted userData:', userData);
        console.log('🔍 Extracted sessionId:', sessionId);
        console.log('🔍 UserData type:', typeof userData);
        console.log('🔍 UserData keys:', userData ? Object.keys(userData) : 'null');
        
        if (!userData) {
          console.error('❌ No user data in response:', response.data);
          console.error('❌ Full response structure:', JSON.stringify(response.data, null, 2));
          console.error('❌ Response.data.data:', response.data.data);
          console.error('❌ Response.data.user:', response.data.user);
          throw new Error('Login response missing user data');
        }
        
        // Validate userData has required fields
        if (!userData.id || !userData.email) {
          console.error('❌ UserData missing required fields:', userData);
          throw new Error('Login response missing required user fields (id or email)');
        }
        
        console.log('✅ Login successful - User data:', userData);
        console.log('✅ Login successful - Session ID:', sessionId);
        console.log('✅ Login successful - Role:', role);
        
        // Normalize role to lowercase for consistent storage and comparison
        const normalizedRole = ((userData.role || role || '').toString().toLowerCase().trim());
        
        // Remove role from userData before spreading to avoid duplicate key warning
        const { role: _, ...userDataWithoutRole } = userData;
        
        // Ensure userData has required fields with normalized role
        const userDataToStore = {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: normalizedRole, // Always use normalized role
          status: userData.status || 'active', // Default to active if not provided
          lastLogin: userData.lastLogin,
          ...userDataWithoutRole, // Spread remaining userData without role
        };
        
        console.log('✅ AuthContext - Normalized role for storage:', normalizedRole);
        console.log('✅ AuthContext - Original role from userData:', userData.role);
        console.log('✅ AuthContext - Role parameter:', role);
        
        // Store user data and session info (session is handled by cookies)
        localStorage.setItem('user', JSON.stringify(userDataToStore));
        localStorage.setItem('role', normalizedRole); // Always store normalized role
        localStorage.setItem('loginTime', Date.now().toString()); // Track login time for grace period
        if (sessionId) {
          localStorage.setItem('sessionId', sessionId);
        }
        
        // Set user state immediately - use functional update to ensure it's set
        setUser((prevUser) => {
          console.log('🔄 Setting user state - Previous:', prevUser, 'New:', userDataToStore);
          return userDataToStore;
        });
        
        // Force a re-render by updating state again (ensures React picks up the change)
        await new Promise(resolve => setTimeout(resolve, 50));
        setUser(userDataToStore);
        
        console.log('✅ User set in context:', userDataToStore);
        console.log('✅ User stored in localStorage:', JSON.parse(localStorage.getItem('user')));
        console.log('✅ Role stored:', localStorage.getItem('role'));
        console.log('✅ Login time stored:', localStorage.getItem('loginTime'));
        
        // Mark login time for grace period (prevents immediate logout on 401 errors)
        // This is important for all roles to prevent race conditions
        if (role === 'admin') {
          const { markAdminLogin } = await import('../services/apiAdmin');
          markAdminLogin();
          console.log('✅ Admin login marked for grace period');
        } else if (role === 'manager') {
          const { markManagerLogin } = await import('../services/apiManager');
          markManagerLogin();
          console.log('✅ Manager login marked for grace period');
        } else if (role === 'superadmin') {
          const { markSuperAdminLogin } = await import('../services/apiSuperAdmin');
          markSuperAdminLogin();
          console.log('✅ SuperAdmin login marked for grace period');
        }
        
        // Minimal delay for state update (reduced from 200ms to 50ms)
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Verify state was set correctly
        const verifyUser = localStorage.getItem('user');
        const verifyRole = localStorage.getItem('role');
        const verifyLoginTime = localStorage.getItem('loginTime');
        console.log('✅ Verification - User in localStorage:', verifyUser ? 'Present' : 'Missing');
        console.log('✅ Verification - Role in localStorage:', verifyRole || 'Missing');
        console.log('✅ Verification - Login time:', verifyLoginTime || 'Missing');
        console.log('✅ Verification - Current user state:', userDataToStore);
        
        // Double-check user state
        const currentStateUser = JSON.parse(localStorage.getItem('user') || 'null');
        console.log('✅ Final verification - Current state user:', currentStateUser);
        
        // Force a state update to ensure React knows about the change
        setUser(userDataToStore);
        
        return { success: true, user: userDataToStore };
      } else {
        const errorMessage = response.data.message || 'Login failed';
        console.error('Login failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      // Enhanced error logging - don't let errors disappear
      console.error('❌ AuthContext - Login Error Details:');
      console.error('   Role:', role);
      console.error('   Email:', email);
      console.error('   Endpoint:', endpoint || 'not set');
      console.error('   Error Type:', error.constructor.name);
      console.error('   Error Message:', error.message);
      console.error('   Error Stack:', error.stack);
      
      if (error.response) {
        console.error('   Response Status:', error.response.status);
        console.error('   Response Data:', error.response.data);
        console.error('   Response Headers:', error.response.headers);
      } else if (error.request) {
        console.error('   Request made but no response received');
        console.error('   Request:', error.request);
      } else {
        console.error('   Error setting up request:', error.message);
      }
      
      console.error('   Full Error Object:', {
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

  // Check authentication from both state and localStorage (for page reloads)
  const storedUser = localStorage.getItem('user');
  const parsedStoredUser = storedUser ? (() => {
    try {
      return JSON.parse(storedUser);
    } catch {
      return null;
    }
  })() : null;
  
  const isAuthenticated = !!user || (!!parsedStoredUser && !!parsedStoredUser.id && !!parsedStoredUser.email);
  const currentRole = user?.role || parsedStoredUser?.role || localStorage.getItem('role');

  const value = {
    user: user || parsedStoredUser, // Return stored user if state user is null
    login,
    logout,
    loading,
    isAuthenticated,
    role: currentRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
