import React from 'react';
import { Mail } from 'lucide-react';
import { AdminPlanRequestCard } from './PlanRequestCard';

const PlanRequestsView = ({ requests, loading, onNavigateToRequest }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-12 text-center">
        <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Plan Requests</h3>
        <p className="text-gray-600 mb-6">You haven't submitted any plan upgrade requests yet.</p>
        {onNavigateToRequest && (
          <button
            onClick={onNavigateToRequest}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Request Plan Upgrade
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <AdminPlanRequestCard key={request.id} request={request} />
      ))}
    </div>
  );
};

export default PlanRequestsView;


