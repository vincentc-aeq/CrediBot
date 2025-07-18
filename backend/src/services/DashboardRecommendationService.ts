import { portfolioOptimizerService, PortfolioAnalysis } from './PortfolioOptimizerService';
import { rewardEstimatorService, RewardComparisonResult } from './RewardEstimatorService';
import { userCardRepository } from '../repositories/UserCardRepository';
import { transactionRepository } from '../repositories/TransactionRepository';
import { userRepository } from '../repositories/UserRepository';
import {
  RecommendationResult,
  RecommendationItem,
  RecommendationMetadata,
  RecommendationType,
  RecommendationRequest
} from './RecommendationEngineService';
import { ActionType, RecEngineException } from '../models/RecEngine';

export interface DashboardInsights {
  portfolioScore: number;
  optimizationOpportunities: OptimizationOpportunity[];
  performanceMetrics: PerformanceMetrics;
  actionableInsights: ActionableInsight[];
  trendsAnalysis: TrendsAnalysis;
}

export interface OptimizationOpportunity {
  type: 'add_card' | 'remove_card' | 'upgrade_card' | 'optimize_usage';
  priority: 'high' | 'medium' | 'low';
  potentialBenefit: number;
  description: string;
  actionRequired: string;
  timeframe: string;
  confidence: number;
}

export interface PerformanceMetrics {
  totalRewardsEarned: number;
  potentialRewards: number;
  efficiency: number;
  utilizationRate: number;
  diversificationScore: number;
  annualFeeOptimization: number;
}

export interface ActionableInsight {
  id: string;
  category: 'spending' | 'rewards' | 'fees' | 'portfolio';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionItems: string[];
  expectedOutcome: string;
}

export interface TrendsAnalysis {
  spendingTrends: {
    growingCategories: Array<{ category: string; growth: number }>;
    decliningCategories: Array<{ category: string; decline: number }>;
  };
  rewardTrends: {
    bestPerformingCards: Array<{ cardId: string; performance: number }>;
    underutilizedCards: Array<{ cardId: string; utilization: number }>;
  };
  seasonalInsights: {
    upcomingOpportunities: string[];
    historicalPatterns: string[];
  };
}

export class DashboardRecommendationService {
  /**
   * 生成完整的儀表板洞察
   */
  async generateDashboardInsights(userId: string): Promise<DashboardInsights> {
    try {
      // 並行獲取各種分析數據
      const [
        portfolioAnalysis,
        rewardComparison,
        performanceMetrics,
        trendsAnalysis
      ] = await Promise.all([
        portfolioOptimizerService.optimizeUserPortfolio(userId),
        rewardEstimatorService.estimateUserRewards(userId),
        this.calculatePerformanceMetrics(userId),
        this.analyzeTrends(userId)
      ]);

      // 生成優化機會
      const optimizationOpportunities = this.generateOptimizationOpportunities(
        portfolioAnalysis,
        rewardComparison
      );

      // 生成可行動洞察
      const actionableInsights = this.generateActionableInsights(
        portfolioAnalysis,
        rewardComparison,
        performanceMetrics
      );

      return {
        portfolioScore: portfolioAnalysis.currentScore,
        optimizationOpportunities,
        performanceMetrics,
        actionableInsights,
        trendsAnalysis
      };

    } catch (error) {
      console.error('Error generating dashboard insights:', error);
      throw new RecEngineException(
        'DASHBOARD_INSIGHTS_ERROR',
        `Failed to generate dashboard insights: ${error.message}`,
        { userId, originalError: error }
      );
    }
  }

  /**
   * 獲取儀表板優化推薦
   */
  async getDashboardOptimizationRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationResult> {
    try {
      const userId = request.userId;
      
      // 獲取組合分析
      const portfolioAnalysis = await portfolioOptimizerService.optimizeUserPortfolio(userId);
      
      // 轉換為推薦格式
      const recommendations = this.convertPortfolioRecommendationsToItems(
        portfolioAnalysis.recommendations
      );

      // 應用篩選和排序
      const filteredRecommendations = this.applyDashboardFilters(
        recommendations,
        request.filters
      );

      // 建立推薦結果
      const result: RecommendationResult = {
        id: this.generateRecommendationId(),
        type: RecommendationType.PORTFOLIO_OPTIMIZATION,
        userId,
        recommendations: filteredRecommendations,
        metadata: this.buildDashboardRecommendationMetadata(
          portfolioAnalysis,
          Date.now()
        ),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7天過期
      };

      return result;

    } catch (error) {
      console.error('Error in getDashboardOptimizationRecommendations:', error);
      throw new RecEngineException(
        'DASHBOARD_RECOMMENDATION_ERROR',
        `Failed to get dashboard recommendations: ${error.message}`,
        { request, originalError: error }
      );
    }
  }

