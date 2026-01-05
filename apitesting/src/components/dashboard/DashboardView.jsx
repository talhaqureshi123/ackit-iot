import React from 'react';
import { Users, Thermometer, MapPin, Building, Plus, Calendar } from 'lucide-react';

/**
 * Reusable Dashboard View Component
 * Used in both AdminDashboard and ManagerDashboard
 */
const DashboardView = ({
  initialLoading = false,
  data = { organizations: [], acs: [], events: [], managers: [] },
  alerts = [],
  userStatus,
  role = 'admin',
  onCreateAC,
  onCreateManager,
  onCreateOrganization
}) => {
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  const totalVenues = data.organizations.reduce((sum, org) => sum + (org.venues?.length || 0), 0);
  const activeACs = data.acs.filter(ac => ac.isOn === true || ac.isOn === 'true' || ac.isOn === 1).length;
  const totalEvents = Array.isArray(data.events) ? data.events.length : 0;
  const activeEvents = Array.isArray(data.events) ? data.events.filter(e => e.status === 'active').length : 0;
  const totalManagers = data.managers?.length || 0;
  const isDisabled = role === 'admin' 
    ? userStatus === 'suspended'
    : (userStatus === 'locked' || userStatus === 'restricted');

  return (
    <div className="space-y-6 w-full px-2 sm:px-0 bg-gray-50 min-h-screen py-6">
      {/* Top Row - Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
        {/* Total Organizations (Manager) / Total Managers (Admin) */}
        {role === 'manager' ? (
          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-gray-900 mb-2">{data.organizations.length}</p>
                <p className="text-gray-600 font-medium">Total Organizations</p>
              </div>
              <div className="bg-blue-100 rounded-xl p-4">
                <Building className="w-10 h-10 text-blue-500" />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-gray-900 mb-2">{totalManagers}</p>
                <p className="text-gray-600 font-medium">Total Managers</p>
              </div>
              <div className="bg-blue-100 rounded-xl p-4">
                <Users className="w-10 h-10 text-blue-500" />
              </div>
            </div>
          </div>
        )}

        {/* Total Appliances */}
        <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-4xl font-bold text-gray-900 mb-2">{data.acs.length}</p>
              <p className="text-gray-600 font-medium">Total Appliances</p>
            </div>
            <div className="bg-blue-100 rounded-xl p-4">
              <Thermometer className="w-10 h-10 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Total Venues */}
        <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-4xl font-bold text-gray-900 mb-2">{totalVenues}</p>
              <p className="text-gray-600 font-medium">Total Venues</p>
            </div>
            <div className="bg-blue-100 rounded-xl p-4">
              <MapPin className="w-10 h-10 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row - Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Add New Device Card */}
        {onCreateAC && (
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Add New Device</h3>
            <p className="text-gray-600 text-sm mb-6">add device from here and start managing it right now</p>
            <button
              onClick={onCreateAC}
              disabled={isDisabled}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add +
            </button>
            <div className="mt-6 flex items-end justify-center space-x-2">
              <div className="bg-gray-100 rounded-lg p-3 w-16 h-20 flex items-center justify-center">
                <Thermometer className="w-8 h-8 text-gray-400" />
              </div>
              <div className="bg-gray-100 rounded-lg p-3 w-16 h-24 flex items-center justify-center">
                <Thermometer className="w-8 h-8 text-gray-400" />
              </div>
              <div className="bg-gray-100 rounded-lg p-3 w-16 h-20 flex items-center justify-center">
                <Thermometer className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          </div>
        )}

        {/* Events Card (Manager) / Staff Management Card (Admin) */}
        {role === 'manager' ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Events</h3>
            <p className="text-gray-600 text-sm mb-6">View your scheduled and active events</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Total Events</span>
                </div>
                <span className="text-3xl font-bold text-blue-600">{totalEvents}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Active Events</span>
                </div>
                <span className="text-3xl font-bold text-green-600">{activeEvents}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Staff Management</h3>
            <p className="text-gray-600 text-sm mb-6">See how many managers in your management list</p>
            <div className="flex justify-center">
              <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200 w-full max-w-xs">
                <p className="text-4xl font-bold text-blue-600 mb-2">{totalManagers}</p>
                <p className="text-lg font-semibold text-gray-700">Managers</p>
              </div>
            </div>
          </div>
        )}

        {/* System Info Card */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow text-white">
          <h3 className="text-2xl font-bold mb-2">System Overview</h3>
          <p className="text-blue-100 text-sm mb-6">view system statistics and information</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white bg-opacity-20 rounded-lg backdrop-blur-sm">
              <span className="text-sm font-medium text-white">Total Organizations</span>
              <span className="text-2xl font-bold">{data.organizations.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white bg-opacity-20 rounded-lg backdrop-blur-sm">
              <span className="text-sm font-medium text-white">Active Events</span>
              <span className="text-2xl font-bold">{activeEvents}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white bg-opacity-20 rounded-lg backdrop-blur-sm">
              <span className="text-sm font-medium text-white">Total Alerts</span>
              <span className="text-2xl font-bold">{alerts.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;





