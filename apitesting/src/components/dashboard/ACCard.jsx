import React from 'react';
import { Thermometer, AlertCircle, Power, Lock, Unlock, MapPin, Eye, Plus, Trash2 } from 'lucide-react';
import TemperatureControl from './TemperatureControl';
import PowerToggle from './PowerToggle';

/**
 * Reusable AC Device Card Component
 * Used in both AdminDashboard and ManagerDashboard
 */
const ACCard = ({
  ac,
  role = 'admin',
  userStatus,
  data = { events: [] },
  alerts = [],
  allAlerts = [],
  localTemperatures = {},
  temperatureLoading = {},
  isDeviceRemoteLocked,
  onTemperatureChange,
  onTemperatureSet,
  onTemperatureSubmit,
  onTogglePower,
  onViewDetails,
  onDelete, // Admin only
  onCreateEvent,
  setSelectedEvent,
  setShowEventTypeSelection
}) => {
  // Check alerts
  const acAlert = allAlerts.find(a => a.acId === ac.id) || alerts.find(a => a.acId === ac.id);
  const hasAlert = acAlert || ac.isWorking === false || ac.alertAt;
  
  // Find events for this device
  const deviceEvents = Array.isArray(data.events) 
    ? data.events.filter(e => e.deviceId === ac.id && e.eventType === 'device')
    : [];
  const activeEvent = deviceEvents.find(e => e.status === 'active' && !e.isDisabled);
  const scheduledEvent = deviceEvents.find(e => e.status === 'scheduled' && !e.isDisabled);
  const hasEvent = activeEvent || scheduledEvent;
  const eventTemp = hasEvent ? (activeEvent?.temperature || scheduledEvent?.temperature) : null;
  
  const isDisabled = role === 'admin' 
    ? userStatus === 'suspended'
    : (userStatus === 'locked' || userStatus === 'restricted');
  const isLocked = isDeviceRemoteLocked ? isDeviceRemoteLocked(ac) : false;

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
              {acAlert?.issue || 'Device Alert'}
            </p>
          </div>
        </div>
      )}

      <div className="p-3 flex-1 flex flex-col">
        {/* Device Name */}
        <div className="mb-1.5 pb-1.5 border-b border-gray-200">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className={`text-sm font-extrabold ${
                hasAlert ? 'text-blue-900' : 'text-gray-900'
              } truncate`}>
                {ac.name}
              </h3>
            </div>
            <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-500 rounded-lg p-1.5 flex-shrink-0 shadow-md">
              <Thermometer className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center flex-wrap gap-1 mb-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
            ac.isOn ? 'bg-blue-500 text-white' : 'bg-gray-400 text-white'
          }`}>
            <Power className="w-3 h-3 mr-0.5" />
            {ac.isOn ? 'ON' : 'OFF'}
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
        </div>

        {/* Device Info */}
        <div className="bg-gray-50 rounded-lg p-1.5 mb-1.5 border border-gray-200">
          {ac.venue && (
            <div className="flex items-center justify-between bg-white rounded px-1.5 py-1">
              <div className="flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-blue-600" />
                <span className="text-xs font-semibold text-gray-700">Venue</span>
              </div>
              <span className="text-xs font-bold text-gray-900 truncate ml-1 max-w-[80px]">
                {ac.venue.name}
              </span>
            </div>
          )}
        </div>

        {/* Temperature Control */}
        <TemperatureControl
          type="ac"
          id={ac.id}
          currentTemperature={ac.temperature ?? 16}
          localTemperature={localTemperatures[`ac-${ac.id}`]}
          isLoading={temperatureLoading[`ac-${ac.id}`]}
          isDisabled={isDisabled || hasEvent}
          hasEvent={hasEvent}
          eventTemperature={eventTemp}
          onTemperatureChange={onTemperatureChange}
          onTemperatureSet={onTemperatureSet}
          onTemperatureSubmit={onTemperatureSubmit}
          size="large"
        />

        {/* Power Toggle */}
        <PowerToggle
          isOn={ac.isOn}
          isDisabled={isDisabled}
          onToggle={(newState) => onTogglePower(ac.id, newState)}
          label="Power"
          type="button"
        />

        {/* Action Buttons */}
        <div className="flex gap-1 mt-auto">
          {onCreateEvent && (
            <button
              onClick={() => {
                const tempEvent = { deviceId: String(ac.id) };
                if (setSelectedEvent) setSelectedEvent(tempEvent);
                if (setShowEventTypeSelection) setShowEventTypeSelection(true);
                if (onCreateEvent) onCreateEvent(ac.id);
              }}
              disabled={isDisabled}
              className="flex-1 flex items-center justify-center space-x-0.5 px-1.5 py-1 rounded-md text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              title={isDisabled ? 'Cannot create events' : 'Create Event for this device'}
            >
              <Plus className="w-2.5 h-2.5" />
              <span>Event</span>
            </button>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onViewDetails(ac.id);
            }}
            className="flex-1 flex items-center justify-center space-x-0.5 px-1.5 py-1 rounded-md text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors shadow-sm"
            title="View brand, model, serial number, organization, and more"
          >
            <Eye className="w-2.5 h-2.5" />
            <span>View</span>
          </button>
          {role === 'admin' && onDelete && (
            <button
              onClick={() => onDelete(ac.id, ac.name)}
              disabled={isDisabled}
              className="flex items-center justify-center space-x-0.5 px-1.5 py-1 rounded-md text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              title="Delete this AC device (Admin only)"
            >
              <Trash2 className="w-2.5 h-2.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ACCard;

