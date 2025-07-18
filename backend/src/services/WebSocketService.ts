import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/UserRepository';
import { TransactionNotificationData } from './NotificationService';

export interface SocketUser {
  id: string;
  userId: string;
  username: string;
  connectedAt: Date;
}

export interface NotificationPayload {
  type: 'transaction_notification' | 'recommendation_update' | 'system_alert';
  data: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: Date;
}

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, SocketUser> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware - make it optional for development
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        // In development mode, allow connections without authentication
        if (!token) {
          if (process.env.NODE_ENV === 'development') {
            socket.userId = 'dev_user';
            socket.username = 'Development User';
            return next();
          }
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        const user = await userRepository.findById(decoded.userId);
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user.id.toString();
        socket.username = user.firstName + ' ' + user.lastName;
        next();
      } catch (error) {
        // In development mode, fallback to development user
        if (process.env.NODE_ENV === 'development') {
          socket.userId = 'dev_user';
          socket.username = 'Development User';
          return next();
        }
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.username} (${socket.id})`);

      // Record connected user
      const socketUser: SocketUser = {
        id: socket.id,
        userId: socket.userId,
        username: socket.username,
        connectedAt: new Date()
      };

      this.connectedUsers.set(socket.id, socketUser);

      // Maintain userId -> socketIds mapping
      if (!this.userSockets.has(socket.userId)) {
        this.userSockets.set(socket.userId, new Set());
      }
      this.userSockets.get(socket.userId)!.add(socket.id);

      // Send connection success message
      socket.emit('connected', {
        message: 'Successfully connected to notification service',
        timestamp: new Date()
      });

      // Handle user joining notification channel
      socket.on('join_notifications', (data) => {
        const { preferences } = data;
        socket.join(`user_${socket.userId}`);
        socket.join('notifications');
        
        // Store user notification preferences
        socket.notificationPreferences = preferences;
        
        socket.emit('joined_notifications', {
          message: 'Joined notification channel',
          timestamp: new Date()
        });
      });

      // Handle notification preference updates
      socket.on('update_notification_preferences', (preferences) => {
        socket.notificationPreferences = preferences;
        console.log(`Updated notification preferences for user ${socket.userId}`);
      });

      // Handle notification acknowledgment
      socket.on('acknowledge_notification', (data) => {
        const { notificationId, action } = data;
        console.log(`Notification ${notificationId} acknowledged with action: ${action}`);
        
        // Here we can record notification acknowledgment to database
        // await notificationRepository.acknowledge(notificationId, action);
      });

      // Handle heartbeat
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date() });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`User disconnected: ${socket.username} (${socket.id}), reason: ${reason}`);
        
        // Clean up connection records
        this.connectedUsers.delete(socket.id);
        
        const userSocketIds = this.userSockets.get(socket.userId);
        if (userSocketIds) {
          userSocketIds.delete(socket.id);
          if (userSocketIds.size === 0) {
            this.userSockets.delete(socket.userId);
          }
        }
      });

      // Error handling
      socket.on('error', (error) => {
        console.error(`Socket error for user ${socket.username}:`, error);
      });
    });
  }

  /**
   * Send notification to specific user
   */
  public sendNotificationToUser(userId: string, notification: NotificationPayload) {
    const userSocketIds = this.userSockets.get(userId);
    
    if (!userSocketIds || userSocketIds.size === 0) {
      console.log(`User ${userId} not connected, skipping notification`);
      return false;
    }

    let sent = false;
    
    userSocketIds.forEach(socketId => {
      const socket = this.io.sockets.sockets.get(socketId);
      
      if (socket) {
        // Check user notification preferences
        if (this.shouldSendNotification(socket, notification)) {
          socket.emit('notification', notification);
          sent = true;
        }
      }
    });

    return sent;
  }

  /**
   * Send transaction notification
   */
  public sendTransactionNotification(userId: string, notificationData: TransactionNotificationData) {
    const payload: NotificationPayload = {
      type: 'transaction_notification',
      data: notificationData,
      priority: notificationData.severity,
      timestamp: new Date()
    };

    return this.sendNotificationToUser(userId, payload);
  }

  /**
   * Broadcast system alert
   */
  public broadcastSystemAlert(message: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium') {
    const payload: NotificationPayload = {
      type: 'system_alert',
      data: { message },
      priority,
      timestamp: new Date()
    };

    this.io.to('notifications').emit('notification', payload);
  }

  /**
   * Send recommendation update notification
   */
  public sendRecommendationUpdate(userId: string, updateData: any) {
    const payload: NotificationPayload = {
      type: 'recommendation_update',
      data: updateData,
      priority: 'medium',
      timestamp: new Date()
    };

    return this.sendNotificationToUser(userId, payload);
  }

  /**
   * Check if notification should be sent
   */
  private shouldSendNotification(socket: any, notification: NotificationPayload): boolean {
    const preferences = socket.notificationPreferences;
    
    if (!preferences || !preferences.enabled) {
      return false;
    }

    // Check if notification type is enabled
    if (preferences.enabledTypes && !preferences.enabledTypes.includes(notification.type)) {
      return false;
    }

    // Check if priority meets minimum requirement
    const priorityOrder = { low: 1, medium: 2, high: 3, urgent: 4 };
    if (preferences.minPriority && priorityOrder[notification.priority] < priorityOrder[preferences.minPriority]) {
      return false;
    }

    return true;
  }

  /**
   * Get connected user statistics
   */
  public getConnectionStats() {
    return {
      totalConnections: this.connectedUsers.size,
      uniqueUsers: this.userSockets.size,
      connectionsPerUser: Array.from(this.userSockets.entries()).map(([userId, socketIds]) => ({
        userId,
        connections: socketIds.size
      }))
    };
  }

  /**
   * Get specific user's connection status
   */
  public getUserConnectionStatus(userId: string) {
    const userSocketIds = this.userSockets.get(userId);
    return {
      isConnected: userSocketIds ? userSocketIds.size > 0 : false,
      connectionCount: userSocketIds ? userSocketIds.size : 0,
      socketIds: userSocketIds ? Array.from(userSocketIds) : []
    };
  }

  /**
   * Force disconnect user
   */
  public disconnectUser(userId: string, reason: string = 'Forced disconnection') {
    const userSocketIds = this.userSockets.get(userId);
    
    if (userSocketIds) {
      userSocketIds.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('force_disconnect', { reason });
          socket.disconnect(true);
        }
      });
    }
  }

  /**
   * Clean up expired connections
   */
  public cleanupExpiredConnections() {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    this.connectedUsers.forEach((user, socketId) => {
      if (now.getTime() - user.connectedAt.getTime() > maxAge) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('session_expired', { message: 'Session expired' });
          socket.disconnect(true);
        }
      }
    });
  }
}

// Extend Socket type
declare module 'socket.io' {
  interface Socket {
    userId: string;
    username: string;
    notificationPreferences?: any;
  }
}

export default WebSocketService;