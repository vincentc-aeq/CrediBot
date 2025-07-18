import Redis from 'ioredis';
import { 
  notificationService, 
  NotificationDeliveryResult 
} from './NotificationService';
import { 
  notificationQueueRepository, 
  notificationRepository 
} from '../repositories/NotificationRepository';
import { 
  NotificationQueue, 
  NotificationPriority, 
  NotificationChannel,
  Notification 
} from '../models/Notification';

export interface QueueConfig {
  maxConcurrency: number;
  retryDelays: number[]; // 重試延遲（毫秒）
  maxRetries: number;
  processingTimeout: number; // 處理超時（毫秒）
  batchSize: number;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  throughput: {
    lastHour: number;
    lastDay: number;
  };
  averageProcessingTime: number;
  errorRate: number;
}

export interface ScheduledNotification {
  notificationId: string;
  scheduledAt: Date;
  priority: NotificationPriority;
  channel: NotificationChannel;
  userId: string;
  attempts: number;
}

export class NotificationQueueService {
  private redis: Redis;
  private isProcessing = false;
  private processingWorkers = new Set<string>();
  private config: QueueConfig;

  // Redis 鍵前綴
  private readonly QUEUE_KEY = 'notification:queue';
  private readonly PRIORITY_QUEUE_KEY = 'notification:priority_queue';
  private readonly PROCESSING_KEY = 'notification:processing';
  private readonly SCHEDULED_KEY = 'notification:scheduled';
  private readonly STATS_KEY = 'notification:stats';
  private readonly LOCK_KEY = 'notification:lock';

  constructor(redisConfig?: any) {
    this.redis = new Redis(redisConfig || {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });

    this.config = {
      maxConcurrency: parseInt(process.env.NOTIFICATION_CONCURRENCY || '5'),
      retryDelays: [1000, 5000, 15000, 60000], // 1s, 5s, 15s, 1m
      maxRetries: 4,
      processingTimeout: 30000, // 30秒
      batchSize: parseInt(process.env.NOTIFICATION_BATCH_SIZE || '10')
    };

    this.initializeRedisListeners();
  }

  /**
   * 添加通知到隊列
   */
  async enqueueNotification(
    notificationId: string,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    scheduledAt?: Date
  ): Promise<void> {
    try {
      const notification = await notificationRepository.findById(notificationId);
      if (!notification) {
        throw new Error(`Notification ${notificationId} not found`);
      }

      const queueItem: ScheduledNotification = {
        notificationId,
        scheduledAt: scheduledAt || new Date(),
        priority,
        channel: notification.channel,
        userId: notification.userId,
        attempts: 0
      };

      // 如果是即時通知，加入優先隊列
      if (!scheduledAt || scheduledAt <= new Date()) {
        await this.addToPriorityQueue(queueItem);
      } else {
        // 否則加入排程隊列
        await this.addToScheduledQueue(queueItem);
      }

      console.log(`Enqueued notification ${notificationId} with priority ${priority}`);

    } catch (error) {
      console.error('Error enqueuing notification:', error);
      throw error;
    }
  }

  /**
   * 批次添加通知到隊列
   */
  async enqueueBatch(notifications: Array<{
    notificationId: string;
    priority?: NotificationPriority;
    scheduledAt?: Date;
  }>): Promise<{
    enqueued: number;
    failed: number;
    errors: string[];
  }> {
    let enqueued = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const notif of notifications) {
      try {
        await this.enqueueNotification(
          notif.notificationId,
          notif.priority,
          notif.scheduledAt
        );
        enqueued++;
      } catch (error) {
        failed++;
        errors.push(`${notif.notificationId}: ${error.message}`);
      }
    }

