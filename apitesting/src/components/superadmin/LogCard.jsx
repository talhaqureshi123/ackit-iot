import React from 'react';
import { Activity, Clock, User } from 'lucide-react';

const LogCard = ({ log }) => {
  const getTargetTypeColor = (targetType) => {
    switch (targetType) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'organization':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ac':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start space-x-3 mb-3">
            <div className="bg-blue-50 rounded-lg p-2 flex-shrink-0">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 mb-1 break-words">
                {log.action || 'Activity'}
              </h3>
              <p className="text-sm text-gray-600 mb-2 break-words">
                {typeof log.details === 'object' 
                  ? (log.details?.message || JSON.stringify(log.details)) 
                  : (log.details || 'No details available')}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            {log.createdAt && (
              <div className="flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                <span>
                  {new Date(log.createdAt).toLocaleString('en-PK', { 
                    timeZone: 'Asia/Karachi',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
            {log.admin && (
              <div className="flex items-center">
                <User className="w-3.5 h-3.5 mr-1.5" />
                <span className="text-blue-600 font-medium">
                  {log.admin.name} ({log.admin.email})
                </span>
              </div>
            )}
          </div>
        </div>
        
        {log.targetType && (
          <div className="flex-shrink-0">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getTargetTypeColor(log.targetType)}`}>
              {log.targetType}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogCard;





