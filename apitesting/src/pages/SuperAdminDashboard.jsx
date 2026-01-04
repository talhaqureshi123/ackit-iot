import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { superAdminAPI } from '../services/apiSuperAdmin';
import toast from 'react-hot-toast';
import { 
  Shield, 
  Users, 
  Activity,
  LogOut,
  RefreshCw,
  UserPlus,
  Menu,
  User,
  X,
  Bell,
  CheckCircle,
  XCircle
} from 'lucide-react';
import AdminForm from '../components/superadmin/AdminForm';
import AdminCard from '../components/superadmin/AdminCard';
import ActivityLogTable from '../components/superadmin/ActivityLogTable';
import PlanManager from '../components/superadmin/PlanManager';
import PlanRequestsList from '../components/planrequests/PlanRequestsList';
import { AdminDetailsModal } from '../components/modals';

const SuperAdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('admins');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); // Track initial data load
  const [showModal, setShowModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [data, setData] = useState({
    admins: [],
    logs: [],
    planRequests: []
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
      console.log('🔄 Starting data load...');
      const [adminsRes, logsRes, requestsRes] = await Promise.all([
        superAdminAPI.getAllAdmins(),
        superAdminAPI.getSuperAdminActivityLogs(),
        superAdminAPI.getPlanRequests().catch(() => ({ data: { data: { requests: [] } } }))
      ]);

      console.log('📊 Full Admins response:', JSON.stringify(adminsRes.data, null, 2));
      console.log('📊 Full Activity logs response:', JSON.stringify(logsRes.data, null, 2));
      
      // Parse admins - backend returns { success: true, data: [...] }
      let admins = [];
      if (adminsRes?.data) {
        if (adminsRes.data.success === false) {
          console.error('❌ Admins API returned error:', adminsRes.data.message);
          toast.error(adminsRes.data.message || 'Failed to load admins');
        } else if (Array.isArray(adminsRes.data.data)) {
          admins = adminsRes.data.data;
        } else if (Array.isArray(adminsRes.data.admins)) {
          admins = adminsRes.data.admins;
        } else {
          console.warn('⚠️ Unexpected admins response structure:', adminsRes.data);
        }
      }
      
      // Parse logs - backend returns { success: true, data: { logs: [...], pagination: {...} } }
      let logs = [];
      if (logsRes?.data) {
        if (logsRes.data.success === false) {
          console.error('❌ Logs API returned error:', logsRes.data.message);
          toast.error(logsRes.data.message || 'Failed to load activity logs');
        } else if (Array.isArray(logsRes.data.data?.logs)) {
          logs = logsRes.data.data.logs;
        } else if (Array.isArray(logsRes.data.logs)) {
          logs = logsRes.data.logs;
        } else if (logsRes.data.data && typeof logsRes.data.data === 'object') {
          // Try to find logs array in nested structure
          const dataObj = logsRes.data.data;
          if (Array.isArray(dataObj.logs)) {
            logs = dataObj.logs;
          } else {
            console.warn('⚠️ Unexpected logs response structure:', logsRes.data);
          }
        } else {
          console.warn('⚠️ Unexpected logs response structure:', logsRes.data);
        }
      }
      
      // Parse plan requests - backend returns { success: true, data: { requests: [...] } }
      let planRequests = [];
      if (requestsRes?.data) {
        if (requestsRes.data.success === false) {
          console.error('❌ Plan requests API returned error:', requestsRes.data.message);
        } else if (Array.isArray(requestsRes.data.data?.requests)) {
          planRequests = requestsRes.data.data.requests;
        } else if (Array.isArray(requestsRes.data.requests)) {
          planRequests = requestsRes.data.requests;
        } else if (requestsRes.data.data && typeof requestsRes.data.data === 'object') {
          const dataObj = requestsRes.data.data;
          if (Array.isArray(dataObj.requests)) {
            planRequests = dataObj.requests;
          } else {
            console.warn('⚠️ Unexpected plan requests response structure:', requestsRes.data);
          }
        } else {
          console.warn('⚠️ Unexpected plan requests response structure:', requestsRes.data);
        }
      }
      
      console.log('✅ Processed admins:', admins.length, admins);
      console.log('✅ Processed logs:', logs.length, logs);
      console.log('✅ Processed plan requests:', planRequests.length, planRequests);
      
      setData({
        admins,
        logs,
        planRequests
      });
      
      // Set initialLoading to false after first successful load
      if (initialLoading) {
        console.log('✅ Setting initialLoading to false');
        setInitialLoading(false);
      }
    } catch (error) {
      console.error('❌ Load data error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.message);
      console.error('❌ Full error:', error);
      
      // Set initialLoading to false even on error so UI doesn't stay in loading state
      if (initialLoading) {
        console.log('✅ Setting initialLoading to false (error case)');
        setInitialLoading(false);
      }
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to load data';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      console.log('✅ Data load completed');
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

  const handleManagePlan = (admin) => {
    setSelectedAdmin(admin);
    setShowPlanModal(true);
  };

  const handleUpdatePlan = async (adminId, plan) => {
    try {
      setLoading(true);
      await superAdminAPI.updateAdminPlan(adminId, { plan });
      toast.success('Plan updated successfully');
      await loadData();
      setShowPlanModal(false);
      setSelectedAdmin(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update plan');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId) => {
    try {
      setLoading(true);
      const response = await superAdminAPI.approvePlanRequest(requestId);
      toast.success('Plan request approved successfully');
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      setLoading(true);
      const reason = prompt('Enter rejection reason (optional):') || 'Rejected by Super Admin';
      await superAdminAPI.rejectPlanRequest(requestId, reason);
      toast.success('Plan request rejected');
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'admins', label: 'Admins', icon: Users, count: data.admins.length },
    { id: 'requests', label: 'Plan Requests', icon: Bell, count: data.planRequests?.length || 0, badge: data.planRequests?.length > 0 ? 'red' : null },
    { id: 'logs', label: 'Activity Logs', icon: Activity, count: data.logs.length }
  ];


  const renderContent = () => {
    // Show loading spinner during initial load
    if (initialLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }
    
    // Show loading spinner during refresh (if data already exists)
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
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">All Admins</h2>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white text-sm sm:text-base rounded-lg hover:bg-blue-700 transition-colors shadow-md touch-manipulation"
              >
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Create Admin</span>
                <span className="sm:hidden">Create</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
                {data.admins.map(admin => (
                  <AdminCard 
                    key={admin.id} 
                    admin={admin}
                    onViewDetails={() => {
                      setSelectedAdmin(admin);
                      setShowDetailsModal(true);
                    }}
                    onSuspend={handleSuspendAdmin}
                    onResume={handleResumeAdmin}
                    onManagePlan={handleManagePlan}
                  />
                ))}
              </div>
            )}
          </div>
        );
      case 'requests':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Plan Upgrade Requests</h2>
              <span className="text-sm text-gray-500">
                {data.planRequests?.length || 0} request{data.planRequests?.length !== 1 ? 's' : ''}
              </span>
            </div>
            <PlanRequestsList
              requests={data.planRequests || []}
              onApprove={handleApproveRequest}
              onReject={handleRejectRequest}
              loading={loading}
            />
          </div>
        );
      case 'logs':
        return (
          <div className="w-full max-w-full overflow-hidden">
            <ActivityLogTable logs={data.logs} loading={loading} />
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
      <aside className={`${sidebarOpen ? 'w-56 sm:w-64 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-14 xl:w-16'} bg-gradient-to-b from-red-900 to-red-800 text-white transition-all duration-300 ease-in-out flex flex-col fixed h-screen z-30`}>
        {/* Sidebar Header */}
        <div className={`p-3 sm:p-4 border-b border-red-700 flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center lg:flex-col lg:space-y-4'}`}>
          {sidebarOpen ? (
            <div className="flex items-center space-x-3">
              <div className="bg-white rounded-lg p-2 flex items-center justify-center shadow-sm">
                <img src="/assets/logo.png" alt="IOTFIY Logo" className="w-6 h-6 object-contain" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Super Admin</h2>
                <p className="text-xs text-red-200 font-medium mt-0.5">Control Center</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-2 flex items-center justify-center shadow-sm">
              <img src="/assets/logo.png" alt="IOTFIY Logo" className="w-6 h-6 object-contain" />
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
        <nav className="flex-1 overflow-y-auto py-1.5">
          <div className="px-2 space-y-0.5">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    // Close sidebar on mobile after selection
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center ${sidebarOpen ? 'justify-start px-2' : 'justify-center px-2'} py-1.5 rounded-lg transition-all duration-200 touch-manipulation ${
                    isActive
                      ? 'bg-white text-red-600 shadow-lg font-semibold'
                      : 'text-red-100 hover:bg-red-700 hover:text-white'
                  }`}
                  title={!sidebarOpen ? tab.label : ''}
                >
                  <Icon className={`${sidebarOpen ? 'w-4 h-4 mr-2' : 'w-4 h-4'} flex-shrink-0`} />
                  {sidebarOpen && (
                    <>
                      <span className="text-xs font-medium flex-1 text-left tracking-tight">{tab.label}</span>
                      {tab.count !== undefined && (
                        <span className={`ml-1.5 py-0.5 px-1.5 rounded-full text-[10px] font-bold min-w-[18px] text-center ${
                          tab.badge === 'red' && tab.count > 0
                            ? 'bg-red-500 text-white'
                            : isActive
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
        <div className="p-2 border-t border-red-700">
          <div className={`${sidebarOpen ? 'px-2.5' : 'px-2'} py-2 bg-red-700 rounded-lg`}>
            <div className={`flex items-center ${sidebarOpen ? 'space-x-2' : 'justify-center'}`}>
              <div className="bg-red-600 rounded-full p-1.5 flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{user?.name || 'Super Admin'}</p>
                  <p className="text-[10px] text-red-200 truncate mt-0.5 leading-tight">{user?.email || 'superadmin@example.com'}</p>
                {user?.status && (
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium mt-1.5 capitalize ${
                    user.status === 'unlocked' 
                        ? 'bg-green-500 text-white' 
                      : user.status === 'locked'
                        ? 'bg-red-500 text-white'
                        : 'bg-yellow-500 text-white'
                  }`}>
                    {user.status}
                  </span>
                )}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 w-full ${sidebarOpen ? 'lg:ml-56 xl:ml-64' : 'lg:ml-14 xl:ml-16'} transition-all duration-300 bg-gray-50 min-h-screen`}>
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
        <main className="p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
          <div className="max-w-full overflow-hidden">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Create Admin Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-xl max-w-md w-full mx-2 sm:mx-4 p-4 sm:p-6 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-600" />
                <span className="hidden sm:inline">Create New Admin</span>
                <span className="sm:hidden">New Admin</span>
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

      {/* Plan Manager Modal */}
      {showPlanModal && selectedAdmin && (
        <PlanManager
          admin={selectedAdmin}
          onClose={() => {
            setShowPlanModal(false);
            setSelectedAdmin(null);
          }}
          onUpdatePlan={handleUpdatePlan}
        />
      )}

      {/* Admin Details Modal */}
      {showDetailsModal && selectedAdmin && (
        <AdminDetailsModal
          admin={selectedAdmin}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedAdmin(null);
          }}
        />
      )}
    </div>
  );
};

export default SuperAdminDashboard;

