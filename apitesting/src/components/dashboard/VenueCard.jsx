import React from 'react';
import { MapPin, AlertCircle, Lock, Unlock, Calendar, Thermometer, Power } from 'lucide-react';
import TemperatureControl from './TemperatureControl';
import PowerToggle from './PowerToggle';

/**
 * Reusable Venue Card Component
 * Used in both AdminDashboard and ManagerDashboard
 */
const VenueCard = ({
  venue,
  role = 'admin',
  userStatus,
  data = { acs: [], events: [] },
  allAlerts = [],
  localTemperatures = {},
  temperatureLoading = {},
  isVenueDevicesRemoteLocked,
  onTemperatureChange,
  onTemperatureSet,
  onTemperatureSubmit,
  onTogglePower,
  onViewDetails
}) => {
  // Filter devices that belong to this venue
  const venueACs = Array.isArray(data.acs) 
    ? data.acs.filter(ac => {
        if (venue.organizationId && ac.venueId === venue.organizationId) {
          return false; // Device belongs to organization, not this venue
        }
        return ac.venueId === venue.id;
      })
    : [];
  const venueDeviceIds = venueACs.map(ac => ac.id);
  const isVenueOn = venue.isVenueOn === true || venue.isVenueOn === 'true' || venue.isVenueOn === 1;
  
  // Get device-level alerts
  const venueDeviceAlertsFromAPI = Array.isArray(allAlerts) 
    ? allAlerts.filter(alert => alert.acId && venueDeviceIds.includes(alert.acId))
    : [];
  const venueACsWithAlerts = venueACs.filter(ac => 
    (ac.isWorking === false && ac.isWorking !== null) || ac.alertAt
  );
  const venueDeviceAlerts = [...venueDeviceAlertsFromAPI];
  venueACsWithAlerts.forEach(ac => {
    const exists = venueDeviceAlerts.find(a => a.acId === ac.id);
    if (!exists) {
      venueDeviceAlerts.push({
        acId: ac.id,
        acName: ac.name,
        issue: ac.isWorking === false ? "Device is not working properly" : "Device has an active alert",
      });
    }
  });
  
  // Get device-level events
  const venueEvents = Array.isArray(data.events) 
    ? data.events.filter(e => e.eventType === 'device' && venueDeviceIds.includes(e.deviceId))
    : [];
  
  const hasAlert = venueDeviceAlerts.length > 0;
  const isDisabled = role === 'admin' 
    ? userStatus === 'suspended'
    : (userStatus === 'locked' || userStatus === 'restricted');
  const isLocked = isVenueDevicesRemoteLocked ? isVenueDevicesRemoteLocked(venue) : false;

  return (
    <div className={`bg-white rounded-xl sm:rounded-2xl shadow-xl border-2 ${
      hasAlert ? 'border-blue-400' : 'border-gray-200'
    } hover:shadow-2xl hover:border-blue-400 hover:-translate-y-1 transition-all duration-300 overflow-hidden aspect-square flex flex-col`}>
      {/* Alert Banner */}
      {hasAlert && (
        <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 px-4 py-2 shadow-lg">
          <div className="flex items-center justify-center space-x-2">
            <AlertCircle className="w-4 h-4 text-white flex-shrink-0 animate-pulse" />
            <p className="text-xs font-bold text-white truncate">
              {venueDeviceAlerts.length} Alert{venueDeviceAlerts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      <div className="p-3 flex-1 flex flex-col">
        {/* Venue Name */}
        <div className="mb-1.5 pb-1.5 border-b border-gray-200">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className={`text-sm font-extrabold ${
                hasAlert ? 'text-blue-900' : 'text-gray-900'
              } truncate`}>
                {venue.name}
              </h3>
            </div>
            <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-500 rounded-lg p-1.5 flex-shrink-0 shadow-md">
              <MapPin className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center flex-wrap gap-1 mb-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
            venue.status === 'active' ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'
          }`}>
            {venue.status || 'active'}
          </span>
          {isLocked ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-yellow-500 text-white">
              <Lock className="w-3 h-3 mr-0.5" />
              Locked
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-green-500 text-white">
              <Unlock className="w-3 h-3 mr-0.5" />
              Unlocked
            </span>
          )}
          {hasAlert && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-600 text-white">
              <AlertCircle className="w-3 h-3 mr-0.5" />
            </span>
          )}
          {venueEvents.length > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-500 text-white">
              <Calendar className="w-3 h-3 mr-0.5" />
              {venueEvents.length}
            </span>
          )}
          {venue.hasMixedTemperatures && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-400 text-white">
              Mixed
            </span>
          )}
        </div>

        {/* Venue Info */}
        <div className="bg-gray-50 rounded-lg p-1.5 mb-1.5 border border-gray-200">
          <div className="grid grid-cols-1 gap-1">
            {venueACs.length > 0 && (
              <div className="flex items-center justify-between bg-white rounded px-1.5 py-1">
                <div className="flex items-center space-x-1">
                  <Thermometer className="w-3 h-3 text-blue-600" />
                  <span className="text-xs font-semibold text-gray-700">ACs</span>
                </div>
                <span className="text-xs font-bold text-gray-900">{venueACs.length}</span>
              </div>
            )}
          </div>
        </div>

        {/* Temperature Control */}
        <TemperatureControl
          type="venue"
          id={venue.id}
          currentTemperature={venue.temperature ?? 16}
          localTemperature={localTemperatures[`venue-${venue.id}`]}
          isLoading={temperatureLoading[`venue-${venue.id}`]}
          isDisabled={isDisabled}
          hasMixedTemperatures={venue.hasMixedTemperatures}
          onTemperatureChange={onTemperatureChange}
          onTemperatureSet={onTemperatureSet}
          onTemperatureSubmit={onTemperatureSubmit}
          size="compact"
        />

        {/* Power Toggle */}
        <PowerToggle
          isOn={isVenueOn}
          isDisabled={isDisabled}
          onToggle={(newState) => onTogglePower(venue.id, newState)}
          label="Power"
          type="toggle"
        />

        {/* Action Buttons */}
        <div className="flex gap-1.5 mt-auto">
          <button
            onClick={() => onViewDetails(venue.id)}
            className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-md text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors shadow-sm"
            title="View venue dashboard"
          >
            <MapPin className="w-3 h-3" />
            <span>View Details</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VenueCard;

