import React, { useState } from 'react';
import { Crown, Zap, Gift, Mail, Send, X, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

const PLANS = {
  basic: {
    name: 'Basic (Free)',
    icon: Gift,
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    orgLimit: 2,
    venueLimit: 2
  },
  advanced: {
    name: 'Advanced',
    icon: Zap,
    colorClass: 'text-purple-600',
    bgClass: 'bg-purple-50',
    borderClass: 'border-purple-200',
    orgLimit: 4,
    venueLimit: 8
  },
  premium: {
    name: 'Premium',
    icon: Crown,
    colorClass: 'text-yellow-600',
    bgClass: 'bg-yellow-50',
    borderClass: 'border-yellow-200',
    orgLimit: 'Unlimited',
    venueLimit: 'Unlimited'
  },
  custom: {
    name: 'Custom',
    icon: Settings,
    colorClass: 'text-green-600',
    bgClass: 'bg-green-50',
    borderClass: 'border-green-200',
    orgLimit: 'Custom',
    venueLimit: 'Custom'
  }
};

const PlanUpgradeRequest = ({ currentPlan, onRequestUpgrade, onClose }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const currentPlanInfo = PLANS[currentPlan || 'basic'];
  const availableUpgrades = Object.entries(PLANS).filter(([key]) => {
    if (currentPlan === 'basic') return key === 'advanced' || key === 'premium' || key === 'custom';
    if (currentPlan === 'advanced') return key === 'premium' || key === 'custom';
    if (currentPlan === 'premium') return key === 'custom';
    return false;
  });

  const handleSubmit = async () => {
    if (!selectedPlan) {
      toast.error('Please select a plan to upgrade to');
      return;
    }

    setLoading(true);
    try {
      await onRequestUpgrade(selectedPlan, message);
      onClose();
    } catch (error) {
      console.error('Error submitting request:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Request Plan Upgrade</h2>
            <p className="text-sm text-gray-600 mt-1">Upgrade your current plan to get more features</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Plan */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Current Plan</p>
              <div className="flex items-center space-x-2">
                {React.createElement(currentPlanInfo.icon, { 
                  className: `w-5 h-5 ${currentPlanInfo.colorClass}` 
                })}
                <span className="text-lg font-semibold text-gray-900">{currentPlanInfo.name}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="mb-2">
                <p className="text-sm text-gray-600">Organization Limit</p>
                <p className="text-lg font-bold text-gray-900">
                  {currentPlanInfo.orgLimit === 'Unlimited' || currentPlanInfo.orgLimit === 'Custom' 
                    ? (currentPlanInfo.orgLimit === 'Unlimited' ? '∞' : 'Custom') 
                    : currentPlanInfo.orgLimit}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Venue Limit</p>
                <p className="text-lg font-bold text-gray-900">
                  {currentPlanInfo.venueLimit === 'Unlimited' || currentPlanInfo.venueLimit === 'Custom' 
                    ? (currentPlanInfo.venueLimit === 'Unlimited' ? '∞' : 'Custom') 
                    : currentPlanInfo.venueLimit}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Available Upgrades */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Upgrades</h3>
          <div className="space-y-3">
            {availableUpgrades.map(([key, plan]) => {
              const Icon = plan.icon;
              const isSelected = selectedPlan === key;
              const isPremium = key === 'premium';
              const isCustom = key === 'custom';

              return (
                <div
                  key={key}
                  onClick={() => setSelectedPlan(key)}
                  className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? `${plan.borderClass} ${plan.bgClass}`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`p-2 rounded-lg ${plan.bgClass}`}>
                        <Icon className={`w-6 h-6 ${plan.colorClass}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-base font-semibold text-gray-900">{plan.name}</h4>
                          {(isPremium || isCustom) && (
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              isPremium 
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              Contact Required
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {isPremium 
                            ? 'Unlimited organizations & venues - Contact Super Admin for approval'
                            : isCustom
                            ? 'Custom organizations & venues - Contact Super Admin for approval'
                            : `${plan.orgLimit} Organizations, ${plan.venueLimit} Venues`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {isSelected && (
                        <CheckCircle className={`w-6 h-6 ${plan.colorClass}`} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Message Section */}
          {selectedPlan && (
            <div className="mt-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Additional Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell Super Admin why you need this upgrade..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows="4"
              />
            </div>
          )}

          {/* Premium/Custom Notice */}
          {(selectedPlan === 'premium' || selectedPlan === 'custom') && (
            <div className={`mt-4 p-4 border rounded-lg ${
              selectedPlan === 'premium'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-start space-x-2">
                <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  selectedPlan === 'premium' ? 'text-yellow-600' : 'text-green-600'
                }`} />
                <div>
                  <p className={`text-sm font-semibold ${
                    selectedPlan === 'premium' ? 'text-yellow-900' : 'text-green-900'
                  }`}>
                    {selectedPlan === 'premium' ? 'Premium Plan' : 'Custom Plan'} Requires Approval
                  </p>
                  <p className={`text-sm mt-1 ${
                    selectedPlan === 'premium' ? 'text-yellow-700' : 'text-green-700'
                  }`}>
                    Your request will be sent to Super Admin for review. You will be notified once approved.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedPlan || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? 'Sending...' : 'Send Request'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanUpgradeRequest;



