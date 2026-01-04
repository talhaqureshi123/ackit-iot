import React from 'react';
import { Thermometer, Plus, Minus } from 'lucide-react';

/**
 * Reusable Temperature Control Component
 * Used in OrganizationCard, VenueCard, and ACCard
 */
const TemperatureControl = ({
  type, // 'organization', 'venue', or 'ac'
  id,
  currentTemperature,
  localTemperature,
  isLoading = false,
  isDisabled = false,
  hasMixedTemperatures = false,
  hasEvent = false,
  eventTemperature = null,
  onTemperatureChange,
  onTemperatureSet,
  onTemperatureSubmit,
  minTemp = 16,
  maxTemp = 30,
  size = 'compact' // 'compact' or 'large'
}) => {
  const displayTemp = hasEvent && eventTemperature 
    ? eventTemperature 
    : (localTemperature !== undefined ? localTemperature : currentTemperature);
  
  const isAtMin = displayTemp <= minTemp;
  const isAtMax = displayTemp >= maxTemp;
  const disabled = isLoading || isDisabled || hasEvent;

  const handleDecrease = () => {
    if (isAtMin || disabled) return;
    const newTemp = Math.max(minTemp, displayTemp - 1);
    onTemperatureChange(type, id, newTemp);
    onTemperatureSet(type, id, newTemp);
  };

  const handleIncrease = () => {
    if (isAtMax || disabled) return;
    const newTemp = Math.min(maxTemp, displayTemp + 1);
    onTemperatureChange(type, id, newTemp);
    onTemperatureSet(type, id, newTemp);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    if (value === '') {
      onTemperatureChange(type, id, '');
    } else {
      const temp = parseInt(value);
      if (!isNaN(temp)) {
        onTemperatureChange(type, id, temp);
      }
    }
  };

  const handleInputBlur = (e) => {
    const value = e.target.value;
    if (value === '') {
      onTemperatureChange(type, id, currentTemperature);
    } else {
      const temp = parseInt(value);
      if (!isNaN(temp) && temp >= minTemp && temp <= maxTemp) {
        onTemperatureSubmit(type, id, temp);
      } else {
        onTemperatureChange(type, id, currentTemperature);
      }
    }
  };

  const handleInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      const value = e.target.value;
      if (value === '') {
        onTemperatureChange(type, id, currentTemperature);
      } else {
        const temp = parseInt(value);
        if (!isNaN(temp) && temp >= minTemp && temp <= maxTemp) {
          onTemperatureSubmit(type, id, temp);
        }
      }
    }
  };

  if (size === 'large') {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-1.5 mb-1.5 border border-blue-200">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-gray-700 flex items-center">
            <Thermometer className="w-3 h-3 mr-0.5 text-blue-600" />
            Temp
          </span>
          {isLoading && (
            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
          )}
        </div>
        <div className="flex items-center justify-center space-x-1.5">
          <button
            onClick={handleDecrease}
            disabled={disabled || isAtMin}
            className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold shadow-md"
          >
            <Minus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>
          <input
            type="number"
            min={minTemp}
            max={maxTemp}
            step="1"
            value={displayTemp}
            disabled={disabled}
            className={`w-28 sm:w-24 px-3 sm:px-2 py-2 sm:py-1.5 text-lg sm:text-base text-center font-bold border-2 rounded-lg bg-white text-gray-900 transition-colors ${
              disabled
                ? 'opacity-50 cursor-not-allowed border-gray-200 text-gray-500' 
                : 'border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900'
            }`}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyPress={handleInputKeyPress}
          />
          <button
            onClick={handleIncrease}
            disabled={disabled || isAtMax}
            className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold shadow-md"
          >
            <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Compact size (default)
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2 sm:p-1.5 mb-1.5 border border-blue-200">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs sm:text-xs font-bold text-gray-700 flex items-center">
          <Thermometer className="w-3 h-3 sm:w-3 sm:h-3 mr-1 sm:mr-0.5 text-blue-600" />
          <span className="hidden sm:inline">Temp</span>
          <span className="sm:hidden">Temperature: <span className="text-blue-600 font-bold">{displayTemp}°C</span></span>
        </span>
        {isLoading && (
          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
        )}
      </div>
      {hasMixedTemperatures ? (
        <button
          onClick={() => {
            const currentTemp = currentTemperature || 22;
            onTemperatureSet(type, id, currentTemp);
          }}
          disabled={disabled}
          className="w-full px-2 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Set All
        </button>
      ) : (
        <div className="flex items-center justify-center space-x-1.5">
          <button
            onClick={handleDecrease}
            disabled={disabled || isAtMin}
            className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="number"
            min={minTemp}
            max={maxTemp}
            step="1"
            value={displayTemp}
            disabled={disabled}
            className={`w-14 sm:w-16 px-1 py-1 text-xs sm:text-sm text-center font-bold border rounded bg-white text-gray-900 transition-colors ${
              disabled
                ? 'opacity-50 cursor-not-allowed border-gray-200 text-gray-500' 
                : 'border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-gray-900'
            }`}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyPress={handleInputKeyPress}
          />
          <button
            onClick={handleIncrease}
            disabled={disabled || isAtMax}
            className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

export default TemperatureControl;


