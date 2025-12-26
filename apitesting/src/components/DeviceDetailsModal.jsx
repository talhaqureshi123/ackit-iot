import React from 'react';
import { X, MapPin, Thermometer, Power, AlertTriangle, Calendar, Clock } from 'lucide-react';

const DeviceDetailsModal = ({ isOpen, onClose, device }) => {
  if (!isOpen || !device) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white w-[600px] max-w-[95%] max-h-[90vh] rounded-2xl border-2 border-gray-200 shadow-xl flex flex-col overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Header */}
        <div className="pt-8 px-8 pb-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Device Details</h2>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-800">{device.name || 'SSUET_AF8_01'}</span>
            <span className="text-sm text-gray-500">({device.serialNumber || 'SN-12345'})</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Device Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Device Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <MapPin className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-500">Venue</p>
                  <p className="text-sm font-medium text-gray-900">{device.venue || 'Gulshan, block 14 Branch'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Thermometer className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-xs text-gray-500">Temperature</p>
                  <p className="text-sm font-medium text-gray-900">{device.temperature || 16}°C</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Power className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className={`text-sm font-medium ${device.isOn ? 'text-green-600' : 'text-gray-600'}`}>
                    {device.isOn ? 'ON' : 'OFF'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-xs text-gray-500">Alert Status</p>
                  <p className={`text-sm font-medium ${device.isWorking === false ? 'text-red-600' : 'text-green-600'}`}>
                    {device.isWorking === false ? 'Faulty' : 'Working'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Additional Details</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Device ID</span>
                <span className="text-sm font-medium text-gray-900">{device.name || 'SSUET_AF8_01'}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Serial Number</span>
                <span className="text-sm font-medium text-gray-900">{device.serialNumber || 'SN-12345'}</span>
              </div>

              {device.alertAt && (
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span className="text-sm text-red-600">Last Alert</span>
                  <span className="text-sm font-medium text-red-900">
                    {new Date(device.alertAt).toLocaleString()}
                  </span>
                </div>
              )}

              {device.totalEnergyConsumed !== undefined && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Energy Consumed</span>
                  <span className="text-sm font-medium text-gray-900">
                    {device.totalEnergyConsumed.toFixed(2)} KV
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeviceDetailsModal;

