import { AnalyticsRepository } from '../repositories/AnalyticsRepository';
import { 
  SpendingAnalytics, 
  CardPerformanceAnalytics, 
  PortfolioAnalytics, 
  SystemPerformanceMetrics,
  AnalyticsRequest,
  SpendingCategoryAnalytics,
  MerchantAnalytics,
  SeasonalTrend,
  CardCategorySpending,
  MissedRewardOpportunity,
  CardPerformanceSummary,
  OptimizationRecommendation,
  ApiPerformanceMetrics,
  RecommendationPerformanceMetrics,
  UserEngagementMetrics
} from '../models/Analytics';
import { SpendingCategory } from '../models/types';
import { userCardRepository } from '../repositories/UserCardRepository';
import { creditCardRepository } from '../repositories/CreditCardRepository';

export class AnalyticsService {
  private analyticsRepository: AnalyticsRepository;

  constructor() {
    this.analyticsRepository = new AnalyticsRepository();
  }

  /**
   * Get user spending analytics
   */
  async getSpendingAnalytics(request: AnalyticsRequest): Promise<SpendingAnalytics> {
    try {
      // Check cache
      const cached = await this.analyticsRepository.findCachedAnalytics(
        request.userId,
        'spending',
        request.timeframe,
        request.startDate || this.getDefaultStartDate(request.timeframe),
        request.endDate || new Date()
      );

      if (cached) {
        return cached.cacheData as SpendingAnalytics;
      }

      // Calculate date range
      const { startDate, endDate } = this.calculateDateRange(request);

      // Get data from database
      const spendingData = await this.analyticsRepository.getSpendingByCategory(
        request.userId,
        startDate,
        endDate
      );

      const merchantData = await this.analyticsRepository.getTopMerchants(
        request.userId,
        startDate,
        endDate,
        10
      );

      // Calculate basic statistics
      const totalSpent = spendingData.reduce((sum, item) => sum + item.totalAmount, 0);
      const transactionCount = spendingData.reduce((sum, item) => sum + item.transactionCount, 0);
      const averageTransactionAmount = transactionCount > 0 ? totalSpent / transactionCount : 0;

      // Calculate month over month change
      const monthOverMonthChange = await this.calculateMonthOverMonthChange(
        request.userId,
        startDate,
        endDate
      );

      // Build response
      const analytics: SpendingAnalytics = {
        userId: request.userId,
        timeframe: request.timeframe as any,
        startDate,
        endDate,
        totalSpent,
        transactionCount,
        averageTransactionAmount,
        spendingByCategory: this.transformSpendingData(spendingData, totalSpent),
        topMerchants: this.transformMerchantData(merchantData, totalSpent),
        monthOverMonthChange,
        seasonalTrends: request.includeSeasonalTrends ? 
          await this.calculateSeasonalTrends(request.userId) : []
      };

      // Cache result
      await this.analyticsRepository.saveAnalyticsCache(
        request.userId,
        'spending',
        request.timeframe,
        startDate,
        endDate,
        analytics,
        24 // Cache for 24 hours
      );

      return analytics;

    } catch (error) {
      console.error('Error in getSpendingAnalytics:', error);
      throw new Error(`Failed to get spending analytics: ${(error as Error).message}`);
    }
  }

