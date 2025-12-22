import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'admin', // Default to admin
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
      // Try all roles to auto-detect the correct one
      const roles = ['superadmin', 'admin', 'manager'];
      let result = null;
      let detectedRole = null;
      let lastError = null;

      for (const role of roles) {
        try {
          console.log(`🔄 Trying login with role: ${role}`);
          result = await login(formData.email, formData.password, role);
          if (result && result.success) {
            detectedRole = role;
            console.log(`✅ Login successful with role: ${role}`);
            break;
          }
        } catch (error) {
          console.log(`❌ Login failed for role ${role}:`, error.message);
          lastError = error;
          // Continue to next role
        }
      }

      if (result && result.success && detectedRole) {
        toast.success(`Welcome back, ${result.user.name}!`);
        
        // Verify user is stored before navigating
        const storedUser = localStorage.getItem('user');
        const storedRole = localStorage.getItem('role');
        
        console.log('LoginPage - Before navigation:');
        console.log('  Stored user:', storedUser ? 'Present' : 'Missing');
        console.log('  Stored role:', storedRole || 'Missing');
        console.log('  Result user:', result.user);
        console.log('  Detected role:', detectedRole);
        
        if (!storedUser || !storedRole) {
          console.error('❌ User data not stored properly, cannot navigate');
          toast.error('Login successful but session not saved. Please try again.');
          return;
        }
        
        // Longer delay to ensure state propagation and AuthContext update
        console.log('⏳ LoginPage - Waiting for state to propagate...');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Double-check before navigating
        const finalCheck = {
          user: localStorage.getItem('user'),
          role: localStorage.getItem('role'),
          loginTime: localStorage.getItem('loginTime')
        };
        console.log('✅ LoginPage - Final check before navigation:', finalCheck);
        
        if (!finalCheck.user || !finalCheck.role) {
          console.error('❌ LoginPage - Data lost before navigation!');
          toast.error('Session not saved properly. Please try again.');
          return;
        }
        
        // Navigate based on detected role
        const roleToNavigate = storedRole || detectedRole;
        console.log('🚀 LoginPage - Navigating to dashboard for role:', roleToNavigate);
        switch (roleToNavigate) {
          case 'superadmin':
            navigate('/superadmin');
            break;
          case 'admin':
            navigate('/admin');
            break;
          case 'manager':
            navigate('/manager');
            break;
          default:
            console.error('❌ Unknown role:', roleToNavigate);
            toast.error('Unknown user role. Please contact support.');
        }
      } else {
        // All roles failed
        const errorMessage = lastError?.response?.data?.message || lastError?.message || 'Invalid email or password';
        console.error('LoginPage - All login attempts failed');
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('LoginPage - Login error:', error);
      toast.error(error.response?.data?.message || error.message || 'Login failed');
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

