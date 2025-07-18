import { 
  notificationRepository, 
  notificationHistoryRepository, 
  notificationPreferencesRepository 
} from '../repositories/NotificationRepository';
import { userRepository } from '../repositories/UserRepository';
import { 
  NotificationType, 
  NotificationChannel, 
  NotificationAction, 
  NotificationPriority 
} from '../models/Notification';

export interface NotificationAnalytics {
  userId: string;
  dateRange: { start: Date; end: Date };
  summary: {
    totalSent: number;
    totalDelivered: number;
    totalRead: number;
    totalClicked: number;
    totalDismissed: number;
    deliveryRate: number;
    readRate: number;
    clickThroughRate: number;
    dismissalRate: number;
  };
  channelBreakdown: Record<NotificationChannel, {
    sent: number;
    delivered: number;
    read: number;
    clicked: number;
    dismissed: number;
    effectiveness: number;
    averageDeliveryTime: number;
  }>;
  typeBreakdown: Record<NotificationType, {
    sent: number;
    engagement: number;
    conversionRate: number;
    userPreference: number;
    revenue: number;
  }>;
  temporalAnalysis: {
    hourlyDistribution: Record<string, number>;
    dailyDistribution: Record<string, number>;
    weeklyTrends: Array<{ week: string; volume: number; engagement: number }>;
    monthlyTrends: Array<{ month: string; volume: number; engagement: number }>;
  };
  userSegmentation: {
    highEngagement: number;
    mediumEngagement: number;
    lowEngagement: number;
    dormant: number;
  };
  performanceInsights: {
    bestPerformingTypes: Array<{ type: NotificationType; score: number }>;
    worstPerformingTypes: Array<{ type: NotificationType; score: number }>;
    optimalTimings: Array<{ hour: number; effectiveness: number }>;
    channelRecommendations: Array<{ 
      channel: NotificationChannel; 
      recommendation: string; 
      impact: string 
    }>;
  };
}

export interface CohortAnalysis {
  cohortPeriod: 'daily' | 'weekly' | 'monthly';
  cohorts: Array<{
    cohortDate: string;
    size: number;
    periods: Array<{
      period: number;
      activeUsers: number;
      retentionRate: number;
      engagementRate: number;
      notificationsSent: number;
    }>;
  }>;
  insights: {
    averageRetention: Record<number, number>;
    engagementTrends: Record<number, number>;
    churnIndicators: string[];
  };
}

export interface A_BTestResults {
  testId: string;
  testName: string;
  startDate: Date;
  endDate: Date;
  variants: Array<{
    name: string;
    userCount: number;
    notificationsSent: number;
    deliveryRate: number;
    engagementRate: number;
    conversionRate: number;
    revenue: number;
  }>;
  winningVariant: string;
  confidence: number;
  statisticalSignificance: boolean;
  recommendations: string[];
}

export interface PersonalizationInsights {
  userId: string;
  personalizedMetrics: {
    optimalSendTime: string;
    preferredChannels: NotificationChannel[];
    responsiveTypes: NotificationType[];
    engagementPattern: 'immediate' | 'delayed' | 'batched';
    seasonalPreferences: Record<string, number>;
  };
  behaviorPredictions: {
    likelyToEngage: number;
    likelyToDismiss: number;
    likelyToConvert: number;
    churnRisk: number;
  };
  recommendations: {
    contentOptimization: string[];
    timingAdjustments: string[];
    channelOptimization: string[];
    frequencyAdjustments: string[];
  };
}

