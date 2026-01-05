import React from 'react';
import { Zap, Download, RefreshCw, Thermometer, MapPin, Building, Eye } from 'lucide-react';

/**
 * Reusable Energy Consumption View Component
 * Used in both AdminDashboard and ManagerDashboard
 */
const EnergyConsumptionView = ({
  data = { acs: [], organizations: [], venues: [] },
  energyData = { acs: {}, organizations: {} },
  energyLoading = {},
  energyViewMode = 'device',
  userStatus,
  role = 'admin',
  onViewModeChange,
  onDownloadReport,
  onRefreshAll,
  onViewOrganizationDetails,
  onViewVenueDetails,
  onLoadACEnergy,
  onLoadOrganizationEnergy,
  getDeviceOrgAndVenue
}) => {
  const totalEnergy = data.acs.reduce((sum, ac) => sum + (ac.totalEnergyConsumed || 0), 0);
  const activeACsCount = data.acs.filter(ac => ac.isOn).length;
  const totalACsCount = data.acs.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Zap className="w-6 h-6 mr-2 text-blue-600" />
            Energy Consumption
          </h2>
          <p className="text-sm text-gray-600 mt-1">Monitor and track energy usage across all AC devices</p>
        </div>
        <div className="flex gap-2">
          {onDownloadReport && (
            <button
              onClick={onDownloadReport}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </button>
          )}
          {onRefreshAll && (
            <button
              onClick={onRefreshAll}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh All
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Energy Consumed</p>
              <p className="text-3xl font-bold mt-2">{totalEnergy.toFixed(2)} kWh</p>
              <p className="text-blue-100 text-xs mt-1">Lifetime consumption</p>
            </div>
            <Zap className="w-12 h-12 text-blue-200 opacity-50" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Active AC Devices</p>
              <p className="text-3xl font-bold mt-2">{activeACsCount} / {totalACsCount}</p>
              <p className="text-blue-100 text-xs mt-1">Currently running</p>
            </div>
            <Zap className="w-12 h-12 text-blue-200 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Organizations</p>
              <p className="text-3xl font-bold mt-2">{data.organizations.length}</p>
              <p className="text-blue-100 text-xs mt-1">With AC devices</p>
            </div>
            <Building className="w-12 h-12 text-blue-200 opacity-50" />
          </div>
        </div>
      </div>

      {/* View Mode Toggle Buttons */}
      {onViewModeChange && (
        <div className="flex gap-2 mb-4 items-center">
          <button
            onClick={() => onViewModeChange('device')}
            className={`flex items-center px-4 py-2 rounded-lg font-semibold transition-all ${
              energyViewMode === 'device'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Thermometer className="w-4 h-4 mr-2" />
            Energy by Device
          </button>
          <button
            onClick={() => onViewModeChange('venue')}
            className={`flex items-center px-4 py-2 rounded-lg font-semibold transition-all ${
              energyViewMode === 'venue'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <MapPin className="w-4 h-4 mr-2" />
            Energy by Venue
          </button>
          <button
            onClick={() => onViewModeChange('organization')}
            className={`flex items-center px-4 py-2 rounded-lg font-semibold transition-all ${
              energyViewMode === 'organization'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Building className="w-4 h-4 mr-2" />
            Energy by Organization
          </button>
        </div>
      )}

      {/* Energy View Content - This should be rendered by parent component based on viewMode */}
      <div className="text-center py-8 text-gray-500">
        <p>Energy consumption details will be rendered here based on view mode</p>
        <p className="text-sm mt-2">Current mode: {energyViewMode}</p>
      </div>
    </div>
  );
};

export default EnergyConsumptionView;





