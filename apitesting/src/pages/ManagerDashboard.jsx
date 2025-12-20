import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { managerAPI } from '../services/apiManager';
import { BACKEND_IP, BACKEND_PORT, FRONTEND_WS_PORT, WS_URL } from '../config/api';
import toast from 'react-hot-toast';
import EventForm from '../components/EventForm';
import { 
  Users, 
  Building, 
  Thermometer, 
  Activity,
  LogOut,
  RefreshCw,
  Power,
  PowerOff,
  Lock,
  Unlock,
  AlertTriangle,
  AlertCircle,
  Eye,
  X,
  Zap,
  Calendar,
  Play,
  Square,
  Pause,
  PlayCircle,
  Trash2,
  Edit,
  Plus,
  Minus,
  Save,
  MapPin,
  Menu,
  BarChart3,
  User
} from 'lucide-react';

const ManagerDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [allAlerts, setAllAlerts] = useState([]); // Store all alerts (including device-level) for device highlighting
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Helper functions to check if device/org is actually locked
  // Note: Manager dashboard only has remote lock, restricted, and unlocked status
  // No device/organization lock functionality for managers

  // Check if organization devices are remote locked
  const isOrganizationDevicesRemoteLocked = (org) => {
    if (!org) return false;
    
    // First check if org has acs array directly
    if (org.acs && Array.isArray(org.acs) && org.acs.length > 0) {
      return org.acs.some(ac => ac.currentState === "locked");
    }
    
    // If not, get ACs from data.acs by filtering through venues
    // Get all venues for this organization
    const orgVenues = org.venues || [];
    const orgVenueIds = orgVenues.map(v => v.id);
    
    if (orgVenueIds.length === 0) return false;
    
    // Get all ACs that belong to venues in this organization
    const orgACs = Array.isArray(data.acs) 
      ? data.acs.filter(ac => ac.venueId && orgVenueIds.includes(ac.venueId))
      : [];
    
    // Check if any AC has currentState === "locked"
    return orgACs.some(ac => ac.currentState === "locked");
  };

  // Check if venue devices are remote locked
  const isVenueDevicesRemoteLocked = (venue) => {
    if (!venue || !venue.acs || !Array.isArray(venue.acs)) {
      // If venue doesn't have acs array, check if it's in the data.acs
      const venueACs = Array.isArray(data.acs) ? data.acs.filter(ac => ac.venueId === venue.id) : [];
      return venueACs.some(ac => ac.currentState === "locked");
    }
    // Check if any AC in the venue has currentState === "locked"
    return venue.acs.some(ac => ac.currentState === "locked");
  };

  // Check if a device is remote locked
  const isDeviceRemoteLocked = (ac) => {
    if (!ac) return false;
    // Device is remote locked if currentState === "locked"
    return ac.currentState === "locked";
  };

  const [data, setData] = useState({
    organizations: [],
    acs: [],
    events: []
  });
  const [showOrgDetailsModal, setShowOrgDetailsModal] = useState(false);
  const [selectedOrgDetails, setSelectedOrgDetails] = useState(null);
  const [showVenueDetailsModal, setShowVenueDetailsModal] = useState(false);
  const [selectedVenueDetails, setSelectedVenueDetails] = useState(null);
  const [showACDetailsModal, setShowACDetailsModal] = useState(false);
  const [selectedACDetails, setSelectedACDetails] = useState(null);
  const [energyData, setEnergyData] = useState({
    acs: {},
    organizations: {}
  });
  const [energyLoading, setEnergyLoading] = useState({});
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventActionLoading, setEventActionLoading] = useState({});
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [localTemperatures, setLocalTemperatures] = useState({});
  const [temperatureLoading, setTemperatureLoading] = useState({});
  const [acPowerLoading, setAcPowerLoading] = useState({});

  // Helper function to check if error is a restriction error
  const isRestrictionError = (error) => {
    return (
      error.response?.status === 403 &&
      (error.response?.data?.restricted === true ||
       error.response?.data?.message?.toLowerCase().includes('restricted') ||
       error.response?.data?.message?.toLowerCase().includes('restriction'))
    );
  };

  // Helper function to get restriction error message
  const getRestrictionMessage = (error) => {
    if (isRestrictionError(error)) {
      return error.response?.data?.message || 'You are restricted from performing this action. Contact your admin for full permissions.';
    }
    return error.response?.data?.message || 'Action failed';
  };

  useEffect(() => {
    const loadDataSafely = async () => {
      try {
        console.log('📊 Manager Dashboard - Loading data...');
        console.log('📊 Manager Dashboard - User:', user);
        console.log('📊 Manager Dashboard - User role:', user?.role);
        console.log('📊 Manager Dashboard - localStorage user:', localStorage.getItem('user'));
        console.log('📊 Manager Dashboard - localStorage role:', localStorage.getItem('role'));

        if (user && user.role === 'manager') {
          // Longer delay to ensure session cookie is set after login
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          await loadData();
          loadAlerts();
          // Load events on initial mount to get accurate count for tab badge
          loadEvents();
        } else {
          console.warn('⚠️ Manager Dashboard - User not authenticated or wrong role');
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        toast.error('Failed to load dashboard data');
      }
    };
    loadDataSafely();
    
    // Native WebSocket connection for real-time updates
    // Use WS_URL from config (handles Railway URL automatically)
    const socket = new WebSocket(WS_URL);
    
    socket.onopen = () => {
      console.log('✅ WebSocket connected to backend');
    };
    
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 WebSocket message received:', message);
        
        // Handle direct POWER_UPDATE, TEMP_UPDATE, LOCK_UPDATE from ESP32
        if (message.serial && (message.type === 'POWER_UPDATE' || message.type === 'TEMP_UPDATE' || message.type === 'LOCK_UPDATE')) {
          const serialNumber = message.serial;
          setData(prevData => ({
            ...prevData,
            acs: prevData.acs.map(ac => {
              if (ac.serialNumber === serialNumber) {
                const updated = { ...ac };
                if (message.type === 'POWER_UPDATE' && message.power !== undefined) {
                  const isOn = message.power === 1;
                  console.log(`🔌 [DASHBOARD] Device ${serialNumber} power updated: ${ac.isOn} → ${isOn}`);
                  updated.isOn = isOn;
                }
                if (message.type === 'TEMP_UPDATE' && message.temp !== undefined) {
                  console.log(`🌡️ [DASHBOARD] Device ${serialNumber} temperature updated: ${ac.temperature}°C → ${message.temp}°C`);
                  updated.temperature = message.temp;
                }
                if (message.type === 'LOCK_UPDATE' && message.locked !== undefined) {
                  const isLocked = message.locked === 1;
                  updated.currentState = isLocked ? 'locked' : 'unlocked';
                }
                return updated;
              }
              return ac;
            })
          }));
        }
        
        if (message.type === 'ESP32_UPDATE' && message.data) {
          const update = message.data;
          
          // Update AC data in real-time
          if (update.device_id || update.serialNumber) {
            setData(prevData => ({
              ...prevData,
              acs: prevData.acs.map(ac => {
                const matches = (ac.serialNumber === update.serialNumber) || 
                               (ac.key === update.device_id) ||
                               (ac.id === update.device_id);
                
                if (matches) {
                  const updated = { ...ac };
                  if (update.temperature !== undefined) {
                    updated.temperature = update.temperature;
                  }
                  if (update.isOn !== undefined) {
                    console.log(`🔌 [DASHBOARD] Device ${ac.serialNumber || ac.key} power updated: ${ac.isOn} → ${update.isOn}`);
                    updated.isOn = update.isOn;
                  }
                  return updated;
                }
                return ac;
              })
            }));
            
            // Show toast notification for changes
            if (update.changedBy === 'esp_local') {
              toast.success(`Device ${update.serialNumber} updated: ${update.temperature}°C`, {
                duration: 2000,
              });
            }
          }
          
          // Handle bulk updates
          if (update.type === 'temperature_changed_bulk') {
            loadData(false); // Refresh data silently
          }
          
          // Handle lock status changes
          if (update.type === 'ac_lock_status_changed') {
            // Lock status changes handled by data refresh
          }

          // Handle room temperature updates
          if (update.type === 'ROOM_TEMPERATURE') {
            // Update AC room temperature in real-time
            setData(prevData => ({
              ...prevData,
              acs: prevData.acs.map(ac => {
                if (ac.serialNumber === update.serialNumber || ac.key === update.device_id) {
                  return { ...ac, roomTemperature: update.roomTemperature };
                }
                return ac;
              })
            }));
          }
        }

        // Handle event started - update status from waiting to in process in real-time
        if (message.type === 'EVENT_STARTED' || (message.type === 'ESP32_UPDATE' && message.data && message.data.type === 'EVENT_STARTED')) {
          const eventData = message.type === 'EVENT_STARTED' ? message : message.data;
          console.log('▶️ Event started received:', eventData);
          
          // Update event status to active in real-time
          setData(prevData => ({
            ...prevData,
            events: prevData.events.map(event => {
              if (event && event.id === eventData.eventId) {
                return { 
                  ...event, 
                  status: 'active', 
                  startedAt: eventData.startedAt || eventData.timestamp 
                };
              }
              return event;
            })
          }));
          
          // Show notification
          toast.success(`Event "${eventData.eventName || 'Unknown'}" has started.`, {
            duration: 3000,
          });
        }

        // Handle event stopped - update status and schedule deletion
        if (message.type === 'EVENT_STOPPED' || (message.type === 'ESP32_UPDATE' && message.data && message.data.type === 'EVENT_STOPPED')) {
          const eventData = message.type === 'EVENT_STOPPED' ? message : message.data;
          console.log('🛑 Event stopped received:', eventData);
          
          // Update event status to stopped in real-time
          setData(prevData => ({
            ...prevData,
            events: prevData.events.map(event => {
              if (event && event.id === eventData.eventId) {
                return { ...event, status: 'stopped', stoppedAt: eventData.timestamp };
              }
              return event;
            })
          }));
          
          // Show notification
          toast.success(`Event "${eventData.eventName || 'Unknown'}" stopped. Will be removed in 5 minutes.`, {
            duration: 4000,
          });
          
          // Auto-delete after 5 minutes (300000ms) for manager events
          setTimeout(() => {
            setData(prevData => ({
              ...prevData,
              events: prevData.events.filter(event => event && event.id !== eventData.eventId)
            }));
            console.log(`🗑️ Removed event ${eventData.eventId} from list`);
          }, 300000); // 5 minutes delay
        }

        // Handle event completed - update status and schedule deletion
        if (message.type === 'EVENT_COMPLETED' || (message.type === 'ESP32_UPDATE' && message.data && message.data.type === 'EVENT_COMPLETED')) {
          const eventData = message.type === 'EVENT_COMPLETED' ? message : message.data;
          console.log('✅ Event completed received:', eventData);
          
          // Update event status to completed in real-time
          setData(prevData => ({
            ...prevData,
            events: prevData.events.map(event => {
              if (event && event.id === eventData.eventId) {
                return { ...event, status: 'completed', completedAt: eventData.timestamp };
              }
              return event;
            })
          }));
          
          // Show notification
          toast.success(`Event "${eventData.eventName || 'Unknown'}" ended. Will be removed in 5 minutes.`, {
            duration: 4000,
          });
          
          // Auto-delete after 5 minutes (300000ms)
          setTimeout(() => {
            setData(prevData => ({
              ...prevData,
              events: prevData.events.filter(event => event && event.id !== eventData.eventId)
            }));
            console.log(`🗑️ Removed completed event ${eventData.eventId} from list`);
          }, 300000); // 5 minutes delay
        }

        // Handle event deleted - remove immediately
        if (message.type === 'EVENT_DELETED' || (message.type === 'ESP32_UPDATE' && message.data && message.data.type === 'EVENT_DELETED')) {
          const eventData = message.type === 'EVENT_DELETED' ? message : message.data;
          console.log('🗑️ Event deleted received:', eventData);
          
          // Remove event from list immediately
          setData(prevData => ({
            ...prevData,
            events: prevData.events.filter(event => event && event.id !== eventData.eventId)
          }));
          
          toast.success(`Event "${eventData.eventName || 'Unknown'}" has been removed.`, {
            duration: 2000,
          });
        }

        // Handle alert messages
        if (message.type === 'ESP32_UPDATE' && message.data && message.data.type === 'ALERT_CREATED') {
          const alertData = message.data.alertData;
          console.log('🚨 Alert received:', alertData);
          
          // Show alert notification
          toast.error(`Alert: ${alertData.acName} - ${alertData.issue}`, {
            duration: 5000,
          });
          
          // Add alert to allAlerts for device highlighting
          setAllAlerts(prevAlerts => {
            // Check if alert already exists
            const exists = prevAlerts.find(a => a.acId === alertData.acId && a.alertAt === alertData.alertAt);
            if (!exists) {
              return [...prevAlerts, alertData];
            }
            return prevAlerts;
          });
          
          // Refresh alerts to show new alert
          loadAlerts();
          
          // Update AC data to reflect alert status
          setData(prevData => ({
            ...prevData,
            acs: prevData.acs.map(ac => {
              if (ac.id === alertData.acId) {
                return { ...ac, isWorking: false, alertAt: alertData.alertAt };
              }
              return ac;
            })
          }));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    socket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };
    
    socket.onclose = () => {
      console.log('🔌 WebSocket disconnected, attempting to reconnect...');
      // Reconnect after 3 seconds
      setTimeout(() => {
        // Reconnection will be handled by useEffect cleanup and re-run
      }, 3000);
    };
    
    // Fallback: Refresh alerts every 30 seconds (in case WebSocket misses updates)
    const alertsInterval = setInterval(() => {
      loadAlerts();
    }, 30000);
    
    return () => {
      socket.close();
      clearInterval(alertsInterval);
    };
  }, [user]); // Dependency on user state

  useEffect(() => {
    if (activeTab === 'events') {
      loadEvents();
    }
  }, [activeTab]);

  // Monitor events for auto-start, completion and show notifications
  useEffect(() => {
    if (!Array.isArray(data.events) || data.events.length === 0) return;

    // Store previous event states to detect changes
    const previousStates = new Map();
    data.events.forEach(event => {
      if (event) {
        previousStates.set(event.id, {
          status: event.status,
          autoStarted: event.autoStarted,
          isDisabled: event.isDisabled
        });
      }
    });

    const checkEventChanges = () => {
      const now = new Date();
      data.events.forEach(event => {
        if (!event) return;
        
        const previous = previousStates.get(event.id);
        
        // Check if event just started automatically
        if (event.status === 'active' && event.autoStarted && 
            previous && previous.status === 'scheduled') {
          toast.success(`Event "${event.name}" has started automatically. Device/organization settings have been applied.`, {
            duration: 5000,
            icon: '🚀',
          });
        }
        
        // Check if event was disabled by admin (conflict resolution)
        if (event.isDisabled && previous && !previous.isDisabled && event.status === 'scheduled') {
          toast.warning(`⚠️ Event "${event.name}" was disabled: There is an admin event, so your event was automatically disabled.`, {
            duration: 7000,
            icon: '⚠️',
          });
        }
        
        // Check if event just ended (within last 30 seconds and not already completed)
        if (event.endTime) {
          const endTime = new Date(event.endTime);
          const timeDiff = now - endTime;
          
          if (timeDiff > 0 && timeDiff < 30000 && event.status === 'active') {
            // Event just ended - show notification
            toast.success(`Event "${event.name}" has ended automatically. Device/organization settings have been reverted.`, {
              duration: 5000,
              icon: '✅',
            });
          }
        }
        
        // Update previous state
        if (event) {
          previousStates.set(event.id, {
            status: event.status,
            autoStarted: event.autoStarted,
            isDisabled: event.isDisabled
          });
        }
      });
    };

    // Check every 10 seconds
    const interval = setInterval(checkEventChanges, 10000);
    
    return () => clearInterval(interval);
  }, [data.events]);

  // Auto-load energy data when energy tab is active
  useEffect(() => {
    if (activeTab === 'energy' && data.acs.length > 0) {
      // Load energy for all ACs and organizations when energy tab is opened
      data.acs.forEach(ac => {
        if (ac.isOn) {
          loadACEnergy(ac.id);
        }
      });
      data.organizations.forEach(org => {
        loadOrganizationEnergy(org.id);
      });
    }
  }, [activeTab, data.acs.length, data.organizations.length]);

  const loadData = async (showLoading = true) => {
    // Only show loading spinner on manual refresh, not during polling
    if (showLoading) {
      setLoading(true);
    }
    
    try {
      const [orgsRes, acsRes] = await Promise.all([
        managerAPI.getAssignedOrganizations().catch(err => {
          console.error('Failed to load organizations:', err);
          // Return null to indicate error, but don't return empty data
          return null;
        }),
        managerAPI.getManagerACs().catch(err => {
          console.error('Failed to load ACs:', err);
          // Return null to indicate error, but don't return empty data
          return null;
        })
      ]);

      // Only update data if we got successful responses
      // This preserves last known good data for restricted/locked managers during errors
      if (orgsRes && acsRes) {
        console.log('Organizations response:', orgsRes?.data);
        console.log('ACs response:', acsRes?.data);

        // Handle different response structures
        const allOrgs = orgsRes?.data?.organizations || 
                        orgsRes?.data?.data?.organizations || 
                        (Array.isArray(orgsRes?.data?.data) ? orgsRes.data.data : []) ||
                        [];
        
        // Only show active organizations
        let organizations = allOrgs.filter(org => org.status === 'active');
        
        const acs = (acsRes?.data?.acs || 
                    acsRes?.data?.data?.acs || 
                    (Array.isArray(acsRes?.data?.data) ? acsRes.data.data : []) ||
                    []).map(ac => ({
          ...ac,
          // Map currentState to isLocked for compatibility
          isLocked: ac.currentState === 'locked' || ac.isLocked || false
        }));

        // Calculate hasMixedTemperatures for organizations and venues
        organizations = organizations.map(org => {
          // Get all ACs for this organization (through venues or direct)
          const orgVenueIds = (org.venues || []).map(v => v.id);
          const orgACs = acs.filter(ac => 
            ac.venueId === org.id || 
            orgVenueIds.includes(ac.venueId) ||
            ac.organizationId === org.id
          );
          
          // Get organization temperature (from main venue or org itself)
          const orgTemp = org.temperature || 16;
          
          // Check if any AC has different temperature than organization
          let hasMixedTemperatures = false;
          if (orgACs.length > 0) {
            hasMixedTemperatures = orgACs.some(ac => {
              const acTemp = ac.temperature || 16;
              return acTemp !== orgTemp;
            });
          }
          
          // Also check venues for mixed temperatures
          const venuesWithMixed = (org.venues || []).map(venue => {
            const venueACs = acs.filter(ac => ac.venueId === venue.id);
            const venueTemp = venue.temperature || 16;
            let venueHasMixed = false;
            
            if (venueACs.length > 1) {
              venueHasMixed = venueACs.some(ac => {
                const acTemp = ac.temperature || 16;
                return acTemp !== venueTemp;
              });
            }
            
            return {
              ...venue,
              hasMixedTemperatures: venueHasMixed
            };
          });
          
          return {
            ...org,
            hasMixedTemperatures: hasMixedTemperatures || org.hasMixedTemperatures || false,
            venues: venuesWithMixed.length > 0 ? venuesWithMixed : (org.venues || [])
          };
        });

        // Debug logging
        console.log('📊 [MANAGER] Loaded Data:');
        console.log('   Organizations:', organizations.length, organizations.map(o => ({ id: o.id, name: o.name, temperature: o.temperature, hasMixedTemperatures: o.hasMixedTemperatures, venues: o.venues?.length || 0 })));
        console.log('   AC Devices:', acs.length, acs.map(ac => ({ id: ac.id, name: ac.name, venueId: ac.venueId, temperature: ac.temperature })));
        
        // Check venue-AC mapping
        organizations.forEach(org => {
          const orgACs = acs.filter(ac => ac.organizationId === org.id || ac.venueId === org.id);
          console.log(`   Org "${org.name}" (ID: ${org.id}): ${orgACs.length} ACs, Temp: ${org.temperature}°C, Mixed: ${org.hasMixedTemperatures}`);
          if (org.venues && org.venues.length > 0) {
            org.venues.forEach(venue => {
              const venueACs = acs.filter(ac => ac.venueId === venue.id);
              console.log(`     Venue "${venue.name}" (ID: ${venue.id}): ${venueACs.length} ACs, Temp: ${venue.temperature}°C, Mixed: ${venue.hasMixedTemperatures}`);
            });
          }
        });

        setData(prev => ({
          ...prev,
          organizations,
          acs,
          // CRITICAL: Preserve events - don't clear them when loading other data
          events: prev.events || []
        }));

        // Show warning if no data but request succeeded
        if (organizations.length === 0 && acs.length === 0 && orgsRes?.data?.success !== false && acsRes?.data?.success !== false) {
          console.warn('No organizations or ACs found for this manager');
        }
      } else {
        // If we got errors, log them but don't update data (preserves last known good state)
        // This allows restricted/locked managers to continue seeing data even if polling fails
        if (!orgsRes) {
          console.warn('Organizations fetch failed, preserving last known data');
        }
        if (!acsRes) {
          console.warn('ACs fetch failed, preserving last known data');
        }
        // Only show error toast on manual refresh, not during polling
        if (showLoading) {
          toast.error('Failed to refresh data. Showing last known values.');
        }
      }
    } catch (error) {
      // Only show error toast on manual refresh, not during polling
      if (showLoading) {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load data';
        toast.error(errorMessage);
      }
      console.error('Load data error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // Don't clear data on error - preserve last known good state
      // This ensures restricted/locked managers can still see their data
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const loadAlerts = async () => {
    try {
      setAlertsLoading(true);
      const res = await managerAPI.getManagerActiveAlerts();
      const allAlertsData = res.data.data || res.data || [];
      // Store all alerts (including device-level) for device highlighting
      setAllAlerts(allAlertsData);
      // Filter to show only organization-level alerts in alerts tab
      const orgAlerts = allAlertsData.filter(alert => alert.alertType === 'organization');
      setAlerts(orgAlerts);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setAlertsLoading(false);
    }
  };


  const handleCheckAlerts = async () => {
    try {
      setAlertsLoading(true);
      await managerAPI.checkManagerAlerts();
      toast.success('Alert check completed');
      await loadAlerts();
    } catch (error) {
      const errorMessage = getRestrictionMessage(error);
      toast.error(errorMessage);
      console.error('Check alerts error:', error);
    } finally {
      setAlertsLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      setEventsLoading(true);
      const response = await managerAPI.getEvents();
      console.log('Manager Events API Response:', response);
      // Backend returns: { success: true, data: { events: [...] } }
      const events = response.data?.data?.events || response.data?.events || (Array.isArray(response.data?.data) ? response.data.data : (Array.isArray(response.data) ? response.data : []));
      console.log('Parsed manager events:', events);
      setData(prev => ({ ...prev, events: Array.isArray(events) ? events : [] }));
    } catch (error) {
      console.error('Load events error:', error);
      console.error('Error response:', error.response?.data);
      if (error.response?.status !== 404) {
        toast.error('Failed to load events');
      }
      setData(prev => ({ ...prev, events: [] }));
    } finally {
      setEventsLoading(false);
    }
  };

  const handleCreateEvent = useCallback(async (eventData) => {
    try {
      console.log('Creating event with data:', eventData);
      const response = await managerAPI.createEvent(eventData);
      console.log('Create event response:', response);
      
      if (response.data?.success === false) {
        toast.error(response.data?.message || 'Failed to create event');
        return;
      }
      
      // Check if event was created with any warnings
      const warning = response.data?.data?.warning;
      if (warning) {
        toast.success(`Event created successfully. ${warning}`, {
          duration: 5000
        });
      } else {
        toast.success('Event created successfully. It will start automatically at the scheduled time.', {
          duration: 4000
        });
      }
      setShowEventModal(false);
      setSelectedEvent(null);
      
      // Wait a bit before reloading to ensure backend has processed
      setTimeout(async () => {
        await loadEvents();
      }, 500);
    } catch (error) {
      console.error('Create event error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to create event';
      
      // Show specific messages for different conflict scenarios
      if (errorMessage.includes('admin event') || errorMessage.includes('admin')) {
        // Use the backend error message directly (it's already user-friendly)
        toast.error(`⚠️ ${errorMessage}`, {
          duration: 7000
        });
      } else if (errorMessage.includes('conflict') || errorMessage.includes('overlapping') || errorMessage.includes('overlap')) {
        toast.error('⚠️ Cannot create event: There is an overlapping event at this time, so you cannot create your event. Please choose a different time.', {
          duration: 6000
        });
      } else if (errorMessage.includes('already exists')) {
        toast.error('Cannot create event: An event already exists at this time for the same device/organization. Please choose a different time.', {
          duration: 6000
        });
      } else if (errorMessage.includes('restricted') || errorMessage.includes('Restricted')) {
        toast.error('⚠️ Restricted managers cannot create events. Contact admin for full permissions.', {
          duration: 6000
        });
      } else {
        toast.error(errorMessage);
      }
      
      // Don't throw error - let user fix the form
      // throw error;
    }
  }, [loadEvents]);

  const handleUpdateEvent = useCallback(async (eventId, eventData) => {
    try {
      const response = await managerAPI.updateEvent(eventId, eventData);
      
      // Check if there were actual changes
      const changes = response.data?.data?.changes || {};
      const changedFields = Object.keys(changes);
      
      if (changedFields.length > 0) {
        // Show what was changed
        const changeMessages = changedFields.map(field => {
          const change = changes[field];
          if (field === 'startTime' || field === 'endTime') {
            const oldTime = change.old ? new Date(change.old).toLocaleString() : 'N/A';
            const newTime = change.new ? new Date(change.new).toLocaleString() : 'N/A';
            return `${field}: ${oldTime} → ${newTime}`;
          } else if (field === 'temperature') {
            return `${field}: ${change.old ?? 'N/A'}°C → ${change.new ?? 'N/A'}°C`;
          } else if (field === 'powerOn') {
            return `${field}: ${change.old ? 'ON' : 'OFF'} → ${change.new ? 'ON' : 'OFF'}`;
          } else {
            return `${field}: "${change.old}" → "${change.new}"`;
          }
        });
        
        toast.success(`Event updated successfully. Changes: ${changeMessages.join(', ')}`, {
          duration: 6000
        });
      } else {
        toast.success('Event updated successfully (no changes detected)');
      }
      
      setShowEventModal(false);
      setSelectedEvent(null);
      await loadEvents();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to update event';
      toast.error(errorMessage);
      console.error('Update event error:', error);
      throw error;
    }
  }, [loadEvents]);

  // Memoize callbacks and arrays for event form to prevent re-renders
  const handleCloseEventModal = useCallback(() => {
    setShowEventModal(false);
    setSelectedEvent(null);
  }, []);

  const handleEventSubmit = useCallback((eventData) => {
    // Check if selectedEvent has an id (existing event) vs just deviceId (new event with pre-selected device)
    if (selectedEvent?.id) {
      return handleUpdateEvent(selectedEvent.id, eventData);
    } else {
      return handleCreateEvent(eventData);
    }
  }, [selectedEvent, handleUpdateEvent, handleCreateEvent]);

  const memoizedAcs = useMemo(() => Array.isArray(data.acs) ? data.acs : [], [data.acs]);
  const memoizedOrgs = useMemo(() => Array.isArray(data.organizations) ? data.organizations : [], [data.organizations]);

  const handleEventAction = async (eventId, action) => {
    try {
      setEventActionLoading(prev => ({ ...prev, [eventId]: action }));
      let response;
      
      switch (action) {
        case 'start':
          response = await managerAPI.startEvent(eventId);
          toast.success('Event started successfully. Device/organization settings have been applied.', {
            duration: 4000
          });
          break;
        case 'stop':
          response = await managerAPI.stopEvent(eventId);
          const stopMessage = response.data?.message || 'Event stopped successfully';
          if (stopMessage.includes('reverted') || stopMessage.includes('settings')) {
            toast.success(stopMessage, {
              duration: 5000
            });
          } else {
            toast.success('Event stopped successfully. Device/organization settings have been reverted.', {
              duration: 4000
            });
          }
          break;
        case 'disable':
          response = await managerAPI.disableEvent(eventId);
          const disableMessage = response.data?.message || 'Event disabled successfully';
          if (disableMessage.includes('reverted') || disableMessage.includes('settings')) {
            toast.success(disableMessage, {
              duration: 5000
            });
          } else {
            toast.success('Event disabled successfully. Settings have been reverted if event was active.', {
              duration: 4000
            });
          }
          break;
        case 'enable':
          response = await managerAPI.enableEvent(eventId);
          if (response.data?.success === false) {
            toast.warning(response.data?.message || 'Event enable failed');
          } else {
            const message = response.data?.message || 'Event enabled successfully';
            // Show extended time info if available
            if (message.includes('extended')) {
              toast.success(message, {
                duration: 5000
              });
            } else {
              toast.success(message);
            }
          }
          break;
        case 'delete':
          if (!window.confirm('Are you sure you want to delete this event?')) {
            return;
          }
          response = await managerAPI.deleteEvent(eventId);
          if (response.data?.success === false) {
            toast.error(response.data?.message || 'Failed to delete event');
            return;
          }
          toast.success(response.data?.message || 'Event deleted successfully');
          break;
        default:
          return;
      }
      
      // Wait a bit before reloading to ensure backend has processed
      setTimeout(async () => {
        await loadEvents();
      }, 500);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Action failed';
      
      // Show specific messages for different error scenarios
      if (errorMessage.includes('admin event') || (errorMessage.includes('admin') && (errorMessage.includes('active') || errorMessage.includes('scheduled')))) {
        // Use the backend error message directly (it's already user-friendly)
        toast.error(`⚠️ ${errorMessage}`, {
          duration: 7000
        });
      } else if (errorMessage.includes('disabled')) {
        toast.error('Cannot perform action: Event is disabled. Please enable it first.', {
          duration: 5000
        });
      } else if (errorMessage.includes('not found')) {
        toast.error('Event not found. It may have been deleted or you do not have permission.', {
          duration: 4000
        });
      } else if (errorMessage.includes('conflict') || errorMessage.includes('overlapping')) {
        toast.error('⚠️ Cannot perform action: There is a conflicting event, so you cannot perform this action. Please resolve the conflict first.', {
          duration: 6000
        });
      } else if (errorMessage.includes('restricted') || errorMessage.includes('locked')) {
        toast.error('Cannot perform action: Your account is restricted or locked. Please contact admin.', {
          duration: 6000
        });
      } else {
        toast.error(errorMessage);
      }
      
      console.error(`Event ${action} error:`, error);
    } finally {
      setEventActionLoading(prev => {
        const newState = { ...prev };
        delete newState[eventId];
        return newState;
      });
    }
  };

  const handleViewOrganizationDetails = async (orgId) => {
    try {
      const res = await managerAPI.getOrganizationDetails(orgId);
      setSelectedOrgDetails(res.data.data?.organization || res.data.organization);
      setShowOrgDetailsModal(true);
      // Load energy data for this organization
      loadOrganizationEnergy(orgId);
    } catch (error) {
      toast.error('Failed to load organization details');
      console.error('Error loading organization details:', error);
    }
  };

  const handleViewVenueDetails = async (venueId) => {
    try {
      const res = await managerAPI.getVenueDetails(venueId);
      const venueData = res.data.data?.venue || res.data.venue || res.data.data;
      if (venueData) {
        setSelectedVenueDetails(venueData);
        setShowVenueDetailsModal(true);
      } else {
        toast.error('Venue details not found in response');
        console.error('Venue details response:', res.data);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to load venue details';
      toast.error(errorMessage);
      console.error('Error loading venue details:', error);
      console.error('Error response:', error.response?.data);
    }
  };

  const handleViewACDetails = async (acId) => {
    try {
      const res = await managerAPI.getACDetails(acId);
      const acData = res.data.data?.ac || res.data.ac || res.data.data;
      if (acData) {
        setSelectedACDetails(acData);
        setShowACDetailsModal(true);
        // Load energy data for this AC
        loadACEnergy(acId);
      } else {
        toast.error('AC details not found in response');
        console.error('AC details response:', res.data);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to load AC details';
      toast.error(errorMessage);
      console.error('Error loading AC details:', error);
      console.error('Error response:', error.response?.data);
    }
  };

  const handleDeleteAC = async (acId, acName) => {
    if (!window.confirm(`Are you sure you want to delete "${acName}"?\n\nThis will:\n- Delete the AC device permanently\n- Delete all related events\n- Delete all related activity logs\n- Delete all related system states\n\nThis action CANNOT be undone!`)) {
      return;
    }

    try {
      // Note: Manager delete AC endpoint may not exist - this will show an error if not implemented
      toast.error('Delete AC functionality is only available for admins. Please contact an admin to delete this device.');
      // If backend endpoint is added later, uncomment below:
      // const result = await managerAPI.deleteAC(acId);
      // toast.success(result.data?.message || `AC device "${acName}" deleted successfully`);
      // await loadData(false);
      // if (showACDetailsModal && selectedACDetails?.id === acId) {
      //   setShowACDetailsModal(false);
      // }
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to delete AC device "${acName}". Only admins can delete devices.`);
    }
  };


  const handleToggleOrganizationPower = async (orgId, currentPowerState) => {
    try {
      // Check if manager is unlocked
      if (user?.status !== 'unlocked') {
        toast.error('Only unlocked managers can toggle organization power');
        return;
      }

      // Ensure currentPowerState is a boolean (default to false if undefined)
      const currentState = currentPowerState === true || currentPowerState === 'true' || currentPowerState === 1;
      const newPowerState = !currentState;
      
      console.log('🔌 Toggling organization power:', {
        orgId,
        currentState,
        newPowerState
      });

      const response = await managerAPI.toggleOrganizationPower(orgId, newPowerState);
      
      toast.success(response.data?.message || `Organization power ${newPowerState ? 'turned ON' : 'turned OFF'}`);
      
      // Reload data to reflect changes
      await loadData(false);
    } catch (error) {
      console.error('Toggle organization power error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to toggle organization power';
      toast.error(errorMessage);
    }
  };

  const handleToggleVenuePower = async (venueId, currentPowerState) => {
    try {
      // Check if manager is unlocked
      if (user?.status !== 'unlocked') {
        toast.error('Only unlocked managers can toggle venue power');
        return;
      }

      // Ensure currentPowerState is a boolean (default to false if undefined)
      const currentState = currentPowerState === true || currentPowerState === 'true' || currentPowerState === 1;
      const newPowerState = !currentState;
      
      console.log('🔌 Toggling venue power:', {
        venueId,
        currentState,
        newPowerState
      });

      const response = await managerAPI.toggleVenuePower(venueId, newPowerState);
      
      toast.success(response.data?.message || `Venue power ${newPowerState ? 'turned ON' : 'turned OFF'}`);
      
      // Reload data to reflect changes
      await loadData(false);
    } catch (error) {
      console.error('Toggle venue power error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to toggle venue power';
      toast.error(errorMessage);
    }
  };

  // Handle temperature change (local state update)
  const handleTemperatureChange = (type, id, temperature) => {
    const key = `${type}-${id}`;
    setLocalTemperatures(prev => ({
      ...prev,
      [key]: temperature
    }));
  };

  // Handle set temperature (API call)
  const handleSetTemperature = async (type, id, temperature) => {
    const key = `${type}-${id}`;
    setTemperatureLoading(prev => ({ ...prev, [key]: true }));
    
    try {
      let response;
      let responseTemp = null;
      let responseOrgTemp = null;
      let responseOrgMixed = null;
      let orgIdFromResponse = null;
      
      if (type === 'organization') {
        // Check manager status only (no organization lock check for managers)
        const org = data.organizations.find(o => o.id === id);
        
        response = await managerAPI.setOrganizationTemperature(id, temperature);
        responseTemp = response?.data?.organization?.temperature ?? response?.data?.temperature ?? temperature;
        responseOrgTemp = responseTemp;
        responseOrgMixed = response?.data?.organization?.hasMixedTemperatures ?? response?.data?.hasMixedTemperatures;
      
        // Log the action
        try {
          await managerAPI.logManagerAction('temperature_change', {
            type: 'organization',
            organizationId: id,
            organizationName: org?.name || 'Unknown',
            temperature: temperature,
            timestamp: new Date().toISOString()
          });
        } catch (logError) {
          console.warn('Failed to log action:', logError);
        }
      
        toast.success('Organization temperature set successfully');
      } else if (type === 'venue') {
        // Check manager status only (no venue lock check for managers)
        
        response = await managerAPI.setVenueTemperature(id, temperature);
        responseTemp = response?.data?.venue?.temperature ?? response?.data?.temperature ?? temperature;
        responseOrgTemp = response?.data?.organization?.temperature;
        responseOrgMixed = response?.data?.organization?.hasMixedTemperatures;
        orgIdFromResponse = response?.data?.organization?.id ?? response?.data?.organizationId;
        
        // Log the action
        const venue = data.organizations
          .flatMap(org => org.venues || [])
          .find(v => v.id === id);
        
        try {
          await managerAPI.logManagerAction('temperature_change', {
            type: 'venue',
            venueId: id,
            venueName: venue?.name || 'Unknown',
            temperature: temperature,
            timestamp: new Date().toISOString()
          });
        } catch (logError) {
          console.warn('Failed to log action:', logError);
        }
        
        toast.success('Venue temperature set successfully');
      } else if (type === 'ac') {
        // Check manager status only (no device lock check for managers)
        const ac = data.acs.find(a => a.id === id);
        
        response = await managerAPI.setACTemperature(id, temperature);
        responseTemp = response?.data?.ac?.temperature ?? response?.data?.temperature ?? temperature;
      
        // Log the action
        try {
          await managerAPI.logManagerAction('temperature_change', {
            type: 'ac_device',
            acId: id,
            acName: ac?.name || 'Unknown',
            temperature: temperature,
            timestamp: new Date().toISOString()
          });
        } catch (logError) {
          console.warn('Failed to log action:', logError);
        }
        
        toast.success('AC temperature set successfully');
      }
      
      // Preserve temperature from response before loadData
      const preservedTemp = responseTemp !== null && responseTemp !== undefined ? responseTemp : temperature;
      
      // Refresh data to show updated temperature
      await loadData(false);
      
      // IMPORTANT: Update state with preserved temperature after loadData
      // This ensures the UI shows the correct temperature even if loadData doesn't return it
      if (type === 'organization') {
        // Get response data for venues and devices count
        const venuesUpdated = response?.data?.venuesUpdated ?? 0;
        const acsUpdated = response?.data?.acsUpdated ?? 0;
        
        setData(prev => ({
          ...prev,
          organizations: prev.organizations.map(org => {
            if (org.id === id) {
              // Update organization temperature
              const updatedOrg = {
                ...org,
                temperature: preservedTemp,
                hasMixedTemperatures: responseOrgMixed !== undefined ? responseOrgMixed : false
              };
              
              // Update all venues under this organization
              if (org.venues && org.venues.length > 0) {
                updatedOrg.venues = org.venues.map(venue => ({
                  ...venue,
                  temperature: preservedTemp,
                  hasMixedTemperatures: false // All venues have same temp now
                }));
              }
              
              return updatedOrg;
            }
            return org;
          }),
          // Update all ACs in this organization
          acs: prev.acs.map(ac => {
            // Check if AC belongs to this organization
            const belongsToOrg = ac.organizationId === id || 
                                prev.organizations.find(o => o.id === id)?.venues?.some(v => v.id === ac.venueId);
            if (belongsToOrg) {
              return {
                ...ac,
                temperature: preservedTemp
              };
            }
            return ac;
          })
        }));
      } else if (type === 'venue') {
        // Update venue temperature
        setData(prev => ({
          ...prev,
          organizations: prev.organizations.map(org => {
            const updatedVenues = (org.venues || []).map(venue => {
              if (venue.id === id) {
                return { ...venue, temperature: preservedTemp };
              }
              return venue;
            });
            // Also update organization temp if it changed
            if (orgIdFromResponse && org.id === orgIdFromResponse && responseOrgTemp !== null && responseOrgTemp !== undefined) {
              return {
                ...org,
                venues: updatedVenues,
                temperature: responseOrgTemp,
                hasMixedTemperatures: responseOrgMixed !== undefined ? responseOrgMixed : (org.hasMixedTemperatures ?? false)
              };
            }
            return { ...org, venues: updatedVenues };
          })
        }));
      } else if (type === 'ac') {
        // Update AC temperature
        setData(prev => ({
          ...prev,
          acs: prev.acs.map(ac => {
            if (ac.id === id) {
              return { ...ac, temperature: preservedTemp };
            }
            return ac;
          })
        }));
        
        // Recalculate mixed temperatures for venue and organization after AC temperature change
        const updatedAC = data.acs.find(a => a.id === id);
        if (updatedAC?.venueId) {
          // Find the venue
          const venue = data.organizations
            .flatMap(org => org.venues || [])
            .find(v => v.id === updatedAC.venueId);
          
          if (venue) {
            // Get all ACs in this venue (with updated temperature)
            const venueACs = data.acs.map(a => 
              a.id === id ? { ...a, temperature: preservedTemp } : a
            ).filter(a => a.venueId === updatedAC.venueId);
            
            const venueTemp = venue.temperature || 16;
            const venueHasMixed = venueACs.length > 1 && venueACs.some(a => {
              const aTemp = a.temperature || 16;
              return aTemp !== venueTemp;
            });
            
            // Update venue hasMixedTemperatures
            setData(prev => ({
              ...prev,
              organizations: prev.organizations.map(org => ({
                ...org,
                venues: (org.venues || []).map(v => 
                  v.id === updatedAC.venueId 
                    ? { ...v, hasMixedTemperatures: venueHasMixed }
                    : v
                )
              }))
            }));
            
            // Update organization hasMixedTemperatures
            if (venue.organizationId) {
              const org = data.organizations.find(o => o.id === venue.organizationId);
              if (org) {
                const orgVenueIds = (org.venues || []).map(v => v.id);
                const orgACs = data.acs.map(a => 
                  a.id === id ? { ...a, temperature: preservedTemp } : a
                ).filter(a => 
                  a.venueId === org.id || 
                  orgVenueIds.includes(a.venueId) ||
                  a.organizationId === org.id
                );
                
                const orgTemp = org.temperature || 16;
                const orgHasMixed = orgACs.length > 1 && orgACs.some(a => {
                  const aTemp = a.temperature || 16;
                  return aTemp !== orgTemp;
                });
                
                setData(prev => ({
                  ...prev,
                  organizations: prev.organizations.map(o => 
                    o.id === venue.organizationId
                      ? { ...o, hasMixedTemperatures: orgHasMixed }
                      : o
                  )
                }));
              }
            }
          }
        }
      }
      
      // Clear local temperature after successful update
      setLocalTemperatures(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
    } catch (error) {
      const errorMessage = getRestrictionMessage(error);
      toast.error(errorMessage);
      console.error('Temperature update error:', error);
      // Clear local temperature on error
      setLocalTemperatures(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
    } finally {
      setTemperatureLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleSetOrganizationTemperature = async (orgId, temperature) => {
    await handleSetTemperature('organization', orgId, temperature);
  };

  const handleSetACTemperature = async (acId, temperature) => {
    await handleSetTemperature('ac', acId, temperature);
  };

  const handleTemperatureSubmit = async (type, id, temperature) => {
    if (temperature >= 16 && temperature <= 30) {
      await handleSetTemperature(type, id, temperature);
    }
  };

  const handleToggleACPower = async (acId, targetState) => {
    try {
      // Check manager status only (no device lock check for managers)
      
      // If targetState is not provided, toggle to opposite of current state
      const newState = targetState !== undefined ? targetState : !ac?.isOn;
      
      setAcPowerLoading(prev => ({ ...prev, [acId]: true }));
      const response = await managerAPI.toggleManagerACPower(acId, newState);
      const updatedAC = response?.data?.ac || response?.data?.data?.ac;
      const finalState = updatedAC?.isOn !== undefined ? updatedAC.isOn : newState;
      
      toast.success(`AC ${finalState ? 'turned on' : 'turned off'} successfully`);
      
      // Log the action
      try {
        await managerAPI.logManagerAction('power_toggle', {
          type: 'ac_device',
        acId: acId,
          acName: ac?.name || 'Unknown',
          powerState: finalState,
        timestamp: new Date().toISOString()
      });
      } catch (logError) {
        console.warn('Failed to log action:', logError);
      }
      
      // Update state immediately with response data
      if (updatedAC) {
        setData(prev => ({
          ...prev,
          acs: prev.acs.map(a => a.id === acId ? { ...a, ...updatedAC } : a)
        }));
      }
      
      // Refresh data to get latest state
      await loadData(false);
      
      // Update state again after loadData to ensure consistency
      if (updatedAC) {
        setData(prev => ({
          ...prev,
          acs: prev.acs.map(a => a.id === acId ? { ...a, ...updatedAC, isOn: finalState } : a)
        }));
      }
    } catch (error) {
      const errorMessage = getRestrictionMessage(error);
      toast.error(errorMessage);
      console.error('Toggle AC power error:', error);
    } finally {
      setAcPowerLoading(prev => ({ ...prev, [acId]: false }));
    }
  };

  // Note: Lock/unlock AC functions removed - managers only have remote lock

  const handleRemoteLockOrganization = async (organizationId, reason = null) => {
    try {
      const result = await managerAPI.remoteLockOrganization(organizationId, reason);
      toast.success(result.data?.message || 'Organization devices remote locked successfully');
      loadData(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remote lock organization devices');
    }
  };

  const handleRemoteUnlockOrganization = async (organizationId) => {
    try {
      const result = await managerAPI.remoteUnlockOrganization(organizationId);
      toast.success(result.data?.message || 'Organization devices remote unlocked successfully');
      loadData(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remote unlock organization devices');
    }
  };

  const handleRemoteLockVenue = async (venueId, reason = null) => {
    try {
      const result = await managerAPI.remoteLockVenue(venueId, reason);
      toast.success(result.data?.message || 'Venue devices remote locked successfully');
      await loadData(false);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to remote lock venue devices';
      toast.error(errorMessage);
      console.error('Remote lock venue error:', error);
    }
  };

  const handleRemoteUnlockVenue = async (venueId) => {
    try {
      const result = await managerAPI.remoteUnlockVenue(venueId);
      toast.success(result.data?.message || 'Venue devices remote unlocked successfully');
      await loadData(false);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to remote unlock venue devices';
      toast.error(errorMessage);
      console.error('Remote unlock venue error:', error);
    }
  };

  const handleRemoteLockAC = async (acId, reason = null) => {
    try {
      // Get AC's venueId first
      const ac = data.acs.find(a => a.id === acId);
      if (ac && ac.venueId) {
        const result = await managerAPI.remoteLockVenue(ac.venueId, reason);
        toast.success(result.data?.message || 'Device remote locked successfully');
        await loadData(false);
      } else {
        toast.error('Device venue not found');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to remote lock device';
      toast.error(errorMessage);
      console.error('Remote lock AC error:', error);
    }
  };

  const handleRemoteUnlockAC = async (acId) => {
    try {
      // Get AC's venueId first
      const ac = data.acs.find(a => a.id === acId);
      if (ac && ac.venueId) {
        const result = await managerAPI.remoteUnlockVenue(ac.venueId);
        toast.success(result.data?.message || 'Device remote unlocked successfully');
        await loadData(false);
      } else {
        toast.error('Device venue not found');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to remote unlock device';
      toast.error(errorMessage);
      console.error('Remote unlock AC error:', error);
    }
  };




  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'organizations', label: 'Organizations', icon: Building, count: data.organizations.length },
    { id: 'venues', label: 'Venues', icon: MapPin, count: data.organizations.reduce((sum, org) => sum + (org.venues?.length || 0), 0) },
    { id: 'acs', label: 'AC Devices', icon: Thermometer, count: data.acs.length },
    { id: 'events', label: 'Events', icon: Calendar, count: Array.isArray(data.events) ? data.events.length : 0 },
    { id: 'energy', label: 'Energy Consumption', icon: Zap },
    { id: 'alerts', label: 'Alerts', icon: AlertCircle, count: alerts.length, badge: alerts.length > 0 ? 'red' : null }
  ];

  const loadACEnergy = async (acId) => {
    try {
      setEnergyLoading(prev => ({ ...prev, [`ac-${acId}`]: true }));
      const res = await managerAPI.getACEnergy(acId);
      const energy = res.data.data || res.data;
      setEnergyData(prev => ({
        ...prev,
        acs: {
          ...prev.acs,
          [acId]: energy
        }
      }));
    } catch (error) {
      console.error('Failed to load AC energy:', error);
    } finally {
      setEnergyLoading(prev => ({ ...prev, [`ac-${acId}`]: false }));
    }
  };

  const loadOrganizationEnergy = async (organizationId) => {
    try {
      setEnergyLoading(prev => ({ ...prev, [`org-${organizationId}`]: true }));
      const res = await managerAPI.getOrganizationEnergy(organizationId);
      const energy = res.data.data || res.data;
      setEnergyData(prev => ({
        ...prev,
        organizations: {
          ...prev.organizations,
          [organizationId]: energy
        }
      }));
    } catch (error) {
      console.error('Failed to load organization energy:', error);
    } finally {
      setEnergyLoading(prev => ({ ...prev, [`org-${organizationId}`]: false }));
    }
  };

  const OrganizationCard = ({ org }) => {
    // Find device events for devices in this organization
    // Note: Only device events are supported now, so we find events for devices in this org
    const orgDeviceIds = Array.isArray(data.acs) ? data.acs.filter(ac => ac.organizationId === org.id).map(ac => ac.id) : [];
    const orgEvents = Array.isArray(data.events) ? data.events.filter(e => 
      e.eventType === 'device' && orgDeviceIds.includes(e.deviceId)
    ) : [];
    const activeEvent = orgEvents.find(e => e.status === 'active');
    const disabledEvent = orgEvents.find(e => e.isDisabled === true);
    const scheduledEvent = orgEvents.find(e => e.status === 'scheduled');
    
    // Check if organization has alerts
    const orgAlert = alerts.find(a => a.organizationId === org.id && a.alertType === 'organization');
    const orgDeviceAlerts = alerts.filter(a => a.organizationId === org.id && a.acId);
    
    const hasAlert = orgAlert || orgDeviceAlerts.length > 0;
    
    return (
      <div className={`bg-white rounded-2xl shadow-xl border-2 ${hasAlert ? 'border-blue-400' : 'border-gray-200'} hover:shadow-2xl hover:border-blue-400 hover:-translate-y-1 transition-all duration-300 overflow-hidden aspect-square flex flex-col`}>
        {/* Alert Banner */}
        {hasAlert && (
          <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 px-4 py-2 shadow-lg">
            <div className="flex items-center justify-center space-x-2">
              <AlertCircle className="w-4 h-4 text-white flex-shrink-0 animate-pulse" />
              <p className="text-xs font-bold text-white truncate">
                {orgDeviceAlerts.length} Alert{orgDeviceAlerts.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        {/* Product Card Style Layout */}
        <div className="p-3 flex-1 flex flex-col">
          {/* Organization Name - Enhanced */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-extrabold ${hasAlert ? 'text-blue-900' : 'text-gray-900'} truncate`}>
                  {org.name}
                </h3>
              </div>
              <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-500 rounded-lg p-1.5 flex-shrink-0 shadow-md">
                <Building className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
          {/* Status Badges - Compact */}
          <div className="flex items-center flex-wrap gap-1 mb-1.5">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
              org.status === 'active' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-500 text-white'
            }`}>
              {org.status || 'active'}
              </span>
            {org.hasMixedTemperatures && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-400 text-white">
                Mixed
              </span>
            )}
            {activeEvent && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-500 text-white">
                <PlayCircle className="w-3 h-3 mr-0.5" />
              </span>
            )}
            {disabledEvent && !activeEvent && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-400 text-white">
                <Pause className="w-3 h-3 mr-0.5" />
              </span>
            )}
            {scheduledEvent && !activeEvent && !disabledEvent && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-gray-500 text-white">
                <Calendar className="w-3 h-3 mr-0.5" />
              </span>
            )}
            {orgEvents.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-500 text-white">
                <Calendar className="w-3 h-3 mr-0.5" />
                {orgEvents.length}
            </span>
            )}
      </div>
      
          {/* Temperature Control - Compact */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-1.5 mb-1.5 border border-blue-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-gray-700 flex items-center">
                <Thermometer className="w-3 h-3 mr-0.5 text-blue-600" />
                Temp
              </span>
            {temperatureLoading[`organization-${org.id}`] && (
              <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
            )}
          </div>
              {org.hasMixedTemperatures ? (
              <button
                onClick={() => {
                  const currentTemp = org.temperature || 22;
                  handleSetTemperature('organization', org.id, currentTemp);
                }}
                disabled={user?.status === 'restricted' || user?.status === 'locked' || temperatureLoading[`organization-${org.id}`]}
                className="w-full px-2 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Set All
              </button>
              ) : (
              <div className="flex items-center justify-center space-x-1.5">
                <button
                  onClick={() => {
                    const currentTemp = localTemperatures[`organization-${org.id}`] !== undefined 
                      ? localTemperatures[`organization-${org.id}`] 
                      : (org.temperature ?? 16);
                    const newTemp = Math.max(16, currentTemp - 1);
                    handleTemperatureChange('organization', org.id, newTemp);
                    handleSetTemperature('organization', org.id, newTemp);
                  }}
                  disabled={user?.status === 'restricted' || user?.status === 'locked' || temperatureLoading[`organization-${org.id}`] || (localTemperatures[`organization-${org.id}`] !== undefined ? localTemperatures[`organization-${org.id}`] : (org.temperature ?? 16)) <= 16}
                  className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  min="16"
                  max="30"
                  step="1"
                  value={localTemperatures[`organization-${org.id}`] !== undefined ? localTemperatures[`organization-${org.id}`] : (org.temperature ?? 16)}
                  disabled={temperatureLoading[`organization-${org.id}`] || user?.status === 'restricted' || user?.status === 'locked'}
                  className={`w-16 px-1 py-1 text-sm text-center font-bold border rounded bg-white transition-colors ${
                    temperatureLoading[`organization-${org.id}`] || user?.status === 'restricted' || user?.status === 'locked'
                      ? 'opacity-50 cursor-not-allowed border-gray-200' 
                      : 'border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
                  }`}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      handleTemperatureChange('organization', org.id, '');
                    } else {
                      const temp = parseInt(value);
                      if (!isNaN(temp)) {
                        handleTemperatureChange('organization', org.id, temp);
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      handleTemperatureChange('organization', org.id, org.temperature ?? 16);
                    } else {
                      const temp = parseInt(value);
                      if (!isNaN(temp) && temp >= 16 && temp <= 30) {
                        handleTemperatureSubmit('organization', org.id, temp);
                      } else {
                        handleTemperatureChange('organization', org.id, org.temperature ?? 16);
                      }
                    }
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const value = e.target.value;
                      if (value === '') {
                        handleTemperatureChange('organization', org.id, org.temperature ?? 16);
                      } else {
                        const temp = parseInt(value);
                        if (!isNaN(temp) && temp >= 16 && temp <= 30) {
                          handleTemperatureSubmit('organization', org.id, temp);
                        }
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const currentTemp = localTemperatures[`organization-${org.id}`] !== undefined 
                      ? localTemperatures[`organization-${org.id}`] 
                      : (org.temperature ?? 16);
                    const newTemp = Math.min(30, currentTemp + 1);
                    handleTemperatureChange('organization', org.id, newTemp);
                    handleSetTemperature('organization', org.id, newTemp);
                  }}
                  disabled={user?.status === 'restricted' || user?.status === 'locked' || temperatureLoading[`organization-${org.id}`] || (localTemperatures[`organization-${org.id}`] !== undefined ? localTemperatures[`organization-${org.id}`] : (org.temperature ?? 16)) >= 30}
                  className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              )}
            </div>

          {/* Organization Info - Compact */}
          <div className="bg-gray-50 rounded-lg p-1.5 mb-1.5 border border-gray-200">
            <div className="grid grid-cols-1 gap-1">
          {org.venues && org.venues.length > 0 && (
                <div className="flex items-center justify-between bg-white rounded px-1.5 py-1">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-blue-600" />
                    <span className="text-xs font-semibold text-gray-700">Venues</span>
              </div>
              <span className="text-xs font-bold text-gray-900">{org.venues.length}</span>
            </div>
          )}
            </div>
        </div>

          {/* Organization Power Control - Compact */}
        {user?.status === 'unlocked' && (
            <div className="bg-blue-50 rounded-lg p-1.5 border border-blue-200 mb-1.5">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 flex items-center">
                  <Power className="w-3 h-3 mr-0.5 text-blue-600" />
                  Power
              </span>
                <div className="flex items-center space-x-1.5">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                    (org.isOrganizationOn === true || org.isOrganizationOn === 'true') ? 'bg-blue-500 text-white' : 'bg-gray-400 text-white'
                }`}>
                  {(org.isOrganizationOn === true || org.isOrganizationOn === 'true') ? 'ON' : 'OFF'}
                </span>
                <button
                  onClick={() => handleToggleOrganizationPower(org.id, org.isOrganizationOn || false)}
                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                    (org.isOrganizationOn === true || org.isOrganizationOn === 'true')
                        ? 'bg-blue-500' 
                        : 'bg-gray-400'
                  }`}
                  title={(org.isOrganizationOn === true || org.isOrganizationOn === 'true') ? 'Turn Organization OFF' : 'Turn Organization ON'}
                >
                  <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        (org.isOrganizationOn === true || org.isOrganizationOn === 'true') ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

          {/* Action Buttons - Compact */}
          <div className="flex gap-1.5 mt-auto">
          <button
            onClick={() => handleViewOrganizationDetails(org.id)}
              className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-md text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors shadow-sm"
              title="View description, events, remote lock, and more"
          >
            <Eye className="w-3 h-3" />
              <span>View</span>
          </button>
            </div>
      </div>
    </div>
    );
  };

  const VenueCard = ({ venue }) => {
    const venueACs = Array.isArray(data.acs) ? data.acs.filter(ac => ac.venueId === venue.id) : [];
    const venueDeviceIds = venueACs.map(ac => ac.id);
    const isVenueOn = venue.isVenueOn === true || venue.isVenueOn === 'true' || venue.isVenueOn === 1;
    
    // Get device-level alerts for this venue
    const venueDeviceAlertsFromAPI = Array.isArray(allAlerts) ? allAlerts.filter(alert => {
      return alert.acId && venueDeviceIds.includes(alert.acId);
    }) : [];
    
    // Also check ACs directly for alert status
    const venueACsWithAlerts = venueACs.filter(ac => 
      (ac.isWorking === false && ac.isWorking !== null) || ac.alertAt
    );
    
    // Combine API alerts and direct AC alerts
    const venueDeviceAlerts = [...venueDeviceAlertsFromAPI];
    venueACsWithAlerts.forEach(ac => {
      const exists = venueDeviceAlerts.find(a => a.acId === ac.id);
      if (!exists) {
        venueDeviceAlerts.push({
          acId: ac.id,
          acName: ac.name,
          brand: ac.brand,
          model: ac.model,
          serialNumber: ac.serialNumber,
          issue: ac.isWorking === false ? "Device is not working properly" : "Device has an active alert",
          isWorking: ac.isWorking,
          alertAt: ac.alertAt,
          severity: "high",
        });
      }
    });
    
    // Get device-level events for this venue
    const venueEvents = Array.isArray(data.events) ? data.events.filter(e => 
      e.eventType === 'device' && venueDeviceIds.includes(e.deviceId)
    ) : [];
    
    const hasAlert = venueDeviceAlerts.length > 0;
    
    return (
      <div className={`bg-white rounded-2xl shadow-xl border-2 ${hasAlert ? 'border-blue-400' : 'border-gray-200'} hover:shadow-2xl hover:border-blue-400 hover:-translate-y-1 transition-all duration-300 overflow-hidden aspect-square flex flex-col`}>
        {/* Alert Banner */}
        {hasAlert && (
          <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 px-4 py-2 shadow-lg">
            <div className="flex items-center justify-center space-x-2">
              <AlertCircle className="w-4 h-4 text-white flex-shrink-0 animate-pulse" />
              <p className="text-xs font-bold text-white truncate">
                {venueDeviceAlerts.length} Alert{venueDeviceAlerts.length !== 1 ? 's' : ''}
              </p>
            </div>
              </div>
            )}

        {/* Product Card Style Layout */}
        <div className="p-3 flex-1 flex flex-col">
          {/* Venue Name - Enhanced */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-extrabold ${hasAlert ? 'text-blue-900' : 'text-gray-900'} truncate`}>
                  {venue.name}
                </h3>
              </div>
              <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-500 rounded-lg p-1.5 flex-shrink-0 shadow-md">
                <MapPin className="w-4 h-4 text-white" />
        </div>
            </div>
          </div>

          {/* Status Badges - Compact */}
          <div className="flex items-center flex-wrap gap-1 mb-1.5">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
              venue.status === 'active' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-500 text-white'
            }`}>
              {venue.status || 'active'}
            </span>
            {hasAlert && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-600 text-white">
                <AlertCircle className="w-3 h-3 mr-0.5" />
              </span>
            )}
            {venueEvents.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-500 text-white">
                <Calendar className="w-3 h-3 mr-0.5" />
                {venueEvents.length}
              </span>
            )}
            {venue.hasMixedTemperatures && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-400 text-white">
                Mixed
              </span>
            )}
          </div>

          {/* Venue Info - Compact */}
          <div className="bg-gray-50 rounded-lg p-1.5 mb-1.5 border border-gray-200">
            <div className="grid grid-cols-1 gap-1">
            {venueACs.length > 0 && (
                <div className="flex items-center justify-between bg-white rounded px-1.5 py-1">
                  <div className="flex items-center space-x-1">
                    <Thermometer className="w-3 h-3 text-blue-600" />
                    <span className="text-xs font-semibold text-gray-700">ACs</span>
                  </div>
                  <span className="text-xs font-bold text-gray-900">{venueACs.length}</span>
            </div>
          )}
            </div>
              </div>

          {/* Temperature Control - Compact */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-1.5 mb-1.5 border border-blue-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-gray-700 flex items-center">
                <Thermometer className="w-3 h-3 mr-0.5 text-blue-600" />
                Temp
              </span>
              {temperatureLoading[`venue-${venue.id}`] && (
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
              )}
            </div>
            {venue.hasMixedTemperatures ? (
            <button
                  onClick={() => {
                    const currentTemp = venue.temperature || 22;
                    handleSetTemperature('venue', venue.id, currentTemp);
                  }}
                  disabled={temperatureLoading[`venue-${venue.id}`] || user?.status === 'restricted' || user?.status === 'locked'}
                className="w-full px-2 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Set All
                </button>
            ) : (
              <div className="flex items-center justify-center space-x-1.5">
                  <button
                    onClick={() => {
                      const currentTemp = localTemperatures[`venue-${venue.id}`] !== undefined 
                        ? localTemperatures[`venue-${venue.id}`] 
                        : (venue.temperature ?? 16);
                      const newTemp = Math.max(16, currentTemp - 1);
                      handleTemperatureChange('venue', venue.id, newTemp);
                      handleSetTemperature('venue', venue.id, newTemp);
                    }}
                    disabled={temperatureLoading[`venue-${venue.id}`] || user?.status === 'restricted' || user?.status === 'locked' || (localTemperatures[`venue-${venue.id}`] !== undefined ? localTemperatures[`venue-${venue.id}`] : (venue.temperature ?? 16)) <= 16}
                  className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold"
                  >
                  <Minus className="w-3 h-3" />
                  </button>
                <input
                  type="number"
                  min="16"
                  max="30"
                  step="1"
                  value={localTemperatures[`venue-${venue.id}`] !== undefined ? localTemperatures[`venue-${venue.id}`] : (venue.temperature ?? 16)}
                  disabled={temperatureLoading[`venue-${venue.id}`] || user?.status === 'restricted' || user?.status === 'locked'}
                  className={`w-16 px-1 py-1 text-sm text-center font-bold border rounded bg-white transition-colors ${
                    temperatureLoading[`venue-${venue.id}`] || user?.status === 'restricted' || user?.status === 'locked'
                      ? 'opacity-50 cursor-not-allowed border-gray-200' 
                      : 'border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
                  }`}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      handleTemperatureChange('venue', venue.id, '');
                    } else {
                      const temp = parseInt(value);
                      if (!isNaN(temp)) {
                        handleTemperatureChange('venue', venue.id, temp);
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      handleTemperatureChange('venue', venue.id, venue.temperature ?? 16);
                    } else {
                      const temp = parseInt(value);
                      if (!isNaN(temp) && temp >= 16 && temp <= 30) {
                        handleTemperatureSubmit('venue', venue.id, temp);
                      } else {
                        handleTemperatureChange('venue', venue.id, venue.temperature ?? 16);
                      }
                    }
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const value = e.target.value;
                      if (value === '') {
                        handleTemperatureChange('venue', venue.id, venue.temperature ?? 16);
                      } else {
                        const temp = parseInt(value);
                        if (!isNaN(temp) && temp >= 16 && temp <= 30) {
                          handleTemperatureSubmit('venue', venue.id, temp);
                        }
                      }
                    }
                  }}
                />
                  <button
                    onClick={() => {
                      const currentTemp = localTemperatures[`venue-${venue.id}`] !== undefined 
                        ? localTemperatures[`venue-${venue.id}`] 
                        : (venue.temperature ?? 16);
                      const newTemp = Math.min(30, currentTemp + 1);
                      handleTemperatureChange('venue', venue.id, newTemp);
                      handleSetTemperature('venue', venue.id, newTemp);
                    }}
                    disabled={temperatureLoading[`venue-${venue.id}`] || user?.status === 'restricted' || user?.status === 'locked' || (localTemperatures[`venue-${venue.id}`] !== undefined ? localTemperatures[`venue-${venue.id}`] : (venue.temperature ?? 16)) >= 30}
                  className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold"
                  >
                  <Plus className="w-3 h-3" />
                  </button>
                </div>
            )}
          </div>

          {/* Venue Power Control - Compact */}
          <div className="bg-blue-50 rounded-lg p-1.5 border border-blue-200 mb-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 flex items-center">
                <Power className="w-3 h-3 mr-0.5 text-blue-600" />
                Power
              </span>
              <div className="flex items-center space-x-1.5">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                  isVenueOn ? 'bg-blue-500 text-white' : 'bg-gray-400 text-white'
                }`}>
                  {isVenueOn ? 'ON' : 'OFF'}
                </span>
                <button
                  onClick={() => handleToggleVenuePower(venue.id, venue.isVenueOn || false)}
                  disabled={user?.status === 'restricted' || user?.status === 'locked'}
                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isVenueOn ? 'bg-blue-500' : 'bg-gray-400'
                  }`}
                  title={isVenueOn ? 'Turn Venue OFF' : 'Turn Venue ON'}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      isVenueOn ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons - Compact */}
          <div className="flex gap-1.5 mt-auto">
          <button
            onClick={() => handleViewVenueDetails(venue.id)}
              className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-md text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors shadow-sm"
              title="View organization, size, and more details"
          >
              <Eye className="w-3 h-3" />
              <span>View</span>
            </button>
          </div>
          </div>
        </div>
    );
  };

  const ACCard = ({ ac }) => {
    // Check both alerts (org-level) and allAlerts (device-level) for device highlighting
    const acAlert = allAlerts.find(a => a.acId === ac.id) || alerts.find(a => a.acId === ac.id);
    // Also check if device has alert status (isWorking: false or alertAt set)
    // Only show alert when isWorking is explicitly false (not null/undefined) or alertAt is set
    const hasAlert = acAlert || ac.isWorking === false || ac.alertAt;
    // Find events for this device
    const deviceEvents = Array.isArray(data.events) ? data.events.filter(e => 
      e.deviceId === ac.id && e.eventType === 'device'
    ) : [];
    const activeEvent = deviceEvents.find(e => e.status === 'active' && !e.isDisabled);
    const disabledEvent = deviceEvents.find(e => e.isDisabled === true);
    const scheduledEvent = deviceEvents.find(e => e.status === 'scheduled' && !e.isDisabled);
    // Check if device has any active or scheduled event (not disabled)
    const hasEvent = activeEvent || scheduledEvent;
    // Get event temperature if event exists
    const eventTemp = hasEvent ? (activeEvent?.temperature || scheduledEvent?.temperature) : null;
    
    return (
      <div className={`bg-white rounded-2xl shadow-xl border-2 ${hasAlert ? 'border-blue-400' : 'border-gray-200'} hover:shadow-2xl hover:border-blue-400 hover:-translate-y-1 transition-all duration-300 overflow-hidden aspect-square flex flex-col`}>
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

        {/* Product Card Style Layout */}
        <div className="p-3 flex-1 flex flex-col">
          {/* Device Name - Enhanced */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-extrabold ${hasAlert ? 'text-blue-900' : 'text-gray-900'} truncate`}>
                  {ac.name}
                </h3>
                  </div>
              <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-500 rounded-lg p-1.5 flex-shrink-0 shadow-md">
                <Thermometer className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
          
          {/* Status Badges - Compact */}
          <div className="flex items-center flex-wrap gap-1 mb-1.5">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
              ac.isOn ? 'bg-blue-500 text-white' : 'bg-gray-400 text-white'
            }`}>
              <Power className="w-3 h-3 mr-0.5" />
                {ac.isOn ? 'ON' : 'OFF'}
              </span>
            {hasAlert && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-600 text-white">
                <AlertCircle className="w-3 h-3 mr-0.5" />
              </span>
            )}
            </div>

          {/* Device Info - Compact */}
          <div className="bg-gray-50 rounded-lg p-1.5 mb-1.5 border border-gray-200">
            {ac.venue && (
              <div className="flex items-center justify-between bg-white rounded px-1.5 py-1">
                <div className="flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-blue-600" />
                  <span className="text-xs font-semibold text-gray-700">Venue</span>
                  </div>
                <span className="text-xs font-bold text-gray-900 truncate ml-1 max-w-[80px]">{ac.venue.name}</span>
              </div>
            )}
          </div>

          {/* Temperature Control - Compact */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-1.5 mb-1.5 border border-blue-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-gray-700 flex items-center">
                <Thermometer className="w-3 h-3 mr-0.5 text-blue-600" />
                Temp
              </span>
              {temperatureLoading[`ac-${ac.id}`] && (
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
              )}
            </div>
            <div className="flex items-center justify-center space-x-1.5">
            <button
                onClick={() => {
                  const currentTemp = localTemperatures[`ac-${ac.id}`] !== undefined 
                    ? localTemperatures[`ac-${ac.id}`] 
                    : (ac.temperature ?? 16);
                  const newTemp = Math.max(16, currentTemp - 1);
                  handleTemperatureChange('ac', ac.id, newTemp);
                  handleSetTemperature('ac', ac.id, newTemp);
                }}
                disabled={hasEvent || temperatureLoading[`ac-${ac.id}`] || user?.status === 'restricted' || user?.status === 'locked' || (localTemperatures[`ac-${ac.id}`] !== undefined ? localTemperatures[`ac-${ac.id}`] : (ac.temperature ?? 16)) <= 16}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold"
              >
                <Minus className="w-3 h-3" />
            </button>
              <input
                type="number"
                min="16"
                max="30"
                step="1"
                value={hasEvent && eventTemp ? eventTemp : (localTemperatures[`ac-${ac.id}`] !== undefined ? localTemperatures[`ac-${ac.id}`] : (ac.temperature ?? 16))}
                disabled={hasEvent || temperatureLoading[`ac-${ac.id}`] || user?.status === 'restricted' || user?.status === 'locked'}
                className={`w-16 px-1 py-1 text-sm text-center font-bold border rounded bg-white transition-colors ${
                  hasEvent || temperatureLoading[`ac-${ac.id}`] || user?.status === 'restricted' || user?.status === 'locked'
                    ? 'opacity-50 cursor-not-allowed border-gray-200' 
                    : 'border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
                }`}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    handleTemperatureChange('ac', ac.id, '');
                  } else {
                    const temp = parseInt(value);
                    if (!isNaN(temp)) {
                      handleTemperatureChange('ac', ac.id, temp);
                    }
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    handleTemperatureChange('ac', ac.id, ac.temperature ?? 16);
                  } else {
                    const temp = parseInt(value);
                    if (!isNaN(temp) && temp >= 16 && temp <= 30) {
                      handleTemperatureSubmit('ac', ac.id, temp);
                    } else {
                      handleTemperatureChange('ac', ac.id, ac.temperature ?? 16);
                    }
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const value = e.target.value;
                    if (value === '') {
                      handleTemperatureChange('ac', ac.id, ac.temperature ?? 16);
                    } else {
                      const temp = parseInt(value);
                      if (!isNaN(temp) && temp >= 16 && temp <= 30) {
                        handleTemperatureSubmit('ac', ac.id, temp);
                      }
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  const currentTemp = localTemperatures[`ac-${ac.id}`] !== undefined 
                    ? localTemperatures[`ac-${ac.id}`] 
                    : (ac.temperature ?? 16);
                  const newTemp = Math.min(30, currentTemp + 1);
                  handleTemperatureChange('ac', ac.id, newTemp);
                  handleSetTemperature('ac', ac.id, newTemp);
                }}
                disabled={hasEvent || temperatureLoading[`ac-${ac.id}`] || user?.status === 'restricted' || user?.status === 'locked' || (localTemperatures[`ac-${ac.id}`] !== undefined ? localTemperatures[`ac-${ac.id}`] : (ac.temperature ?? 16)) >= 30}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* AC Power Control - Compact */}
          <div className="bg-blue-50 rounded-lg p-1.5 border border-blue-200 mb-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 flex items-center">
                <Power className="w-3 h-3 mr-0.5 text-blue-600" />
                Power
              </span>
              <button
            onClick={() => handleToggleACPower(ac.id, !ac.isOn)}
                disabled={user?.status === 'restricted' || user?.status === 'locked'}
                className={`px-2 py-1 rounded text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              ac.isOn
                    ? 'bg-gray-500 text-white hover:bg-gray-600'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
                {ac.isOn ? 'OFF' : 'ON'}
              </button>
            </div>
          </div>

          {/* Action Buttons - Compact */}
          <div className="flex gap-1 mt-auto">
            <button
              onClick={() => {
                // Create a temporary event object with deviceId pre-selected
                const tempEvent = {
                  deviceId: ac.id
                };
                setSelectedEvent(tempEvent);
                setShowEventModal(true);
              }}
              disabled={user?.status === 'locked' || user?.status === 'restricted'}
              className="flex-1 flex items-center justify-center space-x-0.5 px-1.5 py-1 rounded-md text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              title={
                user?.status === 'locked' || user?.status === 'restricted'
                  ? 'Restricted/Locked managers cannot create events'
                  : 'Create Event for this device'
              }
            >
              <Plus className="w-2.5 h-2.5" />
              <span>Event</span>
            </button>
              <button
            onClick={() => handleViewACDetails(ac.id)}
              className="flex-1 flex items-center justify-center space-x-0.5 px-1.5 py-1 rounded-md text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors shadow-sm"
              title="View brand, model, serial number, organization, and more"
          >
              <Eye className="w-2.5 h-2.5" />
              <span>View</span>
              </button>
          <button
            onClick={() => handleDeleteAC(ac.id, ac.name)}
            disabled={user?.status === 'locked' || user?.status === 'restricted'}
            className="flex items-center justify-center space-x-0.5 px-1.5 py-1 rounded-md text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            title="Delete this AC device (Admin only)"
          >
            <Trash2 className="w-2.5 h-2.5" />
            <span>Delete</span>
          </button>
          </div>
      </div>
    </div>
    );
  };

  // Events View Component
  const ManagerEventsView = () => {
    const formatDateTime = (dateString) => {
      if (!dateString) return 'N/A';
      try {
        let date;
        let originalInput = dateString;
        
        // Handle different date formats from backend
        if (dateString instanceof Date) {
          // Already a Date object - use it directly
          date = dateString;
        } else if (typeof dateString === 'string') {
          // String format - MUST be treated as UTC
          let dateValue = String(dateString).trim();
          
          // CRITICAL FIX: JavaScript Date parses strings WITHOUT timezone as LOCAL time
          // We MUST ensure ALL dates are treated as UTC by adding 'Z' if missing
          
          // Step 1: Normalize format (space to T)
          if (dateValue.includes(' ') && !dateValue.includes('T')) {
            dateValue = dateValue.replace(/\s+/, 'T');
          }
          
          // Step 2: Check if it has timezone indicator
          const hasTimezone = dateValue.endsWith('Z') || 
                             dateValue.match(/[+-]\d{2}:?\d{2}$/) ||
                             dateValue.includes('+05:00') ||
                             dateValue.includes('+0500');
          
          // Step 3: If NO timezone, add 'Z' to force UTC parsing
          if (!hasTimezone) {
            // Remove trailing spaces and append 'Z'
            dateValue = dateValue.replace(/\s+$/, '');
            if (!dateValue.endsWith('Z')) {
              dateValue = dateValue + 'Z';
            }
          }
          
          // Step 4: Parse as UTC
          date = new Date(dateValue);
          
          // Step 5: Verify parsing
          if (isNaN(date.getTime())) {
            console.error('❌ Failed to parse date:', {
              original: originalInput,
              attempted: dateValue
            });
            return 'Invalid Date';
          }
        } else {
          console.error('Unexpected date type:', typeof dateString, dateString);
          return 'Invalid Date';
        }
        
        // Verify date is valid
        if (isNaN(date.getTime())) {
          console.error('Invalid date object');
          return 'Invalid Date';
        }
        
        // Convert to Pakistan/Karachi time using Intl.DateTimeFormat for better control
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Karachi',
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        
        const pakistanTime = formatter.format(date);
        
        // Log for debugging
        const utcHour = date.getUTCHours();
        const utcMin = date.getUTCMinutes();
        const expectedPKTHour = (utcHour + 5) % 24;
        
        console.log('🕐 TIME CONVERSION:', {
          input: originalInput,
          normalized: date.toISOString(),
          utc: `${String(utcHour).padStart(2, '0')}:${String(utcMin).padStart(2, '0')}`,
          expectedPKT: `${String(expectedPKTHour).padStart(2, '0')}:${String(utcMin).padStart(2, '0')}`,
          displayed: pakistanTime,
          match: pakistanTime.includes(String(expectedPKTHour)) || pakistanTime.includes(String(expectedPKTHour % 12 || 12))
        });
        
        return pakistanTime;
      } catch (e) {
        console.error('❌ Date formatting exception:', e, dateString);
        return 'Invalid Date';
      }
    };

    const getStatusBadge = (status, isDisabled, startTime, endTime) => {
      if (isDisabled) {
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-400 text-white">Disabled</span>;
      }
      
      // Check if event is waiting to start (startTime is in future)
      const now = new Date();
      const eventStartTime = startTime ? new Date(startTime) : null;
      const eventEndTime = endTime ? new Date(endTime) : null;
      
      // If event is scheduled and startTime is in future, show "Waiting for Starting Time"
      // If event is active but startTime hasn't arrived yet, also show "Waiting for Starting Time"
      const isWaitingToStart = eventStartTime && eventStartTime > now;
      
      // If event is active but endTime has passed, show "Complete"
      const isCompleted = eventEndTime && eventEndTime <= now && status === 'active';
      
      // Determine actual status based on time
      let actualStatus = status;
      if (isWaitingToStart && (status === 'scheduled' || status === 'active')) {
        actualStatus = 'waiting';
      } else if (isCompleted) {
        actualStatus = 'completed';
      }
      
      const statusConfig = {
        waiting: {
          color: 'bg-blue-500 text-white',
          text: 'Waiting'
        },
        scheduled: {
          color: 'bg-blue-500 text-white',
          text: 'Scheduled'
        },
        active: {
          color: 'bg-blue-600 text-white',
          text: 'In Process'
        },
        completed: {
          color: 'bg-gray-500 text-white',
          text: 'Ended'
        },
        stopped: {
          color: 'bg-gray-500 text-white',
          text: 'Stopped'
        },
        cancelled: {
          color: 'bg-gray-500 text-white',
          text: 'Cancelled'
        }
      };
      
      const config = statusConfig[actualStatus] || { color: 'bg-gray-500 text-white', text: status.charAt(0).toUpperCase() + status.slice(1) };
      
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${config.color}`}>
          {config.text}
        </span>
      );
    };

    if (eventsLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Events</h2>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {Array.isArray(data.events) ? data.events.length : 0} Event{(Array.isArray(data.events) ? data.events.length : 0) !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setSelectedEvent(null);
                setShowEventModal(true);
              }}
              disabled={user?.status === 'locked' || user?.status === 'restricted'}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                user?.status === 'locked' 
                  ? 'Locked managers cannot create events' 
                  : user?.status === 'restricted'
                  ? 'Restricted managers cannot create events. Contact admin for full permissions.'
                  : 'Create Event'
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </button>
            <button
              onClick={loadEvents}
              disabled={eventsLoading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${eventsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {!Array.isArray(data.events) || data.events.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No events found</p>
            <p className="text-sm mt-2 text-gray-400">Create an event to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(data.events) && data.events.map((event) => {
              if (!event || !event.id) return null;
              const isLoading = eventActionLoading[event.id];
              const canStart = event.status === 'scheduled' && !event.isDisabled;
              const canStop = event.status === 'active' && !event.isDisabled;
              const canEdit = !event.isDisabled && event.status !== 'active';
              const canDelete = event.status !== 'active';
              
              const now = new Date();
              const eventStartTime = event.startTime ? new Date(event.startTime) : null;
              const eventEndTime = event.endTime ? new Date(event.endTime) : null;
              const isWaitingToStart = eventStartTime && eventStartTime > now;
              const isCompleted = eventEndTime && eventEndTime <= now && event.status === 'active';
              
              let actualStatus = event.status;
              if (isWaitingToStart && (event.status === 'scheduled' || event.status === 'active')) {
                actualStatus = 'waiting';
              } else if (isCompleted) {
                actualStatus = 'completed';
              }

              return (
                <div key={event.id} className={`bg-white rounded-2xl shadow-xl border-2 ${event.isDisabled ? 'border-blue-400' : 'border-gray-200'} hover:shadow-2xl hover:border-blue-400 hover:-translate-y-1 transition-all duration-300 overflow-hidden aspect-square flex flex-col`}>
                  {/* Product Card Style Layout */}
                  <div className="p-3 flex-1 flex flex-col">
                    {/* Event Name - Enhanced */}
                    <div className="mb-1.5 pb-1.5 border-b border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-extrabold text-gray-900 truncate">
                            {event.name}
                          </h3>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-500 rounded-lg p-1.5 flex-shrink-0 shadow-md">
                          <Calendar className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </div>

                    {/* Status Badges - Compact */}
                    <div className="flex items-center flex-wrap gap-1 mb-1.5">
                      {getStatusBadge(event.status, event.isDisabled, event.startTime, event.endTime)}
                        {event.isRecurring && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-500 text-white">
                          🔁
                          </span>
                        )}
                        {event.parentRecurringEventId && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-500 text-white">
                          Inst
                          </span>
                        )}
                      </div>
                      
                    {/* Event Info - Compact */}
                    <div className="bg-gray-50 rounded-lg p-1.5 mb-1.5 border border-gray-200">
                      <div className="grid grid-cols-1 gap-1">
                        <div className="flex items-center justify-between bg-white rounded px-1.5 py-1">
                          <div className="flex items-center space-x-1">
                            <Thermometer className="w-3 h-3 text-blue-600" />
                            <span className="text-xs font-semibold text-gray-700">Device</span>
                        </div>
                          <span className="text-xs font-bold text-gray-900 truncate ml-1 max-w-[100px]">
                            {event.device?.name || `#${event.deviceId}`}
                          </span>
                        </div>
                        {event.temperature && (
                          <div className="flex items-center justify-between bg-white rounded px-1.5 py-1">
                            <div className="flex items-center space-x-1">
                              <Thermometer className="w-3 h-3 text-blue-600" />
                              <span className="text-xs font-semibold text-gray-700">Temp</span>
                        </div>
                            <span className="text-xs font-bold text-gray-900">{event.temperature}°C</span>
                            </div>
                        )}
                            </div>
                            </div>

                    {/* Time Info - Compact */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-1.5 mb-1.5 border border-blue-200">
                      {event.isRecurring ? (
                        <div className="space-y-0.5">
                          <div className="text-xs font-semibold text-gray-700">Recurring</div>
                          {event.timeStart && event.timeEnd && (
                            <div className="text-xs font-bold text-gray-900">
                              {event.timeStart} - {event.timeEnd}
                            </div>
                        )}
                          </div>
                      ) : (
                        <div className="space-y-1">
                          <div>
                            <div className="text-xs font-semibold text-gray-700">Start</div>
                            <div className="text-xs font-bold text-gray-900 truncate">
                              {formatDateTime(event.startTime).split(' ')[1] || 'N/A'}
                          </div>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-700">End</div>
                            <div className="text-xs font-bold text-gray-900 truncate">
                              {formatDateTime(event.endTime).split(' ')[1] || 'N/A'}
                          </div>
                      </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons - Compact */}
                    <div className="flex gap-1.5 mt-auto">
                      {canStart && (
                        <button
                          onClick={() => handleEventAction(event.id, 'start')}
                          disabled={!!isLoading || user?.status === 'restricted' || user?.status === 'locked'}
                          className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-md text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                          title="Start event"
                        >
                          <Play className="w-3 h-3" />
                          <span>Start</span>
                        </button>
                      )}
                      {canStop && (
                        <button
                          onClick={() => handleEventAction(event.id, 'stop')}
                          disabled={!!isLoading || user?.status === 'restricted' || user?.status === 'locked'}
                          className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-md text-xs font-bold text-white bg-gray-500 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                          title="Stop event"
                        >
                          <Square className="w-3 h-3" />
                          <span>Stop</span>
                        </button>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowEventModal(true);
                          }}
                          disabled={!!isLoading || user?.status === 'restricted' || user?.status === 'locked'}
                          className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-md text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                          title="Edit event"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleEventAction(event.id, 'delete')}
                          disabled={!!isLoading || user?.status === 'restricted' || user?.status === 'locked'}
                          className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-md text-xs font-bold text-white bg-gray-500 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                          title="Delete event"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Del</span>
                        </button>
                      )}
                      {isLoading && (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const DashboardView = () => {
    const totalVenues = data.organizations.reduce((sum, org) => sum + (org.venues?.length || 0), 0);
    const activeACs = data.acs.filter(ac => ac.isOn === true || ac.isOn === 'true' || ac.isOn === 1).length;
    const totalEvents = Array.isArray(data.events) ? data.events.length : 0;
    const activeEvents = Array.isArray(data.events) ? data.events.filter(e => e.status === 'active').length : 0;

    return (
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 w-full px-2 sm:px-0">
        {/* Statistics Cards - Ultra Enhanced */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full">
          <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 text-white transform hover:scale-105 hover:shadow-blue-500/50 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white opacity-10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-white opacity-5 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-blue-100 text-xs sm:text-sm font-semibold mb-1 sm:mb-2 uppercase tracking-wide">Organizations</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-1 drop-shadow-lg">{data.organizations.length}</p>
                <p className="text-blue-100 text-xs font-medium flex items-center">
                  <span className="w-2 h-2 bg-blue-300 rounded-full mr-2 animate-pulse"></span>
                  <span className="hidden sm:inline">Assigned to you</span>
                  <span className="sm:hidden">Assigned</span>
                </p>
              </div>
              <div className="bg-white bg-opacity-25 rounded-xl sm:rounded-2xl p-2 sm:p-3 lg:p-4 transform group-hover:rotate-12 transition-transform duration-300 shadow-xl ml-2 flex-shrink-0">
                <Building className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" />
              </div>
            </div>
          </div>
          
          <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 text-white transform hover:scale-105 hover:shadow-blue-500/50 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white opacity-10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-white opacity-5 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-blue-100 text-xs sm:text-sm font-semibold mb-1 sm:mb-2 uppercase tracking-wide">Total Venues</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-1 drop-shadow-lg">{totalVenues}</p>
                <p className="text-blue-100 text-xs font-medium flex items-center">
                  <span className="w-2 h-2 bg-blue-300 rounded-full mr-2 animate-pulse"></span>
                  <span className="hidden sm:inline">Active venues</span>
                  <span className="sm:hidden">Active</span>
                </p>
              </div>
              <div className="bg-white bg-opacity-25 rounded-xl sm:rounded-2xl p-2 sm:p-3 lg:p-4 transform group-hover:rotate-12 transition-transform duration-300 shadow-xl ml-2 flex-shrink-0">
                <MapPin className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" />
              </div>
            </div>
          </div>
          
          <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 text-white transform hover:scale-105 hover:shadow-blue-500/50 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white opacity-10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-white opacity-5 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-blue-100 text-xs sm:text-sm font-semibold mb-1 sm:mb-2 uppercase tracking-wide">AC Devices</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-1 drop-shadow-lg">{data.acs.length}</p>
                <p className="text-blue-100 text-xs font-medium flex items-center">
                  <span className="w-2 h-2 bg-blue-300 rounded-full mr-2 animate-pulse"></span>
                  <span className="hidden sm:inline">{activeACs} powered ON</span>
                  <span className="sm:hidden">{activeACs} ON</span>
                </p>
              </div>
              <div className="bg-white bg-opacity-25 rounded-xl sm:rounded-2xl p-2 sm:p-3 lg:p-4 transform group-hover:rotate-12 transition-transform duration-300 shadow-xl ml-2 flex-shrink-0">
                <Thermometer className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" />
              </div>
            </div>
          </div>
          
          <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 text-white transform hover:scale-105 hover:shadow-blue-500/50 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white opacity-10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-white opacity-5 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-blue-100 text-xs sm:text-sm font-semibold mb-1 sm:mb-2 uppercase tracking-wide">Events</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-1 drop-shadow-lg">{totalEvents}</p>
                <p className="text-blue-100 text-xs font-medium flex items-center">
                  <span className="w-2 h-2 bg-blue-300 rounded-full mr-2 animate-pulse"></span>
                  <span className="hidden sm:inline">{activeEvents} active</span>
                  <span className="sm:hidden">{activeEvents} active</span>
                </p>
              </div>
              <div className="bg-white bg-opacity-25 rounded-xl sm:rounded-2xl p-2 sm:p-3 lg:p-4 transform group-hover:rotate-12 transition-transform duration-300 shadow-xl ml-2 flex-shrink-0">
                <Calendar className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" />
              </div>
            </div>
          </div>
        </div>

        {/* Alerts Section - Ultra Enhanced */}
        {alerts.length > 0 && (
          <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 border-l-4 border-blue-500 rounded-2xl shadow-2xl p-6 w-full transform hover:shadow-blue-500/20 transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 shadow-lg animate-pulse">
                  <AlertCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-blue-900">
                    Active Alerts
                  </h3>
                  <p className="text-sm text-blue-700 font-semibold mt-1">
                    {alerts.length} alert{alerts.length !== 1 ? 's' : ''} require immediate attention
                  </p>
                </div>
              </div>
              <button
                onClick={handleCheckAlerts}
                disabled={alertsLoading}
                className="flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <RefreshCw className={`w-5 h-5 mr-2 ${alertsLoading ? 'animate-spin' : ''}`} />
                Check Now
              </button>
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar">
              {alerts.slice(0, 3).map((alert, idx) => (
                <div key={idx} className="bg-white rounded-xl p-5 border-2 border-blue-200 shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 hover:border-blue-400">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <span className="font-semibold text-gray-900">{alert.acName || 'Device Alert'}</span>
                        {alert.organizationName && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                            Org: {alert.organizationName}
                          </span>
                        )}
                      </div>
                      {alert.issue && (
                        <div className="flex items-start space-x-2 text-sm text-blue-700">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                          <span className="font-medium">{alert.issue}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {alerts.length > 3 && (
                <p className="text-center text-sm text-blue-600 font-semibold pt-2">
                  +{alerts.length - 3} more alerts
                </p>
              )}
            </div>
          </div>
        )}

        {/* Quick Stats Grid - Enhanced */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
          {/* AC Devices Status */}
          <div className="group bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl p-6 border-2 border-blue-100 hover:border-blue-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-3 shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                  <Thermometer className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">AC Devices</h3>
                  <p className="text-sm text-gray-500 font-medium">Status Overview</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                <span className="text-sm font-semibold text-gray-700">Total Devices</span>
                <span className="text-2xl font-extrabold text-gray-900">{data.acs.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-50 rounded-xl shadow-sm border border-blue-200">
                <span className="text-sm font-semibold text-gray-700">Powered ON</span>
                <span className="text-2xl font-extrabold text-blue-600">{activeACs}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl shadow-sm">
                <span className="text-sm font-semibold text-gray-700">Powered OFF</span>
                <span className="text-2xl font-extrabold text-gray-600">{data.acs.length - activeACs}</span>
              </div>
            </div>
          </div>

          {/* Recent Events */}
          <div className="group bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl p-6 border-2 border-blue-100 hover:border-blue-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-3 shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Recent Events</h3>
                  <p className="text-sm text-gray-500 font-medium">Latest Activities</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {Array.isArray(data.events) && data.events.length > 0 ? (
                <>
                  {data.events.slice(0, 3).map((event, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-blue-200">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{event.name || 'Event'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {event.device?.name || 'N/A'}
                        </p>
                      </div>
                      <span className={`text-xs px-3 py-1.5 rounded-full font-semibold shadow-sm ${
                        event.status === 'active' ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white' : 
                        event.status === 'scheduled' ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white' : 
                        'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                      }`}>
                        {event.status || 'inactive'}
                      </span>
                    </div>
                  ))}
                  {data.events.length > 3 && (
                    <p className="text-xs text-gray-500 text-center pt-2 font-semibold">
                      +{data.events.length - 3} more events
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 font-medium">No events found</p>
                </div>
              )}
            </div>
          </div>

          {/* System Overview */}
          <div className="group bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl p-6 border-2 border-blue-100 hover:border-blue-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-3 shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">System Overview</h3>
                  <p className="text-sm text-gray-500 font-medium">Quick Stats</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-50 rounded-xl shadow-sm border border-blue-200">
                <span className="text-sm font-semibold text-gray-700">Total Venues</span>
                <span className="text-2xl font-extrabold text-blue-600">{totalVenues}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                <span className="text-sm font-semibold text-gray-700">Active Events</span>
                <span className="text-2xl font-extrabold text-gray-900">{activeEvents}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl shadow-sm">
                <span className="text-sm font-semibold text-gray-700">Total Alerts</span>
                <span className="text-2xl font-extrabold text-gray-600">{alerts.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    // Note: Restricted managers can still view data, they just can't perform actions
    // Actions will be blocked by backend and show restriction messages

    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'events':
        return <ManagerEventsView />;
      case 'events':
        return <ManagerEventsView />;
      case 'venues':
        // Get all venues from all organizations
        const allVenues = data.organizations.flatMap(org => 
          (org.venues || []).map(venue => ({
            ...venue,
            organization: {
              id: org.id,
              name: org.name
            }
          }))
        );
        
        return (
          <div className="space-y-8">
            {/* Header Section - Ultra Enhanced */}
            <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl shadow-2xl p-8 border-2 border-blue-400 overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>
              <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="flex items-center space-x-5">
                  <div className="bg-white bg-opacity-25 rounded-2xl p-4 shadow-xl transform group-hover:rotate-12 transition-transform duration-300">
                    <MapPin className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-extrabold text-white mb-2 drop-shadow-lg">Venues</h2>
                    <p className="text-blue-100 text-base font-medium mb-3">Manage all venues and locations</p>
                    <span className="inline-block bg-white bg-opacity-25 text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg backdrop-blur-sm">
                      {allVenues.length} Total Venue{allVenues.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {allVenues.length === 0 ? (
              <div className="bg-gradient-to-br from-white to-blue-50 p-16 rounded-2xl shadow-2xl text-center border-2 border-blue-200">
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center shadow-lg">
                  <MapPin className="w-12 h-12 text-blue-600" />
                </div>
                <p className="text-gray-800 text-2xl font-bold mb-3">No Venues Found</p>
                <p className="text-gray-600 text-base mb-6">No venues are currently assigned to your organizations</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allVenues.map(venue => (
                  <VenueCard key={venue.id} venue={venue} />
                ))}
              </div>
            )}
          </div>
        );
      case 'organizations':
        return (
          <div className="space-y-8">
            {/* Header Section - Enhanced */}
            <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl shadow-2xl p-8 border-2 border-blue-400 overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>
              <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="flex items-center space-x-5">
                  <div className="bg-white bg-opacity-25 rounded-2xl p-4 shadow-xl transform group-hover:rotate-12 transition-transform duration-300">
                    <Building className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-extrabold text-white mb-2 drop-shadow-lg">Organizations</h2>
                    <p className="text-blue-100 text-base font-medium mb-3">Manage all assigned organizations</p>
                    <span className="inline-block bg-white bg-opacity-25 text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg backdrop-blur-sm">
                      {data.organizations.length} Total Organization{data.organizations.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Alerts Section */}
            {alerts.length > 0 && (
              <div className="bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 border-l-4 border-blue-500 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <AlertCircle className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Active Alerts ({alerts.length})
                      </h3>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {alerts.length} Device Alert{alerts.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCheckAlerts}
                    disabled={alertsLoading}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${alertsLoading ? 'animate-spin' : ''}`} />
                    Refresh Alerts
                  </button>
                </div>

                <div className="space-y-4">
                  {alerts.map((alert, idx) => {
                    const relatedDevice = data.acs.find(ac => ac.id === alert.acId);
                    const relatedOrg = data.organizations.find(o => o.id === alert.organizationId);
                    return (
                      <div key={idx} className="bg-white rounded-xl shadow-md border-l-4 border-blue-500 p-5 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                              <div className="flex items-start space-x-2">
                                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm font-bold text-blue-900 mb-1">
                                    ⚠️ Device-Specific Alert
                                  </p>
                                  <p className="text-xs text-blue-700">
                                    This alert is only for <strong>{alert.acName}</strong>. The organization <strong>{alert.organizationName}</strong> is still operating normally.
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 mb-3">
                              <span className="text-lg font-bold text-gray-900">{alert.acName}</span>
                              <span className="text-sm text-gray-500">({alert.brand} {alert.model})</span>
                              <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                                {alert.organizationName}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                              <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">Serial Number</p>
                                <p className="text-sm font-semibold text-gray-900">{alert.serialNumber || 'N/A'}</p>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">AC Temperature</p>
                                <p className="text-sm font-semibold text-gray-900">{alert.temperature}°C</p>
                              </div>
                              {alert.roomTemperature && (
                                <div className="bg-blue-50 rounded-lg p-3">
                                  <p className="text-xs text-gray-500 mb-1">Room Temperature</p>
                                  <p className="text-sm font-bold text-blue-600">{alert.roomTemperature.toFixed(1)}°C</p>
                                </div>
                              )}
                              <div className={`rounded-lg p-3 ${alert.isOn ? 'bg-blue-50' : 'bg-gray-50'}`}>
                                <p className="text-xs text-gray-500 mb-1">Power Status</p>
                                <p className={`text-sm font-semibold ${alert.isOn ? 'text-blue-600' : 'text-gray-500'}`}>
                                  {alert.isOn ? 'ON' : 'OFF'}
                                </p>
                              </div>
                            </div>

                            {/* Room Temperature Alert */}
                            {alert.issue && alert.issue.includes("Room temperature") && alert.roomTempHistory ? (
                              <div className="bg-blue-50 rounded-lg p-4 mb-3 border border-blue-200">
                                <div className="flex items-start space-x-2 mb-3">
                                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1">
                                    <p className="text-sm font-bold text-blue-900 mb-2">{alert.issue}</p>
                                    <div className="grid grid-cols-4 gap-2">
                                      <div className="bg-white rounded p-2 text-center">
                                        <p className="text-xs text-gray-500">Hour 0</p>
                                        <p className="text-sm font-bold text-gray-900">{alert.roomTempHistory.hour0?.toFixed(1)}°C</p>
                                      </div>
                                      <div className="bg-white rounded p-2 text-center">
                                        <p className="text-xs text-gray-500">Hour 1</p>
                                        <p className="text-sm font-bold text-gray-900">{alert.roomTempHistory.hour1?.toFixed(1)}°C</p>
                                      </div>
                                      <div className="bg-blue-100 rounded p-2 text-center border border-blue-300">
                                        <p className="text-xs text-gray-500">Hour 2</p>
                                        <p className="text-sm font-bold text-blue-600">{alert.roomTempHistory.hour2?.toFixed(1)}°C</p>
                                      </div>
                                      <div className="bg-blue-100 rounded p-2 text-center border border-blue-300">
                                        <p className="text-xs text-gray-500">Mean</p>
                                        <p className="text-sm font-bold text-blue-600">
                                          {alert.roomTempHistory.mean?.toFixed(1) || 
                                            ((alert.roomTempHistory.hour0 + alert.roomTempHistory.hour1 + alert.roomTempHistory.hour2) / 3).toFixed(1)}°C
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : alert.issues && alert.issues.length > 0 && (
                              <div className="space-y-2 mb-3">
                                {alert.issues.map((issue, issueIdx) => (
                                  <div key={issueIdx} className={`flex items-start space-x-2 p-3 rounded-lg ${
                                    issue.severity === 'high' ? 'bg-blue-50 border border-blue-200' : 'bg-blue-50 border border-blue-200'
                                  }`}>
                                    <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                                      issue.severity === 'high' ? 'text-blue-600' : 'text-blue-600'
                                    }`} />
                                    <span className={`text-sm font-medium ${
                                      issue.severity === 'high' ? 'text-blue-800' : 'text-blue-800'
                                    }`}>
                                      {issue.message}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {alert.alertAt && (
                              <p className="text-xs text-gray-500 flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>Alert triggered: {new Date(alert.alertAt).toLocaleString()}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Show Device and Organization Cards */}
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Related Information</p>
                          
                          {relatedDevice && (
                            <div className="bg-gradient-to-r from-blue-50 to-blue-50 rounded-lg p-4 border border-blue-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <Thermometer className="w-5 h-5 text-blue-600" />
                                  <div>
                                    <p className="font-semibold text-gray-900">{relatedDevice.name}</p>
                                    <p className="text-xs text-gray-600">
                                      {relatedDevice.brand} {relatedDevice.model} • {relatedDevice.temperature}°C
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setActiveTab('acs');
                                    // Scroll to the device if needed
                                  }}
                                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}

                          {relatedOrg && (
                            <div className="bg-gradient-to-r from-blue-50 to-blue-50 rounded-lg p-4 border border-blue-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <Building className="w-5 h-5 text-blue-600" />
                                  <div>
                                    <p className="font-semibold text-gray-900">{relatedOrg.name}</p>
                                    <p className="text-xs text-gray-600">Status: {relatedOrg.status || 'active'}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleViewOrganizationDetails(relatedOrg.id)}
                                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Organizations */}
            {data.organizations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.organizations.map(org => (
                  <OrganizationCard key={org.id} org={org} />
                ))}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-white to-blue-50 p-16 rounded-2xl shadow-2xl text-center border-2 border-blue-200">
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center shadow-lg">
                  <Building className="w-12 h-12 text-blue-600" />
                </div>
                <p className="text-gray-800 text-2xl font-bold mb-3">No Organizations Found</p>
                <p className="text-gray-600 text-base mb-6">No organizations are currently assigned to you</p>
              </div>
            )}
          </div>
        );
      case 'acs':
        return (
          <div className="space-y-8">
            {/* Header Section - Enhanced */}
            <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl shadow-2xl p-8 border-2 border-blue-400 overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>
              <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="flex items-center space-x-5">
                  <div className="bg-white bg-opacity-25 rounded-2xl p-4 shadow-xl transform group-hover:rotate-12 transition-transform duration-300">
                    <Thermometer className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-extrabold text-white mb-2 drop-shadow-lg">AC Devices</h2>
                    <p className="text-blue-100 text-base font-medium mb-3">Manage all AC devices in your organizations</p>
                    <span className="inline-block bg-white bg-opacity-25 text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg backdrop-blur-sm">
                      {data.acs.length} Total AC Device{data.acs.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {data.acs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.acs.map(ac => (
                  <ACCard key={ac.id} ac={ac} />
                ))}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-white to-blue-50 p-16 rounded-2xl shadow-2xl text-center border-2 border-blue-200">
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center shadow-lg">
                  <Thermometer className="w-12 h-12 text-blue-600" />
                </div>
                <p className="text-gray-800 text-2xl font-bold mb-3">No AC Devices Found</p>
                <p className="text-gray-600 text-base mb-6">No AC devices are currently assigned to your organizations</p>
              </div>
            )}
          </div>
        );
      case 'energy':
        const totalEnergy = data.acs.reduce((sum, ac) => sum + (ac.totalEnergyConsumed || 0), 0);
        const activeACsCount = data.acs.filter(ac => ac.isOn).length;
        const totalACsCount = data.acs.length;
        
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Zap className="w-6 h-6 mr-2 text-blue-600" />
                  Energy Consumption
                </h2>
                <p className="text-sm text-gray-600 mt-1">Monitor and track energy usage across all AC devices</p>
              </div>
              <button
                onClick={() => {
                  // Refresh energy data for all ACs and organizations
                  data.acs.forEach(ac => loadACEnergy(ac.id));
                  data.organizations.forEach(org => loadOrganizationEnergy(org.id));
                  toast.success('Refreshing energy data...');
                }}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh All
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Energy Consumed</p>
                    <p className="text-3xl font-bold mt-2">{totalEnergy.toFixed(2)} kWh</p>
                    <p className="text-blue-100 text-xs mt-1">Lifetime consumption</p>
                  </div>
                  <Zap className="w-12 h-12 text-blue-200 opacity-50" />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Active AC Devices</p>
                    <p className="text-3xl font-bold mt-2">{activeACsCount} / {totalACsCount}</p>
                    <p className="text-blue-100 text-xs mt-1">Currently running</p>
                  </div>
                  <Power className="w-12 h-12 text-blue-200 opacity-50" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Organizations</p>
                    <p className="text-3xl font-bold mt-2">{data.organizations.length}</p>
                    <p className="text-blue-100 text-xs mt-1">With AC devices</p>
                  </div>
                  <Building className="w-12 h-12 text-blue-200 opacity-50" />
                </div>
              </div>
            </div>

            {/* Organizations Energy Consumption */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Building className="w-5 h-5 mr-2 text-blue-600" />
                Energy by Organization
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.organizations.map(org => {
                  const orgEnergy = energyData.organizations[org.id];
                  // Filter ACs by organizationId (direct field or from organization relationship)
                  const orgACs = data.acs.filter(ac => 
                    ac.organizationId === org.id || ac.organization?.id === org.id
                  );
                  const orgTotalEnergy = orgEnergy?.totalEnergyConsumed || 
                    orgACs.reduce((sum, ac) => sum + (ac.totalEnergyConsumed || 0), 0);
                  const orgActiveACs = orgACs.filter(ac => ac.isOn).length;
                  
                  return (
                    <div key={org.id} className="bg-white rounded-lg shadow-md p-5 border border-gray-200 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{org.name}</h4>
                          <p className="text-xs text-gray-500">{orgACs.length} AC device{orgACs.length !== 1 ? 's' : ''}</p>
                        </div>
                        <button
                          onClick={() => {
                            loadOrganizationEnergy(org.id);
                            handleViewOrganizationDetails(org.id);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Total Energy:</span>
                          <span className="text-lg font-bold text-blue-600">
                            {orgTotalEnergy.toFixed(2)} kWh
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Active ACs:</span>
                          <span className={`text-sm font-medium ${orgActiveACs > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                            {orgActiveACs} / {orgACs.length}
                          </span>
                        </div>
                        {energyLoading[`org-${org.id}`] && (
                          <div className="flex items-center justify-center pt-2">
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                        {orgEnergy && (
                          <div className="pt-2 border-t border-gray-100">
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>Last Updated:</span>
                              <span>
                                {orgEnergy.lastEnergyCalculation 
                                  ? new Date(orgEnergy.lastEnergyCalculation).toLocaleTimeString()
                                  : 'Never'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AC Devices Energy Consumption */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Thermometer className="w-5 h-5 mr-2 text-blue-600" />
                Energy by AC Device
              </h3>
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AC Device</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ton</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Energy</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Off Load</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">On Load</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Rate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overload</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.acs.map(ac => {
                        const acEnergy = energyData.acs[ac.id];
                        const isLoading = energyLoading[`ac-${ac.id}`];
                        
                        return (
                          <tr key={ac.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{ac.name}</div>
                                  <div className="text-sm text-gray-500">{ac.brand} {ac.model}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {ac.organization?.name || 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                                {ac.ton} Ton
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded ${
                                ac.isOn 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {ac.isOn ? 'ON' : 'OFF'}
                              </span>
                              {acEnergy?.isOnStartup && (
                                <span className="ml-2 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                                  Startup
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-blue-600">
                                {acEnergy ? acEnergy.totalEnergyConsumed.toFixed(2) : (ac.totalEnergyConsumed || 0).toFixed(2)} kWh
                              </div>
                            </td>
                            {/* Off Load Column */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              {isLoading ? (
                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : acEnergy ? (
                                <div className="text-sm font-medium text-gray-500">
                                  0.00 kWh/hr
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                            {/* On Load Column (Base Rate) */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              {isLoading ? (
                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : acEnergy ? (
                                <div>
                                  <div className="text-sm font-medium text-green-600">
                                    {ac.isOn ? (acEnergy.baseRate?.toFixed(2) || '0.00') : '0.00'} kWh/hr
                                  </div>
                                  {ac.isOn && acEnergy.currentMode && (
                                    <div className="text-xs text-gray-500">
                                      {acEnergy.currentMode}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                            {/* Current Rate Column (Temperature Adjusted) */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              {isLoading ? (
                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : acEnergy ? (
                                <div>
                                  <div className="text-sm font-medium text-blue-600">
                                    {acEnergy.currentRate?.toFixed(2) || '0.00'} kWh/hr
                                  </div>
                                  {acEnergy.temperatureMultiplier !== 1 && (
                                    <div className="text-xs text-gray-500">
                                      Temp: {acEnergy.temperature}°C
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <button
                                  onClick={() => loadACEnergy(ac.id)}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  Load
                                </button>
                              )}
                            </td>
                            {/* Overload Column */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              {isLoading ? (
                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : acEnergy ? (
                                <div>
                                  {ac.isOn && acEnergy.currentRate && acEnergy.baseRate ? (
                                    (() => {
                                      const overload = acEnergy.currentRate - acEnergy.baseRate;
                                      const isOverload = overload > 0.01; // More than 0.01 kWh/hr difference
                                      return (
                                        <div>
                                          {isOverload ? (
                                            <div className="text-sm font-medium text-red-600">
                                              +{overload.toFixed(2)} kWh/hr
                                            </div>
                                          ) : (
                                            <div className="text-sm font-medium text-gray-400">
                                              0.00 kWh/hr
                                            </div>
                                          )}
                                          {acEnergy.isOnStartup && (
                                            <div className="text-xs text-yellow-600">
                                              Startup
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()
                                  ) : (
                                    <div className="text-sm font-medium text-gray-400">
                                      0.00 kWh/hr
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {data.acs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No AC devices found
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'alerts':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <h2 className="text-xl font-semibold text-gray-900">Device Alerts</h2>
                {alerts.length > 0 && (
                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                    {alerts.length} Active Alert{alerts.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button
                onClick={handleCheckAlerts}
                disabled={alertsLoading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${alertsLoading ? 'animate-spin' : ''}`} />
                Check Alerts Now
              </button>
            </div>
            
            {alertsLoading && alerts.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : alerts.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow-md text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                <p className="text-gray-600 text-lg font-medium mb-2">No Active Alerts</p>
                <p className="text-gray-500 text-sm">All devices in your assigned organizations are operating normally.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert, idx) => (
                  <div key={idx} className="bg-white rounded-lg shadow-md border-l-4 border-red-500 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{alert.acName}</h3>
                            <p className="text-sm text-gray-600">{alert.brand} {alert.model}</p>
                          </div>
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                            {alert.organizationName}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Serial Number</p>
                            <p className="text-sm font-medium text-gray-900">{alert.serialNumber}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">AC Temperature</p>
                            <p className="text-sm font-medium text-gray-900">{alert.temperature}°C</p>
                          </div>
                          {alert.roomTemperature && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Room Temperature</p>
                              <p className="text-sm font-medium text-blue-600">{alert.roomTemperature.toFixed(1)}°C</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Power Status</p>
                            <p className={`text-sm font-medium ${alert.isOn ? 'text-green-600' : 'text-gray-500'}`}>
                              {alert.isOn ? 'ON' : 'OFF'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Device Status</p>
                            <p className={`text-sm font-medium ${alert.isWorking === false ? 'text-red-600' : 'text-green-600'}`}>
                              {alert.isWorking === false ? 'Not Working' : 'Working'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Room Temperature Alert Display */}
                        {alert.issue && alert.issue.includes("Room temperature") && alert.roomTempHistory ? (
                          <div className="bg-red-50 rounded-lg p-4 mb-3">
                            <div className="flex items-start space-x-2 mb-3">
                              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-red-900 mb-1">
                                  {alert.issue}
                                </p>
                                <span className="text-xs px-2 py-0.5 rounded bg-red-200 text-red-800">
                                  High Priority
                                </span>
                              </div>
                            </div>
                            
                            {/* Room Temperature History Visualization */}
                            <div className="mt-4">
                              <p className="text-xs font-medium text-gray-700 mb-3">3-Hour Room Temperature Pattern:</p>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <p className="text-xs text-gray-500 mb-1">Hour 0</p>
                                  <p className="text-lg font-bold text-gray-900">
                                    {alert.roomTempHistory.hour0?.toFixed(1) || 'N/A'}°C
                                  </p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <p className="text-xs text-gray-500 mb-1">Hour 1</p>
                                  <p className="text-lg font-bold text-gray-900">
                                    {alert.roomTempHistory.hour1?.toFixed(1) || 'N/A'}°C
                                  </p>
                                </div>
                                <div className="bg-red-50 rounded-lg p-3 border border-red-300">
                                  <p className="text-xs text-gray-500 mb-1">Hour 2 (Current)</p>
                                  <p className="text-lg font-bold text-red-600">
                                    {alert.roomTempHistory.hour2?.toFixed(1) || 'N/A'}°C
                                  </p>
                                </div>
                              </div>
                              
                              {/* Temperature Trend Indicator */}
                              <div className="mt-3 flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className="flex space-x-1">
                                    {[alert.roomTempHistory.hour0, alert.roomTempHistory.hour1, alert.roomTempHistory.hour2].map((temp, idx) => {
                                      const isIncreasing = idx > 0 && temp > [alert.roomTempHistory.hour0, alert.roomTempHistory.hour1, alert.roomTempHistory.hour2][idx - 1];
                                      const isDecreasing = idx > 0 && temp < [alert.roomTempHistory.hour0, alert.roomTempHistory.hour1, alert.roomTempHistory.hour2][idx - 1];
                                      return (
                                        <div
                                          key={idx}
                                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                            isIncreasing
                                              ? 'bg-red-200 text-red-700'
                                              : isDecreasing
                                              ? 'bg-green-200 text-green-700'
                                              : 'bg-gray-200 text-gray-700'
                                          }`}
                                          title={`Hour ${idx}: ${temp?.toFixed(1)}°C`}
                                        >
                                          {idx + 1}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <span className="text-xs text-gray-600">
                                    {alert.roomTempHistory.hour2 > alert.roomTempHistory.hour1 
                                      ? '⚠️ Temperature Increased' 
                                      : alert.roomTempHistory.hour2 === alert.roomTempHistory.hour1
                                      ? '⚠️ Temperature Stuck'
                                      : '✅ Temperature Decreased'}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Current Room Temperature */}
                              {alert.roomTemperature && (
                                <div className="mt-3 pt-3 border-t border-red-200">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-600">Current Room Temperature:</span>
                                    <span className="text-sm font-bold text-red-700">
                                      {alert.roomTemperature.toFixed(1)}°C
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Legacy Issues Display (for backward compatibility) */
                          <div className="bg-red-50 rounded-lg p-4 mb-3">
                            <p className="text-sm font-semibold text-red-900 mb-2">Issues Detected:</p>
                            <div className="space-y-2">
                              {alert.issues && alert.issues.map((issue, issueIdx) => (
                                <div key={issueIdx} className={`flex items-start space-x-2 ${
                                  issue.severity === 'high' ? 'text-red-700' : 'text-orange-700'
                                }`}>
                                  <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                    issue.severity === 'high' ? 'text-red-600' : 'text-orange-600'
                                  }`} />
                                  <div>
                                    <p className="text-sm font-medium">{issue.message}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                      issue.severity === 'high' 
                                        ? 'bg-red-200 text-red-800' 
                                        : 'bg-orange-200 text-orange-800'
                                    }`}>
                                      {issue.severity === 'high' ? 'High Priority' : 'Medium Priority'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {alert.alertAt && (
                          <p className="text-xs text-gray-500">
                            Alert triggered: {new Date(alert.alertAt).toLocaleString()}
                          </p>
                        )}
                        {alert.lastTemperatureChange && (
                          <p className="text-xs text-gray-500">
                            Last temperature change: {new Date(alert.lastTemperatureChange).toLocaleString()}
                          </p>
                        )}
                        {alert.lastPowerChangeAt && (
                          <p className="text-xs text-gray-500">
                            Last power change: {new Date(alert.lastPowerChangeAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex w-full">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'} bg-gradient-to-b from-blue-900 to-blue-800 text-white transition-all duration-300 ease-in-out flex flex-col fixed h-screen z-30`}>
        {/* Sidebar Header */}
        <div className={`p-6 border-b border-blue-700 flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center lg:flex-col lg:space-y-4'}`}>
          {sidebarOpen ? (
            <div className="flex items-center space-x-3">
              <div className="bg-white rounded-lg p-2">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Manager Panel</h2>
                <p className="text-xs text-blue-200">Control Center</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-3 space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    // Close sidebar on mobile after selection
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-2'} py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-blue-600 shadow-lg'
                      : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                  }`}
                  title={!sidebarOpen ? tab.label : ''}
                >
                  <Icon className={`${sidebarOpen ? 'w-5 h-5 mr-3' : 'w-6 h-6'}`} />
                  {sidebarOpen && (
                    <>
                      <span className="font-medium flex-1 text-left">{tab.label}</span>
                      {tab.count !== undefined && (
                        <span className={`ml-2 py-0.5 px-2 rounded-full text-xs font-semibold ${
                          tab.badge === 'red' && tab.count > 0
                            ? 'bg-red-500 text-white'
                            : isActive
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-blue-700 text-blue-100'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-blue-700">
          <div className={`${sidebarOpen ? 'px-4' : 'px-2'} py-3 bg-blue-700 rounded-lg`}>
            <div className={`flex items-center ${sidebarOpen ? 'space-x-3' : 'justify-center'}`}>
              <div className="bg-blue-600 rounded-full p-2">
                <User className="w-5 h-5" />
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name || 'Manager'}</p>
                  <p className="text-xs text-blue-200 truncate">{user?.email || 'manager@example.com'}</p>
                {user?.status && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                    user.status === 'unlocked' 
                        ? 'bg-green-500 text-white' 
                      : user.status === 'locked'
                        ? 'bg-red-500 text-white'
                        : 'bg-yellow-500 text-white'
                  }`}>
                    {user.status}
                  </span>
                )}
              </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 w-full ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} transition-all duration-300 bg-gray-50 min-h-screen`}>
        {/* Top Header */}
        <header className="bg-white shadow-md border-b sticky top-0 z-10 w-full">
          <div className="px-4 sm:px-6 py-4 w-full">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {tabs.find(t => t.id === activeTab)?.label || 'Dashboard'}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Welcome back, {user?.name || 'Manager'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
              {alerts.length > 0 && (
                  <div className="flex items-center space-x-2 bg-red-50 px-3 py-1 rounded-lg border border-red-200">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800">
                    {alerts.length} Alert{alerts.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              <button
                onClick={loadData}
                  className="p-2 sm:p-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh Data"
              >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={logout}
                  className="flex items-center px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                  <LogOut className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

        {/* Content */}
        <main className="p-4 sm:p-6 w-full overflow-x-hidden">
          <div className="w-full max-w-none">
            {/* Main Content */}
          {renderContent()}
        </div>
        </main>
      </div>

      {/* Organization Details Modal */}
      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedEvent ? 'Edit Event' : 'Create Event'}
              </h3>
              <button
                onClick={handleCloseEventModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <EventForm 
                onSubmit={handleEventSubmit}
                onCancel={handleCloseEventModal}
                event={selectedEvent}
                acs={memoizedAcs}
              />
            </div>
          </div>
        </div>
      )}

      {showOrgDetailsModal && selectedOrgDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Organization Details</h2>
              <button
                onClick={() => {
                  setShowOrgDetailsModal(false);
                  setSelectedOrgDetails(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Organization Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{selectedOrgDetails.name}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                      selectedOrgDetails.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedOrgDetails.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Size:</span>
                    <span className="ml-2 text-sm font-medium">{selectedOrgDetails.organizationSize}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Temperature:</span>
                    {selectedOrgDetails.hasMixedTemperatures ? (
                      <span className="ml-2 text-sm font-medium text-red-600">Mixed</span>
                    ) : (
                      <div className="flex items-center space-x-2 ml-2">
                        <input
                          type="number"
                          min="16"
                          max="30"
                          step="1"
                          value={localTemperatures[`organization-${selectedOrgDetails.id}`] !== undefined ? localTemperatures[`organization-${selectedOrgDetails.id}`] : (selectedOrgDetails.temperature ?? 16)}
                          disabled={temperatureLoading[`organization-${selectedOrgDetails.id}`] || user?.status === 'restricted' || user?.status === 'locked'}
                          className={`w-20 px-2 py-1 text-sm border rounded-lg text-center font-medium transition-colors ${
                            temperatureLoading[`organization-${selectedOrgDetails.id}`] || user?.status === 'restricted' || user?.status === 'locked'
                              ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-100' 
                              : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                          }`}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              handleTemperatureChange('organization', selectedOrgDetails.id, '');
                            } else {
                              const temp = parseInt(value);
                              if (!isNaN(temp)) {
                                handleTemperatureChange('organization', selectedOrgDetails.id, temp);
                              }
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              handleTemperatureChange('organization', selectedOrgDetails.id, selectedOrgDetails.temperature ?? 16);
                            } else {
                              const temp = parseInt(value);
                              if (!isNaN(temp) && temp >= 16 && temp <= 30) {
                                handleTemperatureSubmit('organization', selectedOrgDetails.id, temp);
                              } else {
                                handleTemperatureChange('organization', selectedOrgDetails.id, selectedOrgDetails.temperature ?? 16);
                              }
                            }
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const value = e.target.value;
                              if (value === '') {
                                handleTemperatureChange('organization', selectedOrgDetails.id, selectedOrgDetails.temperature ?? 16);
                              } else {
                                const temp = parseInt(value);
                                if (!isNaN(temp) && temp >= 16 && temp <= 30) {
                                  handleTemperatureSubmit('organization', selectedOrgDetails.id, temp);
                                }
                              }
                            }
                          }}
                        />
                        <span className="text-sm font-medium text-gray-600">°C</span>
                        {temperatureLoading[`organization-${selectedOrgDetails.id}`] && (
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Locked:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                      selectedOrgDetails.isLocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {selectedOrgDetails.isLocked ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {(() => {
                    const orgEnergy = energyData.organizations[selectedOrgDetails.id];
                    // Filter ACs by organizationId (direct field or from organization relationship)
                    const orgACs = data.acs.filter(ac => 
                      ac.organizationId === selectedOrgDetails.id || ac.organization?.id === selectedOrgDetails.id
                    );
                    const orgTotalEnergy = orgEnergy?.totalEnergyConsumed || 
                      orgACs.reduce((sum, ac) => sum + (ac.totalEnergyConsumed || 0), 0);
                    return (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Zap className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-gray-900">Energy Consumption</span>
                          </div>
                          {energyLoading[`org-${selectedOrgDetails.id}`] && (
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Total Energy:</span>
                            <span className="text-lg font-bold text-blue-600">
                              {orgTotalEnergy.toFixed(2)} kWh
                            </span>
                          </div>
                          {orgEnergy && (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Total ACs:</span>
                                <span className="text-sm font-medium text-gray-900">
                                  {orgEnergy.totalACs || orgACs.length}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Active ACs:</span>
                                <span className={`text-sm font-medium ${orgEnergy.activeACs > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                  {orgEnergy.activeACs || orgACs.filter(ac => ac.isOn).length}
                                </span>
                              </div>
                              {orgEnergy.lastEnergyCalculation && (
                                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-blue-200">
                                  <span>Last Updated:</span>
                                  <span>{new Date(orgEnergy.lastEnergyCalculation).toLocaleString()}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  {selectedOrgDetails.createdAt && (
                    <div>
                      <span className="text-sm text-gray-600">Created:</span>
                      <span className="ml-2 text-sm font-medium">{new Date(selectedOrgDetails.createdAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* AC Devices */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  AC Devices ({selectedOrgDetails.acs?.length || 0})
                </h4>
                {selectedOrgDetails.acs && selectedOrgDetails.acs.length > 0 ? (
                  <div className="space-y-3">
                    {selectedOrgDetails.acs.map((ac) => (
                      <div key={ac.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <span className="text-xs text-gray-600">Name:</span>
                            <p className="text-sm font-medium">{ac.name}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-600">Brand/Model:</span>
                            <p className="text-sm font-medium">{ac.brand} {ac.model}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-600">Temperature:</span>
                            <p className="text-sm font-medium">{ac.temperature}°C</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-600">Status:</span>
                            <p className={`text-sm font-medium ${ac.isOn ? 'text-green-600' : 'text-gray-500'}`}>
                              {ac.isOn ? 'ON' : 'OFF'}
                            </p>
                          </div>
                          {ac.ton && (
                            <div>
                              <span className="text-xs text-gray-600">Capacity:</span>
                              <p className="text-sm font-medium">{ac.ton} ton</p>
                            </div>
                          )}
                          {ac.currentMode && (
                            <div>
                              <span className="text-xs text-gray-600">Mode:</span>
                              <p className="text-sm font-medium capitalize">{ac.currentMode}</p>
                            </div>
                          )}
                          {ac.serialNumber && (
                            <div>
                              <span className="text-xs text-gray-600">Serial:</span>
                              <p className="text-sm font-medium">{ac.serialNumber}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-xs text-gray-600">Working:</span>
                            <p className={`text-sm font-medium ${ac.isWorking ? 'text-green-600' : 'text-red-600'}`}>
                              {ac.isWorking ? 'Yes' : 'No'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No AC devices in this organization</p>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end">
              <button
                onClick={() => {
                  setShowOrgDetailsModal(false);
                  setSelectedOrgDetails(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Venue Details Modal */}
      {showVenueDetailsModal && selectedVenueDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Venue Details</h2>
              <button
                onClick={() => {
                  setShowVenueDetailsModal(false);
                  setSelectedVenueDetails(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-4 text-lg">{selectedVenueDetails.name}</h4>
                
                {/* Venue Information */}
                <div className="space-y-2 text-sm mb-4">
                  {selectedVenueDetails.organization && (
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Organization:</span>
                      <span>{selectedVenueDetails.organization.name}</span>
                    </div>
                  )}
                  {selectedVenueDetails.organizationSize && (
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Size:</span>
                      <span>{selectedVenueDetails.organizationSize}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Status:</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      selectedVenueDetails.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {selectedVenueDetails.status || 'active'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Temperature:</span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="16"
                        max="30"
                        step="1"
                        value={localTemperatures[`venue-${selectedVenueDetails.id}`] !== undefined ? localTemperatures[`venue-${selectedVenueDetails.id}`] : (selectedVenueDetails.temperature ?? 16)}
                        disabled={temperatureLoading[`venue-${selectedVenueDetails.id}`] || user?.status === 'restricted' || user?.status === 'locked'}
                        className={`w-20 px-2 py-1 text-sm border rounded-lg text-center font-medium transition-colors ${
                          temperatureLoading[`venue-${selectedVenueDetails.id}`] || user?.status === 'restricted' || user?.status === 'locked'
                            ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-100' 
                            : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                        }`}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            handleTemperatureChange('venue', selectedVenueDetails.id, '');
                          } else {
                            const temp = parseInt(value);
                            if (!isNaN(temp)) {
                              handleTemperatureChange('venue', selectedVenueDetails.id, temp);
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            handleTemperatureChange('venue', selectedVenueDetails.id, selectedVenueDetails.temperature ?? 16);
                          } else {
                            const temp = parseInt(value);
                            if (!isNaN(temp) && temp >= 16 && temp <= 30) {
                              handleTemperatureSubmit('venue', selectedVenueDetails.id, temp);
                            } else {
                              handleTemperatureChange('venue', selectedVenueDetails.id, selectedVenueDetails.temperature ?? 16);
                            }
                          }
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const value = e.target.value;
                            if (value === '') {
                              handleTemperatureChange('venue', selectedVenueDetails.id, selectedVenueDetails.temperature ?? 16);
                            } else {
                              const temp = parseInt(value);
                              if (!isNaN(temp) && temp >= 16 && temp <= 30) {
                                handleTemperatureSubmit('venue', selectedVenueDetails.id, temp);
                              }
                            }
                          }
                        }}
                      />
                      <span className="text-sm font-medium text-gray-600">°C</span>
                      {temperatureLoading[`venue-${selectedVenueDetails.id}`] && (
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Remote Lock Control Section */}
                <div className="bg-yellow-50 rounded-lg p-4 mb-4 border border-yellow-200 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-800 flex items-center">
                      <Lock className="w-4 h-4 mr-2" />
                      Remote Lock Control
                    </span>
                  </div>
                  {isVenueDevicesRemoteLocked(selectedVenueDetails) ? (
                    <div className="space-y-2">
                      <p className="text-xs text-yellow-800 mb-2">
                        All devices in this venue are remote locked
                      </p>
                      <button
                        onClick={() => {
                          handleRemoteUnlockVenue(selectedVenueDetails.id);
                          setShowVenueDetailsModal(false);
                          setSelectedVenueDetails(null);
                        }}
                        disabled={user?.status === 'restricted' || user?.status === 'locked'}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Remote unlock all devices in this venue"
                      >
                        <Unlock className="w-4 h-4" />
                        <span>Remote Unlock Devices</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        handleRemoteLockVenue(selectedVenueDetails.id);
                        setShowVenueDetailsModal(false);
                        setSelectedVenueDetails(null);
                      }}
                      disabled={user?.status === 'restricted' || user?.status === 'locked'}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remote lock all devices in this venue"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Remote Lock Devices</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end">
              <button
                onClick={() => {
                  setShowVenueDetailsModal(false);
                  setSelectedVenueDetails(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AC Details Modal */}
      {showACDetailsModal && selectedACDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">AC Device Details</h2>
              <button
                onClick={() => {
                  setShowACDetailsModal(false);
                  setSelectedACDetails(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-4 text-lg">{selectedACDetails.name}</h4>
                
                {/* AC Information */}
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Brand:</span>
                    <span>{selectedACDetails.brand}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Model:</span>
                    <span>{selectedACDetails.model}</span>
                  </div>
                  {selectedACDetails.serialNumber && (
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Serial Number:</span>
                      <span className="font-mono text-xs">{selectedACDetails.serialNumber}</span>
                    </div>
                  )}
                  {selectedACDetails.ton && (
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Capacity:</span>
                      <span>{selectedACDetails.ton} Ton</span>
                    </div>
                  )}
                  {selectedACDetails.venue && (
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Venue:</span>
                      <span>{selectedACDetails.venue.name}</span>
                      {selectedACDetails.venue.organization && (
                        <span className="text-gray-500">({selectedACDetails.venue.organization.name})</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Temperature Control */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Temperature Control</span>
                    {temperatureLoading[`ac-${selectedACDetails.id}`] && (
                      <div className="flex items-center space-x-1 text-blue-600">
                        <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs">Updating...</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 mb-3">
                    <input
                      type="number"
                      min="16"
                      max="30"
                      value={localTemperatures[`ac-${selectedACDetails.id}`] !== undefined ? localTemperatures[`ac-${selectedACDetails.id}`] : (selectedACDetails.temperature ?? 16)}
                      disabled={temperatureLoading[`ac-${selectedACDetails.id}`] || user?.status === 'restricted' || user?.status === 'locked'}
                      className={`w-24 px-3 py-2 text-sm border rounded-lg text-center font-medium transition-colors ${
                        temperatureLoading[`ac-${selectedACDetails.id}`] || user?.status === 'restricted' || user?.status === 'locked'
                          ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-100' 
                          : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      }`}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          handleTemperatureChange('ac', selectedACDetails.id, '');
                        } else {
                          const temp = parseInt(value);
                          if (!isNaN(temp)) {
                            handleTemperatureChange('ac', selectedACDetails.id, temp);
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          handleTemperatureChange('ac', selectedACDetails.id, selectedACDetails.temperature ?? 16);
                        } else {
                          const temp = parseInt(value);
                          if (!isNaN(temp) && temp >= 16 && temp <= 30) {
                            handleTemperatureSubmit('ac', selectedACDetails.id, temp);
                          } else {
                            handleTemperatureChange('ac', selectedACDetails.id, selectedACDetails.temperature ?? 16);
                          }
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const value = e.target.value;
                          if (value === '') {
                            handleTemperatureChange('ac', selectedACDetails.id, selectedACDetails.temperature ?? 16);
                          } else {
                            const temp = parseInt(value);
                            if (!isNaN(temp) && temp >= 16 && temp <= 30) {
                              handleTemperatureSubmit('ac', selectedACDetails.id, temp);
                            }
                          }
                        }
                      }}
                    />
                    <span className="text-sm font-medium text-gray-600">°C</span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        handleTemperatureChange('ac', selectedACDetails.id, 16);
                        handleSetTemperature('ac', selectedACDetails.id, 16);
                      }}
                      disabled={temperatureLoading[`ac-${selectedACDetails.id}`] || user?.status === 'restricted' || user?.status === 'locked'}
                      className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      16°
                    </button>
                    <button
                      onClick={() => {
                        handleTemperatureChange('ac', selectedACDetails.id, 22);
                        handleSetTemperature('ac', selectedACDetails.id, 22);
                      }}
                      disabled={temperatureLoading[`ac-${selectedACDetails.id}`] || user?.status === 'restricted' || user?.status === 'locked'}
                      className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      22°
                    </button>
                    <button
                      onClick={() => {
                        handleTemperatureChange('ac', selectedACDetails.id, 26);
                        handleSetTemperature('ac', selectedACDetails.id, 26);
                      }}
                      disabled={temperatureLoading[`ac-${selectedACDetails.id}`] || user?.status === 'restricted' || user?.status === 'locked'}
                      className="px-3 py-1 text-xs font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      26°
                    </button>
                  </div>
                </div>

                {/* Power Control */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Power Control</span>
                    {acPowerLoading[selectedACDetails.id] && (
                      <div className="flex items-center space-x-1 text-blue-600">
                        <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs">Updating...</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleACPower(selectedACDetails.id, !selectedACDetails.isOn)}
                    disabled={acPowerLoading[selectedACDetails.id] || user?.status === 'restricted' || user?.status === 'locked'}
                    className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      selectedACDetails.isOn
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    <Power className="w-4 h-4" />
                    <span>{selectedACDetails.isOn ? 'Turn OFF' : 'Turn ON'}</span>
                  </button>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-xs text-gray-500">Current Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      selectedACDetails.isOn ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedACDetails.isOn ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>

                {/* Remote Lock Control */}
                <div className="bg-yellow-50 rounded-lg p-4 mb-4 border border-yellow-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-800 flex items-center">
                      <Lock className="w-4 h-4 mr-2" />
                      Remote Lock Control
                    </span>
                  </div>
                  {isDeviceRemoteLocked(selectedACDetails) ? (
                    <div className="space-y-2">
                      <p className="text-xs text-yellow-800 mb-2">
                        This device is remote locked
                      </p>
                      <button
                        onClick={() => {
                          handleRemoteUnlockAC(selectedACDetails.id);
                          setShowACDetailsModal(false);
                          setSelectedACDetails(null);
                        }}
                        disabled={user?.status === 'restricted' || user?.status === 'locked'}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Remote unlock this device"
                      >
                        <Unlock className="w-4 h-4" />
                        <span>Remote Unlock Device</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        handleRemoteLockAC(selectedACDetails.id);
                        setShowACDetailsModal(false);
                        setSelectedACDetails(null);
                      }}
                      disabled={user?.status === 'restricted' || user?.status === 'locked'}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remote lock this device"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Remote Lock Device</span>
                    </button>
                  )}
                </div>

                {/* Energy Consumption */}
                {(() => {
                  const acEnergy = energyData.acs[selectedACDetails.id];
                  const acTotalEnergy = acEnergy?.totalEnergyConsumed || selectedACDetails.totalEnergyConsumed || 0;
                  return (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Zap className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-gray-900">Energy Consumption</span>
                        </div>
                        {energyLoading[`ac-${selectedACDetails.id}`] && (
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Total Energy:</span>
                          <span className="text-lg font-bold text-blue-600">
                            {acTotalEnergy.toFixed(2)} kWh
                          </span>
                        </div>
                        {acEnergy && acEnergy.lastEnergyCalculation && (
                          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-blue-200">
                            <span>Last Updated:</span>
                            <span>{new Date(acEnergy.lastEnergyCalculation).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end">
              <button
                onClick={() => {
                  setShowACDetailsModal(false);
                  setSelectedACDetails(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;