    return { enqueued, failed, errors };
  }

  /**
   * 啟動隊列處理器
   */
  async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      console.log('Queue processing is already running');
      return;
    }

    this.isProcessing = true;
    console.log('Starting notification queue processing...');

    // 啟動多個工作線程
    const workerPromises = [];
    for (let i = 0; i < this.config.maxConcurrency; i++) {
      workerPromises.push(this.startWorker(`worker-${i}`));
    }

    // 啟動排程檢查器
    workerPromises.push(this.startScheduledProcessor());

    // 啟動統計收集器
    workerPromises.push(this.startStatsCollector());

    await Promise.all(workerPromises);
  }

  /**
   * 停止隊列處理器
   */
  async stopProcessing(): Promise<void> {
    console.log('Stopping notification queue processing...');
    this.isProcessing = false;

    // 等待所有工作者完成
    while (this.processingWorkers.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('Queue processing stopped');
  }

  /**
   * 獲取隊列統計
   */
  async getQueueStats(): Promise<QueueStats> {
    try {
      const [
        pendingCount,
        processingCount,
        scheduledCount,
        statsData
      ] = await Promise.all([
        this.redis.zcard(this.PRIORITY_QUEUE_KEY),
        this.redis.hlen(this.PROCESSING_KEY),
        this.redis.zcard(this.SCHEDULED_KEY),
        this.redis.hgetall(this.STATS_KEY)
      ]);

      // 從數據庫獲取完成和失敗的統計
      const [completed, failed] = await Promise.all([
        notificationQueueRepository.db('notification_queue')
          .where('status', 'completed')
          .count('id as count')
          .first(),
        notificationQueueRepository.db('notification_queue')
          .where('status', 'failed')
          .count('id as count')
          .first()
      ]);

      return {
        pending: pendingCount + scheduledCount,
        processing: processingCount,
        completed: parseInt(completed?.count || '0', 10),
        failed: parseInt(failed?.count || '0', 10),
        throughput: {
          lastHour: parseInt(statsData.throughput_hour || '0', 10),
          lastDay: parseInt(statsData.throughput_day || '0', 10)
        },
        averageProcessingTime: parseInt(statsData.avg_processing_time || '0', 10),
        errorRate: parseFloat(statsData.error_rate || '0')
      };

    } catch (error) {
      console.error('Error getting queue stats:', error);
      throw error;
    }
  }

  /**
   * 清理已完成的隊列項目
   */
  async cleanupCompleted(olderThanHours: number = 24): Promise<number> {
    try {
      // 清理Redis中的處理記錄
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
      const processingItems = await this.redis.hgetall(this.PROCESSING_KEY);
      
      let cleaned = 0;
      for (const [key, value] of Object.entries(processingItems)) {
        const item = JSON.parse(value);
        if (item.startedAt < cutoffTime) {
          await this.redis.hdel(this.PROCESSING_KEY, key);
          cleaned++;
        }
      }

      // 清理數據庫中的已完成記錄
      const dbCleaned = await notificationQueueRepository.cleanupCompleted(olderThanHours / 24);

      return cleaned + dbCleaned;

    } catch (error) {
      console.error('Error cleaning up completed notifications:', error);
      return 0;
    }
  }

  /**
   * 重新排隊失敗的通知
   */
  async requeueFailedNotifications(maxAge: number = 24): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - maxAge * 60 * 60 * 1000);
      
      const failedItems = await notificationQueueRepository.db('notification_queue')
        .where('status', 'failed')
        .where('updatedAt', '>', cutoffDate)
        .where('attempts', '<', this.config.maxRetries)
        .select('*');

      let requeued = 0;
      for (const item of failedItems) {
        try {
          await this.enqueueNotification(
            item.notificationId,
            item.priority,
            new Date(Date.now() + this.config.retryDelays[item.attempts] || 60000)
          );
          
          // 更新嘗試次數
          await notificationQueueRepository.update(item.id, {
            attempts: item.attempts + 1,
            status: 'pending'
          });
          
          requeued++;
        } catch (error) {
          console.error(`Failed to requeue notification ${item.notificationId}:`, error);
        }
      }

      return requeued;

    } catch (error) {
      console.error('Error requeuing failed notifications:', error);
      return 0;
    }
  }

  /**
   * 獲取隊列中的通知詳情
   */
  async getQueueDetails(limit: number = 100): Promise<{
    pending: ScheduledNotification[];
    processing: ScheduledNotification[];
    scheduled: ScheduledNotification[];
  }> {
    try {
      const [pendingData, processingData, scheduledData] = await Promise.all([
        this.redis.zrange(this.PRIORITY_QUEUE_KEY, 0, limit - 1, 'WITHSCORES'),
        this.redis.hgetall(this.PROCESSING_KEY),
        this.redis.zrange(this.SCHEDULED_KEY, 0, limit - 1, 'WITHSCORES')
      ]);

      const pending = this.parseQueueData(pendingData);
      const processing = Object.values(processingData).map(data => JSON.parse(data));
      const scheduled = this.parseQueueData(scheduledData);

      return { pending, processing, scheduled };

    } catch (error) {
      console.error('Error getting queue details:', error);
      throw error;
    }
  }

  // ===========================================
  // 私有方法
  // ===========================================

  /**
   * 初始化Redis監聽器
   */
  private initializeRedisListeners(): void {
    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      console.log('Connected to Redis for notification queue');
    });

    this.redis.on('reconnecting', () => {
      console.log('Reconnecting to Redis...');
    });
  }

  /**
   * 添加到優先隊列
   */
  private async addToPriorityQueue(item: ScheduledNotification): Promise<void> {
    const score = this.calculatePriorityScore(item.priority, item.scheduledAt);
    await this.redis.zadd(
      this.PRIORITY_QUEUE_KEY,
      score,
      JSON.stringify(item)
    );
  }

  /**
   * 添加到排程隊列
   */
  private async addToScheduledQueue(item: ScheduledNotification): Promise<void> {
    const score = item.scheduledAt.getTime();
    await this.redis.zadd(
      this.SCHEDULED_KEY,
      score,
      JSON.stringify(item)
    );
  }

  /**
   * 計算優先級分數
   */
  private calculatePriorityScore(priority: NotificationPriority, scheduledAt: Date): number {
    const priorityWeight = {
      [NotificationPriority.URGENT]: 1000000,
      [NotificationPriority.HIGH]: 100000,
      [NotificationPriority.MEDIUM]: 10000,
      [NotificationPriority.LOW]: 1000
    };

    // 分數 = 優先級權重 - 時間戳（確保較早的通知優先）
    return priorityWeight[priority] - scheduledAt.getTime();
  }

  /**
   * 啟動工作線程
   */
  private async startWorker(workerId: string): Promise<void> {
    this.processingWorkers.add(workerId);

    try {
      while (this.isProcessing) {
        await this.processNextNotification(workerId);
        await new Promise(resolve => setTimeout(resolve, 100)); // 短暫休息
      }
    } catch (error) {
      console.error(`Worker ${workerId} error:`, error);
    } finally {
      this.processingWorkers.delete(workerId);
    }
  }

  /**
   * 處理下一個通知
   */
  private async processNextNotification(workerId: string): Promise<void> {
    const lockKey = `${this.LOCK_KEY}:${workerId}`;
    
    try {
      // 使用Redis鎖確保原子性
      const lockAcquired = await this.redis.set(lockKey, '1', 'PX', 5000, 'NX');
      if (!lockAcquired) {
        return;
      }

      // 從優先隊列獲取下一個通知
      const items = await this.redis.zpopmin(this.PRIORITY_QUEUE_KEY, 1);
      if (items.length === 0) {
        return;
      }

      const queueItem: ScheduledNotification = JSON.parse(items[0]);
      
      // 標記為處理中
      await this.redis.hset(
        this.PROCESSING_KEY,
        queueItem.notificationId,
        JSON.stringify({
          ...queueItem,
          workerId,
          startedAt: Date.now()
        })
      );

      // 處理通知
      const startTime = Date.now();
      const result = await this.processNotification(queueItem);
      const processingTime = Date.now() - startTime;

      // 更新統計
      await this.updateStats(result, processingTime);

      // 清理處理記錄
      await this.redis.hdel(this.PROCESSING_KEY, queueItem.notificationId);

    } catch (error) {
      console.error(`Error processing notification in worker ${workerId}:`, error);
    } finally {
      await this.redis.del(lockKey);
    }
  }

  /**
   * 處理單個通知
   */
  private async processNotification(queueItem: ScheduledNotification): Promise<NotificationDeliveryResult> {
    try {
      const result = await notificationService.sendNotification(queueItem.notificationId);
      
      if (!result.success && queueItem.attempts < this.config.maxRetries) {
        // 重新排隊重試
        const delay = this.config.retryDelays[queueItem.attempts] || 60000;
        const retryItem = {
          ...queueItem,
          attempts: queueItem.attempts + 1,
          scheduledAt: new Date(Date.now() + delay)
        };
        
        await this.addToScheduledQueue(retryItem);
      }

      return result;

    } catch (error) {
      console.error(`Error processing notification ${queueItem.notificationId}:`, error);
      return {
        notificationId: queueItem.notificationId,
        channel: queueItem.channel,
        success: false,
        error: error.message,
        sentAt: new Date()
      };
    }
  }

  /**
   * 啟動排程處理器
   */
  private async startScheduledProcessor(): Promise<void> {
    while (this.isProcessing) {
      try {
        // 檢查到期的排程通知
        const now = Date.now();
        const dueItems = await this.redis.zrangebyscore(
          this.SCHEDULED_KEY,
          0,
          now,
          'LIMIT',
          0,
          this.config.batchSize
        );

        if (dueItems.length > 0) {
          // 移動到優先隊列
          const pipeline = this.redis.pipeline();
          
          for (const itemData of dueItems) {
            const item: ScheduledNotification = JSON.parse(itemData);
            const score = this.calculatePriorityScore(item.priority, new Date());
            
            pipeline.zadd(this.PRIORITY_QUEUE_KEY, score, itemData);
            pipeline.zrem(this.SCHEDULED_KEY, itemData);
          }
          
          await pipeline.exec();
          console.log(`Moved ${dueItems.length} scheduled notifications to priority queue`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000)); // 每秒檢查一次

      } catch (error) {
        console.error('Error in scheduled processor:', error);
        await new Promise(resolve => setTimeout(resolve, 5000)); // 錯誤時等待5秒
      }
    }
  }

  /**
   * 啟動統計收集器
   */
  private async startStatsCollector(): Promise<void> {
    while (this.isProcessing) {
      try {
        // 每分鐘更新統計
        await this.collectStats();
        await new Promise(resolve => setTimeout(resolve, 60000));
      } catch (error) {
        console.error('Error in stats collector:', error);
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    }
  }

  /**
   * 收集統計數據
   */
  private async collectStats(): Promise<void> {
    try {
      const stats = await this.getQueueStats();
      
      // 更新Redis統計
      await this.redis.hmset(this.STATS_KEY, {
        pending: stats.pending,
        processing: stats.processing,
        completed: stats.completed,
        failed: stats.failed,
        last_updated: Date.now()
      });

    } catch (error) {
      console.error('Error collecting stats:', error);
    }
  }

  /**
   * 更新處理統計
   */
  private async updateStats(result: NotificationDeliveryResult, processingTime: number): Promise<void> {
    try {
      const hourKey = `${this.STATS_KEY}:hour:${Math.floor(Date.now() / 3600000)}`;
      const dayKey = `${this.STATS_KEY}:day:${Math.floor(Date.now() / 86400000)}`;

      const pipeline = this.redis.pipeline();
      
      // 更新小時統計
      pipeline.hincrby(hourKey, 'processed', 1);
      pipeline.hincrby(hourKey, result.success ? 'success' : 'failed', 1);
      pipeline.hincrby(hourKey, 'total_time', processingTime);
      pipeline.expire(hourKey, 3600 * 25); // 保留25小時

      // 更新日統計
      pipeline.hincrby(dayKey, 'processed', 1);
      pipeline.hincrby(dayKey, result.success ? 'success' : 'failed', 1);
      pipeline.expire(dayKey, 86400 * 8); // 保留8天

      await pipeline.exec();

    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }

  /**
   * 解析隊列數據
   */
  private parseQueueData(redisData: string[]): ScheduledNotification[] {
    const items: ScheduledNotification[] = [];
    
    for (let i = 0; i < redisData.length; i += 2) {
      try {
        const item = JSON.parse(redisData[i]);
        items.push(item);
      } catch (error) {
        console.error('Error parsing queue item:', error);
      }
    }

    return items;
  }
}

export const notificationQueueService = new NotificationQueueService();