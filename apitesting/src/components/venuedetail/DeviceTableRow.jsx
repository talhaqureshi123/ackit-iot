import React from 'react';
import { MapPin, Thermometer, Plus, Minus, Eye, GripVertical, Wifi, WifiOff } from 'lucide-react';
import { adminAPI } from '../../services/apiAdmin';
import toast from 'react-hot-toast';

const DeviceTableRow = ({ 
  device, 
  deviceVenueName, 
  venue, 
  organizations,
  onDeviceSelect,
  onEventCreate,
  onViewDevice,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  draggedDeviceId,
  dragOverDeviceId,
  setDevices,
  loadVenueData
}) => {
  const isDragging = draggedDeviceId === device.id;
  const isDragOver = dragOverDeviceId === device.id;

  return (
    <tr 
      key={device.id} 
      draggable
      onDragStart={(e) => onDragStart(device.id, e)}
      onDragOver={(e) => onDragOver(device.id, e)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(device.id, e)}
      onDragEnd={onDragEnd}
      className={`hover:bg-gray-50 cursor-move transition-colors ${
        isDragging ? 'opacity-50' : ''
      } ${isDragOver ? 'bg-blue-100 border-t-2 border-blue-500' : ''}`}
      onClick={() => onDeviceSelect(device, deviceVenueName)}
    >
      <td className="pl-2 sm:pl-4 pr-3 sm:pr-6 py-3 sm:py-4 align-middle">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div 
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-blue-600 flex-shrink-0"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">{device.name || 'N/A'}</div>
              {/* Connection Status Indicator */}
              {device.isConnected ? (
                <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] sm:text-xs font-medium flex-shrink-0">
                  <Wifi className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">Connected</span>
                  <span className="sm:hidden">On</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] sm:text-xs font-medium flex-shrink-0">
                  <WifiOff className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">Offline</span>
                  <span className="sm:hidden">Off</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 sm:px-6 py-3 sm:py-4 align-middle" style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
          <span className="text-[10px] sm:text-xs text-gray-900 truncate">{deviceVenueName}</span>
        </div>
      </td>
      <td className="px-3 sm:px-6 py-3 sm:py-4 pr-2 align-middle">
        <div className="flex items-center justify-center space-x-0.5 sm:space-x-1 bg-gray-100 rounded-full px-1.5 sm:px-2 py-1 sm:py-1.5 w-fit mx-auto border-2 border-gray-300">
          <button 
            onClick={async (e) => {
              e.stopPropagation();
              // Revert action if device is offline
              if (!device.isConnected) {
                toast.error('⚠️ Device is offline. Action reverted.');
                return;
              }
              const currentTemp = device.temperature || 16;
              if (currentTemp > 16) {
                try {
                  await adminAPI.setAdminACTemperature(device.id, currentTemp - 1);
                  setDevices(prev => prev.map(d => 
                    d.id === device.id ? { ...d, temperature: currentTemp - 1 } : d
                  ));
                  toast.success(`Temperature set to ${currentTemp - 1}°C`);
                } catch (error) {
                  toast.error(error.response?.data?.message || 'Failed to set temperature');
                }
              }
            }}
            className="p-0.5 text-blue-600 hover:bg-blue-200 rounded-full flex items-center justify-center"
            title={!device.isConnected ? 'Device is offline - action may not work' : 'Decrease temperature'}
          >
            <Minus className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
          </button>
          <input 
            type="number" 
            min="16" 
            max="30" 
            value={device.temperature || 16}
            placeholder="temp"
            onChange={async (e) => {
              e.stopPropagation();
              // Revert action if device is offline
              const value = parseInt(e.target.value);
              if (!device.isConnected) {
                toast.error('⚠️ Device is offline. Action reverted.');
                e.target.value = device.temperature || 16;
                return;
              }
              if (!isNaN(value)) {
                if (value >= 16 && value <= 30) {
                  try {
                    await adminAPI.setAdminACTemperature(device.id, value);
                    setDevices(prev => prev.map(d => 
                      d.id === device.id ? { ...d, temperature: value } : d
                    ));
                    toast.success(`Temperature set to ${value}°C`);
                  } catch (error) {
                    toast.error(error.response?.data?.message || 'Failed to set temperature');
                    // Revert on error
                    e.target.value = device.temperature || 16;
                  }
                } else {
                  // Revert if invalid value
                  e.target.value = device.temperature || 16;
                }
              }
            }}
            className="text-[10px] sm:text-xs font-medium text-gray-900 w-8 sm:w-10 text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded placeholder:text-gray-400"
            title={!device.isConnected ? 'Device is offline - action may not work' : 'Set temperature'}
          />
          <button 
            onClick={async (e) => {
              e.stopPropagation();
              // Revert action if device is offline
              if (!device.isConnected) {
                toast.error('⚠️ Device is offline. Action reverted.');
                return;
              }
              const currentTemp = device.temperature || 16;
              if (currentTemp < 30) {
                try {
                  await adminAPI.setAdminACTemperature(device.id, currentTemp + 1);
                  setDevices(prev => prev.map(d => 
                    d.id === device.id ? { ...d, temperature: currentTemp + 1 } : d
                  ));
                  toast.success(`Temperature set to ${currentTemp + 1}°C`);
                } catch (error) {
                  toast.error(error.response?.data?.message || 'Failed to set temperature');
                }
              }
            }}
            className="p-0.5 text-blue-600 hover:bg-blue-200 rounded-full flex items-center justify-center"
            title={!device.isConnected ? 'Device is offline - action may not work' : 'Increase temperature'}
          >
            <Plus className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
          </button>
        </div>
      </td>
      <td className="px-3 sm:px-6 py-3 sm:py-4 align-middle">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={device.isOn || false}
            onChange={async (e) => {
              e.stopPropagation();
              // Revert action if device is offline
              const newStatus = e.target.checked;
              if (!device.isConnected) {
                toast.error('⚠️ Device is offline. Action reverted.');
                e.target.checked = device.isOn || false;
                return;
              }
              
              console.log('🔄 Toggling AC power:', { 
                deviceId: device.id, 
                deviceName: device.name, 
                newStatus,
                venueId: venue?.id,
                venueIsOn: venue?.isVenueOn,
                isConnected: device.isConnected
              });
              
              try {
                if (typeof newStatus !== 'boolean') {
                  toast.error('Invalid power state');
                  return;
                }
                
                if (newStatus === true && venue && venue.isVenueOn === false) {
                  toast.error('Cannot turn ON device: Venue is currently OFF. Please turn on the venue first.');
                  e.target.checked = device.isOn || false;
                  return;
                }
                
                if (newStatus === true && venue) {
                  const orgId = venue.organizationId || venue.organization?.id;
                  if (orgId) {
                    const org = organizations.find(o => o.id === orgId);
                    if (org && !(org.isOrganizationOn === true || org.isOrganizationOn === 'true')) {
                      toast.error('Cannot turn ON device: Organization is currently OFF. Please turn on the organization first.');
                      e.target.checked = device.isOn || false;
                      return;
                    }
                  }
                }
                
                const response = await adminAPI.toggleAdminACPower(device.id, newStatus);
                console.log('✅ AC power toggle response:', response?.data);
                
                const updatedDevice = response?.data?.ac || response?.data?.data?.ac;
                const finalStatus = updatedDevice?.isOn !== undefined ? updatedDevice.isOn : newStatus;
                
                setDevices(prev => prev.map(d => 
                  d.id === device.id ? { ...d, isOn: finalStatus } : d
                ));
                
                toast.success(response?.data?.message || `Device ${finalStatus ? 'turned ON' : 'turned OFF'}`);
                
                await loadVenueData();
              } catch (error) {
                console.error('❌ Toggle AC power error:', error);
                e.target.checked = device.isOn || false;
                
                if (error.response?.status === 401) {
                  toast.error('Session expired. Please login again.');
                } else if (error.response?.status === 400) {
                  const errorMsg = error.response?.data?.message || 'Invalid request. Please check if venue is ON.';
                  toast.error(errorMsg);
                } else if (error.response?.status === 404) {
                  toast.error('Device not found or unauthorized');
                } else {
                  toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to toggle device');
                }
              }
            }}
            className="sr-only peer"
          />
          <div className={`w-9 h-5 sm:w-11 sm:h-6 rounded-full peer ${
            device.isOn ? 'bg-green-500' : 'bg-gray-300'
          } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all`}></div>
          <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm text-gray-700">
            {device.isOn ? 'On' : 'Off'}
          </span>
        </label>
      </td>
      <td className="px-2 sm:px-4 pr-2 sm:pr-4 py-3 sm:py-4 align-middle">
        <div className="flex justify-center">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEventCreate(device.id);
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-full border border-blue-200 bg-white"
            title="Create event for this device"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </td>
      <td className="px-2 sm:px-4 pr-2 sm:pr-4 py-3 sm:py-4 align-middle">
        <div className="flex justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDevice(device, deviceVenueName);
            }}
            className="p-1 sm:p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View device details"
          >
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default DeviceTableRow;

