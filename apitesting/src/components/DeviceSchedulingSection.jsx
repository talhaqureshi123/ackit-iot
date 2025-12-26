import React, { useState } from 'react';
import { Plus, Lock, Unlock, AlertTriangle, Zap, Edit, Trash2, Play, Square, Calendar, Clock, Thermometer, Repeat } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '../services/apiAdmin';

// Helper function to format days - show range if consecutive, otherwise individual
const formatDays = (daysString) => {
  if (!daysString) return [];
  
  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const days = daysString.split(' ').filter(d => d.trim());
  
  if (days.length === 0) return [];
  if (days.length === 1) return [days[0]];
  
  // Get indices of days in order
  const indices = days.map(day => dayOrder.indexOf(day)).filter(idx => idx !== -1).sort((a, b) => a - b);
  
  if (indices.length === 0) return days;
  
  // Check if all days are consecutive
  const isConsecutive = indices.every((idx, i) => i === 0 || idx === indices[i - 1] + 1);
  
  if (isConsecutive && indices.length > 1) {
    // Show as range
    return [`${dayOrder[indices[0]]}-${dayOrder[indices[indices.length - 1]]}`];
  }
  
  return indices.map(day => dayOrder[day]);
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
  onEventEdit,
  onEventDelete,
  onEventEnable,
  onEventDisable,
  onReloadEvents
}) => {
  const [showDeviceLockDropdown, setShowDeviceLockDropdown] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  
  // Use selectedDevice if available, otherwise use first device from filteredDevices
  const displayDevice = selectedDevice || (filteredDevices.length > 0 ? filteredDevices[0] : null);
  
  // Get events for the selected/display device
  const deviceEvents = displayDevice ? events.filter(e => e.deviceId === displayDevice.id) : [];
  
  // Handle enable/disable
  const handleEnableDisable = async (eventId, action) => {
    const key = `${eventId}-${action}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));
    try {
      if (action === 'enable') {
        await adminAPI.enableEvent(eventId);
        toast.success('Event enabled successfully');
      } else {
        await adminAPI.disableEvent(eventId);
        toast.success('Event disabled successfully');
      }
      if (onReloadEvents) {
        await onReloadEvents();
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
      await adminAPI.deleteEvent(eventId);
      toast.success('Event deleted successfully');
      if (onReloadEvents) {
        await onReloadEvents();
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error(error.response?.data?.message || 'Failed to delete event');
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className=" bg-white rounded-2xl shadow-md border border-gray-200 p-5 flex flex-col" style={{ maxHeight: '400px', height: '430px' }}>
      {/* Device ID with Lock Dropdown */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900">
          {displayDevice ? displayDevice.name : 'No Device Selected'}
        </h3>
        <div className="relative device-lock-dropdown-container">
          <button
            onClick={() => setShowDeviceLockDropdown(!showDeviceLockDropdown)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border-none ${
              displayDevice && displayDevice.isLocked
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {displayDevice && displayDevice.isLocked ? (
              <Lock className="w-3.5 h-3.5" />
            ) : (
              <Unlock className="w-3.5 h-3.5" />
            )}
            <span>{displayDevice && displayDevice.isLocked ? 'Remote Locked' : 'Unlocked'}</span>
            <span className="text-xs">▼</span>
          </button>
          {showDeviceLockDropdown && (
            <div className="absolute top-full right-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[160px]">
              <button
                onClick={async () => {
                  if (!displayDevice) return;
                  setShowDeviceLockDropdown(false);
                  try {
                    toast.success('Device unlocked successfully');
                  } catch (error) {
                    toast.error('Failed to unlock device');
                  }
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Unlock className="w-4 h-4 text-gray-600" />
                <span>Unlocked</span>
              </button>
              <button
                onClick={async () => {
                  if (!displayDevice) return;
                  setShowDeviceLockDropdown(false);
                  try {
                    toast.success('Device locked successfully');
                  } catch (error) {
                    toast.error('Failed to lock device');
                  }
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Lock className="w-4 h-4 text-red-600" />
                <span>Remote Locked</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fault Devices and Energy Cards */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-red-50 rounded-xl p-3 border border-red-200">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-xs font-medium text-red-600">Fault Devices</span>
          </div>
          <p className="text-sm font-bold text-gray-900">{faultDevices} Devices</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-200">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-600">Energy of Device</span>
          </div>
          <p className="text-sm font-bold text-gray-900">{totalEnergy.toFixed(1)} KV</p>
        </div>
      </div>

      {/* Events Title with Plus Button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <h4 className="text-sm font-bold text-gray-900">Events</h4>
          {deviceEvents.length > 0 && (
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {deviceEvents.length}
            </span>
          )}
        </div>
        {displayDevice && onEventEdit && (
          <button 
            onClick={() => onEventEdit({ deviceId: displayDevice.id })}
            className="w-7 h-7 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-full border border-blue-200 bg-white transition-all hover:scale-110"
            title="Create new event"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-3 overflow-y-auto pr-2 flex-1 custom-scrollbar" style={{ maxHeight: '280px', minHeight: '170px' }}>
        {/* Show message if no device selected */}
        {!displayDevice && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">Please select a device from the table to view its events</p>
          </div>
        )}
        
        {/* Show message if device selected but no events */}
        {displayDevice && deviceEvents.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No events found for {displayDevice.name}</p>
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
          const formattedDate = eventDate ? formatEventDate(eventDate) : '';
          
          // Get time - use timeStart/timeEnd for recurring, or startTime/endTime for one-time
          let startTime = '';
          let endTime = '';
          
          if (isRecurring) {
            startTime = event.timeStart ? formatTime(event.timeStart) : '';
            endTime = event.timeEnd ? formatTime(event.timeEnd) : '';
          } else {
            if (event.startTime) {
              startTime = formatDateTime(event.startTime);
            }
            if (event.endTime) {
              endTime = formatDateTime(event.endTime);
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
              className={`bg-white rounded-xl p-4 border-2 transition-all duration-200 hover:shadow-lg ${
                isDisabled ? 'border-gray-200 opacity-75' : 'border-blue-200 hover:border-blue-400'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2.5 min-w-0">
                  {/* Event Name and Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {event.name && (
                        <h5 className="text-sm font-bold text-gray-900 truncate mb-1">
                          {event.name}
                        </h5>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${statusColor}`}>
                          {isDisabled ? 'Disabled' : (event.status || 'Scheduled')}
                        </span>
                        {isRecurring && (
                          <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 flex items-center gap-1">
                            <Repeat className="w-3 h-3" />
                            Recurring
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Date and Time Info */}
                  <div className="space-y-1.5">
                    {formattedDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-xs font-medium text-gray-700">{formattedDate}</span>
                      </div>
                    )}
                    {(startTime || endTime) && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-xs font-semibold text-gray-900">
                          {startTime || 'N/A'} {endTime && `→ ${endTime}`}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Command/Temperature */}
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                    <Thermometer className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs text-gray-600 font-medium">Temperature:</span>
                    <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                      event.temperature 
                        ? 'text-blue-700 bg-blue-100 border border-blue-200' 
                        : 'text-green-700 bg-green-100 border border-green-200'
                    }`}>
                      {event.temperature ? `${event.temperature}°C` : 'ON'}
                    </span>
                  </div>
                  
                  {/* Days of Week for Recurring Events */}
                  {event.daysOfWeek && event.daysOfWeek.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-gray-500 font-medium">Days:</span>
                      {formatDays(typeof event.daysOfWeek === 'string' ? event.daysOfWeek : event.daysOfWeek.join(' ')).map((day, i) => (
                        <span key={i} className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                          {day}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Action Buttons - Compact */}
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {/* Enable/Disable Button */}
                  <button
                    onClick={() => handleEnableDisable(event.id, isDisabled ? 'enable' : 'disable')}
                    disabled={isLoading}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-1 min-w-[75px] ${
                      isDisabled
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300'
                        : 'bg-green-500 text-white hover:bg-green-600 border border-green-600'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={isDisabled ? 'Enable event' : 'Disable event'}
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
                  
                  {/* Edit Button */}
                  <button
                    onClick={() => {
                      if (onEventEdit) {
                        onEventEdit(event);
                      }
                    }}
                    disabled={isLoading}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-1 min-w-[75px] disabled:opacity-50 disabled:cursor-not-allowed border border-blue-600"
                    title="Edit event"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  
                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(event.id, event.name || 'Event')}
                    disabled={isLoading}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-1 min-w-[75px] disabled:opacity-50 disabled:cursor-not-allowed border border-red-600"
                    title="Delete event"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DeviceSchedulingSection;

