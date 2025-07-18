import { BaseRepository } from './BaseRepository';
import { 
  Notification, 
  NotificationPreferences, 
  NotificationHistory,
  NotificationQueue,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
  NotificationAction
} from '../models/Notification';

export class NotificationRepository extends BaseRepository<Notification> {
  constructor() {
    super('notifications');
  }

  /**
   * 根據用戶ID查找通知
   */
  async findByUserId(
    userId: string, 
    options?: {
      limit?: number;
      offset?: number;
      status?: NotificationStatus[];
      types?: NotificationType[];
      unreadOnly?: boolean;
    }
  ): Promise<Notification[]> {
    let query = this.db(this.tableName).where('userId', userId);

    if (options?.status) {
      query = query.whereIn('status', options.status);
    }

    if (options?.types) {
      query = query.whereIn('type', options.types);
    }

    if (options?.unreadOnly) {
      query = query.whereNull('readAt').where('status', '!=', NotificationStatus.DISMISSED);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    const rows = await query.orderBy('createdAt', 'desc');
    return rows.map(row => this.mapRowToEntity(row));
  }

  /**
   * 獲取未讀通知數量
   */
  async getUnreadCount(userId: string, types?: NotificationType[]): Promise<number> {
    let query = this.db(this.tableName)
      .where('userId', userId)
      .whereNull('readAt')
      .where('status', '!=', NotificationStatus.DISMISSED);

    if (types) {
      query = query.whereIn('type', types);
    }

    const result = await query.count('id as count').first();
    return parseInt(result?.count || '0', 10);
  }

  /**
   * 標記通知為已讀
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const affectedRows = await this.db(this.tableName)
      .where('id', notificationId)
      .where('userId', userId)
      .whereNull('readAt')
      .update({
        status: NotificationStatus.READ,
        readAt: new Date(),
        updatedAt: new Date()
      });

    return affectedRows > 0;
  }

  /**
   * 標記多個通知為已讀
   */
  async markMultipleAsRead(notificationIds: string[], userId: string): Promise<number> {
    const affectedRows = await this.db(this.tableName)
      .whereIn('id', notificationIds)
      .where('userId', userId)
      .whereNull('readAt')
      .update({
        status: NotificationStatus.READ,
        readAt: new Date(),
        updatedAt: new Date()
      });

    return affectedRows;
  }

  /**
   * 標記所有通知為已讀
   */
  async markAllAsRead(userId: string): Promise<number> {
    const affectedRows = await this.db(this.tableName)
      .where('userId', userId)
      .whereNull('readAt')
      .where('status', '!=', NotificationStatus.DISMISSED)
      .update({
        status: NotificationStatus.READ,
        readAt: new Date(),
        updatedAt: new Date()
      });

    return affectedRows;
  }

  /**
   * 拒絕通知
   */
  async dismissNotification(notificationId: string, userId: string): Promise<boolean> {
    const affectedRows = await this.db(this.tableName)
      .where('id', notificationId)
      .where('userId', userId)
      .update({
        status: NotificationStatus.DISMISSED,
        dismissedAt: new Date(),
        updatedAt: new Date()
      });

    return affectedRows > 0;
  }

  /**
   * 查找過期通知
   */
  async findExpiredNotifications(): Promise<Notification[]> {
    const rows = await this.db(this.tableName)
      .where('expiresAt', '<=', new Date())
      .whereNotIn('status', [NotificationStatus.EXPIRED, NotificationStatus.DISMISSED]);

    return rows.map(row => this.mapRowToEntity(row));
  }

  /**
   * 標記通知為過期
   */
  async markAsExpired(notificationIds: string[]): Promise<number> {
    return await this.db(this.tableName)
      .whereIn('id', notificationIds)
      .update({
        status: NotificationStatus.EXPIRED,
        updatedAt: new Date()
      });
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
  }> {
    let query = this.db(this.tableName).where('userId', userId);

    if (dateRange) {
      query = query.whereBetween('createdAt', [dateRange.start, dateRange.end]);
    }

    const [totalResult, readResult, dismissedResult, typeResults, channelResults] = await Promise.all([
      query.clone().count('id as count').first(),
      query.clone().whereNotNull('readAt').count('id as count').first(),
      query.clone().where('status', NotificationStatus.DISMISSED).count('id as count').first(),
      query.clone().select('type').count('id as count').groupBy('type'),
      query.clone().select('channel').count('id as count').groupBy('channel')
    ]);

    const byType: Record<string, number> = {};
    typeResults.forEach((row: any) => {
      byType[row.type] = parseInt(row.count, 10);
    });

    const byChannel: Record<string, number> = {};
    channelResults.forEach((row: any) => {
      byChannel[row.channel] = parseInt(row.count, 10);
    });

    return {
      total: parseInt(totalResult?.count || '0', 10),
      read: parseInt(readResult?.count || '0', 10),
      dismissed: parseInt(dismissedResult?.count || '0', 10),
      byType,
      byChannel
    };
  }

  protected mapRowToEntity(row: any): Notification {
    return {
      id: row.id,
      userId: row.userId,
      type: row.type,
      title: row.title,
      message: row.message,
      data: this.parseJson(row.data),
      channel: row.channel,
      status: row.status,
      priority: row.priority,
      triggeredBy: row.triggeredBy,
      readAt: row.readAt ? new Date(row.readAt) : undefined,
      dismissedAt: row.dismissedAt ? new Date(row.dismissedAt) : undefined,
      expiresAt: row.expiresAt ? new Date(row.expiresAt) : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  protected mapEntityToRow(entity: Notification): any {
    return {
      id: entity.id,
      userId: entity.userId,
      type: entity.type,
      title: entity.title,
      message: entity.message,
      data: JSON.stringify(entity.data),
      channel: entity.channel,
      status: entity.status,
      priority: entity.priority,
      triggeredBy: entity.triggeredBy,
      readAt: entity.readAt,
      dismissedAt: entity.dismissedAt,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }
}

export class NotificationPreferencesRepository extends BaseRepository<NotificationPreferences> {
  constructor() {
    super('notification_preferences');
  }

  /**
   * 根據用戶ID獲取偏好設置
   */
  async findByUserId(userId: string): Promise<NotificationPreferences | null> {
    const row = await this.db(this.tableName).where('userId', userId).first();
    return row ? this.mapRowToEntity(row) : null;
  }

  /**
   * 更新或創建用戶偏好
   */
  async upsert(preferences: NotificationPreferences): Promise<NotificationPreferences> {
    const existing = await this.findByUserId(preferences.userId);
    
    if (existing) {
      return await this.update(existing.id, {
        ...preferences,
        updatedAt: new Date()
      });
    } else {
      return await this.create(preferences);
    }
  }

  protected mapRowToEntity(row: any): NotificationPreferences {
    return {
      id: row.id,
      userId: row.userId,
      transactionSuggestions: this.parseJson(row.transactionSuggestions),
      portfolioOptimization: this.parseJson(row.portfolioOptimization),
      spendingAlerts: this.parseJson(row.spendingAlerts),
      rewardMilestones: this.parseJson(row.rewardMilestones),
      systemNotifications: this.parseJson(row.systemNotifications),
      quietHours: this.parseJson(row.quietHours),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  protected mapEntityToRow(entity: NotificationPreferences): any {
    return {
      id: entity.id,
      userId: entity.userId,
      transactionSuggestions: JSON.stringify(entity.transactionSuggestions),
      portfolioOptimization: JSON.stringify(entity.portfolioOptimization),
      spendingAlerts: JSON.stringify(entity.spendingAlerts),
      rewardMilestones: JSON.stringify(entity.rewardMilestones),
      systemNotifications: JSON.stringify(entity.systemNotifications),
      quietHours: JSON.stringify(entity.quietHours),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }
}

export class NotificationHistoryRepository extends BaseRepository<NotificationHistory> {
  constructor() {
    super('notification_history');
  }

  /**
   * 記錄通知行為
   */
  async logAction(
    notificationId: string,
    userId: string,
    action: NotificationAction,
    metadata?: Record<string, any>
  ): Promise<NotificationHistory> {
    const history: NotificationHistory = {
      id: this.generateId(),
      notificationId,
      userId,
      action,
      metadata,
      timestamp: new Date()
    };

    return await this.create(history);
  }

  /**
   * 獲取通知歷史
   */
  async findByNotificationId(notificationId: string): Promise<NotificationHistory[]> {
    const rows = await this.db(this.tableName)
      .where('notificationId', notificationId)
      .orderBy('timestamp', 'desc');

    return rows.map(row => this.mapRowToEntity(row));
  }

  /**
   * 獲取用戶行為統計
   */
  async getUserActionStats(
    userId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<Record<NotificationAction, number>> {
    let query = this.db(this.tableName)
      .where('userId', userId)
      .select('action')
      .count('id as count')
      .groupBy('action');

    if (dateRange) {
      query = query.whereBetween('timestamp', [dateRange.start, dateRange.end]);
    }

    const results = await query;
    const stats: Record<NotificationAction, number> = {} as any;

    results.forEach((row: any) => {
      stats[row.action as NotificationAction] = parseInt(row.count, 10);
    });

    return stats;
  }

  protected mapRowToEntity(row: any): NotificationHistory {
    return {
      id: row.id,
      notificationId: row.notificationId,
      userId: row.userId,
      action: row.action,
      metadata: this.parseJson(row.metadata),
      timestamp: new Date(row.timestamp)
    };
  }

  protected mapEntityToRow(entity: NotificationHistory): any {
    return {
      id: entity.id,
      notificationId: entity.notificationId,
      userId: entity.userId,
      action: entity.action,
      metadata: entity.metadata ? JSON.stringify(entity.metadata) : null,
      timestamp: entity.timestamp
    };
  }
}

export class NotificationQueueRepository extends BaseRepository<NotificationQueue> {
  constructor() {
    super('notification_queue');
  }

  /**
   * 獲取待處理的通知
   */
  async getPendingNotifications(limit: number = 100): Promise<NotificationQueue[]> {
    const rows = await this.db(this.tableName)
      .where('status', 'pending')
      .where('scheduledAt', '<=', new Date())
      .orderBy('priority', 'desc')
      .orderBy('scheduledAt', 'asc')
      .limit(limit);

    return rows.map(row => this.mapRowToEntity(row));
  }

  /**
   * 標記為處理中
   */
  async markAsProcessing(queueId: string): Promise<boolean> {
    const affectedRows = await this.db(this.tableName)
      .where('id', queueId)
      .where('status', 'pending')
      .update({
        status: 'processing',
        updatedAt: new Date()
      });

    return affectedRows > 0;
  }

  /**
   * 標記為已完成
   */
  async markAsCompleted(queueId: string): Promise<boolean> {
    const affectedRows = await this.db(this.tableName)
      .where('id', queueId)
      .update({
        status: 'completed',
        updatedAt: new Date()
      });

    return affectedRows > 0;
  }

  /**
   * 標記為失敗並重試
   */
  async markAsFailedAndRetry(queueId: string, error: string): Promise<boolean> {
    const item = await this.findById(queueId);
    if (!item) return false;

    const newAttempts = item.attempts + 1;
    const shouldRetry = newAttempts < item.maxAttempts;

    await this.db(this.tableName)
      .where('id', queueId)
      .update({
        status: shouldRetry ? 'pending' : 'failed',
        attempts: newAttempts,
        lastAttemptAt: new Date(),
        error,
        scheduledAt: shouldRetry ? new Date(Date.now() + Math.pow(2, newAttempts) * 1000) : item.scheduledAt,
        updatedAt: new Date()
      });

    return true;
  }

  /**
   * 清理已完成的通知（超過指定天數）
   */
  async cleanupCompleted(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    return await this.db(this.tableName)
      .where('status', 'completed')
      .where('updatedAt', '<', cutoffDate)
      .del();
  }

  protected mapRowToEntity(row: any): NotificationQueue {
    return {
      id: row.id,
      notificationId: row.notificationId,
      userId: row.userId,
      channel: row.channel,
      priority: row.priority,
      scheduledAt: new Date(row.scheduledAt),
      attempts: row.attempts,
      maxAttempts: row.maxAttempts,
      lastAttemptAt: row.lastAttemptAt ? new Date(row.lastAttemptAt) : undefined,
      status: row.status,
      error: row.error,
      metadata: this.parseJson(row.metadata),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  protected mapEntityToRow(entity: NotificationQueue): any {
    return {
      id: entity.id,
      notificationId: entity.notificationId,
      userId: entity.userId,
      channel: entity.channel,
      priority: entity.priority,
      scheduledAt: entity.scheduledAt,
      attempts: entity.attempts,
      maxAttempts: entity.maxAttempts,
      lastAttemptAt: entity.lastAttemptAt,
      status: entity.status,
      error: entity.error,
      metadata: entity.metadata ? JSON.stringify(entity.metadata) : null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }
}

// 導出倉庫實例
export const notificationRepository = new NotificationRepository();
export const notificationPreferencesRepository = new NotificationPreferencesRepository();
export const notificationHistoryRepository = new NotificationHistoryRepository();
export const notificationQueueRepository = new NotificationQueueRepository();