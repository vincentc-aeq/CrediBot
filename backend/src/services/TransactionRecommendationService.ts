import { triggerClassifierService, TriggerAnalysisResult } from './TriggerClassifierService';
import { rewardEstimatorService } from './RewardEstimatorService';
import { userCardRepository } from '../repositories/UserCardRepository';
import { transactionRepository } from '../repositories/TransactionRepository';
import { creditCardRepository } from '../repositories/CreditCardRepository';
import {
  RecommendationResult,
  RecommendationItem,
  RecommendationMetadata,
  RecommendationType,
  RecommendationRequest
} from './RecommendationEngineService';
import { RecEngineException } from '../models/RecEngine';
import { Transaction } from '../models/Transaction';
import { SpendingCategory } from '../models/types';

export interface TransactionTrigger {
  transactionId: string;
  userId: string;
  triggerType: TriggerType;
  severity: 'low' | 'medium' | 'high' | 'urgent';
  triggerCondition: string;
  metadata: TriggerMetadata;
}

export enum TriggerType {
  BETTER_REWARD = 'better_reward',
  MISSED_OPPORTUNITY = 'missed_opportunity',
  CATEGORY_OPTIMIZATION = 'category_optimization',
  SPENDING_THRESHOLD = 'spending_threshold',
  ANNUAL_FEE_JUSTIFICATION = 'annual_fee_justification',
  NEW_CATEGORY_DETECTED = 'new_category_detected',
  SEASONAL_OPPORTUNITY = 'seasonal_opportunity'
}

export interface TriggerMetadata {
  currentRewardRate: number;
  potentialRewardRate: number;
  missedReward: number;
  category: SpendingCategory;
  merchant: string;
  comparisonCards: string[];
  triggerScore: number;
}

export interface TransactionRecommendationContext {
  transaction: Transaction;
  userSpendingHistory: {
    categoryTotals: Record<string, number>;
    monthlyAverage: number;
    similarTransactions: Transaction[];
  };
  currentCards: any[];
  marketOpportunities: {
    betterCards: any[];
    categoryLeaders: any[];
    timeSensitiveOffers: any[];
  };
}

export class TransactionRecommendationService {
  /**
   * Analyze transaction and generate recommendations
   */
  async analyzeTransactionAndRecommend(
    transactionId: string,
    userId: string
  ): Promise<RecommendationResult | null> {
    try {
      // Analyze if transaction should trigger recommendations
      const triggerAnalysis = await triggerClassifierService.analyzeTransaction(
        transactionId,
        userId
      );

      if (!triggerAnalysis.shouldRecommend) {
        return null; // No recommendation needed
      }

      // Build recommendation context
      const context = await this.buildTransactionContext(transactionId, userId);

      // Generate recommendations
      return await this.generateTransactionRecommendations(
        context,
        triggerAnalysis
      );

    } catch (error) {
      console.error('Error analyzing transaction and recommending:', error);
      throw new RecEngineException(
        'TRANSACTION_ANALYSIS_ERROR',
        `Failed to analyze transaction ${transactionId}: ${error.message}`,
        { transactionId, userId, originalError: error }
      );
    }
  }

  /**
   * Real-time transaction recommendations
   */
  async getRealtimeTransactionRecommendation(
    transaction: Partial<Transaction>,
    userId: string
  ): Promise<{
    shouldShow: boolean;
    recommendation?: RecommendationItem;
    triggerReason: string;
    urgency: 'low' | 'medium' | 'high';
  }> {
    try {
      // Real-time transaction analysis
      const triggerAnalysis = await triggerClassifierService.analyzeRealtimeTransaction(
        transaction,
        userId
      );

      if (!triggerAnalysis.shouldRecommend) {
        return {
          shouldShow: false,
          triggerReason: 'No optimization opportunity detected',
          urgency: 'low'
        };
      }

      // Generate real-time recommendations
      const recommendation = await this.generateRealtimeRecommendation(
        transaction,
        triggerAnalysis,
        userId
      );

      const urgency = this.calculateUrgency(triggerAnalysis);

      return {
        shouldShow: true,
        recommendation,
        triggerReason: triggerAnalysis.reasoning,
        urgency
      };

    } catch (error) {
      console.error('Error in realtime transaction recommendation:', error);
      return {
        shouldShow: false,
        triggerReason: 'Error analyzing transaction',
        urgency: 'low'
      };
    }
  }

