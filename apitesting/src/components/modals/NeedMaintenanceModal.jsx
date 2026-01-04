import React, { useState, useEffect } from 'react';
import {
  X,
  Wrench,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
  MapPin,
  Eye,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/apiAdmin';

const NeedMaintenanceModal = ({ isOpen, onClose, venueId = null }) => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedVenues, setExpandedVenues] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadAlerts();
    }
  }, [isOpen, venueId]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getActiveAlerts();
      const allAlerts = res.data?.data?.alerts || res.data?.alerts || res.data?.data || [];
      
      // Filter by venueId if provided
      let filteredAlerts = allAlerts;
      if (venueId) {
        filteredAlerts = allAlerts.filter(alert => alert.venueId === venueId);
      }
      
      setAlerts(filteredAlerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
      toast.error('Failed to load alerts');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  // Group alerts by venue
  const groupedAlerts = alerts.reduce((acc, alert) => {
    const venueId = alert.venueId || 'unknown';
    const venueName = alert.venueName || alert.venue?.name || 'Unknown Venue';
    
    if (!acc[venueId]) {
      acc[venueId] = {
        venueId,
        venueName,
        alerts: [],
      };
    }
    acc[venueId].alerts.push(alert);
    return acc;
  }, {});

  const toggleVenue = (venueId) => {
    setExpandedVenues(prev => ({
      ...prev,
      [venueId]: !prev[venueId]
    }));
  };

  const handleVenueDetailClick = (venueId) => {
    if (venueId && venueId !== 'unknown') {
      navigate(`/admin/venue-dashboard/${venueId}`);
      onClose();
    } else {
      toast.error('Venue ID not available');
    }
  };

  const handleDownload = () => {
    try {
      // Create CSV content
      const headers = ['Venue', 'Device Name', 'Serial Number', 'Issue', 'Alert Date', 'Status'];
      const rows = alerts.map(alert => [
        alert.venueName || alert.venue?.name || 'Unknown',
        alert.acName || alert.deviceName || 'N/A',
        alert.serialNumber || 'N/A',
        alert.issue || alert.type || alert.message || 'Maintenance Required',
        alert.alertAt ? new Date(alert.alertAt).toLocaleDateString() : 'N/A',
        alert.isWorking === false ? 'Not Working' : 'Alert Active'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `alerts_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Alerts downloaded successfully');
    } catch (error) {
      console.error('Error downloading alerts:', error);
      toast.error('Failed to download alerts');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white w-[900px] max-w-[95%] h-[600px] rounded-[32px] border-2 border-blue-400 shadow-xl flex flex-col"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Header */}
        <div className="pt-8 px-10">
          <div className="flex items-center justify-center gap-4">
            <div className="relative w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <Wrench className="text-red-600 w-6 h-6" />
              <span className="absolute w-8 h-[3px] bg-red-600 rotate-45"></span>
            </div>
            <h2 className="text-2xl font-semibold text-blue-700">
              Need Maintenance
            </h2>
          </div>
          <div className="mt-4 h-[2px] bg-blue-500 w-full" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-scroll px-10 py-6 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading alerts...</div>
            </div>
          ) : Object.keys(groupedAlerts).length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No alerts found</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.values(groupedAlerts).map((venueGroup) => {
                // Default to expanded (true) if not explicitly set to false
                const isExpanded = expandedVenues[venueGroup.venueId] !== false;
                return (
                  <div key={venueGroup.venueId} className="border-b pb-3">
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-5 h-5 rounded text-blue-600"
                      />
                      <button onClick={() => toggleVenue(venueGroup.venueId)}>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <span className="flex-1 font-medium text-gray-800">
                        {venueGroup.venueName}
                      </span>
                      <button
                        onClick={() => handleVenueDetailClick(venueGroup.venueId)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="View Venue Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      <span className="w-8 text-right font-medium">
                        {venueGroup.alerts.length}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 ml-14 space-y-3">
                        {venueGroup.alerts.map((alert, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 text-sm text-gray-600"
                          >
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            <span className="flex-1">
                              {alert.acName || alert.deviceName || `Device ${alert.acId || 'N/A'}`}
                            </span>
                            <span className="text-xs text-gray-500">
                              {alert.alertAt 
                                ? new Date(alert.alertAt).toLocaleDateString('en-GB', { 
                                    day: 'numeric', 
                                    month: 'short', 
                                    year: 'numeric' 
                                  })
                                : 'N/A'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-10 pb-6 flex justify-end">
          <button
            onClick={handleDownload}
            disabled={loading || alerts.length === 0}
            className="flex items-center gap-3 px-6 py-3 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            Download ({alerts.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default NeedMaintenanceModal;


