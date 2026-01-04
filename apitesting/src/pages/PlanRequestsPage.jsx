import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { adminAPI } from '../services/apiAdmin';
import toast from 'react-hot-toast';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { PlanRequestsView } from '../components/planrequests';

const PlanRequestsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getMyPlanRequests();
      const requestsData = response.data?.data?.requests || response.data?.requests || [];
      setRequests(requestsData);
    } catch (error) {
      console.error('Failed to load plan requests:', error);
      toast.error('Failed to load plan requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Plan Requests</h1>
              <p className="text-gray-600 mt-1">View the status of your plan upgrade requests</p>
            </div>
            <button
              onClick={loadRequests}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Requests List */}
        <PlanRequestsView
          requests={requests}
          loading={loading}
          onNavigateToRequest={() => navigate('/admin')}
        />
      </div>
    </div>
  );
};

export default PlanRequestsPage;