  /**
   * Get transaction-triggered recommendations (main method)
   */
  async getTransactionTriggeredRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationResult> {
    try {
      const { userId, context } = request;
      
      if (!context?.transactionId && !context?.amount) {
        throw new RecEngineException(
          'INVALID_REQUEST',
          'Transaction ID or amount is required for transaction-triggered recommendations'
        );
      }

      let triggerAnalysis: TriggerAnalysisResult;
      let transactionContext: TransactionRecommendationContext;

      if (context.transactionId) {
        // Use existing transaction
        triggerAnalysis = await triggerClassifierService.analyzeTransaction(
          context.transactionId,
          userId
        );
        transactionContext = await this.buildTransactionContext(
          context.transactionId,
          userId
        );
      } else {
        // Use mock transaction
        const mockTransaction: Partial<Transaction> = {
          amount: context.amount!,
          category: context.category as SpendingCategory,
          merchant: 'Mock Merchant'
        };
        
        triggerAnalysis = await triggerClassifierService.analyzeRealtimeTransaction(
          mockTransaction,
          userId
        );
        transactionContext = await this.buildMockTransactionContext(
          mockTransaction,
          userId
        );
      }

      // Generate recommendations
      return await this.generateTransactionRecommendations(
        transactionContext,
        triggerAnalysis
      );

    } catch (error) {
      console.error('Error in getTransactionTriggeredRecommendations:', error);
      throw new RecEngineException(
        'TRANSACTION_RECOMMENDATION_ERROR',
        `Failed to get transaction recommendations: ${error.message}`,
        { request, originalError: error }
      );
    }
  }