  /**
   * Get card performance analytics
   */
  async getCardPerformanceAnalytics(
    request: AnalyticsRequest,
    cardId: string
  ): Promise<CardPerformanceAnalytics> {
    try {
      const cacheKey = `${cardId}_${request.timeframe}`;
      const cached = await this.analyticsRepository.findCachedAnalytics(
        request.userId,
        'cardPerformance',
        cacheKey,
        request.startDate || this.getDefaultStartDate(request.timeframe),
        request.endDate || new Date()
      );

      if (cached) {
        return cached.cacheData as CardPerformanceAnalytics;
      }

      const { startDate, endDate } = this.calculateDateRange(request);

      // Get card basic info
      const card = await creditCardRepository.findById(cardId);
      if (!card) {
        throw new Error(`Card ${cardId} not found`);
      }

      // Get card spending data
      const cardSpending = await this.analyticsRepository.getCardSpending(
        request.userId,
        cardId,
        startDate,
        endDate
      );

      // Get reward data
      const rewardData = await this.analyticsRepository.getCardRewardPerformance(
        request.userId,
        cardId,
        startDate,
        endDate
      );

      // Get missed reward opportunities
      const missedRewardsResult = await this.analyticsRepository.getMissedRewardOpportunities(
        request.userId,
        startDate,
        endDate
      );
      
      const missedRewards = missedRewardsResult.missedByCategory.map(missed => ({
        category: missed.category,
        totalAmount: 0,
        currentRewards: 0,
        potentialRewards: missed.amount,
        missedAmount: missed.amount,
        recommendedCardId: '',
        recommendedCardName: missed.potentialCard
      }));

      // Calculate performance metrics
      const totalSpent = cardSpending.totalSpent;
      const transactionCount = cardSpending.transactionCount;
      const rewardsEarned = rewardData.estimatedRewards || 0;
      const effectiveRewardRate = rewardData.effectiveRate / 100 || 0;
      const netValue = rewardsEarned - (card.annualFee || 0);
      
      // Calculate optimization score (0-100)
      const optimizationScore = this.calculateOptimizationScore(
        effectiveRewardRate,
        card.annualFee || 0,
        totalSpent,
        rewardsEarned
      );

      const analytics: CardPerformanceAnalytics = {
        userId: request.userId,
        cardId,
        timeframe: request.timeframe as any,
        startDate,
        endDate,
        totalSpent,
        transactionCount,
        rewardsEarned,
        effectiveRewardRate,
        annualFee: card.annualFee || 0,
        netValue,
        spendingByCategory: this.transformCardSpendingData(cardSpending.categoryBreakdown, rewardsEarned),
        optimizationScore,
        missedRewards: missedRewards
      };

      // Cache result
      await this.analyticsRepository.saveAnalyticsCache(
        request.userId,
        'cardPerformance',
        cacheKey,
        startDate,
        endDate,
        analytics,
        12 // Cache for 12 hours
      );

      return analytics;

    } catch (error) {
      console.error('Error in getCardPerformanceAnalytics:', error);
      throw new Error(`Failed to get card performance analytics: ${(error as Error).message}`);
    }
  }

  /**
   * Get portfolio analytics
   */
  async getPortfolioAnalytics(request: AnalyticsRequest): Promise<PortfolioAnalytics> {
    try {
      const cached = await this.analyticsRepository.findCachedAnalytics(
        request.userId,
        'portfolio',
        request.timeframe,
        request.startDate || this.getDefaultStartDate(request.timeframe),
        request.endDate || new Date()
      );

      if (cached) {
        return cached.cacheData as PortfolioAnalytics;
      }

      const { startDate, endDate } = this.calculateDateRange(request);

      // Get user cards
      const userCards = await userCardRepository.findUserCardsWithDetails(request.userId);
      
      if (userCards.length === 0) {
        throw new Error('No cards found for user');
      }

      // Get performance data for each card
      const cardPerformances: CardPerformanceSummary[] = [];
      let totalRewardsEarned = 0;
      let totalAnnualFees = 0;

      for (const userCard of userCards) {
        const cardAnalytics = await this.getCardPerformanceAnalytics(
          request,
          userCard.creditCardId
        );

        const card = await creditCardRepository.findById(userCard.creditCardId);
        
        cardPerformances.push({
          cardId: userCard.creditCardId,
          cardName: card?.name || 'Unknown Card',
          annualFee: cardAnalytics.annualFee,
          rewardsEarned: cardAnalytics.rewardsEarned,
          netValue: cardAnalytics.netValue,
          effectiveRewardRate: cardAnalytics.effectiveRewardRate,
          utilizationPercentage: this.calculateUtilizationPercentage(userCard),
          bestCategories: this.extractBestCategories(cardAnalytics.spendingByCategory)
        });

        totalRewardsEarned += cardAnalytics.rewardsEarned;
        totalAnnualFees += cardAnalytics.annualFee;
      }

      const netValue = totalRewardsEarned - totalAnnualFees;
      const totalSpent = cardPerformances.reduce((sum, card) => {
        return sum + (card.rewardsEarned / Math.max(card.effectiveRewardRate, 0.01));
      }, 0);
      const overallEffectiveRate = totalSpent > 0 ? totalRewardsEarned / totalSpent : 0;

      // Calculate portfolio optimization score
      const optimizationScore = this.calculatePortfolioOptimizationScore(cardPerformances);

      // Generate optimization recommendations
      const optimizationRecommendations = await this.generateOptimizationRecommendations(
        request.userId,
        cardPerformances
      );

      const analytics: PortfolioAnalytics = {
        userId: request.userId,
        timeframe: request.timeframe as any,
        startDate,
        endDate,
        totalCards: userCards.length,
        totalAnnualFees,
        totalRewardsEarned,
        netValue,
        overallEffectiveRate,
        optimizationScore,
        cardPerformance: cardPerformances,
        optimizationRecommendations
      };

      // Cache result
      await this.analyticsRepository.saveAnalyticsCache(
        request.userId,
        'portfolio',
        request.timeframe,
        startDate,
        endDate,
        analytics,
        6 // Cache for 6 hours
      );

      return analytics;

    } catch (error) {
      console.error('Error in getPortfolioAnalytics:', error);
      throw new Error(`Failed to get portfolio analytics: ${(error as Error).message}`);
    }
  }

