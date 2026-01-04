import React from 'react';
import NotificationToast from './NotificationToast';

const NotificationContainer = ({ notifications, onRemoveNotification }) => {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onClose={onRemoveNotification}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;


