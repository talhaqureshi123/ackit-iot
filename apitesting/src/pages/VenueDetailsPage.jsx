import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { adminAPI } from '../services/apiAdmin';
import toast from 'react-hot-toast';
import NeedMaintenanceModal from '../components/NeedMaintenanceModal';
import DeviceDetailsModal from '../components/DeviceDetailsModal';
import KPICard from '../components/KPICard';
import EnergyChartBox from '../components/EnergyChartBox';
import DeviceSchedulingSection from '../components/DeviceSchedulingSection';
import EventForm from '../components/EventForm';
import { 
  ArrowLeft,
  MapPin,
  Thermometer,
  AlertCircle,
  Search,
  Plus,
  Minus,
  Users,
  AlertTriangle,
  Zap,
  Eye,
  Lock,
  Unlock,
  Power,
  X,
  GripVertical
} from 'lucide-react';

const VenueDetailsPage = ({ venueIdProp, hideHeader = false, onVenueChange }) => {
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
  const [venueLocking, setVenueLocking] = useState(false);
  const [showLockDropdown, setShowLockDropdown] = useState(false);
  const [showDeviceLockDropdown, setShowDeviceLockDropdown] = useState(false);
  const [showAlertDropdown, setShowAlertDropdown] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventDeviceId, setEventDeviceId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [deviceOrder, setDeviceOrder] = useState({}); // Store device order per venue: { venueId: [deviceIds...] }
  const [draggedDeviceId, setDraggedDeviceId] = useState(null);

  useEffect(() => {
    loadVenueData();
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLockDropdown && !event.target.closest('.lock-dropdown-container')) {
        setShowLockDropdown(false);
      }
      if (showDeviceLockDropdown && !event.target.closest('.device-lock-dropdown-container')) {
        setShowDeviceLockDropdown(false);
      }
      if (showAlertDropdown && !event.target.closest('.alert-dropdown-container')) {
        setShowAlertDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLockDropdown, showDeviceLockDropdown, showAlertDropdown]);

  const loadVenueData = async () => {
    try {
      setLoading(true);
      const [venueRes, venuesRes, acsRes, eventsRes, orgsRes] = await Promise.all([
        adminAPI.getVenueDetails(venueId).catch(err => {
          console.error('Failed to load venue:', err);
          return null;
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
          return null;
        })
      ]);

      console.log('🔍 Venue response check:', venueRes);
      if (venueRes?.data) {
        console.log('🔍 Full venue response:', venueRes.data);
        console.log('🔍 Response structure:', {
          hasData: !!venueRes.data,
          hasDataData: !!venueRes.data.data,
          hasDataDataVenue: !!venueRes.data.data?.venue,
          hasDataVenue: !!venueRes.data.venue,
          keys: Object.keys(venueRes.data)
        });
        
        // Try different response structures
        let venueData = null;
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
        } else if (venueRes.data.data) {
          venueData = venueRes.data.data;
          console.log('✅ Using venueRes.data.data');
        }
        
        console.log('✅ Venue loaded:', venueData);
        if (venueData) {
          console.log('✅ Venue name:', venueData.name);
          console.log('✅ Venue isVenueOn:', venueData.isVenueOn);
          console.log('✅ Venue temperature:', venueData.temperature);
          console.log('✅ Venue isLocked:', venueData.isLocked);
          console.log('✅ All venue keys:', Object.keys(venueData));
          setVenue(venueData);
        } else {
          console.error('❌ Venue data is null or undefined');
          console.error('❌ Available data:', venueRes.data);
        }
      } else {
        console.warn('⚠️ No venue data in response:', venueRes);
        console.warn('⚠️ Full response:', venueRes);
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
        }
        console.log('🔍 Filtering by venueId:', venueId, 'Type:', typeof venueId);
        
        // Convert venueId to number for comparison
        const venueIdNum = parseInt(venueId);
        console.log('🔍 Converted venueId to number:', venueIdNum);
        
        venueACs = allACs.filter(ac => {
          const acVenueId = parseInt(ac.venueId);
          const matches = acVenueId === venueIdNum;
          if (matches) {
            console.log('✅ Device matched:', ac.name, 'venueId:', ac.venueId, 'Type:', typeof ac.venueId);
          } else if (allACs.length <= 5) {
            // Only log if we have few devices to avoid spam
            console.log('❌ Device NOT matched:', ac.name, 'venueId:', ac.venueId, 'Expected:', venueIdNum);
          }
          return matches;
        });
        
        console.log('✅ Venue devices filtered:', venueACs.length);
        if (venueACs.length > 0) {
          console.log('✅ First device:', venueACs[0]);
        } else {
          console.warn('⚠️ No devices found for venueId:', venueIdNum);
          if (allACs.length > 0) {
            console.warn('⚠️ Available venueIds in ACs:', allACs.map(ac => ({ name: ac.name, venueId: ac.venueId })));
          } else {
            console.warn('⚠️ No ACs found at all!');
          }
        }
        setDevices(venueACs);
        
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
        const allEvents = eventsRes.data.data?.events || 
                         eventsRes.data.events || 
                         (Array.isArray(eventsRes.data.data) ? eventsRes.data.data : []) ||
                         [];
        const venueDeviceIds = venueACs.map(d => d.id);
        const venueEvents = allEvents.filter(e => 
          e.eventType === 'device' && venueDeviceIds.includes(e.deviceId)
        );
        setEvents(venueEvents);
      }

      // Handle different response structures for organizations
      // Backend returns: { success: true, data: [...] } (data is array directly)
      if (orgsRes?.data) {
        const allOrgs = (Array.isArray(orgsRes.data.data) ? orgsRes.data.data : []) ||
                       orgsRes.data.organizations || 
                       orgsRes.data.data?.organizations || 
                       [];
        console.log('✅ Organizations loaded:', allOrgs.length, allOrgs);
        setOrganizations(allOrgs);
      } else {
        console.warn('⚠️ No organizations data in response:', orgsRes);
      }
    } catch (error) {
      console.error('Error loading venue data:', error);
      toast.error('Failed to load venue details');
    } finally {
      setLoading(false);
    }
  };

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
      device.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !filters.status || 
      (filters.status === 'on' && device.isOn) ||
      (filters.status === 'off' && !device.isOn);
    
    const matchesLock = !filters.lock ||
      (filters.lock === 'locked' && device.currentState === 'locked') ||
      (filters.lock === 'unlocked' && device.currentState !== 'locked');
    
    const matchesAlert = !filters.alert ||
      (filters.alert === 'alert' && (device.isWorking === false || device.alertAt)) ||
      (filters.alert === 'no-alert' && device.isWorking !== false && !device.alertAt);
    
    return matchesSearch && matchesStatus && matchesLock && matchesAlert;
  }));

  // Drag and drop handlers
  const handleDragStart = (e, deviceId) => {
    setDraggedDeviceId(deviceId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', deviceId);
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedDeviceId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetDeviceId) => {
    e.preventDefault();
    
    if (!draggedDeviceId || draggedDeviceId === targetDeviceId || !venueId) {
      return;
    }

    const currentOrder = deviceOrder[venueId] || filteredDevices.map(d => d.id);
    const draggedIndex = currentOrder.indexOf(draggedDeviceId);
    const targetIndex = currentOrder.indexOf(targetDeviceId);

    if (draggedIndex === -1 || targetIndex === -1) {
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
    
    toast.success('Device order updated');
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

  // Calculate KPIs - use organization data if organization is selected, otherwise use venue devices
  const totalDevices = selectedOrganizationId && organizationDevices.length > 0 
    ? organizationDevices.length 
    : devices.length;
  
  const faultDevices = selectedOrganizationId && organizationDevices.length > 0
    ? organizationDevices.filter(d => d.isWorking === false || d.alertAt || d.isWorking === 0).length
    : devices.filter(d => d.isWorking === false || d.alertAt).length;
  
  const totalEnergy = selectedOrganizationId && organizationEnergy > 0
    ? organizationEnergy
    : devices.reduce((sum, d) => sum + (d.totalEnergyConsumed || 0), 0);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading venue details...</p>
        </div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 text-xl mb-4">Venue not found</p>
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
    <div className={hideHeader ? "w-full h-full overflow-visible" : "min-h-screen bg-white w-full"}>
      {/* Top Header with Organization Dropdown and KPIs */}
      {!hideHeader && (
        <div className="bg-white">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-6 relative z-50">
              <div className="flex items-center space-x-4 relative z-50">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              <select 
                value={selectedOrganizationId || venue?.organizationId || venue?.organization?.id || ''}
                onChange={(e) => {
                  const orgId = e.target.value ? parseInt(e.target.value) : null;
                  setSelectedOrganizationId(orgId);
                  
                  if (orgId) {
                    // Filter venues by selected organization
                    const filteredVenues = allVenues.filter(v => 
                      v.organizationId === orgId || 
                      v.organization?.id === orgId
                    );
                    setVenues(filteredVenues);
                    
                    // Load organization data (devices, energy)
                    loadOrganizationData(orgId);
                    
                    // If there are filtered venues, navigate to the first one
                    if (filteredVenues.length > 0) {
                      navigate(`/admin/venue/${filteredVenues[0].id}`);
                    } else {
                      toast.info(`No venues found for selected organization`);
                    }
                    
                    const selectedOrg = organizations.find(org => org.id === orgId);
                    if (selectedOrg) {
                      toast.success(`Selected: ${selectedOrg.name}`);
                    }
                  } else {
                    // Show all venues if no organization selected
                    setVenues(allVenues);
                    setOrganizationDevices([]);
                    setOrganizationEnergy(0);
                  }
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 relative z-50"
                style={{ zIndex: 9999 }}
              >
                <option value="">Organization</option>
                {organizations && organizations.length > 0 ? (
                  organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} {org.id ? `(ID: ${org.id})` : ''}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Loading organizations...</option>
                )}
                {/* Show current venue's organization if not in list */}
                {venue?.organization && organizations && !organizations.find(org => org.id === venue.organization.id) && (
                  <option value={venue.organization.id}>
                    {venue.organization.name} {venue.organization.id ? `(ID: ${venue.organization.id})` : ''}
                  </option>
                )}
              </select>
              <select 
                value={venueId}
                onChange={(e) => {
                  if (e.target.value && e.target.value !== venueId) {
                    navigate(`/admin/venue/${e.target.value}`);
                  }
                }}
                disabled={!selectedOrganizationId}
                className={`px-4 py-2 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 relative z-50 ${
                  !selectedOrganizationId 
                    ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed' 
                    : 'bg-white border-gray-300'
                }`}
                style={{ zIndex: 9999 }}
                title={!selectedOrganizationId ? 'Please select Organization first' : 'Select a venue'}
              >
                <option value="" className="text-center">
                  {!selectedOrganizationId 
                    ? '👉 Please select Organization first' 
                    : 'Select Venue'}
                </option>
                {venues && venues.length > 0 ? (
                  venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.id ? `(ID: ${v.id})` : ''}
                    </option>
                  ))
                ) : selectedOrganizationId ? (
                  <option value="" disabled>Loading venues...</option>
                ) : null}
              </select>
              </div>
            </div>
            
            {/* KPIs - In Header Section */}
          <div className="grid grid-cols- md:grid-cols-3 p-1 gap-0 w-[60%] h-10">
            <KPICard 
              title="No. of Devices" 
              value={`${totalDevices} Devices`} 
              icon={Users} 
              iconColor="text-blue-600" 
              bgColor="bg-blue-100" 
            />
            <KPICard 
              title="Fault Devices" 
              value={`${faultDevices} Devices`} 
              icon={AlertTriangle} 
              iconColor="text-red-600" 
              bgColor="bg-red-100" 
            />
            <KPICard 
              title="Energy" 
              value={`${totalEnergy.toFixed(1)} KV`} 
              icon={Zap} 
              iconColor="text-yellow-600" 
              bgColor="bg-yellow-100" 
            />
          </div>
        </div>
        </div>
      )}

      {/* KPIs - Show even when hideHeader is true */}
      {hideHeader && (
        <div className="w-full px-4 py-1 bg-gray-50 relative z-0">
          {/* Organization and Venue Selection Dropdowns */}
          <div className="flex items-center space-x-4 mb-2 w-[50%]">
            <select 
              value={selectedOrganizationId || venue?.organizationId || venue?.organization?.id || ''}
              onChange={(e) => {
                const orgId = e.target.value ? parseInt(e.target.value) : null;
                setSelectedOrganizationId(orgId);
                
                if (orgId) {
                  // Filter venues by selected organization
                  const filteredVenues = allVenues.filter(v => 
                    v.organizationId === orgId || 
                    v.organization?.id === orgId
                  );
                  setVenues(filteredVenues);
                  
                  // Load organization data (devices, energy)
                  loadOrganizationData(orgId);
                  
                  // If there are filtered venues, navigate to the first one
                  if (filteredVenues.length > 0) {
                    // Update venue in parent component if needed
                    const firstVenue = filteredVenues[0];
                    if (firstVenue.id !== venueId) {
                      // Trigger venue change
                      if (hideHeader && onVenueChange) {
                        // Update parent component if callback provided
                        onVenueChange(firstVenue.id);
                      } else {
                        // Navigate if standalone page
                        navigate(`/admin/venue/${firstVenue.id}`);
                      }
                    }
                  } else {
                    toast.info(`No venues found for selected organization`);
                  }
                  
                  const selectedOrg = organizations.find(org => org.id === orgId);
                  if (selectedOrg) {
                    toast.success(`Selected: ${selectedOrg.name}`);
                  }
                } else {
                  // Show all venues if no organization selected
                  setVenues(allVenues);
                  setOrganizationDevices([]);
                  setOrganizationEnergy(0);
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Organization</option>
              {organizations && organizations.length > 0 ? (
                organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} {org.id ? `(ID: ${org.id})` : ''}
                  </option>
                ))
              ) : (
                <option value="" disabled>Loading organizations...</option>
              )}
            </select>
            
            <select 
              value={venueId}
              onChange={(e) => {
                if (e.target.value && e.target.value !== venueId) {
                  const newVenueId = parseInt(e.target.value);
                  if (hideHeader && onVenueChange) {
                    // Update parent component if callback provided
                    onVenueChange(newVenueId);
                  } else {
                    // Navigate if standalone page
                    navigate(`/admin/venue/${newVenueId}`);
                  }
                }
              }}
              disabled={!selectedOrganizationId}
              className={`px-4 py-2 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                !selectedOrganizationId 
                  ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed' 
                  : 'bg-white border-gray-300'
              }`}
              title={!selectedOrganizationId ? 'Please select Organization first' : 'Select a venue'}
            >
              <option value="">
                {!selectedOrganizationId 
                  ? '👉 Please select Organization first' 
                  : 'Select Venue'}
              </option>
              {venues && venues.length > 0 ? (
                venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.id ? `(ID: ${v.id})` : ''}
                  </option>
                ))
              ) : selectedOrganizationId ? (
                <option value="" disabled>Loading venues...</option>
              ) : null}
            </select>
          </div>
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-[50%]">
            <KPICard 
              title="No. of Devices" 
              value={`${totalDevices} Devices`} 
              icon={Users} 
              iconColor="text-blue-600" 
              bgColor="bg-blue-100" 
            />
            <KPICard 
              title="Fault Devices" 
              value={`${faultDevices} Devices`} 
              icon={AlertTriangle} 
              iconColor="text-red-600" 
              bgColor="bg-red-100" 
            />
            <KPICard 
              title="Energy" 
              value={`${totalEnergy.toFixed(1)} KV`} 
              icon={Zap} 
              iconColor="text-yellow-600" 
              bgColor="bg-yellow-100" 
            />
          </div>
        </div>
      )}

      <div className={hideHeader ? "w-full px-4 py-4 flex justify-start" : "max-w-7xl mx-auto px-6 py-6"}>
        {/* Main Content - Table and Right Panel */}
        <div className={`grid grid-cols-1 ${hideHeader ? 'lg:grid-cols-3' : 'lg:grid-cols-3'} gap-4 ${hideHeader ? 'w-full' : ''}`}>
          {/* Device List Table - Blue Container */}
          <div className={`lg:col-span-2 ${hideHeader ? 'w-full -ml-2' : ''}`} style={hideHeader ? {} : { minWidth: '800px' }}>
            {/* Blue Outer Container - Aligned with Energy card end */}
            <div className={`bg-blue-500 rounded-2xl p-1 shadow-md ${hideHeader ? 'w-full' : 'max-w-4xl'}`} style={hideHeader ? { width: '100%' } : {}}>
              {/* Section - Filters (Alert, Temperature, Status, Lock, Search) */}
              <section className=" rounded-xl p-4 mb-1">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <button
                      onClick={() => setShowAlertModal(true)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 bg-white text-gray-700 hover:bg-gray-50"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>Alert</span>
                    </button>
                  </div>
                  <div>
                    <div className="relative">
                      <Thermometer className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="number"
                        min="16"
                        max="30"
                        value={filters.temperature}
                        onChange={(e) => setFilters({ ...filters, temperature: e.target.value })}
                        placeholder="Temperature"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="relative">
                      <Power className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      >
                        <option value="">Status</option>
                        <option value="on">On</option>
                        <option value="off">Off</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <select
                        value={filters.lock}
                        onChange={(e) => setFilters({ ...filters, lock: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      >
                        <option value="">Lock</option>
                        <option value="locked">Locked</option>
                        <option value="unlocked">Unlocked</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search..."
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </div>
                  </div>
                </div>
              </section>
               

              {/* Table Header Div - Under Filters (with table inside) */}
              <div className="bg-white rounded-2xl overflow-hidden w-full mt-1">
                {/* Table with Header and Body */}
                <div className="w-full">
                  <table className="w-full divide-y divide-gray-200">
                    {/* Table Header */}
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="pl-4 pr-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300 w-10">
                          {/* Drag Handle Column */}
                        </th>
                        <th className="pl-4 pr-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                          Device ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                          Venue
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                          <div className="flex items-center justify-center gap-1.5">
                            <Thermometer className="w-4 h-4" />
                            <span>Temperature</span>
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                          <div className="flex items-center gap-1.5">
                            <Power className="w-4 h-4" />
                            <span>Status</span>
                          </div>
                        </th>
                        <th className="px-4 pr-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                          <div className="flex items-center justify-center gap-1.5">
                            <Plus className="w-4 h-4" />
                            <span>Events</span>
                          </div>
                        </th>
                        <th className="px-4 pr-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                          <div className="flex items-center justify-center gap-1.5">
                            <Eye className="w-4 h-4" />
                            <span>View</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    {/* Table Body */}
                    <tbody className="bg-white divide-y divide-gray-200">
                      {/* Dynamic Devices from Selected Venue */}
                      {filteredDevices.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                            {devices.length === 0 
                              ? 'No devices found in this venue. Please check console for details.' 
                              : `No devices match the current filters. Total devices: ${devices.length}`}
                          </td>
                        </tr>
                      ) : (
                        filteredDevices.map((device) => {
                          // Get venue name for this device
                          const deviceVenue = allVenues.find(v => v.id === device.venueId) || venue;
                          const deviceVenueName = deviceVenue?.name || venue?.name || 'Unknown Venue';
                          const deviceEvents = events.filter(e => e.deviceId === device.id);
                          
                          return (
                            <tr 
                              key={device.id} 
                              draggable
                              onDragStart={(e) => handleDragStart(e, device.id)}
                              onDragEnd={handleDragEnd}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, device.id)}
                              className={`hover:bg-gray-50 cursor-pointer transition-colors ${selectedDevice?.id === device.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''} ${draggedDeviceId === device.id ? 'opacity-50' : ''}`}
                              onClick={() => {
                                setSelectedDevice(device);
                              }}
                            >
                              <td 
                                className="pl-4 pr-2 py-4 align-middle cursor-grab active:cursor-grabbing"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <GripVertical className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                              </td>
                              <td className="pl-4 pr-6 py-4 align-middle">
                                <div className="flex items-center gap-2">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{device.name || 'N/A'}</div>
                                    <div className="text-xs text-gray-500">{device.serialNumber || 'N/A'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 align-middle">
                                <div className="flex items-center space-x-2">
                                  <MapPin className="w-4 h-4 text-blue-600" />
                                  <span className="text-xs text-gray-900">{deviceVenueName}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 pr-2 align-middle">
                                <div className="flex items-center justify-center space-x-1 bg-gray-100 rounded-full px-2 py-1 w-fit mx-auto">
                                  <button 
                                    onClick={async () => {
                                      const currentTemp = device.temperature || 16;
                                      if (currentTemp > 16) {
                                        try {
                                          await adminAPI.setAdminACTemperature(device.id, currentTemp - 1);
                                          setDevices(prev => prev.map(d => 
                                            d.id === device.id ? { ...d, temperature: currentTemp - 1 } : d
                                          ));
                                          toast.success(`Temperature set to ${currentTemp - 1}°C`);
                                        } catch (error) {
                                          toast.error(error.response?.data?.message || 'Failed to set temperature');
                                        }
                                      }
                                    }}
                                    className="p-0.5 text-blue-600 hover:bg-blue-200 rounded-full flex items-center justify-center"
                                  >
                                    <Minus className="w-2.5 h-2.5" />
                                  </button>
                                  <input 
                                    type="number" 
                                    min="16" 
                                    max="30" 
                                    value={device.temperature || 16}
                                    placeholder="temp"
                                    onChange={async (e) => {
                                      const value = parseInt(e.target.value);
                                      if (!isNaN(value) && value >= 16 && value <= 30) {
                                        try {
                                          await adminAPI.setAdminACTemperature(device.id, value);
                                          setDevices(prev => prev.map(d => 
                                            d.id === device.id ? { ...d, temperature: value } : d
                                          ));
                                          toast.success(`Temperature set to ${value}°C`);
                                        } catch (error) {
                                          toast.error(error.response?.data?.message || 'Failed to set temperature');
                                        }
                                      }
                                    }}
                                    className="text-xs font-medium text-gray-900 w-10 text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded placeholder:text-gray-400"
                                  />
                                  <button 
                                    onClick={async () => {
                                      const currentTemp = device.temperature || 16;
                                      if (currentTemp < 30) {
                                        try {
                                          await adminAPI.setAdminACTemperature(device.id, currentTemp + 1);
                                          setDevices(prev => prev.map(d => 
                                            d.id === device.id ? { ...d, temperature: currentTemp + 1 } : d
                                          ));
                                          toast.success(`Temperature set to ${currentTemp + 1}°C`);
                                        } catch (error) {
                                          toast.error(error.response?.data?.message || 'Failed to set temperature');
                                        }
                                      }
                                    }}
                                    className="p-0.5 text-blue-600 hover:bg-blue-200 rounded-full flex items-center justify-center"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </td>
                              <td className="px-6 py-4 align-middle">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={device.isOn || false}
                                    onChange={async (e) => {
                                      e.stopPropagation(); // Prevent row click
                                      const newStatus = e.target.checked;
                                      console.log('🔄 Toggling AC power:', { 
                                        deviceId: device.id, 
                                        deviceName: device.name, 
                                        newStatus,
                                        venueId: venue?.id,
                                        venueIsOn: venue?.isVenueOn
                                      });
                                      
                                      try {
                                        // Validate status is boolean
                                        if (typeof newStatus !== 'boolean') {
                                          toast.error('Invalid power state');
                                          return;
                                        }
                                        
                                        // Check if venue is ON before turning device ON
                                        if (newStatus === true && venue && venue.isVenueOn === false) {
                                          toast.error('Cannot turn ON device: Venue is currently OFF. Please turn on the venue first.');
                                          // Reset checkbox to previous state
                                          e.target.checked = device.isOn || false;
                                          return;
                                        }
                                        
                                        const response = await adminAPI.toggleAdminACPower(device.id, newStatus);
                                        console.log('✅ AC power toggle response:', response?.data);
                                        
                                        // Update device state with response data if available
                                        const updatedDevice = response?.data?.ac || response?.data?.data?.ac;
                                        const finalStatus = updatedDevice?.isOn !== undefined ? updatedDevice.isOn : newStatus;
                                        
                                        setDevices(prev => prev.map(d => 
                                          d.id === device.id ? { ...d, isOn: finalStatus } : d
                                        ));
                                        
                                        toast.success(response?.data?.message || `Device ${finalStatus ? 'turned ON' : 'turned OFF'}`);
                                        
                                        // Reload venue data to sync state
                                        await loadVenueData();
                                      } catch (error) {
                                        console.error('❌ Toggle AC power error:', error);
                                        // Reset checkbox to previous state on error
                                        e.target.checked = device.isOn || false;
                                        
                                        if (error.response?.status === 401) {
                                          toast.error('Session expired. Please login again.');
                                        } else if (error.response?.status === 400) {
                                          const errorMsg = error.response?.data?.message || 'Invalid request. Please check if venue is ON.';
                                          toast.error(errorMsg);
                                        } else if (error.response?.status === 404) {
                                          toast.error('Device not found or unauthorized');
                                        } else {
                                          toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to toggle device');
                                        }
                                      }
                                    }}
                                    className="sr-only peer"
                                  />
                                  <div className={`w-11 h-6 rounded-full peer ${
                                    device.isOn ? 'bg-green-500' : 'bg-gray-300'
                                  } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                                  <span className="ml-2 text-sm text-gray-700">
                                    {device.isOn ? 'On' : 'Off'}
                                  </span>
                                </label>
                              </td>
                              <td className="px-4 pr-4 py-4 align-middle">
                                <div className="flex justify-center">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent row click
                                      setEventDeviceId(device.id);
                                      setShowEventModal(true);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-full border border-blue-200 bg-white"
                                    title="Create event for this device"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 pr-4 py-4 align-middle">
                                <div className="flex justify-center">
                                  <button
                                    onClick={() => {
                                      setSelectedDevice({
                                        ...device,
                                        venue: deviceVenueName
                                      });
                                      setShowDeviceModal(true);
                                    }}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="View device details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Charts and Scheduled Commands */}
          <div className={hideHeader ? "space-y-6 w-full mt-4" : "space-y-12 -mt-36 max-w-md"}>
            {/* Energy Chart */}
            <div className="relative z-20 -mt-48">
              <EnergyChartBox 
                venue={venue} 
                setVenue={setVenue}
                organizationEnergy={selectedOrganizationId ? organizationEnergy : null}
                organizationName={selectedOrganizationId ? organizations.find(org => org.id === selectedOrganizationId)?.name : null}
                devices={devices}
                onVenueUpdate={loadVenueData}
              />
            </div>

            {/* Scheduled Commands for Device */}
            <DeviceSchedulingSection 
              filteredDevices={filteredDevices}
              events={events}
              faultDevices={faultDevices}
              totalEnergy={totalEnergy}
              selectedDevice={selectedDevice}
              onEventEdit={(event) => {
                if (event && event.id) {
                  // Editing existing event
                  setSelectedEvent(event);
                  setEventDeviceId(event.deviceId);
                } else {
                  // Creating new event
                  setSelectedEvent(null);
                  setEventDeviceId(event?.deviceId || selectedDevice?.id);
                }
                setShowEventModal(true);
              }}
              onEventDelete={() => {
                // Delete is handled in DeviceSchedulingSection
              }}
              onEventEnable={() => {
                // Enable is handled in DeviceSchedulingSection
              }}
              onEventDisable={() => {
                // Disable is handled in DeviceSchedulingSection
              }}
              onReloadEvents={loadVenueData}
            />
          </div>
        </div>
      </div>

      {/* Alert Modal */}
      <NeedMaintenanceModal 
        isOpen={showAlertModal} 
        onClose={() => setShowAlertModal(false)} 
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

      {/* Event Creation Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedEvent ? 'Edit Event' : 'Create Event'}
              </h3>
              <button
                onClick={() => {
                  setShowEventModal(false);
                  setEventDeviceId(null);
                  setSelectedEvent(null);
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
                    const response = await adminAPI.createEvent(eventData);
                    toast.success(response.data?.message || 'Event created successfully');
                    setShowEventModal(false);
                    setEventDeviceId(null);
                    // Reload events
                    await loadVenueData();
                  } catch (error) {
                    console.error('Error creating event:', error);
                    toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to create event');
                  }
                }}
                onCancel={() => {
                  setShowEventModal(false);
                  setEventDeviceId(null);
                }}
                event={eventDeviceId ? { deviceId: eventDeviceId } : null}
                acs={devices}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueDetailsPage;
