import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { superAdminAPI } from '../services/apiSuperAdmin';
import toast from 'react-hot-toast';
import { PlanRequestsList } from '../components/planrequests';
import { ArrowLeft, RefreshCw, Bell } from 'lucide-react';

const SuperAdminPlanRequestsPage = () => {
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
      const response = await superAdminAPI.getPlanRequests();
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

  const handleApproveRequest = async (requestId) => {
    try {
      setLoading(true);
      await superAdminAPI.approvePlanRequest(requestId);
      toast.success('Plan request approved successfully');
      await loadRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      setLoading(true);
      const reason = prompt('Enter rejection reason (optional):') || 'Rejected by Super Admin';
      await superAdminAPI.rejectPlanRequest(requestId, reason);
      toast.success('Plan request rejected');
      await loadRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
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
            onClick={() => navigate('/superadmin')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                <Bell className="w-8 h-8 text-blue-600" />
                <span>Plan Upgrade Requests</span>
              </h1>
              <p className="text-gray-600 mt-1">Review and manage plan upgrade requests from admins</p>
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

        {/* Requests Count */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Requests</span>
              <span className="text-2xl font-bold text-gray-900">{requests.length}</span>
            </div>
            <div className="mt-2 flex items-center space-x-4 text-sm">
              <span className="text-yellow-600">
                Pending: {requests.filter(r => r.status === 'pending').length}
              </span>
              <span className="text-green-600">
                Approved: {requests.filter(r => r.status === 'approved').length}
              </span>
              <span className="text-red-600">
                Rejected: {requests.filter(r => r.status === 'rejected').length}
              </span>
            </div>
          </div>
        </div>

        {/* Requests List */}
        <PlanRequestsList
          requests={requests}
          onApprove={handleApproveRequest}
          onReject={handleRejectRequest}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default SuperAdminPlanRequestsPage;

