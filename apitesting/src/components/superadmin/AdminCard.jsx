import React from 'react';
import { Eye, Ban, CheckCircle, Mail, Calendar, User, Shield, Crown, Zap, Gift, Settings } from 'lucide-react';

const AdminCard = ({ admin, onViewDetails, onSuspend, onResume, onManagePlan }) => {
  const isActive = admin.status === 'active';

  const getPlanInfo = (plan) => {
    switch (plan) {
      case 'premium':
        return { icon: Crown, colorClass: 'text-yellow-500', name: 'Premium', limit: '∞' };
      case 'advanced':
        return { icon: Zap, colorClass: 'text-purple-500', name: 'Advanced', limit: 4 };
      default:
        return { icon: Gift, colorClass: 'text-blue-500', name: 'Basic', limit: 2 };
    }
  };

  const planInfo = getPlanInfo(admin.plan || 'basic');
  const PlanIcon = planInfo.icon;

  return (
    <div className="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden hover:border-blue-200">
      {/* Card Header with Gradient */}
      <div className="h-2 bg-gradient-to-r from-red-500 to-rose-500"></div>
      
      <div className="p-6">
        {/* Top Section - Avatar and Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`relative ${isActive ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'} rounded-full p-3 shadow-lg`}>
              <User className="w-6 h-6 text-white" />
              {isActive && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                {admin.name || 'Admin User'}
              </h3>
              <div className="flex items-center mt-1">
                <Shield className="w-3 h-3 text-gray-400 mr-1" />
                <span className="text-xs text-gray-500 font-medium">Administrator</span>
              </div>
            </div>
          </div>
          
          {/* Status Badge */}
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
            isActive 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <span className={`w-2 h-2 rounded-full mr-2 ${isActive ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
            {isActive ? 'Active' : 'Suspended'}
          </span>
        </div>

        {/* Info Section */}
        <div className="space-y-3 mb-4">
          {/* Email */}
          <div className="flex items-center text-sm text-gray-600">
            <Mail className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
            <span className="truncate">{admin.email || 'No email'}</span>
          </div>
          
          {/* Created Date */}
          {admin.createdAt && (
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
              <span>Joined {new Date(admin.createdAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}</span>
            </div>
          )}

          {/* Plan Info */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <PlanIcon className={`w-4 h-4 ${planInfo.colorClass} mr-2 flex-shrink-0`} />
              <span className="text-gray-600">
                <span className="font-semibold text-gray-900">{planInfo.name}</span>
                {' '}• {planInfo.limit === '∞' ? 'Unlimited' : `${planInfo.limit}`} Organizations
              </span>
            </div>
            {admin.plan === 'basic' && admin.createdAt && (() => {
              const createdDate = new Date(admin.createdAt);
              const expirationDate = new Date(createdDate);
              expirationDate.setMonth(expirationDate.getMonth() + 4);
              const now = new Date();
              const daysUntilExpiry = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));
              const isExpired = now > expirationDate;
              
              if (isExpired || daysUntilExpiry <= 30) {
                return (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    isExpired 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {isExpired ? 'Expired' : `${daysUntilExpiry}d left`}
                  </span>
                );
              }
              return null;
            })()}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-2 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <button
              onClick={onViewDetails}
              className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 group/btn"
              title="View Details"
            >
              <Eye className="w-4 h-4 mr-1.5 group-hover/btn:scale-110 transition-transform" />
              View
            </button>
            
            <div className="flex items-center space-x-2">
              {isActive ? (
                <button
                  onClick={() => onSuspend(admin.id, 'Suspended by Super Admin')}
                  className="flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 group/btn"
                  title="Suspend Admin"
                >
                  <Ban className="w-4 h-4 mr-1.5 group-hover/btn:scale-110 transition-transform" />
                  Suspend
                </button>
              ) : (
                <button
                  onClick={() => onResume(admin.id)}
                  className="flex items-center px-3 py-2 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all duration-200 group/btn"
                  title="Resume Admin"
                >
                  <CheckCircle className="w-4 h-4 mr-1.5 group-hover/btn:scale-110 transition-transform" />
                  Resume
                </button>
              )}
            </div>
          </div>
          
          <button
            onClick={() => onManagePlan(admin)}
            className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-all duration-200 group/btn border border-purple-200"
            title="Manage Plan"
          >
            <Settings className="w-4 h-4 mr-1.5 group-hover/btn:scale-110 transition-transform" />
            Manage Plan
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminCard;

