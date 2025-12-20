import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminAPI } from '../services/apiAdmin';
import { BACKEND_IP, BACKEND_PORT, FRONTEND_WS_PORT, WS_URL } from '../config/api';
import toast from 'react-hot-toast';
import EventForm from '../components/EventForm';
import { 
  User, 
  Users, 
  Building, 
  Thermometer, 
  Activity,
  LogOut,
  Plus,
  Lock,
  Unlock,
  RefreshCw,
  BarChart3,
  Settings,
  X,
  Save,
  UserPlus,
  MapPin,
  Cpu,
  Gauge,
  Power,
  Eye,
  Info,
  AlertCircle,
  Zap,
  TrendingUp,
  Calendar,
  Play,
  Square,
  Pause,
  PlayCircle,
  Trash2,
  Edit,
  TrendingDown,
  Minus,
  Menu
} from 'lucide-react';

// Form Components
const ManagerForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Password</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Phone</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel || (() => {})}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          Create Manager
        </button>
      </div>
    </form>
  );
};

const OrganizationForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    batchNumber: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Batch Number</label>
        <input
          type="text"
          value={formData.batchNumber}
          onChange={(e) => setFormData({...formData, batchNumber: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel || (() => {})}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          Create Organization
        </button>
      </div>
    </form>
  );
};