  /**
   * Batch analyze user's recent transactions
   */
  async analyzeRecentTransactions(
    userId: string,
    dayCount: number = 7
  ): Promise<{
    totalMissedReward: number;
    triggerCount: number;
    topOpportunities: RecommendationItem[];
    categoryInsights: Array<{
      category: string;
      missedReward: number;
      betterCard: string;
      frequency: number;
    }>;
  }> {
    try {
      // Get recent transactions
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dayCount);

      const recentTransactions = await transactionRepository.findByUserAndDateRange(
        userId,
        startDate,
        endDate
      );

      let totalMissedReward = 0;
      let triggerCount = 0;
      const opportunities: RecommendationItem[] = [];
      const categoryInsights: Map<string, {
        missedReward: number;
        betterCard: string;
        frequency: number;
      }> = new Map();

      // Analyze each transaction
      for (const transaction of recentTransactions) {
        try {
          const analysis = await triggerClassifierService.analyzeTransaction(
            transaction.id,
            userId
          );

          if (analysis.shouldRecommend) {
            triggerCount++;
            totalMissedReward += analysis.potentialExtraReward;

            // Generate recommendation
            const recommendation = await this.generateRecommendationFromAnalysis(
              transaction,
              analysis
            );
            opportunities.push(recommendation);

            // Update category insights
            const category = transaction.category || 'other';
            const existing = categoryInsights.get(category) || {
              missedReward: 0,
              betterCard: analysis.recommendedCard?.name || 'Unknown',
              frequency: 0
            };

            existing.missedReward += analysis.potentialExtraReward;
            existing.frequency += 1;
            categoryInsights.set(category, existing);
          }
        } catch (error) {
          console.error(`Error analyzing transaction ${transaction.id}:`, error);
        }
      }

      // Sort and limit results
      opportunities.sort((a, b) => b.estimatedBenefit - a.estimatedBenefit);
      const topOpportunities = opportunities.slice(0, 5);

      const categoryInsightsArray = Array.from(categoryInsights.entries()).map(
        ([category, data]) => ({
          category,
          ...data
        })
      );

      return {
        totalMissedReward,
        triggerCount,
        topOpportunities,
        categoryInsights: categoryInsightsArray
      };

    } catch (error) {
      console.error('Error analyzing recent transactions:', error);
      throw new RecEngineException(
        'BATCH_ANALYSIS_ERROR',
        `Failed to analyze recent transactions: ${error.message}`,
        { userId, dayCount, originalError: error }
      );
    }
  }

  /**
   * Configure transaction trigger rules
   */
  async configureTriggerRules(
    userId: string,
    rules: {
      minimumBenefit: number;
      categories: SpendingCategory[];
      excludeCards: string[];
      frequencyLimit: number; // Maximum triggers per day
      enabledTriggers: TriggerType[];
    }
  ): Promise<void> {
    try {
      // Save user trigger rule configuration
      // This should be saved to database or cache
      console.log(`Configured trigger rules for user ${userId}:`, rules);

    } catch (error) {
      console.error('Error configuring trigger rules:', error);
      throw new RecEngineException(
        'CONFIGURATION_ERROR',
        `Failed to configure trigger rules: ${error.message}`,
        { userId, rules, originalError: error }
      );
    }
  }

  // ===========================================
  // Private methods
  // ===========================================

  /**
   * Build transaction context
   */
  private async buildTransactionContext(
    transactionId: string,
    userId: string
  ): Promise<TransactionRecommendationContext> {
    const transaction = await transactionRepository.findById(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    // Get user spending history
    const userSpendingHistory = await this.getUserSpendingHistory(userId, transaction.category);
    
    // Get user current cards
    const currentCards = await userCardRepository.findUserCardsWithDetails(userId);
    
    // Get market opportunities
    const marketOpportunities = await this.getMarketOpportunities(transaction.category);

    return {
      transaction,
      userSpendingHistory,
      currentCards,
      marketOpportunities
    };
  }

  /**
   * Build mock transaction context
   */
  private async buildMockTransactionContext(
    transaction: Partial<Transaction>,
    userId: string
  ): Promise<TransactionRecommendationContext> {
    const mockTransaction: Transaction = {
      id: 'mock-' + Date.now(),
      userId,
      amount: transaction.amount!,
      category: transaction.category!,
      merchant: transaction.merchant || 'Mock Merchant',
      description: 'Mock transaction for recommendation',
      transactionDate: new Date(),
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const userSpendingHistory = await this.getUserSpendingHistory(userId, transaction.category);
    const currentCards = await userCardRepository.findUserCardsWithDetails(userId);
    const marketOpportunities = await this.getMarketOpportunities(transaction.category);

    return {
      transaction: mockTransaction,
      userSpendingHistory,
      currentCards,
      marketOpportunities
    };
  }

  /**
   * Generate transaction recommendations
   */
  private async generateTransactionRecommendations(
    context: TransactionRecommendationContext,
    triggerAnalysis: TriggerAnalysisResult
  ): Promise<RecommendationResult> {
    const recommendations: RecommendationItem[] = [];

    // Primary recommendation: better reward card
    if (triggerAnalysis.recommendedCard) {
      const mainRecommendation = await this.createRecommendationItem(
        triggerAnalysis.recommendedCard,
        context,
        triggerAnalysis,
        'primary'
      );
      recommendations.push(mainRecommendation);
    }

    // Secondary recommendations: alternative options in same category
    const alternativeCards = context.marketOpportunities.categoryLeaders
      .filter(card => card.id !== triggerAnalysis.recommendedCard?.id)
      .slice(0, 2);

    for (const card of alternativeCards) {
      const altRecommendation = await this.createRecommendationItem(
        card,
        context,
        triggerAnalysis,
        'alternative'
      );
      recommendations.push(altRecommendation);
    }

    // Build recommendation result
    const result: RecommendationResult = {
      id: this.generateRecommendationId(),
      type: RecommendationType.TRANSACTION_TRIGGERED,
      userId: context.transaction.userId,
      recommendations,
      metadata: this.buildTransactionRecommendationMetadata(
        context,
        triggerAnalysis
      ),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000) // Expires in 1 hour
    };

    return result;
  }

  /**
   * Generate real-time recommendation
   */
  private async generateRealtimeRecommendation(
    transaction: Partial<Transaction>,
    triggerAnalysis: TriggerAnalysisResult,
    userId: string
  ): Promise<RecommendationItem> {
    const recommendedCard = triggerAnalysis.recommendedCard;
    
    if (!recommendedCard) {
      throw new Error('No recommended card available');
    }

    return {
      cardId: recommendedCard.id,
      cardName: recommendedCard.name,
      score: triggerAnalysis.confidence,
      reasoning: triggerAnalysis.reasoning,
      estimatedBenefit: triggerAnalysis.potentialExtraReward,
      confidence: triggerAnalysis.confidence,
      priority: this.determinePriorityFromBenefit(triggerAnalysis.potentialExtraReward),
      ctaText: 'View Details',
      messageTitle: 'Better Option Found!',
      messageDescription: `Using ${recommendedCard.name} can earn more rewards`,
      tags: ['realtime', 'transaction_triggered', transaction.category || 'other']
    };
  }

  /**
   * Create recommendation item
   */
  private async createRecommendationItem(
    card: any,
    context: TransactionRecommendationContext,
    triggerAnalysis: TriggerAnalysisResult,
    type: 'primary' | 'alternative'
  ): Promise<RecommendationItem> {
    const estimatedBenefit = type === 'primary' 
      ? triggerAnalysis.potentialExtraReward
      : triggerAnalysis.potentialExtraReward * 0.8;

    return {
      cardId: card.id,
      cardName: card.name,
      score: triggerAnalysis.confidence,
      reasoning: type === 'primary' 
        ? triggerAnalysis.reasoning
        : `Another good option with advantages in ${context.transaction.category} category`,
      estimatedBenefit,
      confidence: triggerAnalysis.confidence,
      priority: this.determinePriorityFromBenefit(estimatedBenefit),
      ctaText: type === 'primary' ? 'Apply Now' : 'Compare Details',
      messageTitle: type === 'primary' ? 'Best Recommendation' : 'Alternative Choice',
      messageDescription: `For your spending at ${context.transaction.merchant}`,
      tags: [
        'transaction_triggered',
        context.transaction.category || 'other',
        type
      ]
    };
  }

  /**
   * Generate recommendation from analysis
   */
  private async generateRecommendationFromAnalysis(
    transaction: Transaction,
    analysis: TriggerAnalysisResult
  ): Promise<RecommendationItem> {
    return {
      cardId: analysis.recommendedCard?.id || 'unknown',
      cardName: analysis.recommendedCard?.name || 'Unknown Card',
      score: analysis.confidence,
      reasoning: analysis.reasoning,
      estimatedBenefit: analysis.potentialExtraReward,
      confidence: analysis.confidence,
      priority: this.determinePriorityFromBenefit(analysis.potentialExtraReward),
      ctaText: 'Learn More',
      messageTitle: 'Missed Reward Opportunity',
      messageDescription: `Spending at ${transaction.merchant} could earn more rewards`,
      tags: ['missed_opportunity', transaction.category || 'other']
    };
  }

  /**
   * Get user spending history
   */
  private async getUserSpendingHistory(
    userId: string,
    category?: SpendingCategory
  ): Promise<TransactionRecommendationContext['userSpendingHistory']> {
    // Get transactions from last 3 months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);

    const transactions = await transactionRepository.findByUserAndDateRange(
      userId,
      startDate,
      endDate
    );

    // Calculate category totals
    const categoryTotals: Record<string, number> = {};
    transactions.forEach(t => {
      const cat = t.category || 'other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
    });

    // Calculate monthly average
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const monthlyAverage = totalAmount / 3;

    // Find similar transactions
    const similarTransactions = category 
      ? transactions.filter(t => t.category === category)
      : [];

    return {
      categoryTotals,
      monthlyAverage,
      similarTransactions
    };
  }

  /**
   * Get market opportunities
   */
  private async getMarketOpportunities(
    category?: SpendingCategory
  ): Promise<TransactionRecommendationContext['marketOpportunities']> {
    let betterCards: any[] = [];
    let categoryLeaders: any[] = [];
    let timeSensitiveOffers: any[] = [];

    if (category) {
      // Get best cards for this category
      categoryLeaders = await creditCardRepository.findBestCardsForCategory(category, 5);
      betterCards = categoryLeaders.slice(0, 3);
    }

    // Get time-sensitive offers (simulated)
    timeSensitiveOffers = [];

    return {
      betterCards,
      categoryLeaders,
      timeSensitiveOffers
    };
  }

  /**
   * Calculate urgency level
   */
  private calculateUrgency(triggerAnalysis: TriggerAnalysisResult): 'low' | 'medium' | 'high' {
    if (triggerAnalysis.potentialExtraReward > 50 && triggerAnalysis.confidence > 0.8) {
      return 'high';
    }
    if (triggerAnalysis.potentialExtraReward > 20 && triggerAnalysis.confidence > 0.6) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Determine priority from benefit amount
   */
  private determinePriorityFromBenefit(benefit: number): 'high' | 'medium' | 'low' {
    if (benefit > 30) return 'high';
    if (benefit > 10) return 'medium';
    return 'low';
  }

  /**
   * Build transaction recommendation metadata
   */
  private buildTransactionRecommendationMetadata(
    context: TransactionRecommendationContext,
    triggerAnalysis: TriggerAnalysisResult
  ): RecommendationMetadata {
    return {
      algorithmVersion: '2.1.0',
      personalizationScore: triggerAnalysis.confidence,
      diversityScore: 0.6,
      contextFactors: [
        `transaction_category:${context.transaction.category}`,
        `merchant:${context.transaction.merchant}`,
        `amount:${context.transaction.amount}`,
        `trigger_confidence:${triggerAnalysis.confidence}`
      ],
      filtersCriteria: ['transaction_triggered'],
      performanceMetrics: {
        responseTime: 0,
        confidenceLevel: triggerAnalysis.confidence,
        dataFreshness: 0.9
      }
    };
  }

  /**
   * Generate recommendation ID
   */
  private generateRecommendationId(): string {
    return `txn_rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const transactionRecommendationService = new TransactionRecommendationService();