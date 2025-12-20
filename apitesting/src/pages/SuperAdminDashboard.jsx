import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { superAdminAPI } from '../services/api';
import toast from 'react-hot-toast';
import { 
  Shield, 
  Users, 
  Activity,
  LogOut,
  Eye,
  Ban,
  CheckCircle,
  RefreshCw,
  UserPlus,
  Menu,
  User,
  X,
  Save,
  BarChart3
} from 'lucide-react';

// Admin Form Component
const AdminForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
          placeholder="Enter admin name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
          placeholder="Enter admin email"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
          placeholder="Enter password"
          minLength={6}
        />
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Save className="w-4 h-4 mr-2" />
          Create Admin
        </button>
      </div>
    </form>
  );
};

const SuperAdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('admins');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [data, setData] = useState({
    admins: [],
    logs: []
  });

  // Handle window resize for responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        return;
      } else {
        if (sidebarOpen) {
          setSidebarOpen(false);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  useEffect(() => {
    const loadDataSafely = async () => {
      try {
        console.log('📊 SuperAdmin Dashboard - Loading data...');
        console.log('📊 SuperAdmin Dashboard - User:', user);
        console.log('📊 SuperAdmin Dashboard - User role:', user?.role);
        console.log('📊 SuperAdmin Dashboard - localStorage user:', localStorage.getItem('user'));
        console.log('📊 SuperAdmin Dashboard - localStorage role:', localStorage.getItem('role'));
        
        // Check if cookie exists
        const cookies = document.cookie;
        console.log('🍪 SuperAdmin Dashboard - Browser cookies:', cookies);
        console.log('🍪 SuperAdmin Dashboard - Has ackit.sid:', cookies.includes('ackit.sid'));
        
        if (user && user.role === 'superadmin') {
          // Longer delay to ensure session cookie is set after login
          // Also check if cookie exists before making requests
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check cookie again after delay
          const cookiesAfterDelay = document.cookie;
          console.log('🍪 SuperAdmin Dashboard - Cookies after delay:', cookiesAfterDelay);
          console.log('🍪 SuperAdmin Dashboard - Has ackit.sid after delay:', cookiesAfterDelay.includes('ackit.sid'));
          
          // Note: HttpOnly cookies are NOT visible in document.cookie
          // But they ARE sent automatically with requests if they were set
          // So we try to load data - if cookie was set, it will work
          if (!cookiesAfterDelay.includes('ackit.sid')) {
            console.warn('⚠️ Cookie not visible in document.cookie');
            console.warn('⚠️ This is normal for HttpOnly cookies - they are still sent with requests');
            console.warn('⚠️ Attempting to load data - cookie will be sent automatically if it exists');
          }
          
          // Try to load data - cookie will be sent automatically if it was set
          await loadData();
        } else {
          console.warn('⚠️ SuperAdmin Dashboard - User not authenticated or wrong role');
        }
      } catch (error) {
        console.error('❌ Failed to load dashboard data:', error);
        console.error('❌ Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        
        // Don't show error toast for 401 - it might trigger auto-logout
        if (error.response?.status !== 401) {
          toast.error('Failed to load dashboard data');
        } else {
          console.warn('⚠️ 401 error on dashboard load - session might not be ready yet');
          // Check cookie again
          const cookies = document.cookie;
          console.warn('⚠️ Current cookies:', cookies);
          console.warn('⚠️ Has ackit.sid:', cookies.includes('ackit.sid'));
        }
      }
    };
    
    loadDataSafely();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [adminsRes, logsRes] = await Promise.all([
        superAdminAPI.getAllAdmins(),
        superAdminAPI.getSuperAdminActivityLogs()
      ]);

      console.log('Activity logs response:', logsRes.data);
      
      setData({
        admins: adminsRes.data.data || adminsRes.data.admins || [],
        logs: logsRes.data.data?.logs || logsRes.data.logs || []
      });
      
      console.log('Processed logs:', logsRes.data.data?.logs || logsRes.data.logs || []);
    } catch (error) {
      toast.error('Failed to load data');
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (adminData) => {
    try {
      setLoading(true);
      const response = await superAdminAPI.createAdmin(adminData);
      
      // Check if response indicates success
      if (response.data?.success === false) {
        toast.error(response.data?.message || 'Failed to create admin');
        return;
      }
      
      toast.success(response.data?.message || 'Admin created successfully');
      setShowModal(false);
      
      // Reload data to show the new admin
      try {
        await loadData();
      } catch (loadError) {
        console.error('Error reloading data:', loadError);
        // Don't show error toast for reload failure, admin was created successfully
      }
    } catch (error) {
      console.error('Create admin error:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to create admin';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendAdmin = async (adminId, reason) => {
    try {
      setLoading(true);
      await superAdminAPI.suspendAdmin(adminId, reason);
      toast.success('Admin suspended successfully');
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to suspend admin');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeAdmin = async (adminId) => {
    try {
      setLoading(true);
      await superAdminAPI.resumeAdmin(adminId);
      toast.success('Admin resumed successfully');
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resume admin');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'admins', label: 'Admins', icon: Users, count: data.admins.length },
    { id: 'logs', label: 'Activity Logs', icon: Activity, count: data.logs.length }
  ];

  const AdminCard = ({ admin }) => (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{admin.name}</h3>
          <p className="text-sm text-gray-600 mb-2">{admin.email}</p>
          <div className="flex items-center">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              admin.status === 'active' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {admin.status}
            </span>
            {admin.createdAt && (
              <span className="ml-2 text-xs text-gray-500">
                Created: {new Date(admin.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex space-x-2 ml-4">
          <button
            onClick={() => {/* View details */}}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {admin.status === 'active' ? (
            <button
              onClick={() => handleSuspendAdmin(admin.id, 'Suspended by Super Admin')}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Suspend Admin"
            >
              <Ban className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => handleResumeAdmin(admin.id)}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Resume Admin"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const LogCard = ({ log }) => (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{log.action}</h3>
          <p className="text-sm text-gray-600 mb-2">
            {typeof log.details === 'object' ? log.details.message || JSON.stringify(log.details) : log.details}
          </p>
          <p className="text-xs text-gray-500 mb-1">
            {new Date(log.createdAt).toLocaleString()}
          </p>
          {log.admin && (
            <p className="text-xs text-blue-600">
              Admin: {log.admin.name} ({log.admin.email})
            </p>
          )}
        </div>
        <div className="ml-4">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            log.targetType === 'admin' 
              ? 'bg-red-100 text-red-800' 
              : log.targetType === 'manager'
              ? 'bg-blue-100 text-blue-800'
              : log.targetType === 'organization'
              ? 'bg-purple-100 text-purple-800'
              : log.targetType === 'ac'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {log.targetType}
          </span>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading && data.admins.length === 0 && data.logs.length === 0) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'admins':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">All Admins</h2>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Create Admin
              </button>
            </div>
            {data.admins.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No admins found</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Create your first admin
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.admins.map(admin => (
                  <AdminCard key={admin.id} admin={admin} />
                ))}
              </div>
            )}
          </div>
        );
      case 'logs':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Activity Logs</h2>
            {data.logs.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No activity logs found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.logs.map((log, index) => (
                  <LogCard key={log.id || index} log={log} />
                ))}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex w-full">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'} bg-gradient-to-b from-red-900 to-red-800 text-white transition-all duration-300 ease-in-out flex flex-col fixed h-screen z-30`}>
        {/* Sidebar Header */}
        <div className={`p-6 border-b border-red-700 flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center lg:flex-col lg:space-y-4'}`}>
          {sidebarOpen ? (
            <div className="flex items-center space-x-3">
              <div className="bg-white rounded-lg p-2">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Super Admin</h2>
                <p className="text-xs text-red-200">Control Center</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-2">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-red-700 rounded-lg transition-colors"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-3 space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-2'} py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-red-600 shadow-lg'
                      : 'text-red-100 hover:bg-red-700 hover:text-white'
                  }`}
                  title={!sidebarOpen ? tab.label : ''}
                >
                  <Icon className={`${sidebarOpen ? 'w-5 h-5 mr-3' : 'w-6 h-6'}`} />
                  {sidebarOpen && (
                    <>
                      <span className="font-medium flex-1 text-left">{tab.label}</span>
                      {tab.count !== undefined && (
                        <span className={`ml-2 py-0.5 px-2 rounded-full text-xs font-semibold ${
                          isActive
                            ? 'bg-red-100 text-red-600'
                            : 'bg-red-700 text-red-100'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-red-700">
          <div className={`${sidebarOpen ? 'px-4' : 'px-2'} py-3 bg-red-700 rounded-lg`}>
            <div className={`flex items-center ${sidebarOpen ? 'space-x-3' : 'justify-center'}`}>
              <div className="bg-red-600 rounded-full p-2">
                <User className="w-5 h-5" />
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name || 'Super Admin'}</p>
                  <p className="text-xs text-red-200 truncate">{user?.email || 'superadmin@example.com'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 w-full ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} transition-all duration-300 bg-gray-50 min-h-screen`}>
        {/* Top Header */}
        <header className="bg-white shadow-md border-b sticky top-0 z-10 w-full">
          <div className="px-4 sm:px-6 py-4 w-full">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {tabs.find(t => t.id === activeTab)?.label || 'Super Admin Dashboard'}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Welcome back, {user?.name || 'Super Admin'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <button
                  onClick={loadData}
                  className="p-2 sm:p-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Refresh Data"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={logout}
                  className="flex items-center px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 sm:p-6 w-full overflow-x-hidden">
          {renderContent()}
        </main>
      </div>

      {/* Create Admin Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <UserPlus className="w-6 h-6 mr-2 text-blue-600" />
                Create New Admin
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <AdminForm
              onSubmit={handleCreateAdmin}
              onCancel={() => setShowModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;