const VenueForm = ({ onSubmit, onCancel, organizations = [] }) => {
  const [formData, setFormData] = useState({
    name: '',
    organizationSize: '',
    temperature: 16,
    organizationId: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Organization</label>
        <select
          value={formData.organizationId}
          onChange={(e) => setFormData({...formData, organizationId: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="">Select an organization</option>
          {organizations.map(org => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Venue Size</label>
        <select
          value={formData.organizationSize}
          onChange={(e) => setFormData({...formData, organizationSize: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="">Select venue size</option>
          <option value="Small">Small</option>
          <option value="Medium">Medium</option>
          <option value="Large">Large</option>
          <option value="Enterprise">Enterprise</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Initial Temperature (°C)</label>
        <input
          type="number"
          value={formData.temperature}
          onChange={(e) => setFormData({...formData, temperature: parseInt(e.target.value)})}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          min="16"
          max="30"
        />
      </div>
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel || (() => {})}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          Create Venue
        </button>
      </div>
    </form>
  );
};

const ACForm = ({ onSubmit, onCancel, venues = [] }) => {
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    model: '',
    ton: '',
    serialNumber: '',
    temperature: 16,
    venueId: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Venue</label>
        <select
          value={formData.venueId}
          onChange={(e) => setFormData({...formData, venueId: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="">Select a venue</option>
          {venues.map(venue => (
            <option key={venue.id} value={venue.id}>
              {venue.name} {venue.organization && `(${venue.organization.name})`}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Brand</label>
        <input
          type="text"
          value={formData.brand}
          onChange={(e) => setFormData({...formData, brand: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Model</label>
        <input
          type="text"
          value={formData.model}
          onChange={(e) => setFormData({...formData, model: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Ton (AC Capacity)</label>
        <select
          value={formData.ton}
          onChange={(e) => setFormData({...formData, ton: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="">Select ton capacity</option>
          <option value="0.5">0.5 Ton</option>
          <option value="1">1 Ton</option>
          <option value="1.5">1.5 Ton</option>
          <option value="2">2 Ton</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Serial Number (Optional)</label>
        <input
          type="text"
          value={formData.serialNumber}
          onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Initial Temperature (°C)</label>
        <input
          type="number"
          value={formData.temperature}
          onChange={(e) => setFormData({...formData, temperature: parseInt(e.target.value)})}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          min="16"
          max="30"
        />
      </div>
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel || (() => {})}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          Create AC Device
        </button>
      </div>
    </form>
  );
};

const ManagerAssignmentForm = ({ managerId, organizations, assignedOrganizations = [], onSubmit, onCancel }) => {
  const [selectedOrgs, setSelectedOrgs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-select already assigned organizations when component mounts
  useEffect(() => {
    if (assignedOrganizations && assignedOrganizations.length > 0) {
      const assignedIds = assignedOrganizations.map(org => org.id || org);
      setSelectedOrgs(assignedIds);
    }
  }, [assignedOrganizations]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedOrgs.length === 0) {
      toast.error('Please select at least one organization');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(managerId, selectedOrgs);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleOrganization = (orgId) => {
    setSelectedOrgs(prev => 
      prev.includes(orgId) 
        ? prev.filter(id => id !== orgId)
        : [...prev, orgId]
    );
  };

  const selectAll = () => {
    const filteredOrgs = organizations.filter(org => 
      org.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setSelectedOrgs(filteredOrgs.map(org => org.id));
  };

  const deselectAll = () => {
    setSelectedOrgs([]);
  };

  const filteredOrganizations = organizations.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Assign Organizations to Manager
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Select one or more organizations to assign to this manager. The manager will have control over these organizations.
        </p>
        
        {/* Search and Selection Controls */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 mr-3">
            <input
              type="text"
              placeholder="Search organizations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={selectAll}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={deselectAll}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Selection Summary */}
        <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-blue-900">
                {selectedOrgs.length} Organization{selectedOrgs.length !== 1 ? 's' : ''} Selected
              </p>
              {assignedOrganizations.length > 0 && (
                <p className="text-xs text-blue-700 mt-1">
                  {assignedOrganizations.length} already assigned • {selectedOrgs.length - assignedOrganizations.length} new selection{selectedOrgs.length - assignedOrganizations.length !== 1 ? 's' : ''}
                </p>
              )}
          </div>
            {selectedOrgs.length > 0 && (
              <button
                type="button"
                onClick={deselectAll}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Organizations List */}
        <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md p-3 bg-gray-50">
          {filteredOrganizations.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              {searchTerm ? 'No organizations found matching your search.' : 'No organizations available.'}
            </p>
          ) : (
            filteredOrganizations.map(org => {
              const isAlreadyAssigned = assignedOrganizations.some(ao => (ao.id || ao) === org.id);
              const isSelected = selectedOrgs.includes(org.id);
              
              return (
                <label key={org.id} className={`flex items-center space-x-3 py-3 px-3 hover:bg-white rounded-lg cursor-pointer border-2 transition-all ${
                  isAlreadyAssigned 
                    ? 'bg-blue-50 border-blue-300 hover:border-blue-400' 
                    : isSelected
                    ? 'bg-blue-50 border-blue-200 hover:border-blue-300'
                    : 'bg-white border-gray-200 hover:border-blue-200'
                }`}>
                <input
                  type="checkbox"
                    checked={isSelected}
                  onChange={() => toggleOrganization(org.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-5 h-5"
                />
                <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-gray-900">{org.name}</span>
                      {isAlreadyAssigned && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
                          Already Assigned
                        </span>
                      )}
                      {isSelected && !isAlreadyAssigned && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500 text-white">
                          Selected
                        </span>
                      )}
                    </div>
                  {org.description && (
                      <p className="text-xs text-gray-500 mt-1">{org.description}</p>
                  )}
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      org.status === 'active' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-600'
                    }`}>
                        {org.status || 'active'}
                    </span>
                    {org.temperature && (
                      <span className="text-xs text-gray-500">
                        {org.temperature}°C
                      </span>
                    )}
                  </div>
                </div>
              </label>
              );
            })
          )}
        </div>
      </div>
      
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => {/* Close modal */}}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || selectedOrgs.length === 0}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Assigning...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Assign {selectedOrgs.length} Organization{selectedOrgs.length !== 1 ? 's' : ''}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); // Track initial data load
  const [temperatureLoading, setTemperatureLoading] = useState({});
  const [localTemperatures, setLocalTemperatures] = useState({});
  const [orgPowerLoading, setOrgPowerLoading] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [systemLocked, setSystemLocked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  // Handle window resize for responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        // On desktop, keep sidebar state as is
        return;
      } else {
        // On mobile, close sidebar if open
        if (sidebarOpen) {
          setSidebarOpen(false);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  // Helper functions to check if device/org/venue is actually locked
  // Remote lock (systemLocked) does NOT lock devices/orgs/venues - only blocks remote access
  // So we should NOT show "locked" status if only remote lock is active
  const isDeviceLocked = (ac) => {
    // Remote lock does NOT lock devices - only blocks remote access
    // So if only remote lock is active, device is not locked
    if (systemLocked) {
      // If remote lock is active, check if device is actually locked (not just remote lock)
      // Device is locked only if currentState is 'locked' or isLocked is true
      // But remote lock doesn't set these, so this will return false for remote-only locks
      return ac.currentState === 'locked' || ac.isLocked === true;
    }
    // If remote lock is not active, check normal lock status
    return ac.currentState === 'locked' || ac.isLocked === true;
  };

  const isOrganizationLocked = (org) => {
    // Remote lock does NOT lock organizations - only blocks remote access
    // So if only remote lock is active, organization is not locked
    if (systemLocked) {
      // If remote lock is active, check if organization is actually locked (not just remote lock)
      // Organization is locked only if isLocked is true
      // But remote lock doesn't set this, so this will return false for remote-only locks
      return org.isLocked === true;
    }
    // If remote lock is not active, check normal lock status
    return org.isLocked === true;
  };

  const isVenueLocked = (venue) => {
    // Remote lock does NOT lock venues - only blocks remote access
    // So if only remote lock is active, venue is not locked
    if (systemLocked) {
      // If remote lock is active, check if venue is actually locked (not just remote lock)
      // Venue is locked only if isLocked is true
      // But remote lock doesn't set this, so this will return false for remote-only locks
      return venue.isLocked === true;
    }
    // If remote lock is not active, check normal lock status
    return venue.isLocked === true;
  };

  // Check if organization devices are remote locked
  const isOrganizationDevicesRemoteLocked = (org) => {
    if (!org) return false;
    
    // First check if org has acs array directly
    if (org.acs && Array.isArray(org.acs) && org.acs.length > 0) {
      return org.acs.some(ac => ac.currentState === "locked");
    }
    
    // If not, get ACs from data.acs by filtering through venues
    // Get all venues for this organization
    const orgVenues = Array.isArray(data.venues) 
      ? data.venues.filter(v => v.organizationId === org.id)
      : [];
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
    if (!venue) return false;
    
    // First check if venue has acs array directly
    if (venue.acs && Array.isArray(venue.acs) && venue.acs.length > 0) {
      return venue.acs.some(ac => ac.currentState === "locked");
    }
    
    // If not, get ACs from data.acs by filtering by venueId
    const venueACs = Array.isArray(data.acs) 
      ? data.acs.filter(ac => ac.venueId === venue.id)
      : [];
    
    // Check if any AC has currentState === "locked"
    return venueACs.some(ac => ac.currentState === "locked");
  };

  // Check if a device is remote locked
  const isDeviceRemoteLocked = (ac) => {
    if (!ac) return false;
    // Device is remote locked if currentState === "locked"
    return ac.currentState === "locked";
  };
  const [selectedOrgDetails, setSelectedOrgDetails] = useState(null);
  const [selectedVenueDetails, setSelectedVenueDetails] = useState(null);
  const [selectedACDetails, setSelectedACDetails] = useState(null);
  const [acPowerLoading, setAcPowerLoading] = useState({});
  const [acModeLoading, setAcModeLoading] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [allAlerts, setAllAlerts] = useState([]); // Store all alerts (including device-level) for device highlighting
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [energyData, setEnergyData] = useState({
    acs: {},
    organizations: {}
  });
  const [energyLoading, setEnergyLoading] = useState({});
  const [data, setData] = useState({
    managers: [],
    organizations: [],
    venues: [],
    acs: [],
    logs: [],
    dashboard: {},
    events: []
  });
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventActionLoading, setEventActionLoading] = useState({});
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [managerActionLoading, setManagerActionLoading] = useState({});

  useEffect(() => {
    // Safety timeout: If loading takes more than 10 seconds, show dashboard anyway
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ Admin Dashboard - Loading timeout, showing dashboard anyway');
      setInitialLoading(false);
    }, 10000); // 10 seconds timeout
    
    const loadDataSafely = async () => {
      try {
        console.log('📊 Admin Dashboard - Loading data...');
        console.log('📊 Admin Dashboard - User:', user);
        console.log('📊 Admin Dashboard - User role:', user?.role);
        console.log('📊 Admin Dashboard - localStorage user:', localStorage.getItem('user'));
        console.log('📊 Admin Dashboard - localStorage role:', localStorage.getItem('role'));

        if (user && user.role === 'admin') {
          // Longer delay to ensure session cookie is set after login
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          await loadData();
          loadAlerts();
          loadSystemStatus();
          // Load events on initial mount to get accurate count for tab badge
          loadEvents();
          // Clear timeout since loading completed successfully
          clearTimeout(timeoutId);
        } else {
          console.warn('⚠️ Admin Dashboard - User not authenticated or wrong role');
          // Even if user is not authenticated, stop loading to show the component
          setInitialLoading(false);
          clearTimeout(timeoutId);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        toast.error('Failed to load dashboard data');
        // Always set initialLoading to false even on error to show the dashboard
        setInitialLoading(false);
        clearTimeout(timeoutId);
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
                    console.log(`🌡️ [DASHBOARD] Device ${ac.serialNumber || ac.key} temperature updated: ${ac.temperature}°C → ${update.temperature}°C`);
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
            loadSystemStatus(false); // Refresh lock status silently
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

        // Handle organization assignment/unassignment changes
        if (message.type === 'ESP32_UPDATE' && message.data) {
          const update = message.data;
          
          // Handle organization assigned
          if (update.type === 'ORGANIZATION_ASSIGNED') {
            console.log('📋 Organization assigned received:', update);
            // Refresh data to show updated assignments
            loadData(false); // Refresh data silently
          }
          
          // Handle organization unassigned
          if (update.type === 'ORGANIZATION_UNASSIGNED') {
            console.log('📋 Organization unassigned received:', update);
            // Refresh data to show updated assignments
            loadData(false); // Refresh data silently
          }
        }

        // Handle event started - update status from waiting to in process in real-time
        if (message.type === 'EVENT_STARTED' || (message.type === 'ESP32_UPDATE' && message.data && message.data.type === 'EVENT_STARTED')) {
          const eventData = message.type === 'EVENT_STARTED' ? message : message.data;
          console.log('▶️ Event started received:', eventData);
          
          // Update event status to active in real-time
          setData(prevData => {
            // Find event name before updating
            const event = prevData.events.find(e => e && e.id === eventData.eventId);
            const eventName = eventData.eventName || event?.name || 'Event';
            
            // Show notification
            toast.success(`Event "${eventName}" has started.`, {
              duration: 3000,
            });
            
            return {
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
            };
          });
        }

        // Handle event stopped - update status and schedule deletion
        if (message.type === 'EVENT_STOPPED' || (message.type === 'ESP32_UPDATE' && message.data && message.data.type === 'EVENT_STOPPED')) {
          const eventData = message.type === 'EVENT_STOPPED' ? message : message.data;
          console.log('🛑 Event stopped received:', eventData);
          
          // Update event status to stopped in real-time
          setData(prevData => {
            // Find event name before updating
            const event = prevData.events.find(e => e && e.id === eventData.eventId);
            const stoppedEventName = eventData.eventName || event?.name || 'Event';
            
            // Show notification
            toast.success(`Event "${stoppedEventName}" stopped. Will be removed in 5 seconds.`, {
              duration: 3000,
            });
            
            return {
              ...prevData,
              events: prevData.events.map(event => {
                if (event && event.id === eventData.eventId) {
                  return { ...event, status: 'stopped', stoppedAt: eventData.timestamp };
                }
                return event;
              })
            };
          });
          
          // Auto-delete after 5 seconds
          setTimeout(() => {
            setData(prevData => ({
              ...prevData,
              events: prevData.events.filter(event => event && event.id !== eventData.eventId)
            }));
            console.log(`🗑️ Removed event ${eventData.eventId} from list`);
          }, 5000);
        }

        // Handle event completed - update status and schedule deletion
        if (message.type === 'EVENT_COMPLETED' || (message.type === 'ESP32_UPDATE' && message.data && message.data.type === 'EVENT_COMPLETED')) {
          const eventData = message.type === 'EVENT_COMPLETED' ? message : message.data;
          console.log('✅ Event completed received:', eventData);
          
          // Update event status to completed in real-time
          setData(prevData => {
            // Find event name before updating
            const event = prevData.events.find(e => e && e.id === eventData.eventId);
            const completedEventName = eventData.eventName || event?.name || 'Event';
            
            // Show notification
            toast.success(`Event "${completedEventName}" completed. Will be removed in 5 seconds.`, {
              duration: 3000,
            });
            
            return {
              ...prevData,
              events: prevData.events.map(event => {
                if (event && event.id === eventData.eventId) {
                  return { ...event, status: 'completed', completedAt: eventData.timestamp };
                }
                return event;
              })
            };
          });
          
          // Auto-delete after 5 seconds
          // Only remove if event is still completed (not restarted)
          // Note: This timeout will be lost on page refresh, so events will persist after refresh
          const removeTimeout = setTimeout(() => {
            setData(prevData => {
              const event = prevData.events.find(e => e && e.id === eventData.eventId);
              // Only remove if event is still completed (not restarted or updated)
              if (event && event.status === 'completed') {
                console.log(`🗑️ Removed completed event ${eventData.eventId} from list`);
                return {
                  ...prevData,
                  events: prevData.events.filter(e => e && e.id !== eventData.eventId)
                };
              } else {
                console.log(`⏭️ Skipped removing event ${eventData.eventId} - status changed to ${event?.status}`);
                return prevData; // Don't remove if status changed
              }
            });
          }, 5000); // 5 seconds
          
          // Store timeout ID so we can clear it if needed (though it will be lost on refresh, which is fine)
          // On page refresh, the timeout is lost, so events will remain visible
        }

        // Handle event deleted - remove immediately
        if (message.type === 'EVENT_DELETED' || (message.type === 'ESP32_UPDATE' && message.data && message.data.type === 'EVENT_DELETED')) {
          const eventData = message.type === 'EVENT_DELETED' ? message : message.data;
          console.log('🗑️ Event deleted received:', eventData);
          
          // Remove event from list immediately
          setData(prevData => {
            // Find event name before removing
            const event = prevData.events.find(e => e && e.id === eventData.eventId);
            const deletedEventName = eventData.eventName || event?.name || 'Event';
            
            // Show notification
            toast.success(`Event "${deletedEventName}" has been removed.`, {
              duration: 2000,
            });
            
            return {
              ...prevData,
              events: prevData.events.filter(event => event && event.id !== eventData.eventId)
            };
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
      clearTimeout(timeoutId);
      socket.close();
      clearInterval(alertsInterval);
    };
  }, [user]); // Dependency on user state

  useEffect(() => {
    if (activeTab === 'events') {
      console.log('Events tab activated, loading events...');
      loadEvents();
    }
  }, [activeTab]);

  // Auto-load energy data when energy tab is active
  useEffect(() => {
    if (activeTab === 'energy' && data.acs.length > 0) {
      console.log('⚡ Energy tab activated, loading energy data...');
      console.log(`⚡ Loading energy for ${data.acs.length} ACs and ${data.organizations.length} organizations...`);
      // Load energy for ALL ACs (both ON and OFF) and organizations when energy tab is opened
      data.acs.forEach(ac => {
        loadACEnergy(ac.id); // Load for all ACs, not just ON ones
      });
      data.organizations.forEach(org => {
        loadOrganizationEnergy(org.id);
      });
    }
  }, [activeTab, data.acs.length, data.organizations.length]);

  // Monitor events for auto-start, completion and show notifications
  useEffect(() => {
    if (!Array.isArray(data.events) || data.events.length === 0) return;

    // Store previous event states to detect changes
    const previousStates = new Map();
    data.events.forEach(event => {
      if (event) {
        previousStates.set(event.id, {
          status: event.status,
          autoStarted: event.autoStarted
        });
      }
    });

    const checkEventChanges = () => {
      const now = new Date();
      data.events.forEach(event => {
        if (!event) return;
        
        const previous = previousStates.get(event.id);
        
        // Note: Toast notifications for event started/stopped/completed are handled by WebSocket handlers
        // This useEffect only tracks state changes, no duplicate toasts needed
        
        // Update previous state
        if (event) {
          previousStates.set(event.id, {
            status: event.status,
            autoStarted: event.autoStarted
          });
        }
      });
    };

    // Check every 10 seconds
    const interval = setInterval(checkEventChanges, 10000);
    
    return () => clearInterval(interval);
  }, [data.events]);

  const loadAlerts = async () => {
    try {
      setAlertsLoading(true);
      const res = await adminAPI.getActiveAlerts();
      const allAlertsData = res.data.data || res.data || [];
      // Logs removed for production - uncomment for debugging
      // console.log('📊 [ALERTS] Loaded alerts from API:', allAlertsData.length);
      // console.log('📊 [ALERTS] Alerts structure:', allAlertsData);
      
      // Also check ACs directly for alerts (in case API doesn't return them)
      // Only alert when isWorking is explicitly false (not null) or alertAt is set
      const acsWithAlerts = Array.isArray(data.acs) ? data.acs.filter(ac => 
        ac.isOn && (ac.isWorking === false || ac.alertAt)
      ) : [];
      
      // Combine API alerts with direct AC alerts
      const combinedAlerts = [...allAlertsData];
      acsWithAlerts.forEach(ac => {
        // Check if alert already exists in API alerts
        const exists = combinedAlerts.find(a => a.acId === ac.id);
        if (!exists) {
          // Find venue for this AC
          const venue = Array.isArray(currentData.venues) ? currentData.venues.find(v => v.id === ac.venueId) : null;
          combinedAlerts.push({
            acId: ac.id,
            acName: ac.name,
            brand: ac.brand,
            model: ac.model,
            serialNumber: ac.serialNumber,
            venueId: venue?.id || null,
            venueName: venue?.name || null,
            organizationId: venue?.organizationId || null,
            organizationName: venue?.organization?.name || null,
            issue: ac.isWorking === false ? "Device is not working properly" : "Device has an active alert",
            temperature: ac.temperature,
            roomTemperature: ac.roomTemperature,
            isOn: ac.isOn,
            isWorking: ac.isWorking,
            alertAt: ac.alertAt,
            severity: "high",
          });
        }
      });
      
      // Logs removed for production - uncomment for debugging
      // console.log('📊 [ALERTS] Combined alerts (API + direct AC check):', combinedAlerts.length);
      
      // Store all alerts (including device-level) for device highlighting
      setAllAlerts(combinedAlerts);
      // Show ALL alerts in alerts tab
      setAlerts(combinedAlerts);
    } catch (error) {
      console.error('Failed to load alerts:', error);
      // Even if API fails, check ACs directly
      // Only alert when isWorking is explicitly false (not null) or alertAt is set
      const currentData = data;
      const acsWithAlerts = Array.isArray(currentData.acs) ? currentData.acs.filter(ac => 
        ac.isOn && (ac.isWorking === false || ac.alertAt)
      ) : [];
      const directAlerts = acsWithAlerts.map(ac => {
        const venue = Array.isArray(currentData.venues) ? currentData.venues.find(v => v.id === ac.venueId) : null;
        return {
          acId: ac.id,
          acName: ac.name,
          brand: ac.brand,
          model: ac.model,
          serialNumber: ac.serialNumber,
          venueId: venue?.id || null,
          venueName: venue?.name || null,
          organizationId: venue?.organizationId || null,
          organizationName: venue?.organization?.name || null,
          issue: ac.isWorking === false ? "Device is not working properly" : "Device has an active alert",
          temperature: ac.temperature,
          roomTemperature: ac.roomTemperature,
          isOn: ac.isOn,
          isWorking: ac.isWorking,
          alertAt: ac.alertAt,
          severity: "high",
        };
      });
      setAllAlerts(directAlerts);
      setAlerts(directAlerts);
    } finally {
      setAlertsLoading(false);
    }
  };

  const loadSystemStatus = async (showError = true) => {
    try {
      const res = await adminAPI.getSystemStatus();
      const statusData = res.data?.data || res.data || {};
      const isLocked = statusData.isLocked || false;
      console.log('📊 [ADMIN] System lock status:', { isLocked, statusData });
      setSystemLocked(isLocked);
    } catch (error) {
      if (showError) {
        console.error('Failed to load system status:', error);
      }
    }
  };

  const handleCheckAlerts = async () => {
    try {
      setAlertsLoading(true);
      await adminAPI.checkAlerts();
      toast.success('Alert check completed');
      await loadAlerts();
    } catch (error) {
      toast.error('Failed to check alerts');
      console.error('Check alerts error:', error);
    } finally {
      setAlertsLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      setEventsLoading(true);
      const response = await adminAPI.getEvents();
      console.log('=== Events API Response ===');
      console.log('Full response:', response);
      console.log('response.data:', response.data);
      console.log('response.data.data:', response.data?.data);
      console.log('response.data.data.events:', response.data?.data?.events);
      
      // Backend returns: { success: true, data: { events: [...] } }
      let events = [];
      
      // Try all possible nested structures
      if (response?.data) {
        // Structure: { success: true, data: { events: [...] } }
        if (response.data.data?.events && Array.isArray(response.data.data.events)) {
          events = response.data.data.events;
          console.log('✅ Found events in response.data.data.events');
        }
        // Structure: { success: true, data: { data: { events: [...] } } } (double nested)
        else if (response.data.data?.data?.events && Array.isArray(response.data.data.data.events)) {
          events = response.data.data.data.events;
          console.log('✅ Found events in response.data.data.data.events (double nested)');
        }
        // Structure: { success: true, events: [...] }
        else if (response.data.events && Array.isArray(response.data.events)) {
          events = response.data.events;
          console.log('✅ Found events in response.data.events');
        }
        // Structure: { success: true, data: [...] } (direct array)
        else if (Array.isArray(response.data.data)) {
          events = response.data.data;
          console.log('✅ Found events in response.data.data (direct array)');
        }
        // Structure: { success: true, data: { data: [...] } } (double nested array)
        else if (Array.isArray(response.data.data?.data)) {
          events = response.data.data.data;
          console.log('✅ Found events in response.data.data.data (double nested array)');
        }
        // Structure: response.data is directly an array
        else if (Array.isArray(response.data)) {
          events = response.data;
          console.log('✅ Found events in response.data (direct array)');
        }
        else {
          console.warn('⚠️ Could not find events array. Response structure:', response.data);
        }
      }
      
      console.log('=== Final Parsed Events ===');
      console.log('Events:', events);
      console.log('Events count:', events.length);
      console.log('First event (if any):', events[0]);
      
      if (Array.isArray(events)) {
        // Ensure each event has the required fields
        // IMPORTANT: Don't filter out completed events - show all events
        const validEvents = events.filter(event => event && (event.id || event.eventId));
        console.log('Valid events count:', validEvents.length);
        
        // Debug: Log first event's time format
        if (validEvents.length > 0) {
          console.log('🕐 First event time format check:', {
            startTime: validEvents[0].startTime,
            startTimeType: typeof validEvents[0].startTime,
            endTime: validEvents[0].endTime,
            endTimeType: typeof validEvents[0].endTime
          });
        }
        console.log('Events by status:', {
          scheduled: validEvents.filter(e => e.status === 'scheduled').length,
          active: validEvents.filter(e => e.status === 'active').length,
          completed: validEvents.filter(e => e.status === 'completed').length,
          stopped: validEvents.filter(e => e.status === 'stopped').length
        });
        
        setData(prev => {
          console.log('=== Setting Events in State ===');
          console.log('Previous events count:', prev.events?.length || 0);
          console.log('New events count:', validEvents.length);
          return { ...prev, events: validEvents };
        });
      } else {
        console.error('❌ Events is not an array:', events);
        console.error('Type:', typeof events);
        setData(prev => ({ ...prev, events: [] }));
      }
    } catch (error) {
      console.error('❌ Load events error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      // Don't show error toast on initial load if it's just a 404 or empty response
      if (error.response?.status !== 404) {
        toast.error('Failed to load events: ' + (error.response?.data?.message || error.message));
      }
      // Don't clear events on error - keep existing ones
      // setData(prev => ({ ...prev, events: [] }));
    } finally {
      setEventsLoading(false);
    }
  };

  const handleCreateEvent = async (eventData) => {
    try {
      console.log('Creating event with data:', eventData);
      const response = await adminAPI.createEvent(eventData);
      console.log('Create event response:', response);
      
      if (response.data?.success === false) {
        toast.error(response.data?.message || 'Failed to create event');
        return;
      }
      
      // Check if manager events were disabled
      const disabledCount = response.data?.data?.disabledManagerEventsCount || 0;
      if (disabledCount > 0) {
        toast.success(`Event created successfully. ${disabledCount} conflicting manager event(s) have been disabled.`, {
          duration: 5000
        });
      } else {
        toast.success('Event created successfully');
      }
      
      closeModal();
      setSelectedEvent(null);
      
      // Reload events immediately - no need for delay
        await loadEvents();
    } catch (error) {
      console.error('Create event error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to create event';
      
      // Show specific messages for different error scenarios
      if (errorMessage.includes('conflict') || errorMessage.includes('overlapping') || errorMessage.includes('overlap')) {
        toast.error('Cannot create event: There is a conflicting event at this time. Please choose a different time.', {
          duration: 6000
        });
      } else if (errorMessage.includes('already exists')) {
        toast.error('Cannot create event: An event already exists at this time for the same device/organization.', {
          duration: 6000
        });
      } else {
        toast.error(errorMessage);
      }
      
      // Don't throw error - let user fix the form
      // throw error;
    }
  };

  const handleUpdateEvent = async (eventId, eventData) => {
    try {
      const response = await adminAPI.updateEvent(eventId, eventData);
      console.log('Update event response:', response);
      
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
      
      closeModal();
      // Reload events immediately - no need for delay
        await loadEvents();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to update event';
      toast.error(errorMessage);
      console.error('Update event error:', error);
      console.error('Error response:', error.response?.data);
      throw error;
    }
  };

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
      
      // Reload events immediately - no need for delay
        await loadEvents();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Action failed';
      
      // Show specific messages for different error scenarios
      if (errorMessage.includes('disabled')) {
        toast.error('Cannot perform action: Event is disabled. Please enable it first.', {
          duration: 5000
        });
      } else if (errorMessage.includes('active') && errorMessage.includes('cannot')) {
        toast.error('Cannot perform action: Event is currently active. Stop it first.', {
          duration: 5000
        });
      } else if (errorMessage.includes('not found')) {
        toast.error('Event not found. It may have been deleted.', {
          duration: 4000
        });
      } else if (errorMessage.includes('conflict') || errorMessage.includes('overlapping')) {
        toast.error('Action failed: There is a conflicting event. Please resolve the conflict first.', {
          duration: 6000
        });
      } else {
        toast.error(errorMessage);
      }
      
      console.error(`Event ${action} error:`, error);
      // Still reload events even on error to get latest state
      setTimeout(async () => {
        await loadEvents();
      }, 500);
    } finally {
      setEventActionLoading(prev => {
        const newState = { ...prev };
        delete newState[eventId];
        return newState;
      });
    }
  };

  const loadData = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const [managersRes, orgsRes, venuesRes, acsRes, logsRes, dashboardRes] = await Promise.all([
        adminAPI.getMyManagers(),
        adminAPI.getOrganizations(),
        adminAPI.getVenues(),
        adminAPI.getACs(),
        adminAPI.getActivityLogs(),
        adminAPI.getDashboard()
      ]);

      // Logs removed for production - uncomment for debugging
      // console.log('Admin activity logs response:', logsRes.data);
      // console.log('Venues response:', venuesRes.data);
      // console.log('Organizations response:', orgsRes.data);
      // console.log('ACs response:', acsRes.data);
      
      // Get all organizations
      const allOrgs = orgsRes.data.data || orgsRes.data.organizations || (Array.isArray(orgsRes.data) ? orgsRes.data : []);
      const organizations = Array.isArray(allOrgs) ? allOrgs : [];
      
      // Map AC data to include isLocked flag for compatibility
      // Backend returns: { success: true, data: [acs...] }
      const rawAcs = acsRes.data?.data || acsRes.data?.acs || (Array.isArray(acsRes.data) ? acsRes.data : []);
      const acs = Array.isArray(rawAcs) ? rawAcs.map(ac => ({
        ...ac,
        // Map currentState to isLocked for compatibility
        isLocked: ac.currentState === 'locked' || ac.isLocked || false
      })) : [];

      setData(prev => ({
        ...prev,
        managers: managersRes.data.data?.managers || managersRes.data.managers || [],
        organizations: organizations,
        venues: venuesRes.data.data?.venues || venuesRes.data.venues || (Array.isArray(venuesRes.data) ? venuesRes.data : []),
        acs: acs,
        logs: Array.isArray(logsRes.data.data) ? logsRes.data.data : (logsRes.data.logs || []),
        dashboard: dashboardRes.data.data || dashboardRes.data || {},
        // CRITICAL: Preserve events - don't clear them when loading other data
        events: prev.events || []
      }));
      
      // Logs removed for production - uncomment for debugging
      // console.log('Processed admin logs:', Array.isArray(logsRes.data.data) ? logsRes.data.data : (logsRes.data.logs || []));
      // console.log('Processed venues:', venuesRes.data.data?.venues || venuesRes.data.venues || []);
      // console.log('Processed organizations:', activeOrgs);
      // console.log('🌡️ Organization temperatures:', activeOrgs.map(org => ({ id: org.id, name: org.name, temperature: org.temperature })));
      
      // Load alerts and events after state is updated - use Promise to ensure state is ready
      // This avoids setTimeout race conditions
      await Promise.resolve(); // Ensure state update is processed
      loadAlerts(); // Load alerts in parallel (no delay needed)
      loadEvents(); // Load events to ensure they're up to date
      
      // Mark initial loading as complete after first successful load
      setInitialLoading(false);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load data';
      toast.error(errorMessage);
      console.error('Load data error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      // Even on error, mark initial loading as complete to show error state
      setInitialLoading(false);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };


  const handleLockManager = async (managerId, reason) => {
    try {
      await adminAPI.lockManager(managerId, reason);
      toast.success('Manager locked successfully');
      loadData(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to lock manager');
    }
  };

  const handleUnlockManager = async (managerId) => {
    if (managerActionLoading[managerId]) {
      console.log('⏳ Unlock already in progress for manager:', managerId);
      return; // Prevent double clicks
    }
    
    try {
      setManagerActionLoading(prev => ({ ...prev, [managerId]: true }));
      console.log('🔓 Unlocking manager:', managerId);
      const response = await adminAPI.unlockManager(managerId);
      console.log('✅ Unlock manager response:', response.data);
      toast.success('Manager unlocked successfully');
      
      // Reload data to reflect changes
      await loadData(true);
      
      setManagerActionLoading(prev => ({ ...prev, [managerId]: false }));
    } catch (error) {
      console.error('❌ Unlock manager error:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to unlock manager';
      toast.error(errorMessage);
      setManagerActionLoading(prev => ({ ...prev, [managerId]: false }));
    }
  };

  const handleRestrictedUnlockManager = async (managerId) => {
    if (managerActionLoading[managerId]) {
      console.log('⏳ Restricted unlock already in progress for manager:', managerId);
      return; // Prevent double clicks
    }
    
    try {
      setManagerActionLoading(prev => ({ ...prev, [managerId]: true }));
      console.log('🔓 Restricted unlocking manager:', managerId);
      const response = await adminAPI.restrictedUnlockManager(managerId);
      console.log('✅ Restricted unlock manager response:', response.data);
      toast.success('Manager unlocked with restricted access');
      
      // Reload data to reflect changes
      await loadData(true);
      
      setManagerActionLoading(prev => ({ ...prev, [managerId]: false }));
    } catch (error) {
      console.error('❌ Restricted unlock manager error:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to unlock manager';
      toast.error(errorMessage);
      setManagerActionLoading(prev => ({ ...prev, [managerId]: false }));
    }
  };

  const handleCreateManager = async (managerData) => {
    try {
      await adminAPI.createManager(managerData);
      toast.success('Manager created successfully');
      loadData(true);
      setShowModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create manager');
    }
  };

  const handleCreateOrganization = async (orgData) => {
    try {
      await adminAPI.createOrganization(orgData);
      toast.success('Organization created successfully');
      loadData(true);
      setShowModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create organization');
    }
  };

  const handleCreateVenue = async (venueData) => {
    try {
      await adminAPI.createVenue(venueData);
      toast.success('Venue created successfully');
      loadData(true);
      setShowModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create venue');
    }
  };

  const handleCreateAC = async (acData) => {
    try {
      await adminAPI.createAC(acData);
      toast.success('ac device created successfully');
      loadData(true);
      setShowModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create ac device');
    }
  };

  const handleSystemLockFromRemote = async () => {
    try {
      console.log('🔒 [ADMIN] Attempting to lock remote access...');
      // Lock remote access (does NOT lock manager accounts)
      const response = await adminAPI.adminLockSystemFromRemote('Admin locked system from remote access');
      console.log('✅ [ADMIN] Lock response:', response.data);
      
      // Immediately update local state
      setSystemLocked(true);
      
      // Refresh status from server to get accurate state (with delay to allow backend to process)
      // Use longer delay to ensure session is stable
      setTimeout(async () => {
        try {
          await loadSystemStatus(false); // Don't show error toast for status refresh
        } catch (statusError) {
          console.warn('⚠️ Failed to refresh status (non-critical):', statusError);
          // Don't redirect or logout on status refresh errors
        }
      }, 1000);
      
      toast.success('Remote access locked successfully (manager accounts remain unchanged)');
    } catch (error) {
      console.error('❌ [ADMIN] Lock remote access error:', error);
      console.error('   Error response:', error.response?.data);
      console.error('   Error status:', error.response?.status);
      
      // Don't redirect on lock errors - might be session issue but user should stay logged in
      const errorMessage = error.response?.data?.message || error.message || 'Failed to lock remote access';
      toast.error(errorMessage);
    }
  };

  const handleSystemUnlock = async () => {
    try {
      // Unlock remote access (does NOT change manager account status)
      const response = await adminAPI.unlockSystem();
      // Refresh status from server to get accurate state
      await loadSystemStatus();
      toast.success('Remote access unlocked successfully');
      // Optionally reload data after unlock
      await loadData();
    } catch (error) {
      console.error('Unlock system error:', error);
      // Don't clear localStorage on unlock errors - let the API interceptor handle it
      const errorMessage = error.response?.data?.message || 'Failed to unlock remote access';
      toast.error(errorMessage);
    }
  };

  const handleSetTemperature = async (type, id, temperature = 16) => {
    const loadingKey = `${type}-${id}`;
    
    // Prevent multiple simultaneous requests for the same item
    if (temperatureLoading[loadingKey]) {
      return;
    }
    
    try {
      setTemperatureLoading(prev => ({ ...prev, [loadingKey]: true }));
      
      let response;
      if (type === 'organization') {
        response = await adminAPI.setAdminOrganizationTemperature(id, temperature);
      } else if (type === 'venue') {
        response = await adminAPI.setVenueTemperature(id, temperature);
      } else if (type === 'ac') {
        response = await adminAPI.setAdminACTemperature(id, temperature);
      }
      
      // Get updated temperature from response if available (check both organization and venue)
      const updatedTemperature = response.data?.organization?.temperature ?? 
                                 response.data?.venue?.temperature ?? 
                                 response.data?.ac?.temperature ??
                                 temperature;
      
      // Get hasMixedTemperatures from response
      const orgHasMixed = response.data?.organization?.hasMixedTemperatures;
      const venueHasMixed = response.data?.venue?.hasMixedTemperatures;
      
      console.log('🌡️ [DASHBOARD] Temperature update response:', {
        responseData: response.data,
        updatedTemperature,
        orgHasMixed,
        venueHasMixed,
        type,
        id
      });
      
      // Log temperature change for AC devices
      if (type === 'ac') {
        const ac = data.acs.find(ac => ac.id === id);
        if (ac) {
          console.log(`🌡️ [DASHBOARD] AC Device ${ac.serialNumber || ac.key}: Temperature changed to ${updatedTemperature}°C`);
        }
      }
      
      // Detailed log for organization temperature
      if (type === 'organization' && response.data?.organization) {
        console.log('📊 [TEMP-SET] Organization response details:', {
          orgId: response.data.organization.id,
          orgName: response.data.organization.name,
          temperature: response.data.organization.temperature,
          temperatureType: typeof response.data.organization.temperature,
          hasMixedTemperatures: response.data.organization.hasMixedTemperatures
        });
      }
      
      toast.success(`Temperature set to ${updatedTemperature}°C`);
      
      // Clear local temperature state for this item
      setLocalTemperatures(prev => {
        const newState = { ...prev };
        delete newState[loadingKey];
        delete newState[`organization-${id}`];
        delete newState[`venue-${id}`];
        delete newState[`ac-${id}`];
        return newState;
      });
      
      // Update selected AC details if modal is open
      if (type === 'ac' && selectedACDetails && selectedACDetails.id === id) {
        setSelectedACDetails(prev => ({ 
          ...prev, 
          temperature: updatedTemperature,
          hasMixedTemperatures: venueHasMixed !== undefined ? venueHasMixed : prev.hasMixedTemperatures
        }));
      }
      
      // Update selected organization details if modal is open
      if (type === 'organization' && selectedOrgDetails && selectedOrgDetails.id === id) {
        setSelectedOrgDetails(prev => ({ 
          ...prev, 
          temperature: updatedTemperature,
          hasMixedTemperatures: orgHasMixed !== undefined ? orgHasMixed : prev.hasMixedTemperatures
        }));
      }
      
      // Update data immediately based on type (including hasMixedTemperatures)
      if (type === 'organization') {
        setData(prev => ({
          ...prev,
          organizations: prev.organizations.map(org => 
            org.id === id ? { 
              ...org, 
              temperature: updatedTemperature,
              hasMixedTemperatures: orgHasMixed !== undefined ? orgHasMixed : org.hasMixedTemperatures
            } : org
          )
        }));
      } else if (type === 'venue') {
        setData(prev => ({
          ...prev,
          venues: prev.venues.map(venue => 
            venue.id === id ? { 
              ...venue, 
              temperature: updatedTemperature,
              hasMixedTemperatures: venueHasMixed !== undefined ? venueHasMixed : (venue.hasMixedTemperatures ?? false)
            } : venue
          ),
          // Also update organization if venue changed
          // IMPORTANT: Only update hasMixedTemperatures, NOT temperature (organization temp comes from main venue, not child venue)
          organizations: response.data?.organization?.id ? prev.organizations.map(org => {
            if (org.id === response.data.organization.id) {
              // Only update temperature if response explicitly provides it (from main venue)
              // Otherwise keep existing organization temperature
              const newOrgTemp = (response.data.organization.temperature !== null && response.data.organization.temperature !== undefined)
                ? response.data.organization.temperature
                : org.temperature; // Keep existing temp if not provided
              
              console.log(`🔄 [FRONTEND] Updating organization ${org.id} after venue change:`, {
                oldTemp: org.temperature,
                newTemp: newOrgTemp,
                responseOrgTemp: response.data.organization.temperature,
                oldMixed: org.hasMixedTemperatures,
                newMixed: orgHasMixed !== undefined ? orgHasMixed : org.hasMixedTemperatures
              });
              
              return {
                ...org,
                temperature: newOrgTemp,
                hasMixedTemperatures: orgHasMixed !== undefined ? orgHasMixed : (org.hasMixedTemperatures ?? false)
              };
            }
            return org;
          }) : prev.organizations
        }));
      } else if (type === 'ac') {
        setData(prev => ({
          ...prev,
          acs: prev.acs.map(ac => 
            ac.id === id ? { ...ac, temperature: updatedTemperature } : ac
          ),
          // Update venue if AC changed
          venues: response.data?.venue?.id ? prev.venues.map(venue => 
            venue.id === response.data.venue.id ? {
              ...venue,
              hasMixedTemperatures: venueHasMixed !== undefined ? venueHasMixed : venue.hasMixedTemperatures
            } : venue
          ) : prev.venues,
          // Update organization if AC changed
          organizations: response.data?.organization?.id ? prev.organizations.map(org => 
            org.id === response.data.organization.id ? {
              ...org,
              hasMixedTemperatures: orgHasMixed !== undefined ? orgHasMixed : org.hasMixedTemperatures
            } : org
          ) : prev.organizations
        }));
      }
      
      // Store response data BEFORE loadData (so it doesn't get lost)
      const responseOrgTemp = response.data?.organization?.temperature;
      const responseOrgMixed = response.data?.organization?.hasMixedTemperatures;
      
      // Small delay to ensure backend has processed the update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh data to get latest from server, but preserve the temperature we just set
      const preservedTemp = updatedTemperature;
      await loadData(false);
      
      // After loadData, ensure the temperature and hasMixedTemperatures are still set
      // IMPORTANT: Preserve temperature from response, not from loadData (which might have stale data)
      if (type === 'organization') {
        // Use stored response temperature (from BEFORE loadData)
        
        setData(prev => ({
          ...prev,
          organizations: prev.organizations.map(org => {
            if (org.id === id) {
              // ALWAYS use response temperature (from setOrganizationTemperature response)
              // loadData se jo temp aa raha hai, woh wrong ho sakta hai (main venue find nahi hua)
              const finalTemp = (responseOrgTemp !== null && responseOrgTemp !== undefined) 
                ? responseOrgTemp 
                : ((org.temperature !== null && org.temperature !== undefined) 
                    ? org.temperature 
                    : preservedTemp);
              
              console.log(`🔄 [FRONTEND] After loadData - Organization ${id}:`, {
                responseOrgTemp: responseOrgTemp,
                loadDataOrgTemp: org.temperature,
                preservedTemp: preservedTemp,
                finalTemp: finalTemp,
                responseOrgMixed: responseOrgMixed,
                loadDataOrgMixed: org.hasMixedTemperatures
              });
              
              return {
                ...org,
                temperature: finalTemp,
                hasMixedTemperatures: responseOrgMixed !== undefined ? responseOrgMixed : (org.hasMixedTemperatures ?? false)
              };
            }
            return org;
          })
        }));
      } else if (type === 'venue') {
        // Store organization temp and mixed status from response BEFORE loadData
        const orgTempFromResponse = response.data?.organization?.temperature;
        const orgIdFromResponse = response.data?.organization?.id;
        const orgMixedFromResponse = response.data?.organization?.hasMixedTemperatures;
        
        setData(prev => ({
          ...prev,
          venues: prev.venues.map(venue => 
            venue.id === id ? { 
              ...venue, 
              // Use backend temperature if available, otherwise use preservedTemp
              temperature: (venue.temperature !== null && venue.temperature !== undefined) ? venue.temperature : preservedTemp,
              hasMixedTemperatures: venueHasMixed !== undefined ? venueHasMixed : (venue.hasMixedTemperatures ?? false)
            } : venue
          ),
          // Also update organization if venue changed
          // IMPORTANT: Use organization temp from response (main venue temp), NOT from loadData
          organizations: orgIdFromResponse ? prev.organizations.map(org => {
            if (org.id === orgIdFromResponse) {
              // ALWAYS use organization temp from response (main venue temp)
              // Response me main venue ka temp hai, loadData me wrong venue ka temp ho sakta hai
              const newOrgTemp = (orgTempFromResponse !== null && orgTempFromResponse !== undefined)
                ? orgTempFromResponse
                : org.temperature; // Fallback to existing if response didn't provide
              
              console.log(`🔄 [FRONTEND] After loadData - Organization ${orgIdFromResponse} (venue changed):`, {
                responseOrgTemp: orgTempFromResponse,
                loadDataOrgTemp: org.temperature,
                finalOrgTemp: newOrgTemp,
                oldMixed: org.hasMixedTemperatures,
                newMixed: orgMixedFromResponse !== undefined ? orgMixedFromResponse : org.hasMixedTemperatures
              });
              
              return {
                ...org,
                temperature: newOrgTemp,
                hasMixedTemperatures: orgMixedFromResponse !== undefined ? orgMixedFromResponse : (org.hasMixedTemperatures ?? false)
              };
            }
            return org;
          }) : prev.organizations
        }));
      } else if (type === 'ac') {
        setData(prev => ({
          ...prev,
          acs: prev.acs.map(ac => 
            ac.id === id ? { ...ac, temperature: ac.temperature ?? preservedTemp } : ac
          ),
          // Update venue if AC changed
          venues: response.data?.venue?.id ? prev.venues.map(venue => 
            venue.id === response.data.venue.id ? {
              ...venue,
              hasMixedTemperatures: venueHasMixed !== undefined ? venueHasMixed : venue.hasMixedTemperatures
            } : venue
          ) : prev.venues,
          // Update organization if AC changed
          organizations: response.data?.organization?.id ? prev.organizations.map(org => 
            org.id === response.data.organization.id ? {
              ...org,
              hasMixedTemperatures: orgHasMixed !== undefined ? orgHasMixed : org.hasMixedTemperatures
            } : org
          ) : prev.organizations
        }));
      }
      
    } catch (error) {
      console.error('Temperature change error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to set temperature');
    } finally {
      setTemperatureLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleTemperatureChange = (type, id, temperature) => {
    const key = `${type}-${id}`;
    // Allow empty string for clearing the field
    setLocalTemperatures(prev => ({ ...prev, [key]: temperature }));
  };

  const handleTemperatureSubmit = async (type, id, temperature) => {
    if (temperature >= 16 && temperature <= 30) {
      await handleSetTemperature(type, id, temperature);
    }
  };

  const handleToggleOrganizationPower = async (orgId, currentPowerState) => {
    const loadingKey = `org-power-${orgId}`;
    
    // Prevent multiple simultaneous requests
    if (orgPowerLoading[loadingKey]) {
      return;
    }
    
    try {
      setOrgPowerLoading(prev => ({ ...prev, [loadingKey]: true }));
      
      // Ensure currentPowerState is a boolean (default to false if undefined)
      const currentState = currentPowerState === true || currentPowerState === 'true' || currentPowerState === 1;
      const newPowerState = !currentState;
      
      console.log('🔌 Toggling organization power:', {
        orgId,
        currentState,
        newPowerState
      });
      
      const response = await adminAPI.toggleOrganizationPower(orgId, newPowerState);
      
      if (response.data?.success === false) {
        toast.error(response.data?.message || 'Failed to toggle organization power');
        return;
      }
      
      // Get actual power state from response (organization power is stored as isVenueOn in Venue model)
      const actualPowerState = response.data?.organization?.isVenueOn !== undefined
                              ? response.data.organization.isVenueOn
                              : (response.data?.organization?.isOrganizationOn !== undefined
                                ? response.data.organization.isOrganizationOn
                                : newPowerState);
      
      // Update state immediately for instant UI feedback
      setData(prevData => ({
        ...prevData,
        organizations: prevData.organizations.map(org => 
          org.id === orgId ? {
            ...org,
            isOrganizationOn: actualPowerState,
            isVenueOn: actualPowerState // Organization power is stored in Venue model as isVenueOn
          } : org
        )
      }));
      
      toast.success(response.data?.message || `Organization power ${actualPowerState ? 'turned ON' : 'turned OFF'}`);
      
      // Reload data to reflect changes, but preserve the updated power state
      await loadData();
      
      // After loadData, ensure the power state is still correct (loadData might override it)
      setData(prevData => ({
        ...prevData,
        organizations: prevData.organizations.map(org => 
          org.id === orgId ? {
            ...org,
            isOrganizationOn: actualPowerState,
            isVenueOn: actualPowerState // Organization power is stored in Venue model as isVenueOn
          } : org
        )
      }));
    } catch (error) {
      console.error('Toggle organization power error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to toggle organization power';
      toast.error(errorMessage);
    } finally {
      setOrgPowerLoading(prev => {
        const newState = { ...prev };
        delete newState[loadingKey];
        return newState;
      });
    }
  };

  const handleToggleVenuePower = async (venueId, currentPowerState) => {
    const loadingKey = `venue-power-${venueId}`;
    
    // Prevent multiple simultaneous requests
    if (orgPowerLoading[loadingKey]) {
      return;
    }
    
    try {
      setOrgPowerLoading(prev => ({ ...prev, [loadingKey]: true }));
      
      // Ensure currentPowerState is a boolean (default to false if undefined)
      const currentState = currentPowerState === true || currentPowerState === 'true' || currentPowerState === 1;
      const newPowerState = !currentState;
      
      console.log('🔌 Toggling venue power:', {
        venueId,
        currentState,
        newPowerState
      });
      
      const response = await adminAPI.toggleVenuePower(venueId, newPowerState);
      
      if (response.data?.success === false) {
        toast.error(response.data?.message || 'Failed to toggle venue power');
        return;
      }
      
      // Get actual power state from response
      const actualPowerState = response.data?.venue?.isVenueOn !== undefined
                              ? response.data.venue.isVenueOn
                              : newPowerState;
      
      // Update state immediately for instant UI feedback
      setData(prevData => ({
        ...prevData,
        venues: prevData.venues.map(venue => 
          venue.id === venueId ? {
            ...venue,
            isVenueOn: actualPowerState
          } : venue
        )
      }));
      
      toast.success(response.data?.message || `Venue power ${actualPowerState ? 'turned ON' : 'turned OFF'}`);
      
      // Reload data to reflect changes, but preserve the updated power state
      await loadData();
      
      // After loadData, ensure the power state is still correct (loadData might override it)
      setData(prevData => ({
        ...prevData,
        venues: prevData.venues.map(venue => 
          venue.id === venueId ? {
            ...venue,
            isVenueOn: actualPowerState
          } : venue
        )
      }));
    } catch (error) {
      console.error('Toggle venue power error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to toggle venue power';
      
      // Show specific error messages
      if (errorMessage.includes('Organization is currently OFF') || errorMessage.includes('organization')) {
        toast.error('⚠️ ' + errorMessage + ' Please turn on the organization first.', {
          duration: 5000
        });
      } else {
      toast.error(errorMessage);
      }
    } finally {
      setOrgPowerLoading(prev => {
        const newState = { ...prev };
        delete newState[loadingKey];
        return newState;
      });
    }
  };

  const handleAssignManager = async (managerId, organizationIds) => {
    try {
      console.log('🔍 Assigning manager:', { managerId, organizationIds });
      const response = await adminAPI.assignManagerToOrganizations(managerId, organizationIds);
      console.log('✅ Manager assignment response:', response.data);
      toast.success(response.data?.message || 'Manager assigned successfully');
      loadData(true);
      setShowModal(false);
    } catch (error) {
      console.error('❌ Failed to assign manager:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to assign manager';
      toast.error(errorMessage);
    }
  };

  const handleDeleteAC = async (acId, acName) => {
    if (!window.confirm(`Are you sure you want to delete "${acName}"?\n\nThis will:\n- Delete the AC device permanently\n- Delete all related events\n- Delete all related activity logs\n- Delete all related system states\n\nThis action CANNOT be undone!`)) {
      return;
    }

    try {
      const result = await adminAPI.deleteAC(acId);
      toast.success(result.data?.message || `AC device "${acName}" deleted successfully`);
      loadData(true);
      // Close AC details modal if it's open for this AC
      if (modalType === 'view-ac' && selectedACDetails?.id === acId) {
        closeModal();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to delete AC device "${acName}"`);
    }
  };

  const handleDeleteVenue = async (venueId, venueName) => {
    if (!window.confirm(
      `⚠️ WARNING: Delete Venue "${venueName}"?\n\n` +
      `This will PERMANENTLY DELETE:\n` +
      `• All organizations in this venue\n` +
      `• All AC devices in those organizations\n` +
      `• All events related to those organizations and devices\n` +
      `• All activity logs and system states\n\n` +
      `This action CANNOT be undone!\n\n` +
      `Are you absolutely sure?`
    )) {
      return;
    }

    try {
      setLoading(true);
      const response = await adminAPI.deleteVenue(venueId);
      if (response.data.success) {
        toast.success(`Venue "${venueName}" deleted successfully`);
        await loadData(false);
      } else {
        toast.error(response.data.message || 'Failed to delete venue');
      }
    } catch (error) {
      console.error('Delete venue error:', error);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to delete venue');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrganization = async (organizationId, organizationName) => {
    if (!window.confirm(
      `⚠️ WARNING: Delete Organization "${organizationName}"?\n\n` +
      `This will PERMANENTLY DELETE:\n` +
      `• All AC devices in this organization\n` +
      `• All events related to this organization and its devices\n` +
      `• All activity logs and system states\n\n` +
      `This action CANNOT be undone!\n\n` +
      `Are you absolutely sure?`
    )) {
      return;
    }

    try {
      setLoading(true);
      const response = await adminAPI.deleteOrganization(organizationId);
      if (response.data.success) {
        toast.success(`Organization "${organizationName}" deleted successfully`);
        await loadData(false);
      } else {
        toast.error(response.data.message || 'Failed to delete organization');
      }
    } catch (error) {
      console.error('Delete organization error:', error);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to delete organization');
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignOrganization = async (organizationId) => {
    try {
      await adminAPI.unassignOrganizationFromManager(organizationId);
      toast.success('Manager unassigned from organization successfully');
      loadData(true);
      // Refresh organization details if modal is open
      if (modalType === 'view-organization' && selectedOrgDetails?.id === organizationId) {
        handleViewOrganizationDetails(organizationId);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to unassign manager');
    }
  };


  const handleLockOrganization = async (organizationId, reason = null) => {
    try {
      const result = await adminAPI.lockOrganization(organizationId, reason);
      toast.success(result.data?.message || 'Organization locked successfully');
      // Refresh organization details if modal is open
      if (modalType === 'view-organization' && selectedOrgDetails?.id === organizationId) {
        handleViewOrganizationDetails(organizationId);
      }
      loadData(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to lock organization');
    }
  };

  const handleUnlockOrganization = async (organizationId) => {
    try {
      const result = await adminAPI.unlockOrganization(organizationId);
      toast.success(result.data?.message || 'Organization unlocked successfully');
      // Refresh organization details if modal is open
      if (modalType === 'view-organization' && selectedOrgDetails?.id === organizationId) {
        handleViewOrganizationDetails(organizationId);
      }
      loadData(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to unlock organization');
    }
  };

  const handleRemoteLockOrganization = async (organizationId, reason = null) => {
    try {
      const result = await adminAPI.remoteLockOrganization(organizationId, reason);
      toast.success(result.data?.message || 'Organization devices remote locked successfully');
      // Refresh organization details if modal is open
      if (modalType === 'view-organization' && selectedOrgDetails?.id === organizationId) {
        handleViewOrganizationDetails(organizationId);
      }
      loadData(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remote lock organization devices');
    }
  };

  const handleRemoteUnlockOrganization = async (organizationId) => {
    try {
      const result = await adminAPI.remoteUnlockOrganization(organizationId);
      toast.success(result.data?.message || 'Organization devices remote unlocked successfully');
      // Refresh organization details if modal is open
      if (modalType === 'view-organization' && selectedOrgDetails?.id === organizationId) {
        handleViewOrganizationDetails(organizationId);
      }
      loadData(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remote unlock organization devices');
    }
  };

  const handleRemoteLockVenue = async (venueId, reason = null) => {
    try {
      const result = await adminAPI.remoteLockVenue(venueId, reason);
      toast.success(result.data?.message || 'Venue devices remote locked successfully');
      // Refresh venue details if modal is open
      if (modalType === 'view-venue' && selectedVenueDetails?.id === venueId) {
        handleViewVenueDetails(venueId);
      }
      loadData(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remote lock venue devices');
    }
  };

  const handleRemoteUnlockVenue = async (venueId) => {
    try {
      const result = await adminAPI.remoteUnlockVenue(venueId);
      toast.success(result.data?.message || 'Venue devices remote unlocked successfully');
      // Refresh venue details if modal is open
      if (modalType === 'view-venue' && selectedVenueDetails?.id === venueId) {
        handleViewVenueDetails(venueId);
      }
      loadData(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remote unlock venue devices');
    }
  };

  const handleRemoteLockAC = async (acId, reason = null) => {
    try {
      // Use direct AC lock endpoint - this sends LOCK_STATE command to ESP32
      const result = await adminAPI.toggleACLockStatus(acId, 'lock', reason);
      toast.success(result.data?.message || 'Device remote locked successfully');
      if (modalType === 'view-ac' && selectedACDetails?.id === acId) {
        handleViewACDetails(acId);
      }
      loadData(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remote lock device');
    }
  };

  const handleRemoteUnlockAC = async (acId) => {
    try {
      // Use direct AC unlock endpoint - this sends LOCK_STATE command to ESP32
      const result = await adminAPI.toggleACLockStatus(acId, 'unlock', null);
      toast.success(result.data?.message || 'Device remote unlocked successfully');
      if (modalType === 'view-ac' && selectedACDetails?.id === acId) {
        handleViewACDetails(acId);
      }
      loadData(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remote unlock device');
    }
  };

  const handleToggleACPower = async (acId, currentStatus) => {
    const newStatus = !currentStatus;
    setAcPowerLoading(prev => ({ ...prev, [acId]: true }));
    try {
      const response = await adminAPI.toggleAdminACPower(acId, newStatus ? 'on' : 'off');
      
      if (response.data?.success === false) {
        toast.error(response.data?.message || 'Failed to toggle AC power');
        return;
      }
      
      // Get actual status from response
      const actualStatus = response.data?.ac?.isOn !== undefined 
                          ? response.data.ac.isOn 
                          : newStatus;
      
      // Update state immediately for instant UI feedback
      setData(prevData => ({
        ...prevData,
        acs: prevData.acs.map(ac => 
          ac.id === acId ? {
            ...ac,
            isOn: actualStatus
          } : ac
        )
      }));
      
      // Update selected AC details if modal is open
      if (selectedACDetails && selectedACDetails.id === acId) {
        setSelectedACDetails(prev => ({ ...prev, isOn: actualStatus }));
      }
      
      toast.success(response.data?.message || `AC ${actualStatus ? 'turned ON' : 'turned OFF'}`);
      
      // Refresh data immediately to show updated state (without loading spinner for quick updates)
      loadData(true);
    } catch (error) {
      console.error('Toggle AC power error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to toggle AC power';
      
      // Show specific error messages
      if (errorMessage.includes('Venue is currently OFF') || errorMessage.includes('venue')) {
        toast.error('⚠️ ' + errorMessage + ' Please turn on the venue first.', {
          duration: 5000
        });
      } else if (errorMessage.includes('Organization is currently OFF') || errorMessage.includes('organization')) {
        toast.error('⚠️ ' + errorMessage + ' Please turn on the organization first.', {
          duration: 5000
        });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setAcPowerLoading(prev => ({ ...prev, [acId]: false }));
    }
  };

  const handleToggleACLock = async (acId, action, reason = null) => {
    try {
      const result = await adminAPI.toggleACLockStatus(acId, action, reason);
      toast.success(result.data?.message || `ac device ${action}ed successfully`);
      
      // Immediately update the AC state in local data for instant UI update
      const updatedAC = result.data?.ac;
      if (updatedAC) {
        setData(prevData => ({
          ...prevData,
          acs: prevData.acs.map(ac => 
            ac.id === acId 
              ? { 
                  ...ac, 
                  currentState: updatedAC.currentState,
                  isLocked: updatedAC.currentState === 'locked',
                  lockedBy: updatedAC.lockedBy,
                  lockedAt: updatedAC.lockedAt,
                  lockReason: updatedAC.lockReason
                }
              : ac
          )
        }));
      }
      
      // Update selected AC details if modal is open
      if (selectedACDetails && selectedACDetails.id === acId && updatedAC) {
        setSelectedACDetails(prev => ({
          ...prev,
          currentState: updatedAC.currentState,
          isLocked: updatedAC.currentState === 'locked',
          lockedBy: updatedAC.lockedBy,
          lockedAt: updatedAC.lockedAt,
          lockReason: updatedAC.lockReason
        }));
      }
      
      // Also refresh to ensure consistency
      loadData(false);
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${action} ac device`);
    }
  };

  const handleSetACMode = async (acId, mode) => {
    setAcModeLoading(prev => ({ ...prev, [acId]: true }));
    try {
      await adminAPI.setACMode(acId, mode);
      toast.success(`ac mode changed to ${mode.toUpperCase()}`);
      // Update selected AC details if modal is open
      if (selectedACDetails && selectedACDetails.id === acId) {
        setSelectedACDetails(prev => ({ ...prev, currentMode: mode }));
      }
      // Refresh data to show updated mode
      await loadData();
      // Refresh energy data as mode affects energy consumption
      loadACEnergy(acId);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change ac mode');
    } finally {
      setAcModeLoading(prev => ({ ...prev, [acId]: false }));
    }
  };

  const handleViewACDetails = async (acId) => {
    try {
      const res = await adminAPI.getACDetails(acId);
      setSelectedACDetails(res.data.data?.ac || res.data.ac);
      setModalType('view-ac');
      setShowModal(true);
      // Load energy data for this AC
      loadACEnergy(acId);
    } catch (error) {
      toast.error('Failed to load ac details');
    }
  };

  const loadACEnergy = async (acId) => {
    try {
      setEnergyLoading(prev => ({ ...prev, [`ac-${acId}`]: true }));
      console.log(`⚡ Loading energy for AC ${acId}...`);
      const res = await adminAPI.getACEnergy(acId);
      const energy = res.data.data || res.data;
      console.log(`✅ Energy data for AC ${acId}:`, energy);
      setEnergyData(prev => ({
        ...prev,
        acs: {
          ...prev.acs,
          [acId]: energy
        }
      }));
    } catch (error) {
      console.error(`❌ Failed to load AC energy for AC ${acId}:`, error);
      console.error('Error response:', error.response?.data);
    } finally {
      setEnergyLoading(prev => ({ ...prev, [`ac-${acId}`]: false }));
    }
  };

  const loadOrganizationEnergy = async (organizationId) => {
    try {
      setEnergyLoading(prev => ({ ...prev, [`org-${organizationId}`]: true }));
      console.log(`⚡ Loading energy for organization ${organizationId}...`);
      const res = await adminAPI.getOrganizationEnergy(organizationId);
      const energy = res.data.data || res.data;
      console.log(`✅ Energy data for organization ${organizationId}:`, energy);
      setEnergyData(prev => ({
        ...prev,
        organizations: {
          ...prev.organizations,
          [organizationId]: energy
        }
      }));
    } catch (error) {
      console.error(`❌ Failed to load organization energy for org ${organizationId}:`, error);
      console.error('Error response:', error.response?.data);
    } finally {
      setEnergyLoading(prev => ({ ...prev, [`org-${organizationId}`]: false }));
    }
  };

  const handleViewOrganizationDetails = async (orgId) => {
    try {
      console.log('🔍 [VIEW ORG] Starting to fetch organization details for ID:', orgId);
      console.log('🔍 [VIEW ORG] Cookies before request:', document.cookie);
      console.log('🔍 [VIEW ORG] localStorage before request:', {
        user: localStorage.getItem('user'),
        role: localStorage.getItem('role'),
        sessionId: localStorage.getItem('sessionId')
      });
      
      const res = await adminAPI.getOrganizationDetails(orgId);
      
      console.log('✅ [VIEW ORG] Successfully loaded organization details:', res.data);
      setSelectedOrgDetails(res.data.data?.organization || res.data.organization);
      setModalType('view-organization');
      setShowModal(true);
      // Load energy data for this organization
      loadOrganizationEnergy(orgId);
    } catch (error) {
      console.error('❌ [VIEW ORG] Error loading organization details:');
      console.error('  Error:', error);
      console.error('  Response status:', error.response?.status);
      console.error('  Response data:', error.response?.data);
      console.error('  Cookies after error:', document.cookie);
      console.error('  localStorage after error:', {
        user: localStorage.getItem('user'),
        role: localStorage.getItem('role'),
        sessionId: localStorage.getItem('sessionId')
      });
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load organization details';
      toast.error(errorMessage);
    }
  };

  const handleViewVenueDetails = async (venueId) => {
    try {
      const res = await adminAPI.getVenueDetails(venueId);
      setSelectedVenueDetails(res.data.data?.venue || res.data.venue);
      setModalType('view-venue');
      setShowModal(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load venue details');
    }
  };

  const openModal = (type) => {
    setModalType(type);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setSelectedOrgDetails(null);
    setSelectedVenueDetails(null);
    setSelectedEvent(null);
    setSelectedACDetails(null);
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'alerts', label: 'Alerts', icon: AlertCircle, count: alerts.length, badge: alerts.length > 0 ? 'red' : null },
    { id: 'events', label: 'Events', icon: Calendar, count: Array.isArray(data.events) ? data.events.length : 0 },
    { id: 'managers', label: 'Managers', icon: Users, count: data.managers.length },
    { id: 'organizations', label: 'Organizations', icon: Building, count: data.organizations.length },
    { id: 'venues', label: 'Venues', icon: Building, count: data.venues.length },
    { id: 'acs', label: 'AC Devices', icon: Thermometer, count: data.acs.length },
    { id: 'energy', label: 'Energy Consumption', icon: Zap },
    { id: 'logs', label: 'Activity Logs', icon: Activity, count: data.logs.length }
  ];

  const DashboardView = () => {
    // Show loading spinner during initial load
    if (initialLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px] w-full">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
        </div>
      );
    }
    
    return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 w-full px-2 sm:px-0">
      {/* Statistics Cards - Ultra Enhanced */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full">
        <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 text-white transform hover:scale-105 hover:shadow-blue-500/50 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white opacity-10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-white opacity-5 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-blue-100 text-xs sm:text-sm font-semibold mb-1 sm:mb-2 uppercase tracking-wide">Total Managers</p>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-1 drop-shadow-lg">{data.managers.length}</p>
              <p className="text-blue-100 text-xs font-medium flex items-center">
                <span className="w-2 h-2 bg-blue-300 rounded-full mr-2 animate-pulse"></span>
                <span className="hidden sm:inline">Active users</span>
                <span className="sm:hidden">Active</span>
              </p>
            </div>
            <div className="bg-white bg-opacity-25 rounded-xl sm:rounded-2xl p-2 sm:p-3 lg:p-4 transform group-hover:rotate-12 transition-transform duration-300 shadow-xl ml-2 flex-shrink-0">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" />
            </div>
          </div>
        </div>
        
        <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 text-white transform hover:scale-105 hover:shadow-blue-500/50 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white opacity-10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-white opacity-5 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-blue-100 text-xs sm:text-sm font-semibold mb-1 sm:mb-2 uppercase tracking-wide">Organizations</p>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-1 drop-shadow-lg">{data.organizations.length}</p>
              <p className="text-blue-100 text-xs font-medium flex items-center">
                <span className="w-2 h-2 bg-blue-300 rounded-full mr-2 animate-pulse"></span>
                <span className="hidden sm:inline">Total organizations</span>
                <span className="sm:hidden">Total</span>
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
              <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-1 drop-shadow-lg">{data.venues.length}</p>
              <p className="text-blue-100 text-xs font-medium flex items-center">
                <span className="w-2 h-2 bg-blue-300 rounded-full mr-2 animate-pulse"></span>
                <span className="hidden sm:inline">Active venues</span>
                <span className="sm:hidden">Active</span>
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
              <p className="text-blue-100 text-xs sm:text-sm font-semibold mb-1 sm:mb-2 uppercase tracking-wide">AC Devices</p>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-1 drop-shadow-lg">{data.acs.length}</p>
              <p className="text-blue-100 text-xs font-medium flex items-center">
                <span className="w-2 h-2 bg-blue-300 rounded-full mr-2 animate-pulse"></span>
                <span className="hidden sm:inline">Connected devices</span>
                <span className="sm:hidden">Connected</span>
              </p>
            </div>
            <div className="bg-white bg-opacity-25 rounded-xl sm:rounded-2xl p-2 sm:p-3 lg:p-4 transform group-hover:rotate-12 transition-transform duration-300 shadow-xl ml-2 flex-shrink-0">
              <Thermometer className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" />
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
            {alerts.map((alert, idx) => (
              <div key={idx} className="bg-white rounded-xl p-5 border-2 border-blue-200 shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 hover:border-blue-400">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <span className="font-semibold text-gray-900">{alert.acName}</span>
                      <span className="text-xs text-gray-500">({alert.brand} {alert.model})</span>
                      {alert.venueName && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                          Venue: {alert.venueName}
                        </span>
                      )}
                      {alert.organizationName && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                          Org: {alert.organizationName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                      <span>Serial: {alert.serialNumber}</span>
                      <span>AC Temp: {alert.temperature}°C</span>
                      {alert.roomTemperature && (
                        <span className="text-blue-600 font-medium">
                          Room: {alert.roomTemperature.toFixed(1)}°C
                        </span>
                      )}
                      <span className={alert.isOn ? 'text-blue-600 font-medium' : 'text-gray-500'}>
                        Power: {alert.isOn ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    
                    {alert.issue && (
                      <div className="space-y-2">
                        <div className="flex items-start space-x-2 text-sm text-blue-700">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                          <span className="font-medium">{alert.issue}</span>
                        </div>
                        {alert.roomTempHistory && (
                          <div className="flex items-center space-x-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            <span>Hour 0: {alert.roomTempHistory.hour0?.toFixed(1)}°C</span>
                            <span>→</span>
                            <span>Hour 1: {alert.roomTempHistory.hour1?.toFixed(1)}°C</span>
                            <span>→</span>
                            <span className="font-bold text-blue-600">Hour 2: {alert.roomTempHistory.hour2?.toFixed(1)}°C</span>
                            {alert.roomTempHistory.mean && (
                              <>
                                <span>|</span>
                                <span className="font-bold text-blue-600">Mean: {alert.roomTempHistory.mean.toFixed(1)}°C</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {alert.issues && alert.issues.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {alert.issues.map((issue, issueIdx) => (
                          <div key={issueIdx} className={`flex items-start space-x-2 text-sm ${
                            issue.severity === 'high' ? 'text-blue-700' : 'text-blue-600'
                          }`}>
                            <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                              issue.severity === 'high' ? 'text-blue-600' : 'text-blue-500'
                            }`} />
                            <span>{issue.message || issue}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {alert.alertAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        Alert triggered: {new Date(alert.alertAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
              <span className="text-2xl font-extrabold text-blue-600">
                {data.acs.filter(ac => ac.isOn === true || ac.isOn === 'true' || ac.isOn === 1).length}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl shadow-sm">
              <span className="text-sm font-semibold text-gray-700">Powered OFF</span>
              <span className="text-2xl font-extrabold text-gray-600">
                {data.acs.filter(ac => !(ac.isOn === true || ac.isOn === 'true' || ac.isOn === 1)).length}
              </span>
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
                        {event.organizationName || 'N/A'}
                      </p>
                    </div>
                    <span className={`text-xs px-3 py-1.5 rounded-full font-semibold shadow-sm ${
                      event.status === 'active' ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white' : 
                      event.status === 'paused' ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white' : 
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
              <span className="text-sm font-semibold text-gray-700">Active Managers</span>
              <span className="text-2xl font-extrabold text-blue-600">
                {data.managers.filter(m => m.status === 'unlocked').length}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-50 rounded-xl shadow-sm border border-blue-200">
              <span className="text-sm font-semibold text-gray-700">Total Venues</span>
              <span className="text-2xl font-extrabold text-blue-600">{data.venues.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
              <span className="text-sm font-semibold text-gray-700">Activity Logs</span>
              <span className="text-2xl font-extrabold text-gray-900">{data.logs.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity & Quick Actions - Ultra Enhanced */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full">
        {/* Recent Activity Logs */}
        <div className="group bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl p-6 border-2 border-blue-100 hover:border-blue-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-3 shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                <Activity className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
                <p className="text-sm text-gray-500 font-medium">Latest system logs</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('logs')}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
            >
              View All
            </button>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
            {Array.isArray(data.logs) && data.logs.length > 0 ? (
              data.logs.slice(0, 5).map((log, idx) => {
                const logType = log.action?.includes('create') || log.action?.includes('add') ? 'create' :
                               log.action?.includes('delete') || log.action?.includes('remove') ? 'delete' :
                               log.action?.includes('update') || log.action?.includes('edit') ? 'update' : 'default';
                const colors = {
                  create: 'from-blue-400 to-blue-600',
                  delete: 'from-blue-400 to-blue-600',
                  update: 'from-blue-400 to-blue-600',
                  default: 'from-gray-400 to-gray-600'
                };
                return (
                  <div key={idx} className="flex items-start space-x-4 p-4 bg-white rounded-xl hover:shadow-lg transition-all border border-gray-100 hover:border-blue-200 transform hover:-translate-x-1">
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${colors[logType]} shadow-md`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {log.action || log.message || 'Activity'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1.5 font-medium">
                        {log.userName || log.user || 'System'} • {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recently'}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 font-medium">No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="group bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl p-6 border-2 border-blue-100 hover:border-blue-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-3 shadow-lg transform group-hover:scale-110 transition-transform duration-300">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Quick Actions</h3>
              <p className="text-sm text-gray-500 font-medium">Common tasks</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => openModal('manager')}
              className="group/btn flex flex-col items-center justify-center p-5 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl transition-all border-2 border-blue-200 hover:border-blue-400 shadow-md hover:shadow-xl transform hover:scale-105"
            >
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 mb-3 shadow-lg transform group-hover/btn:rotate-12 transition-transform duration-300">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-bold text-blue-900">Add Manager</span>
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className="group/btn flex flex-col items-center justify-center p-5 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl transition-all border-2 border-blue-200 hover:border-blue-400 shadow-md hover:shadow-xl transform hover:scale-105"
            >
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 mb-3 shadow-lg transform group-hover/btn:rotate-12 transition-transform duration-300">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-bold text-blue-900">View Alerts</span>
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className="group/btn flex flex-col items-center justify-center p-5 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl transition-all border-2 border-blue-200 hover:border-blue-400 shadow-md hover:shadow-xl transform hover:scale-105"
            >
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 mb-3 shadow-lg transform group-hover/btn:rotate-12 transition-transform duration-300">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-bold text-blue-900">Events</span>
            </button>
            <button
              onClick={() => setActiveTab('energy')}
              className="group/btn flex flex-col items-center justify-center p-5 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl transition-all border-2 border-blue-200 hover:border-blue-400 shadow-md hover:shadow-xl transform hover:scale-105"
            >
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 mb-3 shadow-lg transform group-hover/btn:rotate-12 transition-transform duration-300">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-bold text-blue-900">Energy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const ManagerCard = ({ manager }) => {
    // Get all organizations (don't filter by status, show all assigned)
    const assignedOrgs = manager.organizations || [];
    const activeOrgs = assignedOrgs.filter(org => org.status === 'active' || !org.status);
    const hasOrganizations = assignedOrgs.length > 0;
    
    // Debug logging
    if (hasOrganizations) {
      console.log(`📋 Manager "${manager.name}" organizations:`, assignedOrgs.map(o => ({ id: o.id, name: o.name, status: o.status })));
    }

    return (
    <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-200 hover:border-blue-400 hover:shadow-2xl transition-all duration-300 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 px-6 py-4">
        <div className="flex items-start space-x-4">
          <div className="bg-white bg-opacity-20 rounded-full p-3 flex-shrink-0">
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-white break-words">{manager.name}</h3>
            <p className="text-sm text-blue-100 break-words mb-2">{manager.email}</p>
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold shadow-md whitespace-nowrap ${
                manager.status === 'unlocked' 
                  ? 'bg-white text-blue-600' 
                  : manager.status === 'locked'
                  ? 'bg-white text-blue-600'
                  : 'bg-white text-blue-600'
              }`}>
                {manager.status === 'unlocked' && <Unlock className="w-3 h-3 mr-1" />}
                {manager.status === 'locked' && <Lock className="w-3 h-3 mr-1" />}
                {manager.status === 'restricted' && <Settings className="w-3 h-3 mr-1" />}
                {manager.status || 'unlocked'}
              </span>
              {hasOrganizations && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-white text-blue-600 shadow-md whitespace-nowrap">
                  <Building className="w-3.5 h-3.5 mr-1" />
                  {assignedOrgs.length} Org{assignedOrgs.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
          </div>
          
      <div className="p-6">
        {/* Assigned Organizations Section - Enhanced */}
        {hasOrganizations ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-2 shadow-md">
                  <Building className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Assigned Organizations</h4>
                  <p className="text-sm text-gray-600">{assignedOrgs.length} Organization{assignedOrgs.length !== 1 ? 's' : ''} Assigned</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {assignedOrgs.map(org => (
                <div key={org.id} className="flex items-center justify-between group bg-gradient-to-r from-blue-50 to-white rounded-xl p-4 hover:from-blue-100 hover:to-blue-50 transition-all border-2 border-blue-200 hover:border-blue-400 shadow-sm hover:shadow-lg">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="bg-blue-600 rounded-lg p-2 flex-shrink-0 shadow-md">
                      <Building className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-gray-900 truncate">{org.name || 'Unnamed Organization'}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          org.status === 'active' || !org.status
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {org.status || 'active'}
                      </span>
                        {org.temperature && (
                          <span className="text-xs text-gray-500">Temp: {org.temperature}°C</span>
                        )}
                      </div>
                    </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to unassign ${manager.name} from ${org.name}?`)) {
                          handleUnassignOrganization(org.id);
                        }
                      }}
                    className="ml-3 p-2 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition-all border border-blue-300 hover:border-blue-600 flex-shrink-0 shadow-sm hover:shadow-md"
                      title="Unassign Organization"
                    >
                    <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
        ) : (
          <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
            <Building className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-base font-semibold text-gray-700 mb-1">No Organizations Assigned</p>
            <p className="text-sm text-gray-500">Click "Assign Org" button to assign organizations</p>
        </div>
        )}
        
        {/* Action Buttons */}
        <div className="mt-6 pt-6 border-t border-gray-200 flex flex-wrap gap-2">
          <button
            onClick={() => openModal(`assign-manager-${manager.id}`)}
            className="flex-1 flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg font-medium text-sm"
            title="Assign Organizations"
          >
            <Users className="w-4 h-4 mr-2" />
            Assign Organizations
          </button>
          
            {manager.status === 'locked' ? (
              <>
                <button
                  onClick={() => handleUnlockManager(manager.id)}
                  disabled={managerActionLoading[manager.id]}
                  className={`flex-1 flex items-center justify-center px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md hover:shadow-lg font-medium text-sm ${
                    managerActionLoading[manager.id] ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title="Full Unlock"
                >
                  {managerActionLoading[manager.id] ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Unlocking...
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4 mr-2" />
                      Unlock
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleRestrictedUnlockManager(manager.id)}
                  disabled={managerActionLoading[manager.id]}
                  className={`flex-1 flex items-center justify-center px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md hover:shadow-lg font-medium text-sm ${
                    managerActionLoading[manager.id] ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title="Restricted Unlock"
                >
                  {managerActionLoading[manager.id] ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Unlocking...
                    </>
                  ) : (
                    <>
                      <Settings className="w-4 h-4 mr-2" />
                      Restricted
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={() => handleLockManager(manager.id, 'Locked by Admin')}
              className="flex-1 flex items-center justify-center px-4 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all shadow-md hover:shadow-lg font-medium text-sm"
                title="Lock Manager"
              >
              <Lock className="w-4 h-4 mr-2" />
                Lock
              </button>
            )}
        </div>
      </div>
    </div>
  );
};

  const OrganizationCard = ({ org }) => {
    // Get venues under this organization and their ACs
    const orgVenues = Array.isArray(data.venues) ? data.venues.filter(v => v.organizationId === org.id) : [];
    const orgVenueIds = orgVenues.map(v => v.id);
    const orgDeviceIds = Array.isArray(data.acs) ? data.acs.filter(ac => ac.venueId && orgVenueIds.includes(ac.venueId)).map(ac => ac.id) : [];
    
    // Get device-level alerts for this organization (all alerts are device-level now)
    const orgDeviceAlertsFromAPI = Array.isArray(allAlerts) ? allAlerts.filter(alert => {
      // All alerts are device-level, just check if acId matches
      return alert.acId && orgDeviceIds.includes(alert.acId);
    }) : [];
    
    // Also check ACs directly for alert status (isWorking: false or alertAt set)
    const orgACsWithAlerts = Array.isArray(data.acs) ? data.acs.filter(ac => 
      orgDeviceIds.includes(ac.id) && ((ac.isWorking === false && ac.isWorking !== null) || ac.alertAt)
    ) : [];
    
    // Combine API alerts and direct AC alerts
    const orgDeviceAlerts = [...orgDeviceAlertsFromAPI];
    orgACsWithAlerts.forEach(ac => {
      // Check if alert already exists in API alerts
      const exists = orgDeviceAlerts.find(a => a.acId === ac.id);
      if (!exists) {
        // Create alert object from AC data
        orgDeviceAlerts.push({
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
    
    if (orgDeviceAlerts.length > 0) {
      console.log(`📊 [ORG-${org.id}] Total device alerts:`, orgDeviceAlerts.length, 'Device IDs:', orgDeviceIds);
    } else if (orgDeviceIds.length > 0) {
      console.log(`📊 [ORG-${org.id}] No alerts found. Device IDs:`, orgDeviceIds, 'Total alerts:', allAlerts.length);
    }
    
    // Get device-level events for this organization (events are device-level, shown on venue/org)
    const orgEvents = Array.isArray(data.events) ? data.events.filter(e => 
      e.eventType === 'device' && orgDeviceIds.includes(e.deviceId)
    ) : [];
    const activeEvent = orgEvents.find(e => e.status === 'active');
    const disabledEvent = orgEvents.find(e => e.isDisabled === true);
    const scheduledEvent = orgEvents.find(e => e.status === 'scheduled');
    
    const hasAlert = orgDeviceAlerts.length > 0;
    
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
          <div className="mb-3 pb-3 border-b-2 border-gray-200">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className={`text-base font-extrabold ${hasAlert ? 'text-blue-900' : 'text-gray-900'} truncate mb-1`}>
                  {org.name || 'Unnamed Organization'}
                </h3>
                {org.batchNumber && (
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-medium text-gray-500">Batch:</span>
                    <span className="text-xs font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-md">{org.batchNumber}</span>
                  </div>
                )}
              </div>
              <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-500 rounded-xl p-2 flex-shrink-0 shadow-lg transform hover:scale-110 transition-transform">
                <Building className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          {/* Status Badges - Compact */}
          <div className="flex items-center flex-wrap gap-1 mb-1.5">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
              org.status === 'active' 
                ? 'bg-blue-500 text-white' 
                : 'bg-blue-400 text-white'
            }`}>
              {org.status || 'active'}
            </span>
            {isOrganizationLocked(org) && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-600 text-white">
                <Lock className="w-3 h-3 mr-0.5" />
              </span>
            )}
            {hasAlert && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-600 text-white">
                <AlertCircle className="w-3 h-3 mr-0.5" />
              </span>
            )}
            {orgEvents.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-500 text-white">
                <Calendar className="w-3 h-3 mr-0.5" />
                {orgEvents.length}
              </span>
            )}
            {org.hasMixedTemperatures && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-500 text-white">
                Mixed
              </span>
            )}
          </div>

          {/* Temperature Control - Compact */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-lg p-1.5 mb-1.5 border border-blue-200">
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
                  disabled={isOrganizationLocked(org) || temperatureLoading[`organization-${org.id}`]}
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
                    disabled={isOrganizationLocked(org) || temperatureLoading[`organization-${org.id}`] || (localTemperatures[`organization-${org.id}`] !== undefined ? localTemperatures[`organization-${org.id}`] : (org.temperature ?? 16)) <= 16}
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
                  disabled={isOrganizationLocked(org) || temperatureLoading[`organization-${org.id}`]}
                  className={`w-16 px-1 py-1 text-sm text-center font-bold border rounded bg-white transition-colors ${
                    isOrganizationLocked(org) || temperatureLoading[`organization-${org.id}`]
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
                    disabled={isOrganizationLocked(org) || temperatureLoading[`organization-${org.id}`] || (localTemperatures[`organization-${org.id}`] !== undefined ? localTemperatures[`organization-${org.id}`] : (org.temperature ?? 16)) >= 30}
                  className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold"
                  >
                  <Plus className="w-3 h-3" />
                  </button>
                </div>
            )}
          </div>

          {/* Organization Info - Compact */}
          <div className="bg-gray-50 rounded-lg p-1.5 mb-1.5 border border-gray-200">
            <div className="grid grid-cols-2 gap-1">
            {orgVenues.length > 0 && (
                <div className="flex items-center justify-between bg-white rounded px-1.5 py-1">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-blue-600" />
                    <span className="text-xs font-semibold text-gray-700">Venues</span>
                </div>
                <span className="text-xs font-bold text-gray-900">{orgVenues.length}</span>
              </div>
            )}
            {orgDeviceIds.length > 0 && (
                <div className="flex items-center justify-between bg-white rounded px-1.5 py-1">
                  <div className="flex items-center space-x-1">
                    <Thermometer className="w-3 h-3 text-blue-600" />
                    <span className="text-xs font-semibold text-gray-700">ACs</span>
                </div>
                <span className="text-xs font-bold text-gray-900">{orgDeviceIds.length}</span>
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
                  (org.isVenueOn === true || org.isVenueOn === 'true' || org.isOrganizationOn === true || org.isOrganizationOn === 'true') 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-400 text-white'
                }`}>
                  {(org.isVenueOn === true || org.isVenueOn === 'true' || org.isOrganizationOn === true || org.isOrganizationOn === 'true') ? 'ON' : 'OFF'}
                </span>
                <button
                  onClick={() => handleToggleOrganizationPower(org.id, org.isVenueOn || org.isOrganizationOn || false)}
                  disabled={orgPowerLoading[`org-power-${org.id}`] || isOrganizationLocked(org)}
                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                    (org.isVenueOn === true || org.isVenueOn === 'true' || org.isOrganizationOn === true || org.isOrganizationOn === 'true')
                      ? 'bg-blue-500' 
                      : 'bg-gray-400'
                  }`}
                  title={(org.isVenueOn === true || org.isVenueOn === 'true' || org.isOrganizationOn === true || org.isOrganizationOn === 'true') ? 'Turn Organization OFF' : 'Turn Organization ON'}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      (org.isVenueOn === true || org.isVenueOn === 'true' || org.isOrganizationOn === true || org.isOrganizationOn === 'true') ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons - Compact */}
          <div className="flex gap-1.5 mt-auto">
          <button
            onClick={() => handleViewOrganizationDetails(org.id)}
              className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-md text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors shadow-sm"
              title="View all details, manager info, batch number, and more"
          >
            <Eye className="w-3 h-3" />
              <span>View</span>
          </button>
          <button
            onClick={() => handleDeleteOrganization(org.id, org.name)}
            disabled={loading}
              className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-md text-xs font-bold text-white bg-gray-500 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Trash2 className="w-3 h-3" />
            <span>Delete</span>
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
    
        // Get device-level alerts for this venue (all alerts are device-level now)
        const venueDeviceAlertsFromAPI = Array.isArray(allAlerts) ? allAlerts.filter(alert => {
          // All alerts are device-level, just check if acId matches
          return alert.acId && venueDeviceIds.includes(alert.acId);
        }) : [];
    
    // Also check ACs directly for alert status (isWorking: false or alertAt set)
    const venueACsWithAlerts = venueACs.filter(ac => 
      (ac.isWorking === false && ac.isWorking !== null) || ac.alertAt
    );
    
    // Combine API alerts and direct AC alerts
    const venueDeviceAlerts = [...venueDeviceAlertsFromAPI];
    venueACsWithAlerts.forEach(ac => {
      // Check if alert already exists in API alerts
      const exists = venueDeviceAlerts.find(a => a.acId === ac.id);
      if (!exists) {
        // Create alert object from AC data
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
    
    if (venueDeviceAlerts.length > 0) {
      console.log(`📊 [VENUE-${venue.id}] Total device alerts:`, venueDeviceAlerts.length, 'Device IDs:', venueDeviceIds);
    } else if (venueDeviceIds.length > 0) {
      console.log(`📊 [VENUE-${venue.id}] No alerts found. Device IDs:`, venueDeviceIds, 'Total alerts:', allAlerts.length);
    }
    
    // Get device-level events for this venue (events are device-level, shown on venue/org)
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
                : 'bg-blue-400 text-white'
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
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-500 text-white">
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
          <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-lg p-1.5 mb-1.5 border border-blue-200">
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
                  disabled={temperatureLoading[`venue-${venue.id}`]}
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
                    disabled={temperatureLoading[`venue-${venue.id}`] || (localTemperatures[`venue-${venue.id}`] !== undefined ? localTemperatures[`venue-${venue.id}`] : (venue.temperature ?? 16)) <= 16}
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
                  disabled={temperatureLoading[`venue-${venue.id}`]}
                  className={`w-16 px-1 py-1 text-sm text-center font-bold border rounded bg-white transition-colors ${
                    temperatureLoading[`venue-${venue.id}`]
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
                    disabled={temperatureLoading[`venue-${venue.id}`] || (localTemperatures[`venue-${venue.id}`] !== undefined ? localTemperatures[`venue-${venue.id}`] : (venue.temperature ?? 16)) >= 30}
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
                  disabled={orgPowerLoading[`venue-power-${venue.id}`]}
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
          <button
            onClick={() => handleDeleteVenue(venue.id, venue.name)}
            disabled={loading}
              className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-md text-xs font-bold text-white bg-gray-500 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
              <Trash2 className="w-3 h-3" />
            <span>Delete</span>
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
          <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-lg p-1.5 mb-1.5 border border-blue-200">
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
                disabled={hasEvent || temperatureLoading[`ac-${ac.id}`] || (localTemperatures[`ac-${ac.id}`] !== undefined ? localTemperatures[`ac-${ac.id}`] : (ac.temperature ?? 16)) <= 16}
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
                disabled={hasEvent || temperatureLoading[`ac-${ac.id}`] || isDeviceLocked(ac)}
                className={`w-16 px-1 py-1 text-sm text-center font-bold border rounded bg-white transition-colors ${
                  hasEvent || temperatureLoading[`ac-${ac.id}`] || isDeviceLocked(ac)
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
                disabled={hasEvent || temperatureLoading[`ac-${ac.id}`] || (localTemperatures[`ac-${ac.id}`] !== undefined ? localTemperatures[`ac-${ac.id}`] : (ac.temperature ?? 16)) >= 30}
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
            onClick={() => handleToggleACPower(ac.id, ac.isOn)}
            disabled={acPowerLoading[ac.id] || hasEvent}
                className={`px-2 py-1 rounded text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              ac.isOn
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-blue-400 text-white hover:bg-blue-500'
            }`}
            title={hasEvent ? 'Device has active event. Stop event to control power.' : (ac.isOn ? 'Turn OFF' : 'Turn ON')}
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
                openModal('event');
              }}
              className="flex-1 flex items-center justify-center space-x-0.5 px-1.5 py-1 rounded-md text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors shadow-sm"
              title="Create Event for this device"
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
            className="flex items-center justify-center space-x-0.5 px-1.5 py-1 rounded-md text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm"
            title="Delete this AC device permanently"
          >
            <Trash2 className="w-2.5 h-2.5" />
            <span>Delete</span>
          </button>
          </div>
        </div>
      </div>
    );
  };

  const EventsView = () => {
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
        // Format: "MM/DD/YYYY, HH:MM:SS AM/PM"
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
    const formatTime = (dateString) => {
      if (!dateString) return 'N/A';
      try {
        let date;
        
        if (dateString instanceof Date) {
          date = dateString;
        } else if (typeof dateString === 'string') {
          let dateValue = String(dateString).trim();
          
          // Normalize format
          if (dateValue.includes(' ') && !dateValue.includes('T')) {
            dateValue = dateValue.replace(/\s+/, 'T');
          }
          
          // CRITICAL FIX: Backend returns UTC time strings from Sequelize
          // Sequelize DATE fields are stored as UTC but may be returned without 'Z'
          // Check if it has timezone indicator
          const hasTimezone = dateValue.endsWith('Z') || 
                             dateValue.match(/[+-]\d{2}:?\d{2}$/) ||
                             dateValue.includes('+05:00') ||
                             dateValue.includes('+0500');
          
          // If NO timezone but has ISO format (YYYY-MM-DDTHH:mm:ss), treat as UTC
          // Sequelize returns dates in ISO format but may not include 'Z'
          if (!hasTimezone && dateValue.includes('T')) {
            // Remove milliseconds if present for cleaner parsing
            dateValue = dateValue.replace(/\.\d{3}$/, '');
            // CRITICAL: Ensure it ends with 'Z' to force UTC parsing
            // Without 'Z', JavaScript may interpret as local time, causing 5-hour offset
            if (!dateValue.endsWith('Z')) {
              dateValue = dateValue + 'Z';
            }
          }
          
          date = new Date(dateValue);
          
          if (isNaN(date.getTime())) {
            console.error('❌ Invalid date string:', dateString);
            return 'N/A';
          }
        } else {
          return 'N/A';
        }
        
        if (isNaN(date.getTime())) {
          return 'N/A';
        }
        
        // CRITICAL: Verify the date is actually in UTC
        // Get UTC hours to verify
        const utcHours = date.getUTCHours();
        const utcMinutes = date.getUTCMinutes();
        
        // Convert UTC to Pakistan/Karachi time - TIME ONLY
        // Use 24-hour format first to avoid AM/PM confusion, then convert to 12-hour
        const timeFormatter24 = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Karachi',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false // Get 24-hour format first
        });
        
        const pktTime24 = timeFormatter24.format(date);
        const [pktHour24, pktMinute] = pktTime24.split(':').map(Number);
        
        // Expected PKT time: UTC + 5 hours
        const expectedPKTHour = (utcHours + 5) % 24;
        
        // Debug log to verify conversion
        console.log('🕐 formatTime conversion:', {
          original: dateString,
          normalized: dateValue,
          utcTime: `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')} UTC`,
          pktTime: `${String(pktHour24).padStart(2, '0')}:${String(pktMinute).padStart(2, '0')} PKT`,
          expectedPKT: `${String(expectedPKTHour).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')} PKT`,
          match: pktHour24 === expectedPKTHour ? '✅ CORRECT' : '❌ MISMATCH'
        });
        
        // Convert to 12-hour format with AM/PM
        const pktHour12 = pktHour24 === 0 ? 12 : (pktHour24 > 12 ? pktHour24 - 12 : pktHour24);
        const ampm = pktHour24 >= 12 ? 'PM' : 'AM';
        const pktTime = `${String(pktHour12).padStart(2, '0')}:${String(pktMinute).padStart(2, '0')} ${ampm}`;
        
        return pktTime;
      } catch (e) {
        console.error('❌ Time formatting error:', e, dateString);
        return 'N/A';
      }
    };

    const getStatusBadge = (status, isDisabled, startTime, endTime) => {
      if (isDisabled) {
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-500 text-white">Disabled</span>;
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
          color: 'bg-blue-500 text-white',
          text: 'In Process'
        },
        completed: {
          color: 'bg-gray-500 text-white',
          text: 'Complete'
        },
        stopped: {
          color: 'bg-blue-500 text-white',
          text: 'Stopped'
        },
        cancelled: {
          color: 'bg-gray-500 text-white',
          text: 'Cancelled'
        }
      };
      
      const config = statusConfig[actualStatus] || { 
        color: 'bg-gray-100 text-gray-800', 
        text: (status && typeof status === 'string' && status.length > 0) 
          ? status.charAt(0).toUpperCase() + status.slice(1) 
          : 'Unknown' 
      };
      
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
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
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0">
        {/* Header Section - Ultra Enhanced */}
        <div className="group relative bg-gradient-to-br from-blue-500 via-cyan-600 to-blue-700 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 border-2 border-blue-400 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 bg-white opacity-10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 lg:-mr-20 lg:-mt-20"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-white opacity-5 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12 lg:-ml-16 lg:-mb-16"></div>
          <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 lg:gap-6">
            <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-5 flex-1 min-w-0">
              <div className="bg-white bg-opacity-25 rounded-lg sm:rounded-xl lg:rounded-2xl p-2 sm:p-3 lg:p-4 shadow-xl transform group-hover:rotate-12 transition-transform duration-300 flex-shrink-0">
                <Calendar className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white mb-1 sm:mb-2 drop-shadow-lg truncate">Events</h2>
                <p className="text-blue-100 text-xs sm:text-sm lg:text-base font-medium mb-2 sm:mb-3">Schedule and manage AC control events</p>
                <span className="inline-block bg-white bg-opacity-25 text-white px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-lg backdrop-blur-sm">
                  {Array.isArray(data.events) ? data.events.length : 0} Total Event{(Array.isArray(data.events) ? data.events.length : 0) !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 lg:space-x-3 w-full sm:w-auto">
              <button
                onClick={() => {
                  setSelectedEvent(null);
                  openModal('event');
                }}
                className="flex items-center justify-center px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 bg-white text-blue-600 rounded-lg sm:rounded-xl hover:bg-blue-50 font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 text-sm sm:text-base"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 mr-2" />
                Create Event
              </button>
              <button
                onClick={loadEvents}
                disabled={eventsLoading}
                className="flex items-center justify-center px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 bg-white bg-opacity-20 text-white rounded-lg sm:rounded-xl hover:bg-opacity-30 disabled:opacity-50 font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 backdrop-blur-sm text-sm sm:text-base"
              >
                <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 mr-2 ${eventsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {!Array.isArray(data.events) || data.events.length === 0 ? (
          <div className="bg-gradient-to-br from-white to-blue-50 p-16 rounded-2xl shadow-2xl text-center border-2 border-blue-200">
            <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center shadow-lg">
              <Calendar className="w-12 h-12 text-blue-600" />
            </div>
            <p className="text-gray-800 text-2xl font-bold mb-3">No Events Found</p>
            <p className="text-gray-600 text-base mb-6 font-medium">
              {data.events ? `Events array exists but is empty (${data.events.length} items)` : 'Events array is not initialized'}
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => {
                  setSelectedEvent(null);
                  openModal('event');
                }}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Event
              </button>
              <button
                onClick={loadEvents}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Reload Events
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(data.events) && data.events.map((event, index) => {
              if (!event) {
                console.warn(`Event at index ${index} is null/undefined`);
                return null;
              }
              const eventId = event.id || event.eventId;
              if (!eventId) {
                console.warn(`Event at index ${index} has no id:`, event);
                return null;
              }
              const isLoading = eventActionLoading[eventId];
              const canStart = event.status === 'scheduled' && !event.isDisabled;
              const canStop = (event.status === 'active' || event.status === 'unknown') && !event.isDisabled;
              const canDisable = (event.status === 'active' || event.status === 'scheduled' || event.status === 'unknown') && !event.isDisabled;
              const canEnable = event.isDisabled;
              const canEdit = !event.isDisabled && event.status !== 'active';
              const canDelete = event.status !== 'active';

              return (
                <div key={eventId} className={`bg-white rounded-2xl shadow-xl border-2 ${event.isDisabled ? 'border-blue-400' : 'border-gray-200'} hover:shadow-2xl hover:border-blue-400 hover:-translate-y-1 transition-all duration-300 overflow-hidden aspect-square flex flex-col`}>
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
                        {event.createdBy === 'admin' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-500 text-white">
                          Admin
                          </span>
                        )}
                        {event.createdBy === 'manager' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-green-500 text-white">
                          Manager
                          </span>
                        )}
                        {event.createdBy === 'manager' && event.manager && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-green-400 text-white" title={`Created by: ${event.manager.name || event.manager.email || 'Manager'}`}>
                          {event.manager.name || 'Manager'}
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
                            {(Array.isArray(data.acs) ? data.acs.find(ac => ac.id === event.deviceId)?.name : null) || `#${event.deviceId}`}
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
                    <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-lg p-1.5 mb-1.5 border border-blue-200">
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
                            <div className="text-xs font-bold text-gray-900 truncate" title={formatDateTime(event.startTime)}>
                              {formatTime(event.startTime)}
                          </div>
                      </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-700">End</div>
                            <div className="text-xs font-bold text-gray-900 truncate" title={formatDateTime(event.endTime)}>
                              {formatTime(event.endTime)}
                        </div>
                          </div>
                          </div>
                        )}
                      </div>

                    {/* Action Buttons - Compact */}
                    <div className="flex gap-1.5 mt-auto">
                      {canStart && (
                        <button
                          onClick={() => handleEventAction(eventId, 'start')}
                          disabled={!!isLoading}
                          className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-md text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                          title="Start event"
                        >
                          <Play className="w-3 h-3" />
                          <span>Start</span>
                        </button>
                      )}
                      {canStop && (
                        <button
                          onClick={() => handleEventAction(eventId, 'stop')}
                          disabled={!!isLoading}
                          className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-md text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                          title="Stop event"
                        >
                          <Square className="w-3 h-3" />
                          <span>Stop</span>
                        </button>
                      )}
                      {canDisable && (
                        <button
                          onClick={() => handleEventAction(eventId, 'disable')}
                          disabled={!!isLoading}
                          className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-md text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                          title="Disable event"
                        >
                          <Pause className="w-3 h-3" />
                          <span>Pause</span>
                        </button>
                      )}
                      {canEnable && (
                        <button
                          onClick={() => handleEventAction(eventId, 'enable')}
                          disabled={!!isLoading}
                          className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-md text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                          title="Enable event"
                        >
                          <PlayCircle className="w-3 h-3" />
                          <span>Resume</span>
                        </button>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => {
                            setSelectedEvent({...event, id: eventId});
                            openModal('event');
                          }}
                          disabled={!!isLoading}
                          className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-md text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                          title="Edit event"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleEventAction(eventId, 'delete')}
                          disabled={!!isLoading}
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

  const LogCard = ({ log }) => {
    // Format event update changes for display
    const formatEventChanges = (details) => {
      if (!details || !details.changes || Object.keys(details.changes).length === 0) {
        return null;
      }
      
      const changeItems = Object.entries(details.changes).map(([field, change]) => {
        if (field === 'startTime' || field === 'endTime') {
          const oldTime = change.old ? new Date(change.old).toLocaleString() : 'N/A';
          const newTime = change.new ? new Date(change.new).toLocaleString() : 'N/A';
          return (
            <div key={field} className="text-xs mt-1">
              <span className="font-medium">{field}:</span> {oldTime} → {newTime}
            </div>
          );
        } else if (field === 'temperature') {
          return (
            <div key={field} className="text-xs mt-1">
              <span className="font-medium">{field}:</span> {change.old ?? 'N/A'}°C → {change.new ?? 'N/A'}°C
            </div>
          );
        } else if (field === 'powerOn') {
          return (
            <div key={field} className="text-xs mt-1">
              <span className="font-medium">{field}:</span> {change.old ? 'ON' : 'OFF'} → {change.new ? 'ON' : 'OFF'}
            </div>
          );
        } else {
          return (
            <div key={field} className="text-xs mt-1">
              <span className="font-medium">{field}:</span> "{change.old}" → "{change.new}"
            </div>
          );
        }
      });
      
      return (
        <div className="mt-2 p-2 bg-blue-50 rounded border-l-2 border-blue-400">
          <div className="text-xs font-semibold text-blue-800 mb-1">Changes:</div>
          {changeItems}
        </div>
      );
    };

    let details = log.details;
    if (typeof details === 'string') {
      try {
        details = JSON.parse(details);
      } catch (e) {
        // If parsing fails, keep as string
      }
    }
    const eventChanges = log.action === 'UPDATE_EVENT' ? formatEventChanges(details) : null;

    return (
      <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg p-6 border border-blue-100 hover:shadow-xl transition-all duration-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-full p-2 flex-shrink-0">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">{log.action}</h3>
            </div>
            {details?.eventName && (
              <p className="text-sm font-medium text-gray-700 mt-1">
                Event: {details.eventName}
              </p>
            )}
            {details?.message && (
              <p className="text-sm text-gray-600 mt-1">{details.message}</p>
            )}
            {eventChanges}
            {!eventChanges && (
              <p className="text-sm text-gray-600 mt-1">
                {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              {new Date(log.createdAt).toLocaleString()}
            </p>
            {log.admin && (
              <p className="text-xs text-blue-600 mt-1">
                By: {log.admin.name}
              </p>
            )}
          </div>
          <div className="flex items-center ml-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              log.targetType === 'admin'
                ? 'bg-blue-100 text-blue-800' 
                : log.targetType === 'manager'
                ? 'bg-blue-100 text-blue-800'
                : log.targetType === 'organization'
                ? 'bg-blue-100 text-blue-800'
                : log.targetType === 'ac'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {log.targetType}
            </span>
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

    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'events':
        return <EventsView />;
      case 'alerts':
        return (
          <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0">
            {/* Header Section - Ultra Enhanced */}
            <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 border-2 border-blue-400 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 bg-white opacity-10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 lg:-mr-20 lg:-mt-20"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-white opacity-5 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12 lg:-ml-16 lg:-mb-16"></div>
              <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 lg:gap-6">
                <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-5 flex-1 min-w-0">
                  <div className="bg-white bg-opacity-25 rounded-lg sm:rounded-xl lg:rounded-2xl p-2 sm:p-3 lg:p-4 shadow-xl transform group-hover:rotate-12 transition-transform duration-300 animate-pulse flex-shrink-0">
                    <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white mb-1 sm:mb-2 drop-shadow-lg truncate">Device Alerts</h2>
                    <p className="text-blue-100 text-xs sm:text-sm lg:text-base font-medium mb-2 sm:mb-3">Monitor and manage system alerts</p>
                    {alerts.length > 0 && (
                      <span className="inline-block bg-white bg-opacity-25 text-white px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-lg backdrop-blur-sm animate-pulse">
                        {alerts.length} Active Alert{alerts.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleCheckAlerts}
                  disabled={alertsLoading}
                  className="w-full sm:w-auto flex items-center justify-center px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 bg-white text-blue-600 rounded-lg sm:rounded-xl hover:bg-blue-50 disabled:opacity-50 font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 text-sm sm:text-base"
                >
                  <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 mr-2 ${alertsLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Check Alerts Now</span>
                  <span className="sm:hidden">Check Now</span>
                </button>
              </div>
            </div>
            
            {alertsLoading && alerts.length === 0 ? (
              <div className="flex items-center justify-center h-64 bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-2xl border-2 border-blue-200">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-700 font-semibold text-lg">Checking for alerts...</p>
                </div>
              </div>
            ) : alerts.length === 0 ? (
              <div className="bg-gradient-to-br from-blue-50 to-blue-50 p-16 rounded-2xl shadow-2xl text-center border-2 border-blue-300">
                <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center shadow-lg">
                  <AlertCircle className="w-12 h-12 text-white" />
                </div>
                <p className="text-gray-800 text-2xl font-extrabold mb-3">No Active Alerts</p>
                <p className="text-gray-600 text-base font-medium">All devices are operating normally. System is healthy!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert, idx) => (
                  <div key={idx} className={`bg-white rounded-2xl shadow-xl border-l-4 p-6 hover:shadow-2xl transition-all transform hover:-translate-y-1 ${
                    alert.alertType === 'organization' ? 'border-blue-500' : 'border-blue-500'
                  }`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <AlertCircle className={`w-6 h-6 flex-shrink-0 ${
                            alert.alertType === 'organization' ? 'text-blue-600' : 'text-blue-600'
                          }`} />
                          <div>
                            {alert.alertType === 'organization' ? (
                              <>
                                <h3 className="text-lg font-semibold text-gray-900">{alert.organizationName}</h3>
                                <p className="text-sm text-gray-600">Organization Alert</p>
                              </>
                            ) : (
                              <>
                                <h3 className="text-lg font-semibold text-gray-900">{alert.acName}</h3>
                                <p className="text-sm text-gray-600">{alert.brand} {alert.model}</p>
                              </>
                            )}
                          </div>
                          {alert.alertType !== 'organization' && (
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                              {alert.organizationName}
                            </span>
                          )}
                          {alert.alertType === 'organization' && (
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                              Organization
                            </span>
                          )}
                        </div>
                        
                        {/* Organization Alert Display */}
                        {alert.alertType === 'organization' ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Organization Temperature</p>
                              <p className={`text-sm font-medium ${
                                alert.temperature < 16 || alert.temperature > 30 ? 'text-blue-600' : 'text-gray-900'
                              }`}>
                                {alert.temperature}°C
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Total Devices</p>
                              <p className="text-sm font-medium text-gray-900">{alert.deviceCount || 0}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Devices ON</p>
                              <p className="text-sm font-medium text-blue-600">{alert.devicesOn || 0}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Devices OFF</p>
                              <p className="text-sm font-medium text-gray-600">{alert.devicesOff || 0}</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Device Alert - Show clear message that this is only for this device */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                              <div className="flex items-start space-x-2">
                                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-blue-900 mb-1">
                                    ⚠️ Device-Specific Alert
                                  </p>
                                  <p className="text-xs text-blue-700">
                                    This alert is only for <strong>{alert.acName}</strong>. The organization <strong>{alert.organizationName}</strong> is still operating normally. Other devices in this organization are working fine.
                                  </p>
                                </div>
                              </div>
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
                                <p className={`text-sm font-medium ${alert.isOn ? 'text-blue-600' : 'text-gray-500'}`}>
                                  {alert.isOn ? 'ON' : 'OFF'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Device Status</p>
                                <p className={`text-sm font-medium ${alert.isWorking === false ? 'text-blue-600' : 'text-blue-600'}`}>
                                  {alert.isWorking === false ? 'Not Working' : 'Working'}
                                </p>
                              </div>
                            </div>
                            
                            {/* Room Temperature Alert Display */}
                            {alert.issue && alert.issue.includes("Room temperature") && alert.roomTempHistory ? (
                          <div className="bg-blue-50 rounded-lg p-4 mb-3">
                            <div className="flex items-start space-x-2 mb-3">
                              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-blue-900 mb-1">
                                  {alert.issue}
                                </p>
                                <span className="text-xs px-2 py-0.5 rounded bg-blue-200 text-blue-800">
                                  High Priority
                                </span>
                              </div>
                            </div>
                            
                            {/* Room Temperature History Visualization */}
                            <div className="mt-4">
                              <p className="text-xs font-medium text-gray-700 mb-3">3-Hour Room Temperature Pattern:</p>
                              <div className="grid grid-cols-4 gap-3">
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
                                <div className="bg-blue-50 rounded-lg p-3 border border-blue-300">
                                  <p className="text-xs text-gray-500 mb-1">Hour 2 (Current)</p>
                                  <p className="text-lg font-bold text-blue-600">
                                    {alert.roomTempHistory.hour2?.toFixed(1) || 'N/A'}°C
                                  </p>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-3 border border-blue-300">
                                  <p className="text-xs text-gray-500 mb-1">Mean (Average)</p>
                                  <p className="text-lg font-bold text-blue-600">
                                    {alert.roomTempHistory.mean?.toFixed(1) || 
                                      ((alert.roomTempHistory.hour0 + alert.roomTempHistory.hour1 + alert.roomTempHistory.hour2) / 3).toFixed(1)}°C
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
                                              ? 'bg-blue-200 text-blue-700'
                                              : isDecreasing
                                              ? 'bg-blue-200 text-blue-700'
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
                                <div className="mt-3 pt-3 border-t border-blue-200">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-600">Current Room Temperature:</span>
                                    <span className="text-sm font-bold text-blue-700">
                                      {alert.roomTemperature.toFixed(1)}°C
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                            ) : (
                              /* Legacy Issues Display (for backward compatibility) */
                              <div className="bg-blue-50 rounded-lg p-4 mb-3">
                                <p className="text-sm font-semibold text-blue-900 mb-2">Issues Detected:</p>
                                <div className="space-y-2">
                                  {alert.issues && alert.issues.map((issue, issueIdx) => (
                                    <div key={issueIdx} className={`flex items-start space-x-2 ${
                                      issue.severity === 'high' ? 'text-blue-700' : 'text-blue-600'
                                    }`}>
                                      <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                        issue.severity === 'high' ? 'text-blue-600' : 'text-blue-500'
                                      }`} />
                                      <div>
                                        <p className="text-sm font-medium">{issue.message}</p>
                                        <span className={`text-xs px-2 py-0.5 rounded ${
                                          issue.severity === 'high' 
                                            ? 'bg-blue-200 text-blue-800' 
                                            : 'bg-blue-200 text-blue-800'
                                        }`}>
                                          {issue.severity === 'high' ? 'High Priority' : 'Medium Priority'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        
                        {/* Organization Issues Display */}
                        {alert.alertType === 'organization' && alert.issues && (
                          <div className={`rounded-lg p-4 mb-3 ${
                            alert.severity === 'high' ? 'bg-blue-50' : 'bg-blue-50'
                          }`}>
                            <p className={`text-sm font-semibold mb-2 ${
                              alert.severity === 'high' ? 'text-blue-900' : 'text-blue-900'
                            }`}>
                              Organization Issues Detected:
                            </p>
                            <div className="space-y-2">
                              {alert.issues.map((issue, issueIdx) => (
                                <div key={issueIdx} className={`flex items-start space-x-2 ${
                                  issue.severity === 'high' ? 'text-blue-700' : 'text-blue-600'
                                }`}>
                                  <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                    issue.severity === 'high' ? 'text-blue-600' : 'text-blue-500'
                                  }`} />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{issue.message}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${
                                      issue.severity === 'high' 
                                        ? 'bg-blue-200 text-blue-800' 
                                        : 'bg-blue-200 text-blue-800'
                                    }`}>
                                      {issue.severity === 'high' ? 'High Priority' : 'Medium Priority'}
                                    </span>
                                    {issue.deviceNames && (
                                      <p className="text-xs text-gray-600 mt-1">
                                        Affected devices: {issue.deviceNames}
                                      </p>
                                    )}
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
                    <h2 className="text-3xl font-extrabold text-white mb-2 drop-shadow-lg">Managers</h2>
                    <p className="text-blue-100 text-base font-medium mb-3">Manage and monitor all managers</p>
                    <span className="inline-block bg-white bg-opacity-25 text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg backdrop-blur-sm">
                      {data.managers.length} Total Manager{data.managers.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => openModal('manager')}
                  className="flex items-center px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
                >
                  <UserPlus className="w-6 h-6 mr-2" />
                  Add Manager
                </button>
              </div>
            </div>
            
            {data.managers.length === 0 ? (
              <div className="bg-gradient-to-br from-white to-blue-50 p-16 rounded-2xl shadow-2xl text-center border-2 border-blue-200">
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center shadow-lg">
                  <Users className="w-12 h-12 text-blue-600" />
                </div>
                <p className="text-gray-800 text-2xl font-bold mb-3">No Managers Found</p>
                <p className="text-gray-600 text-base mb-6">Get started by adding your first manager</p>
                <button
                  onClick={() => openModal('manager')}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Add Manager
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.managers.map(manager => (
                  <ManagerCard key={manager.id} manager={manager} />
                ))}
              </div>
            )}
          </div>
        );
      case 'organizations':
        return (
          <div className="space-y-8">
            {/* Header Section - Ultra Enhanced */}
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
                    <p className="text-blue-100 text-base font-medium mb-3">Manage all organizations and their settings</p>
                    <span className="inline-block bg-white bg-opacity-25 text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg backdrop-blur-sm">
                      {data.organizations.length} Active Organization{data.organizations.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => openModal('organization')}
                  className="flex items-center px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
                >
                  <Building className="w-6 h-6 mr-2" />
                  Add Organization
                </button>
              </div>
            </div>
            
            {data.organizations.length === 0 ? (
              <div className="bg-gradient-to-br from-white to-blue-50 p-16 rounded-2xl shadow-2xl text-center border-2 border-blue-200">
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center shadow-lg">
                  <Building className="w-12 h-12 text-blue-600" />
                </div>
                <p className="text-gray-800 text-2xl font-bold mb-3">No Organizations Found</p>
                <p className="text-gray-600 text-base mb-6">Create your first organization to get started</p>
                <button
                  onClick={() => openModal('organization')}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                >
                  <Building className="w-5 h-5 mr-2" />
                  Add Organization
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {data.organizations.map(org => (
                  <OrganizationCard key={org.id} org={org} />
                ))}
              </div>
            )}

          </div>
        );
      case 'venues':
        return (
          <div className="space-y-8">
            {/* Header Section - Ultra Enhanced */}
            <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl shadow-2xl p-8 border-2 border-blue-400 overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>
              <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="flex items-center space-x-5">
                  <div className="bg-white bg-opacity-25 rounded-2xl p-4 shadow-xl transform group-hover:rotate-12 transition-transform duration-300">
                    <Building className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-extrabold text-white mb-2 drop-shadow-lg">Venues</h2>
                    <p className="text-blue-100 text-base font-medium mb-3">Manage all venues and locations</p>
                    <span className="inline-block bg-white bg-opacity-25 text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg backdrop-blur-sm">
                      {data.venues.length} Total Venue{data.venues.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => openModal('venue')}
                  className="flex items-center px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
                >
                  <MapPin className="w-6 h-6 mr-2" />
                  Add Venue
                </button>
              </div>
            </div>
            
            {data.venues.length === 0 ? (
              <div className="bg-gradient-to-br from-white to-blue-50 p-16 rounded-2xl shadow-2xl text-center border-2 border-blue-200">
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center shadow-lg">
                  <MapPin className="w-12 h-12 text-blue-600" />
                </div>
                <p className="text-gray-800 text-2xl font-bold mb-3">No Venues Found</p>
                <p className="text-gray-600 text-base mb-6">Create your first venue to get started</p>
                <button
                  onClick={() => openModal('venue')}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                >
                  <MapPin className="w-5 h-5 mr-2" />
                  Add Venue
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.venues.map(venue => (
                  <VenueCard key={venue.id} venue={venue} />
                ))}
              </div>
            )}
          </div>
        );
      case 'acs':
        return (
          <div className="space-y-8">
            {/* Header Section - Ultra Enhanced */}
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
                    <p className="text-blue-100 text-base font-medium mb-3">Monitor and control all AC devices</p>
                    <div className="flex items-center space-x-3 mt-2">
                      <span className="bg-white bg-opacity-25 text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg backdrop-blur-sm">
                        {data.acs.length} Total Device{data.acs.length !== 1 ? 's' : ''}
                      </span>
                      <span className="bg-blue-400 bg-opacity-30 text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg backdrop-blur-sm">
                        {data.acs.filter(ac => ac.isOn).length} Active
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => openModal('ac')}
                  className="flex items-center px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
                >
                  <Cpu className="w-6 h-6 mr-2" />
                  Add AC Device
                </button>
              </div>
            </div>
            
            {data.acs.length === 0 ? (
              <div className="bg-white p-12 rounded-xl shadow-lg text-center border-2 border-gray-200">
                <Thermometer className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600 text-lg font-medium mb-2">No AC Devices Found</p>
                <p className="text-gray-500 text-sm mb-4">Add your first AC device to start monitoring</p>
                <button
                  onClick={() => openModal('ac')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Cpu className="w-4 h-4 mr-2" />
                  Add AC Device
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.acs.map(ac => (
                  <ACCard key={ac.id} ac={ac} />
                ))}
              </div>
            )}
          </div>
        );
      case 'energy':
        // Calculate total energy from energyData (updated) or fallback to data.acs (initial)
        const totalEnergy = data.acs.reduce((sum, ac) => {
          const acEnergy = energyData.acs[ac.id];
          return sum + (acEnergy?.totalEnergyConsumed || ac.totalEnergyConsumed || 0);
        }, 0);
        const activeACsCount = data.acs.filter(ac => ac.isOn).length;
        const totalACsCount = data.acs.length;
        
        return (
          <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0">
            {/* Header Section - Ultra Enhanced */}
            <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 border-2 border-blue-400 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 bg-white opacity-10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 lg:-mr-20 lg:-mt-20"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-white opacity-5 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12 lg:-ml-16 lg:-mb-16"></div>
              <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 lg:gap-6">
                <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-5 flex-1 min-w-0">
                  <div className="bg-white bg-opacity-25 rounded-lg sm:rounded-xl lg:rounded-2xl p-2 sm:p-3 lg:p-4 shadow-xl transform group-hover:rotate-12 transition-transform duration-300 flex-shrink-0">
                    <Zap className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white mb-1 sm:mb-2 drop-shadow-lg truncate">Energy Consumption</h2>
                    <p className="text-blue-100 text-xs sm:text-sm lg:text-base font-medium mb-2 sm:mb-3">Monitor and track energy usage across all AC devices</p>
                    <span className="inline-block bg-white bg-opacity-25 text-white px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-lg backdrop-blur-sm">
                      {totalEnergy.toFixed(2)} kWh Total
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // Refresh energy data for all ACs and organizations
                    data.acs.forEach(ac => loadACEnergy(ac.id));
                    data.organizations.forEach(org => loadOrganizationEnergy(org.id));
                    toast.success('Refreshing energy data...');
                  }}
                  className="w-full sm:w-auto flex items-center justify-center px-4 sm:px-5 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md hover:shadow-lg transition-all text-sm sm:text-base"
                >
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span className="hidden sm:inline">Refresh All</span>
                  <span className="sm:hidden">Refresh</span>
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-blue-100 text-xs sm:text-sm font-medium">Total Energy Consumed</p>
                    <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 truncate">{totalEnergy.toFixed(2)} kWh</p>
                    <p className="text-blue-100 text-xs mt-1">Lifetime consumption</p>
                  </div>
                  <Zap className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-blue-200 opacity-50 flex-shrink-0 ml-2" />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-blue-100 text-xs sm:text-sm font-medium">Active AC Devices</p>
                    <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{activeACsCount} / {totalACsCount}</p>
                    <p className="text-blue-100 text-xs mt-1">Currently running</p>
                  </div>
                  <Power className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-blue-200 opacity-50 flex-shrink-0 ml-2" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 sm:p-6 text-white sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-blue-100 text-xs sm:text-sm font-medium">Total Organizations</p>
                    <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{data.organizations.length}</p>
                    <p className="text-blue-100 text-xs mt-1">With AC devices</p>
                  </div>
                  <Building className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-blue-200 opacity-50 flex-shrink-0 ml-2" />
                </div>
              </div>
            </div>

            {/* Organizations Energy Consumption */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <Building className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600 flex-shrink-0" />
                <span>Energy by Organization</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {data.organizations.map(org => {
                  const orgEnergy = energyData.organizations[org.id];
                  // Get ACs from venues under this organization
                  const orgVenueIds = data.venues?.filter(v => v.organizationId === org.id).map(v => v.id) || [];
                  const orgACs = data.acs.filter(ac => ac.venueId && orgVenueIds.includes(ac.venueId));
                  const orgTotalEnergy = orgEnergy?.totalEnergyConsumed || 
                    orgACs.reduce((sum, ac) => sum + (ac.totalEnergyConsumed || 0), 0);
                  const orgActiveACs = orgACs.filter(ac => ac.isOn).length;
                  
                  return (
                    <div key={org.id} className="bg-white rounded-lg shadow-md p-3 sm:p-4 lg:p-5 border border-gray-200 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-1 truncate">{org.name}</h4>
                          <p className="text-xs text-gray-500">{orgACs.length} AC device{orgACs.length !== 1 ? 's' : ''}</p>
                        </div>
                        <button
                          onClick={() => {
                            loadOrganizationEnergy(org.id);
                            handleViewOrganizationDetails(org.id);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded flex-shrink-0"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm text-gray-600">Total Energy:</span>
                          <span className="text-base sm:text-lg font-bold text-blue-600">
                            {orgTotalEnergy.toFixed(2)} kWh
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm text-gray-600">Active ACs:</span>
                          <span className={`text-xs sm:text-sm font-medium ${orgActiveACs > 0 ? 'text-green-600' : 'text-gray-500'}`}>
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
                              <span className="truncate ml-2">
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
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <Thermometer className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-red-600 flex-shrink-0" />
                <span>Energy by AC Device</span>
              </h3>
              <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                <div className="overflow-x-auto max-w-full -mx-2 sm:mx-0">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AC Device</th>
                        <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Organization</th>
                        <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ton</th>
                        <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Energy</th>
                        <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Off Load</th>
                        <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">On Load</th>
                        <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Current Rate</th>
                        <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Overload</th>
                        <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.acs.map(ac => {
                        const acEnergy = energyData.acs[ac.id];
                        const isLoading = energyLoading[`ac-${ac.id}`];
                        
                        return (
                          <tr key={ac.id} className="hover:bg-gray-50">
                            <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                              <div className="flex items-center min-w-0">
                                <div className="min-w-0">
                                  <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">{ac.name}</div>
                                  <div className="text-xs text-gray-500 truncate">{ac.brand} {ac.model}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 hidden lg:table-cell">
                              <div className="text-xs sm:text-sm text-gray-900 truncate max-w-[150px]">
                                {ac.venue?.name ? ac.venue.name : 'N/A'}
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                                {ac.ton} Ton
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                              <div className="flex flex-col gap-1">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                  ac.isOn 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {ac.isOn ? 'ON' : 'OFF'}
                                </span>
                                {acEnergy?.isOnStartup && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                                    Startup
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                              <div className="text-xs sm:text-sm font-semibold text-blue-600">
                                {acEnergy ? acEnergy.totalEnergyConsumed.toFixed(2) : (ac.totalEnergyConsumed || 0).toFixed(2)} <span className="text-xs">kWh</span>
                              </div>
                            </td>
                            {/* Off Load Column */}
                            <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 hidden md:table-cell">
                              {isLoading ? (
                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : acEnergy ? (
                                <div className="text-sm font-medium text-gray-500">
                                  {ac.isOn ? '0.00' : '0.00'} kWh/hr
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                            {/* On Load Column (Base Rate) */}
                            <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 hidden md:table-cell">
                              {isLoading ? (
                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : acEnergy ? (
                                <div>
                                  <div className="text-xs sm:text-sm font-medium text-green-600">
                                    {ac.isOn ? (acEnergy.baseRate?.toFixed(2) || '0.00') : '0.00'} <span className="text-xs">kWh/hr</span>
                                  </div>
                                  {ac.isOn && acEnergy.currentMode && (
                                    <div className="text-xs text-gray-500 truncate">
                                      {acEnergy.currentMode}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                            {/* Current Rate Column (Temperature Adjusted) */}
                            <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 hidden xl:table-cell">
                              {isLoading ? (
                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : acEnergy ? (
                                <div>
                                  <div className="text-xs sm:text-sm font-medium text-blue-600">
                                    {acEnergy.currentRate?.toFixed(2) || '0.00'} <span className="text-xs">kWh/hr</span>
                                  </div>
                                  {acEnergy.temperatureMultiplier !== 1 && (
                                    <div className="text-xs text-gray-500">
                                      {acEnergy.temperature}°C
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <button
                                  onClick={() => loadACEnergy(ac.id)}
                                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded whitespace-nowrap"
                                >
                                  Load
                                </button>
                              )}
                            </td>
                            {/* Overload Column */}
                            <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 hidden xl:table-cell">
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
                            <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 lg:py-4">
                              <button
                                onClick={() => {
                                  loadACEnergy(ac.id);
                                  handleViewACDetails(ac.id);
                                }}
                                className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs font-medium transition-colors whitespace-nowrap"
                              >
                                <Eye className="w-3 h-3 sm:mr-1" />
                                <span className="hidden sm:inline">View</span>
                              </button>
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
      case 'logs':
        return (
          <div className="space-y-8">
            {/* Header Section - Ultra Enhanced */}
            <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl shadow-2xl p-8 border-2 border-blue-400 overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>
              <div className="relative flex items-center space-x-5">
                <div className="bg-white bg-opacity-25 rounded-2xl p-4 shadow-xl transform group-hover:rotate-12 transition-transform duration-300">
                  <Activity className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-extrabold text-white mb-2 drop-shadow-lg">Activity Logs</h2>
                  <p className="text-blue-100 text-base font-medium mb-3">Track all system activities and changes</p>
                  <span className="inline-block bg-white bg-opacity-25 text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg backdrop-blur-sm">
                    {data.logs?.length || 0} Total Log{data.logs?.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
            
            {data.logs && data.logs.length > 0 ? (
              <div className="space-y-4">
                {data.logs.map((log, index) => (
                  <LogCard key={index} log={log} />
                ))}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-white to-blue-50 p-16 rounded-2xl shadow-2xl text-center border-2 border-blue-200">
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center shadow-lg">
                  <Activity className="w-12 h-12 text-blue-600" />
                </div>
                <p className="text-gray-800 text-2xl font-bold mb-3">No Activity Logs Found</p>
                <p className="text-gray-600 text-base font-medium">Activity logs will appear here as actions are performed</p>
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
                <h2 className="text-lg font-bold">Admin Panel</h2>
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
                  <p className="text-sm font-medium truncate">{user?.name || 'Admin'}</p>
                  <p className="text-xs text-blue-200 truncate">{user?.email || 'admin@example.com'}</p>
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
                    Welcome back, {user?.name || 'Admin'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
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
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`bg-white rounded-lg shadow-xl ${modalType === 'view-organization' || modalType === 'view-venue' || modalType === 'view-ac' || modalType === 'event' ? 'max-w-2xl' : 'max-w-md'} w-full mx-4 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalType === 'manager' && 'Create Manager'}
                {modalType === 'organization' && 'Create Organization'}
                {modalType === 'view-organization' && 'Organization Details'}
                {modalType === 'view-venue' && 'Venue Details'}
                {modalType === 'venue' && 'Create Venue'}
                {modalType === 'ac' && 'Create AC Device'}
                {modalType === 'event' && (selectedEvent?.id ? 'Edit Event' : 'Create Event')}
                {modalType.startsWith('assign-manager-') && 'Assign Manager to Organizations'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              {modalType === 'manager' && <ManagerForm onSubmit={handleCreateManager} onCancel={closeModal} />}
              {modalType === 'organization' && <OrganizationForm onSubmit={handleCreateOrganization} onCancel={closeModal} />}
              {modalType === 'venue' && <VenueForm onSubmit={handleCreateVenue} onCancel={closeModal} organizations={data.organizations} />}
              {modalType === 'ac' && <ACForm onSubmit={handleCreateAC} onCancel={closeModal} venues={data.venues} />}
              {modalType === 'event' && (
                <EventForm 
                  onSubmit={selectedEvent?.id ? (data) => handleUpdateEvent(selectedEvent.id, data) : handleCreateEvent}
                  onCancel={closeModal}
                  event={selectedEvent}
                  acs={Array.isArray(data.acs) ? data.acs : []}
                />
              )}
              {modalType.startsWith('assign-manager-') && (() => {
                const managerId = modalType.replace('assign-manager-', '');
                const manager = data.managers.find(m => m.id === parseInt(managerId) || m.id === managerId);
                const assignedOrgs = manager?.organizations || [];
                
                return (
                <ManagerAssignmentForm 
                    managerId={managerId}
                  organizations={data.organizations}
                    assignedOrganizations={assignedOrgs}
                  onSubmit={handleAssignManager}
                  onCancel={closeModal}
                />
                );
              })()}
              {modalType === 'view-organization' && selectedOrgDetails && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">{selectedOrgDetails.name}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          selectedOrgDetails.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedOrgDetails.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">Temperature:</span>
                        {isOrganizationLocked(selectedOrgDetails) && selectedOrgDetails.lockedTemperature ? (
                          <span className="text-sm text-gray-700">
                            {selectedOrgDetails.temperature || 16}°C
                            <span className="text-xs text-red-600 ml-1">
                              (Locked at {selectedOrgDetails.lockedTemperature}°C)
                            </span>
                          </span>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="16"
                              max="30"
                              step="1"
                              value={localTemperatures[`organization-${selectedOrgDetails.id}`] !== undefined ? localTemperatures[`organization-${selectedOrgDetails.id}`] : (selectedOrgDetails.temperature ?? 16)}
                              disabled={temperatureLoading[`organization-${selectedOrgDetails.id}`] || isOrganizationLocked(selectedOrgDetails)}
                              className={`w-20 px-2 py-1 text-sm border rounded-lg text-center font-medium transition-colors ${
                                temperatureLoading[`organization-${selectedOrgDetails.id}`] || isOrganizationLocked(selectedOrgDetails)
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
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">Lock Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          isOrganizationLocked(selectedOrgDetails) ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {isOrganizationLocked(selectedOrgDetails) ? 'Locked' : 'Unlocked'}
                        </span>
                      </div>
                      {(() => {
                        const orgEnergy = energyData.organizations[selectedOrgDetails.id];
                        const orgACs = data.acs.filter(ac => ac.organizationId === selectedOrgDetails.id);
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
                      {selectedOrgDetails.manager && (
                        <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Manager:</span>
                          <span>{selectedOrgDetails.manager.name}</span>
                          </div>
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to unassign ${selectedOrgDetails.manager.name} from ${selectedOrgDetails.name}?`)) {
                                handleUnassignOrganization(selectedOrgDetails.id);
                              }
                            }}
                            className="flex items-center space-x-1 px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            title="Unassign Manager"
                          >
                            <X className="w-4 h-4" />
                            <span>Unassign</span>
                          </button>
                        </div>
                      )}
                      
                      {/* Lock Control Section */}
                      <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-base font-semibold text-gray-700">Remote Lock Control</span>
                          {isOrganizationDevicesRemoteLocked(selectedOrgDetails) && (
                            <span className="text-xs text-gray-500">
                              Devices Locked
                            </span>
                          )}
                        </div>
                        {isOrganizationDevicesRemoteLocked(selectedOrgDetails) ? (
                          <button
                            onClick={() => handleRemoteUnlockOrganization(selectedOrgDetails.id)}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg text-base font-semibold hover:bg-green-700 transition-colors"
                            title="Remote unlock all devices in this organization"
                          >
                            <Unlock className="w-5 h-5" />
                            <span>Remote Unlock Devices</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRemoteLockOrganization(selectedOrgDetails.id)}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg text-base font-semibold hover:bg-red-700 transition-colors"
                            title="Remote lock all devices in this organization"
                          >
                            <Lock className="w-5 h-5" />
                            <span>Remote Lock Devices</span>
                          </button>
                        )}
                      </div>

                      {selectedOrgDetails.acs && selectedOrgDetails.acs.length > 0 && (
                        <div>
                          <span className="font-medium">AC Devices ({selectedOrgDetails.acs.length}):</span>
                          <div className="mt-2 space-y-2">
                            {selectedOrgDetails.acs.map(ac => {
                              const acAlert = alerts.find(a => a.acId === ac.id);
                              return (
                                <div key={ac.id} className={`p-3 rounded border ${
                                  acAlert ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                                }`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-xs font-medium">{ac.name} - {ac.brand} {ac.model}</span>
                                      {acAlert && (
                                        <AlertCircle className="w-4 h-4 text-red-600" />
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    Temp: {ac.temperature}°C | Power: {ac.isOn ? 'ON' : 'OFF'}
                                    {acAlert && (
                                      <div className="mt-1 text-red-700">
                                        {acAlert.issues && acAlert.issues.length > 0 && (
                                          <span className="font-medium">
                                            {acAlert.issues[0].message}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Device-Level Alerts Section */}
                      {(() => {
                        const orgVenueIds = Array.isArray(data.venues) ? data.venues.filter(v => v.organizationId === selectedOrgDetails.id).map(v => v.id) : [];
                        const orgDeviceIds = Array.isArray(data.acs) ? data.acs.filter(ac => ac.venueId && orgVenueIds.includes(ac.venueId)).map(ac => ac.id) : [];
                        
                        // Get alerts from API (all alerts are device-level now)
                        const orgDeviceAlertsFromAPI = Array.isArray(allAlerts) ? allAlerts.filter(alert => {
                          // All alerts are device-level, just check if acId matches
                          return alert.acId && orgDeviceIds.includes(alert.acId);
                        }) : [];
                        
                        // Also check ACs directly for alert status
                        const orgACs = Array.isArray(data.acs) ? data.acs.filter(ac => 
                          ac.venueId && orgVenueIds.includes(ac.venueId)
                        ) : [];
                        const orgACsWithAlerts = orgACs.filter(ac => 
                          (ac.isWorking === false && ac.isWorking !== null) || ac.alertAt
                        );
                        
                        // Combine API alerts and direct AC alerts
                        const orgDeviceAlerts = [...orgDeviceAlertsFromAPI];
                        orgACsWithAlerts.forEach(ac => {
                          const exists = orgDeviceAlerts.find(a => a.acId === ac.id);
                          if (!exists) {
                            orgDeviceAlerts.push({
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
                        
                        if (orgDeviceAlerts.length > 0) {
                          return (
                            <div className="mt-4">
                              <div className="flex items-center space-x-2 mb-3">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                                <span className="font-semibold text-gray-900">Device Alerts ({orgDeviceAlerts.length})</span>
                    </div>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {orgDeviceAlerts.map((alert, idx) => (
                                  <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                          <span className="text-sm font-semibold text-gray-900">{alert.acName}</span>
                                          <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                                            Device Alert
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-600 mb-1">{alert.brand} {alert.model} - {alert.serialNumber}</p>
                                        {alert.issues && alert.issues.length > 0 && (
                                          <div className="mt-2 space-y-1">
                                            {alert.issues.map((issue, issueIdx) => (
                                              <div key={issueIdx} className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded">
                                                <span className="font-medium">{issue.type}:</span> {issue.message}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Device-Level Events Section */}
                      {(() => {
                        const orgVenueIds = Array.isArray(data.venues) ? data.venues.filter(v => v.organizationId === selectedOrgDetails.id).map(v => v.id) : [];
                        const orgDeviceIds = Array.isArray(data.acs) ? data.acs.filter(ac => ac.venueId && orgVenueIds.includes(ac.venueId)).map(ac => ac.id) : [];
                        const orgDeviceEvents = Array.isArray(data.events) ? data.events.filter(e => 
                          e.eventType === 'device' && orgDeviceIds.includes(e.deviceId)
                        ) : [];
                        
                        if (orgDeviceEvents.length > 0) {
                          return (
                            <div className="mt-4">
                              <div className="flex items-center space-x-2 mb-3">
                                <Calendar className="w-5 h-5 text-blue-600" />
                                <span className="font-semibold text-gray-900">Device Events ({orgDeviceEvents.length})</span>
                              </div>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {orgDeviceEvents.map((event) => {
                                  const eventAC = data.acs.find(ac => ac.id === event.deviceId);
                                  return (
                                    <div key={event.id} className={`border rounded-lg p-3 ${
                                      event.status === 'active' ? 'bg-blue-50 border-blue-200' :
                                      event.isDisabled ? 'bg-yellow-50 border-yellow-200' :
                                      'bg-gray-50 border-gray-200'
                                    }`}>
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                          <div className="flex items-center space-x-2 mb-1">
                                            <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                            <span className="text-sm font-semibold text-gray-900">{event.name}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded ${
                                              event.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                              event.isDisabled ? 'bg-yellow-100 text-yellow-800' :
                                              'bg-gray-100 text-gray-800'
                                            }`}>
                                              {event.status === 'active' ? 'Active' : event.isDisabled ? 'Disabled' : event.status}
                                            </span>
                                          </div>
                                          {eventAC && (
                                            <p className="text-xs text-gray-600 mb-1">Device: {eventAC.name} ({eventAC.brand} {eventAC.model})</p>
                                          )}
                                          {event.startTime && (
                                            <p className="text-xs text-gray-500">Start: {new Date(event.startTime).toLocaleString()}</p>
                                          )}
                                          {event.endTime && (
                                            <p className="text-xs text-gray-500">End: {new Date(event.endTime).toLocaleString()}</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                  <button
                    onClick={closeModal}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  >
                    Close
                  </button>
                </div>
              )}
              {modalType === 'view-venue' && selectedVenueDetails && (
                <div className="space-y-4">
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
                            disabled={temperatureLoading[`venue-${selectedVenueDetails.id}`]}
                            className={`w-20 px-2 py-1 text-sm border rounded-lg text-center font-medium transition-colors ${
                              temperatureLoading[`venue-${selectedVenueDetails.id}`]
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
                      {selectedVenueDetails.manager && (
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Manager:</span>
                          <span>{selectedVenueDetails.manager.name} ({selectedVenueDetails.manager.email})</span>
                        </div>
                      )}
                    </div>

                    {/* Device-Level Alerts Section */}
                    {(() => {
                      const venueDeviceIds = Array.isArray(data.acs) ? data.acs.filter(ac => ac.venueId === selectedVenueDetails.id).map(ac => ac.id) : [];
                      
                      // Get alerts from API (all alerts are device-level now)
                      const venueDeviceAlertsFromAPI = Array.isArray(allAlerts) ? allAlerts.filter(alert => {
                        // All alerts are device-level, just check if acId matches
                        return alert.acId && venueDeviceIds.includes(alert.acId);
                      }) : [];
                      
                      // Also check ACs directly for alert status
                      const venueACs = Array.isArray(data.acs) ? data.acs.filter(ac => ac.venueId === selectedVenueDetails.id) : [];
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
                      
                      if (venueDeviceAlerts.length > 0) {
                        return (
                          <div className="mt-4">
                            <div className="flex items-center space-x-2 mb-3">
                              <AlertCircle className="w-5 h-5 text-red-600" />
                              <span className="font-semibold text-gray-900">Device Alerts ({venueDeviceAlerts.length})</span>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {venueDeviceAlerts.map((alert, idx) => (
                                <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                        <span className="text-sm font-semibold text-gray-900">{alert.acName}</span>
                                        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                                          Device Alert
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-600 mb-1">{alert.brand} {alert.model} - {alert.serialNumber}</p>
                                      {alert.issue && (
                                        <p className="text-xs text-red-700 font-medium mt-1">{alert.issue}</p>
                                      )}
                                      {alert.roomTempHistory && (
                                        <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                          <span>Hour 0: {alert.roomTempHistory.hour0?.toFixed(1)}°C</span>
                                          <span> → </span>
                                          <span>Hour 1: {alert.roomTempHistory.hour1?.toFixed(1)}°C</span>
                                          <span> → </span>
                                          <span className="font-bold text-red-600">Hour 2: {alert.roomTempHistory.hour2?.toFixed(1)}°C</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Device-Level Events Section */}
                    {(() => {
                      const venueDeviceIds = Array.isArray(data.acs) ? data.acs.filter(ac => ac.venueId === selectedVenueDetails.id).map(ac => ac.id) : [];
                      const venueDeviceEvents = Array.isArray(data.events) ? data.events.filter(e => 
                        e.eventType === 'device' && venueDeviceIds.includes(e.deviceId)
                      ) : [];
                      
                      if (venueDeviceEvents.length > 0) {
                        return (
                          <div className="mt-4">
                            <div className="flex items-center space-x-2 mb-3">
                              <Calendar className="w-5 h-5 text-blue-600" />
                              <span className="font-semibold text-gray-900">Device Events ({venueDeviceEvents.length})</span>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {venueDeviceEvents.map((event) => {
                                const eventAC = data.acs.find(ac => ac.id === event.deviceId);
                                return (
                                  <div key={event.id} className={`border rounded-lg p-3 ${
                                    event.status === 'active' ? 'bg-blue-50 border-blue-200' :
                                    event.isDisabled ? 'bg-yellow-50 border-yellow-200' :
                                    'bg-gray-50 border-gray-200'
                                  }`}>
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                          <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                          <span className="text-sm font-semibold text-gray-900">{event.name}</span>
                                          <span className={`text-xs px-2 py-0.5 rounded ${
                                            event.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                            event.isDisabled ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-800'
                                          }`}>
                                            {event.status === 'active' ? 'Active' : event.isDisabled ? 'Disabled' : event.status}
                                          </span>
                                        </div>
                                        {eventAC && (
                                          <p className="text-xs text-gray-600 mb-1">Device: {eventAC.name} ({eventAC.brand} {eventAC.model})</p>
                                        )}
                                        {event.startTime && (
                                          <p className="text-xs text-gray-500">Start: {new Date(event.startTime).toLocaleString()}</p>
                                        )}
                                        {event.endTime && (
                                          <p className="text-xs text-gray-500">End: {new Date(event.endTime).toLocaleString()}</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

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
                            onClick={() => handleRemoteUnlockVenue(selectedVenueDetails.id)}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm hover:shadow"
                            title="Remote unlock all devices in this venue"
                          >
                            <Unlock className="w-4 h-4" />
                            <span>Remote Unlock Devices</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRemoteLockVenue(selectedVenueDetails.id)}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors shadow-sm hover:shadow"
                          title="Remote lock all devices in this venue"
                        >
                          <Lock className="w-4 h-4" />
                          <span>Remote Lock Devices</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={closeModal}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  >
                    Close
                  </button>
                </div>
              )}
              {modalType === 'view-ac' && selectedACDetails && (() => {
                // Check for events for this device
                const deviceEvents = Array.isArray(data.events) ? data.events.filter(e => 
                  e.deviceId === selectedACDetails.id && e.eventType === 'device'
                ) : [];
                const activeEvent = deviceEvents.find(e => e.status === 'active' && !e.isDisabled);
                const scheduledEvent = deviceEvents.find(e => e.status === 'scheduled' && !e.isDisabled);
                const hasEvent = activeEvent || scheduledEvent;
                const eventTemp = hasEvent ? (activeEvent?.temperature || scheduledEvent?.temperature) : null;
                
                return (
                  <div className="space-y-4">
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
                          value={hasEvent && eventTemp ? eventTemp : (localTemperatures[`ac-${selectedACDetails.id}`] !== undefined ? localTemperatures[`ac-${selectedACDetails.id}`] : (selectedACDetails.temperature ?? 16))}
                          disabled={hasEvent || temperatureLoading[`ac-${selectedACDetails.id}`] || isDeviceLocked(selectedACDetails)}
                          className={`w-24 px-3 py-2 text-sm border rounded-lg text-center font-medium transition-colors ${
                            hasEvent || temperatureLoading[`ac-${selectedACDetails.id}`] || isDeviceLocked(selectedACDetails)
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
                          disabled={hasEvent || temperatureLoading[`ac-${selectedACDetails.id}`] || isDeviceLocked(selectedACDetails)}
                          className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          16°
                        </button>
                        <button
                          onClick={() => {
                            handleTemperatureChange('ac', selectedACDetails.id, 22);
                            handleSetTemperature('ac', selectedACDetails.id, 22);
                          }}
                          disabled={hasEvent || temperatureLoading[`ac-${selectedACDetails.id}`] || isDeviceLocked(selectedACDetails)}
                          className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          22°
                        </button>
                        <button
                          onClick={() => {
                            handleTemperatureChange('ac', selectedACDetails.id, 26);
                            handleSetTemperature('ac', selectedACDetails.id, 26);
                          }}
                          disabled={hasEvent || temperatureLoading[`ac-${selectedACDetails.id}`] || isDeviceLocked(selectedACDetails)}
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
                        onClick={() => handleToggleACPower(selectedACDetails.id, selectedACDetails.isOn)}
                        disabled={acPowerLoading[selectedACDetails.id]}
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
                            onClick={() => handleRemoteUnlockAC(selectedACDetails.id)}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm hover:shadow"
                            title="Remote unlock this device"
                          >
                            <Unlock className="w-4 h-4" />
                            <span>Remote Unlock Device</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRemoteLockAC(selectedACDetails.id)}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors shadow-sm hover:shadow"
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
                              {acEnergy && (
                                <>
                                  <div className="grid grid-cols-2 gap-3 mb-3">
                                    {/* Off Load */}
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                      <div className="text-xs text-gray-500 mb-1">Off Load</div>
                                      <div className="text-sm font-semibold text-gray-600">
                                        0.00 kWh/hr
                                      </div>
                                      <div className="text-xs text-gray-400 mt-1">When OFF</div>
                                    </div>
                                    
                                    {/* On Load (Base Rate) */}
                                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                      <div className="text-xs text-gray-600 mb-1">On Load</div>
                                      <div className="text-sm font-semibold text-green-600">
                                        {selectedACDetails.isOn ? (acEnergy.baseRate?.toFixed(2) || '0.00') : '0.00'} kWh/hr
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        {acEnergy.currentMode || 'high'} mode
                                      </div>
                                    </div>
                                  </div>

                                  {/* Current Rate */}
                                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 mb-3">
                                    <div className="text-xs text-gray-600 mb-1">Current Rate</div>
                                    <div className="text-base font-bold text-blue-600">
                                      {acEnergy.currentRate?.toFixed(2) || '0.00'} kWh/hr
                                    </div>
                                    {acEnergy.temperatureMultiplier && acEnergy.temperatureMultiplier !== 1 && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        Temp: {acEnergy.temperature}°C (×{acEnergy.temperatureMultiplier.toFixed(2)})
                                      </div>
                                    )}
                                  </div>

                                  {/* Overload */}
                                  {selectedACDetails.isOn && acEnergy.currentRate && acEnergy.baseRate && (
                                    <div className={`rounded-lg p-3 border mb-3 ${
                                      (acEnergy.currentRate - acEnergy.baseRate) > 0.01
                                        ? 'bg-red-50 border-red-200'
                                        : 'bg-gray-50 border-gray-200'
                                    }`}>
                                      <div className="text-xs text-gray-600 mb-1">Overload</div>
                                      {(() => {
                                        const overload = acEnergy.currentRate - acEnergy.baseRate;
                                        const isOverload = overload > 0.01;
                                        return (
                                          <>
                                            <div className={`text-base font-bold ${
                                              isOverload ? 'text-red-600' : 'text-gray-500'
                                            }`}>
                                              {isOverload ? `+${overload.toFixed(2)}` : '0.00'} kWh/hr
                                            </div>
                                            {acEnergy.isOnStartup && (
                                              <div className="text-xs text-yellow-600 mt-1">
                                                ⚠️ Startup Mode (High Consumption)
                                              </div>
                                            )}
                                            {!acEnergy.isOnStartup && isOverload && (
                                              <div className="text-xs text-red-600 mt-1">
                                                ⚠️ Temperature adjustment
                                              </div>
                                            )}
                                          </>
                                        );
                                      })()}
                                    </div>
                                  )}

                                  {acEnergy.lastEnergyCalculation && (
                                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-blue-200">
                                      <span>Last Updated:</span>
                                      <span>{new Date(acEnergy.lastEnergyCalculation).toLocaleString()}</span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                    {/* Device Key */}
                    {selectedACDetails.key && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <span className="text-sm font-medium text-gray-700 mb-2 block">Device Key:</span>
                        <div className="p-2 bg-white rounded border border-gray-200">
                          <p className="text-xs font-mono break-all text-gray-700">{selectedACDetails.key}</p>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={closeModal}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      Close
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
}

export default AdminDashboard;


