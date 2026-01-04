import React, { useEffect } from 'react';
import { X, CheckCircle, XCircle, Info, AlertCircle } from 'lucide-react';

const NotificationToast = ({ notification, onClose }) => {
  const { id, type, message, data } = notification;

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [id, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div
      className={`${getBgColor()} border rounded-lg shadow-lg p-4 mb-3 flex items-start gap-3 animate-slide-in-right max-w-md`}
    >
      <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{message}</p>
        {data?.deviceName && (
          <p className="text-xs text-gray-500 mt-1">
            Device: {data.deviceName} {data.serialNumber && `(${data.serialNumber})`}
          </p>
        )}
        {data?.venueName && (
          <p className="text-xs text-gray-500 mt-1">Venue: {data.venueName}</p>
        )}
        {data?.organizationName && (
          <p className="text-xs text-gray-500 mt-1">Organization: {data.organizationName}</p>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default NotificationToast;