  /**
   * Get missed rewards analytics
   */
  async getMissedRewardsAnalytics(request: AnalyticsRequest): Promise<MissedRewardOpportunity[]> {
    try {
      const { startDate, endDate } = this.calculateDateRange(request);

      // Get missed reward opportunities for all cards
      const userCards = await userCardRepository.findUserCardsWithDetails(request.userId);
      const allMissedRewards: MissedRewardOpportunity[] = [];

      for (const userCard of userCards) {
        const missedRewardsResult = await this.analyticsRepository.getMissedRewardOpportunities(
          request.userId,
          startDate,
          endDate
        );

        const cardMissedRewards = missedRewardsResult.missedByCategory.map(missed => ({
          category: missed.category,
          totalAmount: 0,
          currentRewards: 0,
          potentialRewards: missed.amount,
          missedAmount: missed.amount,
          recommendedCardId: '',
          recommendedCardName: missed.potentialCard
        }));

        allMissedRewards.push(...cardMissedRewards);
      }

      // Sort by missed amount
      return allMissedRewards.sort((a, b) => b.missedAmount - a.missedAmount);

    } catch (error) {
      console.error('Error in getMissedRewardsAnalytics:', error);
      throw new Error(`Failed to get missed rewards analytics: ${(error as Error).message}`);
    }
  }

  /**
   * Get system performance metrics
   */
  async getSystemPerformanceMetrics(
    timeframe: 'hour' | 'day' | 'week' | 'month',
    startDate?: Date,
    endDate?: Date
  ): Promise<SystemPerformanceMetrics> {
    try {
      const { startDate: calcStartDate, endDate: calcEndDate } = this.calculateDateRange({
        timeframe,
        startDate,
        endDate
      } as AnalyticsRequest);

      // Get system metrics (using simulated data for now)
      const apiMetrics: ApiPerformanceMetrics = {
        totalRequests: 10000,
        averageResponseTime: 250,
        p95ResponseTime: 500,
        p99ResponseTime: 1000,
        errorRate: 0.02,
        endpointPerformance: [
          {
            endpoint: '/api/analytics/spending',
            requestCount: 2000,
            averageResponseTime: 300,
            p95ResponseTime: 600,
            errorRate: 0.01
          },
          {
            endpoint: '/api/recommendations/homepage',
            requestCount: 3000,
            averageResponseTime: 200,
            p95ResponseTime: 400,
            errorRate: 0.005
          }
        ]
      };

      const recommendationMetrics: RecommendationPerformanceMetrics = {
        totalRecommendations: 5000,
        clickThroughRate: 0.15,
        conversionRate: 0.03,
        dismissalRate: 0.25,
        averageRecommendationScore: 0.75,
        recommendationsByType: {
          'transaction_suggestion': 2000,
          'card_recommendation': 1500,
          'portfolio_optimization': 1000,
          'spending_alert': 500
        }
      };

      const userEngagementMetrics: UserEngagementMetrics = {
        activeUsers: 800,
        newUsers: 50,
        returningUsers: 750,
        averageSessionDuration: 420, // 7 minutes
        featuresUsed: {
          'analytics_dashboard': 600,
          'card_recommendations': 500,
          'spending_analysis': 700,
          'portfolio_optimization': 300
        }
      };

      return {
        timeframe,
        startDate: calcStartDate,
        endDate: calcEndDate,
        apiMetrics,
        recommendationMetrics,
        userEngagementMetrics
      };

    } catch (error) {
      console.error('Error in getSystemPerformanceMetrics:', error);
      throw new Error(`Failed to get system performance metrics: ${(error as Error).message}`);
    }
  }

