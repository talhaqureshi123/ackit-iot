import React from 'react';
import { Building, AlertCircle, PlayCircle, Pause, Calendar, MapPin, Eye, UserPlus, Power } from 'lucide-react';
import TemperatureControl from './TemperatureControl';
import PowerToggle from './PowerToggle';

/**
 * Reusable Organization Card Component
 * Used in both AdminDashboard and ManagerDashboard
 */
const OrganizationCard = ({
  org,
  role = 'admin', // 'admin' | 'manager'
  userStatus, // 'active' | 'suspended' for admin, 'unlocked' | 'locked' | 'restricted' for manager
  data = { acs: [], events: [], managers: [] },
  alerts = [],
  localTemperatures = {},
  temperatureLoading = {},
  onTemperatureChange,
  onTemperatureSet,
  onTemperatureSubmit,
  onTogglePower,
  onViewDetails,
  onAssign, // Admin only
  isAssignedToManager = false,
  assignedManager = null
}) => {
  // Find device events for devices in this organization
  const orgDeviceIds = Array.isArray(data.acs) 
    ? data.acs.filter(ac => ac.organizationId === org.id).map(ac => ac.id) 
    : [];
  const orgEvents = Array.isArray(data.events) 
    ? data.events.filter(e => e.eventType === 'device' && orgDeviceIds.includes(e.deviceId))
    : [];
  const activeEvent = orgEvents.find(e => e.status === 'active');
  const disabledEvent = orgEvents.find(e => e.isDisabled === true);
  const scheduledEvent = orgEvents.find(e => e.status === 'scheduled');
  
  // Check if organization has alerts
  const orgAlert = alerts.find(a => a.organizationId === org.id && a.alertType === 'organization');
  const orgDeviceAlerts = alerts.filter(a => a.organizationId === org.id && a.acId);
  const hasAlert = orgAlert || orgDeviceAlerts.length > 0;
  
  const isDisabled = role === 'admin' 
    ? userStatus === 'suspended'
    : (userStatus === 'locked' || userStatus === 'restricted');
  
  const isOn = org.isOrganizationOn === true || org.isOrganizationOn === 'true' || org.isOrganizationOn === 1;
  const currentTemp = localTemperatures[`organization-${org.id}`] !== undefined 
    ? localTemperatures[`organization-${org.id}`] 
    : (org.temperature ?? 16);

  return (
    <div className={`rounded-xl sm:rounded-2xl shadow-xl border-2 ${
      isAssignedToManager 
        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-400' 
        : hasAlert 
          ? 'bg-white border-blue-400' 
          : 'bg-white border-gray-200'
    } hover:shadow-2xl hover:border-blue-400 hover:-translate-y-1 transition-all duration-300 overflow-hidden aspect-square flex flex-col`}>
      {/* Alert Banner */}
      {hasAlert && (
        <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 px-4 py-2 shadow-lg">
          <div className="flex items-center justify-center space-x-2">
            <AlertCircle className="w-4 h-4 text-white flex-shrink-0 animate-pulse" />
            <p className="text-xs font-bold text-white truncate">
              {orgDeviceAlerts.length} Alert{orgDeviceAlerts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Product Card Style Layout */}
      <div className="p-3 flex-1 flex flex-col">
        {/* Organization Name - Enhanced */}
        <div className="mb-1.5 pb-1.5 border-b border-gray-200">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className={`text-sm font-extrabold ${
                isAssignedToManager 
                  ? 'text-green-900' 
                  : hasAlert 
                    ? 'text-blue-900' 
                    : 'text-gray-900'
              } truncate`}>
                {org.name}
              </h3>
              {isAssignedToManager && assignedManager && (
                <p className="text-xs font-semibold text-green-700 mt-0.5">
                  Fully assigned to {assignedManager.name}
                </p>
              )}
            </div>
            <div className={`rounded-lg p-1.5 flex-shrink-0 shadow-md ${
              isAssignedToManager 
                ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                : 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-500'
            }`}>
              <Building className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Status Badges - Compact */}
        <div className="flex items-center flex-wrap gap-1 mb-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
            org.status === 'active' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-500 text-white'
          }`}>
            {org.status || 'active'}
          </span>
          {org.hasMixedTemperatures && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-400 text-white">
              Mixed
            </span>
          )}
          {activeEvent && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-500 text-white">
              <PlayCircle className="w-3 h-3 mr-0.5" />
            </span>
          )}
          {disabledEvent && !activeEvent && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-400 text-white">
              <Pause className="w-3 h-3 mr-0.5" />
            </span>
          )}
          {scheduledEvent && !activeEvent && !disabledEvent && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-gray-500 text-white">
              <Calendar className="w-3 h-3 mr-0.5" />
            </span>
          )}
          {orgEvents.length > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-500 text-white">
              <Calendar className="w-3 h-3 mr-0.5" />
              {orgEvents.length}
            </span>
          )}
        </div>

        {/* Temperature Control */}
        <TemperatureControl
          type="organization"
          id={org.id}
          currentTemperature={org.temperature ?? 16}
          localTemperature={localTemperatures[`organization-${org.id}`]}
          isLoading={temperatureLoading[`organization-${org.id}`]}
          isDisabled={isDisabled}
          hasMixedTemperatures={org.hasMixedTemperatures}
          onTemperatureChange={onTemperatureChange}
          onTemperatureSet={onTemperatureSet}
          onTemperatureSubmit={onTemperatureSubmit}
          size="compact"
        />

        {/* Organization Info - Compact */}
        <div className="bg-gray-50 rounded-lg p-1.5 mb-1.5 border border-gray-200">
          <div className="grid grid-cols-1 gap-1">
            {org.venues && org.venues.length > 0 && (
              <div className="flex items-center justify-between bg-white rounded px-1.5 py-1">
                <div className="flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-blue-600" />
                  <span className="text-xs font-semibold text-gray-700">Venues</span>
                </div>
                <span className="text-xs font-bold text-gray-900">{org.venues.length}</span>
              </div>
            )}
          </div>
        </div>

        {/* Organization Power Control */}
        <PowerToggle
          isOn={isOn}
          isDisabled={isDisabled}
          onToggle={(newState) => onTogglePower(org.id, newState)}
          label="Power"
          type="toggle"
        />

        {/* Action Buttons - Compact */}
        <div className="flex gap-1.5 mt-auto">
          {role === 'admin' && !isAssignedToManager && onAssign && (
            <button
              onClick={() => onAssign(org)}
              className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-md text-xs font-bold text-white bg-green-500 hover:bg-green-600 transition-colors shadow-sm"
              title="Assign organization to manager"
            >
              <UserPlus className="w-3 h-3" />
              <span>Assign</span>
            </button>
          )}
          <button
            onClick={() => onViewDetails(org.id)}
            className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-md text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors shadow-sm"
            title="View description, events, remote lock, and more"
          >
            <Eye className="w-3 h-3" />
            <span>View</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrganizationCard;

