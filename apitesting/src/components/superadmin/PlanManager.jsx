import React, { useState } from 'react';
import { X, Crown, Zap, Gift, Mail, ExternalLink, CheckCircle } from 'lucide-react';

const PLANS = {
  basic: {
    name: 'Basic (Free)',
    icon: Gift,
    colorClass: 'blue',
    bgColorClass: 'bg-blue-100',
    textColorClass: 'text-blue-600',
    borderColorClass: 'border-blue-500',
    bgLightClass: 'bg-blue-50',
    orgLimit: 2,
    description: 'Perfect for getting started'
  },
  advanced: {
    name: 'Advanced',
    icon: Zap,
    colorClass: 'purple',
    bgColorClass: 'bg-purple-100',
    textColorClass: 'text-purple-600',
    borderColorClass: 'border-purple-500',
    bgLightClass: 'bg-purple-50',
    orgLimit: 4,
    description: 'For growing businesses'
  },
  premium: {
    name: 'Premium',
    icon: Crown,
    colorClass: 'yellow',
    bgColorClass: 'bg-yellow-100',
    textColorClass: 'text-yellow-600',
    borderColorClass: 'border-yellow-500',
    bgLightClass: 'bg-yellow-50',
    orgLimit: 'Unlimited',
    description: 'Contact IoTify for premium access',
    requiresContact: true
  }
};

const PlanManager = ({ admin, onClose, onUpdatePlan }) => {
  const [selectedPlan, setSelectedPlan] = useState(admin.plan || 'basic');
  const [loading, setLoading] = useState(false);

  const handleUpdatePlan = async () => {
    if (selectedPlan === 'premium') {
      // For premium, show contact information
      const contactEmail = 'contact@iotify.com';
      const subject = `Premium Plan Request - Admin: ${admin.name}`;
      const body = `Hello IoTify Team,\n\nI would like to upgrade Admin "${admin.name}" (${admin.email}) to Premium Plan.\n\nPlease process this request.\n\nThank you.`;
      window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      return;
    }

    setLoading(true);
    try {
      await onUpdatePlan(admin.id, selectedPlan);
      onClose();
    } catch (error) {
      console.error('Error updating plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentPlan = PLANS[admin.plan || 'basic'];
  const newPlan = PLANS[selectedPlan];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Manage Plan</h2>
            <p className="text-sm text-gray-600 mt-1">Admin: {admin.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Plan Info */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Current Plan</p>
              <div className="flex items-center space-x-2">
                {React.createElement(currentPlan.icon, { 
                  className: `w-5 h-5 ${currentPlan.textColorClass}` 
                })}
                <span className="text-lg font-semibold text-gray-900">{currentPlan.name}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Organization Limit</p>
              <p className="text-lg font-bold text-gray-900">
                {currentPlan.orgLimit === 'Unlimited' ? '∞' : currentPlan.orgLimit}
              </p>
            </div>
          </div>
          {/* Plan Expiration Warning for Basic Plan */}
          {admin.plan === 'basic' && admin.createdAt && (() => {
            const createdDate = new Date(admin.createdAt);
            const expirationDate = new Date(createdDate);
            expirationDate.setMonth(expirationDate.getMonth() + 4);
            const now = new Date();
            const daysUntilExpiry = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));
            const isExpired = now > expirationDate;
            
            if (isExpired || daysUntilExpiry <= 30) {
              return (
                <div className={`mt-3 p-3 rounded-lg ${
                  isExpired 
                    ? 'bg-red-50 border border-red-200' 
                    : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <p className={`text-sm font-semibold ${
                    isExpired ? 'text-red-900' : 'text-yellow-900'
                  }`}>
                    {isExpired 
                      ? '⚠️ Plan Expired - Account Blocked'
                      : `⚠️ Plan Expires in ${daysUntilExpiry} days`}
                  </p>
                  <p className={`text-xs mt-1 ${
                    isExpired ? 'text-red-700' : 'text-yellow-700'
                  }`}>
                    {isExpired
                      ? 'Basic plan expires after 4 months. Please upgrade to continue using the service.'
                      : 'Basic plan will expire after 4 months from account creation. Upgrade to avoid service interruption.'}
                  </p>
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* Plan Selection */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Plan</h3>
          <div className="space-y-3">
            {Object.entries(PLANS).map(([key, plan]) => {
              const Icon = plan.icon;
              const isSelected = selectedPlan === key;
              const isCurrent = (admin.plan || 'basic') === key;

              return (
                <div
                  key={key}
                  onClick={() => !plan.requiresContact && setSelectedPlan(key)}
                  className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? `${plan.borderColorClass} ${plan.bgLightClass}`
                      : 'border-gray-200 hover:border-gray-300'
                  } ${plan.requiresContact ? 'opacity-75' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`p-2 rounded-lg ${plan.bgColorClass}`}>
                        <Icon className={`w-6 h-6 ${plan.textColorClass}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-base font-semibold text-gray-900">{plan.name}</h4>
                          {isCurrent && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                        <div className="mt-2 flex items-center space-x-4">
                          <div>
                            <span className="text-xs text-gray-500">Organizations: </span>
                            <span className="text-sm font-semibold text-gray-900">
                              {plan.orgLimit === 'Unlimited' ? '∞ Unlimited' : `${plan.orgLimit} Organizations`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {isSelected && !plan.requiresContact && (
                        <CheckCircle className={`w-6 h-6 ${plan.textColorClass}`} />
                      )}
                      {plan.requiresContact && (
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <Mail className="w-4 h-4" />
                          <span>Contact Required</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Premium Plan Notice */}
          {selectedPlan === 'premium' && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <Mail className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-900">Premium Plan Requires Contact</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    To upgrade to Premium plan, please contact IoTify. An email will be opened for you to send your request.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Plan Comparison */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Plan Comparison</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Basic Plan:</span>
                <span className="font-medium text-gray-900">2 Organizations</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Advanced Plan:</span>
                <span className="font-medium text-gray-900">4 Organizations</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Premium Plan:</span>
                <span className="font-medium text-gray-900">Unlimited Organizations</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdatePlan}
            disabled={loading || selectedPlan === (admin.plan || 'basic')}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center space-x-2 ${
              selectedPlan === 'premium'
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-blue-600 hover:bg-blue-700'
            } ${loading || selectedPlan === (admin.plan || 'basic') ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {selectedPlan === 'premium' ? (
              <>
                <Mail className="w-4 h-4" />
                <span>Contact IoTify</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>{loading ? 'Updating...' : 'Update Plan'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanManager;