export class NotificationAnalyticsService {
  /**
   * 獲取用戶通知分析
   */
  async getUserNotificationAnalytics(
    userId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<NotificationAnalytics> {
    try {
      const range = dateRange || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30天前
        end: new Date()
      };

      // 並行獲取各種數據
      const [
        notificationStats,
        actionStats,
        channelData,
        typeData,
        temporalData
      ] = await Promise.all([
        notificationRepository.getNotificationStats(userId, range),
        notificationHistoryRepository.getUserActionStats(userId, range),
        this.getChannelAnalytics(userId, range),
        this.getTypeAnalytics(userId, range),
        this.getTemporalAnalytics(userId, range)
      ]);

      // 計算摘要指標
      const summary = this.calculateSummaryMetrics(notificationStats, actionStats);
      
      // 計算用戶細分
      const userSegmentation = await this.calculateUserSegmentation(userId, range);
      
      // 生成效能洞察
      const performanceInsights = this.generatePerformanceInsights(
        channelData,
        typeData,
        temporalData
      );

      return {
        userId,
        dateRange: range,
        summary,
        channelBreakdown: channelData,
        typeBreakdown: typeData,
        temporalAnalysis: temporalData,
        userSegmentation,
        performanceInsights
      };

    } catch (error) {
      console.error('Error getting user notification analytics:', error);
      throw error;
    }
  }

