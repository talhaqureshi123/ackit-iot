import React, { useState, useEffect } from 'react';
import { X, User, Building, MapPin, Thermometer, CheckCircle, XCircle, AlertTriangle, Calendar, Mail, Shield, Crown, Zap, Gift, RefreshCw } from 'lucide-react';
import { superAdminAPI } from '../../services/apiSuperAdmin';
import toast from 'react-hot-toast';

const AdminDetailsModal = ({ admin, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAdminDetails();
  }, [admin]);

  const loadAdminDetails = async () => {
    setLoading(true);
    try {
      const response = await superAdminAPI.getAdminDetails(admin.id);
      setDetails(response.data?.data || response.data);
    } catch (error) {
      console.error('Error loading admin details:', error);
      toast.error('Failed to load admin details');
    } finally {
      setLoading(false);
    }
  };

  const getPlanInfo = (plan) => {
    switch (plan) {
      case 'premium':
        return { icon: Crown, colorClass: 'text-yellow-600', name: 'Premium', limit: '∞' };
      case 'advanced':
        return { icon: Zap, colorClass: 'text-purple-600', name: 'Advanced', limit: 4 };
      default:
        return { icon: Gift, colorClass: 'text-blue-600', name: 'Basic', limit: 2 };
    }
  };

  const getStatusBadge = (status) => {
    const isGood = status === 'active' || status === 'unlocked' || status === 'on';
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        isGood
          ? 'bg-green-100 text-green-700'
          : 'bg-red-100 text-red-700'
      }`}>
        {isGood ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
        {status}
      </span>
    );
  };

  const planInfo = getPlanInfo(admin.plan || 'basic');
  const PlanIcon = planInfo.icon;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'organizations', label: 'Organizations' },
    { id: 'venues', label: 'Venues' },
    { id: 'devices', label: 'Devices' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 rounded-full p-3">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{admin.name}</h2>
              <p className="text-sm text-gray-600">{admin.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex space-x-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Plan Info */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white rounded-lg p-3">
                      <PlanIcon className={`w-6 h-6 ${planInfo.colorClass}`} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Current Plan</p>
                      <p className="text-xl font-bold text-gray-900">{planInfo.name}</p>
                      <p className="text-sm text-gray-600">Limit: {planInfo.limit === '∞' ? 'Unlimited' : `${planInfo.limit} Organizations`}</p>
                    </div>
                  </div>
                  {admin.planExpiresAt && (
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Plan Expires</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date(admin.planExpiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Organizations</p>
                      <p className="text-2xl font-bold text-gray-900">{details?.organizations?.length || 0}</p>
                    </div>
                    <Building className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Venues</p>
                      <p className="text-2xl font-bold text-gray-900">{details?.venues?.length || 0}</p>
                    </div>
                    <MapPin className="w-8 h-8 text-purple-500" />
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Devices</p>
                      <p className="text-2xl font-bold text-gray-900">{details?.devices?.length || 0}</p>
                    </div>
                    <Thermometer className="w-8 h-8 text-green-500" />
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="text-lg font-semibold text-gray-900">{admin.status || 'active'}</p>
                    </div>
                    <Shield className="w-8 h-8 text-red-500" />
                  </div>
                </div>
              </div>

              {/* Admin Info */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-base font-medium text-gray-900">{admin.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="text-base font-medium text-gray-900">
                      {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  {admin.suspendedAt && (
                    <div>
                      <p className="text-sm text-gray-600">Suspended At</p>
                      <p className="text-base font-medium text-red-600">
                        {new Date(admin.suspendedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {admin.suspensionReason && (
                    <div>
                      <p className="text-sm text-gray-600">Suspension Reason</p>
                      <p className="text-base font-medium text-gray-900">{admin.suspensionReason}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'organizations' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Organizations ({details?.organizations?.length || 0})</h3>
              {!details?.organizations || details.organizations.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Building className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No organizations found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {details.organizations.map(org => (
                    <div key={org.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{org.name}</h4>
                        {getStatusBadge(org.status)}
                      </div>
                      {org.batchNumber && (
                        <p className="text-sm text-gray-600">Batch: {org.batchNumber}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Created: {new Date(org.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'venues' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Venues ({details?.venues?.length || 0})</h3>
              {!details?.venues || details.venues.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No venues found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {details.venues.map(venue => (
                    <div key={venue.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{venue.name}</h4>
                        {getStatusBadge(venue.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {venue.temperature && (
                          <div>
                            <span className="text-gray-600">Temperature: </span>
                            <span className="font-medium">{venue.temperature}°C</span>
                          </div>
                        )}
                        {venue.isLocked !== undefined && (
                          <div>
                            <span className="text-gray-600">Locked: </span>
                            <span className="font-medium">{venue.isLocked ? 'Yes' : 'No'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'devices' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Devices/ACs ({details?.devices?.length || 0})</h3>
              {!details?.devices || details.devices.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Thermometer className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No devices found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {details.devices.map(device => (
                    <div key={device.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{device.name || `Device ${device.id}`}</h4>
                        {getStatusBadge(device.status || 'active')}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {device.temperature && (
                          <div>
                            <span className="text-gray-600">Temperature: </span>
                            <span className="font-medium">{device.temperature}°C</span>
                          </div>
                        )}
                        {device.powerState !== undefined && (
                          <div>
                            <span className="text-gray-600">Power: </span>
                            <span className="font-medium">{device.powerState ? 'On' : 'Off'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDetailsModal;





