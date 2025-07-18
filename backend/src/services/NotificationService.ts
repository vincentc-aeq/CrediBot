import { 
  notificationRepository, 
  notificationPreferencesRepository, 
  notificationHistoryRepository,
  notificationQueueRepository 
} from '../repositories/NotificationRepository';
import { 
  Notification, 
  NotificationType, 
  NotificationChannel, 
  NotificationStatus, 
  NotificationPriority,
  NotificationPreferences,
  NotificationQueue,
  NotificationAction
} from '../models/Notification';

export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  channel: NotificationChannel;
  priority?: NotificationPriority;
  scheduledAt?: Date;
  expiresAt?: Date;
  triggeredBy?: string;
}

export interface NotificationChannelHandler {
  send(notification: Notification): Promise<{ success: boolean; messageId?: string; error?: string }>;
  isAvailable(): Promise<boolean>;
}

export interface NotificationDeliveryResult {
  notificationId: string;
  channel: NotificationChannel;
  success: boolean;
  messageId?: string;
  error?: string;
  sentAt: Date;
}

export class NotificationService {
  private channelHandlers: Map<NotificationChannel, NotificationChannelHandler> = new Map();
  private defaultPreferences: NotificationPreferences;

  constructor() {
    this.initializeChannelHandlers();
    this.initializeDefaultPreferences();
  }

