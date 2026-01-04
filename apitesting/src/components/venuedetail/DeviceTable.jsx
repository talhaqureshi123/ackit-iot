import React from 'react';
import { Thermometer, Power, Plus, Eye } from 'lucide-react';
import DeviceTableRow from './DeviceTableRow';

const DeviceTable = ({
  filteredDevices,
  devices,
  allVenues,
  venue,
  organizations,
  events,
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
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl w-full mt-1 sm:mt-4 overflow-x-auto">
      <div className="w-full">
        <table className="w-full divide-y divide-gray-200 min-w-[600px] sm:min-w-[700px] md:min-w-[800px]">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="pl-2 sm:pl-4 pr-3 sm:pr-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                Device ID
              </th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300" style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Venue
              </th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                  <Thermometer className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Temperature</span>
                  <span className="sm:hidden">Temp</span>
                </div>
              </th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <Power className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Status</span>
                </div>
              </th>
              <th className="px-2 sm:px-4 pr-2 sm:pr-4 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Events</span>
                </div>
              </th>
              <th className="px-2 sm:px-4 pr-2 sm:pr-4 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                  <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>View</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredDevices.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  {devices.length === 0 
                    ? 'No devices found in this venue. Please check console for details.' 
                    : `No devices match the current filters. Total devices: ${devices.length}`}
                </td>
              </tr>
            ) : (
              filteredDevices.map((device) => {
                const deviceVenue = allVenues.find(v => v.id === device.venueId) || venue;
                const deviceVenueName = deviceVenue?.name || venue?.name || 'Unknown Venue';
                
                return (
                  <DeviceTableRow
                    key={device.id}
                    device={device}
                    deviceVenueName={deviceVenueName}
                    venue={venue}
                    organizations={organizations}
                    onDeviceSelect={onDeviceSelect}
                    onEventCreate={onEventCreate}
                    onViewDevice={onViewDevice}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onDragEnd={onDragEnd}
                    draggedDeviceId={draggedDeviceId}
                    dragOverDeviceId={dragOverDeviceId}
                    setDevices={setDevices}
                    loadVenueData={loadVenueData}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DeviceTable;

