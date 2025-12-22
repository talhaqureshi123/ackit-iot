import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Shield, User, Users } from 'lucide-react';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'superadmin'
  });
  const [loading, setLoading] = useState(false);
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
      const result = await login(formData.email, formData.password, formData.role);
      
      if (result && result.success) {
        toast.success(`Welcome back, ${result.user.name}!`);
        
        // Verify user is stored before navigating
        const storedUser = localStorage.getItem('user');
        const storedRole = localStorage.getItem('role');
        
        console.log('LoginPage - Before navigation:');
        console.log('  Stored user:', storedUser ? 'Present' : 'Missing');
        console.log('  Stored role:', storedRole || 'Missing');
        console.log('  Result user:', result.user);
        
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
        
        // Navigate based on role
        console.log('🚀 LoginPage - Navigating to dashboard for role:', formData.role);
        switch (formData.role) {
          case 'superadmin':
            navigate('/superadmin');
            break;
          case 'admin':
            navigate('/admin');
            break;
          case 'manager':
            navigate('/manager');
            break;
        }
      } else {
        toast.error('Login failed: Invalid response from server');
      }
    } catch (error) {
      console.error('LoginPage - Login error:', error);
      toast.error(error.response?.data?.message || error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: 'superadmin', label: 'Super Admin', icon: Shield, color: 'text-red-600' },
    { value: 'admin', label: 'Admin', icon: User, color: 'text-blue-600' },
    { value: 'manager', label: 'Manager', icon: Users, color: 'text-green-600' }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            ACKit IoT System
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                {roleOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: option.value })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.role === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`w-6 h-6 mx-auto ${option.color}`} />
                      <p className="text-xs mt-1 text-gray-700">{option.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-700 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter your email"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-700 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter your password"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default LoginPage;