  // Private helper methods
  private calculateDateRange(request: Partial<AnalyticsRequest>): { startDate: Date; endDate: Date } {
    const endDate = request.endDate || new Date();
    let startDate = request.startDate;

    if (!startDate) {
      startDate = this.getDefaultStartDate(request.timeframe || 'month');
    }

    return { startDate, endDate };
  }

  private getDefaultStartDate(timeframe: string): Date {
    const now = new Date();
    const startDate = new Date(now);

    switch (timeframe) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    return startDate;
  }

  private transformSpendingData(
    spendingData: any[],
    totalSpent: number
  ): SpendingCategoryAnalytics[] {
    return spendingData.map(item => ({
      category: item.category as SpendingCategory,
      totalAmount: item.totalAmount,
      transactionCount: item.transactionCount,
      averageAmount: item.transactionCount > 0 ? item.totalAmount / item.transactionCount : 0,
      percentOfTotal: totalSpent > 0 ? (item.totalAmount / totalSpent) * 100 : 0,
      monthOverMonthChange: item.monthOverMonthChange || 0
    }));
  }

  private transformMerchantData(
    merchantData: any[],
    totalSpent: number
  ): MerchantAnalytics[] {
    return merchantData.map(item => ({
      merchant: item.merchant,
      totalAmount: item.totalAmount,
      transactionCount: item.transactionCount,
      averageAmount: item.transactionCount > 0 ? item.totalAmount / item.transactionCount : 0,
      percentOfTotal: totalSpent > 0 ? (item.totalAmount / totalSpent) * 100 : 0,
      categories: item.categories || []
    }));
  }

  private transformCardSpendingData(
    spendingData: any[],
    totalRewards: number
  ): CardCategorySpending[] {
    return spendingData.map(item => ({
      category: item.category as SpendingCategory,
      totalAmount: item.amount || item.totalAmount,
      transactionCount: item.count || item.transactionCount,
      rewardsEarned: item.rewardsEarned || 0,
      effectiveRewardRate: (item.amount || item.totalAmount) > 0 ? (item.rewardsEarned || 0) / (item.amount || item.totalAmount) : 0
    }));
  }

  private transformMissedRewardsData(missedRewardsData: any[]): MissedRewardOpportunity[] {
    return missedRewardsData.map(item => ({
      category: item.category as SpendingCategory,
      totalAmount: item.totalAmount,
      currentRewards: item.currentRewards,
      potentialRewards: item.potentialRewards,
      missedAmount: item.potentialRewards - item.currentRewards,
      recommendedCardId: item.recommendedCardId,
      recommendedCardName: item.recommendedCardName
    }));
  }

  private async calculateMonthOverMonthChange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      const periodLength = endDate.getTime() - startDate.getTime();
      const prevStartDate = new Date(startDate.getTime() - periodLength);
      const prevEndDate = new Date(startDate);

      const currentSpending = await this.analyticsRepository.getSpendingByCategory(
        userId,
        startDate,
        endDate
      );

      const previousSpending = await this.analyticsRepository.getSpendingByCategory(
        userId,
        prevStartDate,
        prevEndDate
      );

      const currentTotal = currentSpending.reduce((sum, item) => sum + item.totalAmount, 0);
      const previousTotal = previousSpending.reduce((sum, item) => sum + item.totalAmount, 0);

      if (previousTotal === 0) return currentTotal > 0 ? 100 : 0;

