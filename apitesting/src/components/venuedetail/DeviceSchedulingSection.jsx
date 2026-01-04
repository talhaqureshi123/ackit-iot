import React, { useState } from 'react';
import { Plus, Lock, Unlock, AlertTriangle, Zap, Edit, Trash2, Play, Square, Calendar, Clock, Thermometer, Repeat } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/apiAdmin';
import { managerAPI } from '../../services/apiManager';
import { useAuth } from '../../contexts/AuthContext';

// Helper function to format days - show range if consecutive, otherwise individual
// Handles both day names (Mon, Tue) and numeric indices (0-6, where 0=Sun, 1=Mon, etc.)
const formatDays = (daysString) => {
  if (!daysString) return [];
  
  // Day order: Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6
  const dayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = daysString.split(' ').filter(d => d.trim());
  
  if (days.length === 0) return [];
  if (days.length === 1) {
    // Single day - check if it's a number or name
    const day = days[0].trim();
    const numDay = parseInt(day);
    if (!isNaN(numDay) && numDay >= 0 && numDay <= 6) {
      return [dayOrder[numDay]];
    }
    // Check if it's already a day name
    const dayIndex = dayOrder.indexOf(day);
    if (dayIndex !== -1) {
      return [day];
    }
    return [day]; // Return as-is if not recognized
  }
  
  // Convert all days to indices
  const indices = days.map(day => {
    const trimmed = day.trim();
    // Check if it's a number
    const numDay = parseInt(trimmed);
    if (!isNaN(numDay) && numDay >= 0 && numDay <= 6) {
      return numDay;
    }
    // Check if it's a day name
    const dayIndex = dayOrder.indexOf(trimmed);
    if (dayIndex !== -1) {
      return dayIndex;
    }
    return -1; // Unknown day
  }).filter(idx => idx !== -1).sort((a, b) => a - b);
  
  if (indices.length === 0) return days;
  
  // Check if all days are consecutive
  const isConsecutive = indices.every((idx, i) => i === 0 || idx === indices[i - 1] + 1);
  
  if (isConsecutive && indices.length > 1) {
    // Show as range
    return [`${dayOrder[indices[0]]}-${dayOrder[indices[indices.length - 1]]}`];
  }
  
  return indices.map(idx => dayOrder[idx]);
};


// Helper function to format date and day
const formatEventDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    return `${dayName}, ${day} ${month}`;
  } catch (error) {
    return dateString;
  }
};

// Helper function to format time from timeStart/timeEnd
const formatTime = (timeString) => {
  if (!timeString) return '';
  try {
    // Handle formats like "17:15:00" or "5:15 PM"
    if (timeString.includes(':')) {
      const parts = timeString.split(':');
      const hour = parseInt(parts[0]);
      const minutes = parts[1] || '00';
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
      return `${displayHour}:${minutes.padStart(2, '0')} ${ampm}`;
    }
    return timeString;
  } catch (error) {
    return timeString;
  }
};

// Helper to format date time from ISO string
const formatDateTime = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    return dateString;
  }
};

