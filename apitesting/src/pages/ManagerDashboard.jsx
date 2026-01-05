import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { managerAPI } from '../services/apiManager';
import { BACKEND_IP, BACKEND_PORT, FRONTEND_WS_PORT, WS_URL } from '../config/api';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import EventForm from '../components/EventForm';
import VenueDetailsPage from './VenueDetailsPage';
import {
  OrganizationCard,
  VenueCard,
  ACCard,
  DashboardView,
  EventsView,
  EnergyConsumptionView
} from '../components/dashboard';
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
  User,
  Download,
  Check
} from 'lucide-react';

const ManagerDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); // Track initial data load
  const [alerts, setAlerts] = useState([]);
  const [allAlerts, setAllAlerts] = useState([]); // Store all alerts (including device-level) for device highlighting
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Close sidebar by default if on dashboard tab
    return false;
  });
  
  // Calculate content width and margin based on sidebar state and window size
  const [contentMarginLeft, setContentMarginLeft] = useState('0px');
  const [contentWidth, setContentWidth] = useState('100%');
  
  // Close sidebar by default when on dashboard or venue-dashboard tab, keep it closed and disable expand
  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'venue-dashboard') {
      setSidebarOpen(false);
    }
    // Keep sidebar state as is for other tabs (user can toggle)
  }, [activeTab]);
  
  // Prevent sidebar from opening on dashboard or venue-dashboard tab (even if user tries to toggle)
  // Only force close if we're on dashboard/venue-dashboard tab - allow expansion on all other tabs
  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'venue-dashboard') {
      // Force close sidebar on dashboard/venue-dashboard tab - no exceptions
      if (sidebarOpen) {
        console.log(`🚫 ${activeTab} tab: Forcing sidebar to close`);
        setSidebarOpen(false);
      }
    }
    // On other tabs, allow sidebar to be toggled freely
    // Don't force any state - let user control it
  }, [activeTab, sidebarOpen]);
  
  useEffect(() => {
    const calculateContentLayout = () => {
      if (typeof window === 'undefined') return;
      
      const width = window.innerWidth;
      let marginLeft = '0px';
      let contentWidth = '100%';
      
      if (width >= 1280) {
        // xl breakpoint - increased sidebar width
        marginLeft = sidebarOpen ? '256px' : '64px'; // w-64 = 256px
        contentWidth = sidebarOpen ? 'calc(100% - 256px)' : 'calc(100% - 64px)';
      } else if (width >= 1024) {
        // lg breakpoint - increased sidebar width
        marginLeft = sidebarOpen ? '224px' : '56px'; // w-56 = 224px
        contentWidth = sidebarOpen ? 'calc(100% - 224px)' : 'calc(100% - 56px)';
      } else {
        // Mobile - no sidebar margin
        marginLeft = '0px';
        contentWidth = '100%';
      }
      
      setContentMarginLeft(marginLeft);
      setContentWidth(contentWidth);
    };
    
    calculateContentLayout();
    
    // Recalculate on window resize
    window.addEventListener('resize', calculateContentLayout);
    return () => window.removeEventListener('resize', calculateContentLayout);
  }, [sidebarOpen]);

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
  const [showEventTypeSelection, setShowEventTypeSelection] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState(null); // 'simple' or 'recurring'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [localTemperatures, setLocalTemperatures] = useState({});
  const [temperatureLoading, setTemperatureLoading] = useState({});
  const [acPowerLoading, setAcPowerLoading] = useState({});
  // Track which AC devices are actually connected via websocket
  const [connectedDevices, setConnectedDevices] = useState(new Set());
  const [selectedVenueId, setSelectedVenueId] = useState(null);
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [deviceViewMode, setDeviceViewMode] = useState('table'); // 'cards' or 'table'
  const [venueViewMode, setVenueViewMode] = useState('table'); // 'cards' or 'table'
  const [organizationViewMode, setOrganizationViewMode] = useState('table'); // 'cards' or 'table'
  const [eventViewMode, setEventViewMode] = useState('cards'); // 'cards' or 'table'
  const [energyViewMode, setEnergyViewMode] = useState('device'); // 'device', 'venue', 'organization'
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [energyFilters, setEnergyFilters] = useState({
    year: null,
    month: null, // Format: 'YYYY-MM'
    organizationId: null,
    venueId: null,
    deviceId: null
  });

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
    // Note: WebSocket is optional - app works without it (with polling fallback)
    let socket = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 3;
    
    const connectWebSocket = () => {
      try {
        socket = new WebSocket(WS_URL);
        
        socket.onopen = () => {
          console.log('✅ WebSocket connected to backend');
          reconnectAttempts = 0; // Reset on successful connection
        };
        
        socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 WebSocket message received:', message);
        
        // Handle device connection status
        // Support both DEVICE_CONNECTED (new) and CONNECTED (backward compatibility)
        if ((message.type === 'DEVICE_CONNECTED' || message.type === 'CONNECTED') && (message.serial || message.serialNumber)) {
          const serialNumber = message.serial || message.serialNumber;
          setConnectedDevices(prev => new Set([...prev, serialNumber]));
          console.log(`✅ [DASHBOARD] Device ${serialNumber} marked as CONNECTED`);
        }
        
        // Handle device disconnection
        // Support both DEVICE_DISCONNECTED (new) and DISCONNECTED (backward compatibility)
        if ((message.type === 'DEVICE_DISCONNECTED' || message.type === 'DISCONNECTED') && (message.serial || message.serialNumber)) {
          const serialNumber = message.serial || message.serialNumber;
          setConnectedDevices(prev => {
            const newSet = new Set(prev);
            newSet.delete(serialNumber);
            return newSet;
          });
          console.log(`❌ [DASHBOARD] Device ${serialNumber} marked as DISCONNECTED`);
        }
        
        // Handle direct POWER_UPDATE, TEMP_UPDATE, LOCK_UPDATE from ESP32
        // Only update if device is actually connected (prevent false data)
        // STRICT: Only accept updates if device was explicitly marked as CONNECTED
        if ((message.serial || message.serialNumber) && (message.type === 'POWER_UPDATE' || message.type === 'TEMP_UPDATE' || message.type === 'LOCK_UPDATE')) {
          const serialNumber = message.serial || message.serialNumber;
          
          // Check if device is connected before updating (using functional update to get latest state)
          // STRICT CHECK: Only accept if device was explicitly marked as CONNECTED via CONNECTED message
          let isConnected = false;
          setConnectedDevices(prev => {
            isConnected = prev.has(serialNumber);
            if (!isConnected) {
              console.warn(`⚠️ [DASHBOARD] Blocked ${message.type} update - Device ${serialNumber} not connected (preventing false data). Device must send CONNECTED message first.`);
            }
            return prev; // Don't modify state - only check
          });
          
          // Only proceed with update if device is connected
          if (!isConnected) {
            return; // Prevent false data updates - device must be explicitly connected
          }
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
                  console.log(`🔒 [DASHBOARD] Device ${serialNumber} lock updated: ${ac.currentState} → ${isLocked ? 'locked' : 'unlocked'}`);
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
          // Only update if device is actually connected (prevent false data)
          if (update.device_id || update.serialNumber) {
            const deviceSerial = update.serialNumber || update.device_id;
            
            // Check if device is connected before updating (using functional update to get latest state)
            let isConnected = false;
            setConnectedDevices(prev => {
              // Check direct match
              isConnected = prev.has(deviceSerial);
              
              // If not found, check if any AC with this serial/key is connected
              if (!isConnected) {
                const matchingAC = data.acs.find(ac => 
                  ac.serialNumber === deviceSerial || 
                  ac.key === deviceSerial ||
                  ac.id === deviceSerial
                );
                if (matchingAC && matchingAC.serialNumber) {
                  isConnected = prev.has(matchingAC.serialNumber);
                }
              }
              
              if (!isConnected && (update.temperature !== undefined || update.isOn !== undefined)) {
                console.warn(`⚠️ [DASHBOARD] Blocked ESP32_UPDATE - Device ${deviceSerial} not connected (preventing false data)`);
              }
              
              return prev; // Don't modify state, just check
            });
            
            if (!isConnected && (update.temperature !== undefined || update.isOn !== undefined)) {
              return; // Prevent false data updates
            }
            
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
            
            // Check and update venue power status if all devices are on/off
            if (update.venueId && update.isOn !== undefined) {
              const venueId = update.venueId;
              setData(prevData => {
                const venueACs = prevData.acs.filter(ac => ac.venueId === venueId);
                const allDevicesOn = venueACs.length > 0 && venueACs.every(ac => ac.isOn === true);
                const allDevicesOff = venueACs.length > 0 && venueACs.every(ac => ac.isOn === false);
                
                if (allDevicesOn || allDevicesOff) {
                  return {
                    ...prevData,
                    organizations: prevData.organizations.map(org => {
                      const updatedVenues = (org.venues || []).map(venue => {
                        if (venue.id === venueId) {
                          const newVenueState = allDevicesOn;
                          if (venue.isVenueOn !== newVenueState) {
                            console.log(`🏢 [DASHBOARD] Venue ${venue.name} power auto-updated: ${venue.isVenueOn} → ${newVenueState} (all devices ${allDevicesOn ? 'ON' : 'OFF'})`);
                            return { ...venue, isVenueOn: newVenueState };
                          }
                        }
                        return venue;
                      });
                      return { ...org, venues: updatedVenues };
                    })
                  };
                }
                return prevData;
              });
            }
            
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
          toast.success(`Event "${eventData.eventName || 'Unknown'}" ended. Event will remain in history.`, {
            duration: 3000,
          });
          
          // DISABLED: Auto-delete is now disabled - completed events will remain in the list for history
          // Events will stay visible even after completion for records and history
          console.log(`✅ Completed event ${eventData.eventId} will remain in list (auto-remove disabled)`);
        }

        // Handle event deleted - remove immediately (REAL-TIME)
        if (message.type === 'EVENT_DELETED' || (message.type === 'ESP32_UPDATE' && message.data && message.data.type === 'EVENT_DELETED')) {
          const eventData = message.type === 'EVENT_DELETED' ? message : message.data;
          console.log('🗑️ [REAL-TIME] Event deleted received:', eventData);
          
          // Remove event from list immediately - no reload needed
          setData(prevData => {
            const filteredEvents = prevData.events.filter(event => event && event.id !== eventData.eventId);
            console.log(`🗑️ [REAL-TIME] Removed event ${eventData.eventId} from list. Remaining: ${filteredEvents.length}`);
            return {
              ...prevData,
              events: filteredEvents
            };
          });
          
          toast.success(`Event "${eventData.eventName || 'Unknown'}" has been removed.`, {
            duration: 2000,
          });
        }

        // Handle venue power update
        if (message.type === 'VENUE_POWER_UPDATE') {
          console.log('🏢 [DASHBOARD] Venue power update received:', message);
          setData(prevData => ({
            ...prevData,
            organizations: prevData.organizations.map(org => {
              // Update venue in organization
              const updatedVenues = (org.venues || []).map(venue => {
                if (venue.id === message.venueId) {
                  console.log(`🏢 [DASHBOARD] Venue ${venue.name} power updated: ${venue.isVenueOn} → ${message.isVenueOn}`);
                  return { ...venue, isVenueOn: message.isVenueOn };
                }
                return venue;
              });
              
              // Update organization if it has this venue
              if (updatedVenues.length > 0 && updatedVenues.some(v => v.id === message.venueId)) {
                return { ...org, venues: updatedVenues };
              }
              return org;
            }),
            // Also update ACs in this venue
            acs: prevData.acs.map(ac => {
              if (ac.venueId === message.venueId) {
                return { ...ac, isOn: message.isVenueOn };
              }
              return ac;
            })
          }));
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
      // Only log error if we haven't exceeded max attempts
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        console.warn('⚠️ WebSocket connection error (this is optional - app will work with polling):', error);
      }
    };
    
    socket.onclose = () => {
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`🔌 WebSocket disconnected, reconnecting... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        // Reconnect after 5 seconds
        setTimeout(() => {
          connectWebSocket();
        }, 5000);
      } else {
        console.log('ℹ️ WebSocket connection unavailable - using polling fallback for updates');
      }
    };
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
      }
    };
    
    // Attempt initial connection
    connectWebSocket();
    
    // Fallback: Refresh alerts every 30 seconds (in case WebSocket misses updates)
    const alertsInterval = setInterval(() => {
      loadAlerts();
    }, 30000);
    
    return () => {
      if (socket) {
        socket.close();
      }
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
    
    // Reload events when navigating to venue-dashboard tab to ensure events are visible
    if (activeTab === 'venue-dashboard') {
      console.log('📅 [ManagerDashboard] Venue dashboard tab opened - reloading events...');
      setTimeout(async () => {
        try {
          await loadEvents();
          console.log('✅ [ManagerDashboard] Events reloaded for Venue dashboard tab');
        } catch (error) {
          console.error('❌ [ManagerDashboard] Failed to reload events for Venue dashboard tab:', error);
        }
      }, 100);
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

        // Mark initial loading as complete after first successful load
        setInitialLoading(false);

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
        // Even on error, mark initial loading as complete to show error state
        setInitialLoading(false);
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
    setShowEventTypeSelection(false);
    setSelectedEvent(null);
    setSelectedEventType(null);
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
      // First, try to use existing data from data.organizations to show modal immediately
      const existingOrg = data.organizations.find(org => org.id === orgId);
      if (existingOrg) {
        setSelectedOrgDetails(existingOrg);
        setShowOrgDetailsModal(true);
        // Load energy data for this organization (non-blocking)
        loadOrganizationEnergy(orgId).catch(err => {
          console.warn('Failed to load organization energy:', err);
        });
        
        // Optionally fetch fresh data in background (non-blocking)
        managerAPI.getOrganizationDetails(orgId)
          .then(res => {
            const orgData = res.data.data?.organization || res.data.organization;
            if (orgData) {
              setSelectedOrgDetails(orgData);
            }
          })
          .catch(err => {
            console.warn('Failed to fetch fresh organization details, using cached data:', err);
          });
      } else {
        // If not in existing data, fetch from API
        const res = await managerAPI.getOrganizationDetails(orgId);
        setSelectedOrgDetails(res.data.data?.organization || res.data.organization);
        setShowOrgDetailsModal(true);
        // Load energy data for this organization
        loadOrganizationEnergy(orgId).catch(err => {
          console.warn('Failed to load organization energy:', err);
        });
      }
    } catch (error) {
      // If API call fails but we have existing data, still show modal
      const existingOrg = data.organizations.find(org => org.id === orgId);
      if (existingOrg) {
        setSelectedOrgDetails(existingOrg);
        setShowOrgDetailsModal(true);
        toast.warning('Using cached data. Some details may be outdated.');
        loadOrganizationEnergy(orgId).catch(err => {
          console.warn('Failed to load organization energy:', err);
        });
      } else {
        toast.error('Failed to load organization details');
        console.error('Error loading organization details:', error);
      }
    }
  };

  const handleViewVenueDetails = async (venueId) => {
    try {
      // First, try to use existing data from data.organizations to show modal immediately
      const existingVenue = data.organizations?.flatMap(org => org.venues || []).find(v => v.id === venueId);
      if (existingVenue) {
        setSelectedVenueDetails(existingVenue);
        setShowVenueDetailsModal(true);
        
        // Optionally fetch fresh data in background (non-blocking)
        managerAPI.getVenueDetails(venueId)
          .then(res => {
            const venueData = res.data.data?.venue || res.data.venue || res.data.data;
            if (venueData) {
              setSelectedVenueDetails(venueData);
            }
          })
          .catch(err => {
            console.warn('Failed to fetch fresh venue details, using cached data:', err);
          });
      } else {
        // If not in existing data, fetch from API
        const res = await managerAPI.getVenueDetails(venueId);
        const venueData = res.data.data?.venue || res.data.venue || res.data.data;
        if (venueData) {
          setSelectedVenueDetails(venueData);
          setShowVenueDetailsModal(true);
        } else {
          toast.error('Venue details not found in response');
          console.error('Venue details response:', res.data);
        }
      }
    } catch (error) {
      // If API call fails but we have existing data, still show modal
      const existingVenue = data.organizations?.flatMap(org => org.venues || []).find(v => v.id === venueId);
      if (existingVenue) {
        setSelectedVenueDetails(existingVenue);
        setShowVenueDetailsModal(true);
        toast.warning('Using cached data. Some details may be outdated.');
      } else {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to load venue details';
        toast.error(errorMessage);
        console.error('Error loading venue details:', error);
        console.error('Error response:', error.response?.data);
      }
    }
  };

  const handleViewACDetails = async (acId) => {
    try {
      // First, try to use existing data from data.acs to show modal immediately
      const existingAC = data.acs.find(ac => ac.id === acId);
      if (existingAC) {
        setSelectedACDetails(existingAC);
        setShowACDetailsModal(true);
        // Load energy data for this AC (non-blocking)
        loadACEnergy(acId).catch(err => {
          console.warn('Failed to load AC energy:', err);
        });
        
        // Optionally fetch fresh data in background (non-blocking)
        managerAPI.getACDetails(acId)
          .then(res => {
            const acData = res.data.data?.ac || res.data.ac || res.data.data;
            if (acData) {
              setSelectedACDetails(acData);
            }
          })
          .catch(err => {
            console.warn('Failed to fetch fresh AC details, using cached data:', err);
          });
      } else {
        // If not in existing data, fetch from API
        const res = await managerAPI.getACDetails(acId);
        const acData = res.data.data?.ac || res.data.ac || res.data.data;
        if (acData) {
          setSelectedACDetails(acData);
          setShowACDetailsModal(true);
          // Load energy data for this AC
          loadACEnergy(acId).catch(err => {
            console.warn('Failed to load AC energy:', err);
          });
        } else {
          toast.error('AC details not found in response');
          console.error('AC details response:', res.data);
        }
      }
    } catch (error) {
      // If API call fails but we have existing data, still show modal
      const existingAC = data.acs.find(ac => ac.id === acId);
      if (existingAC) {
        setSelectedACDetails(existingAC);
        setShowACDetailsModal(true);
        toast.warning('Using cached data. Some details may be outdated.');
        loadACEnergy(acId).catch(err => {
          console.warn('Failed to load AC energy:', err);
        });
      } else {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to load AC details';
        toast.error(errorMessage);
        console.error('Error loading AC details:', error);
        console.error('Error response:', error.response?.data);
      }
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
    // Check if manager is unlocked
    if (user?.status !== 'unlocked') {
      toast.error('Only unlocked managers can change temperature');
      return;
    }
    
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
        
        // Check if organization is OFF - prevent temperature change
        if (org && !(org.isOrganizationOn === true || org.isOrganizationOn === 'true')) {
          toast.error('Cannot change temperature: Organization is currently OFF. Please turn on the organization first.');
          setTemperatureLoading(prev => ({ ...prev, [key]: false }));
          return;
        }
        
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
        const venue = data.organizations
          .flatMap(org => org.venues || [])
          .find(v => v.id === id);
        
        // Check if venue is OFF - prevent temperature change
        if (venue && !(venue.isVenueOn === true || venue.isVenueOn === 'true')) {
          toast.error('Cannot change temperature: Venue is currently OFF. Please turn on the venue first.');
          setTemperatureLoading(prev => ({ ...prev, [key]: false }));
          return;
        }
        
        // Check if organization is OFF - prevent temperature change
        if (venue && venue.organizationId) {
          const org = data.organizations.find(o => o.id === venue.organizationId);
          if (org && !(org.isOrganizationOn === true || org.isOrganizationOn === 'true')) {
            toast.error('Cannot change temperature: Organization is currently OFF. Please turn on the organization first.');
            setTemperatureLoading(prev => ({ ...prev, [key]: false }));
            return;
          }
        }
        
        response = await managerAPI.setVenueTemperature(id, temperature);
        responseTemp = response?.data?.venue?.temperature ?? response?.data?.temperature ?? temperature;
        responseOrgTemp = response?.data?.organization?.temperature;
        responseOrgMixed = response?.data?.organization?.hasMixedTemperatures;
        orgIdFromResponse = response?.data?.organization?.id ?? response?.data?.organizationId;
        
        // Log the action (venue already declared above)
        
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
        
        // Check if device is actually connected via websocket - prevent false data
        if (ac && ac.serialNumber && !connectedDevices.has(ac.serialNumber)) {
          toast.error('Cannot change temperature: AC device is not connected. Please ensure the device is online and connected.');
          setTemperatureLoading(prev => ({ ...prev, [key]: false }));
          return;
        }
        
        // Check if device is OFF - prevent temperature change
        if (ac && !(ac.isOn === true || ac.isOn === 'true')) {
          toast.error('Cannot change temperature: Device is currently OFF. Please turn on the device first.');
          setTemperatureLoading(prev => ({ ...prev, [key]: false }));
          return;
        }
        
        // Check if venue is OFF - prevent temperature change
        if (ac && ac.venueId) {
          const venue = data.organizations?.flatMap(org => org.venues || []).find(v => v.id === ac.venueId);
          if (venue && !(venue.isVenueOn === true || venue.isVenueOn === 'true')) {
            toast.error('Cannot change temperature: Venue is currently OFF. Please turn on the venue first.');
            setTemperatureLoading(prev => ({ ...prev, [key]: false }));
            return;
          }
          
          // Check if organization is OFF - prevent temperature change
          if (venue && venue.organizationId) {
            const org = data.organizations.find(o => o.id === venue.organizationId);
            if (org && !(org.isOrganizationOn === true || org.isOrganizationOn === 'true')) {
              toast.error('Cannot change temperature: Organization is currently OFF. Please turn on the organization first.');
              setTemperatureLoading(prev => ({ ...prev, [key]: false }));
              return;
            }
          }
        }
        
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
      // Check if manager is unlocked
      if (user?.status !== 'unlocked') {
        toast.error('Only unlocked managers can toggle AC power');
        return;
      }
      
      // If targetState is not provided, toggle to opposite of current state
      const ac = data.acs.find(a => a.id === acId);
      if (!ac) {
        toast.error('AC device not found');
        console.error('AC not found in data.acs:', acId, 'Available ACs:', data.acs.map(a => a.id));
        return;
      }
      
      // Check if device is actually connected via websocket - prevent false data
      if (ac.serialNumber && !connectedDevices.has(ac.serialNumber)) {
        toast.error('Cannot change power: AC device is not connected. Please ensure the device is online and connected.');
        setAcPowerLoading(prev => ({ ...prev, [acId]: false }));
        return;
      }
      
      const currentState = ac.isOn || false;
      const newState = targetState !== undefined ? targetState : !currentState;
      
      console.log('🔌 Toggling AC power:', {
        acId,
        acName: ac.name,
        currentState,
        newState,
        targetState
      });
      
      setAcPowerLoading(prev => ({ ...prev, [acId]: true }));
      const response = await managerAPI.toggleManagerACPower(acId, newState);
      
      console.log('✅ Toggle AC power response:', response?.data);
      
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
      } else {
        // If response doesn't have updated AC, update manually
        setData(prev => ({
          ...prev,
          acs: prev.acs.map(a => a.id === acId ? { ...a, isOn: finalState } : a)
        }));
      }
      
      // Refresh data to get latest state
      await loadData(false);
      
      // Update state again after loadData to ensure consistency
      setData(prev => ({
        ...prev,
        acs: prev.acs.map(a => a.id === acId ? { ...a, isOn: finalState } : a)
      }));
    } catch (error) {
      console.error('❌ Toggle AC power error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = getRestrictionMessage(error);
      toast.error(errorMessage);
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
    { id: 'venue-dashboard', label: 'Dashboard', icon: MapPin },
    { id: 'dashboard', label: 'Overview', icon: BarChart3 },
    { id: 'organizations', label: 'Organizations', icon: Building, count: data.organizations.length },
    { id: 'venues', label: 'Venues', icon: MapPin, count: data.organizations.reduce((sum, org) => sum + (org.venues?.length || 0), 0) },
    { id: 'acs', label: 'AC Devices', icon: Thermometer, count: data.acs.length },
    { id: 'events', label: 'Events', icon: Calendar, count: Array.isArray(data.events) ? data.events.length : 0 },
    { id: 'energy', label: 'Energy Consumption', icon: Zap },
    { id: 'alerts', label: 'Alerts', icon: AlertCircle, count: alerts.length, badge: alerts.length > 0 ? 'red' : null }
  ];

  // Auto-select first venue when dashboard tab is clicked and no venue is selected
  useEffect(() => {
    if (activeTab === 'venue-dashboard') {
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
      
      // If no venue is selected and venues are available, auto-select first venue
      if (!selectedVenueId && allVenues.length > 0) {
        // If organization is selected, select first venue from that org
        if (selectedOrgId) {
          const orgVenues = allVenues.filter(v => 
            v.organizationId === selectedOrgId || 
            (v.organization && v.organization.id === selectedOrgId)
          );
          if (orgVenues.length > 0) {
            setSelectedVenueId(orgVenues[0].id);
          }
        } else {
          // Otherwise, select first venue from all venues
          setSelectedVenueId(allVenues[0].id);
        }
      }
      
      // If organization is selected but no venue, auto-select first venue from that org
      if (selectedOrgId && !selectedVenueId) {
        const orgVenues = allVenues.filter(v => 
          v.organizationId === selectedOrgId || 
          (v.organization && v.organization.id === selectedOrgId)
        );
        if (orgVenues.length > 0) {
          setSelectedVenueId(orgVenues[0].id);
        }
      }
    }
  }, [activeTab, data.organizations, selectedOrgId, selectedVenueId]);

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
        return (
          <DashboardView
            initialLoading={initialLoading}
            data={data}
            alerts={alerts}
            userStatus={user?.status}
            role="manager"
            onCreateAC={null}
          />
        );
      case 'venue-dashboard':
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
        
        // Check if manager has organizations allocated
        const hasOrganizations = data.organizations && data.organizations.length > 0;
        
        // Get current venue and its organization (if venue is selected)
        const currentVenue = selectedVenueId ? allVenues.find(v => v.id === selectedVenueId) : null;
        const currentOrg = currentVenue ? data.organizations.find(o => 
          o.id === currentVenue.organizationId || 
          (o.venues && o.venues.some(v => v.id === currentVenue.id)) ||
          o.id === selectedOrgId
        ) : (selectedOrgId ? data.organizations.find(o => o.id === selectedOrgId) : null);
        
        // Get filtered venues for selected organization (or all venues if no org selected)
        const filteredVenues = currentOrg ? allVenues.filter(v => 
          v.organizationId === currentOrg.id || 
          (currentOrg.venues && currentOrg.venues.some(ov => ov.id === v.id)) ||
          (v.organization && v.organization.id === currentOrg.id)
        ) : allVenues;
        
        return (
          <div className="w-full min-h-screen">
            {/* Show venue details - VenueDetailsPage has its own dropdowns */}
            {selectedVenueId ? (
              <VenueDetailsPage 
                venueIdProp={selectedVenueId} 
                hideHeader={true} 
                hasOrganizations={hasOrganizations}
                onVenueChange={(newVenueId) => setSelectedVenueId(newVenueId)}
                onEventCreated={async () => {
                  // Reload events list in ManagerDashboard when event is created from venue detail page
                  console.log('🔄 [ManagerDashboard] Event created/updated from venue detail - will reload events');
                  setTimeout(async () => {
                    console.log('🔄 [ManagerDashboard] Reloading events after creation from venue detail page');
                    try {
                      await loadEvents();
                      console.log('✅ [ManagerDashboard] Events reloaded successfully');
                      // If Events tab is active, show success message
                      if (activeTab === 'events') {
                        toast.success('Events list refreshed');
                      }
                    } catch (error) {
                      console.error('❌ [ManagerDashboard] Failed to reload events:', error);
                      toast.error('Failed to refresh events list');
                    }
                  }, 800);
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-64 px-6">
                <div className="text-center">
                  <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Select a Venue</h3>
                  <p className="text-gray-500">
                    Please select a venue from the dropdowns to view dashboard details.
                  </p>
                </div>
              </div>
            )}
          </div>
        );
        case 'events':
          // Format date/time functions
          const formatDateTime = (dateString) => {
            if (!dateString) return 'N/A';
            try {
              let date;
              let originalInput = dateString;
              if (dateString instanceof Date) {
                date = dateString;
              } else if (typeof dateString === 'string') {
                let dateValue = String(dateString).trim();
                if (dateValue.includes(' ') && !dateValue.includes('T')) {
                  dateValue = dateValue.replace(/\s+/, 'T');
                }
                const hasZ = dateValue.endsWith('Z');
                const hasOffset = dateValue.match(/[+-]\d{2}:?\d{2}$/);
                const hasPKTOffset = dateValue.includes('+05:00') || dateValue.includes('+0500');
                const hasTimezone = hasZ || hasOffset || hasPKTOffset;
                if (!hasTimezone && (dateValue.includes('T') || dateValue.match(/\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}/))) {
                  dateValue = dateValue.replace(/\s+$/, '').replace(/\.\d{3,}$/, '');
                  if (!dateValue.endsWith('Z')) {
                    dateValue = dateValue + 'Z';
                  }
                }
                date = new Date(dateValue);
                if (isNaN(date.getTime())) {
                  console.error('❌ Failed to parse date:', { original: originalInput, attempted: dateValue });
                  return 'Invalid Date';
                }
              } else {
                return 'Invalid Date';
              }
              if (isNaN(date.getTime())) {
                return 'Invalid Date';
              }
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
              return formatter.format(date);
            } catch (e) {
              console.error('❌ Date formatting exception:', e, dateString);
              return 'Invalid Date';
            }
          };

          const formatTime = (dateString) => {
            if (!dateString) return 'N/A';
            try {
              let date;
              if (dateString instanceof Date) {
                if (isNaN(dateString.getTime())) return 'N/A';
                date = dateString;
              } else if (typeof dateString === 'string') {
                let dateValue = String(dateString).trim();
                if (dateValue.includes(' ') && !dateValue.includes('T')) {
                  dateValue = dateValue.replace(/\s+/, 'T');
                }
                const hasZ = dateValue.endsWith('Z');
                const hasOffset = dateValue.match(/[+-]\d{2}:?\d{2}$/);
                const hasPKTOffset = dateValue.includes('+05:00') || dateValue.includes('+0500');
                const hasTimezone = hasZ || hasOffset || hasPKTOffset;
                if (!hasTimezone && (dateValue.includes('T') || dateValue.match(/\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}/))) {
                  dateValue = dateValue.replace(/\s+$/, '').replace(/\.\d{3,}$/, '');
                  if (!dateValue.endsWith('Z')) {
                    dateValue = dateValue + 'Z';
                  }
                }
                date = new Date(dateValue);
                if (isNaN(date.getTime())) {
                  return 'N/A';
                }
              } else {
                return 'N/A';
              }
              const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Karachi',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              });
              return formatter.format(date);
            } catch (e) {
              console.error('❌ Time formatting error:', e, dateString);
              return 'N/A';
            }
          };

          const getStatusBadge = (status, isDisabled, startTime, endTime) => {
            if (isDisabled) {
              return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-400 text-white">Disabled</span>;
            }
            const now = new Date();
            const nowUTC = new Date(now.toISOString());
            const eventStartTime = startTime ? new Date(startTime) : null;
            const eventEndTime = endTime ? new Date(endTime) : null;
            const isWaitingToStart = eventStartTime && eventStartTime.getTime() > nowUTC.getTime();
            const isCompleted = (eventEndTime && eventEndTime.getTime() <= nowUTC.getTime()) || status === 'completed';
            let actualStatus = status;
            if (isCompleted) {
              actualStatus = 'completed';
            } else if (isWaitingToStart && (status === 'scheduled' || status === 'active')) {
              actualStatus = 'waiting';
            } else if (status === 'active' && !isCompleted) {
              actualStatus = 'active';
            }
            const statusConfig = {
              waiting: { color: 'bg-yellow-400 text-white shadow-sm', text: 'Waiting' },
              scheduled: { color: 'bg-blue-500 text-white shadow-sm', text: 'Scheduled' },
              active: { color: 'bg-green-500 text-white shadow-sm', text: 'In Process' },
              completed: { color: 'bg-gray-400 text-white shadow-sm', text: 'Completed' },
              stopped: { color: 'bg-red-500 text-white shadow-sm', text: 'Stopped' },
              cancelled: { color: 'bg-gray-400 text-white shadow-sm', text: 'Cancelled' }
            };
            const config = statusConfig[actualStatus] || { color: 'bg-gray-400 text-white shadow-sm', text: status.charAt(0).toUpperCase() + status.slice(1) };
            return (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
                {config.text}
              </span>
            );
          };

          return (
            <EventsView
              events={data.events || []}
              eventsLoading={eventsLoading}
              eventActionLoading={eventActionLoading}
              userStatus={user?.status}
              role="manager"
              onCreateEvent={() => {
                setSelectedEvent(null);
                setShowEventTypeSelection(true);
              }}
              onRefreshEvents={loadEvents}
              onEventAction={handleEventAction}
              onEditEvent={(event) => {
                setSelectedEvent(event);
                setShowEventModal(true);
              }}
              formatDateTime={formatDateTime}
              formatTime={formatTime}
              getStatusBadge={getStatusBadge}
            />
          );
      case 'venues': {
        // Get all venues from all organizations
        const venuesList = data.organizations.flatMap(org => 
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
            <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl shadow-2xl p-6 border-2 border-blue-400 overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>
              <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="flex items-center space-x-5">
                  <div className="bg-white bg-opacity-25 rounded-2xl p-4 shadow-xl transform group-hover:rotate-12 transition-transform duration-300">
                    <MapPin className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white mb-2 drop-shadow-lg">Venues</h2>
                    <p className="text-blue-100 text-sm sm:text-base font-medium mb-3">Manage all venues and locations</p>
                    <span className="inline-block bg-white bg-opacity-25 text-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-lg backdrop-blur-sm">
                      {venuesList.length} Total Venue{venuesList.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* View Toggle */}
                  <div className="flex items-center bg-white bg-opacity-20 rounded-lg p-1">
                    <button
                      onClick={() => setVenueViewMode('cards')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        venueViewMode === 'cards'
                          ? 'bg-white text-blue-600 shadow-md'
                          : 'text-white hover:bg-white hover:bg-opacity-10'
                      }`}
                    >
                      Cards
                    </button>
                    <button
                      onClick={() => setVenueViewMode('table')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        venueViewMode === 'table'
                          ? 'bg-white text-blue-600 shadow-md'
                          : 'text-white hover:bg-white hover:bg-opacity-10'
                      }`}
                    >
                      Table
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {venuesList.length === 0 ? (
              <div className="bg-gradient-to-br from-white to-blue-50 p-8 sm:p-12 lg:p-16 rounded-xl sm:rounded-2xl shadow-2xl text-center border-2 border-blue-200">
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center shadow-lg">
                  <MapPin className="w-12 h-12 text-blue-600" />
                </div>
                <p className="text-gray-800 text-xl sm:text-2xl font-bold mb-3">No Venues Found</p>
                <p className="text-gray-600 text-sm sm:text-base mb-6">No venues are currently assigned to your organizations</p>
              </div>
            ) : venueViewMode === 'table' ? (
              <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Venue Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Devices</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temperature</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {venuesList.map(venue => {
                        const venueACs = data.acs.filter(ac => {
                          if (venue.organizationId && ac.venueId === venue.organizationId) {
                            return false;
                          }
                          return ac.venueId === venue.id;
                        });
                        const isVenueOn = venue.isVenueOn === true || venue.isVenueOn === 'true' || venue.isVenueOn === 1;
                        const currentTemp = localTemperatures[`venue-${venue.id}`] !== undefined 
                          ? localTemperatures[`venue-${venue.id}`] 
                          : (venue.temperature ?? 16);
                        const isLoading = temperatureLoading[`venue-${venue.id}`];
                        
                        return (
                          <tr key={venue.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{venue.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{venue.organization?.name || 'N/A'}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{venueACs.length} device{venueACs.length !== 1 ? 's' : ''}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => {
                                    const newTemp = Math.max(16, currentTemp - 1);
                                    handleTemperatureChange('venue', venue.id, newTemp);
                                    handleSetVenueTemperature(venue.id, newTemp);
                                  }}
                                  disabled={isLoading || user?.status === 'restricted' || user?.status === 'locked' || currentTemp <= 16}
                                  className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold text-xs"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  type="number"
                                  min="16"
                                  max="30"
                                  step="1"
                                  value={currentTemp}
                                  disabled={isLoading || user?.status === 'restricted' || user?.status === 'locked'}
                                  className={`w-14 px-1 py-1 text-xs text-center font-bold border rounded bg-white transition-colors ${
                                    isLoading || user?.status === 'restricted' || user?.status === 'locked'
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
                                        handleSetVenueTemperature(venue.id, temp);
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
                                          handleSetVenueTemperature(venue.id, temp);
                                        }
                                      }
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => {
                                    const newTemp = Math.min(30, currentTemp + 1);
                                    handleTemperatureChange('venue', venue.id, newTemp);
                                    handleSetVenueTemperature(venue.id, newTemp);
                                  }}
                                  disabled={isLoading || user?.status === 'restricted' || user?.status === 'locked' || currentTemp >= 30}
                                  className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold text-xs"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                                {isLoading && (
                                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin ml-1"></div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => {
                                  if (user?.status !== 'restricted' && user?.status !== 'locked') {
                                    handleToggleVenuePower(venue.id, venue.isVenueOn || false);
                                  }
                                }}
                                disabled={user?.status === 'restricted' || user?.status === 'locked'}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                                  isVenueOn ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                                title={isVenueOn ? 'Turn OFF' : 'Turn ON'}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    isVenueOn ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                              <span className="ml-2 text-sm text-gray-700">
                                {isVenueOn ? 'On' : 'Off'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={() => {
                                  setSelectedVenueId(venue.id);
                                  setActiveTab('venue-dashboard');
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View venue details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
                {venuesList.map(venue => (
                  <VenueCard
                    key={venue.id}
                    venue={venue}
                    role="manager"
                    userStatus={user?.status}
                    data={data}
                    allAlerts={allAlerts}
                    localTemperatures={localTemperatures}
                    temperatureLoading={temperatureLoading}
                    isVenueDevicesRemoteLocked={isVenueDevicesRemoteLocked}
                    onTemperatureChange={handleTemperatureChange}
                    onTemperatureSet={(type, id, temp) => handleSetTemperature(type, id, temp)}
                    onTemperatureSubmit={handleTemperatureSubmit}
                    onTogglePower={(venueId, currentState) => handleToggleVenuePower(venueId, currentState)}
                    onViewDetails={(venueId) => {
                      setSelectedVenueId(venueId);
                      setActiveTab('venue-dashboard');
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      }
      case 'organizations':
        return (
          <div className="space-y-8">
            {/* Header Section - Enhanced */}
            <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl shadow-2xl p-6 border-2 border-blue-400 overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>
              <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="flex items-center space-x-5">
                  <div className="bg-white bg-opacity-25 rounded-2xl p-4 shadow-xl transform group-hover:rotate-12 transition-transform duration-300">
                    <Building className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white mb-2 drop-shadow-lg">Organizations</h2>
                    <p className="text-blue-100 text-sm sm:text-base font-medium mb-3">Manage all assigned organizations</p>
                    <span className="inline-block bg-white bg-opacity-25 text-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-lg backdrop-blur-sm">
                      {data.organizations.length} Total Organization{data.organizations.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* View Toggle */}
                  <div className="flex items-center bg-white bg-opacity-20 rounded-lg p-1">
                    <button
                      onClick={() => setOrganizationViewMode('cards')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        organizationViewMode === 'cards'
                          ? 'bg-white text-blue-600 shadow-md'
                          : 'text-white hover:bg-white hover:bg-opacity-10'
                      }`}
                    >
                      Cards
                    </button>
                    <button
                      onClick={() => setOrganizationViewMode('table')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        organizationViewMode === 'table'
                          ? 'bg-white text-blue-600 shadow-md'
                          : 'text-white hover:bg-white hover:bg-opacity-10'
                      }`}
                    >
                      Table
                    </button>
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
              organizationViewMode === 'table' ? (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Venues</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Devices</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temperature</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {data.organizations.map(org => {
                          const orgVenues = org.venues || [];
                          const orgACs = data.acs.filter(ac => 
                            ac.organizationId === org.id || ac.venueId === org.id || 
                            (org.venues && org.venues.some(v => v.id === ac.venueId))
                          );
                          const isOrgOn = org.isOrganizationOn === true || org.isOrganizationOn === 'true' || org.isOrganizationOn === 1;
                          const currentTemp = localTemperatures[`organization-${org.id}`] !== undefined 
                            ? localTemperatures[`organization-${org.id}`] 
                            : (org.temperature ?? 16);
                          const isLoading = temperatureLoading[`organization-${org.id}`];
                          
                          return (
                            <tr key={org.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{org.name}</div>
                                <div className="text-xs text-gray-500">{org.status || 'active'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-900">{orgVenues.length} venue{orgVenues.length !== 1 ? 's' : ''}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-900">{orgACs.length} device{orgACs.length !== 1 ? 's' : ''}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => {
                                      const newTemp = Math.max(16, currentTemp - 1);
                                      handleTemperatureChange('organization', org.id, newTemp);
                                      handleSetOrganizationTemperature(org.id, newTemp);
                                    }}
                                    disabled={isLoading || user?.status === 'restricted' || user?.status === 'locked' || currentTemp <= 16}
                                    className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold text-xs"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <input
                                    type="number"
                                    min="16"
                                    max="30"
                                    step="1"
                                    value={currentTemp}
                                    disabled={isLoading || user?.status === 'restricted' || user?.status === 'locked'}
                                    className={`w-14 px-1 py-1 text-xs text-center font-bold border rounded bg-white transition-colors ${
                                      isLoading || user?.status === 'restricted' || user?.status === 'locked'
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
                                          handleSetOrganizationTemperature(org.id, temp);
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
                                            handleSetOrganizationTemperature(org.id, temp);
                                          }
                                        }
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={() => {
                                      const newTemp = Math.min(30, currentTemp + 1);
                                      handleTemperatureChange('organization', org.id, newTemp);
                                      handleSetOrganizationTemperature(org.id, newTemp);
                                    }}
                                    disabled={isLoading || user?.status === 'restricted' || user?.status === 'locked' || currentTemp >= 30}
                                    className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold text-xs"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                  {isLoading && (
                                    <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin ml-1"></div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button
                                  onClick={() => {
                                    if (user?.status !== 'restricted' && user?.status !== 'locked') {
                                      handleToggleOrganizationPower(org.id, org.isOrganizationOn || false);
                                    }
                                  }}
                                  disabled={user?.status === 'restricted' || user?.status === 'locked'}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    isOrgOn ? 'bg-green-500' : 'bg-gray-300'
                                  }`}
                                  title={isOrgOn ? 'Turn OFF' : 'Turn ON'}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                      isOrgOn ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                                <span className="ml-2 text-sm text-gray-700">
                                  {isOrgOn ? 'On' : 'Off'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <button
                                  onClick={() => handleViewOrganizationDetails(org.id)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="View organization details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
                {data.organizations.map(org => (
                  <OrganizationCard
                    key={org.id}
                    org={org}
                    role="manager"
                    userStatus={user?.status}
                    data={data}
                    alerts={alerts}
                    localTemperatures={localTemperatures}
                    temperatureLoading={temperatureLoading}
                    onTemperatureChange={handleTemperatureChange}
                    onTemperatureSet={(type, id, temp) => handleSetTemperature(type, id, temp)}
                    onTemperatureSubmit={handleTemperatureSubmit}
                    onTogglePower={(orgId, currentState) => handleToggleOrganizationPower(orgId, currentState)}
                    onViewDetails={handleViewOrganizationDetails}
                    isAssignedToManager={false}
                    assignedManager={null}
                  />
                ))}
              </div>
              )
            ) : (
              <div className="bg-gradient-to-br from-white to-blue-50 p-8 sm:p-12 lg:p-16 rounded-xl sm:rounded-2xl shadow-2xl text-center border-2 border-blue-200">
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center shadow-lg">
                  <Building className="w-12 h-12 text-blue-600" />
                </div>
                <p className="text-gray-800 text-xl sm:text-2xl font-bold mb-3">No Organizations Found</p>
                <p className="text-gray-600 text-sm sm:text-base mb-6">No organizations are currently assigned to you</p>
              </div>
            )}
          </div>
        );
      case 'acs':
        return (
          <div className="space-y-8">
            {/* Header Section - Enhanced */}
            <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl shadow-2xl p-6 border-2 border-blue-400 overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>
              <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="flex items-center space-x-5">
                  <div className="bg-white bg-opacity-25 rounded-2xl p-4 shadow-xl transform group-hover:rotate-12 transition-transform duration-300">
                    <Thermometer className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white mb-2 drop-shadow-lg">AC Devices</h2>
                    <p className="text-blue-100 text-sm sm:text-base font-medium mb-3">Manage all AC devices in your organizations</p>
                    <span className="inline-block bg-white bg-opacity-25 text-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-lg backdrop-blur-sm">
                      {data.acs.length} Total AC Device{data.acs.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* View Toggle */}
                  <div className="flex items-center bg-white bg-opacity-20 rounded-lg p-1">
                    <button
                      onClick={() => setDeviceViewMode('cards')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        deviceViewMode === 'cards'
                          ? 'bg-white text-blue-600 shadow-md'
                          : 'text-white hover:bg-white hover:bg-opacity-10'
                      }`}
                    >
                      Cards
                    </button>
                    <button
                      onClick={() => setDeviceViewMode('table')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        deviceViewMode === 'table'
                          ? 'bg-white text-blue-600 shadow-md'
                          : 'text-white hover:bg-white hover:bg-opacity-10'
                      }`}
                    >
                      Table
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {data.acs.length > 0 ? (
              deviceViewMode === 'table' ? (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Venue</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temperature</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Events</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center justify-center gap-1.5">
                              <Eye className="w-4 h-4" />
                              <span>View</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {data.acs.map(ac => {
                          const org = data.organizations.find(o => 
                            o.id === ac.organizationId || 
                            (o.venues && o.venues.some(v => v.id === ac.venueId))
                          );
                          const venue = org?.venues?.find(v => v.id === ac.venueId) || 
                                       data.organizations.flatMap(o => o.venues || []).find(v => v.id === ac.venueId);
                          const deviceEvents = Array.isArray(data.events) ? data.events.filter(e => 
                            e.deviceId === ac.id && e.eventType === 'device'
                          ) : [];
                          
                          return (
                            <tr key={ac.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{ac.name}</div>
                                <div className="text-xs text-gray-500">{ac.serialNumber || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-900">{org?.name || 'N/A'}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-900">{venue?.name || 'N/A'}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-medium text-gray-900">{ac.temperature || 16}°C</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  ac.isOn ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {ac.isOn ? 'ON' : 'OFF'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-900">{deviceEvents.length} event{deviceEvents.length !== 1 ? 's' : ''}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <button
                                  onClick={() => handleViewACDetails(ac.id)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="View device details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
                {data.acs.map(ac => (
                  <ACCard
                    key={ac.id}
                    ac={ac}
                    role="manager"
                    userStatus={user?.status}
                    data={data}
                    alerts={alerts}
                    allAlerts={allAlerts}
                    localTemperatures={localTemperatures}
                    temperatureLoading={temperatureLoading}
                    isDeviceRemoteLocked={isDeviceRemoteLocked}
                    onTemperatureChange={handleTemperatureChange}
                    onTemperatureSet={(type, id, temp) => handleSetTemperature(type, id, temp)}
                    onTemperatureSubmit={handleTemperatureSubmit}
                    onTogglePower={(acId, currentState) => handleToggleACPower(acId, !currentState)}
                    onViewDetails={handleViewACDetails}
                    onCreateEvent={(acId) => {
                      const tempEvent = { deviceId: String(acId) };
                      setSelectedEvent(tempEvent);
                      setShowEventTypeSelection(true);
                    }}
                    setSelectedEvent={setSelectedEvent}
                    setShowEventTypeSelection={setShowEventTypeSelection}
                  />
                ))}
              </div>
              )
            ) : (
              <div className="bg-gradient-to-br from-white to-blue-50 p-8 sm:p-12 lg:p-16 rounded-xl sm:rounded-2xl shadow-2xl text-center border-2 border-blue-200">
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center shadow-lg">
                  <Thermometer className="w-12 h-12 text-blue-600" />
                </div>
                <p className="text-gray-800 text-xl sm:text-2xl font-bold mb-3">No AC Devices Found</p>
                <p className="text-gray-600 text-sm sm:text-base mb-6">No AC devices are currently assigned to your organizations</p>
              </div>
            )}
          </div>
        );
      case 'energy': {
        const totalEnergy = data.acs.reduce((sum, ac) => sum + (ac.totalEnergyConsumed || 0), 0);
        const activeACsCount = data.acs.filter(ac => ac.isOn).length;
        const totalACsCount = data.acs.length;
        const hasOrganizations = data.organizations && data.organizations.length > 0;
        
        // Helper function to find organization and venue for a device
        const getDeviceOrgAndVenue = (ac) => {
          let org = null;
          let venue = null;
          
          if (ac.organization) {
            org = ac.organization;
          } else if (ac.organizationId) {
            org = data.organizations.find(o => o.id === ac.organizationId);
          }
          
          if (!org && ac.venueId) {
            venue = data.organizations.flatMap(o => o.venues || []).find(v => v.id === ac.venueId);
            if (venue) {
              org = data.organizations.find(o => 
                o.id === venue.organizationId || 
                (o.venues && o.venues.some(v => v.id === venue.id))
              );
            }
          }
          
          if (!venue && ac.venueId) {
            venue = data.organizations.flatMap(o => o.venues || []).find(v => v.id === ac.venueId);
          }
          
          return { org, venue };
        };
        
        return (
          <div className="space-y-6 w-full max-w-full overflow-x-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Zap className="w-6 h-6 mr-2 text-blue-600" />
                  Energy Consumption
                </h2>
                <p className="text-sm text-gray-600 mt-1">Monitor and track energy usage across all AC devices</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDownloadModal(true)}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </button>
              <button
                onClick={() => {
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
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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

            {/* View Mode Toggle Buttons */}
            <div className="flex gap-2 mb-4 items-center">
              <button
                onClick={() => setEnergyViewMode('device')}
                className={`flex items-center px-4 py-2 rounded-lg font-semibold transition-all ${
                  energyViewMode === 'device'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Thermometer className="w-4 h-4 mr-2" />
                Energy by Device
              </button>
              <button
                onClick={() => setEnergyViewMode('venue')}
                className={`flex items-center px-4 py-2 rounded-lg font-semibold transition-all ${
                  energyViewMode === 'venue'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Energy by Venue
              </button>
              <button
                onClick={() => setEnergyViewMode('organization')}
                className={`flex items-center px-4 py-2 rounded-lg font-semibold transition-all ${
                  energyViewMode === 'organization'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Building className="w-4 h-4 mr-2" />
                Energy by Organization
              </button>
            </div>

            {/* Organizations Energy Consumption */}
            {energyViewMode === 'organization' && (
            <div className="w-full max-w-full overflow-x-hidden">
                {!hasOrganizations ? (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-6">
                    <div className="flex items-start">
                      <AlertCircle className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Organizations Allocated</h3>
                        <p className="text-sm text-yellow-700">
                          You don't have any organizations allocated to your account. Please contact an administrator to assign organizations to view energy consumption by organization.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Building className="w-5 h-5 mr-2 text-blue-600" />
                Energy by Organization
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {data.organizations.map(org => {
                  const orgEnergy = energyData.organizations[org.id];
                  const orgACs = data.acs.filter(ac => 
                          ac.organizationId === org.id || ac.organization?.id === org.id ||
                          (org.venues && org.venues.some(v => v.id === ac.venueId))
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
                  </>
                )}
            </div>
            )}

            {/* Venues Energy Consumption */}
            {energyViewMode === 'venue' && (
              <div className="w-full max-w-full overflow-x-hidden">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                  Energy by Venue
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {data.organizations.flatMap(org => (org.venues || []).map(venue => {
                    const venueACs = data.acs.filter(ac => {
                      if (venue.organizationId && ac.venueId === venue.organizationId) {
                        return false;
                      }
                      return ac.venueId === venue.id;
                    });
                    
                    const venueEnergy = venueACs.reduce((sum, ac) => sum + (ac.totalEnergyConsumed || 0), 0);
                    const venueActiveACs = venueACs.filter(ac => ac.isOn).length;
                    
                    return (
                      <div key={venue.id} className="bg-white rounded-lg shadow-md p-5 border border-gray-200 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{venue.name}</h4>
                            <p className="text-xs text-gray-500 mb-1">Organization: {org.name}</p>
                            <p className="text-xs text-gray-500">{venueACs.length} AC device{venueACs.length !== 1 ? 's' : ''}</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedVenueId(venue.id);
                              setActiveTab('venue-dashboard');
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="View venue details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Total Energy:</span>
                            <span className="text-lg font-bold text-blue-600">
                              {venueEnergy.toFixed(2)} kWh
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Active ACs:</span>
                            <span className={`text-sm font-medium ${venueActiveACs > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                              {venueActiveACs} / {venueACs.length}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }))}
                </div>
              </div>
            )}

            {/* AC Devices Energy Consumption */}
            {energyViewMode === 'device' && (
            <div className="w-full max-w-full overflow-x-hidden">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Thermometer className="w-5 h-5 mr-2 text-blue-600" />
                Energy by AC Device
              </h3>
              <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-300 w-full max-w-full">
                <div className="overflow-x-auto w-full" style={{ maxWidth: '100%', overflowX: 'auto', overflowY: 'visible' }}>
                  <table className="min-w-full divide-y divide-gray-200 border-collapse" style={{ minWidth: '1200px', width: '100%', tableLayout: 'auto' }}>
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">AC Device</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Organization</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Ton</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Total Energy</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">On Load</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Current Rate</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Overload</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.acs.map(ac => {
                        const acEnergy = energyData.acs[ac.id];
                        const isLoading = energyLoading[`ac-${ac.id}`];
                        
                        return (
                          <tr key={ac.id} className="hover:bg-gray-50 border-b border-gray-200">
                            <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                              <div className="flex items-center">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{ac.name}</div>
                                  <div className="text-sm text-gray-500">{ac.brand} {ac.model}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                              {(() => {
                                const { org, venue } = getDeviceOrgAndVenue(ac);
                                return (
                                  <div className="text-sm">
                                    <div className="font-medium text-gray-900">
                                      {org ? org.name : 'N/A'}
                                    </div>
                                    {venue && (
                                      <div className="text-xs text-gray-500">
                                        Venue: {venue.name}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded border border-gray-300">
                                {ac.ton} Ton
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                              <span className={`px-2 py-1 text-xs font-medium rounded border ${
                                ac.isOn 
                                  ? 'bg-green-100 text-green-800 border-green-300' 
                                  : 'bg-gray-100 text-gray-800 border-gray-300'
                              }`}>
                                {ac.isOn ? 'ON' : 'OFF'}
                              </span>
                              {acEnergy?.isOnStartup && (
                                <span className="ml-2 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded border border-yellow-300">
                                  Startup
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                              <div className="text-sm font-semibold text-blue-600">
                                {acEnergy ? acEnergy.totalEnergyConsumed.toFixed(2) : (ac.totalEnergyConsumed || 0).toFixed(2)} kWh
                              </div>
                            </td>
                            {/* On Load Column (Base Rate) */}
                            <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
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
                            <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
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
            )}
          </div>
        );
      }
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
      <aside className={`${sidebarOpen ? 'w-56 sm:w-64 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-14 xl:w-16'} bg-gradient-to-b from-blue-900 to-blue-800 text-white transition-all duration-300 ease-in-out flex flex-col fixed h-screen z-30`}>
        {/* Sidebar Header */}
        <div className={`p-3 sm:p-4 border-b border-blue-700 flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center lg:flex-col lg:space-y-4'}`}>
          {sidebarOpen ? (
            <div className="flex items-center space-x-3">
              <div className="bg-white rounded-lg p-2 flex items-center justify-center shadow-sm">
                <img src="/assets/logo.png" alt="IOTFIY Logo" className="w-6 h-6 object-contain" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Manager Panel</h2>
                <p className="text-xs text-blue-200 font-medium mt-0.5">Control Center</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-2 flex items-center justify-center shadow-sm">
              <img src="/assets/logo.png" alt="IOTFIY Logo" className="w-6 h-6 object-contain" />
            </div>
          )}
          {/* Collapse button - only show when sidebar is open, hide expand button on dashboard/venue-dashboard */}
          {sidebarOpen ? (
            <button
              onClick={() => {
                // Allow collapse on all tabs except dashboard/venue-dashboard (sidebar always collapsed on these tabs)
                if (activeTab !== 'dashboard' && activeTab !== 'venue-dashboard') {
                  setSidebarOpen(false);
                }
              }}
              className={`p-2 hover:bg-blue-700 rounded-lg transition-colors ${(activeTab === 'dashboard' || activeTab === 'venue-dashboard') ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={(activeTab === 'dashboard' || activeTab === 'venue-dashboard') ? 'Sidebar cannot be collapsed on dashboard' : 'Collapse sidebar'}
              disabled={activeTab === 'dashboard' || activeTab === 'venue-dashboard'}
            >
              <Menu className="w-5 h-5" />
            </button>
          ) : (
            // Show expand button only if NOT on dashboard/venue-dashboard tab
            activeTab !== 'dashboard' && activeTab !== 'venue-dashboard' && (
              <button
                onClick={() => {
                  // Double-check: don't allow expansion on dashboard/venue-dashboard
                  if (activeTab !== 'dashboard' && activeTab !== 'venue-dashboard') {
                    setSidebarOpen(true);
                  }
                }}
                className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
                title="Expand sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-1.5">
          <div className="px-2 space-y-0.5">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    // Force close sidebar ALWAYS when switching to dashboard or venue-dashboard tab
                    if (tab.id === 'dashboard' || tab.id === 'venue-dashboard') {
                      setSidebarOpen(false);
                    } else {
                      // Close sidebar on mobile after selection (for non-dashboard tabs)
                      if (window.innerWidth < 1024) {
                        setSidebarOpen(false);
                      }
                      // For desktop, preserve sidebar state on other tabs (user can expand/collapse freely)
                    }
                  }}
                  className={`w-full flex items-center ${sidebarOpen ? 'justify-start px-2' : 'justify-center px-2'} py-1.5 rounded-lg transition-all duration-200 touch-manipulation focus:outline-none focus:ring-0 ${
                    isActive
                      ? 'bg-white text-blue-600 shadow-lg font-semibold'
                      : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                  }`}
                  title={!sidebarOpen ? tab.label : ''}
                >
                  <Icon className={`${sidebarOpen ? 'w-4 h-4 mr-2' : 'w-4 h-4'} flex-shrink-0`} />
                  {sidebarOpen && (
                    <>
                      <span className="text-xs font-medium flex-1 text-left tracking-tight">{tab.label}</span>
                      {tab.count !== undefined && (
                        <span className={`ml-1.5 py-0.5 px-1.5 rounded-full text-[10px] font-bold min-w-[18px] text-center ${
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
        <div className="p-2 border-t border-blue-700">
          <div className={`${sidebarOpen ? 'px-2.5' : 'px-2'} py-2 bg-blue-700 rounded-lg`}>
            <div className={`flex items-center ${sidebarOpen ? 'space-x-2' : 'justify-center'}`}>
              <div className="bg-blue-600 rounded-full p-1.5 flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{user?.name || 'Manager'}</p>
                  <p className="text-[10px] text-blue-200 truncate mt-0.5 leading-tight">{user?.email || 'manager@example.com'}</p>
                {user?.status && (
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium mt-1.5 capitalize ${
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
      <div 
        className="flex-1 w-full transition-all duration-300 bg-gray-50 min-h-screen"
        style={{
          marginLeft: contentMarginLeft,
          width: contentWidth,
        }}
      >
        {/* Top Header */}
        <header className="bg-white shadow-md border-b sticky top-0 z-10 w-full">
          <div className="pl-2 sm:pl-3 pr-4 sm:pr-6 py-4 w-full">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    // Don't allow toggle on dashboard tab
                    if (activeTab !== 'dashboard') {
                      setSidebarOpen(!sidebarOpen);
                    }
                  }}
                  className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={activeTab === 'dashboard'}
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
        <main className={`${sidebarOpen ? 'pl-2 sm:pl-3' : 'pl-4 sm:pl-6'} pr-4 sm:pr-6 pt-4 sm:pt-6 pb-4 sm:pb-6 w-full overflow-x-hidden`} style={{ maxWidth: '100%' }}>
          <div className="w-full max-w-full overflow-x-hidden">
            {/* Main Content */}
          {renderContent()}
        </div>
        </main>
      </div>

      {/* Event Type Selection Modal */}
      {showEventTypeSelection && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-10 backdrop-blur-[2px] flex items-center justify-center z-[100]"
          onClick={() => {
            setShowEventTypeSelection(false);
            setSelectedEventType(null);
            setSelectedEvent(null);
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-gray-900 text-center flex-1">Choose Option</h3>
              <button
                onClick={() => {
                  setShowEventTypeSelection(false);
                  setSelectedEventType(null);
                  setSelectedEvent(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Options */}
            <div className="grid grid-cols-3 gap-6">
              {/* Simple Event */}
              <button
                onClick={() => {
                  setSelectedEventType('simple');
                  setShowEventTypeSelection(false);
                  setShowEventModal(true);
                }}
                className="relative group flex flex-col items-center p-6 rounded-xl border-2 border-gray-200 hover:border-blue-500 transition-all duration-200"
              >
                <div className="relative mb-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                    <Calendar className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full"></div>
                </div>
                <span className="text-sm font-semibold text-gray-900">Simple Event</span>
              </button>

              {/* Recurring Event */}
              <button
                onClick={() => {
                  setSelectedEventType('recurring');
                  setShowEventTypeSelection(false);
                  setShowEventModal(true);
                }}
                className="relative group flex flex-col items-center p-6 rounded-xl border-2 border-gray-300 bg-gray-50 hover:border-purple-500 transition-all duration-200"
              >
                <div className="relative mb-4">
                  <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-500 transition-colors">
                    <RefreshCw className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full"></div>
                </div>
                <span className="text-sm font-semibold text-gray-900">Recurring Event</span>
                <div className="absolute bottom-2 right-2">
                  <Check className="w-5 h-5 text-cyan-500" />
                </div>
              </button>

              {/* Device Power Control */}
              <button
                onClick={() => {
                  setSelectedEventType('device-power');
                  setShowEventTypeSelection(false);
                  setShowEventModal(true);
                }}
                className="relative group flex flex-col items-center p-6 rounded-xl border-2 border-gray-200 hover:border-green-500 transition-all duration-200"
              >
                <div className="relative mb-4">
                  <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-500 transition-colors">
                    <Power className="w-8 h-8 text-green-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full"></div>
                </div>
                <span className="text-sm font-semibold text-gray-900">Device Power</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Organization Details Modal */}
      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99]">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedEvent?.id ? 'Edit Event' : selectedEventType === 'recurring' ? 'Create Recurring Event' : selectedEventType === 'simple' ? 'Create Simple Event' : selectedEventType === 'device-power' ? 'Create On/Off Device Event' : 'Create Event'}
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
                eventType={selectedEventType}
                disableDeviceSelection={selectedEvent?.deviceId && !selectedEvent?.id}
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

      {/* Energy Download Modal */}
      {showDownloadModal && (
        <>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { 
                opacity: 0;
                transform: translateY(20px) scale(0.95);
              }
              to { 
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
          `}</style>
          <div 
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{
              animation: 'fadeIn 0.3s ease-out',
              backgroundColor: 'rgba(37, 99, 235, 0.9)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowDownloadModal(false);
                setEnergyFilters({ year: null, month: null, organizationId: null, venueId: null, deviceId: null });
              }
            }}
          >
            <div 
              className="absolute inset-0 bg-black bg-opacity-60"
              style={{
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)'
              }}
            ></div>
            <div 
              className="bg-white rounded-xl shadow-2xl shadow-gray-900/20 p-0 w-full max-w-5xl transform transition-all relative z-10"
              style={{
                animation: 'slideUp 0.4s ease-out',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Download Energy Report</h3>
                    <p className="text-sm text-gray-500 mt-1">Select filters to customize your report</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowDownloadModal(false);
                      setEnergyFilters({ year: null, month: null, organizationId: null, venueId: null, deviceId: null });
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content Area - Split Layout like EventForm */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                {/* Left Section - Filters (Blue) */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6">
                  <h3 className="text-xl font-bold text-blue-700 mb-6">Report Filters</h3>
                  <div className="space-y-4">
                    {/* Month Selector */}
                    <div>
                      <label className="block text-sm font-semibold text-blue-900 mb-3">
                        Select Month
                      </label>
                      <input
                        type="month"
                        value={energyFilters.month || ''}
                        onChange={(e) => setEnergyFilters(prev => ({ ...prev, month: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-all"
                      />
                    </div>

                    {/* Organization Dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Organization
                      </label>
                      <div className="relative">
                        <select
                          value={energyFilters.organizationId || ''}
                          onChange={(e) => {
                            const orgId = e.target.value ? parseInt(e.target.value) : null;
                            setEnergyFilters(prev => ({ 
                              ...prev, 
                              organizationId: orgId,
                              venueId: null,
                              deviceId: null
                            }));
                          }}
                          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all cursor-pointer pr-10"
                        >
                          <option value="">All Organizations</option>
                          {data.organizations.map(org => (
                            <option key={org.id} value={org.id}>{org.name}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Venue Dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Venue
                      </label>
                      <div className="relative">
                        <select
                          value={energyFilters.venueId || ''}
                          onChange={(e) => {
                            const venueId = e.target.value ? parseInt(e.target.value) : null;
                            setEnergyFilters(prev => ({ 
                              ...prev, 
                              venueId: venueId,
                              deviceId: null
                            }));
                          }}
                          disabled={!energyFilters.organizationId}
                          className={`w-full px-3 py-2.5 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all pr-10 ${
                            energyFilters.organizationId
                              ? 'bg-gray-50 border border-gray-300 text-gray-700 cursor-pointer'
                              : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <option value="">All Venues</option>
                          {energyFilters.organizationId && data.organizations
                            .flatMap(org => org.venues || [])
                            .filter(venue => 
                              venue.organizationId === energyFilters.organizationId ||
                              (venue.organization && venue.organization.id === energyFilters.organizationId)
                            )
                            .map(venue => (
                              <option key={venue.id} value={venue.id}>{venue.name}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {!energyFilters.organizationId && (
                        <p className="text-xs text-gray-400 mt-1.5">Please select an organization first</p>
                      )}
                    </div>

                    {/* Device Dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Device
                      </label>
                      <div className="relative">
                        <select
                          value={energyFilters.deviceId || ''}
                          onChange={(e) => {
                            const deviceId = e.target.value ? parseInt(e.target.value) : null;
                            setEnergyFilters(prev => ({ ...prev, deviceId: deviceId }));
                          }}
                          disabled={!energyFilters.venueId}
                          className={`w-full px-3 py-2.5 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all pr-10 ${
                            energyFilters.venueId
                              ? 'bg-gray-50 border border-gray-300 text-gray-700 cursor-pointer'
                              : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <option value="">All Devices</option>
                          {energyFilters.venueId && data.acs
                            .filter(ac => ac.venueId === energyFilters.venueId)
                            .map(ac => (
                              <option key={ac.id} value={ac.id}>{ac.name} ({ac.brand} {ac.model})</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {!energyFilters.venueId && (
                        <p className="text-xs text-gray-400 mt-1.5">Please select a venue first</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Section - Download Options (White) */}
                <div className="bg-white p-6 border-l border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Download Options</h3>
                  <div className="space-y-4">
                    {/* Year Selector */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Select Year *
                      </label>
                      <input
                        type="number"
                        min="2020"
                        max={new Date().getFullYear()}
                        value={energyFilters.year || new Date().getFullYear()}
                        onChange={(e) => setEnergyFilters(prev => ({ ...prev, year: e.target.value ? parseInt(e.target.value) : new Date().getFullYear() }))}
                        className="w-full border border-gray-300 rounded-lg bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-all"
                        placeholder="Enter year"
                        required
                      />
                      <p className="mt-1.5 text-xs text-gray-500">Select the year for the report</p>
                    </div>

                    {/* Monthly Report Button */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Monthly Report
                      </label>
                      <button
                        onClick={async () => {
                          try {
                            setShowDownloadModal(false);
                            
                            toast.loading('Generating monthly energy report PDF...', { id: 'monthly-report' });
                            
                            const response = await managerAPI.getEnergyReport();
                            
                            // Handle different response structures
                            let report = null;
                            if (response.data?.data) {
                              report = response.data.data;
                            } else if (response.data?.organizations) {
                              report = response.data;
                            } else {
                              report = response.data;
                            }
                            
                            if (!report || !report.organizations) {
                              console.error('Invalid report structure:', response.data);
                              toast.error('Failed to generate report: Invalid data structure');
                              return;
                            }

                            let filteredOrgs = report.organizations;
                            
                            if (energyFilters.organizationId) {
                              filteredOrgs = filteredOrgs.filter(org => 
                                org.organizationId === energyFilters.organizationId
                              );
                            }

                            // Filter by year if selected
                            const selectedYear = energyFilters.year || new Date().getFullYear();
                            
                            // Create PDF
                            const pdf = new jsPDF('p', 'mm', 'a4');
                            let yPos = 20;
                            const pageWidth = pdf.internal.pageSize.getWidth();
                            const margin = 15;
                            const maxWidth = pageWidth - (margin * 2);
                            
                            // Header
                            pdf.setFontSize(18);
                            pdf.setFont(undefined, 'bold');
                            pdf.text('Energy Consumption Report - Monthly', margin, yPos);
                            yPos += 10;
                            
                            pdf.setFontSize(10);
                            pdf.setFont(undefined, 'normal');
                            pdf.text(`Generated At: ${new Date(report.generatedAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`, margin, yPos);
                            yPos += 5;
                            pdf.text(`Report Type: Monthly`, margin, yPos);
                            yPos += 5;
                            pdf.text(`Year: ${selectedYear}`, margin, yPos);
                            if (energyFilters.month) {
                              yPos += 5;
                              pdf.text(`Filtered Month: ${new Date(energyFilters.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, margin, yPos);
                            }
                            yPos += 10;
                            
                            // Filter months by selected year
                            const months = filteredOrgs[0]?.monthlyEnergy?.filter(m => m.year === selectedYear) || [];
                            
                            // Monthly Summary Table
                            pdf.setFontSize(12);
                            pdf.setFont(undefined, 'bold');
                            pdf.text('Monthly Energy Summary by Organization', margin, yPos);
                            yPos += 8;
                            
                            // Table headers
                            pdf.setFontSize(9);
                            pdf.setFont(undefined, 'bold');
                            let xPos = margin;
                            pdf.text('Organization', xPos, yPos);
                            xPos += 60;
                            
                            months.forEach(month => {
                              if (xPos + 20 > pageWidth - margin) {
                                yPos += 15;
                                xPos = margin + 60;
                              }
                              pdf.text(`${month.month.substring(0, 3)}`, xPos, yPos);
                              xPos += 20;
                            });
                            if (xPos + 25 < pageWidth - margin) {
                              pdf.text('Total', xPos, yPos);
                            }
                            yPos += 8;
                            
                            // Table data
                            pdf.setFont(undefined, 'normal');
                            filteredOrgs.forEach(org => {
                              if (yPos > 270) {
                                pdf.addPage();
                                yPos = 20;
                              }
                              xPos = margin;
                              pdf.text(org.organizationName.substring(0, 25), xPos, yPos);
                              xPos += 60;
                              
                              let orgMonthlyTotal = 0;
                              const orgMonths = org.monthlyEnergy?.filter(m => m.year === selectedYear) || [];
                              orgMonths.forEach(month => {
                                if (xPos + 20 > pageWidth - margin) {
                                  yPos += 8;
                                  xPos = margin + 60;
                                }
                                pdf.text(month.energy.toFixed(2), xPos, yPos);
                                xPos += 20;
                                orgMonthlyTotal += month.energy;
                              });
                              if (xPos + 25 < pageWidth - margin) {
                                pdf.text(orgMonthlyTotal.toFixed(2), xPos, yPos);
                              }
                              yPos += 8;
                            });
                            
                            yPos += 10;
                            
                            // Detailed Hierarchy
                            if (yPos > 250) {
                              pdf.addPage();
                              yPos = 20;
                            }
                            
                            pdf.setFontSize(12);
                            pdf.setFont(undefined, 'bold');
                            pdf.text('Detailed Hierarchy (Device → Venue → Organization)', margin, yPos);
                            yPos += 8;
                            
                            pdf.setFontSize(8);
                            pdf.setFont(undefined, 'bold');
                            pdf.text('Organization', margin, yPos);
                            pdf.text('Venue', margin + 50, yPos);
                            pdf.text('Ton', margin + 90, yPos);
                            pdf.text('Energy (kWh)', margin + 130, yPos);
                            yPos += 6;
                            
                            pdf.setFont(undefined, 'normal');
                            filteredOrgs.forEach(org => {
                              org.venues?.forEach(venue => {
                                venue.devices?.forEach(device => {
                                  if (yPos > 280) {
                                    pdf.addPage();
                                    yPos = 20;
                                  }
                                  pdf.text((org.organizationName || 'N/A').substring(0, 20), margin, yPos);
                                  pdf.text((venue.venueName || 'N/A').substring(0, 15), margin + 50, yPos);
                                  pdf.text((device.deviceTon || device.ton || 'N/A').toString(), margin + 90, yPos);
                                  pdf.text((device.energy || 0).toFixed(2), margin + 130, yPos);
                                  yPos += 6;
                                });
                              });
                            });
                            
                            // Save PDF
                            const fileName = `energy-report-monthly-${selectedYear}-${new Date().toISOString().split('T')[0]}.pdf`;
                            pdf.save(fileName);
                            
                            toast.success('Monthly energy report PDF downloaded successfully!', { id: 'monthly-report' });
                            
                            setEnergyFilters({ year: null, month: null, organizationId: null, venueId: null, deviceId: null });
                          } catch (error) {
                            console.error('Download error:', error);
                            toast.error('Failed to download monthly energy report');
                          }
                        }}
                        className="w-full flex items-center justify-center px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Monthly Report
                      </button>
                      <p className="mt-1.5 text-xs text-gray-500">Download monthly breakdown for selected year</p>
                    </div>

                    {/* Yearly Report Button */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Yearly Report
                      </label>
                      <button
                        onClick={async () => {
                          try {
                            setShowDownloadModal(false);
                            
                            toast.loading('Generating yearly energy report PDF...', { id: 'yearly-report' });
                            
                            const response = await managerAPI.getEnergyReport();
                            
                            // Handle different response structures
                            let report = null;
                            if (response.data?.data) {
                              report = response.data.data;
                            } else if (response.data?.organizations) {
                              report = response.data;
                            } else {
                              report = response.data;
                            }
                            
                            if (!report || !report.organizations) {
                              console.error('Invalid report structure:', response.data);
                              toast.error('Failed to generate report: Invalid data structure');
                              return;
                            }

                            let filteredOrgs = report.organizations || [];
                            
                            if (energyFilters.organizationId) {
                              filteredOrgs = filteredOrgs.filter(org => 
                                org.organizationId === energyFilters.organizationId
                              );
                            }

                            // Check if we have any organizations
                            if (filteredOrgs.length === 0) {
                              toast.error('No data available for the selected filters');
                              return;
                            }

                            // Filter by year if selected
                            const selectedYear = energyFilters.year || new Date().getFullYear();
                            
                            // Create PDF
                            const pdf = new jsPDF('p', 'mm', 'a4');
                            let yPos = 20;
                            const pageWidth = pdf.internal.pageSize.getWidth();
                            const margin = 15;
                            
                            // Header
                            pdf.setFontSize(18);
                            pdf.setFont(undefined, 'bold');
                            pdf.text('Energy Consumption Report - Yearly', margin, yPos);
                            yPos += 10;
                            
                            pdf.setFontSize(10);
                            pdf.setFont(undefined, 'normal');
                            pdf.text(`Generated At: ${new Date(report.generatedAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`, margin, yPos);
                            yPos += 5;
                            pdf.text(`Report Type: Yearly`, margin, yPos);
                            yPos += 5;
                            pdf.text(`Year: ${selectedYear}`, margin, yPos);
                            yPos += 10;
                            
                            // Yearly Summary Table
                            pdf.setFontSize(12);
                            pdf.setFont(undefined, 'bold');
                            pdf.text('Yearly Energy Summary by Organization', margin, yPos);
                            yPos += 8;
                            
                            // Table headers
                            pdf.setFontSize(9);
                            pdf.setFont(undefined, 'bold');
                            pdf.text('Organization', margin, yPos);
                            pdf.text('Total Energy (kWh)', margin + 120, yPos);
                            yPos += 8;
                            
                            // Table data
                            pdf.setFont(undefined, 'normal');
                            filteredOrgs.forEach(org => {
                              if (yPos > 270) {
                                pdf.addPage();
                                yPos = 20;
                              }
                              // Calculate total energy for selected year
                              const orgMonths = org.monthlyEnergy?.filter(m => m.year === selectedYear) || [];
                              const yearlyTotal = orgMonths.reduce((sum, month) => sum + month.energy, 0);
                              
                              pdf.text(org.organizationName.substring(0, 50), margin, yPos);
                              pdf.text(yearlyTotal.toFixed(2), margin + 120, yPos);
                              yPos += 8;
                            });
                            
                            yPos += 10;
                            
                            // Detailed Hierarchy
                            if (yPos > 250) {
                              pdf.addPage();
                              yPos = 20;
                            }
                            
                            pdf.setFontSize(12);
                            pdf.setFont(undefined, 'bold');
                            pdf.text('Detailed Hierarchy (Device → Venue → Organization)', margin, yPos);
                            yPos += 8;
                            
                            pdf.setFontSize(8);
                            pdf.setFont(undefined, 'bold');
                            pdf.text('Organization', margin, yPos);
                            pdf.text('Venue', margin + 50, yPos);
                            pdf.text('Ton', margin + 90, yPos);
                            pdf.text('Energy (kWh)', margin + 130, yPos);
                            yPos += 6;
                            
                            pdf.setFont(undefined, 'normal');
                            filteredOrgs.forEach(org => {
                              org.venues?.forEach(venue => {
                                venue.devices?.forEach(device => {
                                  if (yPos > 280) {
                                    pdf.addPage();
                                    yPos = 20;
                                  }
                                  pdf.text((org.organizationName || 'N/A').substring(0, 20), margin, yPos);
                                  pdf.text((venue.venueName || 'N/A').substring(0, 15), margin + 50, yPos);
                                  pdf.text((device.deviceTon || device.ton || 'N/A').toString(), margin + 90, yPos);
                                  pdf.text((device.energy || 0).toFixed(2), margin + 130, yPos);
                                  yPos += 6;
                                });
                              });
                            });
                            
                            // Save PDF
                            const fileName = `energy-report-yearly-${selectedYear}-${new Date().toISOString().split('T')[0]}.pdf`;
                            pdf.save(fileName);
                            
                            toast.success('Yearly energy report PDF downloaded successfully!', { id: 'yearly-report' });
                            
                            setEnergyFilters({ year: null, month: null, organizationId: null, venueId: null, deviceId: null });
                          } catch (error) {
                            console.error('Download error:', error);
                            console.error('Error details:', {
                              message: error.message,
                              stack: error.stack,
                              response: error.response?.data
                            });
                            toast.error(error.message || 'Failed to download yearly energy report');
                          }
                        }}
                        className="w-full flex items-center justify-center px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors text-sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Yearly Report
                      </button>
                      <p className="mt-1.5 text-xs text-gray-500">Download yearly summary for selected year</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer with Cancel Button */}
              <div className="bg-white border-t border-gray-200 px-6 py-3 flex justify-end">
                <button
                  onClick={() => {
                    setShowDownloadModal(false);
                    setEnergyFilters({ year: null, month: null, organizationId: null, venueId: null, deviceId: null });
                  }}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ManagerDashboard;


