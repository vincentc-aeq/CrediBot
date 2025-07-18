import { 
  notificationPreferencesRepository, 
  notificationHistoryRepository,
  notificationRepository 
} from '../repositories/NotificationRepository';
import { auditService } from './AuditService';
import { 
  NotificationPreferences, 
  NotificationType, 
  NotificationChannel,
  NotificationAction 
} from '../models/Notification';

export interface PreferenceUpdate {
  type: NotificationType;
  action: 'enable' | 'disable' | 'modify_channels' | 'modify_thresholds';
  newValue: any;
  reason?: string;
  context?: Record<string, any>;
}

export interface PreferenceAnalytics {
  userId: string;
  totalNotifications: number;
  dismissalRate: number;
  readRate: number;
  channelPerformance: Record<NotificationChannel, {
    sent: number;
    read: number;
    dismissed: number;
    effectiveness: number;
  }>;
  typePreferences: Record<NotificationType, {
    enabled: boolean;
    engagementRate: number;
    lastModified: Date;
  }>;
  recommendedChanges: Array<{
    type: NotificationType;
    suggestion: string;
    reason: string;
    impact: 'high' | 'medium' | 'low';
  }>;
}

export interface SmartPreferenceRecommendation {
  userId: string;
  recommendations: Array<{
    type: 'disable_low_engagement' | 'change_channel' | 'adjust_threshold' | 'enable_missed_value';
    target: NotificationType | NotificationChannel;
    currentValue: any;
    suggestedValue: any;
    reasoning: string;
    expectedImprovement: string;
    confidence: number;
  }>;
  learningInsights: {
    userBehaviorPattern: string;
    optimalTiming: string[];
    preferredChannels: NotificationChannel[];
    engagementTrends: string;
  };
}