  /**
   * 獲取個人化儀表板建議
   */
  async getPersonalizedDashboardSuggestions(
    userId: string,
    focusArea?: 'rewards' | 'fees' | 'portfolio' | 'spending'
  ): Promise<{
    primarySuggestion: string;
    suggestions: Array<{
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      category: string;
      actionUrl?: string;
    }>;
    quickActions: Array<{
      text: string;
      action: string;
      benefit: string;
    }>;
  }> {
    try {
      const insights = await this.generateDashboardInsights(userId);
      
      // 根據焦點領域過濾建議
      let filteredInsights = insights.actionableInsights;
      if (focusArea) {
        filteredInsights = insights.actionableInsights.filter(
          insight => insight.category === focusArea
        );
      }

      // 生成主要建議
      const primarySuggestion = this.generatePrimarySuggestion(insights, focusArea);

      // 生成建議列表
      const suggestions = filteredInsights.slice(0, 5).map(insight => ({
        title: insight.title,
        description: insight.description,
        priority: insight.impact as 'high' | 'medium' | 'low',
        category: insight.category,
        actionUrl: this.generateActionUrl(insight)
      }));

      // 生成快速行動
      const quickActions = this.generateQuickActions(insights);

      return {
        primarySuggestion,
        suggestions,
        quickActions
      };

    } catch (error) {
      console.error('Error getting personalized dashboard suggestions:', error);
      return {
        primarySuggestion: '繼續優化您的信用卡組合',
        suggestions: [],
        quickActions: []
      };
    }
  }

  /**
   * 獲取組合健康度檢查
   */
  async getPortfolioHealthCheck(userId: string): Promise<{
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
    healthScore: number;
    areas: Array<{
      name: string;
      score: number;
      status: 'excellent' | 'good' | 'needs_attention' | 'critical';
      recommendations: string[];
    }>;
    summary: string;
  }> {
    try {
      const insights = await this.generateDashboardInsights(userId);
      const metrics = insights.performanceMetrics;

      // 計算各個領域的健康度
      const areas = [
        {
          name: '獎勵優化',
          score: Math.min(metrics.efficiency * 100, 100),
          status: this.getHealthStatus(metrics.efficiency),
          recommendations: this.getRewardOptimizationRecommendations(metrics)
        },
        {
          name: '年費效益',
          score: Math.min(metrics.annualFeeOptimization * 100, 100),
          status: this.getHealthStatus(metrics.annualFeeOptimization),
          recommendations: this.getFeeOptimizationRecommendations(metrics)
        },
        {
          name: '使用率',
          score: this.calculateUtilizationScore(metrics.utilizationRate),
          status: this.getUtilizationStatus(metrics.utilizationRate),
          recommendations: this.getUtilizationRecommendations(metrics)
        },
        {
          name: '多樣化',
          score: Math.min(metrics.diversificationScore * 100, 100),
          status: this.getHealthStatus(metrics.diversificationScore),
          recommendations: this.getDiversificationRecommendations(metrics)
        }
      ];

      // 計算整體健康度
      const healthScore = areas.reduce((sum, area) => sum + area.score, 0) / areas.length;
      const overallHealth = this.determineOverallHealth(healthScore);

      // 生成總結
      const summary = this.generateHealthSummary(overallHealth, healthScore, areas);

      return {
        overallHealth,
        healthScore,
        areas,
        summary
      };

    } catch (error) {
      console.error('Error getting portfolio health check:', error);
      return {
        overallHealth: 'fair',
        healthScore: 50,
        areas: [],
        summary: '無法完成健康度檢查，請稍後再試'
      };
    }
  }

  // ===========================================
  // 私有方法
  // ===========================================

