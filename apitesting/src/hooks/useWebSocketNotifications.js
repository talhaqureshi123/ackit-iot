import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_URL } from '../config/api';

/**
 * WebSocket hook for real-time notifications and sync
 * Supports room-based subscriptions (device, venue, organization)
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.deviceId - Device ID to subscribe to
 * @param {number} options.venueId - Venue ID to subscribe to
 * @param {number} options.organizationId - Organization ID to subscribe to
 * @param {Function} options.onDeviceConnected - Callback for device connected events
 * @param {Function} options.onDeviceDisconnected - Callback for device disconnected events
 * @param {Function} options.onDeviceUpdated - Callback for device updated events
 * @param {Function} options.onVenueUpdated - Callback for venue updated events
 * @param {Function} options.onOrganizationUpdated - Callback for organization updated events
 * @param {boolean} options.autoReconnect - Enable auto-reconnection (default: true)
 * @param {number} options.reconnectInterval - Reconnection interval in ms (default: 3000)
 */
export const useWebSocketNotifications = ({
  deviceId,
  venueId,
  organizationId,
  onDeviceConnected,
  onDeviceDisconnected,
  onDeviceUpdated,
  onVenueUpdated,
  onOrganizationUpdated,
  autoReconnect = true,
  reconnectInterval = 3000,
} = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const subscribedRoomsRef = useRef(new Set());

  // Subscribe to a room
  const subscribeToRoom = useCallback((roomName) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn(`⚠️ [WS] Cannot subscribe to ${roomName}: WebSocket not connected`);
      return;
    }

    if (subscribedRoomsRef.current.has(roomName)) {
      console.log(`ℹ️ [WS] Already subscribed to ${roomName}`);
      return;
    }

    wsRef.current.send(JSON.stringify({
      type: 'SUBSCRIBE_ROOM',
      room: roomName,
    }));

    subscribedRoomsRef.current.add(roomName);
    console.log(`📥 [WS] Subscribed to room: ${roomName}`);
  }, []);

  // Unsubscribe from a room
  const unsubscribeFromRoom = useCallback((roomName) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    if (!subscribedRoomsRef.current.has(roomName)) {
      return;
    }

    wsRef.current.send(JSON.stringify({
      type: 'UNSUBSCRIBE_ROOM',
      room: roomName,
    }));

    subscribedRoomsRef.current.delete(roomName);
    console.log(`📤 [WS] Unsubscribed from room: ${roomName}`);
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('ℹ️ [WS] Already connected');
      return;
    }

    try {
      console.log(`🔌 [WS] Connecting to ${WS_URL}`);
      wsRef.current = new WebSocket(WS_URL);

      wsRef.current.onopen = () => {
        console.log('✅ [WS] Connected to WebSocket server');
        setIsConnected(true);

        // Subscribe to rooms based on provided IDs
        if (deviceId) {
          subscribeToRoom(`device:${deviceId}`);
        }
        if (venueId) {
          subscribeToRoom(`venue:${venueId}`);
        }
        if (organizationId) {
          subscribeToRoom(`organization:${organizationId}`);
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 [WS] Message received:', message.type, message);

          // Handle subscription confirmations
          if (message.type === 'SUBSCRIBE_SUCCESS' || message.type === 'UNSUBSCRIBE_SUCCESS') {
            console.log(`✅ [WS] ${message.type}: ${message.room}`);
            return;
          }

          // Handle notification events
          switch (message.type) {
            case 'DEVICE_CONNECTED':
              console.log('🔔 [WS] DEVICE_CONNECTED event received:', message);
              console.log('🔔 [WS] Event serialNumber:', message.serialNumber, 'serial:', message.serial);
              setNotifications((prev) => [
                ...prev,
                {
                  id: Date.now(),
                  type: 'success',
                  message: message.message || `Device ${message.deviceName || message.serialNumber} is CONNECTED`,
                  data: message,
                },
              ]);
              if (onDeviceConnected) {
                console.log('🔔 [WS] Calling onDeviceConnected callback with message:', message);
                onDeviceConnected(message);
              } else {
                console.warn('⚠️ [WS] onDeviceConnected callback not provided!');
              }
              break;

            case 'DEVICE_DISCONNECTED':
              setNotifications((prev) => [
                ...prev,
                {
                  id: Date.now(),
                  type: 'error',
                  message: message.message || `Device ${message.deviceName || message.serialNumber} is DISCONNECTED`,
                  data: message,
                },
              ]);
              if (onDeviceDisconnected) {
                onDeviceDisconnected(message);
              }
              break;

            case 'DEVICE_UPDATED':
              setNotifications((prev) => [
                ...prev,
                {
                  id: Date.now(),
                  type: 'info',
                  message: `Device ${message.deviceName || message.serialNumber} updated`,
                  data: message,
                },
              ]);
              if (onDeviceUpdated) {
                onDeviceUpdated(message);
              }
              break;

            case 'VENUE_UPDATED':
              setNotifications((prev) => [
                ...prev,
                {
                  id: Date.now(),
                  type: 'info',
                  message: `Venue ${message.venueName} updated`,
                  data: message,
                },
              ]);
              if (onVenueUpdated) {
                onVenueUpdated(message);
              }
              break;

            case 'ORGANIZATION_UPDATED':
              setNotifications((prev) => [
                ...prev,
                {
                  id: Date.now(),
                  type: 'info',
                  message: `Organization ${message.organizationName} updated`,
                  data: message,
                },
              ]);
              if (onOrganizationUpdated) {
                onOrganizationUpdated(message);
              }
              break;

            default:
              // Handle legacy events (CONNECTED, DISCONNECTED, etc.)
              if (message.type === 'CONNECTED' || message.type === 'DISCONNECTED') {
                const isConnected = message.type === 'CONNECTED';
                setNotifications((prev) => [
                  ...prev,
                  {
                    id: Date.now(),
                    type: isConnected ? 'success' : 'error',
                    message: isConnected
                      ? `Device ${message.serialNumber || message.serial} is CONNECTED`
                      : `Device ${message.serialNumber || message.serial} is DISCONNECTED`,
                    data: message,
                  },
                ]);
              }
              break;
          }
        } catch (error) {
          console.error('❌ [WS] Error parsing message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ [WS] WebSocket error:', error);
        setIsConnected(false);
      };

      wsRef.current.onclose = () => {
        console.log('📡 [WS] WebSocket disconnected');
        setIsConnected(false);
        subscribedRoomsRef.current.clear();

        // Auto-reconnect if enabled
        if (autoReconnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 [WS] Attempting to reconnect...');
            connect();
          }, reconnectInterval);
        }
      };
    } catch (error) {
      console.error('❌ [WS] Connection error:', error);
      setIsConnected(false);
    }
  }, [deviceId, venueId, organizationId, subscribeToRoom, autoReconnect, reconnectInterval, onDeviceConnected, onDeviceDisconnected, onDeviceUpdated, onVenueUpdated, onOrganizationUpdated]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      // Unsubscribe from all rooms
      subscribedRoomsRef.current.forEach((roomName) => {
        unsubscribeFromRoom(roomName);
      });
      subscribedRoomsRef.current.clear();

      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    console.log('📡 [WS] Disconnected');
  }, [unsubscribeFromRoom]);

  // Effect to manage connection lifecycle
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Effect to update subscriptions when IDs change
  useEffect(() => {
    if (!isConnected || !wsRef.current) {
      return;
    }

    // Subscribe to new rooms
    if (deviceId) {
      subscribeToRoom(`device:${deviceId}`);
    }
    if (venueId) {
      subscribeToRoom(`venue:${venueId}`);
    }
    if (organizationId) {
      subscribeToRoom(`organization:${organizationId}`);
    }
  }, [deviceId, venueId, organizationId, isConnected, subscribeToRoom]);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Remove a specific notification
  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return {
    isConnected,
    notifications,
    connect,
    disconnect,
    subscribeToRoom,
    unsubscribeFromRoom,
    clearNotifications,
    removeNotification,
  };
};

