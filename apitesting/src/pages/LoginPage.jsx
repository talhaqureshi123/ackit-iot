import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: true
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Trim email and password to remove any whitespace
      const trimmedEmail = formData.email.trim();
      const trimmedPassword = formData.password.trim();
      
      console.log('🔐 LoginPage - Input validation:');
      console.log('   Original email:', formData.email);
      console.log('   Trimmed email:', trimmedEmail);
      console.log('   Email length:', formData.email.length, '->', trimmedEmail.length);
      console.log('   Original password length:', formData.password.length);
      console.log('   Trimmed password length:', trimmedPassword.length);
      console.log('   Password has whitespace:', formData.password !== trimmedPassword);
      
      // Auto-detect role from backend - try roles sequentially (optimized order)
      // Most common roles first for faster detection
      const allRoles = ['admin', 'superadmin', 'manager'];
      let result = null;
      let detectedRole = null;
      let lastError = null;
      const loginAttempts = [];

      console.log('🔐 LoginPage - Starting auto-detection login');
      console.log('   Email:', trimmedEmail);
      console.log('   Will try roles in order:', allRoles);
      console.log('   Total roles to try:', allRoles.length);

      // Try all roles sequentially - stop on first success
      for (let i = 0; i < allRoles.length; i++) {
        const role = allRoles[i];
        console.log(`\n🔐 [${i + 1}/${allRoles.length}] Trying ${role.toUpperCase()} login...`);
        
        try {
          result = await login(trimmedEmail, trimmedPassword, role);
          
          if (result && result.success) {
            // Backend has confirmed this role is correct
            detectedRole = role;
            console.log(`✅ [${role.toUpperCase()}] Login successful! Role: ${role}`);
            loginAttempts.push({ role, success: true, attempt: i + 1 });
            break; // Stop immediately on success
          } else {
            console.log(`⚠️ [${role.toUpperCase()}] Login returned but success=false`);
            console.log(`   Response:`, result);
            loginAttempts.push({ role, success: false, reason: 'success=false in response', attempt: i + 1 });
            lastError = new Error('Login response success=false');
          }
        } catch (error) {
          // Log all errors for debugging
          const errorDetails = {
            role,
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            success: false,
            attempt: i + 1
          };
          
          loginAttempts.push(errorDetails);
          
          // 401 is expected for wrong role - continue to next
          if (error.response?.status === 401) {
            // Always log 401 errors with detail for debugging
            console.log(`⚠️ [${role.toUpperCase()}] Login failed with 401 (expected if wrong role)`);
            console.log(`   Error message: ${error.response?.data?.message || error.message}`);
            if (error.response?.data?.debug) {
              console.log(`   Debug info:`, error.response.data.debug);
            }
            
            // Check if the error indicates "not found" vs "wrong password"
            const debugMessage = error.response?.data?.debug?.message || '';
            const isNotFound = debugMessage.toLowerCase().includes('not found') || 
                             debugMessage.toLowerCase().includes('no admins found') ||
                             debugMessage.toLowerCase().includes('no managers found') ||
                             debugMessage.toLowerCase().includes('no superadmins found');
            
            // IMPORTANT: If admin login fails and it's NOT a "not found" error,
            // it means the email exists in admin table but password is wrong or account is suspended.
            // In this case, we should NOT try other roles (manager/superadmin) because
            // the email is registered as admin.
            // Only continue to other roles if explicitly "not found"
            
            lastError = error;
            
            // If this is not the last role, check if we should continue
            if (i < allRoles.length - 1) {
              if (isNotFound) {
                console.log(`   → Email not found in ${role} table, continuing to next role...`);
                continue;
              } else if (role === 'admin' && !isNotFound) {
                // Admin login failed but email might exist (wrong password/suspended)
                // Don't try other roles - email is registered as admin
                console.log(`   → Admin login failed (email exists but password/status issue), stopping role detection`);
                console.log(`   → Email is registered as ADMIN, not trying other roles`);
                break; // Stop trying other roles
              } else {
                // For other roles, continue if not found
                console.log(`   → Login failed, continuing to next role...`);
                continue;
              }
            } else {
              console.log(`   → This was the last role to try`);
            }
          } else {
            // Other errors - log but continue
            console.error(`❌ [${role.toUpperCase()}] Error:`, error.message);
            console.error(`   Status: ${error.response?.status}`);
            if (error.response?.data) {
              console.error(`   Response data:`, error.response.data);
            }
            lastError = error;
            
            // For non-401 errors, still try next role (might be network issue)
            if (i < allRoles.length - 1) {
              console.log(`   → Continuing to next role despite error...`);
            }
          }
        }
      }
      
      // Log summary of all attempts
      console.log('\n📊 LoginPage - Login attempts summary:');
      console.log(`   Total attempts: ${loginAttempts.length}`);
      loginAttempts.forEach(attempt => {
        if (attempt.success) {
          console.log(`   ✅ [${attempt.attempt}] ${attempt.role.toUpperCase()}: SUCCESS`);
        } else {
          console.log(`   ❌ [${attempt.attempt}] ${attempt.role.toUpperCase()}: FAILED - ${attempt.message || attempt.reason || 'Unknown error'}`);
        }
      });
      
      if (!result || !result.success) {
        console.log('\n❌ All login attempts failed');
        console.log('   Tried roles:', loginAttempts.map(a => a.role).join(', '));
      }

      // Check if we got a successful login
      if (!result || !result.success) {
        console.error('❌ LoginPage - All login attempts failed');
        console.error('   Login attempts:', loginAttempts);
        if (lastError) {
          console.error('   Last error:', lastError.message);
          console.error('   Last error response:', lastError.response?.data);
        }
        
        // Show user-friendly error
        const errorMessage = lastError?.response?.data?.message || lastError?.message || 'Login failed. Please check your credentials.';
        toast.error(errorMessage);
        setLoading(false);
        return;
      }

      if (result && result.success && detectedRole) {
        // CRITICAL: Use role from backend response (result.user.role) as PRIMARY source
        // Backend returns the correct role in the response
        const backendRole = result.user?.role || '';
        const roleFromBackend = backendRole.toString().toLowerCase().trim();
        
        console.log('✅ LoginPage - Login successful!');
        console.log('   Detected role (from login attempt):', detectedRole);
        console.log('   Result user object:', result.user);
        console.log('   Result user role (from backend):', backendRole);
        console.log('   Result user role (normalized):', roleFromBackend);
        console.log('   Result user role type:', typeof backendRole);
        console.log('   Result user keys:', result.user ? Object.keys(result.user) : 'null');
        
        // Use backend role as primary, fallback to detectedRole only if backend role is missing
        const normalizedRole = roleFromBackend || detectedRole.toString().toLowerCase().trim();
        console.log('   Final normalized role for storage:', normalizedRole);
        
        if (!roleFromBackend) {
          console.warn('⚠️ LoginPage - Backend did not return role! Using detected role:', detectedRole);
        }
        
        // CRITICAL: Store data immediately and verify it persists
        try {
          const userWithNormalizedRole = {
            ...result.user,
            role: normalizedRole
          };
          
          // Store in localStorage
          localStorage.setItem('user', JSON.stringify(userWithNormalizedRole));
          localStorage.setItem('role', normalizedRole);
          localStorage.setItem('loginTime', Date.now().toString());
          
          // Immediately verify storage
          const verifyUser = localStorage.getItem('user');
          const verifyRole = localStorage.getItem('role');
          const verifyLoginTime = localStorage.getItem('loginTime');
          
          console.log('✅ LoginPage - Data stored immediately:');
          console.log('   User stored:', verifyUser ? 'YES' : 'NO');
          console.log('   Role stored:', verifyRole);
          console.log('   Login time stored:', verifyLoginTime);
          
          if (!verifyUser || !verifyRole) {
            console.error('❌ LoginPage - CRITICAL: Data not stored! Retrying...');
            // Retry storage
            localStorage.setItem('user', JSON.stringify(userWithNormalizedRole));
            localStorage.setItem('role', normalizedRole);
            localStorage.setItem('loginTime', Date.now().toString());
            
            // Verify again
            const retryUser = localStorage.getItem('user');
            const retryRole = localStorage.getItem('role');
            if (!retryUser || !retryRole) {
              console.error('❌ LoginPage - CRITICAL: Storage failed even after retry!');
              toast.error('Failed to save session. Please try again.');
              setLoading(false);
              return;
            }
          }
          
          console.log('✅ LoginPage - Data storage verified successfully');
        } catch (storageError) {
          console.error('❌ LoginPage - Failed to store data:', storageError);
          toast.error('Failed to save session. Please try again.');
          setLoading(false);
          return;
        }
        
        // Minimal delay for localStorage write (reduced from 200ms to 50ms)
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Final verification before navigation - get fresh data
        const verifiedUser = localStorage.getItem('user');
        const verifiedRole = localStorage.getItem('role');
        const verifiedLoginTime = localStorage.getItem('loginTime');
        
        console.log('✅ LoginPage - Final verification before navigation:');
        console.log('  User:', verifiedUser ? 'Present' : 'Missing');
        console.log('  Role:', verifiedRole);
        console.log('  Login time:', verifiedLoginTime);
        console.log('  All localStorage keys:', Object.keys(localStorage));
        
        if (!verifiedUser || !verifiedRole) {
          console.error('❌ LoginPage - CRITICAL: Data missing before navigation!');
          console.error('   This should not happen. Checking localStorage...');
          console.error('   All keys:', Object.keys(localStorage));
          toast.error('Session not saved properly. Please try again.');
          setLoading(false);
          return;
        }
        
        // Navigate based on normalizedRole which comes from backend (result.user.role)
        // This is the most reliable source as it's directly from backend response
        const roleForNavigation = normalizedRole || verifiedRole || detectedRole || '';
        const finalRoleForNav = roleForNavigation.toString().toLowerCase().trim();
        
        console.log('🚀 LoginPage - Role navigation decision:');
        console.log('   Normalized role (from backend):', normalizedRole);
        console.log('   Role from localStorage:', verifiedRole);
        console.log('   Detected role (from login attempt):', detectedRole);
        console.log('   Role to navigate (final):', finalRoleForNav);
        console.log('   Result user object:', JSON.stringify(result.user, null, 2));
        
        // Determine dashboard path based on role - MUST match exactly
        let dashboardPath = '/login'; // Default fallback
        
        // CRITICAL: Role comparison must be exact match (case-insensitive)
        const normalizedFinalRole = finalRoleForNav.toString().toLowerCase().trim();
        
        console.log('🚀 LoginPage - Role navigation - Final check:');
        console.log('   finalRoleForNav (raw):', finalRoleForNav);
        console.log('   normalizedFinalRole:', normalizedFinalRole);
        console.log('   normalizedRole:', normalizedRole);
        console.log('   verifiedRole:', verifiedRole);
        console.log('   detectedRole:', detectedRole);
        
        if (normalizedFinalRole === 'superadmin') {
          dashboardPath = '/superadmin';
          console.log('✅ LoginPage - SuperAdmin detected, navigating to /superadmin');
          console.log('   Role match: superadmin ===', normalizedFinalRole);
        } else if (normalizedFinalRole === 'admin') {
          dashboardPath = '/admin';
          console.log('✅ LoginPage - Admin detected, navigating to /admin');
          console.log('   Role match: admin ===', normalizedFinalRole);
        } else if (normalizedFinalRole === 'manager') {
          dashboardPath = '/manager';
          console.log('✅ LoginPage - Manager detected, navigating to /manager');
          console.log('   Role match: manager ===', normalizedFinalRole);
        } else {
          console.error('❌ LoginPage - CRITICAL: Unknown role for navigation!');
          console.error('   Final role:', finalRoleForNav);
          console.error('   Available roles: superadmin, admin, manager');
          console.error('   Normalized role:', normalizedRole);
          console.error('   Verified role:', verifiedRole);
          console.error('   Detected role:', detectedRole);
          console.error('   Result user:', result.user);
          console.error('   Full result:', result);
          toast.error(`Unknown role: ${finalRoleForNav || 'undefined'}. Please contact support.`);
          setLoading(false);
          return;
        }
        
        console.log('🚀 LoginPage - Final dashboard path:', dashboardPath);
        console.log('🚀 LoginPage - localStorage before navigation:', {
          user: localStorage.getItem('user') ? 'Present' : 'Missing',
          role: localStorage.getItem('role'),
          loginTime: localStorage.getItem('loginTime')
        });
        
        // Use setTimeout to ensure localStorage write completes before navigation
        // Store dashboardPath in a way that's accessible in setTimeout
        const navigationPath = dashboardPath;
        const navigationRole = finalRoleForNav;
        
        console.log('🚀 LoginPage - About to navigate in 300ms to:', navigationPath);
        setTimeout(() => {
          // Final verification before navigation - get fresh data from localStorage
          const finalUser = localStorage.getItem('user');
          const finalRole = localStorage.getItem('role');
          const finalRoleNormalized = (finalRole || '').toString().toLowerCase().trim();
          
          // Also parse user to check role in user object
          let parsedFinalUser = null;
          let roleFromUserObject = null;
          try {
            if (finalUser) {
              parsedFinalUser = JSON.parse(finalUser);
              roleFromUserObject = (parsedFinalUser?.role || '').toString().toLowerCase().trim();
            }
          } catch (e) {
            console.error('❌ LoginPage - Failed to parse user from localStorage:', e);
          }
          
          console.log('🚀 LoginPage - Final check before navigation:');
          console.log('   User (raw):', finalUser ? 'Present' : 'Missing');
          console.log('   User (parsed):', parsedFinalUser);
          console.log('   Role (from localStorage key):', finalRole);
          console.log('   Role (from user object):', roleFromUserObject);
          console.log('   Role (normalized from localStorage):', finalRoleNormalized);
          console.log('   Navigation role (from closure):', navigationRole);
          console.log('   Dashboard path (from closure):', navigationPath);
          console.log('   All localStorage keys:', Object.keys(localStorage));
          
          // Use role from user object if available, otherwise use localStorage role
          const effectiveRole = roleFromUserObject || finalRoleNormalized || navigationRole || '';
          const effectiveRoleNormalized = effectiveRole.toString().toLowerCase().trim();
          
          console.log('🚀 LoginPage - Effective role for navigation:', effectiveRoleNormalized);
          
          // Re-determine path based on effective role
          let finalDashboardPath = navigationPath;
          if (effectiveRoleNormalized === 'superadmin') {
            finalDashboardPath = '/superadmin';
            console.log('✅ LoginPage - Effective role is superadmin, path: /superadmin');
          } else if (effectiveRoleNormalized === 'admin') {
            finalDashboardPath = '/admin';
            console.log('✅ LoginPage - Effective role is admin, path: /admin');
          } else if (effectiveRoleNormalized === 'manager') {
            finalDashboardPath = '/manager';
            console.log('✅ LoginPage - Effective role is manager, path: /manager');
          } else {
            // If role doesn't match, use the path from closure
            finalDashboardPath = navigationPath;
            console.warn('⚠️ LoginPage - Role not recognized, using path from closure:', navigationPath);
            console.warn('   Effective role:', effectiveRoleNormalized);
          }
          
          console.log('🚀 LoginPage - Final dashboard path determined:', finalDashboardPath);
          
          if (finalUser && effectiveRoleNormalized) {
            console.log('✅ LoginPage - All checks passed, navigating to:', finalDashboardPath);
            console.log('✅ LoginPage - User role (effective):', effectiveRoleNormalized);
            console.log('✅ LoginPage - Navigation path:', finalDashboardPath);
            console.log('✅ LoginPage - localStorage data verified:');
            console.log('   - user key:', finalUser ? 'Present' : 'Missing');
            console.log('   - role key:', finalRole || 'Missing');
            console.log('   - loginTime key:', localStorage.getItem('loginTime') || 'Missing');
            // Force navigation - use window.location.href for full page reload
            window.location.href = finalDashboardPath;
          } else {
            console.error('❌ LoginPage - Data missing, cannot navigate!');
            console.error('   User:', finalUser);
            console.error('   Role (localStorage):', finalRole);
            console.error('   Role (user object):', roleFromUserObject);
            console.error('   Effective role:', effectiveRoleNormalized);
            console.error('   All localStorage:', Object.keys(localStorage).map(key => ({ key, value: localStorage.getItem(key) })));
            toast.error('Session data lost. Please try logging in again.');
            setLoading(false);
          }
        }, 100); // Reduced delay from 300ms to 100ms for faster navigation
        
        // Don't set loading to false here - let navigation happen
        // Loading will be reset when page reloads after navigation
        return;
      } else {
        // All roles failed
        setLoading(false);
        const errorMessage = lastError?.response?.data?.message || lastError?.message || 'Invalid email or password';
        console.error('❌ LoginPage - All login attempts failed');
        console.error('   Last error:', lastError);
        console.error('   Error message:', errorMessage);
        console.error('   Error response:', lastError?.response?.data);
        console.error('   Error status:', lastError?.response?.status);
        toast.error(errorMessage, { duration: 5000 }); // Show for 5 seconds
      }
    } catch (error) {
      setLoading(false);
      console.error('❌ LoginPage - Unexpected login error:', error);
      console.error('   Error type:', error.constructor.name);
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
      console.error('   Error response:', error.response?.data);
      console.error('   Error status:', error.response?.status);
      toast.error(error.response?.data?.message || error.message || 'Login failed', { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-5xl w-full flex flex-col lg:flex-row border border-gray-200">
        {/* Left Side - Login Form */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center border-r" style={{ borderColor: '#eaeaea' }}>
          {/* Logo */}
          <div className="flex items-center mb-8">
            <img 
              src="/assets/logo.png" 
              alt="IOTFIY Logo" 
              className="h-8 object-contain"
            />
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Log in to your Account
          </h1>
          <p className="text-gray-600 mb-8">
            Welcome Back! Select method to log in
          </p>

          <form className="space-y-6" onSubmit={handleSubmit}>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>


            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  Forgot Password?
                </a>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  'Log In'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side - Illustration Image */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12" style={{ backgroundColor: '#eaeaea' }}>
          <img
            src="/assets/rightside.png"
            alt="Smart Home IoT Devices"
            className="w-full h-full object-contain rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

