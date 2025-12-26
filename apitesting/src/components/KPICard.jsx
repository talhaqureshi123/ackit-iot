import React from 'react';
import { Users, AlertTriangle, Zap } from 'lucide-react';

const KPICard = ({ title, value, icon: Icon, iconColor, bgColor }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-2 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-600 mb-0.5">{title}</p>
          <p className="text-base font-bold text-gray-900">{value}</p>
        </div>
        <div className={`${bgColor} rounded-full p-1.5`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
};

export default KPICard;

