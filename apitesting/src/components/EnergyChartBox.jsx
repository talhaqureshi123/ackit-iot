import React, { useState, useEffect, useRef } from 'react';
import { Plus, Minus, Lock, Unlock } from 'lucide-react';
import { adminAPI } from '../services/apiAdmin';
import toast from 'react-hot-toast';

const EnergyChartBox = ({ venue, setVenue, organizationEnergy, organizationName, onVenueUpdate, devices = [] }) => {
  const [showLockDropdown, setShowLockDropdown] = useState(false);
  const [venueLocking, setVenueLocking] = useState(false);
  const [isTogglingPower, setIsTogglingPower] = useState(false);
  const [isChangingTemp, setIsChangingTemp] = useState(false);
  const lockDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (lockDropdownRef.current && !lockDropdownRef.current.contains(event.target)) {
        setShowLockDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Check if venue has mixed temperatures
  // Mixed = devices ki temperatures aapas mein different hain
  const hasMixedTemperatures = () => {
    if (!devices || devices.length <= 1) return false;
    
    // Get all device temperatures
    const deviceTemps = devices.map(device => device.temperature || 16);
    
    // Check if any device has different temperature than others
    const firstTemp = deviceTemps[0];
    const allSame = deviceTemps.every(temp => temp === firstTemp);
    
    // If all temperatures are same, not mixed
    // If any temperature is different, it's mixed
    return !allSame;
  };

  const isMixed = hasMixedTemperatures();

  // Calculate energy chart bars based on organization energy or default
  const getEnergyChartData = () => {
    if (organizationEnergy !== null && organizationEnergy !== undefined) {
      // If organization energy is 0, show "No energy consumed"
      if (organizationEnergy === 0) {
        return null; // Will show message instead
      }
      
      // Convert energy to percentage for chart (assuming max energy is 100 KV for visualization)
      const maxEnergy = 100;
      const energyPercent = Math.min((organizationEnergy / maxEnergy) * 100, 100);
      
      // Generate 7 bars with varying heights based on energy
      // Use a pattern that represents energy consumption over time
      const baseHeight = Math.max(10, Math.min(90, energyPercent * 0.8)); // Base height between 10-90%
      return Array.from({ length: 7 }, (_, i) => {
        // Create a pattern: lower in morning, peak in afternoon, lower in evening
        const pattern = [0.6, 0.7, 0.9, 1.0, 0.95, 0.8, 0.7]; // Pattern for 7 bars
        const height = baseHeight * pattern[i];
        return Math.max(5, Math.min(100, height));
      });
    }
    
    // Default chart if no organization energy
    return [20, 20, 20, 20, 25, 15, 20];
  };

  const chartData = getEnergyChartData();

  // Validate venue exists and has required properties
  // Accept both number and string IDs
  const isVenueValid = venue && venue.id !== undefined && venue.id !== null && (typeof venue.id === 'number' || typeof venue.id === 'string');
  
  // Debug logs
  console.log('🔍 EnergyChartBox - Venue:', venue);
  console.log('🔍 EnergyChartBox - Venue ID:', venue?.id);
  console.log('🔍 EnergyChartBox - Venue name:', venue?.name);
  console.log('🔍 EnergyChartBox - Venue isVenueOn:', venue?.isVenueOn);
  console.log('🔍 EnergyChartBox - Venue temperature:', venue?.temperature);
  console.log('🔍 EnergyChartBox - Venue isLocked:', venue?.isLocked);
  console.log('🔍 EnergyChartBox - Is Venue Valid:', isVenueValid);
  console.log('🔍 EnergyChartBox - Organization Name:', organizationName);
  console.log('🔍 EnergyChartBox - Devices:', devices);
  console.log('🔍 EnergyChartBox - Is Mixed:', isMixed);
  console.log('🔍 EnergyChartBox - setVenue function:', typeof setVenue);
  console.log('🔍 EnergyChartBox - onVenueUpdate function:', typeof onVenueUpdate);
  console.log('🔍 EnergyChartBox - Button disabled check:', {
    isVenueValid,
    isTogglingPower,
    willBeDisabled: !isVenueValid || isTogglingPower,
    venueId: venue?.id,
    venueIdType: typeof venue?.id
  });

  // Show error message if venue is not valid
  if (!isVenueValid && !organizationName) {
    return (
      <div className="bg-blue-500 shadow-sm w-full rounded-2xl p-4">
        <div className="text-white text-center">
          <p className="text-sm font-medium">Venue not loaded</p>
          <p className="text-xs mt-1 opacity-80">Please select a venue to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div className=" mt-8 bg-blue-500 shadow-sm w-full rounded-2xl overflow-visible" style={{ maxHeight: '120px' }}>
      {/* Blue Header Bar */}
      <div className="bg-blue-500 px-3 py-1.5 rounded-t-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-white font-semibold text-xl">
            {venue?.name || organizationName || 'Venue Name'}
          </span>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <span className="text-white text-xs font-medium">{venue?.isVenueOn ? 'ON' : 'OFF'}</span>
            {(() => {
              const buttonDisabled = !isVenueValid || isTogglingPower;
              console.log('🔍 Rendering ON/OFF button:', {
                isVenueValid,
                isTogglingPower,
                buttonDisabled,
                venueId: venue?.id,
                venueName: venue?.name
              });
              return null;
            })()}
            <button
              type="button"
              id="venue-power-toggle-button"
              onMouseEnter={() => {
                console.log('🖱️ Mouse ENTERED button area', { 
                  isVenueValid, 
                  isTogglingPower, 
                  disabled: !isVenueValid || isTogglingPower,
                  venueId: venue?.id
                });
              }}
              onMouseLeave={() => {
                console.log('🖱️ Mouse LEFT button area');
              }}
              onClick={async (e) => {
                console.log('🖱️ ON/OFF Button CLICKED - EVENT FIRED!', {
                  eventType: e.type,
                  target: e.target,
                  currentTarget: e.currentTarget
                });
                e.stopPropagation();
                console.log('🖱️ ON/OFF Button CLICKED!', { 
                  venueId: venue?.id, 
                  venueName: venue?.name,
                  isVenueValid, 
                  currentState: venue?.isVenueOn,
                  isTogglingPower,
                  hasSetVenue: !!setVenue,
                  hasOnVenueUpdate: !!onVenueUpdate,
                  venueObject: venue
                });
                
                if (!isVenueValid) {
                  toast.error('Venue not loaded. Please refresh the page.');
                  console.error('❌ Venue validation failed:', { venue, isVenueValid });
                  return;
                }
                if (isTogglingPower) {
                  console.log('⚠️ Already toggling power, ignoring click');
                  return;
                }
                setIsTogglingPower(true);
                try {
                  const currentState = venue.isVenueOn || false;
                  const newPowerState = !currentState;
                  console.log('🔄 Toggling venue power:', { venueId: venue.id, currentState, newPowerState });
                  const response = await adminAPI.toggleVenuePower(venue.id, newPowerState);
                  console.log('✅ Venue power toggle response:', response.data);
                  
                  // Get updated venue from response
                  const updatedVenue = response.data?.venue || response.data?.data?.venue;
                  const finalPowerState = updatedVenue?.isVenueOn !== undefined 
                    ? updatedVenue.isVenueOn 
                    : newPowerState;
                  
                  console.log('🔄 Updated venue from response:', updatedVenue);
                  console.log('🔄 Final power state:', finalPowerState);
                  
                  // Update venue state immediately with response data
                  if (setVenue && updatedVenue) {
                    setVenue(prev => {
                      if (!prev) return prev;
                      // Merge updated venue data with existing venue data
                      return { ...prev, ...updatedVenue, isVenueOn: finalPowerState };
                    });
                  } else if (setVenue) {
                    // Fallback: update only isVenueOn if response doesn't have full venue
                    setVenue(prev => {
                      if (!prev) return prev;
                      return { ...prev, isVenueOn: finalPowerState };
                    });
                  }
                  
                  // Reload venue data if callback provided (this will sync everything)
                  if (onVenueUpdate) {
                    await onVenueUpdate();
                  }
                  
                  toast.success(response.data?.message || `Venue power ${finalPowerState ? 'turned ON' : 'turned OFF'}`);
                } catch (error) {
                  console.error('❌ Toggle venue power error:', error);
                  console.error('❌ Error details:', {
                    status: error.response?.status,
                    data: error.response?.data,
                    message: error.message
                  });
                  
                  // Revert the toggle on error
                  if (setVenue) {
                    setVenue(prev => {
                      if (!prev) return prev;
                      return { ...prev, isVenueOn: venue.isVenueOn || false };
                    });
                  }
                  
                  toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to toggle venue power');
                } finally {
                  setIsTogglingPower(false);
                }
              }}
              disabled={!isVenueValid || isTogglingPower}
              style={{ 
                zIndex: 9999, 
                position: 'relative', 
                pointerEvents: 'auto',
                minWidth: '40px',
                minHeight: '20px',
                cursor: (!isVenueValid || isTogglingPower) ? 'not-allowed' : 'pointer'
              }}
              className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-500 ${
                venue?.isVenueOn ? 'bg-green-500' : 'bg-gray-300'
              } ${(!isVenueValid || isTogglingPower) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80 active:scale-95'}`}
              title={isTogglingPower ? 'Toggling...' : (!isVenueValid ? 'Venue not loaded' : (venue?.isVenueOn ? 'Turn OFF' : 'Turn ON'))}
              onMouseDown={(e) => {
                e.stopPropagation();
                // Don't prevent default - let the click event fire
                console.log('🖱️ Button mouse down event', { 
                  disabled: !isVenueValid || isTogglingPower,
                  venueId: venue?.id,
                  isVenueValid 
                });
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                console.log('🖱️ Button mouse up event');
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                console.log('👆 Button touch start event');
              }}
            >
              {isTogglingPower ? (
                <span className="inline-block h-3.5 w-3.5 rounded-full bg-white animate-pulse" />
              ) : (
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    venue?.isVenueOn ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Blue Card with Temperature and Lock */}
      <div className="bg-blue-500 p-1.5 relative overflow-visible rounded-b-2xl">
        {/* Temperature Control */}
        <div className="mb-1">
          <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-xl px-2 py-1 w-fit" onClick={(e) => e.stopPropagation()}>
            {isMixed && (
              <span className="text-xs text-orange-600 font-semibold mr-1">Mixed</span>
            )}
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isVenueValid) {
                  toast.error('Venue not loaded. Please refresh the page.');
                  console.error('❌ Venue validation failed:', { venue, isVenueValid });
                  return;
                }
                if (isChangingTemp) return;
                const currentTemp = venue.temperature || 16;
                if (currentTemp <= 16) {
                  toast.info('Temperature is already at minimum (16°C)');
                  return;
                }
                setIsChangingTemp(true);
                try {
                  const newTemp = currentTemp - 1;
                  console.log('🔄 Setting venue temperature:', { venueId: venue.id, currentTemp, newTemp });
                  const response = await adminAPI.setVenueTemperature(venue.id, newTemp);
                  console.log('✅ Venue temperature response:', response.data);
                  
                  // Update venue state immediately
                  if (setVenue) {
                    setVenue(prev => {
                      if (!prev) return prev;
                      return { ...prev, temperature: newTemp };
                    });
                  }
                  
                  // Reload venue data if callback provided
                  if (onVenueUpdate) {
                    await onVenueUpdate();
                  }
                  
                  toast.success(response.data?.message || `Temperature set to ${newTemp}°C`);
                } catch (error) {
                  console.error('❌ Set temperature error:', error);
                  toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to set temperature');
                } finally {
                  setIsChangingTemp(false);
                }
              }}
              disabled={!isVenueValid || isChangingTemp || (venue?.temperature || 16) <= 16}
              className={`p-1 text-blue-600 rounded transition-colors ${
                (!isVenueValid || isChangingTemp || (venue?.temperature || 16) <= 16)
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-blue-50 cursor-pointer'
              }`}
              title="Decrease temperature"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min="16"
              max="30"
              value={venue?.temperature || 16}
              placeholder="temp"
              disabled={!isVenueValid || isChangingTemp}
              onChange={async (e) => {
                const value = parseInt(e.target.value);
                if (isNaN(value) || value < 16 || value > 30) {
                  return; // Invalid value, don't update
                }
                if (!isVenueValid) {
                  toast.error('Venue not loaded. Please refresh the page.');
                  console.error('❌ Venue validation failed:', { venue, isVenueValid });
                  return;
                }
                if (isChangingTemp) return;
                setIsChangingTemp(true);
                try {
                  console.log('🔄 Setting venue temperature (input):', { venueId: venue.id, value });
                  const response = await adminAPI.setVenueTemperature(venue.id, value);
                  console.log('✅ Venue temperature response (input):', response.data);
                  
                  // Update venue state immediately
                  if (setVenue) {
                    setVenue(prev => {
                      if (!prev) return prev;
                      return { ...prev, temperature: value };
                    });
                  }
                  
                  // Reload venue data if callback provided
                  if (onVenueUpdate) {
                    await onVenueUpdate();
                  }
                  
                  toast.success(response.data?.message || `Temperature set to ${value}°C`);
                } catch (error) {
                  console.error('❌ Set temperature error (input):', error);
                  toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to set temperature');
                } finally {
                  setIsChangingTemp(false);
                }
              }}
              onBlur={(e) => {
                // Reset to current venue temperature if invalid
                const value = parseInt(e.target.value);
                if (isNaN(value) || value < 16 || value > 30) {
                  e.target.value = venue?.temperature || 16;
                }
              }}
              className={`text-xs font-medium text-gray-900 w-12 text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded placeholder:text-gray-400 ${
                (!isVenueValid || isChangingTemp) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
            <span className="text-xs text-gray-600">°C</span>
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isVenueValid) {
                  toast.error('Venue not loaded. Please refresh the page.');
                  console.error('❌ Venue validation failed:', { venue, isVenueValid });
                  return;
                }
                if (isChangingTemp) return;
                const currentTemp = venue.temperature || 16;
                if (currentTemp >= 30) {
                  toast.info('Temperature is already at maximum (30°C)');
                  return;
                }
                setIsChangingTemp(true);
                try {
                  const newTemp = currentTemp + 1;
                  console.log('🔄 Setting venue temperature:', { venueId: venue.id, currentTemp, newTemp });
                  const response = await adminAPI.setVenueTemperature(venue.id, newTemp);
                  console.log('✅ Venue temperature response:', response.data);
                  
                  // Update venue state immediately
                  if (setVenue) {
                    setVenue(prev => {
                      if (!prev) return prev;
                      return { ...prev, temperature: newTemp };
                    });
                  }
                  
                  // Reload venue data if callback provided
                  if (onVenueUpdate) {
                    await onVenueUpdate();
                  }
                  
                  toast.success(response.data?.message || `Temperature set to ${newTemp}°C`);
                } catch (error) {
                  console.error('❌ Set temperature error:', error);
                  toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to set temperature');
                } finally {
                  setIsChangingTemp(false);
                }
              }}
              disabled={!isVenueValid || isChangingTemp || (venue?.temperature || 16) >= 30}
              className={`p-1 text-blue-600 rounded transition-colors ${
                (!isVenueValid || isChangingTemp || (venue?.temperature || 16) >= 30)
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-blue-50 cursor-pointer'
              }`}
              title="Increase temperature"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
        {/* Lock Dropdown - Below Temperature, Right Aligned */}
        <div className="flex justify-end mt-1">
          <div className="relative lock-dropdown-container" ref={lockDropdownRef}>
            <button
              onClick={() => {
                if (!isVenueValid) {
                  toast.error('Venue not loaded. Please refresh the page.');
                  return;
                }
                setShowLockDropdown(!showLockDropdown);
              }}
              disabled={!isVenueValid}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border-none ${
                venue?.isLocked
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              } ${!isVenueValid ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {venue?.isLocked ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <Unlock className="w-3.5 h-3.5" />
              )}
              <span>{venue?.isLocked ? 'Remote Locked' : 'Unlocked'}</span>
              <span className="text-xs">▼</span>
            </button>
            {showLockDropdown && (
              <div className="absolute top-full right-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[160px]">
                <button
                  onClick={async () => {
                    if (!isVenueValid) {
                      toast.error('Venue not loaded. Please refresh the page.');
                      console.error('❌ Venue validation failed:', { venue, isVenueValid });
                      setShowLockDropdown(false);
                      return;
                    }
                    setVenueLocking(true);
                    setShowLockDropdown(false);
                    try {
                      const response = await adminAPI.remoteUnlockVenue(venue.id);
                      
                      // Update venue state
                      setVenue(prev => ({ ...prev, isLocked: false }));
                      
                      // Reload venue data if callback provided
                      if (onVenueUpdate) {
                        await onVenueUpdate();
                      }
                      
                      toast.success(response.data?.message || 'Venue unlocked successfully');
                    } catch (error) {
                      console.error('Unlock venue error:', error);
                      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to unlock venue');
                    } finally {
                      setVenueLocking(false);
                    }
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Unlock className="w-4 h-4 text-gray-600" />
                  <span>Unlocked</span>
                </button>
                <button
                  onClick={async () => {
                    if (!isVenueValid) {
                      toast.error('Venue not loaded. Please refresh the page.');
                      console.error('❌ Venue validation failed:', { venue, isVenueValid });
                      setShowLockDropdown(false);
                      return;
                    }
                    setVenueLocking(true);
                    setShowLockDropdown(false);
                    try {
                      const response = await adminAPI.remoteLockVenue(venue.id, 'Locked from venue details page');
                      
                      // Update venue state
                      setVenue(prev => ({ ...prev, isLocked: true }));
                      
                      // Reload venue data if callback provided
                      if (onVenueUpdate) {
                        await onVenueUpdate();
                      }
                      
                      toast.success(response.data?.message || 'Venue locked successfully');
                    } catch (error) {
                      console.error('Lock venue error:', error);
                      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to lock venue');
                    } finally {
                      setVenueLocking(false);
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
      </div>
    </div>
  );
};

export default EnergyChartBox;