  /**
   * 計算效能指標
   */
  private async calculatePerformanceMetrics(userId: string): Promise<PerformanceMetrics> {
    // 獲取用戶卡片組合
    const userCards = await userCardRepository.findUserCardsWithDetails(userId);
    const portfolio = await userCardRepository.getUserCardPortfolio(userId);

    // 獲取獎勵比較
    const rewardComparison = await rewardEstimatorService.estimateUserRewards(userId);

    // 計算各項指標
    const totalRewardsEarned = rewardComparison.currentAnnualRewards;
    const potentialRewards = rewardComparison.potentialAnnualRewards;
    const efficiency = totalRewardsEarned / Math.max(potentialRewards, 1);
    
    const utilizationRate = portfolio.utilizationRate / 100;
    const diversificationScore = this.calculateDiversificationScore(userCards);
    const annualFeeOptimization = this.calculateAnnualFeeOptimization(userCards, totalRewardsEarned);

    return {
      totalRewardsEarned,
      potentialRewards,
      efficiency,
      utilizationRate,
      diversificationScore,
      annualFeeOptimization
    };
  }

  /**
   * 分析趨勢
   */
  private async analyzeTrends(userId: string): Promise<TrendsAnalysis> {
    // 獲取消費趨勢
    const spendingTrends = await this.analyzeSpendingTrends(userId);
    
    // 獲取獎勵趨勢
    const rewardTrends = await this.analyzeRewardTrends(userId);
    
    // 獲取季節性洞察
    const seasonalInsights = this.getSeasonalInsights();

    return {
      spendingTrends,
      rewardTrends,
      seasonalInsights
    };
  }

  /**
   * 生成優化機會
   */
  private generateOptimizationOpportunities(
    portfolioAnalysis: PortfolioAnalysis,
    rewardComparison: RewardComparisonResult
  ): OptimizationOpportunity[] {
    const opportunities: OptimizationOpportunity[] = [];

    // 基於組合分析的機會
    for (const rec of portfolioAnalysis.recommendations) {
      opportunities.push({
        type: this.mapActionTypeToOpportunityType(rec.action),
        priority: rec.priority,
        potentialBenefit: rec.expectedBenefit,
        description: rec.reasoning,
        actionRequired: this.generateActionDescription(rec),
        timeframe: this.estimateTimeframe(rec.action),
        confidence: rec.confidence
      });
    }

    // 基於獎勵比較的機會
    if (rewardComparison.totalGainPotential > 100) {
      opportunities.push({
        type: 'add_card',
        priority: 'high',
        potentialBenefit: rewardComparison.totalGainPotential,
        description: '發現顯著的獎勵提升機會',
        actionRequired: '考慮申請新的高獎勵信用卡',
        timeframe: '1-2個月',
        confidence: 0.8
      });
    }

    // 排序並返回
    return opportunities.sort((a, b) => b.potentialBenefit - a.potentialBenefit);
  }

  /**
   * 生成可行動洞察
   */
  private generateActionableInsights(
    portfolioAnalysis: PortfolioAnalysis,
    rewardComparison: RewardComparisonResult,
    performanceMetrics: PerformanceMetrics
  ): ActionableInsight[] {
    const insights: ActionableInsight[] = [];

    // 獎勵優化洞察
    if (performanceMetrics.efficiency < 0.7) {
      insights.push({
        id: 'reward_optimization',
        category: 'rewards',
        title: '獎勵優化機會',
        description: '您的獎勵效率可以進一步提升',
        impact: 'high',
        actionItems: [
          '檢視消費類別分布',
          '考慮申請專門類別的高獎勵卡',
          '優化現有卡片的使用策略'
        ],
        expectedOutcome: `年度獎勵可提升 $${rewardComparison.totalGainPotential.toFixed(0)}`
      });
    }

    // 年費優化洞察
    if (performanceMetrics.annualFeeOptimization < 0.6) {
      insights.push({
        id: 'fee_optimization',
        category: 'fees',
        title: '年費效益分析',
        description: '部分信用卡的年費可能不符合效益',
        impact: 'medium',
        actionItems: [
          '檢視每張卡的年費與獲得獎勵比例',
          '考慮降級或取消低效益卡片',
          '尋找免年費的替代方案'
        ],
        expectedOutcome: '優化年費支出，提高整體投資報酬率'
      });
    }

    // 使用率洞察
    if (performanceMetrics.utilizationRate > 0.3) {
      insights.push({
        id: 'utilization_warning',
        category: 'spending',
        title: '信用使用率警告',
        description: '您的信用使用率可能影響信用分數',
        impact: 'high',
        actionItems: [
          '降低信用卡餘額',
          '考慮申請額度提升',
          '分散消費到多張卡片'
        ],
        expectedOutcome: '改善信用分數，維持良好信用記錄'
      });
    }

    return insights;
  }

