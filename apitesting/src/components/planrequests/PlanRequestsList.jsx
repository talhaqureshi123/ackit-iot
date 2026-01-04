import React from 'react';
import { Mail } from 'lucide-react';
import { SuperAdminPlanRequestCard } from './PlanRequestCard';

const PlanRequestsList = ({ requests, onApprove, onReject, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No plan upgrade requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <SuperAdminPlanRequestCard
          key={request.id}
          request={request}
          onApprove={onApprove}
          onReject={onReject}
        />
      ))}
    </div>
  );
};

export default PlanRequestsList;