  /**
   * 獲取系統級別分析
   */
  async getSystemNotificationAnalytics(
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    totalUsers: number;
    totalNotifications: number;
    systemWideMetrics: NotificationAnalytics['summary'];
    topPerformingSegments: Array<{
      segment: string;
      userCount: number;
      engagementRate: number;
    }>;
    globalTrends: {
      volumeTrend: string;
      engagementTrend: string;
      qualityTrend: string;
    };
  }> {
    try {
      const range = dateRange || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      };

      // 獲取系統統計
      const [totalUsers, totalNotifications] = await Promise.all([
        userRepository.db('users').count('id as count').first(),
        notificationRepository.db('notifications')
          .whereBetween('createdAt', [range.start, range.end])
          .count('id as count')
          .first()
      ]);

      // 計算系統級指標
      const systemWideMetrics = await this.calculateSystemMetrics(range);
      
      // 獲取高效能用戶群
      const topPerformingSegments = await this.getTopPerformingSegments(range);
      
      // 計算全域趨勢
      const globalTrends = await this.calculateGlobalTrends(range);

      return {
        totalUsers: parseInt(totalUsers?.count || '0', 10),
        totalNotifications: parseInt(totalNotifications?.count || '0', 10),
        systemWideMetrics,
        topPerformingSegments,
        globalTrends
      };

    } catch (error) {
      console.error('Error getting system notification analytics:', error);
      throw error;
    }
  }

  /**
   * 獲取世代分析
   */
  async getCohortAnalysis(
    cohortPeriod: 'daily' | 'weekly' | 'monthly' = 'weekly',
    periodsToAnalyze: number = 12
  ): Promise<CohortAnalysis> {
    try {
      const cohorts = await this.buildCohorts(cohortPeriod, periodsToAnalyze);
      const insights = this.analyzeCohortInsights(cohorts);

      return {
        cohortPeriod,
        cohorts,
        insights
      };

    } catch (error) {
      console.error('Error getting cohort analysis:', error);
      throw error;
    }
  }

  /**
   * 執行A/B測試分析
   */
  async analyzeA_BTest(testId: string): Promise<A_BTestResults> {
    try {
      // 這裡應該從A/B測試系統獲取數據
      // 簡化實現
      
      const testData = await this.getA_BTestData(testId);
      const variants = await this.analyzeTestVariants(testData);
      const winningVariant = this.determineWinningVariant(variants);
      const confidence = this.calculateStatisticalConfidence(variants);

      return {
        testId,
        testName: testData.name,
        startDate: testData.startDate,
        endDate: testData.endDate,
        variants,
        winningVariant,
        confidence,
        statisticalSignificance: confidence > 95,
        recommendations: this.generateA_BTestRecommendations(variants, winningVariant)
      };

    } catch (error) {
      console.error('Error analyzing A/B test:', error);
      throw error;
    }
  }

  /**
   * 獲取個人化洞察
   */
  async getPersonalizationInsights(userId: string): Promise<PersonalizationInsights> {
    try {
      // 分析用戶行為模式
      const behaviorPattern = await this.analyzeUserBehaviorPattern(userId);
      
      // 預測用戶行為
      const behaviorPredictions = await this.predictUserBehavior(userId, behaviorPattern);
      
      // 生成個人化指標
      const personalizedMetrics = this.calculatePersonalizedMetrics(behaviorPattern);
      
      // 生成建議
      const recommendations = this.generatePersonalizationRecommendations(
        behaviorPattern,
        behaviorPredictions
      );

      return {
        userId,
        personalizedMetrics,
        behaviorPredictions,
        recommendations
      };

    } catch (error) {
      console.error('Error getting personalization insights:', error);
      throw error;
    }
  }

  /**
   * 生成通知效果報告
   */
  async generateNotificationReport(
    userId?: string,
    dateRange?: { start: Date; end: Date },
    format: 'summary' | 'detailed' = 'summary'
  ): Promise<{
    reportId: string;
    generatedAt: Date;
    scope: 'user' | 'system';
    period: string;
    keyFindings: string[];
    recommendations: string[];
    metrics: any;
    chartData: any;
  }> {
    try {
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const range = dateRange || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      };

      let analytics;
      let scope: 'user' | 'system';

      if (userId) {
        analytics = await this.getUserNotificationAnalytics(userId, range);
        scope = 'user';
      } else {
        analytics = await this.getSystemNotificationAnalytics(range);
        scope = 'system';
      }

      const keyFindings = this.extractKeyFindings(analytics, scope);
      const recommendations = this.generateReportRecommendations(analytics, scope);
      const chartData = this.prepareChartData(analytics);

      return {
        reportId,
        generatedAt: new Date(),
        scope,
        period: `${range.start.toISOString().split('T')[0]} to ${range.end.toISOString().split('T')[0]}`,
        keyFindings,
        recommendations,
        metrics: format === 'detailed' ? analytics : analytics.summary || analytics.systemWideMetrics,
        chartData
      };

    } catch (error) {
      console.error('Error generating notification report:', error);
      throw error;
    }
  }

  // ===========================================
  // 私有方法
  // ===========================================

  /**
   * 獲取通道分析
   */
  private async getChannelAnalytics(
    userId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<Record<NotificationChannel, any>> {
    // 簡化實現
    const channels = Object.values(NotificationChannel);
    const result: Record<NotificationChannel, any> = {} as any;

    for (const channel of channels) {
      result[channel] = {
        sent: Math.floor(Math.random() * 100),
        delivered: Math.floor(Math.random() * 90),
        read: Math.floor(Math.random() * 60),
        clicked: Math.floor(Math.random() * 30),
        dismissed: Math.floor(Math.random() * 20),
        effectiveness: Math.random(),
        averageDeliveryTime: Math.floor(Math.random() * 5000)
      };
    }

    return result;
  }

  /**
   * 獲取類型分析
   */
  private async getTypeAnalytics(
    userId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<Record<NotificationType, any>> {
    const types = Object.values(NotificationType);
    const result: Record<NotificationType, any> = {} as any;

    for (const type of types) {
      result[type] = {
        sent: Math.floor(Math.random() * 100),
        engagement: Math.random(),
        conversionRate: Math.random() * 0.1,
        userPreference: Math.random(),
        revenue: Math.random() * 1000
      };
    }

    return result;
  }

  /**
   * 獲取時間分析
   */
  private async getTemporalAnalytics(
    userId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<any> {
    return {
      hourlyDistribution: this.generateHourlyDistribution(),
      dailyDistribution: this.generateDailyDistribution(),
      weeklyTrends: this.generateWeeklyTrends(),
      monthlyTrends: this.generateMonthlyTrends()
    };
  }

  /**
   * 計算摘要指標
   */
  private calculateSummaryMetrics(notificationStats: any, actionStats: any): any {
    const totalSent = notificationStats.total;
    const totalRead = notificationStats.read;
    const totalDismissed = notificationStats.dismissed;
    const totalClicked = actionStats.clicked || 0;

    return {
      totalSent,
      totalDelivered: totalSent, // 假設所有都已送達
      totalRead,
      totalClicked,
      totalDismissed,
      deliveryRate: 1.0,
      readRate: totalSent > 0 ? totalRead / totalSent : 0,
      clickThroughRate: totalSent > 0 ? totalClicked / totalSent : 0,
      dismissalRate: totalSent > 0 ? totalDismissed / totalSent : 0
    };
  }

  /**
   * 計算用戶細分
   */
  private async calculateUserSegmentation(
    userId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<any> {
    // 簡化實現
    return {
      highEngagement: 1,
      mediumEngagement: 0,
      lowEngagement: 0,
      dormant: 0
    };
  }

  /**
   * 生成效能洞察
   */
  private generatePerformanceInsights(channelData: any, typeData: any, temporalData: any): any {
    return {
      bestPerformingTypes: [
        { type: NotificationType.REWARD_MILESTONE, score: 0.9 },
        { type: NotificationType.SECURITY_ALERT, score: 0.85 }
      ],
      worstPerformingTypes: [
        { type: NotificationType.SYSTEM_ANNOUNCEMENT, score: 0.3 }
      ],
      optimalTimings: [
        { hour: 9, effectiveness: 0.8 },
        { hour: 14, effectiveness: 0.7 },
        { hour: 19, effectiveness: 0.75 }
      ],
      channelRecommendations: [
        {
          channel: NotificationChannel.IN_APP,
          recommendation: '保持使用應用內通知',
          impact: '高參與率'
        }
      ]
    };
  }

  /**
   * 計算系統指標
   */
  private async calculateSystemMetrics(dateRange: { start: Date; end: Date }): Promise<any> {
    // 模擬系統級指標
    return {
      totalSent: 10000,
      totalDelivered: 9800,
      totalRead: 6000,
      totalClicked: 1200,
      totalDismissed: 800,
      deliveryRate: 0.98,
      readRate: 0.6,
      clickThroughRate: 0.12,
      dismissalRate: 0.08
    };
  }

  /**
   * 獲取高效能用戶群
   */
  private async getTopPerformingSegments(dateRange: { start: Date; end: Date }): Promise<any[]> {
    return [
      { segment: 'Active Traders', userCount: 1500, engagementRate: 0.85 },
      { segment: 'Premium Users', userCount: 800, engagementRate: 0.78 },
      { segment: 'New Users', userCount: 2000, engagementRate: 0.45 }
    ];
  }

  /**
   * 計算全域趨勢
   */
  private async calculateGlobalTrends(dateRange: { start: Date; end: Date }): Promise<any> {
    return {
      volumeTrend: 'increasing',
      engagementTrend: 'stable',
      qualityTrend: 'improving'
    };
  }

  /**
   * 建立世代數據
   */
  private async buildCohorts(period: string, periods: number): Promise<any[]> {
    // 簡化實現
    return [
      {
        cohortDate: '2024-01',
        size: 1000,
        periods: [
          { period: 0, activeUsers: 1000, retentionRate: 1.0, engagementRate: 0.8, notificationsSent: 5000 },
          { period: 1, activeUsers: 850, retentionRate: 0.85, engagementRate: 0.75, notificationsSent: 4000 }
        ]
      }
    ];
  }

  /**
   * 分析世代洞察
   */
  private analyzeCohortInsights(cohorts: any[]): any {
    return {
      averageRetention: { 0: 1.0, 1: 0.8, 2: 0.6 },
      engagementTrends: { 0: 0.8, 1: 0.7, 2: 0.65 },
      churnIndicators: ['低參與度', '長時間無活動', '高拒絕率']
    };
  }

  // 其他輔助方法的簡化實現
  private async getA_BTestData(testId: string): Promise<any> {
    return {
      name: 'Push vs In-App Test',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    };
  }

  private async analyzeTestVariants(testData: any): Promise<any[]> {
    return [
      {
        name: 'Control',
        userCount: 1000,
        notificationsSent: 5000,
        deliveryRate: 0.95,
        engagementRate: 0.6,
        conversionRate: 0.05,
        revenue: 25000
      }
    ];
  }

  private determineWinningVariant(variants: any[]): string {
    return 'Control';
  }

  private calculateStatisticalConfidence(variants: any[]): number {
    return 95.5;
  }

  private generateA_BTestRecommendations(variants: any[], winner: string): string[] {
    return ['實施獲勝變體', '進行後續測試'];
  }

  private async analyzeUserBehaviorPattern(userId: string): Promise<any> {
    return {
      preferredHours: [9, 14, 19],
      responseSpeed: 'fast',
      channelPreference: [NotificationChannel.IN_APP],
      engagementStyle: 'selective'
    };
  }

  private async predictUserBehavior(userId: string, pattern: any): Promise<any> {
    return {
      likelyToEngage: 0.75,
      likelyToDismiss: 0.15,
      likelyToConvert: 0.08,
      churnRisk: 0.1
    };
  }

  private calculatePersonalizedMetrics(pattern: any): any {
    return {
      optimalSendTime: '14:00',
      preferredChannels: [NotificationChannel.IN_APP],
      responsiveTypes: [NotificationType.REWARD_MILESTONE, NotificationType.TRANSACTION_SUGGESTION],
      engagementPattern: 'immediate',
      seasonalPreferences: { winter: 0.8, spring: 0.7, summer: 0.6, autumn: 0.75 }
    };
  }

  private generatePersonalizationRecommendations(pattern: any, predictions: any): any {
    return {
      contentOptimization: ['使用更多獎勵相關內容'],
      timingAdjustments: ['在14:00發送'],
      channelOptimization: ['專注於應用內通知'],
      frequencyAdjustments: ['維持目前頻率']
    };
  }

  private extractKeyFindings(analytics: any, scope: string): string[] {
    return [
      `${scope === 'user' ? '用戶' : '系統'}參與率為 ${(analytics.summary?.readRate * 100 || 60).toFixed(1)}%`,
      '獎勵通知表現最佳',
      '下午時段效果最好'
    ];
  }

  private generateReportRecommendations(analytics: any, scope: string): string[] {
    return [
      '增加獎勵相關通知',
      '優化發送時間',
      '改善通知內容'
    ];
  }

  private prepareChartData(analytics: any): any {
    return {
      engagement: [60, 65, 70, 68, 72],
      volume: [100, 120, 110, 130, 125],
      channels: {
        labels: ['應用內', '推送', '郵件'],
        data: [60, 25, 15]
      }
    };
  }

  private generateHourlyDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (let i = 0; i < 24; i++) {
      distribution[i.toString()] = Math.floor(Math.random() * 100);
    }
    return distribution;
  }

  private generateDailyDistribution(): Record<string, number> {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const distribution: Record<string, number> = {};
    days.forEach(day => {
      distribution[day] = Math.floor(Math.random() * 100);
    });
    return distribution;
  }

  private generateWeeklyTrends(): Array<{ week: string; volume: number; engagement: number }> {
    return [
      { week: '2024-W01', volume: 1000, engagement: 0.6 },
      { week: '2024-W02', volume: 1200, engagement: 0.65 },
      { week: '2024-W03', volume: 1100, engagement: 0.62 },
      { week: '2024-W04', volume: 1300, engagement: 0.68 }
    ];
  }

  private generateMonthlyTrends(): Array<{ month: string; volume: number; engagement: number }> {
    return [
      { month: '2024-01', volume: 5000, engagement: 0.6 },
      { month: '2024-02', volume: 5500, engagement: 0.65 },
      { month: '2024-03', volume: 5200, engagement: 0.62 }
    ];
  }
}

export const notificationAnalyticsService = new NotificationAnalyticsService();