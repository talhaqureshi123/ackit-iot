import React from 'react';
import { AlertTriangle, Thermometer, Power, Lock, Search } from 'lucide-react';

const DeviceFilters = ({ 
  filters, 
  setFilters, 
  searchTerm, 
  setSearchTerm, 
  onAlertClick 
}) => {
  return (
    <section className="rounded-xl p-2 sm:p-3 md:p-4 mb-1">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
        <div className="col-span-2 sm:col-span-1">
          <button
            onClick={onAlertClick}
            className="w-full px-2 sm:px-3 py-2 border border-blue-300 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5 sm:gap-2 bg-blue-500 text-white hover:bg-blue-600"
          >
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="truncate">Alert</span>
          </button>
        </div>
        <div>
          <div className="relative">
            <Thermometer className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 pointer-events-none" />
            <input
              type="number"
              min="16"
              max="30"
              value={filters.temperature}
              onChange={(e) => setFilters({ ...filters, temperature: e.target.value })}
              placeholder="Temp"
              className="w-full pl-8 sm:pl-10 pr-2 sm:pr-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>
        <div>
          <div className="relative">
            <Power className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 pointer-events-none" />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full pl-8 sm:pl-10 pr-2 sm:pr-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="" disabled>Status</option>
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </div>
        </div>
        <div>
          <div className="relative">
            <Lock className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 pointer-events-none" />
            <select
              value={filters.lock}
              onChange={(e) => setFilters({ ...filters, lock: e.target.value })}
              className="w-full pl-8 sm:pl-10 pr-2 sm:pr-3 py-1.5 sm:py-2 border border-blue-300 rounded-lg text-xs sm:text-sm font-medium bg-blue-500 text-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="" disabled>Lock</option>
              <option value="locked">Locked</option>
              <option value="unlocked">Unlocked</option>
            </select>
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <div className="relative">
            <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-white pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 sm:pl-10 pr-2 sm:pr-3 py-1.5 sm:py-2 border border-blue-300 rounded-lg text-xs sm:text-sm font-medium bg-blue-500 text-white placeholder:text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default DeviceFilters;

