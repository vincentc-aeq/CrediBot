import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

interface WebSocketConfig {
  autoConnect?: boolean;
  enableReconnection?: boolean;
  maxReconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface ConnectionStats {
  isConnected: boolean;
  connectionCount: number;
  lastConnected?: Date;
  lastDisconnected?: Date;
  reconnectionAttempts: number;
}

const defaultConfig: Required<WebSocketConfig> = {
  autoConnect: true,
  enableReconnection: true,
  maxReconnectionAttempts: 5,
  reconnectionDelay: 1000,
};

const useWebSocket = (config: WebSocketConfig = {}) => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    isConnected: false,
    connectionCount: 0,
    reconnectionAttempts: 0,
  });
  
  const socketRef = useRef<Socket | null>(null);
  const reconnectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);
  
  // Use useMemo to stabilize finalConfig
  const finalConfig = useMemo(() => ({
    ...defaultConfig,
    ...config
  }), [config]);

  // Stable disconnect function
  const disconnect = useCallback(() => {
    if (reconnectionTimeoutRef.current) {
      clearTimeout(reconnectionTimeoutRef.current);
      reconnectionTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    isConnectingRef.current = false;
    setConnectionStats(prev => ({
      ...prev,
      isConnected: false,
      lastDisconnected: new Date(),
    }));
  }, []);

  // Connection function
  const connect = useCallback(() => {
    if (isConnectingRef.current || socketRef.current?.connected) {
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token && process.env.NODE_ENV !== 'development') {
      console.error('No auth token available for WebSocket connection');
      return;
    }

    isConnectingRef.current = true;
    const serverUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3001';
    
    try {
      const socketConfig: any = {
        transports: ['websocket', 'polling'],
        forceNew: true,
        timeout: 20000,
      };
      
      // Only add auth token if available
      if (token) {
        socketConfig.auth = { token };
      }
      
      socketRef.current = io(serverUrl, socketConfig);

      const socket = socketRef.current;

      // Connection successful
      socket.on('connect', () => {
        console.log('WebSocket connected:', socket.id);
        isConnectingRef.current = false;
        setConnectionStats(prev => ({
          ...prev,
          isConnected: true,
          connectionCount: prev.connectionCount + 1,
          lastConnected: new Date(),
          reconnectionAttempts: 0,
        }));

        // Join notification channel
        socket.emit('join_notifications', {
          preferences: {
            enabled: true,
            enabledTypes: ['transaction_notification', 'recommendation_update'],
            minPriority: 'low',
          },
        });
      });

      // Receive notifications
      socket.on('notification', (payload) => {
        console.log('Received notification:', payload);
        
        if (payload.type === 'transaction_notification') {
          addNotification(payload.data);
        } else if (payload.type === 'system_alert') {
          console.log('System alert:', payload.data.message);
        } else if (payload.type === 'recommendation_update') {
          console.log('Recommendation update:', payload.data);
        }
      });

      // Handle heartbeat
      socket.on('pong', (data) => {
        console.log('Received pong:', data.timestamp);
      });

      // Force disconnect
      socket.on('force_disconnect', (data) => {
        console.log('Force disconnect:', data.reason);
        disconnect();
      });

      // Session expired
      socket.on('session_expired', (data) => {
        console.log('Session expired:', data.message);
        disconnect();
      });

      // Disconnect handling
      socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        isConnectingRef.current = false;
        setConnectionStats(prev => ({
          ...prev,
          isConnected: false,
          lastDisconnected: new Date(),
        }));

        // Auto reconnection
        if (finalConfig.enableReconnection && reason !== 'io client disconnect') {
          if (reconnectionTimeoutRef.current) {
            clearTimeout(reconnectionTimeoutRef.current);
          }
          
          setConnectionStats(prev => {
            if (prev.reconnectionAttempts >= finalConfig.maxReconnectionAttempts) {
              console.log('Max reconnection attempts reached');
              return prev;
            }

            const delay = finalConfig.reconnectionDelay * Math.pow(2, prev.reconnectionAttempts);
            console.log(`Attempting reconnection in ${delay}ms (attempt ${prev.reconnectionAttempts + 1})`);

            reconnectionTimeoutRef.current = setTimeout(() => {
              reconnectionTimeoutRef.current = null;
              if (user) {
                connect();
              }
            }, delay);

            return {
              ...prev,
              reconnectionAttempts: prev.reconnectionAttempts + 1,
            };
          });
        }
      });

      // Connection error
      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error.message);
        isConnectingRef.current = false;
        setConnectionStats(prev => ({
          ...prev,
          isConnected: false,
          reconnectionAttempts: prev.reconnectionAttempts + 1,
        }));
      });

      // General error
      socket.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      isConnectingRef.current = false;
    }
  }, [user, finalConfig, addNotification, disconnect]);

  // Send heartbeat
  const sendHeartbeat = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('ping');
    }
  }, []);

  // Acknowledge notification
  const acknowledgeNotification = useCallback((notificationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('acknowledge_notification', { notificationId });
    }
  }, []);

  // Update notification preferences
  const updateNotificationPreferences = useCallback((preferences: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('update_notification_preferences', preferences);
    }
  }, []);

  // Auto connect - trigger when config changes or in development mode
  useEffect(() => {
    if (finalConfig.autoConnect && (user || process.env.NODE_ENV === 'development')) {
      connect();
    }

    // Cleanup function
    return () => {
      if (reconnectionTimeoutRef.current) {
        clearTimeout(reconnectionTimeoutRef.current);
        reconnectionTimeoutRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      isConnectingRef.current = false;
    };
  }, [user?.id, finalConfig.autoConnect]); // Only depend on user.id not the entire user object

  // Regular heartbeat
  useEffect(() => {
    if (connectionStats.isConnected) {
      const heartbeatInterval = setInterval(sendHeartbeat, 30000);
      return () => clearInterval(heartbeatInterval);
    }
  }, [connectionStats.isConnected, sendHeartbeat]);

  return {
    connectionStats,
    connect,
    disconnect,
    sendHeartbeat,
    acknowledgeNotification,
    updateNotificationPreferences,
    socket: socketRef.current,
  };
};

export default useWebSocket;