const DeviceSchedulingSection = ({ 
  filteredDevices, 
  events, 
  faultDevices, 
  totalEnergy, 
  selectedDevice,
  venue,
  onEventEdit,
  onEventDelete,
  onEventEnable,
  onEventDisable,
  onReloadEvents
}) => {
  const { user } = useAuth();
  const [showDeviceLockDropdown, setShowDeviceLockDropdown] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  
  // Determine which API to use based on user role
  const isManager = user?.role === 'manager';
  const eventAPI = isManager ? managerAPI : adminAPI;
  
  // Use selectedDevice if available, otherwise use first device from filteredDevices
  const displayDevice = selectedDevice || (filteredDevices.length > 0 ? filteredDevices[0] : null);
  
  // Check if venue is locked (all devices in venue are locked)
  const isVenueLocked = venue && filteredDevices.length > 0 && filteredDevices.every(device => device.currentState === "locked");
  
  // Check if device is offline
  const isDeviceOffline = displayDevice && !displayDevice.isConnected;
  
  // Debug: Log device energy
  if (displayDevice) {
    console.log(`🔋 [DeviceScheduling] Selected device "${displayDevice.name}" (ID: ${displayDevice.id}) energy: ${displayDevice.totalEnergyConsumed || 0} KV`);
    console.log(`🔒 [DeviceScheduling] Venue locked: ${isVenueLocked}, Device locked: ${displayDevice.currentState === "locked"}`);
  } else {
    console.log(`⚠️ [DeviceScheduling] No device selected`);
  }
  
  // Get events for the selected/display device
  const deviceEvents = displayDevice ? events.filter(e => e.deviceId === displayDevice.id) : [];
  
  // Handle enable/disable
  const handleEnableDisable = async (eventId, action) => {
    const key = `${eventId}-${action}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));
    try {
      if (action === 'enable') {
        await eventAPI.enableEvent(eventId);
        toast.success('Event enabled successfully');
      } else {
        await eventAPI.disableEvent(eventId);
        toast.success('Event disabled successfully');
      }
      if (onReloadEvents) {
        await onReloadEvents();
      }
      // Also call onEventEnable/onEventDisable if provided
      if (action === 'enable' && onEventEnable) {
        await onEventEnable();
      } else if (action === 'disable' && onEventDisable) {
        await onEventDisable();
      }
    } catch (error) {
      console.error(`Error ${action}ing event:`, error);
      toast.error(error.response?.data?.message || `Failed to ${action} event`);
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  };
  
  // Handle delete
  const handleDelete = async (eventId, eventName) => {
    if (!window.confirm(`Are you sure you want to delete event "${eventName}"?`)) {
      return;
    }
    const key = `${eventId}-delete`;
    setActionLoading(prev => ({ ...prev, [key]: true }));
    try {
      await eventAPI.deleteEvent(eventId);
      toast.success('Event deleted successfully');
      if (onReloadEvents) {
        await onReloadEvents();
      }
      // Also call onEventDelete if provided
      if (onEventDelete) {
        await onEventDelete();
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to delete event';
      toast.error(errorMessage);
      console.error('Delete error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-md border w-full sm:w-[280px] md:w-[300px] -ml-0 sm:-ml-2 md:-ml-4 border-gray-200 p-3 sm:p-4 flex flex-col" style={{ maxHeight: '480px', height: '500px' }}>
      {/* Device ID with Lock Dropdown */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 pb-2 border-b border-gray-200 gap-2">
        <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 truncate flex-1 min-w-0">
          {displayDevice ? displayDevice.name : 'No Device Selected'}
        </h3>
        <div className="relative device-lock-dropdown-container">
          <button
            onClick={() => {
              // Revert action if device is offline
              if (isDeviceOffline) {
                toast.error('⚠️ Device is offline. Action reverted.');
                return;
              }
              setShowDeviceLockDropdown(!showDeviceLockDropdown);
            }}
            disabled={(isVenueLocked && displayDevice?.currentState !== "locked") || isDeviceOffline}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border-none ${
              (isVenueLocked || (displayDevice && (displayDevice.currentState === "locked" || displayDevice.isLocked)))
                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                : 'bg-green-500 text-white hover:bg-green-600'
            } ${(isVenueLocked || isDeviceOffline) ? 'opacity-75 cursor-not-allowed' : ''}`}
            title={isDeviceOffline ? 'Device is offline - action reverted' : (isVenueLocked ? 'Venue is locked - all devices are locked' : '')}
          >
            {(isVenueLocked || (displayDevice && (displayDevice.currentState === "locked" || displayDevice.isLocked))) ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Locked</span>
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5" />
                <span>Unlocked</span>
              </>
            )}
            <span className="text-xs">▼</span>
          </button>
          {showDeviceLockDropdown && (
            <div className="absolute top-full right-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[160px]">
              <button
                onClick={async () => {
                  if (!displayDevice) return;
                  // Revert action if device is offline
                  if (isDeviceOffline) {
                    toast.error('⚠️ Device is offline. Action reverted.');
                    setShowDeviceLockDropdown(false);
                    return;
                  }
                  if (isVenueLocked) {
                    toast.error('Cannot unlock device: Venue is locked. Unlock venue first.');
                    setShowDeviceLockDropdown(false);
                    return;
                  }
                  setShowDeviceLockDropdown(false);
                  try {
                    // Unlock device - unlock the venue that contains this device (unlocks all devices)
                    if (displayDevice.venueId) {
                      const response = await adminAPI.remoteUnlockVenue(displayDevice.venueId);
                      toast.success(response.data?.message || 'All devices in venue unlocked successfully');
                      if (onReloadEvents) {
                        await onReloadEvents();
                      }
                    } else {
                      toast.error('Device venue not found');
                    }
                  } catch (error) {
                    console.error('Unlock device error:', error);
                    toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to unlock device');
                  }
                }}
                disabled={isVenueLocked || isDeviceOffline}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                  (isVenueLocked || isDeviceOffline)
                    ? 'opacity-50 cursor-not-allowed bg-gray-50 text-gray-400'
                    : displayDevice && (displayDevice.currentState === "locked" || displayDevice.isLocked)
                    ? 'hover:bg-gray-50'
                    : 'bg-green-50 hover:bg-green-100 text-green-700'
                }`}
                title={isDeviceOffline ? 'Device is offline - action reverted' : (isVenueLocked ? 'Venue is locked - unlock venue first' : 'Unlock all devices in venue')}
              >
                <Unlock className={`w-4 h-4 ${
                  isVenueLocked
                    ? 'text-gray-400'
                    : displayDevice && (displayDevice.currentState === "locked" || displayDevice.isLocked)
                    ? 'text-green-600'
                    : 'text-green-600'
                }`} />
                <span>{displayDevice && (displayDevice.currentState === "locked" || displayDevice.isLocked) ? 'Unlock Device' : 'Unlocked'}</span>
              </button>
              <button
                onClick={async () => {
                  if (!displayDevice) return;
                  // Revert action if device is offline
                  if (isDeviceOffline) {
                    toast.error('⚠️ Device is offline. Action reverted.');
                    setShowDeviceLockDropdown(false);
                    return;
                  }
                  if (isVenueLocked) {
                    toast.info('Venue is already locked - all devices are locked');
                    setShowDeviceLockDropdown(false);
                    return;
                  }
                  setShowDeviceLockDropdown(false);
                  try {
                    // Lock only this specific device (not the entire venue)
                    const response = await adminAPI.toggleACLockStatus(displayDevice.id, 'lock', 'Locked from device panel');
                    toast.success(response.data?.message || 'Device locked successfully');
                    if (onReloadEvents) {
                      await onReloadEvents();
                    }
                  } catch (error) {
                    console.error('Lock device error:', error);
                    toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to lock device');
                  }
                }}
                disabled={isVenueLocked || isDeviceOffline}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                  (isVenueLocked || isDeviceOffline)
                    ? 'opacity-50 cursor-not-allowed bg-gray-50 text-gray-400'
                    : displayDevice && (displayDevice.currentState === "locked" || displayDevice.isLocked)
                    ? 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700'
                    : 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700'
                }`}
                title={isDeviceOffline ? 'Device is offline - action reverted' : (isVenueLocked ? 'Venue is locked - all devices are already locked' : (displayDevice && (displayDevice.currentState === "locked" || displayDevice.isLocked) ? 'Device is already locked' : 'Lock this specific device'))}
              >
                <Lock className={`w-4 h-4 ${
                  isVenueLocked
                    ? 'text-gray-400'
                    : displayDevice && (displayDevice.currentState === "locked" || displayDevice.isLocked)
                    ? 'text-yellow-600'
                    : 'text-yellow-600'
                }`} />
                <span>{displayDevice && (displayDevice.currentState === "locked" || displayDevice.isLocked) ? 'Locked' : 'Lock Device'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fault Devices and Energy Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
        <div className="bg-red-50 rounded-lg sm:rounded-xl p-2 sm:p-3 border border-red-200">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" />
            <span className="text-[10px] sm:text-xs font-medium text-red-600">Fault Devices</span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-gray-900">{faultDevices} Devices</p>
        </div>
        <div className="bg-yellow-50 rounded-lg sm:rounded-xl p-2 sm:p-3 border border-yellow-200">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-600" />
            <span className="text-[10px] sm:text-xs font-medium text-yellow-600">Energy</span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-gray-900">
            {displayDevice && displayDevice.isConnected ? (displayDevice.totalEnergyConsumed || 0).toFixed(1) : '0.0'} KV
          </p>
          {displayDevice && !displayDevice.isConnected && (
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Device offline</p>
          )}
        </div>
      </div>

      {/* Events Title with Plus Button */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
          <h4 className="text-xs sm:text-sm font-bold text-gray-900">Events</h4>
          {deviceEvents.length > 0 && (
            <span className="text-[10px] sm:text-xs font-medium text-gray-500 bg-gray-100 px-1.5 sm:px-2 py-0.5 rounded-full flex-shrink-0">
              {deviceEvents.length}
            </span>
          )}
        </div>
        {displayDevice && onEventEdit && (
          <button 
            onClick={() => onEventEdit({ deviceId: displayDevice.id })}
            className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-full border border-blue-200 bg-white transition-all hover:scale-110 flex-shrink-0"
            title="Create new event"
          >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
        )}
      </div>

      <div className="space-y-2 sm:space-y-3 overflow-y-auto pr-1 sm:pr-2 flex-1 custom-scrollbar" style={{ maxHeight: '200px', minHeight: '120px' }}>
        {/* Show message if no device selected */}
        {!displayDevice && (
          <div className="text-center text-gray-500 py-6 sm:py-8 px-2">
            <p className="text-xs sm:text-sm">Please select a device from the table to view its events</p>
          </div>
        )}
        
        {/* Show message if device selected but no events */}
        {displayDevice && deviceEvents.length === 0 && (
          <div className="text-center text-gray-500 py-6 sm:py-8 px-2">
            <p className="text-xs sm:text-sm">No events found for <span className="font-medium">{displayDevice.name}</span></p>
          </div>
        )}
        
        {/* Events List */}
        {displayDevice && deviceEvents.slice(0, 10).map((event, index) => {
          const isLoading = actionLoading[`${event.id}-enable`] || 
                           actionLoading[`${event.id}-disable`] || 
                           actionLoading[`${event.id}-delete`];
          const isDisabled = event.isDisabled || false;
          const isRecurring = event.isRecurring || false;
          
          // Get event date - use startTime or recurringStartDate
          const eventDate = event.startTime || event.recurringStartDate;
          let formattedDate = '';
          let startTime = '';
          let endTime = '';
          
          if (isRecurring) {
            // For recurring events, use recurringStartDate for date
            formattedDate = event.recurringStartDate ? formatEventDate(event.recurringStartDate) : '';
            startTime = event.timeStart ? formatTime(event.timeStart) : '';
            endTime = event.timeEnd ? formatTime(event.timeEnd) : '';
          } else {
            // For one-time events, extract date and time separately
            if (event.startTime) {
              const startDate = new Date(event.startTime);
              formattedDate = formatEventDate(event.startTime);
              startTime = formatTime(`${startDate.getHours()}:${String(startDate.getMinutes()).padStart(2, '0')}:${String(startDate.getSeconds()).padStart(2, '0')}`);
            }
            if (event.endTime) {
              const endDate = new Date(event.endTime);
              endTime = formatTime(`${endDate.getHours()}:${String(endDate.getMinutes()).padStart(2, '0')}:${String(endDate.getSeconds()).padStart(2, '0')}`);
            }
          }
          
          // Get status badge
          const statusColor = isDisabled 
            ? 'bg-gray-100 text-gray-600 border-gray-300' 
            : event.status === 'active' 
            ? 'bg-green-100 text-green-700 border-green-300'
            : 'bg-blue-100 text-blue-700 border-blue-300';
          
          return (
            <div 
              key={event.id || index} 
              className={`bg-gradient-to-br from-white to-gray-50 rounded-lg p-2 sm:p-2.5 border transition-all hover:shadow-md relative pb-12 sm:pb-14 ${
                isDisabled 
                  ? 'border-gray-200 opacity-75 bg-gray-50' 
                  : event.status === 'active'
                  ? 'border-green-200 hover:border-green-300'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              {/* Edit and Delete Icons - Top Right */}
              <div className="absolute top-1.5 sm:top-2 right-1 flex items-center gap-1 sm:gap-1.5">
                <button
                  onClick={() => {
                    if (onEventEdit) {
                      onEventEdit(event);
                    }
                  }}
                  disabled={isLoading}
                  className="p-1 sm:p-1.5 text-blue-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Edit event"
                >
                  <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={() => handleDelete(event.id, event.name || 'Event')}
                  disabled={isLoading}
                  className="p-1 sm:p-1.5 text-red-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete event"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2 sm:gap-3 pr-10 sm:pr-12">
                {/* Event Name - Top */}
                <div>
                  {event.name && (
                    <h5 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight truncate">
                      {event.name}
                    </h5>
                  )}
                </div>
                
                {/* Main Content - Date, Time, Temperature */}
                <div className="space-y-1.5 sm:space-y-2">
                  {/* Date and Time Row */}
                  <div className="flex flex-col gap-1 sm:gap-1.5">
                    {/* Date */}
                    {formattedDate && (
                      <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-700">
                        <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 flex-shrink-0" />
                        <span className="font-medium truncate">{formattedDate}</span>
                      </div>
                    )}
                    
                    {/* Time */}
                    {(startTime || endTime) && (
                      <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-700">
                        <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 flex-shrink-0" />
                        <span className="font-medium truncate">
                          {startTime || 'N/A'} {endTime && <span className="text-gray-400 mx-0.5 sm:mx-1">→</span>} {endTime}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Temperature and Days Row */}
                  <div className="flex flex-col gap-1 sm:gap-1.5">
                    {/* Temperature */}
                    {event.temperature && (
                      <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-700">
                        <Thermometer className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-500 flex-shrink-0" />
                        <span className="font-semibold text-red-600">{event.temperature}°C</span>
                      </div>
                    )}
                    
                    {/* Days of Week for Recurring Events */}
                    {event.daysOfWeek && event.daysOfWeek.length > 0 && (
                      <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                        {(() => {
                          // Handle daysOfWeek - convert array of numbers to day names
                          let daysToFormat;
                          if (Array.isArray(event.daysOfWeek)) {
                            // If it's an array of numbers [3, 4, 5], convert directly
                            const dayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                            const dayNames = event.daysOfWeek
                              .map(day => {
                                const numDay = typeof day === 'number' ? day : parseInt(day);
                                if (!isNaN(numDay) && numDay >= 0 && numDay <= 6) {
                                  return dayOrder[numDay];
                                }
                                return null;
                              })
                              .filter(day => day !== null)
                              .sort((a, b) => {
                                const aIdx = dayOrder.indexOf(a);
                                const bIdx = dayOrder.indexOf(b);
                                return aIdx - bIdx;
                              });
                            
                            // Check if consecutive
                            const indices = event.daysOfWeek
                              .map(day => typeof day === 'number' ? day : parseInt(day))
                              .filter(day => !isNaN(day) && day >= 0 && day <= 6)
                              .sort((a, b) => a - b);
                            
                            if (indices.length > 1) {
                              const isConsecutive = indices.every((idx, i) => i === 0 || idx === indices[i - 1] + 1);
                              if (isConsecutive) {
                                return [`${dayNames[0]}-${dayNames[dayNames.length - 1]}`];
                              }
                            }
                            
                            return dayNames;
                          } else if (typeof event.daysOfWeek === 'string') {
                            // If it's a string, use formatDays function
                            return formatDays(event.daysOfWeek);
                          }
                          return [];
                        })().map((day, i) => (
                          <span key={i} className="text-[10px] sm:text-xs font-medium text-gray-600 bg-gray-100 px-1.5 sm:px-2 py-0.5 rounded">
                            {day}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Scheduled and Recurring Badges - Bottom Left */}
                <div className="absolute bottom-1.5 sm:bottom-2 left-1.5 sm:left-2 flex flex-col gap-0.5 sm:gap-1">
                  {/* First Row - Scheduled Badge */}
                  <div>
                    <span className={`text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded ${statusColor}`}>
                      {isDisabled ? 'Disabled' : (event.status || 'Scheduled')}
                    </span>
                  </div>
                  {/* Second Row - Recurring Badge */}
                  {isRecurring && (
                    <div>
                      <span className="text-[10px] sm:text-xs font-medium text-purple-600 bg-purple-50 px-1.5 sm:px-2 py-0.5 rounded flex items-center gap-0.5 sm:gap-1 w-fit">
                        <Repeat className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        Recurring
                      </span>
                    </div>
                  )}
                </div>
              </div>
                
                {/* Enable/Disable Button - Bottom Right Corner */}
                <div className="absolute bottom-2 right-2 flex-shrink-0">
              <button
                    onClick={() => handleEnableDisable(event.id, isDisabled ? 'enable' : 'disable')}
                    disabled={isLoading}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                      isDisabled
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={isDisabled ? 'Click to Enable event' : 'Click to Disable event'}
                  >
                    {isDisabled ? (
                      <>
                        <Play className="w-3 h-3" />
                        <span>Enable</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-3 h-3" />
                        <span>Disable</span>
                      </>
                    )}
              </button>
            </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DeviceSchedulingSection;