export class NotificationPreferenceService {
  /**
   * 獲取用戶通知偏好
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      let preferences = await notificationPreferencesRepository.findByUserId(userId);
      
      if (!preferences) {
        preferences = await this.createDefaultPreferences(userId);
      }

      return preferences;

    } catch (error) {
      console.error('Error getting user preferences:', error);
      throw error;
    }
  }

  /**
   * 更新用戶偏好設置
   */
  async updateUserPreferences(
    userId: string,
    updates: Partial<NotificationPreferences>,
    context?: { source: string; reason?: string }
  ): Promise<NotificationPreferences> {
    try {
      const currentPreferences = await this.getUserPreferences(userId);
      
      const updatedPreferences: NotificationPreferences = {
        ...currentPreferences,
        ...updates,
        userId,
        updatedAt: new Date()
      };

      const result = await notificationPreferencesRepository.upsert(updatedPreferences);

      // 記錄偏好變更
      await auditService.logUpdate(
        'notification_preferences',
        userId,
        currentPreferences,
        result,
        userId,
        context?.reason || 'User preference update'
      );

      // 記錄偏好變更歷史
      await notificationHistoryRepository.logAction(
        'preference_update',
        userId,
        NotificationAction.CREATED,
        {
          changes: this.calculatePreferenceChanges(currentPreferences, result),
          context,
          timestamp: new Date()
        }
      );

      return result;

    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * 處理通知拒絕（智能學習）
   */
  async handleNotificationDismissal(
    notificationId: string,
    userId: string,
    dismissalContext?: {
      reason?: 'not_interested' | 'too_frequent' | 'wrong_time' | 'irrelevant' | 'other';
      feedback?: string;
      deviceInfo?: Record<string, any>;
    }
  ): Promise<{
    preferenceUpdated: boolean;
    suggestedChanges: string[];
  }> {
    try {
      // 獲取通知詳情
      const notification = await notificationRepository.findById(notificationId);
      if (!notification) {
        throw new Error(`Notification ${notificationId} not found`);
      }

      // 記錄拒絕行為
      await notificationHistoryRepository.logAction(
        notificationId,
        userId,
        NotificationAction.DISMISSED,
        dismissalContext
      );

      // 分析拒絕模式
      const dismissalPattern = await this.analyzeDismissalPattern(userId, notification.type);
      
      const suggestedChanges: string[] = [];
      let preferenceUpdated = false;

      // 根據拒絕原因和模式更新偏好
      if (dismissalPattern.shouldUpdatePreferences) {
        const preferences = await this.getUserPreferences(userId);
        const updates = this.generatePreferenceUpdatesFromDismissal(
          preferences,
          notification,
          dismissalContext,
          dismissalPattern
        );

        if (Object.keys(updates).length > 0) {
          await this.updateUserPreferences(userId, updates, {
            source: 'auto_learning',
            reason: `Auto-learned from dismissal pattern: ${dismissalContext?.reason}`
          });
          
          preferenceUpdated = true;
          suggestedChanges.push(...this.describePreferenceChanges(updates));
        }
      }

      // 生成建議
      if (!preferenceUpdated) {
        suggestedChanges.push(...this.generateManualSuggestions(dismissalContext, dismissalPattern));
      }

      return {
        preferenceUpdated,
        suggestedChanges
      };

    } catch (error) {
      console.error('Error handling notification dismissal:', error);
      return {
        preferenceUpdated: false,
        suggestedChanges: []
      };
    }
  }

  /**
   * 獲取偏好分析
   */
  async getPreferenceAnalytics(
    userId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<PreferenceAnalytics> {
    try {
      // 獲取通知統計
      const notificationStats = await notificationRepository.getNotificationStats(userId, dateRange);
      
      // 獲取用戶行為統計
      const actionStats = await notificationHistoryRepository.getUserActionStats(userId, dateRange);
      
      // 獲取當前偏好設置
      const preferences = await this.getUserPreferences(userId);

      // 計算通道效果
      const channelPerformance = this.calculateChannelPerformance(notificationStats, actionStats);
      
      // 計算類型偏好
      const typePreferences = this.calculateTypePreferences(notificationStats, actionStats, preferences);
      
      // 生成推薦變更
      const recommendedChanges = this.generateRecommendedChanges(
        channelPerformance,
        typePreferences,
        notificationStats
      );

      return {
        userId,
        totalNotifications: notificationStats.total,
        dismissalRate: notificationStats.total > 0 ? notificationStats.dismissed / notificationStats.total : 0,
        readRate: notificationStats.total > 0 ? notificationStats.read / notificationStats.total : 0,
        channelPerformance,
        typePreferences,
        recommendedChanges
      };

    } catch (error) {
      console.error('Error getting preference analytics:', error);
      throw error;
    }
  }

  /**
   * 獲取智能偏好建議
   */
  async getSmartPreferenceRecommendations(userId: string): Promise<SmartPreferenceRecommendation> {
    try {
      const analytics = await this.getPreferenceAnalytics(userId);
      const behaviorPattern = await this.analyzeBehaviorPattern(userId);
      
      const recommendations = this.generateSmartRecommendations(analytics, behaviorPattern);
      const learningInsights = this.generateLearningInsights(analytics, behaviorPattern);

      return {
        userId,
        recommendations,
        learningInsights
      };

    } catch (error) {
      console.error('Error getting smart preference recommendations:', error);
      throw error;
    }
  }

  /**
   * 批次更新偏好（基於建議）
   */
  async applySmartRecommendations(
    userId: string,
    selectedRecommendations: string[]
  ): Promise<{
    applied: number;
    failed: number;
    changes: Record<string, any>;
  }> {
    try {
      const smartRecs = await this.getSmartPreferenceRecommendations(userId);
      const preferences = await this.getUserPreferences(userId);
      
      let applied = 0;
      let failed = 0;
      const changes: Record<string, any> = {};

      for (const recId of selectedRecommendations) {
        try {
          const recommendation = smartRecs.recommendations.find(r => 
            `${r.type}_${r.target}` === recId
          );
          
          if (recommendation) {
            const update = this.convertRecommendationToUpdate(recommendation, preferences);
            await this.updateUserPreferences(userId, update, {
              source: 'smart_recommendation',
              reason: recommendation.reasoning
            });
            
            changes[recId] = update;
            applied++;
          }
        } catch (error) {
          console.error(`Failed to apply recommendation ${recId}:`, error);
          failed++;
        }
      }

      return { applied, failed, changes };

    } catch (error) {
      console.error('Error applying smart recommendations:', error);
      throw error;
    }
  }

  /**
   * 獲取偏好變更歷史
   */
  async getPreferenceHistory(
    userId: string,
    limit: number = 50
  ): Promise<Array<{
    timestamp: Date;
    changeType: string;
    description: string;
    source: string;
    impact: string;
  }>> {
    try {
      // 從審計日誌中獲取偏好變更記錄
      // 這裡應該查詢 audit_logs 表
      
      // 簡化實現
      return [
        {
          timestamp: new Date(),
          changeType: 'channel_preference',
          description: '關閉推送通知',
          source: 'user_setting',
          impact: '減少推送通知干擾'
        }
      ];

    } catch (error) {
      console.error('Error getting preference history:', error);
      return [];
    }
  }

  // ===========================================
  // 私有方法
  // ===========================================

  /**
   * 創建默認偏好設置
   */
  private async createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
    const defaultPreferences: NotificationPreferences = {
      id: this.generatePreferenceId(),
      userId,
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

    return await notificationPreferencesRepository.create(defaultPreferences);
  }

  /**
   * 分析拒絕模式
   */
  private async analyzeDismissalPattern(
    userId: string,
    notificationType: NotificationType
  ): Promise<{
    shouldUpdatePreferences: boolean;
    dismissalRate: number;
    recentDismissals: number;
    pattern: string;
  }> {
    // 獲取最近30天的拒絕記錄
    const recentActions = await notificationHistoryRepository.getUserActionStats(userId, {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    });

    const dismissed = recentActions[NotificationAction.DISMISSED] || 0;
    const sent = recentActions[NotificationAction.SENT] || 0;
    const dismissalRate = sent > 0 ? dismissed / sent : 0;

    return {
      shouldUpdatePreferences: dismissalRate > 0.7 && dismissed >= 3,
      dismissalRate,
      recentDismissals: dismissed,
      pattern: dismissalRate > 0.8 ? 'high_dismissal' : dismissalRate > 0.5 ? 'medium_dismissal' : 'normal'
    };
  }

  /**
   * 根據拒絕生成偏好更新
   */
  private generatePreferenceUpdatesFromDismissal(
    preferences: NotificationPreferences,
    notification: any,
    dismissalContext: any,
    pattern: any
  ): Partial<NotificationPreferences> {
    const updates: Partial<NotificationPreferences> = {};

    // 根據拒絕原因調整
    if (dismissalContext?.reason === 'too_frequent') {
      // 調整頻率設置
      if (notification.type === NotificationType.TRANSACTION_SUGGESTION) {
        updates.transactionSuggestions = {
          ...preferences.transactionSuggestions,
          frequency: 'daily_digest'
        };
      }
    } else if (dismissalContext?.reason === 'not_interested') {
      // 提高閾值或關閉
      if (notification.type === NotificationType.TRANSACTION_SUGGESTION) {
        updates.transactionSuggestions = {
          ...preferences.transactionSuggestions,
          minimumBenefit: preferences.transactionSuggestions.minimumBenefit * 1.5
        };
      }
    } else if (pattern.dismissalRate > 0.8) {
      // 高拒絕率 - 考慮關閉
      switch (notification.type) {
        case NotificationType.TRANSACTION_SUGGESTION:
          updates.transactionSuggestions = {
            ...preferences.transactionSuggestions,
            enabled: false
          };
          break;
        case NotificationType.PORTFOLIO_OPTIMIZATION:
          updates.portfolioOptimization = {
            ...preferences.portfolioOptimization,
            enabled: false
          };
          break;
      }
    }

    return updates;
  }

  /**
   * 計算偏好變更
   */
  private calculatePreferenceChanges(
    oldPrefs: NotificationPreferences,
    newPrefs: NotificationPreferences
  ): Record<string, { from: any; to: any }> {
    const changes: Record<string, { from: any; to: any }> = {};

    // 比較各個偏好設置
    if (oldPrefs.transactionSuggestions.enabled !== newPrefs.transactionSuggestions.enabled) {
      changes.transactionSuggestionsEnabled = {
        from: oldPrefs.transactionSuggestions.enabled,
        to: newPrefs.transactionSuggestions.enabled
      };
    }

    if (oldPrefs.transactionSuggestions.minimumBenefit !== newPrefs.transactionSuggestions.minimumBenefit) {
      changes.minimumBenefit = {
        from: oldPrefs.transactionSuggestions.minimumBenefit,
        to: newPrefs.transactionSuggestions.minimumBenefit
      };
    }

    // 添加更多比較邏輯...

    return changes;
  }

  /**
   * 描述偏好變更
   */
  private describePreferenceChanges(updates: Partial<NotificationPreferences>): string[] {
    const descriptions: string[] = [];

    if (updates.transactionSuggestions?.enabled === false) {
      descriptions.push('已關閉交易建議通知');
    }
    if (updates.transactionSuggestions?.frequency) {
      descriptions.push(`已調整通知頻率為${updates.transactionSuggestions.frequency}`);
    }
    if (updates.transactionSuggestions?.minimumBenefit) {
      descriptions.push(`已提高最小收益閾值至 $${updates.transactionSuggestions.minimumBenefit}`);
    }

    return descriptions;
  }

  /**
   * 生成手動建議
   */
  private generateManualSuggestions(dismissalContext: any, pattern: any): string[] {
    const suggestions: string[] = [];

    if (dismissalContext?.reason === 'too_frequent') {
      suggestions.push('考慮調整通知頻率為每日摘要');
      suggestions.push('可以在設置中調整安靜時間');
    }

    if (dismissalContext?.reason === 'irrelevant') {
      suggestions.push('可以提高收益閾值，只接收高價值建議');
      suggestions.push('考慮調整感興趣的消費類別');
    }

    if (pattern.dismissalRate > 0.5) {
      suggestions.push('您似乎不太需要這類通知，可以考慮關閉');
    }

    return suggestions;
  }

  /**
   * 計算通道效果
   */
  private calculateChannelPerformance(notificationStats: any, actionStats: any): Record<NotificationChannel, any> {
    // 簡化實現
    return {
      [NotificationChannel.IN_APP]: {
        sent: notificationStats.byChannel[NotificationChannel.IN_APP] || 0,
        read: Math.floor((notificationStats.byChannel[NotificationChannel.IN_APP] || 0) * 0.6),
        dismissed: Math.floor((notificationStats.byChannel[NotificationChannel.IN_APP] || 0) * 0.2),
        effectiveness: 0.6
      },
      [NotificationChannel.PUSH]: {
        sent: notificationStats.byChannel[NotificationChannel.PUSH] || 0,
        read: Math.floor((notificationStats.byChannel[NotificationChannel.PUSH] || 0) * 0.3),
        dismissed: Math.floor((notificationStats.byChannel[NotificationChannel.PUSH] || 0) * 0.4),
        effectiveness: 0.3
      },
      [NotificationChannel.EMAIL]: {
        sent: notificationStats.byChannel[NotificationChannel.EMAIL] || 0,
        read: Math.floor((notificationStats.byChannel[NotificationChannel.EMAIL] || 0) * 0.4),
        dismissed: Math.floor((notificationStats.byChannel[NotificationChannel.EMAIL] || 0) * 0.3),
        effectiveness: 0.4
      },
      [NotificationChannel.SMS]: {
        sent: 0,
        read: 0,
        dismissed: 0,
        effectiveness: 0
      },
      [NotificationChannel.WEBHOOK]: {
        sent: 0,
        read: 0,
        dismissed: 0,
        effectiveness: 0
      }
    };
  }

  /**
   * 計算類型偏好
   */
  private calculateTypePreferences(notificationStats: any, actionStats: any, preferences: NotificationPreferences): Record<NotificationType, any> {
    return {
      [NotificationType.TRANSACTION_SUGGESTION]: {
        enabled: preferences.transactionSuggestions.enabled,
        engagementRate: 0.6,
        lastModified: preferences.updatedAt
      },
      [NotificationType.PORTFOLIO_OPTIMIZATION]: {
        enabled: preferences.portfolioOptimization.enabled,
        engagementRate: 0.4,
        lastModified: preferences.updatedAt
      },
      [NotificationType.SPENDING_ALERT]: {
        enabled: preferences.spendingAlerts.enabled,
        engagementRate: 0.8,
        lastModified: preferences.updatedAt
      },
      [NotificationType.REWARD_MILESTONE]: {
        enabled: preferences.rewardMilestones.enabled,
        engagementRate: 0.9,
        lastModified: preferences.updatedAt
      },
      [NotificationType.SYSTEM_ANNOUNCEMENT]: {
        enabled: preferences.systemNotifications.enabled,
        engagementRate: 0.3,
        lastModified: preferences.updatedAt
      },
      [NotificationType.SECURITY_ALERT]: {
        enabled: true,
        engagementRate: 0.95,
        lastModified: preferences.updatedAt
      },
      [NotificationType.CARD_RECOMMENDATION]: {
        enabled: true,
        engagementRate: 0.5,
        lastModified: preferences.updatedAt
      }
    };
  }

  /**
   * 生成推薦變更
   */
  private generateRecommendedChanges(channelPerformance: any, typePreferences: any, stats: any): any[] {
    const changes = [];

    // 檢查低效通道
    Object.entries(channelPerformance).forEach(([channel, perf]: [string, any]) => {
      if (perf.sent > 0 && perf.effectiveness < 0.3) {
        changes.push({
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          suggestion: `考慮停用${channel}通道`,
          reason: `該通道效果較差（效果率：${(perf.effectiveness * 100).toFixed(1)}%）`,
          impact: 'medium' as const
        });
      }
    });

    // 檢查低參與類型
    Object.entries(typePreferences).forEach(([type, pref]: [string, any]) => {
      if (pref.enabled && pref.engagementRate < 0.4) {
        changes.push({
          type: type as NotificationType,
          suggestion: `考慮調整${type}通知設置`,
          reason: `參與率較低（${(pref.engagementRate * 100).toFixed(1)}%）`,
          impact: 'low' as const
        });
      }
    });

    return changes;
  }

  /**
   * 分析行為模式
   */
  private async analyzeBehaviorPattern(userId: string): Promise<any> {
    // 簡化實現
    return {
      activeHours: ['09:00-12:00', '14:00-17:00'],
      preferredDays: ['monday', 'wednesday', 'friday'],
      responseTime: 'quick', // quick, medium, slow
      devicePreference: 'mobile'
    };
  }

  /**
   * 生成智能建議
   */
  private generateSmartRecommendations(analytics: PreferenceAnalytics, behaviorPattern: any): any[] {
    return [
      {
        type: 'disable_low_engagement',
        target: NotificationType.PORTFOLIO_OPTIMIZATION,
        currentValue: true,
        suggestedValue: false,
        reasoning: '參與率較低，建議關閉以減少干擾',
        expectedImprovement: '提升整體通知體驗',
        confidence: 0.8
      }
    ];
  }

  /**
   * 生成學習洞察
   */
  private generateLearningInsights(analytics: PreferenceAnalytics, behaviorPattern: any): any {
    return {
      userBehaviorPattern: '您傾向於快速回應通知，主要在工作日查看',
      optimalTiming: ['09:00-12:00', '14:00-17:00'],
      preferredChannels: [NotificationChannel.IN_APP],
      engagementTrends: '整體參與度良好，對獎勵相關通知最感興趣'
    };
  }

  /**
   * 轉換建議為更新
   */
  private convertRecommendationToUpdate(recommendation: any, preferences: NotificationPreferences): Partial<NotificationPreferences> {
    // 根據建議類型生成相應的更新
    const updates: Partial<NotificationPreferences> = {};

    if (recommendation.type === 'disable_low_engagement') {
      switch (recommendation.target) {
        case NotificationType.PORTFOLIO_OPTIMIZATION:
          updates.portfolioOptimization = {
            ...preferences.portfolioOptimization,
            enabled: false
          };
          break;
      }
    }

    return updates;
  }

  /**
   * 生成偏好ID
   */
  private generatePreferenceId(): string {
    return `pref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const notificationPreferenceService = new NotificationPreferenceService();