  /**
   * 轉換組合推薦為推薦項目
   */
  private convertPortfolioRecommendationsToItems(recommendations: any[]): RecommendationItem[] {
    return recommendations.map(rec => ({
      cardId: rec.cardId,
      cardName: rec.cardName,
      score: rec.confidence,
      reasoning: rec.reasoning,
      estimatedBenefit: rec.expectedBenefit,
      confidence: rec.confidence,
      priority: rec.priority,
      ctaText: this.getActionCTA(rec.action),
      messageTitle: this.getActionTitle(rec.action),
      messageDescription: rec.reasoning,
      tags: ['portfolio_optimization', rec.action.toLowerCase()]
    }));
  }

  /**
   * 應用儀表板篩選
   */
  private applyDashboardFilters(
    recommendations: RecommendationItem[],
    filters?: any
  ): RecommendationItem[] {
    let filtered = [...recommendations];

    if (filters?.maxResults) {
      filtered = filtered.slice(0, filters.maxResults);
    }

    return filtered;
  }

  // 輔助方法實現
  private mapActionTypeToOpportunityType(action: ActionType): OptimizationOpportunity['type'] {
    switch (action) {
      case ActionType.ADD_NEW: return 'add_card';
      case ActionType.CANCEL_CARD: return 'remove_card';
      case ActionType.UPGRADE_CURRENT: return 'upgrade_card';
      default: return 'optimize_usage';
    }
  }

  private generateActionDescription(rec: any): string {
    switch (rec.action) {
      case ActionType.ADD_NEW: return `申請 ${rec.cardName}`;
      case ActionType.CANCEL_CARD: return `取消 ${rec.cardName}`;
      case ActionType.UPGRADE_CURRENT: return `升級至 ${rec.cardName}`;
      default: return '優化使用策略';
    }
  }

  private estimateTimeframe(action: ActionType): string {
    switch (action) {
      case ActionType.CANCEL_CARD: return '立即';
      case ActionType.ADD_NEW: return '1-2個月';
      default: return '2-4週';
    }
  }

  private calculateDiversificationScore(userCards: any[]): number {
    const cardTypes = new Set(userCards.map(card => card.cardType));
    return Math.min(cardTypes.size / 4, 1); // 假設4種類型是完全多樣化
  }

  private calculateAnnualFeeOptimization(userCards: any[], totalRewards: number): number {
    const totalFees = userCards.reduce((sum, card) => sum + (card.annualFee || 0), 0);
    return totalFees > 0 ? Math.min(totalRewards / totalFees, 2) / 2 : 1;
  }

  private async analyzeSpendingTrends(userId: string) {
    // 簡化實現
    return {
      growingCategories: [
        { category: 'dining', growth: 15 },
        { category: 'online', growth: 12 }
      ],
      decliningCategories: [
        { category: 'gas', decline: -8 }
      ]
    };
  }

  private async analyzeRewardTrends(userId: string) {
    // 簡化實現
    return {
      bestPerformingCards: [
        { cardId: 'card-1', performance: 85 }
      ],
      underutilizedCards: [
        { cardId: 'card-2', utilization: 25 }
      ]
    };
  }

  private getSeasonalInsights() {
    return {
      upcomingOpportunities: ['年末購物季優惠', '旅遊旺季獎勵'],
      historicalPatterns: ['12月消費通常增加30%', '夏季旅遊支出較高']
    };
  }

  private generatePrimarySuggestion(insights: DashboardInsights, focusArea?: string): string {
    if (insights.portfolioScore < 6) {
      return '您的信用卡組合有很大優化空間，建議立即採取行動';
    }
    if (insights.portfolioScore < 8) {
      return '您的組合表現良好，但仍有提升潛力';
    }
    return '您的信用卡組合表現優異，繼續保持';
  }

