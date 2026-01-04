import React from 'react';
import { Power } from 'lucide-react';

/**
 * Reusable Power Toggle Component
 * Used in OrganizationCard, VenueCard, and ACCard
 */
const PowerToggle = ({
  isOn = false,
  isLoading = false,
  isDisabled = false,
  onToggle,
  label = 'Power',
  type = 'toggle', // 'toggle' or 'button'
  size = 'compact' // 'compact' or 'large'
}) => {
  const handleToggle = () => {
    if (isDisabled || isLoading) return;
    onToggle(!isOn);
  };

  if (type === 'button') {
    return (
      <div className="bg-blue-50 rounded-lg p-1.5 border border-blue-200 mb-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-700 flex items-center">
            <Power className="w-3 h-3 mr-0.5 text-blue-600" />
            {label}
          </span>
          <button
            onClick={handleToggle}
            disabled={isDisabled || isLoading}
            className={`px-2 py-1 rounded text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isOn
                ? 'bg-gray-500 text-white hover:bg-gray-600'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isOn ? 'OFF' : 'ON'}
          </button>
        </div>
      </div>
    );
  }

  // Toggle switch (default)
  return (
    <div className="bg-blue-50 rounded-lg p-1.5 border border-blue-200 mb-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-700 flex items-center">
          <Power className="w-3 h-3 mr-0.5 text-blue-600" />
          {label}
        </span>
        <div className="flex items-center space-x-1.5">
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
            isOn ? 'bg-blue-500 text-white' : 'bg-gray-400 text-white'
          }`}>
            {isOn ? 'ON' : 'OFF'}
          </span>
          <button
            onClick={handleToggle}
            disabled={isDisabled || isLoading}
            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
              isOn ? 'bg-blue-500' : 'bg-gray-400'
            }`}
            title={isOn ? `Turn ${label} OFF` : `Turn ${label} ON`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                isOn ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PowerToggle;


