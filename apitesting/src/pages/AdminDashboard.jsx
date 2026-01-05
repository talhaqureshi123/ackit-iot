import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { adminAPI } from '../services/apiAdmin';
import { BACKEND_IP, BACKEND_PORT, FRONTEND_WS_PORT, WS_URL } from '../config/api';
import toast from 'react-hot-toast';
import EventForm from '../components/EventForm';
import VenueDetailsPage from './VenueDetailsPage';
import ActivityLogTable from '../components/superadmin/ActivityLogTable';
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
  Download,
  Edit,
  Plus,
  Minus,
  Save,
  MapPin,
  Menu,
  BarChart3,
  User,
  UserPlus,
  ArrowLeft,
  Check
} from 'lucide-react';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); // Track initial data load
  const [alerts, setAlerts] = useState([]);
  const [allAlerts, setAllAlerts] = useState([]); // Store all alerts (including device-level) for device highlighting
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Close sidebar by default if on dashboard/venue-dashboard tab
    return false;
  });
  const [contentWidth, setContentWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      if (width >= 1280) {
        return 'calc(100% - 240px)';
      } else if (width >= 1024) {
        return 'calc(100% - 208px)';
      }
    }
    return '100%';
  });
  const [contentMarginLeft, setContentMarginLeft] = useState(() => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      if (width >= 1280) {
        return '240px';
      } else if (width >= 1024) {
        return '208px';
      }
    }
    return '0px';
  });
  const [deviceViewMode, setDeviceViewMode] = useState('table'); // 'cards' or 'table'
  const [energyViewMode, setEnergyViewMode] = useState('device'); // 'device', 'venue', 'organization'
  const [venueViewMode, setVenueViewMode] = useState('table'); // 'cards' or 'table'
  const [organizationViewMode, setOrganizationViewMode] = useState('table'); // 'cards' or 'table'
  const [managerViewMode, setManagerViewMode] = useState('table'); // 'cards' or 'table'
  
  // Create modals state
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [showCreateVenueModal, setShowCreateVenueModal] = useState(false);
  const [showCreateManagerModal, setShowCreateManagerModal] = useState(false);
  const [showCreateACModal, setShowCreateACModal] = useState(false);
  
  // Assign organization modal state
  const [showAssignOrgModal, setShowAssignOrgModal] = useState(false);
  const [selectedOrgForAssign, setSelectedOrgForAssign] = useState(null);

  // Energy download modal state (with filters)
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [energyFilters, setEnergyFilters] = useState({
    year: null,
    month: null, // Format: 'YYYY-MM'
    organizationId: null,
    venueId: null,
    deviceId: null
  });

  // Helper functions to check if device/org is actually locked
  // Note: admin dashboard only has remote lock, restricted, and unlocked status
  // No device/organization lock functionality for admins

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
  // Venue shows as "Locked" only if ALL devices in the venue are locked (venue was explicitly locked)
  // If only some devices are locked, venue shows as "Unlocked" (individual device locks don't lock the venue)
  const isVenueDevicesRemoteLocked = (venue) => {
    if (!venue) return false;
    
    let venueACs = [];
    if (venue.acs && Array.isArray(venue.acs)) {
      venueACs = venue.acs;
    } else {
      // If venue doesn't have acs array, check if it's in the data.acs
      // Only count devices that specifically belong to this venue (not organization-level devices)
      venueACs = Array.isArray(data.acs) ? data.acs.filter(ac => {
        if (venue.organizationId && ac.venueId === venue.organizationId) {
          return false; // This device belongs to organization, not this venue
        }
        return ac.venueId === venue.id;
      }) : [];
    }
    
    // Venue is locked only if ALL devices in the venue are locked
    // If no devices, venue is not locked
    if (venueACs.length === 0) return false;
    
    // Check if ALL devices are locked (not just some)
    const allDevicesLocked = venueACs.every(ac => ac.currentState === "locked");
    return allDevicesLocked;
  };

  // Check if a device is remote locked
  const isDeviceRemoteLocked = (ac) => {
    if (!ac) return false;
    // Device is remote locked if currentState === "locked"
    return ac.currentState === "locked";
  };

  const [data, setData] = useState({
    managers: [],
    organizations: [],
    venues: [],
    acs: [],
    logs: [],
    dashboard: {},
    events: []
  });
  const [showOrgDetailsModal, setShowOrgDetailsModal] = useState(false);
  const [selectedOrgDetails, setSelectedOrgDetails] = useState(null);
  const [showVenueDetailsModal, setShowVenueDetailsModal] = useState(false);
  const [selectedVenueDetails, setSelectedVenueDetails] = useState(null);
  const [selectedVenueId, setSelectedVenueId] = useState(null); // For sidebar venue details
  const [showACDetailsModal, setShowACDetailsModal] = useState(false);
  const [selectedACDetails, setSelectedACDetails] = useState(null);

  // Debug: Log modal state changes
  useEffect(() => {
    console.log('🔍 Modal state changed:', {
      showACDetailsModal,
      selectedACDetails: selectedACDetails ? { id: selectedACDetails.id, name: selectedACDetails.name } : null,
      shouldRender: showACDetailsModal && selectedACDetails
    });
    if (showACDetailsModal && selectedACDetails) {
      console.log('✅ Modal should be visible now!');
    } else if (showACDetailsModal && !selectedACDetails) {
      console.warn('⚠️ Modal state is true but selectedACDetails is null!');
    } else if (!showACDetailsModal && selectedACDetails) {
      console.warn('⚠️ selectedACDetails is set but modal state is false!');
    }
  }, [showACDetailsModal, selectedACDetails]);
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

  // Debug: Log when showEventTypeSelection changes
  useEffect(() => {
    console.log('🔧 [AdminDashboard] showEventTypeSelection changed to:', showEventTypeSelection);
    console.log('🔧 [AdminDashboard] selectedEvent:', selectedEvent);
    console.log('🔧 [AdminDashboard] showEventModal:', showEventModal);
  }, [showEventTypeSelection, selectedEvent, showEventModal]);
  const [localTemperatures, setLocalTemperatures] = useState({});
  const [temperatureLoading, setTemperatureLoading] = useState({});
  const [acPowerLoading, setAcPowerLoading] = useState({});
  
  // Track connected devices (Set of serialNumbers)
  const [connectedDevices, setConnectedDevices] = useState(new Set());

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
        console.log('📊 admin Dashboard - Loading data...');
        console.log('📊 admin Dashboard - User:', user);
        console.log('📊 admin Dashboard - User role:', user?.role);
        console.log('📊 admin Dashboard - localStorage user:', localStorage.getItem('user'));
        console.log('📊 admin Dashboard - localStorage role:', localStorage.getItem('role'));

        if (user && user.role === 'admin') {
          // Longer delay to ensure session cookie is set after login
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          await loadData();
          loadAlerts();
          // Load events on initial mount to get accurate count for tab badge
          await loadEvents();
        } else {
          console.warn('⚠️ admin Dashboard - User not authenticated or wrong role');
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
          console.log('   └─ WebSocket URL:', WS_URL);
          reconnectAttempts = 0; // Reset on successful connection
        };
        
        socket.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          console.error('   └─ WebSocket URL:', WS_URL);
        };
        
        socket.onclose = (event) => {
          console.warn('⚠️ WebSocket closed:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          console.warn('   └─ WebSocket URL:', WS_URL);
        };
        
        socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 WebSocket message received:', message);
        console.log('   └─ Message type:', message.type);
        console.log('   └─ Serial number:', message.serial || message.serialNumber);
        
        // Handle device connection status
        // Support both DEVICE_CONNECTED (new) and CONNECTED (backward compatibility)
        if ((message.type === 'DEVICE_CONNECTED' || message.type === 'CONNECTED') && (message.serial || message.serialNumber)) {
          const serialNumber = message.serial || message.serialNumber;
          setConnectedDevices(prev => new Set([...prev, serialNumber]));
          // Update data.acs to reflect connection status
          setData(prevData => ({
            ...prevData,
            acs: prevData.acs.map(ac => 
              ac.serialNumber === serialNumber 
                ? { ...ac, isConnected: true }
                : ac
            )
          }));
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
          // Update data.acs to reflect disconnection status
          setData(prevData => ({
            ...prevData,
            acs: prevData.acs.map(ac => 
              ac.serialNumber === serialNumber 
                ? { ...ac, isConnected: false }
                : ac
            )
          }));
          console.log(`❌ [DASHBOARD] Device ${serialNumber} marked as DISCONNECTED`);
        }
        
        // Handle direct POWER_UPDATE, TEMP_UPDATE, LOCK_UPDATE from ESP32
        // Only update if device is actually connected (prevent false data)
        if ((message.serial || message.serialNumber) && (message.type === 'POWER_UPDATE' || message.type === 'TEMP_UPDATE' || message.type === 'LOCK_UPDATE')) {
          const serialNumber = message.serial || message.serialNumber;
          
          // Check if device is connected before updating (using functional update to get latest state)
          let isConnected = false;
          setConnectedDevices(prev => {
            isConnected = prev.has(serialNumber);
            if (!isConnected) {
              console.warn(`⚠️ [DASHBOARD] Blocked ${message.type} update - Device ${serialNumber} not connected (preventing false data)`);
            }
            return prev; // Don't modify state - only check
          });
          
          // Only proceed with update if device is connected
          if (!isConnected) {
            return; // Prevent false data updates
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
          
          // Auto-delete after 5 minutes (300000ms) for admin events
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

  // Calculate content width and margin based on sidebar state and window size
  useEffect(() => {
    const calculateContentLayout = () => {
      if (typeof window === 'undefined') return;
      
      const width = window.innerWidth;
      let marginLeft = '0px';
      let contentWidth = '100%';
      
      if (width >= 1280) {
        // xl breakpoint
        marginLeft = sidebarOpen ? '240px' : '64px';
        contentWidth = sidebarOpen ? 'calc(100% - 240px)' : 'calc(100% - 64px)';
      } else if (width >= 1024) {
        // lg breakpoint
        marginLeft = sidebarOpen ? '208px' : '56px';
        contentWidth = sidebarOpen ? 'calc(100% - 208px)' : 'calc(100% - 56px)';
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

  // Close sidebar by default when on venue-dashboard, keep it closed and disable expand
  useEffect(() => {
    if (activeTab === 'venue-dashboard') {
      setSidebarOpen(false);
    } else {
      // Keep sidebar state as is for other tabs (user can toggle)
    }
  }, [activeTab]);

  useEffect(() => {
    // Reload events when navigating to events tab
    if (activeTab === 'events') {
      console.log('📅 [AdminDashboard] Events tab opened - reloading events...');
      // Add small delay to ensure any other data loading completes first
      setTimeout(async () => {
        try {
          await loadEvents();
          console.log('✅ [AdminDashboard] Events reloaded for Events tab');
        } catch (error) {
          console.error('❌ [AdminDashboard] Failed to reload events for Events tab:', error);
        }
      }, 300); // Increased delay slightly
    }
    // Also reload events when navigating to dashboard tab to ensure events are visible
    if (activeTab === 'dashboard') {
      console.log('📅 [AdminDashboard] Dashboard tab opened - reloading events...');
      // Add small delay to ensure any other data loading completes first
      setTimeout(async () => {
        try {
          await loadEvents();
          console.log('✅ [AdminDashboard] Events reloaded for Dashboard tab');
        } catch (error) {
          console.error('❌ [AdminDashboard] Failed to reload events for Dashboard tab:', error);
        }
      }, 300);
    }
    // Reload events when navigating to venue-dashboard tab to ensure events are visible
    if (activeTab === 'venue-dashboard') {
      console.log('📅 [AdminDashboard] Venue dashboard tab opened - reloading events...');
      // Add small delay to ensure any other data loading completes first
      setTimeout(async () => {
        try {
          await loadEvents();
          console.log('✅ [AdminDashboard] Events reloaded for Venue dashboard tab');
        } catch (error) {
          console.error('❌ [AdminDashboard] Failed to reload events for Venue dashboard tab:', error);
        }
      }, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]); // Only depend on activeTab to avoid unnecessary re-renders

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

  // Auto-select first venue when dashboard tab is clicked and no venue is selected
  useEffect(() => {
    if (activeTab === 'venue-dashboard' && !selectedVenueId && data.venues && data.venues.length > 0) {
      // Auto-select the first venue
      setSelectedVenueId(data.venues[0].id);
    }
  }, [activeTab, selectedVenueId, data.venues]);

  // Auto-load activity logs when logs tab is active
  useEffect(() => {
    if (activeTab === 'logs') {
      console.log('📋 Activity logs tab opened - reloading activity logs...');
      loadData(false); // Reload data to get fresh activity logs
    }
  }, [activeTab]);

  const loadData = async (showLoading = true) => {
    // Only show loading spinner on manual refresh, not during polling
    if (showLoading) {
      setLoading(true);
    }
    
    try {
      const [orgsRes, acsRes, managersRes, logsRes, venuesRes] = await Promise.all([
        adminAPI.getOrganizations().catch(err => {
          console.error('Failed to load organizations:', err);
          return null;
        }),
        adminAPI.getACs().catch(err => {
          console.error('Failed to load ACs:', err);
          return null;
        }),
        adminAPI.getMyManagers().catch(err => {
          console.error('Failed to load managers:', err);
          return null;
        }),
        adminAPI.getActivityLogs().catch(err => {
          console.error('Failed to load logs:', err);
          return null;
        }),
        adminAPI.getVenues().catch(err => {
          console.error('Failed to load venues:', err);
          return null;
        })
      ]);

      // Update data for each successful response individually
      // This ensures partial data loads even if some APIs fail
      console.log('📊 Data loading results:');
      console.log('   Organizations:', orgsRes ? '✅' : '❌');
      console.log('   ACs:', acsRes ? '✅' : '❌');
      console.log('   Managers:', managersRes ? '✅' : '❌');
      console.log('   Venues:', venuesRes ? '✅' : '❌');
      console.log('   Logs:', logsRes ? '✅' : '❌');
      
      // Update data even if only some calls succeed
      if (orgsRes || acsRes || managersRes || venuesRes || logsRes) {
        console.log('Organizations response:', orgsRes?.data);
        console.log('ACs response:', acsRes?.data);

        // Handle different response structures
        const allOrgs = orgsRes?.data?.organizations || 
                        orgsRes?.data?.data?.organizations || 
                        (Array.isArray(orgsRes?.data?.data) ? orgsRes.data.data : []) ||
                        [];
        
        // Show ALL organizations (active and inactive) - admin can see everything
        let organizations = allOrgs;
        
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
            // Only count devices that specifically belong to this venue (not organization-level devices)
            const venueACs = acs.filter(ac => {
              if (venue.organizationId && ac.venueId === venue.organizationId) {
                return false; // This device belongs to organization, not this venue
              }
              return ac.venueId === venue.id;
            });
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

        // CRITICAL: Backend already includes venues in organizations response
        // But if organizations don't have venues, try loading from separate venues API
        let allVenuesFromAPI = [];
        if (venuesRes && venuesRes.data) {
          allVenuesFromAPI = venuesRes.data.venues || 
                            venuesRes.data.data?.venues || 
                            (Array.isArray(venuesRes.data.data) ? venuesRes.data.data : []) ||
                            [];
          console.log('📊 [admin] Loaded Venues from separate API:', allVenuesFromAPI.length);
        }
        
        // Collect all venues from organizations first
        const allVenuesFromOrgs = organizations.flatMap(org => (org.venues || []));
        
        // Merge venues from organizations and separate API
        // Use a Map to avoid duplicates (by venue ID)
        const venuesMap = new Map();
        
        // Add venues from organizations
        allVenuesFromOrgs.forEach(venue => {
          venuesMap.set(venue.id, venue);
        });
        
        // Add venues from separate API (will override if duplicate, but should be same data)
        allVenuesFromAPI.forEach(venue => {
          if (!venuesMap.has(venue.id)) {
            // Calculate mixed temperatures for venues from API
            // Only count devices that specifically belong to this venue (not organization-level devices)
            const venueACs = acs.filter(ac => {
              if (venue.organizationId && ac.venueId === venue.organizationId) {
                return false; // This device belongs to organization, not this venue
              }
              return ac.venueId === venue.id;
            });
            const venueTemp = venue.temperature || 16;
            let venueHasMixed = false;
            
            if (venueACs.length > 1) {
              venueHasMixed = venueACs.some(ac => {
                const acTemp = ac.temperature || 16;
                return acTemp !== venueTemp;
              });
            }
            
            venuesMap.set(venue.id, {
              ...venue,
              hasMixedTemperatures: venueHasMixed
            });
          }
        });
        
        // Convert map to array - this is all venues
        const allVenues = Array.from(venuesMap.values());
        
        // Ensure all organizations have their venues
        // Backend should already include venues, but if missing, add from separate API call
        organizations = organizations.map(org => {
          const existingVenues = org.venues || [];
          
          // If organization has no venues, try to get from separate API
          if (existingVenues.length === 0 && allVenuesFromAPI.length > 0) {
            const orgVenuesFromAPI = allVenuesFromAPI.filter(v => v.organizationId === org.id);
            console.log(`📊 [admin] Org "${org.name}" (ID: ${org.id}) has no venues in response, found ${orgVenuesFromAPI.length} from separate API`);
            
            // Update venues with mixed temperatures
            const venuesWithMixed = orgVenuesFromAPI.map(venue => {
              // Only count devices that specifically belong to this venue (not organization-level devices)
              const venueACs = acs.filter(ac => {
                if (venue.organizationId && ac.venueId === venue.organizationId) {
                  return false; // This device belongs to organization, not this venue
                }
                return ac.venueId === venue.id;
              });
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
              venues: venuesWithMixed
            };
          }
          
          // Organization already has venues, just update with mixed temperatures
          const venuesWithMixed = existingVenues.map(venue => {
            // Only count devices that specifically belong to this venue (not organization-level devices)
            const venueACs = acs.filter(ac => {
              if (venue.organizationId && ac.venueId === venue.organizationId) {
                return false; // This device belongs to organization, not this venue
              }
              return ac.venueId === venue.id;
            });
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
            venues: venuesWithMixed
          };
        });
        
        // Enhanced debug logging - Show detailed venue information
        console.log('📊 [admin] Loaded Data Summary:');
        console.log('   Total Organizations:', organizations.length);
        console.log('   Total AC Devices:', acs.length);
        console.log('   Total Venues from separate API:', allVenuesFromAPI.length);
        
        // Detailed organization and venue logging
        organizations.forEach(org => {
          const orgACs = acs.filter(ac => ac.organizationId === org.id || ac.venueId === org.id);
          const venuesCount = org.venues?.length || 0;
          console.log(`\n   🏢 Org "${org.name}" (ID: ${org.id}):`);
          console.log(`      - ACs: ${orgACs.length}`);
          console.log(`      - Temp: ${org.temperature}°C`);
          console.log(`      - Mixed Temps: ${org.hasMixedTemperatures}`);
          console.log(`      - Venues: ${venuesCount}`);
          
          if (venuesCount > 0) {
            org.venues.forEach((venue, idx) => {
              // Only count devices that specifically belong to this venue (not organization-level devices)
              const venueACs = acs.filter(ac => {
                if (venue.organizationId && ac.venueId === venue.organizationId) {
                  return false; // This device belongs to organization, not this venue
                }
                return ac.venueId === venue.id;
              });
              console.log(`      ✅ Venue ${idx + 1}: "${venue.name}" (ID: ${venue.id}, orgId: ${venue.organizationId || 'N/A'})`);
              console.log(`         - ACs: ${venueACs.length}`);
              console.log(`         - Temp: ${venue.temperature}°C`);
              console.log(`         - Mixed: ${venue.hasMixedTemperatures}`);
            });
          } else {
            console.log(`      ⚠️ NO VENUES FOUND for this organization!`);
            // Check if separate API has venues for this org
            const orgVenuesFromAPI = allVenuesFromAPI.filter(v => v.organizationId === org.id);
            if (orgVenuesFromAPI.length > 0) {
              console.log(`      💡 Found ${orgVenuesFromAPI.length} venues in separate API but not merged!`);
            }
          }
        });

        // Extract managers and logs
        const managers = managersRes?.data?.managers || 
                        managersRes?.data?.data?.managers || 
                        (Array.isArray(managersRes?.data?.data) ? managersRes.data.data : []) ||
                        [];
        
        // Parse activity logs - backend returns { success: true, data: [...] }
        let logs = [];
        if (logsRes?.data) {
          if (logsRes.data.success === false) {
            console.error('❌ Activity logs API returned error:', logsRes.data.message);
          } else if (Array.isArray(logsRes.data.data)) {
            logs = logsRes.data.data;
          } else if (Array.isArray(logsRes.data.logs)) {
            logs = logsRes.data.logs;
          } else if (Array.isArray(logsRes.data)) {
            // Handle direct array response
            logs = logsRes.data;
          } else {
            console.warn('⚠️ Unexpected activity logs response structure:', logsRes.data);
            // Try to extract logs from any nested structure
            if (logsRes.data.data && typeof logsRes.data.data === 'object') {
              const dataObj = logsRes.data.data;
              if (Array.isArray(dataObj.logs)) {
                logs = dataObj.logs;
              } else if (Array.isArray(dataObj.data)) {
                logs = dataObj.data;
              }
            }
          }
        }
        console.log('✅ Loaded activity logs:', logs.length);
        console.log('📋 Activity logs sample:', logs.slice(0, 2));

        // Update only the fields that were successfully loaded
        setData(prev => ({
          ...prev,
          // Only update if we got successful response, otherwise keep previous data
          organizations: orgsRes ? organizations : prev.organizations,
          acs: acsRes ? acs : prev.acs,
          managers: managersRes ? managers : prev.managers,
          logs: logsRes ? logs : prev.logs,
          venues: venuesRes ? allVenues : prev.venues,
          // CRITICAL: Preserve events - don't clear them when loading other data
          // Only preserve if events already exist (don't overwrite with empty array)
          events: Array.isArray(prev.events) && prev.events.length > 0 ? prev.events : (prev.events || [])
        }));
        
        console.log('✅ Data updated:', {
          organizations: orgsRes ? organizations.length : 'kept previous',
          acs: acsRes ? acs.length : 'kept previous',
          managers: managersRes ? managers.length : 'kept previous',
          venues: venuesRes ? allVenues.length : 'kept previous',
          logs: logsRes ? logs.length : 'kept previous'
        });

        // Mark initial loading as complete after first successful load
        setInitialLoading(false);

        // Show warning if no data but request succeeded
        if (organizations.length === 0 && acs.length === 0 && orgsRes?.data?.success !== false && acsRes?.data?.success !== false) {
          console.warn('No organizations or ACs found for this admin');
        }
      } else {
        // If ALL calls failed, log them but don't update data (preserves last known good state)
        // This allows restricted/locked admins to continue seeing data even if polling fails
        console.warn('⚠️ All API calls failed, preserving last known data');
        if (!orgsRes) {
          console.warn('   ❌ Organizations fetch failed');
        }
        if (!acsRes) {
          console.warn('   ❌ ACs fetch failed');
        }
        if (!managersRes) {
          console.warn('   ❌ Managers fetch failed');
        }
        if (!venuesRes) {
          console.warn('   ❌ Venues fetch failed');
        }
        if (!logsRes) {
          console.warn('   ❌ Logs fetch failed');
        }
        // Even on error, mark initial loading as complete to show error state
        setInitialLoading(false);
        // Only show error toast on manual refresh, not during polling
        if (showLoading) {
          toast.error('Some data failed to load. Showing last known values.');
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
      // This ensures restricted/locked admins can still see their data
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleUpdateManagerStatus = async (managerId, newStatus) => {
    try {
      let response;
      
      if (newStatus === 'unlocked') {
        response = await adminAPI.unlockManager(managerId);
      } else if (newStatus === 'restricted') {
        response = await adminAPI.restrictedUnlockManager(managerId);
      } else if (newStatus === 'locked') {
        const reason = prompt('Enter reason for locking (optional):');
        response = await adminAPI.lockManager(managerId, reason || 'Locked by admin');
      } else {
        toast.error('Invalid status');
        return;
      }
      
      toast.success(response.data?.message || `Manager status updated to ${newStatus}`);
      
      // Reload managers data
      await loadData(false);
    } catch (error) {
      console.error('Update manager status error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to update manager status';
      toast.error(errorMessage);
    }
  };

  // Assign Organization to Manager Handler
  const handleAssignOrganization = async (managerId, organizationIds) => {
    try {
      setLoading(true);
      const response = await adminAPI.assignManagerToOrganizations(managerId, organizationIds);
      toast.success(response.data?.message || 'Organization assigned to manager successfully');
      await loadData(false);
      return response;
    } catch (error) {
      console.error('Assign organization error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to assign organization';
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Create Organization Handler
  const handleCreateOrganization = async (orgData) => {
    try {
      setLoading(true);
      const response = await adminAPI.createOrganization(orgData);
      toast.success(response.data?.message || 'Organization created successfully');
      await loadData(false);
      return response;
    } catch (error) {
      console.error('Create organization error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to create organization';
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Create Venue Handler
  const handleCreateVenue = async (venueData) => {
    try {
      setLoading(true);
      const response = await adminAPI.createVenue(venueData);
      toast.success(response.data?.message || 'Venue created successfully');
      await loadData(false);
      return response;
    } catch (error) {
      console.error('Create venue error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to create venue';
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Create Manager Handler
  const handleCreateManager = async (managerData) => {
    try {
      setLoading(true);
      const response = await adminAPI.createManager(managerData);
      toast.success(response.data?.message || 'Manager created successfully');
      await loadData(false);
      return response;
    } catch (error) {
      console.error('Create manager error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to create manager';
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Create AC Device Handler
  const handleCreateAC = async (acData) => {
    try {
      setLoading(true);
      const response = await adminAPI.createAC(acData);
      toast.success(response.data?.message || 'AC device created successfully');
      await loadData(false);
      return response;
    } catch (error) {
      console.error('Create AC error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to create AC device';
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      setAlertsLoading(true);
      const res = await adminAPI.getActiveAlerts();
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
      await adminAPI.checkAlerts();
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
      console.log('📅 [AdminDashboard] Loading events from API...');
      const response = await adminAPI.getEvents();
      console.log('📅 [AdminDashboard] Events API Response:', response);
      console.log('📅 [AdminDashboard] Full response.data:', JSON.stringify(response.data, null, 2));
      console.log('📅 [AdminDashboard] Response data structure:', {
        hasData: !!response.data,
        hasDataData: !!response.data?.data,
        hasEvents: !!response.data?.data?.events,
        hasDirectEvents: !!response.data?.events,
        isArray: Array.isArray(response.data?.data),
        isArrayDirect: Array.isArray(response.data),
        dataType: typeof response.data?.data,
        eventsType: typeof response.data?.data?.events,
        eventsIsArray: Array.isArray(response.data?.data?.events),
        eventsLength: Array.isArray(response.data?.data?.events) ? response.data.data.events.length : 'N/A'
      });
      
      // Backend returns: { success: true, data: { events: [...] } }
      let events = null;
      
      // Try different response structures
      if (response.data?.data?.events) {
        events = response.data.data.events;
        console.log('📅 [AdminDashboard] Using response.data.data.events:', events);
      } else if (response.data?.events) {
        events = response.data.events;
        console.log('📅 [AdminDashboard] Using response.data.events:', events);
      } else if (Array.isArray(response.data?.data)) {
        events = response.data.data;
        console.log('📅 [AdminDashboard] Using response.data.data (array):', events);
      } else if (Array.isArray(response.data)) {
        events = response.data;
        console.log('📅 [AdminDashboard] Using response.data (array):', events);
      } else {
        events = [];
        console.warn('⚠️ [AdminDashboard] No events found in response, using empty array');
      }
      
      console.log('📅 [AdminDashboard] Final parsed events:', events);
      console.log('📅 [AdminDashboard] Events is array:', Array.isArray(events));
      console.log('📅 [AdminDashboard] Number of events:', Array.isArray(events) ? events.length : 0);
      
      if (Array.isArray(events)) {
        setData(prev => ({ ...prev, events: events }));
        console.log('✅ [AdminDashboard] Events loaded successfully:', events.length);
        if (events.length > 0) {
          console.log('📅 [AdminDashboard] First event sample:', events[0]);
        }
      } else {
        console.warn('⚠️ [AdminDashboard] Events is not an array:', typeof events, events);
        setData(prev => ({ ...prev, events: [] }));
      }
    } catch (error) {
      console.error('❌ [AdminDashboard] Load events error:', error);
      console.error('❌ [AdminDashboard] Error response:', error.response?.data);
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
      const response = await adminAPI.createEvent(eventData);
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
      
      // Wait a bit before reloading to ensure backend has processed the event
      // Increased delay to ensure database transaction is committed
      setTimeout(async () => {
        console.log('🔄 [AdminDashboard] Reloading events after creation from dashboard');
        try {
          await loadEvents();
          console.log('✅ [AdminDashboard] Events reloaded after creation');
          // If Events tab is active, show success message
          if (activeTab === 'events') {
            toast.success('Events list refreshed', { duration: 2000 });
          }
        } catch (error) {
          console.error('❌ [AdminDashboard] Failed to reload events after creation:', error);
        }
      }, 1500); // Increased from 800ms to 1500ms to ensure backend has committed
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
        toast.error('⚠️ Restricted admins cannot create events. Contact admin for full permissions.', {
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
      const response = await adminAPI.updateEvent(eventId, eventData);
      
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
      // Reload events after update
      setTimeout(async () => {
        console.log('🔄 [AdminDashboard] Reloading events after update');
        await loadEvents();
      }, 800);
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
          response = await adminAPI.startEvent(eventId);
          toast.success('Event started successfully. Device/organization settings have been applied.', {
            duration: 4000
          });
          break;
        case 'stop':
          response = await adminAPI.stopEvent(eventId);
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
          response = await adminAPI.disableEvent(eventId);
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
          response = await adminAPI.enableEvent(eventId);
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
          response = await adminAPI.deleteEvent(eventId);
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
        adminAPI.getOrganizationDetails(orgId)
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
        const res = await adminAPI.getOrganizationDetails(orgId);
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
      // First, try to use existing data from data.venues to show modal immediately
      const existingVenue = data.venues?.find(venue => venue.id === venueId) || 
                           data.organizations?.flatMap(org => org.venues || []).find(v => v.id === venueId);
      if (existingVenue) {
        setSelectedVenueDetails(existingVenue);
        setShowVenueDetailsModal(true);
        
        // Optionally fetch fresh data in background (non-blocking)
        adminAPI.getVenueDetails(venueId)
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
        const res = await adminAPI.getVenueDetails(venueId);
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
      const existingVenue = data.venues?.find(venue => venue.id === venueId) || 
                           data.organizations?.flatMap(org => org.venues || []).find(v => v.id === venueId);
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

  const handleViewACDetails = (acId) => {
    console.log('🔍 handleViewACDetails called with AC ID:', acId, 'Type:', typeof acId);
    console.log('🔍 Available ACs:', data.acs.map(ac => ({ id: ac.id, name: ac.name, idType: typeof ac.id })));
    
    // Convert acId to number for comparison (handle both string and number IDs)
    const acIdNum = typeof acId === 'string' ? parseInt(acId) : acId;
    
    // First, try to use existing data from data.acs to show modal immediately
    const existingAC = data.acs.find(ac => {
      const acIdToCompare = typeof ac.id === 'string' ? parseInt(ac.id) : ac.id;
      return acIdToCompare === acIdNum || ac.id === acId;
    });
    console.log('🔍 Existing AC found:', existingAC ? 'Yes' : 'No', existingAC);
    
    if (existingAC) {
      console.log('✅ Using existing AC data, opening modal immediately...');
      // Set both states together to ensure modal opens - use callback to ensure order
      const acData = { ...existingAC };
      
      // Set selectedACDetails first, then modal state
      setSelectedACDetails(acData);
      
      // Use a small timeout to ensure state is set before showing modal
      setTimeout(() => {
        setShowACDetailsModal(true);
        console.log('✅ Modal state set to true after timeout');
      }, 10);
      
      console.log('✅ Modal state being set - showACDetailsModal: will be true, selectedACDetails:', acData);
      
      // Load energy data for this AC (non-blocking)
      loadACEnergy(acId).catch(err => {
        console.warn('Failed to load AC energy:', err);
      });
      
      // Optionally fetch fresh data in background (non-blocking)
      adminAPI.getACDetails(acId)
        .then(res => {
          const freshAcData = res.data.data?.ac || res.data.ac || res.data.data;
          if (freshAcData) {
            console.log('✅ Fresh AC data received, updating...');
            setSelectedACDetails(freshAcData);
          }
        })
        .catch(err => {
          console.warn('Failed to fetch fresh AC details, using cached data:', err);
        });
    } else {
      console.log('⚠️ AC not found in existing data, fetching from API...');
      // If not in existing data, fetch from API
      adminAPI.getACDetails(acIdNum || acId)
        .then(res => {
          const acData = res.data.data?.ac || res.data.ac || res.data.data;
          if (acData) {
            console.log('✅ AC data fetched from API, opening modal...');
            setSelectedACDetails(acData);
            setTimeout(() => {
              setShowACDetailsModal(true);
            }, 10);
            // Load energy data for this AC
            loadACEnergy(acId).catch(err => {
              console.warn('Failed to load AC energy:', err);
            });
          } else {
            toast.error('AC details not found in response');
            console.error('AC details response:', res.data);
          }
        })
        .catch(error => {
          console.error('❌ Error fetching AC details:', error);
          const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to load AC details';
          toast.error(errorMessage);
          console.error('Error response:', error.response?.data);
        });
    }
  };

  const handleToggleOrganizationPower = async (orgId, currentPowerState) => {
    try {
      // Backend will check admin status - no need to check here

      // Ensure currentPowerState is a boolean (default to false if undefined)
      const currentState = currentPowerState === true || currentPowerState === 'true' || currentPowerState === 1;
      const newPowerState = !currentState;
      
      console.log('🔌 Toggling organization power:', {
        orgId,
        currentState,
        newPowerState
      });

      const response = await adminAPI.toggleOrganizationPower(orgId, newPowerState);
      
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
      // Backend will check admin status - no need to check here

      // Ensure currentPowerState is a boolean (default to false if undefined)
      const currentState = currentPowerState === true || currentPowerState === 'true' || currentPowerState === 1;
      const newPowerState = !currentState;
      
      // Check if trying to turn ON venue - verify organization is ON first
      if (newPowerState) {
        const venue = data.organizations?.flatMap(org => org.venues || []).find(v => v.id === venueId);
        if (venue && venue.organizationId) {
          const org = data.organizations.find(o => o.id === venue.organizationId);
          if (org && !(org.isOrganizationOn === true || org.isOrganizationOn === 'true')) {
            toast.error('Cannot turn ON venue: Organization is currently OFF. Please turn on the organization first.');
            return;
          }
        }
      }
      
      console.log('🔌 Toggling venue power:', {
        venueId,
        currentState,
        newPowerState
      });

      const response = await adminAPI.toggleVenuePower(venueId, newPowerState);
      
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
        // Check admin status only (no organization lock check for admins)
        const org = data.organizations.find(o => o.id === id);
        
        // Check if organization is OFF - prevent temperature change
        if (org && !(org.isOrganizationOn === true || org.isOrganizationOn === 'true')) {
          toast.error('Cannot change temperature: Organization is currently OFF. Please turn on the organization first.');
          setTemperatureLoading(prev => ({ ...prev, [key]: false }));
          return;
        }
        
        response = await adminAPI.setAdminOrganizationTemperature(id, temperature);
        responseTemp = response?.data?.organization?.temperature ?? response?.data?.temperature ?? temperature;
        responseOrgTemp = responseTemp;
        responseOrgMixed = response?.data?.organization?.hasMixedTemperatures ?? response?.data?.hasMixedTemperatures;
      
        // Admin actions are logged automatically by backend
      
        toast.success('Organization temperature set successfully');
      } else if (type === 'venue') {
        // Check admin status only (no venue lock check for admins)
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
        
        response = await adminAPI.setVenueTemperature(id, temperature);
        responseTemp = response?.data?.venue?.temperature ?? response?.data?.temperature ?? temperature;
        responseOrgTemp = response?.data?.organization?.temperature;
        responseOrgMixed = response?.data?.organization?.hasMixedTemperatures;
        orgIdFromResponse = response?.data?.organization?.id ?? response?.data?.organizationId;
        
        // Log the action (venue already declared above)
        
        // Admin actions are logged automatically by backend
        
        toast.success('Venue temperature set successfully');
      } else if (type === 'ac') {
        // Check admin status only (no device lock check for admins)
        const ac = data.acs.find(a => a.id === id);
        
        // Revert action if device is offline
        if (ac && ac.serialNumber && !connectedDevices.has(ac.serialNumber)) {
          toast.error('⚠️ Device is offline. Action reverted.');
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
        
        response = await adminAPI.setAdminACTemperature(id, temperature);
        responseTemp = response?.data?.ac?.temperature ?? response?.data?.temperature ?? temperature;
      
        // Admin actions are logged automatically by backend
        
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

  const handleSetVenueTemperature = async (venueId, temperature) => {
    await handleSetTemperature('venue', venueId, temperature);
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
      // Check admin status only (no device lock check for admins)
      
      // If targetState is not provided, toggle to opposite of current state
      const ac = data.acs.find(a => a.id === acId);
      if (!ac) {
        toast.error('AC device not found');
        console.error('AC not found in data.acs:', acId, 'Available ACs:', data.acs.map(a => a.id));
        return;
      }
      
      // Revert action if device is offline
      if (ac.serialNumber && !connectedDevices.has(ac.serialNumber)) {
        toast.error('⚠️ Device is offline. Action reverted.');
        return;
      }
      
      const currentState = ac.isOn || false;
      const newState = targetState !== undefined ? targetState : !currentState;
      
      // Check if trying to turn ON device - verify venue and organization are ON first
      if (newState) {
        // Find venue for this device
        const venue = data.organizations?.flatMap(org => org.venues || []).find(v => v.id === ac.venueId);
        if (venue) {
          // Check if venue is ON
          if (!(venue.isVenueOn === true || venue.isVenueOn === 'true')) {
            toast.error('Cannot turn ON device: Venue is currently OFF. Please turn on the venue first.');
            return;
          }
          
          // Check if organization is ON
          if (venue.organizationId) {
            const org = data.organizations.find(o => o.id === venue.organizationId);
            if (org && !(org.isOrganizationOn === true || org.isOrganizationOn === 'true')) {
              toast.error('Cannot turn ON device: Organization is currently OFF. Please turn on the organization first.');
              return;
            }
          }
        }
      }
      
      console.log('🔌 Toggling AC power:', {
        acId,
        acName: ac.name,
        currentState,
        newState,
        targetState
      });
      
      setAcPowerLoading(prev => ({ ...prev, [acId]: true }));
      const response = await adminAPI.toggleAdminACPower(acId, newState);
      
      console.log('✅ Toggle AC power response:', response?.data);
      
      const updatedAC = response?.data?.ac || response?.data?.data?.ac;
      const finalState = updatedAC?.isOn !== undefined ? updatedAC.isOn : newState;
      
      toast.success(`AC ${finalState ? 'turned on' : 'turned off'} successfully`);
      
      // Admin actions are logged automatically by backend
      
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

  // Note: Lock/unlock AC functions removed - admins only have remote lock

  const handleRemoteLockOrganization = async (organizationId, reason = null) => {
    try {
      const result = await adminAPI.remoteLockOrganization(organizationId, reason);
      toast.success(result.data?.message || 'Organization devices remote locked successfully');
      loadData(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remote lock organization devices');
    }
  };

  const handleRemoteUnlockOrganization = async (organizationId) => {
    try {
      const result = await adminAPI.remoteUnlockOrganization(organizationId);
      toast.success(result.data?.message || 'Organization devices remote unlocked successfully');
      loadData(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remote unlock organization devices');
    }
  };

  const handleRemoteLockVenue = async (venueId, reason = null) => {
    try {
      const result = await adminAPI.remoteLockVenue(venueId, reason);
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
      const result = await adminAPI.remoteUnlockVenue(venueId);
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
      // Check if device is offline
      const ac = data.acs.find(a => a.id === acId);
      if (ac && ac.serialNumber && !connectedDevices.has(ac.serialNumber)) {
        toast.error('⚠️ Device is offline. Action reverted.');
        return;
      }
      
      // Lock only this specific device (not the entire venue)
      const result = await adminAPI.toggleACLockStatus(acId, 'lock', reason);
      toast.success(result.data?.message || 'Device locked successfully');
      await loadData(false);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to lock device';
      toast.error(errorMessage);
      console.error('Lock AC error:', error);
    }
  };

  const handleRemoteUnlockAC = async (acId) => {
    try {
      // Check if device is offline
      const ac = data.acs.find(a => a.id === acId);
      if (ac && ac.serialNumber && !connectedDevices.has(ac.serialNumber)) {
        toast.error('⚠️ Device is offline. Action reverted.');
        return;
      }
      
      // Unlock only this specific device (not the entire venue)
      const result = await adminAPI.toggleACLockStatus(acId, 'unlock');
      toast.success(result.data?.message || 'Device unlocked successfully');
      await loadData(false);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to unlock device';
      toast.error(errorMessage);
      console.error('Unlock AC error:', error);
    }
  };




  const tabs = [
    { id: 'venue-dashboard', label: 'Dashboard', icon: MapPin },
    { id: 'dashboard', label: 'Overview', icon: BarChart3 },
    { id: 'alerts', label: 'Alerts', icon: AlertCircle, count: alerts.length, badge: alerts.length > 0 ? 'red' : null },
    { id: 'events', label: 'Events', icon: Calendar, count: Array.isArray(data.events) ? data.events.length : 0 },
    { id: 'managers', label: 'Managers', icon: Users, count: data.managers?.length || 0 },
    { id: 'organizations', label: 'Organizations', icon: Building, count: data.organizations?.length || 0 },
    { id: 'venues', label: 'Venues', icon: Building, count: data.venues?.length || 0 },
    { id: 'acs', label: 'AC Devices', icon: Thermometer, count: data.acs?.length || 0 },
    { id: 'energy', label: 'Energy Consumption', icon: Zap },
    { id: 'logs', label: 'Activity Logs', icon: Activity, count: data.logs?.length || 0 }
  ];

  const loadACEnergy = async (acId) => {
    try {
      setEnergyLoading(prev => ({ ...prev, [`ac-${acId}`]: true }));
      const res = await adminAPI.getACEnergy(acId);
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
      const res = await adminAPI.getOrganizationEnergy(organizationId);
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
    
    // Check if organization is assigned to a manager
    const isAssignedToManager = org.managerId !== null && org.managerId !== undefined;
    const assignedManager = isAssignedToManager ? data.managers.find(m => m.id === org.managerId) : null;
    
    return (
      <div className={`rounded-xl sm:rounded-2xl shadow-xl border-2 ${isAssignedToManager ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-400' : hasAlert ? 'bg-white border-blue-400' : 'bg-white border-gray-200'} hover:shadow-2xl hover:border-blue-400 hover:-translate-y-1 transition-all duration-300 overflow-hidden aspect-square flex flex-col`}>
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
                <h3 className={`text-sm font-extrabold ${isAssignedToManager ? 'text-green-900' : hasAlert ? 'text-blue-900' : 'text-gray-900'} truncate`}>
                  {org.name}
                </h3>
                {isAssignedToManager && assignedManager && (
                  <p className="text-xs font-semibold text-green-700 mt-0.5">
                    Fully assigned to {assignedManager.name}
                  </p>
                )}
                  </div>
              <div className={`rounded-lg p-1.5 flex-shrink-0 shadow-md ${isAssignedToManager ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-500'}`}>
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
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2 sm:p-1.5 mb-1.5 border border-blue-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs sm:text-xs font-bold text-gray-700 flex items-center">
                <Thermometer className="w-3 h-3 sm:w-3 sm:h-3 mr-1 sm:mr-0.5 text-blue-600" />
                <span className="hidden sm:inline">Temp</span>
                <span className="sm:hidden">Temperature: <span className="text-blue-600 font-bold">{localTemperatures[`organization-${org.id}`] !== undefined ? localTemperatures[`organization-${org.id}`] : (org.temperature ?? 16)}°C</span></span>
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
                  className={`w-14 sm:w-16 px-1 py-1 text-xs sm:text-sm text-center font-bold border rounded bg-white text-gray-900 transition-colors ${
                    temperatureLoading[`organization-${org.id}`] || user?.status === 'restricted' || user?.status === 'locked'
                      ? 'opacity-50 cursor-not-allowed border-gray-200 text-gray-500' 
                      : 'border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-gray-900'
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
                  disabled={user?.status === 'restricted' || user?.status === 'locked'}
                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
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

          {/* Action Buttons - Compact */}
          <div className="flex gap-1.5 mt-auto">
          {!isAssignedToManager && (
            <button
              onClick={() => {
                setSelectedOrgForAssign(org);
                setShowAssignOrgModal(true);
              }}
              className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-md text-xs font-bold text-white bg-green-500 hover:bg-green-600 transition-colors shadow-sm"
              title="Assign organization to manager"
            >
              <UserPlus className="w-3 h-3" />
              <span>Assign</span>
            </button>
          )}
          <button
            onClick={() => handleViewOrganizationDetails(org.id)}
              className={`flex items-center justify-center space-x-1 px-2 py-1.5 rounded-md text-xs font-bold text-white ${isAssignedToManager ? 'flex-1' : 'flex-1'} bg-blue-500 hover:bg-blue-600 transition-colors shadow-sm`}
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
    const navigate = useNavigate();
    // CRITICAL: Only count devices that specifically belong to this venue
    // A device belongs to a venue ONLY if ac.venueId === venue.id
    // Exclude devices that belong to the parent organization (where venueId === organizationId)
    const venueACs = Array.isArray(data.acs) ? data.acs.filter(ac => {
      // Device must have venueId matching this venue's ID
      // Exclude if device belongs to parent organization (not this specific venue)
      if (venue.organizationId && ac.venueId === venue.organizationId) {
        return false; // This device belongs to organization, not this venue
      }
      return ac.venueId === venue.id;
    }) : [];
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
      <div className={`bg-white rounded-xl sm:rounded-2xl shadow-xl border-2 ${hasAlert ? 'border-blue-400' : 'border-gray-200'} hover:shadow-2xl hover:border-blue-400 hover:-translate-y-1 transition-all duration-300 overflow-hidden aspect-square flex flex-col`}>
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
            {isVenueDevicesRemoteLocked(venue) ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-yellow-500 text-white">
                <Lock className="w-3 h-3 mr-0.5" />
                Locked
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-green-500 text-white">
                <Unlock className="w-3 h-3 mr-0.5" />
                Unlocked
              </span>
            )}
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
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2 sm:p-1.5 mb-1.5 border border-blue-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs sm:text-xs font-bold text-gray-700 flex items-center">
                <Thermometer className="w-3 h-3 sm:w-3 sm:h-3 mr-1 sm:mr-0.5 text-blue-600" />
                <span className="hidden sm:inline">Temp</span>
                <span className="sm:hidden">Temperature: <span className="text-blue-600 font-bold">{localTemperatures[`venue-${venue.id}`] !== undefined ? localTemperatures[`venue-${venue.id}`] : (venue.temperature ?? 16)}°C</span></span>
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
                  className={`w-14 sm:w-16 px-1 py-1 text-xs sm:text-sm text-center font-bold border rounded bg-white transition-colors ${
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
              onClick={() => {
                setSelectedVenueId(venue.id);
                setActiveTab('venue-dashboard'); // Switch to Dashboard tab to show venue details
              }}
              className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-md text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors shadow-sm"
              title="View venue dashboard"
            >
              <MapPin className="w-3 h-3" />
              <span>View Details</span>
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
      <div className={`bg-white rounded-xl sm:rounded-2xl shadow-xl border-2 ${hasAlert ? 'border-blue-400' : 'border-gray-200'} hover:shadow-2xl hover:border-blue-400 hover:-translate-y-1 transition-all duration-300 overflow-hidden aspect-square flex flex-col`}>
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
            {isDeviceRemoteLocked(ac) ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-yellow-500 text-white">
                <Lock className="w-3 h-3 mr-0.5" />
                Locked
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-green-500 text-white">
                <Unlock className="w-3 h-3 mr-0.5" />
                Unlocked
              </span>
            )}
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
                className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold shadow-md"
              >
                <Minus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              </button>
              <input
                type="number"
                min="16"
                max="30"
                step="1"
                value={hasEvent && eventTemp ? eventTemp : (localTemperatures[`ac-${ac.id}`] !== undefined ? localTemperatures[`ac-${ac.id}`] : (ac.temperature ?? 16))}
                disabled={hasEvent || temperatureLoading[`ac-${ac.id}`] || user?.status === 'restricted' || user?.status === 'locked'}
                className={`w-28 sm:w-24 px-3 sm:px-2 py-2 sm:py-1.5 text-lg sm:text-base text-center font-bold border-2 rounded-lg bg-white text-gray-900 transition-colors ${
                  hasEvent || temperatureLoading[`ac-${ac.id}`] || user?.status === 'restricted' || user?.status === 'locked'
                    ? 'opacity-50 cursor-not-allowed border-gray-200 text-gray-500' 
                    : 'border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900'
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
                className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold shadow-md"
              >
                <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
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
                // Create a temporary event object with deviceId pre-selected (as string for select element)
                const tempEvent = {
                  deviceId: String(ac.id)
                };
                console.log('🔧 [AdminDashboard] Device card + button clicked, setting deviceId:', tempEvent.deviceId, 'Device:', ac.name);
                setSelectedEvent(tempEvent);
                setShowEventTypeSelection(true);
              }}
              disabled={user?.status === 'locked' || user?.status === 'restricted'}
              className="flex-1 flex items-center justify-center space-x-0.5 px-1.5 py-1 rounded-md text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              title={
                user?.status === 'locked' || user?.status === 'restricted'
                  ? 'Restricted/Locked admins cannot create events'
                  : 'Create Event for this device'
              }
            >
              <Plus className="w-2.5 h-2.5" />
              <span>Event</span>
            </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔍 View button clicked for AC ID:', ac.id);
              handleViewACDetails(ac.id);
            }}
              className="flex-1 flex items-center justify-center space-x-0.5 px-1.5 py-1 rounded-md text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors shadow-sm"
              title="View brand, model, serial number, organization, and more"
          >
              <Eye className="w-2.5 h-2.5" />
              <span>View</span>
          </button>
          </div>
        </div>
      </div>
    );
  };

  // Events View Component
  const AdminEventsView = () => {
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
          const hasZ = dateValue.endsWith('Z');
          const hasOffset = dateValue.match(/[+-]\d{2}:?\d{2}$/);
          const hasPKTOffset = dateValue.includes('+05:00') || dateValue.includes('+0500');
          const hasTimezone = hasZ || hasOffset || hasPKTOffset;
          
          // Step 3: If NO timezone, add 'Z' to force UTC parsing
          // CRITICAL: Without 'Z', JavaScript parses as LOCAL time, causing 5-hour offset
          if (!hasTimezone && (dateValue.includes('T') || dateValue.match(/\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}/))) {
            // Remove trailing spaces and milliseconds, then append 'Z'
            dateValue = dateValue.replace(/\s+$/, '').replace(/\.\d{3,}$/, '');
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
        
        return pakistanTime;
      } catch (e) {
        console.error('❌ Date formatting exception:', e, dateString);
        return 'Invalid Date';
      }
    };

    // Format time only (HH:MM AM/PM) in PKT
    // CRITICAL: Backend stores UTC, but UI must display PKT
    const formatTime = (dateString) => {
      if (!dateString) return 'N/A';
      try {
        let date;
        
        if (dateString instanceof Date) {
          if (isNaN(dateString.getTime())) {
            return 'N/A';
          }
          // Date object is already in UTC (from backend)
          date = dateString;
        } else if (typeof dateString === 'string') {
          let dateValue = String(dateString).trim();
          
          // Normalize format (space to T)
          if (dateValue.includes(' ') && !dateValue.includes('T')) {
            dateValue = dateValue.replace(/\s+/, 'T');
          }
          
          // CRITICAL: Check if timezone indicator exists
          const hasZ = dateValue.endsWith('Z');
          const hasOffset = dateValue.match(/[+-]\d{2}:?\d{2}$/);
          const hasPKTOffset = dateValue.includes('+05:00') || dateValue.includes('+0500');
          const hasTimezone = hasZ || hasOffset || hasPKTOffset;
          
          // CRITICAL: If NO timezone, add 'Z' to force UTC parsing
          // Without 'Z', JavaScript parses as LOCAL time, causing 5-hour offset
          if (!hasTimezone && (dateValue.includes('T') || dateValue.match(/\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}/))) {
            // Remove trailing spaces and milliseconds, then append 'Z'
            dateValue = dateValue.replace(/\s+$/, '').replace(/\.\d{3,}$/, '');
            if (!dateValue.endsWith('Z')) {
              dateValue = dateValue + 'Z';
            }
          }
          
          // Parse as UTC
          date = new Date(dateValue);
          
          if (isNaN(date.getTime())) {
            console.error('❌ Failed to parse time:', {
              original: dateString,
              attempted: dateValue
            });
            return 'N/A';
          }
        } else {
          return 'N/A';
        }
        
        // CRITICAL: Date is in UTC, convert to PKT (UTC+5) for display
        // Use Intl.DateTimeFormat for accurate timezone conversion
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Karachi',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        
        const pkTime = formatter.format(date);
        return pkTime;
      } catch (e) {
        console.error('❌ Time formatting error:', e, dateString);
        return 'N/A';
      }
    };

    const getStatusBadge = (status, isDisabled, startTime, endTime) => {
      if (isDisabled) {
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-400 text-white">Disabled</span>;
      }
      
      // Check if event is waiting to start (startTime is in future)
      // CRITICAL: Use UTC time for comparison since events are stored in UTC
      const now = new Date();
      const nowUTC = new Date(now.toISOString());
      const eventStartTime = startTime ? new Date(startTime) : null;
      const eventEndTime = endTime ? new Date(endTime) : null;
      
      // If event is scheduled and startTime is in future (UTC), show "Waiting"
      // Compare in UTC to match backend logic
      const isWaitingToStart = eventStartTime && eventStartTime.getTime() > nowUTC.getTime();
      
      // If event endTime has passed OR status is completed, show "Ended"
      const isCompleted = (eventEndTime && eventEndTime.getTime() <= nowUTC.getTime()) || 
                         status === 'completed';
      
      // Determine actual status based on time and current status
      let actualStatus = status;
      
      // Priority 1: If endTime passed, mark as completed
      if (isCompleted) {
        actualStatus = 'completed';
      }
      // Priority 2: If waiting to start, show as waiting
      else if (isWaitingToStart && (status === 'scheduled' || status === 'active')) {
        actualStatus = 'waiting';
      }
      // Priority 3: If active and not completed, show as active (In Process)
      else if (status === 'active' && !isCompleted) {
        actualStatus = 'active'; // Will show as "In Process"
      }
      
      const statusConfig = {
        waiting: {
          color: 'bg-yellow-400 text-white shadow-sm',
          text: 'Waiting'
        },
        scheduled: {
          color: 'bg-blue-500 text-white shadow-sm',
          text: 'Scheduled'
        },
        active: {
          color: 'bg-green-500 text-white shadow-sm',
          text: 'In Process'
        },
        completed: {
          color: 'bg-gray-400 text-white shadow-sm',
          text: 'Completed'
        },
        stopped: {
          color: 'bg-red-500 text-white shadow-sm',
          text: 'Stopped'
        },
        cancelled: {
          color: 'bg-gray-400 text-white shadow-sm',
          text: 'Cancelled'
        }
      };
      
      const config = statusConfig[actualStatus] || { color: 'bg-gray-400 text-white shadow-sm', text: status.charAt(0).toUpperCase() + status.slice(1) };
      
      return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
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
      <div className="space-y-6 w-full max-w-full overflow-x-hidden">
        {/* Header Section - Enhanced */}
        <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl shadow-2xl p-6 border-2 border-blue-400 overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>
          <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="bg-white bg-opacity-25 rounded-xl p-3 shadow-xl transform group-hover:rotate-12 transition-transform duration-300">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1 drop-shadow-lg">Events</h2>
                <p className="text-blue-100 text-sm font-medium mb-2">Manage and schedule all events</p>
                <span className="inline-block bg-white bg-opacity-25 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg backdrop-blur-sm">
                  {Array.isArray(data.events) ? data.events.length : 0} Event{(Array.isArray(data.events) ? data.events.length : 0) !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  setSelectedEvent(null);
                  setShowEventTypeSelection(true);
                }}
                disabled={user?.status === 'locked' || user?.status === 'restricted'}
                className="flex items-center justify-center px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                title={
                  user?.status === 'locked' 
                    ? 'Locked admins cannot create events' 
                    : user?.status === 'restricted'
                    ? 'Restricted admins cannot create events. Contact admin for full permissions.'
                    : 'Create Event'
                }
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Event
              </button>
              <button
                onClick={loadEvents}
                disabled={eventsLoading}
                className="flex items-center justify-center px-4 py-3 bg-white bg-opacity-25 text-white rounded-xl hover:bg-white hover:text-blue-600 font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 mr-2 ${eventsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {!Array.isArray(data.events) || data.events.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-semibold text-gray-700 mb-2">No events found</p>
            <p className="text-sm text-gray-500">Create an event to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(data.events) && data.events.map((event) => {
              if (!event || !event.id) return null;
              const isLoading = eventActionLoading[event.id];
              const canStart = event.status === 'scheduled' && !event.isDisabled;
              const canStop = event.status === 'active' && !event.isDisabled;
              const canEdit = !event.isDisabled && event.status !== 'active' && event.status !== 'completed';
              const canDelete = event.status !== 'active' && event.status !== 'completed';
              const canEnable = event.isDisabled && (event.status === 'scheduled' || event.status === 'active');
              const canDisable = !event.isDisabled && (event.status === 'scheduled' || event.status === 'active');
              
              // CRITICAL: Use UTC time for comparison since events are stored in UTC
              const now = new Date();
              const nowUTC = new Date(now.toISOString());
              const eventStartTime = event.startTime ? new Date(event.startTime) : null;
              const eventEndTime = event.endTime ? new Date(event.endTime) : null;
              
              // Check if event is waiting to start (startTime is in future)
              const isWaitingToStart = eventStartTime && eventStartTime.getTime() > nowUTC.getTime();
              
              // Check if event is completed (endTime has passed OR status is completed)
              const isCompleted = (eventEndTime && eventEndTime.getTime() <= nowUTC.getTime()) || 
                                 event.status === 'completed';
              
              // Determine actual status based on time and current status
              let actualStatus = event.status;
              
              // Priority 1: If endTime passed, mark as completed
              if (isCompleted) {
                actualStatus = 'completed';
              }
              // Priority 2: If waiting to start, show as waiting
              else if (isWaitingToStart && (event.status === 'scheduled' || event.status === 'active')) {
                actualStatus = 'waiting';
              }
              // Priority 3: If active and not completed, show as active (In Process)
              else if (event.status === 'active' && !isCompleted) {
                actualStatus = 'active'; // Will show as "In Process"
              }

              return (
                <div key={event.id} className={`bg-white rounded-2xl shadow-lg border-2 ${event.isDisabled ? 'border-blue-300' : 'border-gray-200'} hover:shadow-xl hover:border-blue-400 transition-all duration-300 overflow-hidden flex flex-col`}>
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="bg-white bg-opacity-20 rounded-lg p-1.5">
                          <Calendar className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-base font-bold text-white truncate flex-1">
                          {event.name}
                        </h3>
                      </div>
                    </div>
                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getStatusBadge(actualStatus, event.isDisabled, event.startTime, event.endTime)}
                      {event.isRecurring && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-white bg-opacity-20 text-white backdrop-blur-sm">
                          🔁 Recurring
                        </span>
                      )}
                      {event.parentRecurringEventId && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-white bg-opacity-20 text-white backdrop-blur-sm">
                          Instance
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col">
                    {/* Event Details */}
                    <div className="space-y-2 mb-3">
                      {/* Device Info */}
                      <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex items-center space-x-2">
                          <Thermometer className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-xs font-medium text-gray-700">Device</span>
                        </div>
                        <span className="text-xs font-bold text-gray-900">
                          {event.device?.name || `Device #${event.deviceId}`}
                        </span>
                      </div>

                      {/* Temperature */}
                      {event.temperature && (
                        <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="flex items-center space-x-2">
                            <Thermometer className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-xs font-medium text-gray-700">Temp</span>
                          </div>
                          <span className="text-xs font-bold text-gray-900">{event.temperature}°C</span>
                        </div>
                      )}

                      {/* Time Info */}
                      <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        {event.isRecurring ? (
                          <div>
                            <div className="text-xs font-semibold text-gray-600 mb-0.5">Recurring</div>
                            {event.timeStart && event.timeEnd && (
                              <div className="text-xs font-bold text-gray-900">
                                {event.timeStart} - {event.timeEnd}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div>
                              <div className="text-xs font-semibold text-gray-600 mb-0.5">Start</div>
                              <div className="text-xs font-bold text-gray-900" title={formatDateTime(event.startTime)}>
                                {formatTime(event.startTime)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-gray-600 mb-0.5">End</div>
                              <div className="text-xs font-bold text-gray-900" title={formatDateTime(event.endTime)}>
                                {formatTime(event.endTime)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-1.5 mt-auto pt-3 border-t border-gray-200">
                      {canStart && (
                        <button
                          onClick={() => handleEventAction(event.id, 'start')}
                          disabled={!!isLoading || user?.status === 'restricted' || user?.status === 'locked'}
                          className="flex-1 flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm min-w-[70px]"
                          title="Start event"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Start</span>
                        </button>
                      )}
                      {canStop && (
                        <button
                          onClick={() => handleEventAction(event.id, 'stop')}
                          disabled={!!isLoading || user?.status === 'restricted' || user?.status === 'locked'}
                          className="flex-1 flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gray-500 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm min-w-[70px]"
                          title="Stop event"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>Stop</span>
                        </button>
                      )}
                      {canEnable && (
                        <button
                          onClick={() => handleEventAction(event.id, 'enable')}
                          disabled={!!isLoading || user?.status === 'restricted' || user?.status === 'locked'}
                          className="flex-1 flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm min-w-[70px]"
                          title="Enable event"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Enable</span>
                        </button>
                      )}
                      {canDisable && (
                        <button
                          onClick={() => handleEventAction(event.id, 'disable')}
                          disabled={!!isLoading || user?.status === 'restricted' || user?.status === 'locked'}
                          className="flex-1 flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm min-w-[70px]"
                          title="Disable event"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>Disable</span>
                        </button>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowEventModal(true);
                          }}
                          disabled={!!isLoading || user?.status === 'restricted' || user?.status === 'locked'}
                          className="flex-1 flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm min-w-[70px]"
                          title="Edit event"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleEventAction(event.id, 'delete')}
                          disabled={!!isLoading || user?.status === 'restricted' || user?.status === 'locked'}
                          className="flex-1 flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm min-w-[70px]"
                          title="Delete event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                      {isLoading && (
                        <div className="flex-1 flex items-center justify-center min-w-[70px]">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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
    // Show loading spinner during initial load
    if (initialLoading) {
      console.log('🔄 DashboardView: Showing loading spinner, initialLoading:', initialLoading);
      return (
        <div className="flex items-center justify-center min-h-[400px] w-full">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
        </div>
      );
    }
    
    console.log('✅ DashboardView: Rendering dashboard content', {
      initialLoading,
      organizations: data.organizations?.length || 0,
      acs: data.acs?.length || 0,
      managers: data.managers?.length || 0
    });
    
    const totalVenues = data.organizations.reduce((sum, org) => sum + (org.venues?.length || 0), 0);
    const activeACs = data.acs.filter(ac => ac.isOn === true || ac.isOn === 'true' || ac.isOn === 1).length;
    const totalEvents = Array.isArray(data.events) ? data.events.length : 0;
    const activeEvents = Array.isArray(data.events) ? data.events.filter(e => e.status === 'active').length : 0;
    const totalManagers = data.managers?.length || 0;

    return (
      <div className="space-y-4 sm:space-y-6 w-full px-2 sm:px-4 md:px-6 bg-gray-50 min-h-screen py-4 sm:py-6">
        {/* Top Row - Metric Cards (White with Orange Icons) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
          {/* Total Staff Members / Managers */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">{totalManagers}</p>
                <p className="text-sm sm:text-base text-gray-600 font-medium">Total Managers</p>
              </div>
              <div className="bg-blue-100 rounded-lg sm:rounded-xl p-3 sm:p-4">
                <Users className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500" />
              </div>
            </div>
          </div>

          {/* Total Appliances / AC Devices */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">{data.acs.length}</p>
                <p className="text-sm sm:text-base text-gray-600 font-medium">Total Appliances</p>
              </div>
              <div className="bg-blue-100 rounded-lg sm:rounded-xl p-3 sm:p-4">
                <Thermometer className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500" />
              </div>
            </div>
          </div>

          {/* Total Sensors / Venues */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">{totalVenues}</p>
                <p className="text-sm sm:text-base text-gray-600 font-medium">Total Venues</p>
              </div>
              <div className="bg-blue-100 rounded-lg sm:rounded-xl p-3 sm:p-4">
                <MapPin className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row - Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">

          {/* Add New Device Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-8 hover:shadow-xl transition-shadow">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Add New Device</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">add device from here and start managing it right now</p>
            <button
              onClick={() => setShowCreateACModal(true)}
              disabled={user?.status === 'locked' || user?.status === 'restricted'}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              Add +
            </button>
            <div className="mt-4 sm:mt-6 flex items-end justify-center space-x-2">
              <div className="bg-gray-100 rounded-lg p-2 sm:p-3 w-12 h-16 sm:w-16 sm:h-20 flex items-center justify-center">
                <Thermometer className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              </div>
              <div className="bg-gray-100 rounded-lg p-2 sm:p-3 w-12 h-20 sm:w-16 sm:h-24 flex items-center justify-center">
                <Thermometer className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              </div>
              <div className="bg-gray-100 rounded-lg p-2 sm:p-3 w-12 h-16 sm:w-16 sm:h-20 flex items-center justify-center">
                <Thermometer className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Staff Management Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-8 hover:shadow-xl transition-shadow">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Staff Management</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">See how many managers in your management list</p>
            <div className="flex justify-center">
              <div className="text-center p-4 sm:p-6 bg-blue-50 rounded-lg border border-blue-200 w-full max-w-xs">
                <p className="text-3xl sm:text-4xl font-bold text-blue-600 mb-2">{totalManagers}</p>
                <p className="text-base sm:text-lg font-semibold text-gray-700">Managers</p>
              </div>
            </div>
          </div>

          {/* System Info Card (Blue) */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-8 hover:shadow-xl transition-shadow text-white md:col-span-2 lg:col-span-1">
            <h3 className="text-xl sm:text-2xl font-bold mb-2">System Overview</h3>
            <p className="text-xs sm:text-sm text-blue-100 mb-4 sm:mb-6">view system statistics and information</p>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between p-2 sm:p-3 bg-white bg-opacity-20 rounded-lg backdrop-blur-sm">
                <span className="text-xs sm:text-sm font-medium text-white">Total Organizations</span>
                <span className="text-xl sm:text-2xl font-bold">{data.organizations.length}</span>
              </div>
              <div className="flex items-center justify-between p-2 sm:p-3 bg-white bg-opacity-20 rounded-lg backdrop-blur-sm">
                <span className="text-xs sm:text-sm font-medium text-white">Active Events</span>
                <span className="text-xl sm:text-2xl font-bold">{activeEvents}</span>
              </div>
              <div className="flex items-center justify-between p-2 sm:p-3 bg-white bg-opacity-20 rounded-lg backdrop-blur-sm">
                <span className="text-xs sm:text-sm font-medium text-white">Total Alerts</span>
                <span className="text-xl sm:text-2xl font-bold">{alerts.length}</span>
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

    // Note: Restricted admins can still view data, they just can't perform actions
    // Actions will be blocked by backend and show restriction messages

    switch (activeTab) {
      case 'dashboard':
        console.log('📊 [renderContent] Rendering dashboard tab', { initialLoading, dataLength: data.organizations?.length });
        return <DashboardView />;
      case 'venue-dashboard':
        // Show VenueDetailsPage in main content area (not in sidebar)
        // Always show dropdowns, and show venue details if selected, otherwise show empty state
        
        // Get current venue and its organization (if venue is selected)
        const currentVenue = selectedVenueId ? data.venues?.find(v => v.id === selectedVenueId) : null;
        const currentOrg = currentVenue ? data.organizations.find(o => 
          o.id === currentVenue.organizationId || 
          (o.venues && o.venues.some(v => v.id === currentVenue.id))
        ) : null;
        
        // Get filtered venues for selected organization (or all venues if no org selected)
        const filteredVenues = currentOrg ? (data.venues || []).filter(v => 
          v.organizationId === currentOrg.id || 
          (currentOrg.venues && currentOrg.venues.some(ov => ov.id === v.id))
        ) : [];
        
        return (
          <div className="w-full min-h-screen max-w-full overflow-x-hidden">
            {/* Show venue details if selected, otherwise show empty state */}
            {selectedVenueId ? (
              <VenueDetailsPage 
                venueIdProp={selectedVenueId} 
                hideHeader={true} 
                sidebarOpen={sidebarOpen}
                onVenueChange={(newVenueId) => setSelectedVenueId(newVenueId)}
                onEventCreated={async () => {
                  // Reload events list in AdminDashboard when event is created from venue detail page
                  // Add delay to ensure backend has processed the event
                  console.log('🔄 [AdminDashboard] Event created/updated from venue detail - will reload events');
                  setTimeout(async () => {
                    console.log('🔄 [AdminDashboard] Reloading events after creation from venue detail page');
                    try {
                      await loadEvents();
                      console.log('✅ [AdminDashboard] Events reloaded successfully');
                      // If Events tab is active, show success message
                      if (activeTab === 'events') {
                        toast.success('Events list refreshed');
                      }
                    } catch (error) {
                      console.error('❌ [AdminDashboard] Failed to reload events:', error);
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
                  <p className="text-gray-500">Choose an organization and venue from the dropdowns above to view dashboard details.</p>
                </div>
              </div>
            )}
          </div>
        );
        case 'events':
          return <AdminEventsView />;
      case 'venues':
        // Get all venues - from data.venues (which includes venues from orgs + separate API)
        // Also include organization info for each venue
        const allVenuesWithOrg = (data.venues || []).map(venue => {
          // Find the organization for this venue
          const org = data.organizations.find(o => 
            o.id === venue.organizationId || 
            (o.venues && o.venues.some(v => v.id === venue.id))
          );
          
          return {
            ...venue,
            organization: org ? {
              id: org.id,
              name: org.name
            } : null
          };
        });
        
        return (
          <div className="space-y-8">
            {/* Header Section - Ultra Enhanced */}
            <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 border-2 border-blue-400 overflow-hidden">
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
                      {allVenuesWithOrg.length} Total Venue{allVenuesWithOrg.length !== 1 ? 's' : ''}
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
                  <button
                    onClick={() => setShowCreateVenueModal(true)}
                    className="flex items-center px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
                  >
                    <Plus className="w-6 h-6 mr-2" />
                    Add Venue
                  </button>
                </div>
              </div>
            </div>
            
            {allVenuesWithOrg.length === 0 ? (
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
                      {allVenuesWithOrg.map(venue => {
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
                {allVenuesWithOrg.map(venue => (
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
            <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 border-2 border-blue-400 overflow-hidden">
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
                  <button
                    onClick={() => setShowCreateOrgModal(true)}
                    className="flex items-center px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
                  >
                    <Plus className="w-6 h-6 mr-2" />
                    Add Organization
                  </button>
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4">
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
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
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
                          const orgVenues = org.venues || data.venues.filter(v => v.organizationId === org.id);
                          const orgACs = data.acs.filter(ac => 
                            ac.organizationId === org.id || ac.organization?.id === org.id
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
                                  onClick={() => {
                                    loadOrganizationEnergy(org.id);
                                    handleViewOrganizationDetails(org.id);
                                  }}
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
                    <OrganizationCard key={org.id} org={org} />
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
        // Helper function to get venue name for a device
        const getVenueName = (ac) => {
          if (ac.venue?.name) return ac.venue.name;
          const venue = data.venues.find(v => v.id === ac.venueId);
          return venue?.name || 'N/A';
        };

        return (
          <div className="space-y-8">
            {/* Header Section - Enhanced */}
            <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 border-2 border-blue-400 overflow-hidden">
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
                  <button
                    onClick={() => setShowCreateACModal(true)}
                    className="flex items-center px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
                  >
                    <Plus className="w-6 h-6 mr-2" />
                    Add AC Device
                  </button>
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Device ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Organization
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Venue
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Temperature
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Events
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center justify-center gap-1.5">
                              <Eye className="w-4 h-4" />
                              <span>View</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {data.acs.map((ac) => {
                          const deviceEvents = Array.isArray(data.events) ? data.events.filter(e => 
                            e.deviceId === ac.id && e.eventType === 'device'
                          ) : [];
                          const venue = data.venues.find(v => v.id === ac.venueId);
                          
                          // Find organization for this device
                          const { org } = (() => {
                            let org = null;
                            if (ac.organization) {
                              org = ac.organization;
                            } else if (ac.organizationId) {
                              org = data.organizations.find(o => o.id === ac.organizationId);
                            } else if (venue) {
                              org = data.organizations.find(o => 
                                o.id === venue.organizationId || 
                                (o.venues && o.venues.some(v => v.id === venue.id))
                              );
                            } else if (ac.venueId) {
                              org = data.organizations.find(o => o.id === ac.venueId);
                            }
                            return { org };
                          })();
                          
                          const currentTemp = localTemperatures[`ac-${ac.id}`] !== undefined 
                            ? localTemperatures[`ac-${ac.id}`] 
                            : (ac.temperature ?? 16);
                          const isLoading = temperatureLoading[`ac-${ac.id}`] || acPowerLoading[ac.id];
                          
                          return (
                            <tr key={ac.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{ac.name}</div>
                                <div className="text-xs text-gray-500">{ac.serialNumber || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-900">{org ? org.name : 'N/A'}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-900">{getVenueName(ac)}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => {
                                      const newTemp = Math.max(16, currentTemp - 1);
                                      handleTemperatureChange('ac', ac.id, newTemp);
                                      handleSetACTemperature(ac.id, newTemp);
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
                                          handleSetACTemperature(ac.id, temp);
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
                                            handleSetACTemperature(ac.id, temp);
                                          }
                                        }
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={() => {
                                      const newTemp = Math.min(30, currentTemp + 1);
                                      handleTemperatureChange('ac', ac.id, newTemp);
                                      handleSetACTemperature(ac.id, newTemp);
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
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!isLoading && user?.status !== 'restricted' && user?.status !== 'locked') {
                                      handleToggleACPower(ac.id);
                                    }
                                  }}
                                  disabled={isLoading || user?.status === 'restricted' || user?.status === 'locked'}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    ac.isOn ? 'bg-green-500' : 'bg-gray-300'
                                  }`}
                                  title={ac.isOn ? 'Turn OFF' : 'Turn ON'}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                      ac.isOn ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                                <span className="ml-2 text-sm text-gray-700">
                                  {ac.isOn ? 'On' : 'Off'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const tempEvent = {
                                      deviceId: String(ac.id)
                                    };
                                    setSelectedEvent(tempEvent);
                                    setShowEventTypeSelection(true);
                                  }}
                                  disabled={user?.status === 'locked' || user?.status === 'restricted'}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  title={user?.status === 'locked' || user?.status === 'restricted' ? 'Restricted/Locked admins cannot create events' : 'Create Event for this device'}
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                                {deviceEvents.length > 0 && (
                                  <span className="ml-2 text-xs text-gray-500">({deviceEvents.length})</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleViewACDetails(ac.id);
                                  }}
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
                    <ACCard key={ac.id} ac={ac} />
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
      case 'energy':
        const totalEnergy = data.acs.reduce((sum, ac) => sum + (ac.totalEnergyConsumed || 0), 0);
        const activeACsCount = data.acs.filter(ac => ac.isOn).length;
        const totalACsCount = data.acs.length;
        
        // Helper function to find organization and venue for a device
        const getDeviceOrgAndVenue = (ac) => {
          // Try to find organization
          let org = null;
          let venue = null;
          
          // Method 1: Check if device has direct organization relationship
          if (ac.organization) {
            org = ac.organization;
          } else if (ac.organizationId) {
            org = data.organizations.find(o => o.id === ac.organizationId);
          }
          
          // Method 2: Find organization through venue
          if (!org && ac.venueId) {
            venue = data.venues.find(v => v.id === ac.venueId);
            if (venue) {
              org = data.organizations.find(o => 
                o.id === venue.organizationId || 
                (o.venues && o.venues.some(v => v.id === venue.id))
              );
            }
          }
          
          // Method 3: Find organization by checking if venueId matches organizationId
          if (!org && ac.venueId) {
            org = data.organizations.find(o => o.id === ac.venueId);
          }
          
          // Find venue if not found yet
          if (!venue && ac.venueId) {
            venue = data.venues.find(v => v.id === ac.venueId);
          }
          
          return { org, venue };
        };
        
        // Function to download energy report as CSV
        const downloadEnergyReport = async () => {
          try {
            toast.info('Generating energy report...');
            const response = await adminAPI.getEnergyReport();
            const report = response.data?.data;
            
            if (!report || !report.organizations) {
              toast.error('Failed to generate report');
              return;
            }

            // Generate CSV content
            let csvContent = 'Energy Consumption Report - Device → Venue → Organization Hierarchy\n';
            csvContent += `Generated At: ${new Date(report.generatedAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}\n\n`;
            
            // Get months from first organization
            const months = report.organizations[0]?.monthlyEnergy || [];
            
            // Section 1: Monthly Energy Summary by Organization
            csvContent += '=== MONTHLY ENERGY SUMMARY BY ORGANIZATION ===\n';
            csvContent += 'Organization,';
            months.forEach(month => {
              csvContent += `${month.month} ${month.year},`;
            });
            csvContent += 'Total\n';
            
            report.organizations.forEach(org => {
              csvContent += `"${org.organizationName}",`;
              let orgMonthlyTotal = 0;
              org.monthlyEnergy.forEach(month => {
                csvContent += `${month.energy.toFixed(2)},`;
                orgMonthlyTotal += month.energy;
              });
              csvContent += `${org.totalEnergy.toFixed(2)}\n`;
            });
            
            csvContent += '\n';
            
            // Section 2: Detailed Hierarchy (Device → Venue → Organization)
            csvContent += '=== DETAILED ENERGY BREAKDOWN (Device → Venue → Organization) ===\n';
            csvContent += 'Organization,Venue,Ton,Device Energy (KV),Venue Total (KV),Organization Total (KV),';
            months.forEach(month => {
              csvContent += `${month.month} ${month.year},`;
            });
            csvContent += '\n';
            
            // Process each organization
            report.organizations.forEach(org => {
              // Organization summary row
              csvContent += `"${org.organizationName}",TOTAL,TOTAL,${org.totalEnergy.toFixed(2)},${org.totalEnergy.toFixed(2)},${org.totalEnergy.toFixed(2)},`;
              org.monthlyEnergy.forEach(month => {
                csvContent += `${month.energy.toFixed(2)},`;
              });
              csvContent += '\n';
              
              // Venue rows
              org.venues.forEach(venue => {
                // Venue summary row
                csvContent += `"${org.organizationName}","${venue.venueName}",TOTAL,${venue.totalEnergy.toFixed(2)},${venue.totalEnergy.toFixed(2)},${org.totalEnergy.toFixed(2)},`;
                // Calculate monthly venue energy (distribute proportionally)
                org.monthlyEnergy.forEach(month => {
                  const venueMonthlyEnergy = (venue.totalEnergy / org.totalEnergy) * month.energy;
                  csvContent += `${venueMonthlyEnergy.toFixed(2)},`;
                });
                csvContent += '\n';
                
                // Device rows
                venue.devices.forEach(device => {
                  // Get ton value - check multiple possible field names
                  let deviceTon = 'N/A';
                  if (device.deviceTon) {
                    deviceTon = String(device.deviceTon);
                  } else if (device.ton) {
                    deviceTon = String(device.ton);
                  } else if (device.device?.ton) {
                    deviceTon = String(device.device.ton);
                  }
                  csvContent += `"${org.organizationName}","${venue.venueName}","${deviceTon}",${device.energy.toFixed(2)},${venue.totalEnergy.toFixed(2)},${org.totalEnergy.toFixed(2)},`;
                  // Calculate monthly device energy (distribute proportionally)
                  org.monthlyEnergy.forEach(month => {
                    const deviceMonthlyEnergy = (device.energy / org.totalEnergy) * month.energy;
                    csvContent += `${deviceMonthlyEnergy.toFixed(2)},`;
                  });
                  csvContent += '\n';
                });
              });
              
              csvContent += '\n'; // Empty line between organizations
            });
            
            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            const fileName = `energy_report_${new Date().toISOString().split('T')[0]}.csv`;
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast.success('Energy report downloaded successfully!');
          } catch (error) {
            console.error('Error downloading energy report:', error);
            toast.error('Failed to download energy report');
          }
        };
        
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
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Building className="w-5 h-5 mr-2 text-blue-600" />
                Energy by Organization
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
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
            )}

            {/* Venues Energy Consumption */}
            {energyViewMode === 'venue' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                Energy by Venue
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {data.venues.map(venue => {
                  // Get devices for this venue
                  const venueACs = data.acs.filter(ac => {
                    // Exclude devices that belong to parent organization
                    if (venue.organizationId && ac.venueId === venue.organizationId) {
                      return false;
                    }
                    return ac.venueId === venue.id;
                  });
                  
                  const venueEnergy = venueACs.reduce((sum, ac) => sum + (ac.totalEnergyConsumed || 0), 0);
                  const venueActiveACs = venueACs.filter(ac => ac.isOn).length;
                  
                  // Find organization for this venue
                  const venueOrg = data.organizations.find(o => 
                    o.id === venue.organizationId || 
                    (o.venues && o.venues.some(v => v.id === venue.id))
                  );
                  
                  return (
                    <div key={venue.id} className="bg-white rounded-lg shadow-md p-5 border border-gray-200 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{venue.name}</h4>
                          {venueOrg && (
                            <p className="text-xs text-gray-500 mb-1">Organization: {venueOrg.name}</p>
                          )}
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
                })}
              </div>
            </div>
            )}

            {/* AC Devices Energy Consumption */}
            {energyViewMode === 'device' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Thermometer className="w-5 h-5 mr-2 text-blue-600" />
                Energy by AC Device
              </h3>
              <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-300">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border-collapse">
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
                              <div className="flex flex-col gap-1">
                                {/* Connection Status */}
                                <span className={`px-2 py-1 text-xs font-medium rounded border ${
                                  ac.isConnected !== false
                                    ? 'bg-blue-100 text-blue-800 border-blue-300' 
                                    : 'bg-red-100 text-red-800 border-red-300'
                                }`}>
                                  {ac.isConnected !== false ? 'Connected' : 'Disconnected'}
                                </span>
                                {/* Power Status */}
                                <span className={`px-2 py-1 text-xs font-medium rounded border ${
                                  ac.isOn 
                                    ? 'bg-green-100 text-green-800 border-green-300' 
                                    : 'bg-gray-100 text-gray-800 border-gray-300'
                                }`}>
                                  {ac.isOn ? 'ON' : 'OFF'}
                                </span>
                                {acEnergy?.isOnStartup && (
                                  <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded border border-yellow-300">
                                    Startup
                                  </span>
                                )}
                              </div>
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

            {/* Download Report Modal with Filters */}
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
                  className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                  style={{
                    animation: 'fadeIn 0.3s ease-out',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)'
                  }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setShowDownloadModal(false);
                      setEnergyFilters({ month: null, organizationId: null, venueId: null, deviceId: null });
                    }
                  }}
                >
                  <div 
                    className="bg-white rounded-xl shadow-2xl shadow-gray-900/20 p-0 w-full max-w-5xl transform transition-all relative z-10"
                    style={{
                      animation: 'slideUp 0.4s ease-out',
                      backdropFilter: 'none',
                      WebkitBackdropFilter: 'none'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                  {/* Header */}
                  <div className="bg-white border-b border-gray-200 px-6 py-5">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">Download Energy Report</h3>
                        <p className="text-sm text-gray-500 mt-1">Select filters to customize your report</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowDownloadModal(false);
                          setEnergyFilters({ month: null, organizationId: null, venueId: null, deviceId: null, year: null });
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
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 md:p-10">
                      <h3 className="text-2xl font-bold text-blue-700 mb-8">Report Filters</h3>
                      <div className="space-y-6">
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
                            {energyFilters.organizationId && data.venues
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
                  <div className="bg-white p-8 md:p-10 border-l border-gray-200">
                    <h3 className="text-2xl font-bold text-gray-900 mb-8">Download Options</h3>
                    <div className="space-y-6">
                      {/* Year Selector */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                          Select Year *
                        </label>
                        <input
                          type="number"
                          min="2020"
                          max={new Date().getFullYear()}
                          value={energyFilters.year || new Date().getFullYear()}
                          onChange={(e) => setEnergyFilters(prev => ({ ...prev, year: e.target.value ? parseInt(e.target.value) : new Date().getFullYear() }))}
                          className="w-full border border-gray-300 rounded-lg bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-all"
                          placeholder="Enter year"
                          required
                        />
                        <p className="mt-2 text-xs text-gray-500">Select the year for the report</p>
                      </div>

                      {/* Monthly Report Button */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                          Monthly Report
                        </label>
                        <button
                          onClick={async () => {
                            try {
                              setShowDownloadModal(false);
                              
                              toast.loading('Generating monthly energy report...', { id: 'monthly-report' });
                              
                              let response;
                              try {
                                response = await adminAPI.getEnergyReport();
                              } catch (apiError) {
                                console.error('API Error:', apiError);
                                toast.error(apiError.response?.data?.message || apiError.message || 'Failed to fetch energy report', { id: 'monthly-report' });
                                return;
                              }
                              
                              // Check if response is successful
                              if (!response || !response.data) {
                                console.error('Invalid API response:', response);
                                toast.error('Invalid response from server', { id: 'monthly-report' });
                                return;
                              }
                              
                              // Handle different response structures
                              let report = null;
                              if (response.data?.data) {
                                report = response.data.data;
                              } else if (response.data?.organizations) {
                                report = response.data;
                              } else if (response.data?.success && response.data?.data) {
                                report = response.data.data;
                              } else {
                                report = response.data;
                              }
                              
                              if (!report || !report.organizations) {
                                console.error('Invalid report structure:', {
                                  response: response.data,
                                  report: report,
                                  hasOrganizations: !!report?.organizations
                                });
                                toast.error('Failed to generate report: Invalid data structure', { id: 'monthly-report' });
                                return;
                              }

                              let filteredOrgs = report.organizations || [];
                              
                              if (energyFilters.organizationId) {
                                filteredOrgs = filteredOrgs.filter(org => 
                                  org.organizationId === energyFilters.organizationId ||
                                  org.organizationId === parseInt(energyFilters.organizationId) ||
                                  org.id === energyFilters.organizationId ||
                                  org.id === parseInt(energyFilters.organizationId)
                                );
                              }

                              // Check if we have any organizations
                              if (filteredOrgs.length === 0) {
                                toast.error('No data available for the selected filters', { id: 'monthly-report' });
                                return;
                              }

                              // Filter by year if selected
                              const selectedYear = energyFilters.year || new Date().getFullYear();
                              
                              let csvContent = 'Energy Consumption Report - Monthly (Device → Venue → Organization Hierarchy)\n';
                              csvContent += `Generated At: ${report.generatedAt ? new Date(report.generatedAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }) : new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}\n`;
                              csvContent += `Report Type: Monthly\n`;
                              csvContent += `Year: ${selectedYear}\n`;
                              if (energyFilters.month) {
                                csvContent += `Filtered Month: ${new Date(energyFilters.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}\n`;
                              }
                              csvContent += '\n';
                              
                              // Filter months by selected year
                              const months = filteredOrgs[0]?.monthlyEnergy?.filter(m => m.year === selectedYear) || [];
                              
                              csvContent += '=== MONTHLY ENERGY SUMMARY BY ORGANIZATION ===\n';
                              csvContent += 'Organization,';
                              months.forEach(month => {
                                csvContent += `${month.month} ${month.year},`;
                              });
                              csvContent += 'Total\n';
                              
                              filteredOrgs.forEach(org => {
                                const orgName = org.organizationName || org.name || 'N/A';
                                csvContent += `"${orgName}",`;
                                let orgMonthlyTotal = 0;
                                const orgMonths = org.monthlyEnergy?.filter(m => m.year === selectedYear) || [];
                                orgMonths.forEach(month => {
                                  csvContent += `${(month.energy || 0).toFixed(2)},`;
                                  orgMonthlyTotal += (month.energy || 0);
                                });
                                csvContent += `${orgMonthlyTotal.toFixed(2)}\n`;
                              });
                              
                              csvContent += '\n';
                              
                              csvContent += '=== DETAILED HIERARCHY (Device → Venue → Organization) ===\n';
                              csvContent += 'Organization,Venue,Ton,Total Energy (kWh)\n';
                              
                              filteredOrgs.forEach(org => {
                                const orgName = org.organizationName || org.name || 'N/A';
                                const venues = org.venues || [];
                                
                                if (venues.length === 0) {
                                  // If no venues, still add organization row
                                  csvContent += `"${orgName}","N/A","N/A","0.00"\n`;
                                } else {
                                  venues.forEach(venue => {
                                    const venueName = venue.venueName || venue.name || 'N/A';
                                    const devices = venue.devices || [];
                                    
                                    if (devices.length === 0) {
                                      // If no devices, still add venue row
                                      csvContent += `"${orgName}","${venueName}","N/A","0.00"\n`;
                                    } else {
                                      devices.forEach(device => {
                                        // Get ton value - check multiple possible field names
                                        let deviceTon = 'N/A';
                                        if (device.deviceTon !== undefined && device.deviceTon !== null) {
                                          deviceTon = String(device.deviceTon);
                                        } else if (device.ton !== undefined && device.ton !== null) {
                                          deviceTon = String(device.ton);
                                        } else if (device.device?.ton !== undefined && device.device?.ton !== null) {
                                          deviceTon = String(device.device.ton);
                                        }
                                        
                                        // Debug logging
                                        if (deviceTon === 'N/A') {
                                          console.warn('⚠️ Device ton missing:', {
                                            deviceId: device.deviceId || device.id,
                                            deviceName: device.deviceName || device.name,
                                            device: device
                                          });
                                        }
                                        
                                        const deviceEnergy = device.energy || 0;
                                        csvContent += `"${orgName}","${venueName}","${deviceTon}","${deviceEnergy.toFixed(2)}"\n`;
                                      });
                                    }
                                  });
                                }
                              });
                              
                              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                              const link = document.createElement('a');
                              const url = URL.createObjectURL(blob);
                              link.setAttribute('href', url);
                              link.setAttribute('download', `energy-report-monthly-${selectedYear}-${new Date().toISOString().split('T')[0]}.csv`);
                              link.style.visibility = 'hidden';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              
                              toast.success('Monthly energy report downloaded successfully!', { id: 'monthly-report' });
                              
                              setEnergyFilters({ month: null, organizationId: null, venueId: null, deviceId: null, year: null });
                            } catch (error) {
                              console.error('Download error:', error);
                              console.error('Error details:', {
                                message: error.message,
                                stack: error.stack,
                                response: error.response?.data
                              });
                              toast.error(error.message || 'Failed to download monthly energy report', { id: 'monthly-report' });
                            }
                          }}
                          className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Monthly Report
                        </button>
                        <p className="mt-2 text-xs text-gray-500">Download monthly breakdown for selected year</p>
                      </div>

                      {/* Yearly Report Button */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                          Yearly Report
                        </label>
                        <button
                          onClick={async () => {
                            try {
                              setShowDownloadModal(false);
                              
                              toast.loading('Generating yearly energy report...', { id: 'yearly-report' });
                              
                              let response;
                              try {
                                response = await adminAPI.getEnergyReport();
                              } catch (apiError) {
                                console.error('API Error:', apiError);
                                toast.error(apiError.response?.data?.message || apiError.message || 'Failed to fetch energy report', { id: 'yearly-report' });
                                return;
                              }
                              
                              // Check if response is successful
                              if (!response || !response.data) {
                                console.error('Invalid API response:', response);
                                toast.error('Invalid response from server', { id: 'yearly-report' });
                                return;
                              }
                              
                              // Handle different response structures
                              let report = null;
                              if (response.data?.data) {
                                report = response.data.data;
                              } else if (response.data?.organizations) {
                                report = response.data;
                              } else if (response.data?.success && response.data?.data) {
                                report = response.data.data;
                              } else {
                                report = response.data;
                              }
                              
                              if (!report || !report.organizations) {
                                console.error('Invalid report structure:', {
                                  response: response.data,
                                  report: report,
                                  hasOrganizations: !!report?.organizations
                                });
                                toast.error('Failed to generate report: Invalid data structure', { id: 'yearly-report' });
                                return;
                              }

                              let filteredOrgs = report.organizations || [];
                              
                              if (energyFilters.organizationId) {
                                filteredOrgs = filteredOrgs.filter(org => 
                                  org.organizationId === energyFilters.organizationId ||
                                  org.organizationId === parseInt(energyFilters.organizationId) ||
                                  org.id === energyFilters.organizationId ||
                                  org.id === parseInt(energyFilters.organizationId)
                                );
                              }

                              // Check if we have any organizations
                              if (filteredOrgs.length === 0) {
                                toast.error('No data available for the selected filters', { id: 'yearly-report' });
                                return;
                              }

                              // Filter by year if selected
                              const selectedYear = energyFilters.year || new Date().getFullYear();
                              
                              let csvContent = 'Energy Consumption Report - Yearly (Device → Venue → Organization Hierarchy)\n';
                              csvContent += `Generated At: ${report.generatedAt ? new Date(report.generatedAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }) : new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}\n`;
                              csvContent += `Report Type: Yearly\n`;
                              csvContent += `Year: ${selectedYear}\n`;
                              csvContent += '\n';
                              
                              csvContent += '=== YEARLY ENERGY SUMMARY BY ORGANIZATION ===\n';
                              csvContent += 'Organization,Total Energy (kWh)\n';
                              
                              filteredOrgs.forEach(org => {
                                // Calculate total energy for selected year
                                const orgMonths = org.monthlyEnergy?.filter(m => m.year === selectedYear) || [];
                                const yearlyTotal = orgMonths.reduce((sum, month) => sum + (month.energy || 0), 0);
                                const orgName = org.organizationName || org.name || 'N/A';
                                csvContent += `"${orgName}",${yearlyTotal.toFixed(2)}\n`;
                              });
                              
                              csvContent += '\n';
                              
                              csvContent += '=== DETAILED HIERARCHY (Device → Venue → Organization) ===\n';
                              csvContent += 'Organization,Venue,Ton,Total Energy (kWh)\n';
                              
                              filteredOrgs.forEach(org => {
                                const orgName = org.organizationName || org.name || 'N/A';
                                const venues = org.venues || [];
                                
                                if (venues.length === 0) {
                                  // If no venues, still add organization row
                                  csvContent += `"${orgName}","N/A","N/A","0.00"\n`;
                                } else {
                                  venues.forEach(venue => {
                                    const venueName = venue.venueName || venue.name || 'N/A';
                                    const devices = venue.devices || [];
                                    
                                    if (devices.length === 0) {
                                      // If no devices, still add venue row
                                      csvContent += `"${orgName}","${venueName}","N/A","0.00"\n`;
                                    } else {
                                      devices.forEach(device => {
                                        // Get ton value - check multiple possible field names
                                        let deviceTon = 'N/A';
                                        if (device.deviceTon !== undefined && device.deviceTon !== null) {
                                          deviceTon = String(device.deviceTon);
                                        } else if (device.ton !== undefined && device.ton !== null) {
                                          deviceTon = String(device.ton);
                                        } else if (device.device?.ton !== undefined && device.device?.ton !== null) {
                                          deviceTon = String(device.device.ton);
                                        }
                                        
                                        // Debug logging
                                        if (deviceTon === 'N/A') {
                                          console.warn('⚠️ Device ton missing:', {
                                            deviceId: device.deviceId || device.id,
                                            deviceName: device.deviceName || device.name,
                                            device: device
                                          });
                                        }
                                        
                                        const deviceEnergy = device.energy || 0;
                                        csvContent += `"${orgName}","${venueName}","${deviceTon}","${deviceEnergy.toFixed(2)}"\n`;
                                      });
                                    }
                                  });
                                }
                              });
                              
                              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                              const link = document.createElement('a');
                              const url = URL.createObjectURL(blob);
                              link.setAttribute('href', url);
                              link.setAttribute('download', `energy-report-yearly-${selectedYear}-${new Date().toISOString().split('T')[0]}.csv`);
                              link.style.visibility = 'hidden';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              
                              toast.success('Yearly energy report downloaded successfully!', { id: 'yearly-report' });
                              
                              setEnergyFilters({ month: null, organizationId: null, venueId: null, deviceId: null, year: null });
                            } catch (error) {
                              console.error('Download error:', error);
                              console.error('Error details:', {
                                message: error.message,
                                stack: error.stack,
                                response: error.response?.data
                              });
                              toast.error(error.message || 'Failed to download yearly energy report', { id: 'yearly-report' });
                            }
                          }}
                          className="w-full flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Yearly Report
                        </button>
                        <p className="mt-2 text-xs text-gray-500">Download yearly summary for selected year</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer with Cancel Button */}
                <div className="bg-white border-t border-gray-200 px-6 py-4 flex justify-end">
                  <button
                    onClick={() => {
                      setShowDownloadModal(false);
                      setEnergyFilters({ month: null, organizationId: null, venueId: null, deviceId: null, year: null });
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
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
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
      case 'managers':
        return (
          <div className="space-y-8">
            {/* Header Section - Ultra Enhanced */}
            <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-2xl shadow-2xl p-8 border-2 border-blue-400 overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>
              <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="flex items-center space-x-5">
                <div className="bg-white bg-opacity-25 rounded-2xl p-4 shadow-xl transform group-hover:rotate-12 transition-transform duration-300">
                    <Users className="w-10 h-10 text-white" />
                </div>
                <div>
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white mb-2 drop-shadow-lg">Managers</h2>
                    <p className="text-blue-100 text-sm sm:text-base font-medium mb-3">Manage and monitor all managers</p>
                    <span className="inline-block bg-white bg-opacity-25 text-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-lg backdrop-blur-sm">
                      {data.managers?.length || 0} Total Manager{(data.managers?.length || 0) !== 1 ? 's' : ''}
                  </span>
                </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* View Toggle */}
                  <div className="flex items-center bg-white bg-opacity-20 rounded-lg p-1">
                    <button
                      onClick={() => setManagerViewMode('cards')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        managerViewMode === 'cards'
                          ? 'bg-white text-blue-600 shadow-md'
                          : 'text-white hover:bg-white hover:bg-opacity-10'
                      }`}
                    >
                      Cards
                    </button>
                    <button
                      onClick={() => setManagerViewMode('table')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        managerViewMode === 'table'
                          ? 'bg-white text-blue-600 shadow-md'
                          : 'text-white hover:bg-white hover:bg-opacity-10'
                      }`}
                    >
                      Table
                    </button>
                  </div>
                  <button
                    onClick={() => setShowCreateManagerModal(true)}
                    className="flex items-center px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
                  >
                    <UserPlus className="w-6 h-6 mr-2" />
                    Add Manager
                  </button>
                </div>
              </div>
            </div>
            
            {(!data.managers || data.managers.length === 0) ? (
              <div className="bg-gradient-to-br from-white to-blue-50 p-8 sm:p-12 lg:p-16 rounded-xl sm:rounded-2xl shadow-2xl text-center border-2 border-blue-200">
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center shadow-lg">
                  <Users className="w-12 h-12 text-blue-600" />
                </div>
                <p className="text-gray-800 text-xl sm:text-2xl font-bold mb-3">No Managers Found</p>
                <p className="text-gray-600 text-sm sm:text-base mb-6">Get started by adding your first manager</p>
                <button
                  onClick={() => setShowCreateManagerModal(true)}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Add Manager
                </button>
              </div>
            ) : managerViewMode === 'table' ? (
              <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organizations</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.managers.map(manager => (
                        <tr key={manager.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{manager.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{manager.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              manager.status === 'unlocked' ? 'bg-green-100 text-green-800' : 
                              manager.status === 'locked' ? 'bg-red-100 text-red-800' : 
                              manager.status === 'restricted' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {manager.status || 'unlocked'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">
                              {manager.organizations?.length || 0} organization{(manager.organizations?.length || 0) !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedOrgForAssign({ id: null, managerId: manager.id });
                                  setShowAssignOrgModal(true);
                                }}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Assign organizations"
                              >
                                <UserPlus className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleUpdateManagerStatus(manager.id, 'unlocked')}
                                disabled={manager.status === 'unlocked'}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  manager.status === 'unlocked'
                                    ? 'bg-green-100 text-green-600 cursor-not-allowed opacity-50'
                                    : 'text-green-600 hover:bg-green-50'
                                }`}
                                title="Unlock manager"
                              >
                                <Unlock className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleUpdateManagerStatus(manager.id, 'restricted')}
                                disabled={manager.status === 'restricted'}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  manager.status === 'restricted'
                                    ? 'bg-yellow-100 text-yellow-600 cursor-not-allowed opacity-50'
                                    : 'text-yellow-600 hover:bg-yellow-50'
                                }`}
                                title="Restrict manager"
                              >
                                <Lock className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleUpdateManagerStatus(manager.id, 'locked')}
                                disabled={manager.status === 'locked'}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  manager.status === 'locked'
                                    ? 'bg-red-100 text-red-600 cursor-not-allowed opacity-50'
                                    : 'text-red-600 hover:bg-red-50'
                                }`}
                                title="Lock manager"
                              >
                                <Lock className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
                {data.managers.map(manager => (
                  <div key={manager.id} className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{manager.name}</h3>
                        <p className="text-sm text-gray-600">{manager.email}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        manager.status === 'unlocked' ? 'bg-green-100 text-green-800' : 
                        manager.status === 'locked' ? 'bg-red-100 text-red-800' : 
                        manager.status === 'restricted' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {manager.status || 'unlocked'}
                      </span>
                    </div>
                    {manager.organizations && manager.organizations.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-2">Assigned Organizations:</p>
                        <div className="flex flex-wrap gap-2">
                          {manager.organizations.map(org => (
                            <span key={org.id} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {org.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Assign Organizations Button */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => {
                          setSelectedOrgForAssign({ id: null, managerId: manager.id });
                          setShowAssignOrgModal(true);
                        }}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors shadow-sm hover:shadow"
                        title="Assign organizations to this manager"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Assign Organizations</span>
                      </button>
                    </div>
                    
                    {/* Status Change Buttons */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">Change Status:</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleUpdateManagerStatus(manager.id, 'unlocked')}
                          disabled={manager.status === 'unlocked'}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            manager.status === 'unlocked'
                              ? 'bg-green-500 text-white cursor-not-allowed opacity-50'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                          title="Unlock manager - Full access"
                        >
                          <Unlock className="w-3 h-3 inline mr-1" />
                          Unlocked
                        </button>
                        <button
                          onClick={() => handleUpdateManagerStatus(manager.id, 'restricted')}
                          disabled={manager.status === 'restricted'}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            manager.status === 'restricted'
                              ? 'bg-yellow-500 text-white cursor-not-allowed opacity-50'
                              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          }`}
                          title="Restrict manager - Limited access"
                        >
                          <Lock className="w-3 h-3 inline mr-1" />
                          Restricted
                        </button>
                        <button
                          onClick={() => handleUpdateManagerStatus(manager.id, 'locked')}
                          disabled={manager.status === 'locked'}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            manager.status === 'locked'
                              ? 'bg-red-500 text-white cursor-not-allowed opacity-50'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                          title="Lock manager - No access"
                        >
                          <Lock className="w-3 h-3 inline mr-1" />
                          Locked
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'logs':
        return (
          <div className="w-full max-w-full overflow-x-hidden">
            <ActivityLogTable logs={data.logs} loading={loading} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex w-full overflow-x-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-52 sm:w-60 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-14 xl:w-16'} bg-gradient-to-b from-blue-900 to-blue-800 text-white transition-all duration-300 ease-in-out flex flex-col fixed h-screen z-30`}>
        {/* Sidebar Header */}
        <div className={`p-3 sm:p-4 border-b border-blue-700 flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center lg:flex-col lg:space-y-4'}`}>
          {sidebarOpen ? (
            <div className="flex items-center space-x-3">
              <div className="bg-white rounded-lg p-2 flex items-center justify-center shadow-sm">
                <img src="/assets/logo.png" alt="IOTFIY Logo" className="w-6 h-6 object-contain" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Admin Panel</h2>
                <p className="text-xs text-blue-200 font-medium mt-0.5">Control Center</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-2 flex items-center justify-center shadow-sm">
              <img src="/assets/logo.png" alt="IOTFIY Logo" className="w-6 h-6 object-contain" />
            </div>
          )}
          {/* Collapse button - only show when sidebar is open, hide expand button on dashboard */}
          {sidebarOpen ? (
            <button
              onClick={() => {
                // Allow collapse on all tabs except dashboard (dashboard sidebar always collapsed)
                if (activeTab !== 'venue-dashboard') {
                  setSidebarOpen(false);
                }
              }}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
              title="Collapse sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          ) : (
            // Show expand button only if NOT on dashboard tab
            activeTab !== 'venue-dashboard' && (
              <button
                onClick={() => setSidebarOpen(true)}
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
                    // Close sidebar on mobile after selection
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
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

        {/* Sidebar Dashboard Panel - REMOVED - No longer showing in sidebar */}

        {/* Sidebar Footer */}
        <div className="p-2 border-t border-blue-700">
          <div className={`${sidebarOpen ? 'px-2.5' : 'px-2'} py-2 bg-blue-700 rounded-lg`}>
            <div className={`flex items-center ${sidebarOpen ? 'space-x-2' : 'justify-center'}`}>
              <div className="bg-blue-600 rounded-full p-1.5 flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{user?.name || 'Admin'}</p>
                  <p className="text-[10px] text-blue-200 truncate mt-0.5 leading-tight">{user?.email || 'admin@example.com'}</p>
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
        className={`flex-1 transition-all duration-300 bg-gray-50 min-h-screen flex flex-col overflow-x-hidden ${
          sidebarOpen 
            ? 'lg:ml-[208px] xl:ml-[240px]' 
            : 'lg:ml-[56px] xl:ml-[64px]'
        }`}
        style={{
          marginLeft: contentMarginLeft || undefined,
          width: contentWidth || undefined
        }}
      >
        {/* Top Header - 10% height */}
        <header className="bg-white shadow-md border-b sticky top-0 z-20 w-full min-h-[60px] sm:h-[10vh] flex-shrink-0 flex items-center">
          <div className="px-3 sm:px-4 md:px-6 w-full">
            <div className="flex justify-between items-center gap-2 sm:gap-3">
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-1.5 sm:p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                {/* Back button for Overview tab to go back to Dashboard */}
                {activeTab === 'dashboard' && (
                  <button
                    onClick={() => {
                      setActiveTab('venue-dashboard');
                      setSidebarOpen(false);
                    }}
                    className="p-1.5 sm:p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    title="Back to Dashboard"
                  >
                    <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
                    {tabs.find(t => t.id === activeTab)?.label || 'Dashboard'}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 truncate">
                    Welcome back, {user?.name || 'admin'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3 flex-shrink-0">
              {alerts.length > 0 && (
                  <div className="hidden sm:flex items-center space-x-1.5 sm:space-x-2 bg-red-50 px-2 sm:px-3 py-1 rounded-lg border border-red-200">
                    <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" />
                  <span className="text-xs sm:text-sm font-medium text-red-800">
                    {alerts.length} Alert{alerts.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
                <button
                  onClick={loadData}
                  className="p-1.5 sm:p-2 md:p-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Refresh Data"
                >
                  <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={logout}
                  className="flex items-center px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 text-xs sm:text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content - 90% height */}
        <main className="p-4 sm:p-6 w-full overflow-x-hidden flex-1 h-[90vh] overflow-y-auto">
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
                disableDeviceSelection={!!(selectedEvent?.deviceId && !selectedEvent?.id)}
              />
            </div>
          </div>
        </div>
      )}

      {showOrgDetailsModal && selectedOrgDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-xl max-w-4xl w-full mx-2 sm:mx-4 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
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
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
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
                      {selectedACDetails?.venue && (
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Venue:</span>
                          <span>{selectedACDetails.venue?.name || 'N/A'}</span>
                          {selectedACDetails.venue?.organization && (
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

      {/* Create Organization Modal */}
      {showCreateOrgModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Create Organization</h3>
                <button
                  onClick={() => setShowCreateOrgModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
                                            </div>
                                              </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const orgData = {
                  name: formData.get('name'),
                  address: formData.get('address') || '',
                  description: formData.get('description') || ''
                };
                try {
                  await handleCreateOrganization(orgData);
                  setShowCreateOrgModal(false);
                  e.target.reset();
                } catch (error) {
                  // Error already handled in handleCreateOrganization
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter organization name"
                />
                                              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter description"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateOrgModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
                                    </div>
                                  )}

      {/* Create Venue Modal */}
      {showCreateVenueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Create Venue</h3>
                <button
                  onClick={() => setShowCreateVenueModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
                                    </div>
                            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const venueData = {
                  name: formData.get('name'),
                  address: formData.get('address') || '',
                  organizationId: parseInt(formData.get('organizationId')),
                  organizationSize: formData.get('organizationSize'),
                  description: formData.get('description') || ''
                };
                try {
                  await handleCreateVenue(venueData);
                  setShowCreateVenueModal(false);
                  e.target.reset();
                } catch (error) {
                  // Error already handled in handleCreateVenue
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter venue name"
                />
                          </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization *</label>
                <select
                  name="organizationId"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Organization</option>
                  {data.organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter description"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateVenueModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Manager Modal */}
      {showCreateManagerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Create Manager</h3>
                <button
                  onClick={() => setShowCreateManagerModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const managerData = {
                  name: formData.get('name'),
                  email: formData.get('email'),
                  password: formData.get('password'),
                  phone: formData.get('phone') || ''
                };
                try {
                  await handleCreateManager(managerData);
                  setShowCreateManagerModal(false);
                  e.target.reset();
                } catch (error) {
                  // Error already handled in handleCreateManager
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manager Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter manager name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter password (min 6 characters)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter phone number"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateManagerModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
                        </div>
                      </div>
                    )}

      {/* Create AC Device Modal */}
      {showCreateACModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Create AC Device</h3>
                    <button
                  onClick={() => setShowCreateACModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                    >
                  <X className="w-6 h-6" />
                    </button>
                  </div>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const acData = {
                  name: formData.get('name'),
                  brand: formData.get('brand'),
                  model: formData.get('model'),
                  ton: formData.get('ton'),
                  serialNumber: formData.get('serialNumber'),
                  venueId: parseInt(formData.get('venueId')),
                  temperature: parseInt(formData.get('temperature')) || 22
                };
                try {
                  await handleCreateAC(acData);
                  setShowCreateACModal(false);
                  e.target.reset();
                } catch (error) {
                  // Error already handled in handleCreateAC
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Device Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter device name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number *</label>
                <input
                  type="text"
                  name="serialNumber"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter serial number"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
                  <input
                    type="text"
                    name="brand"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter brand"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
                  <input
                    type="text"
                    name="model"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter model"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">AC Capacity (Ton) *</label>
                <select
                  name="ton"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Ton</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(ton => (
                    <option key={ton} value={ton}>{ton} Ton</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue *</label>
                <select
                  name="venueId"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Venue</option>
                  {data.venues.map(venue => (
                    <option key={venue.id} value={venue.id}>{venue.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Temperature</label>
                <input
                  type="number"
                  name="temperature"
                  min="16"
                  max="30"
                  defaultValue="22"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateACModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Organization to Manager Modal */}
      {showAssignOrgModal && selectedOrgForAssign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedOrgForAssign.id ? 'Assign Organization to Manager' : 'Assign Organizations to Manager'}
                </h3>
                <button
                  onClick={() => {
                    setShowAssignOrgModal(false);
                    setSelectedOrgForAssign(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                let managerId;
                let organizationIds = [];
                
                // If coming from manager card, use that managerId
                if (selectedOrgForAssign.managerId) {
                  managerId = selectedOrgForAssign.managerId;
                  // Get selected organization IDs from checkboxes
                  const checkboxes = formData.getAll('organizationIds');
                  organizationIds = checkboxes.map(id => parseInt(id));
                } else {
                  // If coming from organization card, use selected organization
                  managerId = parseInt(formData.get('managerId'));
                  organizationIds = [selectedOrgForAssign.id];
                }
                
                if (organizationIds.length === 0) {
                  toast.error('Please select at least one organization');
                  return;
                }
                
                try {
                  await handleAssignOrganization(managerId, organizationIds);
                  setShowAssignOrgModal(false);
                  setSelectedOrgForAssign(null);
                  e.target.reset();
                } catch (error) {
                  // Error already handled in handleAssignOrganization
                }
              }}
              className="p-6 space-y-4"
            >
              {selectedOrgForAssign.id ? (
                // Single organization assignment (from organization card)
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-blue-900 mb-1">Organization:</p>
                    <p className="text-lg font-bold text-blue-700">{selectedOrgForAssign.name}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Manager *</label>
                    <select
                      name="managerId"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Manager</option>
                      {data.managers.map(manager => (
                        <option key={manager.id} value={manager.id}>{manager.name} ({manager.email})</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                // Multiple organizations assignment (from manager card)
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-green-900 mb-1">Manager:</p>
                    <p className="text-lg font-bold text-green-700">
                      {data.managers.find(m => m.id === selectedOrgForAssign.managerId)?.name || 'Manager'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Organizations to Assign *
                    </label>
                    <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                      {data.organizations.filter(org => !org.managerId || org.managerId !== selectedOrgForAssign.managerId).map(org => (
                        <label key={org.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            name="organizationIds"
                            value={org.id}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">{org.name}</span>
                        </label>
                      ))}
                      {data.organizations.filter(org => !org.managerId || org.managerId !== selectedOrgForAssign.managerId).length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">All organizations are already assigned</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      This will assign the selected organizations including all existing and future venues to the manager.
                    </p>
                  </div>
                </>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignOrgModal(false);
                    setSelectedOrgForAssign(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                >
                  {loading ? 'Assigning...' : 'Assign Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Wrapper component for VenueDetailsPage to work within AdminDashboard
// Energy Consumption Section Component for Sidebar
const VenueEnergySection = ({ venueId }) => {
  const [energyData, setEnergyData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!venueId) return;
    
    const loadEnergyData = async () => {
      try {
        setLoading(true);
        // Get venue details which includes energy info
        const res = await adminAPI.getVenueDetails(venueId);
        const venueData = res.data?.data?.venue || res.data?.venue || res.data?.data;
        
        if (venueData) {
          // Calculate total energy from devices in this venue
          const devices = res.data?.data?.devices || [];
          const totalEnergy = devices.reduce((sum, device) => {
            return sum + (device.energyConsumption || device.totalEnergyConsumed || 0);
          }, 0);
          
          setEnergyData({
            total: totalEnergy,
            deviceCount: devices.length
          });
        }
      } catch (error) {
        console.error('Error loading energy data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEnergyData();
  }, [venueId]);

  if (loading) {
    return <div className="text-xs text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-600">Total Energy:</span>
        <span className="text-xs font-bold text-blue-600">
          {energyData?.total ? `${energyData.total.toFixed(2)} KV` : '0 KV'}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-600">Devices:</span>
        <span className="text-xs font-semibold text-gray-800">
          {energyData?.deviceCount || 0}
        </span>
      </div>
    </div>
  );
};

// Alerts Section Component for Sidebar
const VenueAlertsSection = ({ venueId }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!venueId) return;
    
    const loadAlerts = async () => {
      try {
        setLoading(true);
        const res = await adminAPI.getActiveAlerts();
        const allAlerts = res.data?.data?.alerts || res.data?.alerts || [];
        
        // Filter alerts for this venue's devices
        const venueRes = await adminAPI.getVenueDetails(venueId);
        const venueData = venueRes.data?.data?.venue || venueRes.data?.venue || venueRes.data?.data;
        const deviceIds = venueData?.devices?.map(d => d.id) || [];
        
        const venueAlerts = allAlerts.filter(alert => 
          deviceIds.includes(alert.deviceId) || alert.venueId === venueId
        );
        
        setAlerts(venueAlerts);
      } catch (error) {
        console.error('Error loading alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
  }, [venueId]);

  if (loading) {
    return <div className="text-xs text-gray-500">Loading...</div>;
  }

  if (alerts.length === 0) {
    return (
      <div className="text-xs text-gray-500 text-center py-2">
        No alerts found
      </div>
    );
  }

  return (
    <div className="space-y-1.5 max-h-32 overflow-y-auto">
      {alerts.map((alert) => (
        <div key={alert.id} className="bg-red-50 border border-red-200 rounded p-1.5">
          <div className="text-xs font-semibold text-red-800">{alert.type || 'Alert'}</div>
          <div className="text-xs text-red-600 mt-0.5">{alert.message || alert.description || 'No description'}</div>
          {alert.deviceName && (
            <div className="text-xs text-gray-500 mt-0.5">Device: {alert.deviceName}</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AdminDashboard;



