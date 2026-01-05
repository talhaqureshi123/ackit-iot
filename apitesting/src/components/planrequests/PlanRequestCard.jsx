import React from 'react';
import { Crown, Zap, Gift, Settings, CheckCircle, XCircle, Clock, User } from 'lucide-react';

const PLANS = {
  basic: { name: 'Basic', icon: Gift, colorClass: 'text-blue-600', bgClass: 'bg-blue-50' },
  advanced: { name: 'Advanced', icon: Zap, colorClass: 'text-purple-600', bgClass: 'bg-purple-50' },
  premium: { name: 'Premium', icon: Crown, colorClass: 'text-yellow-600', bgClass: 'bg-yellow-50' },
  custom: { name: 'Custom', icon: Settings, colorClass: 'text-green-600', bgClass: 'bg-green-50' }
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'N/A';
  }
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'approved':
      return (
        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center space-x-1">
          <CheckCircle className="w-3 h-3" />
          <span>Approved</span>
        </span>
      );
    case 'rejected':
      return (
        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full flex items-center space-x-1">
          <XCircle className="w-3 h-3" />
          <span>Rejected</span>
        </span>
      );
    case 'pending':
    default:
      return (
        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>Pending</span>
        </span>
      );
  }
};

// Admin's own request card (for PlanRequestsPage)
export const AdminPlanRequestCard = ({ request }) => {
  const currentPlan = PLANS[request.currentPlan || 'basic'];
  const requestedPlan = PLANS[request.requestedPlan];
  const CurrentIcon = currentPlan.icon;
  const RequestedIcon = requestedPlan.icon;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200 hover:border-blue-300 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-4 mb-4">
            <div className={`p-3 rounded-lg ${currentPlan.bgClass}`}>
              <CurrentIcon className={`w-6 h-6 ${currentPlan.colorClass}`} />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">→</span>
            </div>
            <div className={`p-3 rounded-lg ${requestedPlan.bgClass}`}>
              <RequestedIcon className={`w-6 h-6 ${requestedPlan.colorClass}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {currentPlan.name} → {requestedPlan.name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Requested on {formatDate(request.createdAt)}
              </p>
            </div>
          </div>

          {request.message && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-1">Your Message:</p>
              <p className="text-sm text-gray-600">{request.message}</p>
            </div>
          )}

          {request.rejectionReason && (
            <div className="bg-red-50 rounded-lg p-4 mb-4 border border-red-200">
              <p className="text-sm font-semibold text-red-700 mb-1">Rejection Reason:</p>
              <p className="text-sm text-red-600">{request.rejectionReason}</p>
            </div>
          )}
        </div>

        <div className="ml-4">
          {getStatusBadge(request.status)}
        </div>
      </div>
    </div>
  );
};

// SuperAdmin's view of admin requests (for SuperAdminPlanRequestsPage)
export const SuperAdminPlanRequestCard = ({ request, onApprove, onReject }) => {
  const currentPlan = PLANS[request.currentPlan || 'basic'];
  const requestedPlan = PLANS[request.requestedPlan];
  const CurrentIcon = currentPlan.icon;
  const RequestedIcon = requestedPlan.icon;
  const isPending = request.status === 'pending';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Admin Info */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-blue-100 rounded-full p-2">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{request.admin?.name || 'Admin'}</h3>
              <p className="text-sm text-gray-600">{request.admin?.email || 'N/A'}</p>
            </div>
          </div>

          {/* Plan Change */}
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center space-x-2">
              <div className={`p-2 rounded-lg ${currentPlan.bgClass}`}>
                <CurrentIcon className={`w-5 h-5 ${currentPlan.colorClass}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Current</p>
                <p className="text-sm font-medium text-gray-900">{currentPlan.name}</p>
              </div>
            </div>
            <div className="text-gray-400">→</div>
            <div className="flex items-center space-x-2">
              <div className={`p-2 rounded-lg ${requestedPlan.bgClass}`}>
                <RequestedIcon className={`w-5 h-5 ${requestedPlan.colorClass}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Requested</p>
                <p className="text-sm font-medium text-gray-900">{requestedPlan.name}</p>
              </div>
            </div>
          </div>

          {/* Message */}
          {request.message && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700">{request.message}</p>
            </div>
          )}

          {/* Status and Date */}
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{formatDate(request.createdAt)}</span>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              isPending
                ? 'bg-yellow-100 text-yellow-700'
                : request.status === 'approved'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {request.status || 'pending'}
            </span>
          </div>
        </div>

        {/* Actions */}
        {isPending && (
          <div className="flex flex-col space-y-2 ml-4">
            <button
              onClick={() => onApprove(request.id)}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </button>
            <button
              onClick={() => onReject(request.id)}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
};





