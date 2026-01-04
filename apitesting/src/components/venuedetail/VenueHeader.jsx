import React from 'react';
import { ArrowLeft, Users, AlertTriangle, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import KPICard from './KPICard';
import toast from 'react-hot-toast';

const VenueHeader = ({
  hideHeader,
  selectedOrganizationId,
  setSelectedOrganizationId,
  venue,
  venueId,
  organizations,
  allVenues,
  venues,
  setVenues,
  loadOrganizationData,
  navigate,
  totalDevices,
  faultDevices,
  venueEnergy,
  hasOrganizations = true,
  onVenueChange
}) => {
  const navigateHook = useNavigate();
  const nav = navigate || navigateHook;

  if (hideHeader) {
    return (
      <div className="w-full max-w-[95%] xl:max-w-[90%] 2xl:max-w-[85%] px-2 sm:px-4 py-1 bg-gray-50 relative z-0">
        {/* Organization and Venue Selection Dropdowns */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 mb-2 w-full sm:w-auto">
          {hasOrganizations ? (
            <>
              <select 
                value={selectedOrganizationId || venue?.organizationId || venue?.organization?.id || ''}
                onChange={(e) => {
                  const orgId = e.target.value ? parseInt(e.target.value) : null;
                  setSelectedOrganizationId(orgId);
                  
                  if (orgId) {
                    const filteredVenues = allVenues.filter(v => 
                      v.organizationId === orgId || 
                      v.organization?.id === orgId
                    );
                    setVenues(filteredVenues);
                    loadOrganizationData(orgId);
                    
                    if (filteredVenues.length > 0) {
                      const firstVenue = filteredVenues[0];
                      if (firstVenue.id !== venueId) {
                        if (onVenueChange) {
                          onVenueChange(firstVenue.id);
                        } else {
                          nav(`/admin/venue/${firstVenue.id}`);
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
                    setVenues(allVenues);
                  }
                }}
                className="w-full sm:w-auto flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Organization</option>
                {organizations && organizations.length > 0 ? (
                  organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
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
                    if (onVenueChange) {
                      onVenueChange(newVenueId);
                    } else {
                      nav(`/admin/venue/${newVenueId}`);
                    }
                  }
                }}
                disabled={!selectedOrganizationId}
                className={`w-full sm:w-auto flex-1 sm:flex-none px-3 sm:px-4 py-2 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                      {v.name}
                    </option>
                  ))
                ) : selectedOrganizationId ? (
                  <option value="" disabled>Loading venues...</option>
                ) : null}
              </select>
            </>
          ) : (
            <>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 sm:p-3 rounded flex items-center w-full">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 mr-2 flex-shrink-0" />
                <p className="text-xs sm:text-sm font-medium text-yellow-800">
                  Only venue allocated - No organization assigned
                </p>
              </div>
              
              <select 
                value={venueId}
                onChange={(e) => {
                  if (e.target.value && e.target.value !== venueId) {
                    const newVenueId = parseInt(e.target.value);
                    if (onVenueChange) {
                      onVenueChange(newVenueId);
                    } else {
                      nav(`/admin/venue/${newVenueId}`);
                    }
                  }
                }}
                className="w-full sm:w-auto flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Venue</option>
                {allVenues && allVenues.length > 0 ? (
                  allVenues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No venues available</option>
                )}
              </select>
            </>
          )}
        </div>
        
        {/* KPI Cards - Left aligned */}
        {/* Below 14 inches (xl): 2 columns, 3rd stacks below. Above 14 inches: 3 columns with reduced width and gaps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-2.5 xl:gap-2 w-full sm:w-[70%] xl:w-[60%] ml-0">
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
            value={`${venueEnergy.toFixed(1)} KV`} 
            icon={Zap} 
            iconColor="text-blue-600" 
            bgColor="bg-blue-500" 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white w-full flex flex-col items-center">
      <div className="w-full max-w-[95%] xl:max-w-[90%] py-3 sm:py-4 px-2 sm:px-4 md:px-6">
        <div className="mb-3 sm:mb-4 md:mb-5 xl:mb-4 relative z-50 w-full md:w-[70%] xl:w-[60%]">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 xl:gap-2.5 relative z-50 mb-3 sm:mb-4">
            <button
              onClick={() => nav(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors self-start sm:self-center"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <select 
              value={selectedOrganizationId || venue?.organizationId || venue?.organization?.id || ''}
              onChange={(e) => {
                const orgId = e.target.value ? parseInt(e.target.value) : null;
                setSelectedOrganizationId(orgId);
                
                if (orgId) {
                  const filteredVenues = allVenues.filter(v => 
                    v.organizationId === orgId || 
                    v.organization?.id === orgId
                  );
                  setVenues(filteredVenues);
                  loadOrganizationData(orgId);
                  
                  if (filteredVenues.length > 0) {
                    nav(`/admin/venue/${filteredVenues[0].id}`);
                  } else {
                    toast.info(`No venues found for selected organization`);
                  }
                  
                  const selectedOrg = organizations.find(org => org.id === orgId);
                  if (selectedOrg) {
                    toast.success(`Selected: ${selectedOrg.name}`);
                  }
                } else {
                  setVenues(allVenues);
                }
              }}
              className="w-full sm:w-auto flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 relative z-[9999]"
            >
              <option value="">Organization</option>
              {organizations && organizations.length > 0 ? (
                organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>Loading organizations...</option>
              )}
              {venue?.organization && organizations && !organizations.find(org => org.id === venue.organization.id) && (
                <option value={venue.organization.id}>
                  {venue.organization.name}
                </option>
              )}
            </select>
            <select 
              value={venueId}
              onChange={(e) => {
                if (e.target.value && e.target.value !== venueId) {
                  nav(`/admin/venue/${e.target.value}`);
                }
              }}
              disabled={!selectedOrganizationId}
              className={`w-full sm:w-auto flex-1 sm:flex-none px-3 sm:px-4 py-2 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 relative z-[9999] ${
                !selectedOrganizationId 
                  ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed' 
                  : 'bg-white border-gray-300'
              }`}
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
                    {v.name}
                  </option>
                ))
              ) : selectedOrganizationId ? (
                <option value="" disabled>Loading venues...</option>
              ) : null}
            </select>
          </div>
        </div>
        
        {/* KPIs - In Header Section - Left aligned, same width as devices table */}
        {/* Below 14 inches (xl): 2 columns, 3rd stacks below. Above 14 inches: 3 columns with reduced width and gaps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-2.5 xl:gap-2 w-full md:w-[70%] xl:w-[60%] mt-3 sm:mt-4">
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
            value={`${venueEnergy.toFixed(1)} KV`} 
            icon={Zap} 
            iconColor="text-blue-600" 
            bgColor="bg-blue-500" 
          />
        </div>
      </div>
    </div>
  );
};

export default VenueHeader;