  private generateQuickActions(insights: DashboardInsights) {
    return [
      {
        text: '檢視獎勵機會',
        action: 'view_rewards',
        benefit: '提升獎勵收益'
      },
      {
        text: '優化年費支出',
        action: 'optimize_fees',
        benefit: '降低持卡成本'
      }
    ];
  }

  private getHealthStatus(score: number): 'excellent' | 'good' | 'needs_attention' | 'critical' {
    if (score > 0.8) return 'excellent';
    if (score > 0.6) return 'good';
    if (score > 0.4) return 'needs_attention';
    return 'critical';
  }

  private calculateUtilizationScore(utilizationRate: number): number {
    // 理想使用率是10-30%
    if (utilizationRate <= 0.3 && utilizationRate >= 0.1) return 100;
    if (utilizationRate < 0.1) return 80;
    if (utilizationRate <= 0.5) return 60;
    return 30;
  }

  private getUtilizationStatus(utilizationRate: number): 'excellent' | 'good' | 'needs_attention' | 'critical' {
    if (utilizationRate <= 0.3 && utilizationRate >= 0.1) return 'excellent';
    if (utilizationRate <= 0.5) return 'good';
    if (utilizationRate <= 0.7) return 'needs_attention';
    return 'critical';
  }

  private getRewardOptimizationRecommendations(metrics: PerformanceMetrics): string[] {
    return ['考慮申請高獎勵率信用卡', '優化消費類別分配'];
  }

  private getFeeOptimizationRecommendations(metrics: PerformanceMetrics): string[] {
    return ['檢視年費與收益比例', '考慮降級或取消低效益卡片'];
  }

  private getUtilizationRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations = [];
    if (metrics.utilizationRate > 0.3) {
      recommendations.push('降低信用卡餘額');
      recommendations.push('考慮申請額度提升');
    }
    return recommendations;
  }

  private getDiversificationRecommendations(metrics: PerformanceMetrics): string[] {
    return ['考慮不同類型的信用卡', '平衡現金回饋與旅遊獎勵'];
  }

  private determineOverallHealth(healthScore: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (healthScore > 80) return 'excellent';
    if (healthScore > 60) return 'good';
    if (healthScore > 40) return 'fair';
    return 'poor';
  }

  private generateHealthSummary(overallHealth: string, healthScore: number, areas: any[]): string {
    const statusMap = {
      excellent: '您的信用卡組合健康度優秀',
      good: '您的信用卡組合健康度良好',
      fair: '您的信用卡組合健康度一般',
      poor: '您的信用卡組合需要改善'
    };
    
    return statusMap[overallHealth] + `（分數：${healthScore.toFixed(0)}）`;
  }

  private getActionCTA(action: ActionType): string {
    switch (action) {
      case ActionType.ADD_NEW: return '申請此卡';
      case ActionType.CANCEL_CARD: return '考慮取消';
      case ActionType.UPGRADE_CURRENT: return '升級';
      default: return '了解更多';
    }
  }

  private getActionTitle(action: ActionType): string {
    switch (action) {
      case ActionType.ADD_NEW: return '推薦新卡';
      case ActionType.CANCEL_CARD: return '建議取消';
      case ActionType.UPGRADE_CURRENT: return '升級建議';
      default: return '優化建議';
    }
  }

  private generateActionUrl(insight: ActionableInsight): string {
    return `/dashboard/${insight.category}/${insight.id}`;
  }

  private buildDashboardRecommendationMetadata(
    portfolioAnalysis: PortfolioAnalysis,
    startTime: number
  ): RecommendationMetadata {
    return {
      algorithmVersion: '2.1.0',
      personalizationScore: 0.8,
      diversityScore: 0.7,
      contextFactors: ['portfolio_optimization', 'dashboard'],
      filtersCriteria: ['portfolio_based'],
      performanceMetrics: {
        responseTime: Date.now() - startTime,
        confidenceLevel: 0.8,
        dataFreshness: 0.9
      }
    };
  }

  private generateRecommendationId(): string {
    return `dash_rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const dashboardRecommendationService = new DashboardRecommendationService();