      return ((currentTotal - previousTotal) / previousTotal) * 100;

    } catch (error) {
      console.error('Error calculating month over month change:', error);
      return 0;
    }
  }

  private async calculateSeasonalTrends(userId: string): Promise<SeasonalTrend[]> {
    // Simplified implementation - should analyze historical data
    return [];
  }

  private calculateOptimizationScore(
    effectiveRewardRate: number,
    annualFee: number,
    totalSpent: number,
    rewardsEarned: number
  ): number {
    const netValue = rewardsEarned - annualFee;
    const roi = annualFee > 0 ? netValue / annualFee : rewardsEarned / Math.max(totalSpent * 0.01, 1);
    
    return Math.min(Math.max(roi * 10 + 50, 0), 100);
  }

  private calculateUtilizationPercentage(userCard: any): number {
    // Simplified implementation - should calculate from credit limit
    return Math.random() * 30; // 0-30% utilization
  }

  private extractBestCategories(spendingByCategory: CardCategorySpending[]): SpendingCategory[] {
    return spendingByCategory
      .sort((a, b) => b.effectiveRewardRate - a.effectiveRewardRate)
      .slice(0, 3)
      .map(item => item.category);
  }

  private calculatePortfolioOptimizationScore(cardPerformances: CardPerformanceSummary[]): number {
    if (cardPerformances.length === 0) return 0;

    const averageEffectiveRate = cardPerformances.reduce(
      (sum, card) => sum + card.effectiveRewardRate, 0
    ) / cardPerformances.length;

    const totalNetValue = cardPerformances.reduce((sum, card) => sum + card.netValue, 0);
    const totalFees = cardPerformances.reduce((sum, card) => sum + card.annualFee, 0);

    const efficiencyScore = Math.min(averageEffectiveRate * 100 * 2, 100);
    const valueScore = totalFees > 0 ? Math.min((totalNetValue / totalFees) * 20 + 50, 100) : 80;

    return (efficiencyScore + valueScore) / 2;
  }

  private async generateOptimizationRecommendations(
    userId: string,
    cardPerformances: CardPerformanceSummary[]
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Find poor performing cards
    const poorPerformingCards = cardPerformances.filter(card => 
      card.netValue < 0 || card.effectiveRewardRate < 0.01
    );

    for (const card of poorPerformingCards) {
      recommendations.push({
        recommendationType: 'remove',
        cardId: card.cardId,
        cardName: card.cardName,
        projectedAnnualBenefit: Math.abs(card.netValue),
        justification: `Annual fee of $${card.annualFee} exceeds rewards earned. Consider canceling to save costs.`,
        impactScore: Math.min(Math.abs(card.netValue) / 100, 10)
      });
    }

    // Suggest adding new cards if there's room
    if (cardPerformances.length < 5) {
      recommendations.push({
        recommendationType: 'add',
        projectedAnnualBenefit: 200,
        justification: 'Based on your spending patterns, adding a cashback card could improve overall rewards.',
        impactScore: 7
      });
    }

    return recommendations.sort((a, b) => b.impactScore - a.impactScore);
  }

  /**
   * Get dashboard analytics
   */
  async getDashboardAnalytics(request: AnalyticsRequest): Promise<any> {
    try {
      const { startDate, endDate } = this.calculateDateRange(request);

      // Get spending analytics
      const spendingAnalytics = await this.getSpendingAnalytics(request);
      
      // Get card performance analytics
      const cardPerformances = await this.getCardPerformanceAnalytics(request);
      
      // Get portfolio analytics
      const portfolioAnalytics = await this.getPortfolioAnalytics(request);

      // Get missed rewards
      const missedRewards = await this.analyticsRepository.getMissedRewardOpportunities(
        request.userId,
        startDate,
        endDate
      );

      return {
        timeframe: request.timeframe,
        startDate,
        endDate,
        spending: spendingAnalytics,
        cardPerformance: cardPerformances,
        portfolio: portfolioAnalytics,
        missedRewards: this.transformMissedRewardsData(missedRewards),
        summary: {
          totalSpent: spendingAnalytics.totalSpent,
          totalRewards: cardPerformances.totalRewardsEarned,
          totalMissedRewards: missedRewards.reduce((sum, item) => sum + (item.potentialRewards - item.currentRewards), 0),
          portfolioScore: portfolioAnalytics.optimizationScore,
        }
      };
    } catch (error) {
      console.error('Error in getDashboardAnalytics:', error);
      throw new Error(`Failed to get dashboard analytics: ${(error as Error).message}`);
    }
  }

  /**
   * Get spending categories analytics
   */
  async getSpendingCategoriesAnalytics(request: AnalyticsRequest): Promise<any> {
    try {
      const { startDate, endDate } = this.calculateDateRange(request);

      const spendingData = await this.analyticsRepository.getSpendingByCategory(
        request.userId,
        startDate,
        endDate
      );

      const totalSpent = spendingData.reduce((sum, item) => sum + item.totalAmount, 0);

      // Get month-over-month changes for each category
      const categoriesWithTrends = await Promise.all(
        spendingData.map(async (item) => {
          const monthOverMonthChange = await this.calculateCategoryMonthOverMonthChange(
            request.userId,
            item.category,
            startDate,
            endDate
          );
          
          return {
            category: item.category,
            totalAmount: item.totalAmount,
            transactionCount: item.transactionCount,
            averageAmount: item.transactionCount > 0 ? item.totalAmount / item.transactionCount : 0,
            percentOfTotal: totalSpent > 0 ? (item.totalAmount / totalSpent) * 100 : 0,
            monthOverMonthChange,
            trend: monthOverMonthChange > 5 ? 'increasing' : monthOverMonthChange < -5 ? 'decreasing' : 'stable'
          };
        })
      );

      return {
        timeframe: request.timeframe,
        startDate,
        endDate,
        categories: categoriesWithTrends.sort((a, b) => b.totalAmount - a.totalAmount),
        totalSpent,
        topCategories: categoriesWithTrends.slice(0, 5),
        growthCategories: categoriesWithTrends.filter(c => c.monthOverMonthChange > 10).slice(0, 3),
        declineCategories: categoriesWithTrends.filter(c => c.monthOverMonthChange < -10).slice(0, 3),
      };
    } catch (error) {
      console.error('Error in getSpendingCategoriesAnalytics:', error);
      throw new Error(`Failed to get spending categories analytics: ${(error as Error).message}`);
    }
  }

  /**
   * Get card performance comparison
   */
  async getCardPerformanceComparison(request: AnalyticsRequest): Promise<any> {
    try {
      const { startDate, endDate } = this.calculateDateRange(request);

      // Get user's cards
      const userCards = await userCardRepository.findUserCardsWithDetails(request.userId);

      // Filter cards if specific IDs requested
      const cardsToAnalyze = request.cardIds 
        ? userCards.filter(card => request.cardIds!.includes(card.cardId))
        : userCards;

      const cardComparisons = await Promise.all(
        cardsToAnalyze.map(async (userCard) => {
          const cardSpending = await this.analyticsRepository.getCardSpending(
            request.userId,
            userCard.cardId,
            startDate,
            endDate
          );

          const spendingByCategory = await this.analyticsRepository.getCardSpendingByCategory(
            request.userId,
            userCard.cardId,
            startDate,
            endDate
          );

          const totalSpent = cardSpending.reduce((sum, item) => sum + item.amount, 0);
          const totalRewards = cardSpending.reduce((sum, item) => sum + item.rewardsEarned, 0);
          const transactionCount = cardSpending.length;

          return {
            cardId: userCard.cardId,
            cardName: userCard.cardName,
            issuer: userCard.issuer,
            totalSpent,
            totalRewards,
            transactionCount,
            averageTransaction: transactionCount > 0 ? totalSpent / transactionCount : 0,
            effectiveRewardRate: totalSpent > 0 ? (totalRewards / totalSpent) * 100 : 0,
            annualFee: userCard.annualFee || 0,
            netValue: totalRewards - (userCard.annualFee || 0),
            utilizationRate: this.calculateUtilizationPercentage(userCard),
            bestCategories: this.extractBestCategories(this.transformCardSpendingData(spendingByCategory, totalRewards)),
            monthlyTrend: await this.calculateCardMonthlyTrend(request.userId, userCard.cardId, startDate, endDate),
          };
        })
      );

      return {
        timeframe: request.timeframe,
        startDate,
        endDate,
        cards: cardComparisons.sort((a, b) => b.netValue - a.netValue),
        bestPerformingCard: cardComparisons.reduce((best, card) => 
          card.effectiveRewardRate > best.effectiveRewardRate ? card : best
        , cardComparisons[0]),
        worstPerformingCard: cardComparisons.reduce((worst, card) => 
          card.effectiveRewardRate < worst.effectiveRewardRate ? card : worst
        , cardComparisons[0]),
        totalPortfolioValue: cardComparisons.reduce((sum, card) => sum + card.netValue, 0),
        averageRewardRate: cardComparisons.length > 0 ? cardComparisons.reduce((sum, card) => sum + card.effectiveRewardRate, 0) / cardComparisons.length : 0,
      };
    } catch (error) {
      console.error('Error in getCardPerformanceComparison:', error);
      throw new Error(`Failed to get card performance comparison: ${(error as Error).message}`);
    }
  }

  /**
   * Get optimization opportunities
   */
  async getOptimizationOpportunities(request: AnalyticsRequest): Promise<any> {
    try {
      const { startDate, endDate } = this.calculateDateRange(request);

      // Get missed rewards
      const missedRewards = await this.analyticsRepository.getMissedRewardOpportunities(
        request.userId,
        startDate,
        endDate
      );

      // Get spending patterns
      const spendingData = await this.analyticsRepository.getSpendingByCategory(
        request.userId,
        startDate,
        endDate
      );

      // Get current cards
      const userCards = await userCardRepository.findUserCardsWithDetails(request.userId);

      const opportunities = [];

      // Analyze missed rewards
      const significantMissedRewards = missedRewards
        .filter(item => (item.potentialRewards - item.currentRewards) > 20)
        .sort((a, b) => (b.potentialRewards - b.currentRewards) - (a.potentialRewards - a.currentRewards));

      for (const missed of significantMissedRewards.slice(0, 5)) {
        opportunities.push({
          type: 'missed_rewards',
          category: missed.category,
          description: `You could earn ${missed.potentialRewards - missed.currentRewards} more rewards in ${missed.category}`,
          potentialBenefit: missed.potentialRewards - missed.currentRewards,
          recommendedAction: `Consider using ${missed.recommendedCardName} for ${missed.category} purchases`,
          recommendedCardId: missed.recommendedCardId,
          priority: (missed.potentialRewards - missed.currentRewards) > 100 ? 'high' : 'medium',
        });
      }

      // Analyze underutilized cards
      const underutilizedCards = userCards.filter(card => {
        const cardSpending = spendingData.find(s => s.cardId === card.cardId);
        return !cardSpending || cardSpending.totalAmount < 100; // Less than $100 spent
      });

      for (const card of underutilizedCards) {
        if (card.annualFee > 0) {
          opportunities.push({
            type: 'underutilized_card',
            cardId: card.cardId,
            cardName: card.cardName,
            description: `${card.cardName} has an annual fee of $${card.annualFee} but low usage`,
            potentialBenefit: card.annualFee,
            recommendedAction: 'Consider canceling or increasing usage',
            priority: card.annualFee > 200 ? 'high' : 'medium',
          });
        }
      }

      // Analyze spending concentration
      const totalSpent = spendingData.reduce((sum, item) => sum + item.totalAmount, 0);
      const topCategory = spendingData.sort((a, b) => b.totalAmount - a.totalAmount)[0];

      if (topCategory && (topCategory.totalAmount / totalSpent) > 0.4) {
        opportunities.push({
          type: 'spending_concentration',
          category: topCategory.category,
          description: `${((topCategory.totalAmount / totalSpent) * 100).toFixed(1)}% of spending is in ${topCategory.category}`,
          potentialBenefit: 'Variable based on card choice',
          recommendedAction: `Consider a card optimized for ${topCategory.category}`,
          priority: 'medium',
        });
      }

      return {
        timeframe: request.timeframe,
        startDate,
        endDate,
        opportunities: opportunities.sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }),
        totalPotentialBenefit: opportunities
          .filter(o => typeof o.potentialBenefit === 'number')
          .reduce((sum, o) => sum + o.potentialBenefit, 0),
        highPriorityCount: opportunities.filter(o => o.priority === 'high').length,
        mediumPriorityCount: opportunities.filter(o => o.priority === 'medium').length,
      };
    } catch (error) {
      console.error('Error in getOptimizationOpportunities:', error);
      throw new Error(`Failed to get optimization opportunities: ${(error as Error).message}`);
    }
  }

  /**
   * Get trends analytics
   */
  async getTrendsAnalytics(request: AnalyticsRequest): Promise<any> {
    try {
      const { startDate, endDate } = this.calculateDateRange(request);

      // Get spending trends over time
      const spendingTrends = await this.analyticsRepository.getSpendingTrends(
        request.userId,
        startDate,
        endDate,
        request.timeframe
      );

      // Get reward trends
      const rewardTrends = await this.analyticsRepository.getRewardTrends(
        request.userId,
        startDate,
        endDate,
        request.timeframe
      );

      // Calculate trend metrics
      const spendingGrowthRate = this.calculateGrowthRate(spendingTrends);
      const rewardGrowthRate = this.calculateGrowthRate(rewardTrends);

      return {
        timeframe: request.timeframe,
        startDate,
        endDate,
        spendingTrends: spendingTrends.map(item => ({
          period: item.period,
          totalAmount: item.totalAmount,
          transactionCount: item.transactionCount,
          averageTransaction: item.transactionCount > 0 ? item.totalAmount / item.transactionCount : 0,
        })),
        rewardTrends: rewardTrends.map(item => ({
          period: item.period,
          totalRewards: item.totalRewards,
          effectiveRate: item.totalAmount > 0 ? (item.totalRewards / item.totalAmount) * 100 : 0,
        })),
        growthMetrics: {
          spendingGrowthRate,
          rewardGrowthRate,
          efficiencyTrend: rewardGrowthRate - spendingGrowthRate,
        },
        predictions: {
          nextPeriodSpending: this.predictNextPeriodValue(spendingTrends),
          nextPeriodRewards: this.predictNextPeriodValue(rewardTrends),
        },
      };
    } catch (error) {
      console.error('Error in getTrendsAnalytics:', error);
      throw new Error(`Failed to get trends analytics: ${(error as Error).message}`);
    }
  }

  // Helper methods for new analytics functions
  private async calculateCategoryMonthOverMonthChange(
    userId: string,
    category: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      const periodLength = endDate.getTime() - startDate.getTime();
      const prevStartDate = new Date(startDate.getTime() - periodLength);
      const prevEndDate = new Date(startDate);

      const currentSpending = await this.analyticsRepository.getCategorySpending(
        userId,
        category,
        startDate,
        endDate
      );

      const previousSpending = await this.analyticsRepository.getCategorySpending(
        userId,
        category,
        prevStartDate,
        prevEndDate
      );

      if (previousSpending === 0) return currentSpending > 0 ? 100 : 0;

      return ((currentSpending - previousSpending) / previousSpending) * 100;
    } catch (error) {
      console.error('Error calculating category month over month change:', error);
      return 0;
    }
  }

  private async calculateCardMonthlyTrend(
    userId: string,
    cardId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ month: string; amount: number; rewards: number }>> {
    // Simplified implementation - should get actual monthly data
    const months = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      months.push({
        month: current.toISOString().substring(0, 7),
        amount: Math.random() * 1000,
        rewards: Math.random() * 50,
      });
      current.setMonth(current.getMonth() + 1);
    }
    
    return months;
  }

  private calculateGrowthRate(trends: any[]): number {
    if (trends.length < 2) return 0;
    
    const first = trends[0];
    const last = trends[trends.length - 1];
    
    if (first.totalAmount === 0) return last.totalAmount > 0 ? 100 : 0;
    
    return ((last.totalAmount - first.totalAmount) / first.totalAmount) * 100;
  }

  private predictNextPeriodValue(trends: any[]): number {
    if (trends.length < 2) return 0;
    
    // Simple linear prediction based on last two data points
    const lastTwo = trends.slice(-2);
    const growth = lastTwo[1].totalAmount - lastTwo[0].totalAmount;
    
    return lastTwo[1].totalAmount + growth;
  }
}

export const analyticsService = new AnalyticsService();