import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { adminAPI } from '../services/apiAdmin';
import toast from 'react-hot-toast';
import EventForm from '../components/EventForm';
import { 
  VenueHeader,
  DeviceFilters,
  DeviceTable,
  DeviceSchedulingSection,
  EnergyChartBox
} from '../components/venuedetail';
import {
  DeviceDetailsModal,
  NeedMaintenanceModal,
  EventTypeSelectionModal
} from '../components/modals';
import { 
  AlertCircle,
  X
} from 'lucide-react';
import { useWebSocketNotifications } from '../hooks/useWebSocketNotifications';
import NotificationContainer from '../components/notifications/NotificationContainer';

const VenueDetailsPage = ({ venueIdProp, hideHeader = false, onVenueChange, onEventCreated, hasOrganizations = true, sidebarOpen = true }) => {
  const paramsVenueId = useParams().venueId;
  const venueId = venueIdProp || paramsVenueId; // Use prop if provided, otherwise use params
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [venue, setVenue] = useState(null);
  const [venues, setVenues] = useState([]);
  const [allVenues, setAllVenues] = useState([]); // Store all venues for filtering
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(null);
  const [devices, setDevices] = useState([]);
  const [organizationDevices, setOrganizationDevices] = useState([]); // All devices for selected organization
  const [organizationEnergy, setOrganizationEnergy] = useState(0); // Energy for selected organization
  const [events, setEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    alert: '',
    temperature: '',
    status: '',
    lock: ''
  });
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEventTypeSelection, setShowEventTypeSelection] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState(null); // 'simple' or 'recurring'
  const [eventDeviceId, setEventDeviceId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [deviceOrder, setDeviceOrder] = useState({}); // Store device order per venue: { venueId: [deviceIds...] }

  // WebSocket notification callbacks (memoized to prevent unnecessary re-renders)
  const handleDeviceConnected = useCallback((message) => {
    console.log('✅ [VenueDetailsPage] Device connected:', message);
    // Handle both serial and serialNumber fields
    const serialNumber = message.serialNumber || message.serial;
    console.log('✅ [VenueDetailsPage] Device serialNumber:', serialNumber);
    
    if (!serialNumber) {
      console.warn('⚠️ [VenueDetailsPage] DEVICE_CONNECTED event missing serialNumber/serial:', message);
      return;
    }
    
    // Update device connection status in local state
    setDevices((prevDevices) => {
      const updated = prevDevices.map((device) => {
        if (device.serialNumber === serialNumber) {
          console.log('✅ [VenueDetailsPage] Marking device as connected:', device.name, device.serialNumber);
          return { ...device, isConnected: true };
        }
        return device;
      });
      
      // Check if any device was updated
      const wasUpdated = updated.some((d, idx) => d.isConnected !== prevDevices[idx]?.isConnected);
      if (!wasUpdated) {
        console.warn('⚠️ [VenueDetailsPage] No device found with serialNumber:', serialNumber, 'Available devices:', prevDevices.map(d => d.serialNumber));
      }
      
      console.log('📊 [VenueDetailsPage] Updated devices:', updated.map(d => ({ name: d.name, serialNumber: d.serialNumber, isConnected: d.isConnected })));
      return updated;
    });
    // Show toast notification
    toast.success(message.message || `Device ${message.deviceName || serialNumber} is CONNECTED`);
  }, []);

  const handleDeviceDisconnected = useCallback((message) => {
    console.log('❌ Device disconnected:', message);
    // Handle both serial and serialNumber fields
    const serialNumber = message.serialNumber || message.serial;
    
    if (!serialNumber) {
      console.warn('⚠️ [VenueDetailsPage] DEVICE_DISCONNECTED event missing serialNumber/serial:', message);
      return;
    }
    
    // Update device connection status in local state
    setDevices((prevDevices) => {
      const updated = prevDevices.map((device) =>
        device.serialNumber === serialNumber
          ? { ...device, isConnected: false }
          : device
      );
      
      // Check if all devices are disconnected
      const allDisconnected = updated.every(device => !device.isConnected);
      if (allDisconnected && updated.length > 0) {
        // All devices disconnected - send alert
        toast.error(`⚠️ Alert: All devices in venue are offline!`, {
          duration: 5000,
        });
        console.warn('⚠️ All devices disconnected in venue');
      }
      
      return updated;
    });
    // Show toast notification
    toast.error(message.message || `Device ${message.deviceName || serialNumber} is DISCONNECTED`);
  }, []);

  const handleDeviceUpdated = useCallback((message) => {
    console.log('🔄 Device updated:', message);
    // Handle both serial and serialNumber fields
    const serialNumber = message.serialNumber || message.serial;
    
    if (!serialNumber) {
      console.warn('⚠️ [VenueDetailsPage] DEVICE_UPDATED event missing serialNumber/serial:', message);
      return;
    }
    
    // Only update if device is connected - revert action if offline
    setDevices((prevDevices) => {
      const device = prevDevices.find(d => d.serialNumber === serialNumber);
      if (!device) {
        console.warn('⚠️ Device update ignored - device not found:', serialNumber);
        return prevDevices;
      }
      
      // Revert action if device is offline
      if (!device.isConnected) {
        console.warn('⚠️ Device update ignored - device not connected:', serialNumber);
        toast.error(`⚠️ Device ${device.name || serialNumber} is offline. Update reverted.`);
        return prevDevices; // Revert by not updating
      }
      
      // Update device data in local state only if connected
      if (message.updateType === 'temperature') {
        return prevDevices.map((d) =>
          d.serialNumber === serialNumber
            ? { ...d, temperature: message.temperature }
            : d
        );
      } else if (message.updateType === 'power') {
        return prevDevices.map((d) =>
          d.serialNumber === serialNumber
            ? { ...d, isOn: message.isOn }
            : d
        );
      }
      return prevDevices;
    });
  }, []);

  // Load venue data function - must be defined before useCallback hooks that use it
  const loadVenueData = useCallback(async () => {
    if (!venueId) return;
    
    let venueErrorShown = false; // Declare outside try block
    
    try {
      setLoading(true);
      const [venueRes, venuesRes, acsRes, eventsRes, orgsRes] = await Promise.all([
        adminAPI.getVenueDetails(venueId).catch(err => {
          console.error('❌ Failed to load venue for venueId:', venueId, err);
          console.error('❌ Error details:', {
            message: err.message,
            response: err.response?.data,
            status: err.response?.status,
            statusText: err.response?.statusText
          });
          // Return error object instead of null to handle it properly
          return { error: true, status: err.response?.status, data: err.response?.data };
        }),
        adminAPI.getVenues().catch(err => {
          console.error('Failed to load venues:', err);
          return null;
        }),
        adminAPI.getACs().catch(err => {
          console.error('Failed to load ACs:', err);
          return null;
        }),
        adminAPI.getEvents().catch(err => {
          console.error('Failed to load events:', err);
          return null;
        }),
        adminAPI.getOrganizations().catch(err => {
          console.error('Failed to load organizations:', err);
          // Return error object to handle it properly
          return { error: true, status: err.response?.status, data: err.response?.data };
        })
      ]);

      console.log('🔍 Venue response check for venueId:', venueId, venueRes);
      
      // Check for error response first - but don't return early, check venues list first
      if (venueRes?.error) {
        console.error('❌ Venue API returned error:', venueRes);
        // Don't show error yet - wait to check venues list
      }
      
      // Declare venueData in function scope so it's accessible later
      let venueData = null;
      
      if (venueRes?.data) {
        console.log('🔍 Full venue response:', JSON.stringify(venueRes.data, null, 2));
        console.log('🔍 Response structure:', {
          hasData: !!venueRes.data,
          hasDataData: !!venueRes.data.data,
          hasDataDataVenue: !!venueRes.data.data?.venue,
          hasDataVenue: !!venueRes.data.venue,
          success: venueRes.data.success,
          keys: Object.keys(venueRes.data)
        });
        
        // Try different response structures
        if (venueRes.data.data?.venue) {
          const rawVenue = venueRes.data.data.venue;
          // Check if rawVenue has nested structure: {success: true, venue: {...}}
          if (rawVenue.venue) {
            venueData = rawVenue.venue;
            console.log('✅ Using venueRes.data.data.venue.venue (nested structure)');
          } else {
            venueData = rawVenue;
            console.log('✅ Using venueRes.data.data.venue (direct structure)');
          }
        } else if (venueRes.data.venue) {
          venueData = venueRes.data.venue;
          console.log('✅ Using venueRes.data.venue');
        } else if (venueRes.data.data && !venueRes.data.data.venue) {
          // If data exists but no venue property, data might be the venue itself
          if (venueRes.data.data.id || venueRes.data.data.name) {
            venueData = venueRes.data.data;
            console.log('✅ Using venueRes.data.data (venue object directly)');
          }
        }
        
        console.log('✅ Venue loaded:', venueData);
        if (venueData) {
          console.log('✅ Venue name:', venueData.name);
          console.log('✅ Venue ID:', venueData.id);
          console.log('✅ Venue isVenueOn:', venueData.isVenueOn);
          console.log('✅ Venue temperature:', venueData.temperature);
          console.log('✅ Venue isLocked:', venueData.isLocked);
          console.log('✅ Venue organizationId:', venueData.organizationId);
          console.log('✅ All venue keys:', Object.keys(venueData));
          setVenue(venueData);
        } else {
          console.warn('⚠️ Venue data not found in direct API response, will try venues list');
          // Don't show error yet - wait to check venues list
        }
      } else if (venueRes?.response) {
        // Handle error response
        console.error('❌ API Error Response:', venueRes.response);
        console.error('❌ Status:', venueRes.response.status);
        console.error('❌ Data:', venueRes.response.data);
        // Don't show error yet - wait to check venues list
      } else if (venueRes === null || venueRes === undefined) {
        console.warn('⚠️ No venue response received');
        // Don't show error yet - wait to check venues list
      }

      // Handle different response structures for venues
      // Backend returns: { success: true, data: { venues: [...] } }
      if (venuesRes?.data) {
        const loadedVenues = venuesRes.data.data?.venues || 
                         venuesRes.data.venues || 
                         (Array.isArray(venuesRes.data.data) ? venuesRes.data.data : []) ||
                         [];
        console.log('✅ Venues loaded:', loadedVenues.length, loadedVenues);
        setAllVenues(loadedVenues);
        
        // If venue data was not loaded from direct API call, try to get it from venues list
        if (!venueData && venueId) {
          const venueIdNum = typeof venueId === 'string' ? parseInt(venueId) : venueId;
          const foundVenue = loadedVenues.find(v => {
            const vId = typeof v.id === 'string' ? parseInt(v.id) : v.id;
            return vId === venueIdNum;
          });
          if (foundVenue) {
            console.log('✅ Found venue in venues list:', foundVenue.name);
            venueData = foundVenue;
            setVenue(foundVenue);
          } else {
            console.warn('⚠️ Venue not found in venues list for venueId:', venueIdNum);
            // Only show error if venue is not found in both direct API and venues list
            // AND if we have actually tried to load venues
            if (!venueErrorShown && venuesRes?.data) {
              if (venueRes?.error) {
                if (venueRes.status === 404) {
                  toast.error('Venue not found. Please check if the venue exists.');
                } else if (venueRes.status === 403) {
                  toast.error('You do not have permission to view this venue.');
                } else {
                  toast.error(venueRes.data?.message || 'Failed to load venue details');
                }
                venueErrorShown = true;
              } else if (!venueRes || venueRes === null) {
                toast.error('Failed to load venue details. Please check your connection.');
                venueErrorShown = true;
              }
            }
          }
        } else if (!venueData && !venuesRes?.data) {
          // No venue data and no venues list - show error
          if (!venueErrorShown) {
            if (venueRes?.error) {
              if (venueRes.status === 404) {
                toast.error('Venue not found. Please check if the venue exists.');
              } else if (venueRes.status === 403) {
                toast.error('You do not have permission to view this venue.');
              } else {
                toast.error(venueRes.data?.message || 'Failed to load venue details');
              }
              venueErrorShown = true;
            } else if (!venueRes || venueRes === null) {
              toast.error('Failed to load venue details. Please check your connection.');
              venueErrorShown = true;
            }
          }
        }
        
        // Filter venues by selected organization if any
        if (selectedOrganizationId) {
          const filteredVenues = loadedVenues.filter(v => 
            v.organizationId === selectedOrganizationId || 
            v.organization?.id === selectedOrganizationId
          );
          setVenues(filteredVenues);
        } else {
          // If no organization selected, show all venues
          setVenues(loadedVenues);
        }
      } else {
        console.warn('⚠️ No venues data in response:', venuesRes);
      }

      let venueACs = [];
      console.log('🔍 ACs Response check:', acsRes);
      if (acsRes?.data) {
        console.log('✅ ACs response received:', acsRes.data);
        // Backend returns: { success: true, data: [array of ACs] }
        // So acsRes.data = { success: true, data: [...] }
        // So acsRes.data.data = [array of ACs]
        const allACs = Array.isArray(acsRes.data.data) 
                      ? acsRes.data.data 
                      : (acsRes.data.data?.acs || acsRes.data.acs || []);
        
        console.log('✅ All ACs loaded:', allACs.length);
        if (allACs.length > 0) {
          console.log('📋 Sample AC:', allACs[0]);
          console.log('🔋 Sample AC Energy:', allACs[0].totalEnergyConsumed, 'KV');
          console.log('🔋 Sample AC has totalEnergyConsumed?', 'totalEnergyConsumed' in allACs[0]);
        }
        console.log('🔍 Filtering by venueId:', venueId, 'Type:', typeof venueId);
        console.log('🔍 All ACs before filtering:', allACs.length, allACs.map(ac => ({ 
          id: ac.id, 
          name: ac.name, 
          venueId: ac.venueId, 
          venueIdType: typeof ac.venueId 
        })));
        
        // Convert venueId to number for comparison
        const venueIdNum = venueId ? (typeof venueId === 'string' ? parseInt(venueId) : venueId) : null;
        console.log('🔍 Converted venueId to number:', venueIdNum, 'Original:', venueId);
        
        if (!venueIdNum || isNaN(venueIdNum)) {
          console.error('❌ Invalid venueId:', venueId, 'Cannot filter devices');
          setDevices([]);
          // Don't return early - continue to load other data (events, organizations)
        } else {
          // Get venue data for organizationId check (use venueData if available, otherwise use venue state)
          const currentVenueData = venueData || venue;
          console.log('🔍 Venue data available:', currentVenueData ? 'Yes' : 'No', currentVenueData?.name, 'orgId:', currentVenueData?.organizationId, 'venueId:', currentVenueData?.id);
          
          // CRITICAL: Filter devices that belong to this venue
          // Exclude devices that belong to parent organization (where venueId === organizationId)
          venueACs = allACs.filter(ac => {
            // Handle both string and number venueId
            const acVenueId = ac.venueId ? (typeof ac.venueId === 'string' ? parseInt(ac.venueId) : ac.venueId) : null;
            
            if (!acVenueId) {
              console.log('⚠️ Device has no venueId:', ac.name, ac.id);
              return false;
            }
            
            // Device must have venueId matching this venue's ID
            // Also check if device belongs to organization (venueId === organizationId)
            // This handles cases where organization is also a venue
            const matches = acVenueId === venueIdNum;
            
            // Also check if device belongs to organization that matches this venue's organization
            if (!matches && currentVenueData?.organizationId) {
              const orgIdNum = typeof currentVenueData.organizationId === 'string' 
                ? parseInt(currentVenueData.organizationId) 
                : currentVenueData.organizationId;
              
              // If device's venueId matches organizationId, include it if this venue is part of that org
              if (acVenueId === orgIdNum) {
                console.log('✅ Device included (belongs to organization):', ac.name, 'venueId:', ac.venueId, 'orgId:', orgIdNum);
                return true; // Include devices that belong to the organization
              }
            }
            if (matches) {
              console.log('✅ Device matched:', ac.name, 'venueId:', acVenueId, 'Type:', typeof ac.venueId, 'Expected:', venueIdNum);
            } else if (allACs.length <= 10) {
              // Log for first 10 devices to help debug
              console.log('❌ Device NOT matched:', ac.name, 'venueId:', acVenueId, 'Type:', typeof acVenueId, 'Expected:', venueIdNum, 'Raw venueId:', ac.venueId);
            }
            return matches;
          });
          
          console.log('✅ Venue devices filtered:', venueACs.length);
          
          // Initialize all devices as disconnected by default
          // They will be marked as connected only when DEVICE_CONNECTED event is received
          const devicesWithConnectionStatus = venueACs.map(device => ({
            ...device,
            isConnected: false, // Default to false - only true when device actually connects
          }));
          
          console.log('📱 [VenueDetailsPage] Devices initialized with connection status:', 
            devicesWithConnectionStatus.map(d => ({ 
              name: d.name, 
              serialNumber: d.serialNumber, 
              serialNumberType: typeof d.serialNumber,
              isConnected: d.isConnected 
            }))
          );
          
          // CRITICAL: Check if any devices should already be marked as connected
          // (in case DEVICE_CONNECTED event arrived before devices were loaded)
          if (recentConnectionEventsRef.current.size > 0) {
            console.log('🔄 [VenueDetailsPage] Found', recentConnectionEventsRef.current.size, 'stored connection events');
            console.log('📦 [VenueDetailsPage] Stored connection events:', Array.from(recentConnectionEventsRef.current.keys()));
            
            devicesWithConnectionStatus.forEach(device => {
              if (device.serialNumber && recentConnectionEventsRef.current.has(device.serialNumber)) {
                console.log('✅ [VenueDetailsPage] Device', device.name, 'should be marked as connected (event was stored)');
                device.isConnected = true;
              }
            });
          }
          
          // Check if no devices exist or all are disconnected - send alert
          if (devicesWithConnectionStatus.length === 0) {
            console.warn('⚠️ No devices found in venue');
            toast.error('⚠️ No devices found in this venue', {
              duration: 4000,
            });
          } else {
            // Check if all devices are disconnected
            const allDisconnected = devicesWithConnectionStatus.every(device => !device.isConnected);
            console.log('📊 [VenueDetailsPage] All devices disconnected?', allDisconnected, 'Total devices:', devicesWithConnectionStatus.length);
            if (allDisconnected) {
              console.warn('⚠️ All devices are offline in venue');
              toast.error('⚠️ Alert: All devices in this venue are offline', {
                duration: 5000,
              });
            }
          }
          
          if (devicesWithConnectionStatus.length > 0) {
            console.log('✅ First device:', devicesWithConnectionStatus[0]);
            // Auto-select first device if no device is selected
            setSelectedDevice(prev => {
              if (!prev || !devicesWithConnectionStatus.find(d => d.id === prev.id)) {
                const firstDevice = devicesWithConnectionStatus[0];
                const deviceVenue = currentVenueData || venue;
                const deviceVenueName = deviceVenue?.name || 'Unknown Venue';
                return {
                  ...firstDevice,
                  venue: deviceVenueName
                };
              }
              return prev;
            });
          } else {
            console.warn('⚠️ No devices found for venueId:', venueIdNum);
            if (allACs.length > 0) {
              console.warn('⚠️ Available venueIds in ACs:', allACs.map(ac => ({ name: ac.name, venueId: ac.venueId })));
            } else {
              console.warn('⚠️ No ACs found at all!');
            }
            // Clear selected device if no devices found
            setSelectedDevice(null);
          }
          setDevices(devicesWithConnectionStatus);
          
          // Load device order from localStorage for this venue
          if (venueId) {
            const savedOrder = localStorage.getItem(`deviceOrder_${venueId}`);
            if (savedOrder) {
              try {
                const orderData = JSON.parse(savedOrder);
                setDeviceOrder(prev => ({ ...prev, [venueId]: orderData }));
              } catch (e) {
                console.error('Error loading device order:', e);
              }
            }
          }
        }
      } else {
        console.warn('⚠️ No ACs data in response:', acsRes);
        console.warn('⚠️ ACs response structure:', {
          hasResponse: !!acsRes,
          hasData: !!acsRes?.data,
          response: acsRes
        });
        setDevices([]);
      }

      if (eventsRes?.data) {
        console.log('📅 [VenueDetailsPage] Events response received:', eventsRes.data);
        const allEvents = eventsRes.data.data?.events || 
                         eventsRes.data.events || 
                         (Array.isArray(eventsRes.data.data) ? eventsRes.data.data : []) ||
                         [];
        console.log('📅 [VenueDetailsPage] All events parsed:', allEvents.length, allEvents);
        const venueDeviceIds = venueACs.map(d => d.id);
        console.log('📅 [VenueDetailsPage] Venue device IDs:', venueDeviceIds);
        const venueEvents = allEvents.filter(e => 
          e.eventType === 'device' && venueDeviceIds.includes(e.deviceId)
        );
        console.log('📅 [VenueDetailsPage] Filtered venue events:', venueEvents.length, venueEvents);
        setEvents(venueEvents);
      } else {
        console.warn('⚠️ [VenueDetailsPage] No events response data');
      }

      // Handle different response structures for organizations
      // Backend returns: { success: true, data: [...] } (data is array directly)
      console.log('🔍 [ORGS] Full organizations response:', orgsRes);
      
      if (orgsRes?.error) {
        console.error('❌ Organizations API returned error:', orgsRes);
        if (orgsRes.status === 404) {
          console.warn('⚠️ Organizations endpoint not found');
        } else if (orgsRes.status === 403) {
          console.warn('⚠️ No permission to view organizations');
        } else {
          console.warn('⚠️ Organizations API error:', orgsRes.data?.message);
        }
        // Set empty array to prevent "Loading organizations..." from showing forever
        setOrganizations([]);
      } else if (orgsRes?.data) {
        console.log('🔍 [ORGS] Organizations response structure:', {
          hasData: !!orgsRes.data,
          hasDataData: !!orgsRes.data.data,
          isArray: Array.isArray(orgsRes.data.data),
          hasOrganizations: !!orgsRes.data.organizations,
          success: orgsRes.data.success,
          keys: Object.keys(orgsRes.data),
          fullResponse: orgsRes.data
        });
        
        // Backend returns: { success: true, data: [...] }
        // So orgsRes.data.data should be the array
        let allOrgs = [];
        if (Array.isArray(orgsRes.data.data)) {
          allOrgs = orgsRes.data.data;
          console.log('✅ [ORGS] Using orgsRes.data.data (direct array)');
        } else if (orgsRes.data.organizations) {
          allOrgs = Array.isArray(orgsRes.data.organizations) ? orgsRes.data.organizations : [];
          console.log('✅ [ORGS] Using orgsRes.data.organizations');
        } else if (orgsRes.data.data?.organizations) {
          allOrgs = Array.isArray(orgsRes.data.data.organizations) ? orgsRes.data.data.organizations : [];
          console.log('✅ [ORGS] Using orgsRes.data.data.organizations');
        } else if (orgsRes.data.success && orgsRes.data.data) {
          // Try to extract from data if it's an object
          allOrgs = Array.isArray(orgsRes.data.data) ? orgsRes.data.data : [];
          console.log('✅ [ORGS] Using orgsRes.data.data (fallback)');
        }
        
        console.log('✅ [ORGS] Organizations loaded:', allOrgs.length, allOrgs);
        if (allOrgs.length > 0) {
          console.log('📋 [ORGS] Sample organization:', allOrgs[0]);
        } else {
          console.warn('⚠️ [ORGS] No organizations found in response');
        }
        setOrganizations(allOrgs); // Always set, even if empty
      } else if (orgsRes === null || orgsRes === undefined) {
        console.warn('⚠️ [ORGS] Organizations API returned null/undefined');
        setOrganizations([]);
      } else {
        console.warn('⚠️ [ORGS] No organizations data in response:', orgsRes);
        console.warn('⚠️ [ORGS] Organizations response type:', typeof orgsRes);
        console.warn('⚠️ [ORGS] Organizations response keys:', orgsRes ? Object.keys(orgsRes) : 'N/A');
        // Set empty array to prevent "Loading organizations..." from showing forever
        setOrganizations([]);
      }
    } catch (error) {
      console.error('Error loading venue data:', error);
      // Only show error if we haven't already shown one AND if venue was not found
      if (!venueErrorShown && !venue) {
        toast.error(error.response?.data?.message || 'Failed to load venue details');
        venueErrorShown = true;
      }
    } finally {
      setLoading(false);
    }
  }, [venueId]); // Removed selectedOrganizationId to prevent unnecessary reloads

  const handleVenueUpdated = useCallback((message) => {
    console.log('🏢 Venue updated:', message);
    // Only update connected devices when venue changes
    if (message.temperature !== undefined) {
      setDevices((prevDevices) =>
        prevDevices.map((device) => {
          // Only update if device is connected and belongs to this venue
          if (device.isConnected && device.venueId === message.venueId) {
            return { ...device, temperature: message.temperature };
          }
          return device;
        })
      );
      toast.success(`Venue ${message.venueName} temperature updated (applied to connected devices only)`);
    } else {
      // For other venue updates, reload data
      loadVenueData();
      toast.success(`Venue ${message.venueName} updated`);
    }
  }, [loadVenueData]);

  const handleOrganizationUpdated = useCallback((message) => {
    console.log('🏛️ Organization updated:', message);
    // Only update connected devices when organization changes
    if (message.temperature !== undefined) {
      setDevices((prevDevices) =>
        prevDevices.map((device) => {
          // Only update if device is connected and belongs to this organization
          const deviceOrgId = venue?.organizationId || venue?.organization?.id;
          if (device.isConnected && deviceOrgId === message.organizationId) {
            return { ...device, temperature: message.temperature };
          }
          return device;
        })
      );
      toast.success(`Organization ${message.organizationName} temperature updated (applied to connected devices only)`);
    } else {
      // For other organization updates, reload data
      loadVenueData();
      toast.success(`Organization ${message.organizationName} updated`);
    }
  }, [loadVenueData, venue]);

  // Track recent DEVICE_CONNECTED events (in case they arrive before devices are loaded)
  const recentConnectionEventsRef = useRef(new Map()); // { serialNumber: message }

  // Enhanced handleDeviceConnected to track events even if devices not loaded yet
  const handleDeviceConnectedEnhanced = useCallback((message) => {
    const serialNumber = message.serialNumber || message.serial;
    if (serialNumber) {
      // Store the event for later processing
      recentConnectionEventsRef.current.set(serialNumber, message);
      console.log('📦 [VenueDetailsPage] Stored DEVICE_CONNECTED event for:', serialNumber);
    }
    // Call original handler
    handleDeviceConnected(message);
  }, [handleDeviceConnected]);

  // WebSocket notifications hook
  const {
    isConnected,
    notifications,
    removeNotification,
  } = useWebSocketNotifications({
    venueId: venueId ? parseInt(venueId) : null,
    organizationId: venue?.organizationId || venue?.organization?.id || null,
    onDeviceConnected: handleDeviceConnectedEnhanced,
    onDeviceDisconnected: handleDeviceDisconnected,
    onDeviceUpdated: handleDeviceUpdated,
    onVenueUpdated: handleVenueUpdated,
    onOrganizationUpdated: handleOrganizationUpdated,
  });

  // Sync connection status when devices are loaded (apply any missed DEVICE_CONNECTED events)
  useEffect(() => {
    if (devices.length > 0) {
      console.log('🔄 [VenueDetailsPage] Checking connection status for', devices.length, 'devices');
      console.log('📊 [VenueDetailsPage] Current devices:', devices.map(d => ({ 
        name: d.name, 
        serialNumber: d.serialNumber, 
        isConnected: d.isConnected 
      })));
      console.log('📦 [VenueDetailsPage] Stored connection events:', Array.from(recentConnectionEventsRef.current.keys()));
      console.log('🔌 [VenueDetailsPage] WebSocket connected:', isConnected);
      
      // Check if any devices should be marked as connected
      const hasStoredEvents = recentConnectionEventsRef.current.size > 0;
      if (hasStoredEvents || isConnected) {
        setDevices((prevDevices) => {
          let updated = false;
          const updatedDevices = prevDevices.map((device) => {
            if (device.serialNumber) {
              // Check if we have a stored connection event for this device
              if (recentConnectionEventsRef.current.has(device.serialNumber)) {
                if (!device.isConnected) {
                  console.log('✅ [VenueDetailsPage] Syncing device as connected (from stored event):', device.name, device.serialNumber);
                  updated = true;
                  return { ...device, isConnected: true };
                }
              }
            }
            return device;
          });
          
          if (updated) {
            console.log('✅ [VenueDetailsPage] Connection status synced');
          } else {
            console.log('ℹ️ [VenueDetailsPage] No connection status updates needed');
          }
          return updatedDevices;
        });
      }
    }
  }, [devices.length, isConnected]); // Only run when device count changes or WebSocket connects

  useEffect(() => {
    if (venueId) {
      console.log('📅 [VenueDetailsPage] Loading venue data for venueId:', venueId);
      loadVenueData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  // Set selected organization when venue loads and filter venues
  useEffect(() => {
    if (venue?.organizationId || venue?.organization?.id) {
      const orgId = venue.organizationId || venue.organization?.id;
      setSelectedOrganizationId(orgId);
      
      // Filter venues by organization
      if (allVenues.length > 0) {
        const filteredVenues = allVenues.filter(v => 
          v.organizationId === orgId || 
          v.organization?.id === orgId
        );
        setVenues(filteredVenues);
      }
      
      // Load organization data
      loadOrganizationData(orgId);
    }
  }, [venue, allVenues]);

  // Load organization data when organization is selected
  useEffect(() => {
    if (selectedOrganizationId) {
      loadOrganizationData(selectedOrganizationId);
    } else {
      setOrganizationDevices([]);
      setOrganizationEnergy(0);
    }
  }, [selectedOrganizationId]);

  // Sort devices based on saved order
  const getSortedDevices = (deviceList) => {
    if (!venueId || !deviceOrder[venueId] || deviceOrder[venueId].length === 0) {
      return deviceList;
    }
    
    const order = deviceOrder[venueId];
    const ordered = [];
    const unordered = [];
    
    // First, add devices in saved order
    order.forEach(deviceId => {
      const device = deviceList.find(d => d.id === deviceId);
      if (device) {
        ordered.push(device);
      }
    });
    
    // Then, add any new devices that aren't in the order
    deviceList.forEach(device => {
      if (!order.includes(device.id)) {
        unordered.push(device);
      }
    });
    
    return [...ordered, ...unordered];
  };

  const filteredDevices = getSortedDevices(devices.filter(device => {
    const matchesSearch = !searchTerm || 
      device.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (device.temperature && device.temperature.toString().includes(searchTerm));
    
    const matchesStatus = !filters.status || 
      (filters.status === 'on' && device.isOn) ||
      (filters.status === 'off' && !device.isOn);
    
    const matchesLock = !filters.lock ||
      (filters.lock === 'locked' && device.currentState === 'locked') ||
      (filters.lock === 'unlocked' && device.currentState !== 'locked');
    
    const matchesAlert = !filters.alert ||
      (filters.alert === 'alert' && (device.isWorking === false || device.alertAt)) ||
      (filters.alert === 'no-alert' && device.isWorking !== false && !device.alertAt);
    
    const matchesTemperature = !filters.temperature || 
      (device.temperature && device.temperature.toString() === filters.temperature);
    
    return matchesSearch && matchesStatus && matchesLock && matchesAlert && matchesTemperature;
  }));

  // Drag and drop handlers
  const [draggedDeviceId, setDraggedDeviceId] = useState(null);
  const [dragOverDeviceId, setDragOverDeviceId] = useState(null);

  const handleDragStart = (deviceId, e) => {
    e.stopPropagation();
    setDraggedDeviceId(deviceId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', deviceId);
  };

  const handleDragOver = (deviceId, e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (deviceId !== draggedDeviceId) {
      setDragOverDeviceId(deviceId);
    }
  };

  const handleDragLeave = () => {
    setDragOverDeviceId(null);
  };

  const handleDrop = (targetDeviceId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedDeviceId || !targetDeviceId || draggedDeviceId === targetDeviceId || !venueId) {
      setDraggedDeviceId(null);
      setDragOverDeviceId(null);
      return;
    }

    const currentOrder = deviceOrder[venueId] || filteredDevices.map(d => d.id);
    const draggedIndex = currentOrder.indexOf(draggedDeviceId);
    const targetIndex = currentOrder.indexOf(targetDeviceId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedDeviceId(null);
      setDragOverDeviceId(null);
      return;
    }

    // Reorder devices
    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedDeviceId);

    // Update state and localStorage
    const updatedOrder = { ...deviceOrder, [venueId]: newOrder };
    setDeviceOrder(updatedOrder);
    localStorage.setItem(`deviceOrder_${venueId}`, JSON.stringify(newOrder));
    
    // Update selectedDevice to the dragged device for Device Scheduling section
    const draggedDevice = filteredDevices.find(d => d.id === draggedDeviceId);
    if (draggedDevice) {
      const deviceVenue = allVenues.find(v => v.id === draggedDevice.venueId) || venue;
        const deviceVenueName = deviceVenue?.name || venue?.name || 'Unknown Venue';
        setSelectedDevice({
        ...draggedDevice,
        venue: deviceVenueName
      });
    }
    
    setDraggedDeviceId(null);
    setDragOverDeviceId(null);
    toast.success('Device order updated');
  };

  const handleDragEnd = () => {
    setDraggedDeviceId(null);
    setDragOverDeviceId(null);
  };

  // Debug logging
  console.log('📊 Devices state:', devices.length, devices);
  console.log('📊 Filtered devices:', filteredDevices.length, filteredDevices);
  console.log('📊 Search term:', searchTerm);
  console.log('📊 Filters:', filters);

  // Load organization data when organization is selected
  const loadOrganizationData = async (orgId) => {
    if (!orgId) {
      setOrganizationDevices([]);
      setOrganizationEnergy(0);
      return;
    }

    try {
      // Fetch all ACs and filter by organization
      const [acsRes, energyRes] = await Promise.all([
        adminAPI.getACs().catch(err => {
          console.error('Failed to load ACs for organization:', err);
          return null;
        }),
        adminAPI.getOrganizationEnergy(orgId).catch(err => {
          console.error('Failed to load organization energy:', err);
          return null;
        })
      ]);

      // Get all ACs for this organization
      if (acsRes?.data) {
        const allACs = acsRes.data.data?.acs || 
                      acsRes.data.acs || 
                      (Array.isArray(acsRes.data.data) ? acsRes.data.data : []) ||
                      [];
        
        // Get all venues for this organization
        const orgVenues = allVenues.filter(v => 
          v.organizationId === orgId || 
          v.organization?.id === orgId
        );
        const orgVenueIds = orgVenues.map(v => v.id);
        
        // Filter ACs that belong to this organization's venues
        const orgACs = allACs.filter(ac => 
          ac.venueId === orgId || 
          orgVenueIds.includes(ac.venueId) ||
          ac.organizationId === orgId
        );
        
        console.log('✅ Organization devices loaded:', orgACs.length);
        setOrganizationDevices(orgACs);
      }

      // Get organization energy
      if (energyRes?.data) {
        const energyData = energyRes.data.data || energyRes.data;
        const totalEnergy = energyData.totalEnergyConsumed || 0;
        console.log('✅ Organization energy loaded:', totalEnergy);
        setOrganizationEnergy(totalEnergy);
      }
    } catch (error) {
      console.error('Error loading organization data:', error);
      toast.error('Failed to load organization data');
    }
  };

  // Calculate KPIs - Always use venue-specific devices (not organization devices)
  // When venue is selected, show only that venue's devices
  const totalDevices = devices.length; // Always use venue-specific devices
  
  // Fault devices: Only count CONNECTED devices with alerts (offline devices don't generate alerts)
  const faultDevices = devices.filter(d => d.isConnected && (d.isWorking === false || d.alertAt)).length;
  
  // Calculate venue energy: Sum of all CONNECTED devices in the selected venue
  // Offline devices should not contribute to energy (energy stays at last connection value)
  const venueEnergy = devices.reduce((sum, d) => {
    // Only count energy if device is connected
    if (d.isConnected) {
      const deviceEnergy = d.totalEnergyConsumed || 0;
      console.log(`🔋 Device "${d.name}" (ID: ${d.id}) energy: ${deviceEnergy} KV (connected)`);
      return sum + deviceEnergy;
    } else {
      console.log(`⏸️ Device "${d.name}" (ID: ${d.id}) is offline - energy not counted`);
      return sum; // Don't add energy for offline devices
    }
  }, 0);
  console.log(`⚡ Venue Energy (Sum of ${devices.filter(d => d.isConnected).length} connected devices): ${venueEnergy.toFixed(2)} KV`);

  // Helper function to format days - show range if consecutive, otherwise individual
  const formatDays = (daysString) => {
    if (!daysString) return [];
    
    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const days = daysString.split(' ').filter(d => d.trim());
    
    if (days.length === 0) return [];
    if (days.length === 1) return [days[0]];
    
    // Get indices of days in order
    const indices = days.map(day => dayOrder.indexOf(day)).filter(idx => idx !== -1).sort((a, b) => a - b);
    
    if (indices.length === 0) return days;
    
    // Check if all days are consecutive
    const isConsecutive = indices.every((idx, i) => i === 0 || idx === indices[i - 1] + 1);
    
    if (isConsecutive && indices.length > 1) {
      // Show as range
      return [`${dayOrder[indices[0]]}-${dayOrder[indices[indices.length - 1]]}`];
    } else {
      // Show individually
      return days;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-xl">Loading venue details...</p>
      </div>
      </div>
    );
  }

  // Show error state only if we've finished loading and still no venue
  if (!venue && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 text-xl mb-4">Venue not found</p>
          <p className="text-gray-500 text-sm mb-4">Venue ID: {venueId}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${hideHeader ? "w-full h-full overflow-visible flex flex-col items-center" : "min-h-screen bg-white w-full flex flex-col items-center"} overflow-x-hidden`}>
      {/* WebSocket Connection Status Indicator */}
      {isConnected && (
        <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 bg-green-500 text-white px-2 py-1 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs shadow-lg flex items-center gap-1.5 sm:gap-2">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse"></div>
          <span className="hidden sm:inline">Real-time Connected</span>
          <span className="sm:hidden">Live</span>
        </div>
      )}

      {/* Notifications Container */}
      <NotificationContainer
        notifications={notifications}
        onRemoveNotification={removeNotification}
      />

      {/* Top Header with Organization Dropdown and KPIs */}
      <VenueHeader
        hideHeader={hideHeader}
        selectedOrganizationId={selectedOrganizationId}
        setSelectedOrganizationId={setSelectedOrganizationId}
        venue={venue}
        venueId={venueId}
        organizations={organizations}
        allVenues={allVenues}
        venues={venues}
        setVenues={setVenues}
        loadOrganizationData={loadOrganizationData}
        navigate={navigate}
        totalDevices={totalDevices}
        faultDevices={faultDevices}
        venueEnergy={venueEnergy}
        hasOrganizations={hasOrganizations}
        onVenueChange={onVenueChange}
      />

      <div className={`${hideHeader ? "w-full max-w-[95%] xl:max-w-[90%] 2xl:max-w-[85%] px-2 sm:px-4 md:px-6 py-4" : "w-full max-w-[95%] xl:max-w-[90%] 2xl:max-w-[85%] px-2 sm:px-4 md:px-6 py-4 md:py-6"}`}>
        {/* Main Content - Table and Right Panel */}
        {/* Adjust layout based on sidebar state: when sidebar closed (dashboard), increase gap and align right panel to right */}
        <div className={`flex flex-col lg:flex-row lg:items-start ${hideHeader 
          ? 'gap-4 sm:gap-6' 
          : sidebarOpen 
            ? 'gap-4 sm:gap-6' 
            : 'gap-6 sm:gap-8 md:gap-10'
        } w-full max-w-full ${hideHeader ? '' : ''}`}>
          {/* Device List Table - Blue Container - left aligned */}
          {/* When sidebar closed, increase table container width. When open, keep it normal so right panel can fill remaining space */}
          <div className={`-ml-0 sm:-ml-2 transition-all duration-300 ${hideHeader 
            ? 'w-full' 
            : sidebarOpen 
              ? 'w-full lg:flex-none lg:w-auto lg:max-w-[55%] lg:min-w-0' 
              : 'w-full lg:flex-[2_1_65%] lg:max-w-[70%] lg:min-w-0'
          }`}>
            {/* Blue Outer Container - Left aligned */}
            <div className={` bg-blue-500 rounded-xl sm:rounded-2xl p-1 shadow-md w-full`}>
              {/* Section - Filters */}
              <DeviceFilters
                filters={filters}
                setFilters={setFilters}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onAlertClick={() => setShowAlertModal(true)}
              />

              {/* Device Table */}
              <DeviceTable
                filteredDevices={filteredDevices}
                devices={devices}
                allVenues={allVenues}
                venue={venue}
                organizations={organizations}
                events={events}
                onDeviceSelect={(device, deviceVenueName) => {
                                setSelectedDevice({
                                  ...device,
                                  venue: deviceVenueName
                                });
                              }}
                onEventCreate={(deviceId) => {
                  setEventDeviceId(deviceId);
                                      setShowEventTypeSelection(true);
                                    }}
                onViewDevice={(device, deviceVenueName) => {
                                      setSelectedDevice({
                                        ...device,
                                        venue: deviceVenueName
                                      });
                                      setShowDeviceModal(true);
                                    }}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                draggedDeviceId={draggedDeviceId}
                dragOverDeviceId={dragOverDeviceId}
                setDevices={setDevices}
                loadVenueData={loadVenueData}
              />
            </div>
      </div>

          {/* Right Panel - Charts and Scheduled Commands - Increased width, moved up and left */}
          {/* When sidebar closed (dashboard), align right panel to right with bigger gap. When open, fill all remaining space */}
          <div className={`transition-all duration-300 ${hideHeader 
            ? "space-y-4 w-full mt-4 sm:mt-6" 
            : sidebarOpen
              ? "space-y-4 md:space-y-6 w-full lg:flex-1 lg:flex-grow lg:min-w-[280px] xl:min-w-[300px] 2xl:min-w-[350px] lg:max-w-none lg:-mt-32 xl:-mt-44 lg:self-start"
              : "space-y-4 md:space-y-6 w-full lg:flex-[0_0_auto] lg:ml-auto lg:min-w-[280px] xl:min-w-[300px] 2xl:min-w-[350px] lg:-mt-32 xl:-mt-44 lg:self-start"
          } flex-shrink-0 relative z-10`}>
            {/* Energy Chart */}
            <div className="relative z-18">
            <EnergyChartBox 
              venue={venue} 
              setVenue={setVenue}
              organizationEnergy={selectedOrganizationId ? organizationEnergy : null}
              organizationName={selectedOrganizationId ? organizations.find(org => org.id === selectedOrganizationId)?.name : null}
              organization={selectedOrganizationId ? organizations.find(org => org.id === selectedOrganizationId) : null}
              setOrganization={(updater) => {
                if (selectedOrganizationId) {
                  setOrganizations(prev => prev.map(org => 
                    org.id === selectedOrganizationId 
                      ? (typeof updater === 'function' ? updater(org) : updater)
                      : org
                  ));
                }
              }}
              devices={devices}
              onVenueUpdate={loadVenueData}
              onOrganizationUpdate={loadVenueData}
              onDevicesUpdate={(venueId, powerState) => {
                // Update devices in this venue to match venue power state
                setDevices(prev => prev.map(device => 
                  device.venueId === venueId ? { ...device, isOn: powerState } : device
                ));
              }}
            />
            </div>

            {/* Scheduled Commands for Device - Moved down, increased width */}
            <div className="w-full">
            <DeviceSchedulingSection 
              filteredDevices={filteredDevices}
              events={events}
              faultDevices={faultDevices}
              totalEnergy={venueEnergy}
              selectedDevice={selectedDevice}
              venue={venue}
              onReloadEvents={async () => {
                await loadVenueData();
                // Notify parent component to reload events list
                if (onEventCreated) {
                  setTimeout(async () => {
                    await onEventCreated();
                  }, 300);
                }
              }}
              onEventEdit={(event) => {
                if (event && event.id) {
                  // Editing existing event
                  setSelectedEvent(event);
                  setEventDeviceId(event.deviceId);
                  setShowEventModal(true);
                } else {
                  // Creating new event - open selection modal
                  setSelectedEvent(null);
                  setEventDeviceId(event?.deviceId || selectedDevice?.id);
                  setShowEventTypeSelection(true);
                }
              }}
              onEventDelete={async () => {
                // After delete, reload events in parent
                if (onEventCreated) {
                  setTimeout(async () => {
                    console.log('📅 [VenueDetailsPage] onEventDelete - calling onEventCreated');
                    await onEventCreated();
                  }, 800);
                }
              }}
              onEventEnable={async () => {
                // After enable, reload events in parent
                if (onEventCreated) {
                  setTimeout(async () => {
                    console.log('📅 [VenueDetailsPage] onEventEnable - calling onEventCreated');
                    await onEventCreated();
                  }, 800);
                }
              }}
              onEventDisable={async () => {
                // After disable, reload events in parent
                if (onEventCreated) {
                  setTimeout(async () => {
                    console.log('📅 [VenueDetailsPage] onEventDisable - calling onEventCreated');
                    await onEventCreated();
                  }, 800);
                }
              }}
            />
            </div>
          </div>
        </div>
      </div>

      {/* Alert Modal */}
      <NeedMaintenanceModal 
        isOpen={showAlertModal} 
        onClose={() => setShowAlertModal(false)}
        venueId={venueId}
      />

      {/* Device Details Modal */}
      <DeviceDetailsModal 
        isOpen={showDeviceModal} 
        onClose={() => {
          setShowDeviceModal(false);
          setSelectedDevice(null);
        }}
        device={selectedDevice}
      />

      {/* Event Type Selection Modal */}
      <EventTypeSelectionModal
        isOpen={showEventTypeSelection}
        onClose={() => {
            setShowEventTypeSelection(false);
            setSelectedEventType(null);
            setEventDeviceId(null);
            setSelectedEvent(null);
          }}
        onSelectSimple={() => {
                  setSelectedEventType('simple');
                  setShowEventTypeSelection(false);
                  setShowEventModal(true);
                }}
        onSelectRecurring={() => {
                  setSelectedEventType('recurring');
                  setShowEventTypeSelection(false);
                  setShowEventModal(true);
                }}
        onSelectDevicePower={() => {
                  console.log('🔧 [VenueDetailsPage] Device Power Control Event selected, eventDeviceId:', eventDeviceId);
                  setSelectedEventType('device-power');
                  setShowEventTypeSelection(false);
                  setShowEventModal(true);
                }}
      />

      {/* Event Creation Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99]">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedEvent?.id ? 'Edit Event' : selectedEventType === 'recurring' ? 'Create Recurring Event' : selectedEventType === 'simple' ? 'Create Simple Event' : selectedEventType === 'device-power' ? 'Create On/Off Device Event' : 'Create Event'}
              </h3>
              <button
                onClick={() => {
                  setShowEventModal(false);
                  setEventDeviceId(null);
                  setSelectedEvent(null);
                  setSelectedEventType(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <EventForm 
                onSubmit={async (eventData) => {
                  try {
                    console.log('📅 [VenueDetailsPage] Event form submitted:', {
                      isUpdate: !!selectedEvent?.id,
                      eventId: selectedEvent?.id,
                      eventData: eventData
                    });
                    
                    let response;
                    if (selectedEvent?.id) {
                      // Update existing event
                      console.log('📅 [VenueDetailsPage] Updating event:', selectedEvent.id);
                      response = await adminAPI.updateEvent(selectedEvent.id, eventData);
                      console.log('📅 [VenueDetailsPage] Update event response:', response);
                      toast.success(response.data?.message || 'Event updated successfully');
                    } else {
                      // Create new event
                      console.log('📅 [VenueDetailsPage] Creating new event with data:', eventData);
                      response = await adminAPI.createEvent(eventData);
                      console.log('📅 [VenueDetailsPage] Create event response:', response);
                      console.log('📅 [VenueDetailsPage] Response structure:', {
                        hasData: !!response.data,
                        hasDataData: !!response.data?.data,
                        hasEvent: !!response.data?.data?.event,
                        success: response.data?.success,
                        message: response.data?.message
                      });
                      toast.success(response.data?.message || 'Event created successfully');
                    }
                    
                    setShowEventModal(false);
                    setEventDeviceId(null);
                    setSelectedEvent(null);
                    setSelectedEventType(null);
                    
                    // Reload events in venue detail page
                    console.log('📅 [VenueDetailsPage] Reloading venue data...');
                    await loadVenueData();
                    console.log('📅 [VenueDetailsPage] Venue data reloaded');
                    
                    // Notify parent component to reload events list (for AdminDashboard)
                    // Add delay to ensure backend has processed the event
                    if (onEventCreated) {
                      console.log('📅 [VenueDetailsPage] Calling onEventCreated callback...');
                      setTimeout(async () => {
                        console.log('📅 [VenueDetailsPage] Executing onEventCreated callback');
                        await onEventCreated();
                        console.log('📅 [VenueDetailsPage] onEventCreated callback completed');
                      }, 800);
                    } else {
                      console.warn('⚠️ [VenueDetailsPage] onEventCreated callback not provided');
                    }
                  } catch (error) {
                    console.error('❌ [VenueDetailsPage] Error saving event:', error);
                    console.error('❌ [VenueDetailsPage] Error response:', error.response?.data);
                    toast.error(error.response?.data?.message || error.response?.data?.error || `Failed to ${selectedEvent?.id ? 'update' : 'create'} event`);
                  }
                }}
                onCancel={() => {
                  setShowEventModal(false);
                  setEventDeviceId(null);
                  setSelectedEventType(null);
                }}
                event={selectedEvent || (eventDeviceId ? { deviceId: String(eventDeviceId) } : null)}
                acs={devices}
                eventType={selectedEventType}
                disableDeviceSelection={!!((eventDeviceId || selectedEvent?.deviceId) && !selectedEvent?.id)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueDetailsPage;