  /**
   * 創建通知
   */
  async createNotification(request: CreateNotificationRequest): Promise<string> {
    try {
      // 檢查用戶偏好設置
      const userPreferences = await this.getUserPreferences(request.userId);
      const shouldSend = this.shouldSendNotification(request, userPreferences);
      
      if (!shouldSend) {
        console.log(`Notification blocked by user preferences: ${request.type} for user ${request.userId}`);
        return '';
      }

      // 創建通知記錄
      const notification: Notification = {
        id: this.generateNotificationId(),
        userId: request.userId,
        type: request.type,
        title: request.title,
        message: request.message,
        data: request.data || {},
        channel: request.channel,
        status: NotificationStatus.PENDING,
        priority: request.priority || NotificationPriority.MEDIUM,
        triggeredBy: request.triggeredBy,
        expiresAt: request.expiresAt,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const savedNotification = await notificationRepository.create(notification);

      // 記錄創建行為
      await notificationHistoryRepository.logAction(
        savedNotification.id,
        request.userId,
        NotificationAction.CREATED
      );

      // 如果是即時發送，直接處理
      if (!request.scheduledAt) {
        await this.queueNotificationForDelivery(savedNotification);
      } else {
        // 否則加入排程隊列
        await this.scheduleNotification(savedNotification, request.scheduledAt);
      }

      return savedNotification.id;

    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * 發送通知
   */
  async sendNotification(notificationId: string): Promise<NotificationDeliveryResult> {
    try {
      const notification = await notificationRepository.findById(notificationId);
      if (!notification) {
        throw new Error(`Notification ${notificationId} not found`);
      }

      // 檢查通知是否已過期
      if (notification.expiresAt && notification.expiresAt < new Date()) {
        await this.markNotificationAsExpired(notification);
        return {
          notificationId,
          channel: notification.channel,
          success: false,
          error: 'Notification expired',
          sentAt: new Date()
        };
      }

      // 獲取通道處理器
      const handler = this.channelHandlers.get(notification.channel);
      if (!handler) {
        throw new Error(`No handler found for channel: ${notification.channel}`);
      }

      // 檢查通道是否可用
      const isAvailable = await handler.isAvailable();
      if (!isAvailable) {
        throw new Error(`Channel ${notification.channel} is not available`);
      }

      // 發送通知
      const result = await handler.send(notification);

      // 更新通知狀態
      if (result.success) {
        await notificationRepository.update(notificationId, {
          status: NotificationStatus.SENT,
          updatedAt: new Date()
        });

        await notificationHistoryRepository.logAction(
          notificationId,
          notification.userId,
          NotificationAction.SENT,
          { messageId: result.messageId }
        );
      } else {
        await notificationRepository.update(notificationId, {
          status: NotificationStatus.FAILED,
          updatedAt: new Date()
        });

        await notificationHistoryRepository.logAction(
          notificationId,
          notification.userId,
          NotificationAction.FAILED,
          { error: result.error }
        );
      }

      return {
        notificationId,
        channel: notification.channel,
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        sentAt: new Date()
      };

    } catch (error) {
      console.error('Error sending notification:', error);
      return {
        notificationId,
        channel: NotificationChannel.IN_APP,
        success: false,
        error: error.message,
        sentAt: new Date()
      };
    }
  }

  /**
   * 獲取用戶通知
   */
  async getUserNotifications(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      types?: NotificationType[];
    }
  ): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }> {
    try {
      const [notifications, unreadCount] = await Promise.all([
        notificationRepository.findByUserId(userId, options),
        notificationRepository.getUnreadCount(userId, options?.types)
      ]);

      return {
        notifications,
        total: notifications.length,
        unreadCount
      };

    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * 標記通知為已讀
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const success = await notificationRepository.markAsRead(notificationId, userId);
      
      if (success) {
        await notificationHistoryRepository.logAction(
          notificationId,
          userId,
          NotificationAction.READ
        );
      }

      return success;

    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * 標記所有通知為已讀
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const affectedCount = await notificationRepository.markAllAsRead(userId);
      
      // 記錄批次讀取行為
      if (affectedCount > 0) {
        await notificationHistoryRepository.logAction(
          'bulk',
          userId,
          NotificationAction.READ,
          { affectedCount }
        );
      }

      return affectedCount;

    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return 0;
    }
  }

  /**
   * 拒絕通知
   */
  async dismissNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const success = await notificationRepository.dismissNotification(notificationId, userId);
      
      if (success) {
        await notificationHistoryRepository.logAction(
          notificationId,
          userId,
          NotificationAction.DISMISSED
        );
      }

      return success;

    } catch (error) {
      console.error('Error dismissing notification:', error);
      return false;
    }
  }

  /**
   * 更新用戶通知偏好
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const currentPreferences = await this.getUserPreferences(userId);
      
      const updatedPreferences: NotificationPreferences = {
        ...currentPreferences,
        ...preferences,
        userId,
        updatedAt: new Date()
      };

      return await notificationPreferencesRepository.upsert(updatedPreferences);

    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * 獲取用戶通知偏好
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const preferences = await notificationPreferencesRepository.findByUserId(userId);
      return preferences || this.getDefaultPreferences(userId);

    } catch (error) {
      console.error('Error getting user preferences:', error);
      return this.getDefaultPreferences(userId);
    }
  }

  /**
   * 處理通知點擊
   */
  async handleNotificationClick(
    notificationId: string,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await notificationHistoryRepository.logAction(
        notificationId,
        userId,
        NotificationAction.CLICKED,
        metadata
      );

      // 可以在這裡添加其他點擊追蹤邏輯

    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  }

  /**
   * 獲取通知統計
   */
  async getNotificationStats(
    userId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    total: number;
    read: number;
    dismissed: number;
    byType: Record<string, number>;
    byChannel: Record<string, number>;
    engagement: {
      readRate: number;
      clickRate: number;
      dismissalRate: number;
    };
  }> {
    try {
      const [notificationStats, actionStats] = await Promise.all([
        notificationRepository.getNotificationStats(userId, dateRange),
        notificationHistoryRepository.getUserActionStats(userId, dateRange)
      ]);

      const clicked = actionStats[NotificationAction.CLICKED] || 0;
      const total = notificationStats.total;

      return {
        ...notificationStats,
        engagement: {
          readRate: total > 0 ? notificationStats.read / total : 0,
          clickRate: total > 0 ? clicked / total : 0,
          dismissalRate: total > 0 ? notificationStats.dismissed / total : 0
        }
      };

    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }

  /**
   * 清理過期通知
   */
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      const expiredNotifications = await notificationRepository.findExpiredNotifications();
      
      if (expiredNotifications.length === 0) {
        return 0;
      }

      const expiredIds = expiredNotifications.map(n => n.id);
      const affectedCount = await notificationRepository.markAsExpired(expiredIds);

      // 記錄過期行為
      for (const notification of expiredNotifications) {
        await notificationHistoryRepository.logAction(
          notification.id,
          notification.userId,
          NotificationAction.EXPIRED
        );
      }

      return affectedCount;

    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      return 0;
    }
  }

  // ===========================================
  // 私有方法
  // ===========================================

  /**
   * 初始化通道處理器
   */
  private initializeChannelHandlers(): void {
    // 應用內通知處理器
    this.channelHandlers.set(NotificationChannel.IN_APP, new InAppNotificationHandler());
    
    // 推送通知處理器
    this.channelHandlers.set(NotificationChannel.PUSH, new PushNotificationHandler());
    
    // 郵件通知處理器
    this.channelHandlers.set(NotificationChannel.EMAIL, new EmailNotificationHandler());
    
    // SMS通知處理器（如果需要）
    // this.channelHandlers.set(NotificationChannel.SMS, new SMSNotificationHandler());
  }

  /**
   * 初始化默認偏好設置
   */
  private initializeDefaultPreferences(): void {
    this.defaultPreferences = {
      id: '',
      userId: '',
      transactionSuggestions: {
        enabled: true,
        channels: [NotificationChannel.IN_APP],
        minimumBenefit: 5,
        frequency: 'immediate'
      },
      portfolioOptimization: {
        enabled: true,
        channels: [NotificationChannel.IN_APP],
        frequency: 'weekly'
      },
      spendingAlerts: {
        enabled: true,
        channels: [NotificationChannel.IN_APP],
        thresholds: {
          dailyLimit: 500,
          monthlyLimit: 3000,
          categoryLimits: {}
        }
      },
      rewardMilestones: {
        enabled: true,
        channels: [NotificationChannel.IN_APP],
        milestones: [100, 250, 500, 1000]
      },
      systemNotifications: {
        enabled: true,
        channels: [NotificationChannel.IN_APP]
      },
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'Asia/Taipei'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * 檢查是否應該發送通知
   */
  private shouldSendNotification(
    request: CreateNotificationRequest,
    preferences: NotificationPreferences
  ): boolean {
    switch (request.type) {
      case NotificationType.TRANSACTION_SUGGESTION:
        return preferences.transactionSuggestions.enabled &&
               preferences.transactionSuggestions.channels.includes(request.channel);
      
      case NotificationType.PORTFOLIO_OPTIMIZATION:
        return preferences.portfolioOptimization.enabled &&
               preferences.portfolioOptimization.channels.includes(request.channel);
      
      case NotificationType.SPENDING_ALERT:
        return preferences.spendingAlerts.enabled &&
               preferences.spendingAlerts.channels.includes(request.channel);
      
      case NotificationType.REWARD_MILESTONE:
        return preferences.rewardMilestones.enabled &&
               preferences.rewardMilestones.channels.includes(request.channel);
      
      case NotificationType.SYSTEM_ANNOUNCEMENT:
        return preferences.systemNotifications.enabled &&
               preferences.systemNotifications.channels.includes(request.channel);
      
      default:
        return true;
    }
  }

  /**
   * 加入通知傳送隊列
   */
  private async queueNotificationForDelivery(notification: Notification): Promise<void> {
    const queueItem: NotificationQueue = {
      id: this.generateQueueId(),
      notificationId: notification.id,
      userId: notification.userId,
      channel: notification.channel,
      priority: notification.priority,
      scheduledAt: new Date(),
      attempts: 0,
      maxAttempts: 3,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await notificationQueueRepository.create(queueItem);
  }

  /**
   * 排程通知
   */
  private async scheduleNotification(notification: Notification, scheduledAt: Date): Promise<void> {
    const queueItem: NotificationQueue = {
      id: this.generateQueueId(),
      notificationId: notification.id,
      userId: notification.userId,
      channel: notification.channel,
      priority: notification.priority,
      scheduledAt,
      attempts: 0,
      maxAttempts: 3,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await notificationQueueRepository.create(queueItem);
  }

  /**
   * 標記通知為過期
   */
  private async markNotificationAsExpired(notification: Notification): Promise<void> {
    await notificationRepository.update(notification.id, {
      status: NotificationStatus.EXPIRED,
      updatedAt: new Date()
    });

    await notificationHistoryRepository.logAction(
      notification.id,
      notification.userId,
      NotificationAction.EXPIRED
    );
  }

  /**
   * 獲取默認偏好設置
   */
  private getDefaultPreferences(userId: string): NotificationPreferences {
    return {
      ...this.defaultPreferences,
      id: this.generateNotificationId(),
      userId
    };
  }

  /**
   * 生成通知ID
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成隊列ID
   */
  private generateQueueId(): string {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ===========================================
// 通道處理器實現
// ===========================================

class InAppNotificationHandler implements NotificationChannelHandler {
  async send(notification: Notification): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // 應用內通知只需要存儲到數據庫即可
      // 前端會通過輪詢或WebSocket獲取
      console.log(`Delivered in-app notification: ${notification.id}`);
      
      return {
        success: true,
        messageId: `in_app_${notification.id}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    return true; // 應用內通知總是可用
  }
}

class PushNotificationHandler implements NotificationChannelHandler {
  async send(notification: Notification): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // 這裡應該集成推送服務（如 FCM, APNS）
      console.log(`Would send push notification: ${notification.title}`);
      
      // 模擬推送發送
      const success = Math.random() > 0.1; // 90% 成功率
      
      if (success) {
        return {
          success: true,
          messageId: `push_${Date.now()}`
        };
      } else {
        return {
          success: false,
          error: 'Push notification delivery failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    // 檢查推送服務狀態
    return true;
  }
}

class EmailNotificationHandler implements NotificationChannelHandler {
  async send(notification: Notification): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // 這裡應該集成郵件服務（如 SendGrid）
      console.log(`Would send email notification: ${notification.title}`);
      
      // 模擬郵件發送
      const success = Math.random() > 0.05; // 95% 成功率
      
      if (success) {
        return {
          success: true,
          messageId: `email_${Date.now()}`
        };
      } else {
        return {
          success: false,
          error: 'Email delivery failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    // 檢查郵件服務狀態
    return true;
  }
}

export const notificationService = new NotificationService();