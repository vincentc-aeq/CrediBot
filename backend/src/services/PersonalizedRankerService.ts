import { RecEngineClientFactory, RecEngineClient, defaultRecEngineConfig } from './RecEngineClient';
import {
  PersonalizedRankerRequest,
  PersonalizedRankerResponse,
  PersonalizedRecommendation,
  UserProfile,
  ContextualData,
  RecEngineException
} from '../models/RecEngine';
import { CreditCard } from '../models/CreditCard';
import { userRepository } from '../repositories/UserRepository';
import { creditCardRepository } from '../repositories/CreditCardRepository';
import { userCardRepository } from '../repositories/UserCardRepository';
import { transactionRepository } from '../repositories/TransactionRepository';

export interface HomepageRecommendations {
  featured: PersonalizedRecommendation[];
  trending: PersonalizedRecommendation[];
  personalized: PersonalizedRecommendation[];
  diversityScore: number;
  refreshedAt: Date;
  metadata: {
    totalCandidates: number;
    filtersCriteria: string[];
    personalizationFactors: string[];
  };
}

export interface RecommendationContext {
  userLocation: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  season: 'spring' | 'summer' | 'fall' | 'winter';
  marketTrends: string[];
  userActivity: {
    lastLoginDays: number;
    recentSearches: string[];
    clickHistory: string[];
  };
}

export class PersonalizedRankerService {
  private recEngineClient: RecEngineClient;
  
  constructor() {
    // Reset and create new instance with updated config
    RecEngineClientFactory.reset();
    this.recEngineClient = RecEngineClientFactory.getInstance(defaultRecEngineConfig);
  }

  /**
   * Get homepage personalized recommendations
   */
  async getHomepageRecommendations(
    userId: string,
    maxResults: number = 6
  ): Promise<HomepageRecommendations> {
    try {
      // Build user profile
      const userProfile = await this.buildUserProfile(userId);
      
      // Get contextual information
      const contextualFactors = await this.buildContextualData(userId);
      
      // Get candidate credit cards
      const candidateCards = await this.getCandidateCards(userId);
      
      // Get user's current credit card ID list
      const userCards = await this.getUserCardIds(userId);
      
      // Call RecEngine Personalized Ranker
      const request: PersonalizedRankerRequest = {
        user_id: userId,
        user_cards: userCards,
        spending_pattern: userProfile.spendingPatterns.categorySpending,
        preferences: {
          maxAnnualFee: userProfile.preferences.maxAnnualFee,
          prioritizedCategories: userProfile.preferences.prioritizedCategories,
          riskTolerance: userProfile.preferences.riskTolerance
        }
      };

      const response = await this.recEngineClient.personalizedRanking(request);

      // Categorize recommendation results
      const categorizedRecommendations = this.categorizeRecommendations(
        response.ranked_cards,
        maxResults
      );

      return {
        featured: categorizedRecommendations.featured,
        trending: categorizedRecommendations.trending,
        personalized: categorizedRecommendations.personalized,
        diversityScore: response.ranking_score,
        refreshedAt: new Date(),
        metadata: {
          totalCandidates: response.ranked_cards.length,
          filtersCriteria: this.getAppliedFilters(userProfile),
          personalizationFactors: this.getPersonalizationFactors(userProfile, contextualFactors)
        }
      };

    } catch (error) {
      console.error('Error in PersonalizedRankerService.getHomepageRecommendations:', error);
      
      if (error instanceof RecEngineException) {
        throw error;
      }
      
      throw new RecEngineException(
        'HOMEPAGE_RECOMMENDATIONS_ERROR',
        `Failed to get homepage recommendations: ${error.message}`,
        { userId, maxResults, originalError: error }
      );
    }
  }

  /**
   * Get personalized recommendations for specific category
   */
  async getCategoryRecommendations(
    userId: string,
    category: string,
    maxResults: number = 3
  ): Promise<PersonalizedRecommendation[]> {
    try {
      const userProfile = await this.buildUserProfile(userId);
      const contextualFactors = await this.buildContextualData(userId);
      
      // Filter credit cards by specific category
      const allCards = await creditCardRepository.findActiveCards();
      const categoryCards = allCards.filter(card => 
        this.cardMatchesCategory(card, category)
      );

      const request: PersonalizedRankerRequest = {
        userProfile,
        candidateCards: categoryCards,
        contextualFactors,
        maxResults
      };

      const response = await this.recEngineClient.personalizedRanking(request);

      return response.ranked_cards.slice(0, maxResults);

    } catch (error) {
      console.error('Error getting category recommendations:', error);
      throw new RecEngineException(
        'CATEGORY_RECOMMENDATIONS_ERROR',
        `Failed to get category recommendations: ${error.message}`,
        { userId, category, maxResults, originalError: error }
      );
    }
  }

  /**
   * Get similar user recommendations
   */
  async getSimilarUserRecommendations(
    userId: string,
    maxResults: number = 4
  ): Promise<{
    recommendations: PersonalizedRecommendation[];
    similarUserProfiles: string[];
    confidence: number;
  }> {
    try {
      const userProfile = await this.buildUserProfile(userId);
      
      // Get all candidate cards
      const candidateCards = await this.getCandidateCards(userId);
      
      // Use collaborative filtering context
      const contextualFactors: ContextualData = {
        ...await this.buildContextualData(userId),
        userState: 'seeking_similar_recommendations'
      };

      const request: PersonalizedRankerRequest = {
        userProfile,
        candidateCards,
        contextualFactors,
        maxResults
      };

      const response = await this.recEngineClient.personalizedRanking(request);

      return {
        recommendations: response.ranked_cards,
        similarUserProfiles: ['similar_user_1', 'similar_user_2'], // This should be returned from ML service
        confidence: response.diversity_score
      };

    } catch (error) {
      console.error('Error getting similar user recommendations:', error);
      throw new RecEngineException(
        'SIMILAR_USER_RECOMMENDATIONS_ERROR',
        `Failed to get similar user recommendations: ${error.message}`,
        { userId, maxResults, originalError: error }
      );
    }
  }

  /**
   * Re-rank existing recommendations
   */
  async reRankRecommendations(
    userId: string,
    cardIds: string[],
    context?: Partial<ContextualData>
  ): Promise<PersonalizedRecommendation[]> {
    try {
      const userProfile = await this.buildUserProfile(userId);
      const candidateCards = await this.getCardsByIds(cardIds);
      
      const contextualFactors = {
        ...await this.buildContextualData(userId),
        ...context
      };

      const request: PersonalizedRankerRequest = {
        userProfile,
        candidateCards,
        contextualFactors,
        maxResults: cardIds.length
      };

      const response = await this.recEngineClient.personalizedRanking(request);
      return response.ranked_cards;

    } catch (error) {
      console.error('Error re-ranking recommendations:', error);
      throw new RecEngineException(
        'RERANK_ERROR',
        `Failed to re-rank recommendations: ${error.message}`,
        { userId, cardIds, originalError: error }
      );
    }
  }

  /**
   * Get recommendation explanation
   */
  async getRecommendationExplanation(
    userId: string,
    cardId: string
  ): Promise<{
    reasoning: string;
    factorsInfluencing: Array<{
      factor: string;
      weight: number;
      description: string;
    }>;
    personalizedScore: number;
    generalScore: number;
  }> {
    try {
      // Get personalized recommendation for single card
      const recommendations = await this.reRankRecommendations(userId, [cardId]);
      
      if (recommendations.length === 0) {
        throw new Error(`No recommendation found for card ${cardId}`);
      }

      const recommendation = recommendations[0];
      
      // Analyze influencing factors
      const factorsInfluencing = await this.analyzeInfluencingFactors(userId, cardId);
      
      // Get general score (non-personalized)
      const generalScore = await this.getGeneralCardScore(cardId);

      return {
        reasoning: recommendation.reasoning,
        factorsInfluencing,
        personalizedScore: recommendation.personalizedScore,
        generalScore
      };

    } catch (error) {
      console.error('Error getting recommendation explanation:', error);
      throw new RecEngineException(
        'EXPLANATION_ERROR',
        `Failed to get recommendation explanation: ${error.message}`,
        { userId, cardId, originalError: error }
      );
    }
  }

  /**
   * Build user profile
   */
  private async buildUserProfile(userId: string): Promise<UserProfile> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const spendingPatterns = await this.calculateSpendingPatterns(userId);

    return {
      id: userId,
      demographics: {
        age: 30, // Default age - could be enhanced with additional user fields
        income: 50000, // Default income - could be enhanced with additional user fields
        creditScore: 700, // Default credit score - could be enhanced with additional user fields
        location: 'US' // Default location - could be enhanced with additional user fields
      },
      spendingPatterns,
      preferences: {
        preferredCardTypes: user.preferences?.cardTypes || [],
        maxAnnualFee: user.preferences?.maxAnnualFee || 500,
        prioritizedCategories: [], // Could be derived from spending patterns
        riskTolerance: 'medium' // Default risk tolerance
      }
    };
  }

  /**
   * Build contextual data
   */
  private async buildContextualData(userId: string): Promise<ContextualData> {
    const now = new Date();
    const hour = now.getHours();
    
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour < 6) timeOfDay = 'night';
    else if (hour < 12) timeOfDay = 'morning';
    else if (hour < 18) timeOfDay = 'afternoon';
    else timeOfDay = 'evening';

    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    const month = now.getMonth();
    let season: 'spring' | 'summer' | 'fall' | 'winter';
    if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'fall';
    else season = 'winter';

    // Get market trends
    const marketTrends = await this.getCurrentMarketTrends();

    return {
      timeOfYear: season,
      dayOfWeek,
      userState: `${timeOfDay}_${dayOfWeek}`,
      marketTrends
    };
  }

  /**
   * Get user's current credit card ID list
   */
  private async getUserCardIds(userId: string): Promise<string[]> {
    const userCards = await userCardRepository.findUserCardsWithDetails(userId);
    return userCards.map(uc => uc.creditCardId);
  }

  /**
   * Get candidate credit cards
   */
  private async getCandidateCards(userId: string): Promise<CreditCard[]> {
    // Get active credit cards that user doesn't currently have
    const allActiveCards = await creditCardRepository.findActiveCards();
    const userCards = await userCardRepository.findUserCardsWithDetails(userId);
    const userCardIds = new Set(userCards.map(uc => uc.creditCardId));

    return allActiveCards.filter(card => !userCardIds.has(card.id));
  }

  /**
   * Categorize recommendation results
   */
  private categorizeRecommendations(
    recommendations: PersonalizedRecommendation[],
    maxPerCategory: number
  ): {
    featured: PersonalizedRecommendation[];
    trending: PersonalizedRecommendation[];
    personalized: PersonalizedRecommendation[];
  } {
    // Sort by score
    const sorted = [...recommendations].sort((a, b) => b.ranking_score - a.ranking_score);

    // Featured recommendations: high-score cards with special advantages
    const featured = sorted
      .filter(rec => rec.ranking_score > 0.8)
      .slice(0, maxPerCategory);

    // Trending recommendations: market popular or newly launched cards
    const trending = sorted
      .filter(rec => rec.reason.includes('trending') || rec.reason.includes('popular'))
      .slice(0, maxPerCategory);

    // Personalized recommendations: remaining high-score recommendations
    const used = new Set([...featured.map(r => r.card_id), ...trending.map(r => r.card_id)]);
    const personalized = sorted
      .filter(rec => !used.has(rec.card_id))
      .slice(0, maxPerCategory);

    return { featured, trending, personalized };
  }

  /**
   * Check if card matches category
   */
  private cardMatchesCategory(card: CreditCard, category: string): boolean {
    // Check based on card type and reward structure
    if (card.cardType.toLowerCase().includes(category.toLowerCase())) {
      return true;
    }

    if (card.rewardStructure) {
      return card.rewardStructure.some(reward => 
        reward.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    return false;
  }

  /**
   * Get credit cards by IDs
   */
  private async getCardsByIds(cardIds: string[]): Promise<CreditCard[]> {
    const cards: CreditCard[] = [];
    for (const id of cardIds) {
      const card = await creditCardRepository.findById(id);
      if (card) {
        cards.push(card);
      }
    }
    return cards;
  }

  /**
   * Calculate spending patterns
   */
  private async calculateSpendingPatterns(userId: string) {
    try {
      // Get transaction records from past 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const transactions = await transactionRepository.findByUserIdSince(userId, sixMonthsAgo);
      
      if (!transactions || transactions.length === 0) {
        // Return default pattern when no transaction records
        return {
          totalMonthlySpending: 3000,
          categorySpending: {
            dining: 600,
            groceries: 400,
            gas: 200,
            travel: 150,
            other: 1650
          },
          transactionFrequency: 30,
          averageTransactionAmount: 100
        };
      }

      // Calculate total spending by category
      const categoryTotals: Record<string, number> = {};
      let totalAmount = 0;
      let totalCount = 0;

      transactions.forEach(txn => {
        const category = txn.category || 'other';
        const amount = parseFloat(txn.amount);
        
        categoryTotals[category] = (categoryTotals[category] || 0) + amount;
        totalAmount += amount;
        totalCount++;
      });

      // Calculate monthly average
      const monthsOfData = Math.max(1, (new Date().getTime() - sixMonthsAgo.getTime()) / (1000 * 60 * 60 * 24 * 30));
      const totalMonthlySpending = totalAmount / monthsOfData;
      const transactionFrequency = totalCount / monthsOfData;
      const averageTransactionAmount = totalCount > 0 ? totalAmount / totalCount : 0;

      // Convert to monthly average spending by category
      const categorySpending: Record<string, number> = {};
      Object.keys(categoryTotals).forEach(category => {
        categorySpending[category] = categoryTotals[category] / monthsOfData;
      });

      // Ensure basic categories exist
      const requiredCategories = ['dining', 'groceries', 'gas', 'travel', 'other'];
      requiredCategories.forEach(category => {
        if (!categorySpending[category]) {
          categorySpending[category] = 0;
        }
      });

      return {
        totalMonthlySpending: Math.round(totalMonthlySpending),
        categorySpending,
        transactionFrequency: Math.round(transactionFrequency),
        averageTransactionAmount: Math.round(averageTransactionAmount)
      };

    } catch (error) {
      console.error('Error calculating spending patterns:', error);
      
      // Return default pattern on error
      return {
        totalMonthlySpending: 3000,
        categorySpending: {
          dining: 600,
          groceries: 400,
          gas: 200,
          travel: 150,
          other: 1650
        },
        transactionFrequency: 30,
        averageTransactionAmount: 100
      };
    }
  }

  /**
   * Get current market trends
   */
  private async getCurrentMarketTrends(): Promise<string[]> {
    // Can get market trends from external API or database
    const currentMonth = new Date().getMonth();
    
    if (currentMonth >= 10 || currentMonth <= 1) {
      return ['holiday_spending', 'travel_deals', 'cashback_focus'];
    } else if (currentMonth >= 5 && currentMonth <= 7) {
      return ['summer_travel', 'gas_rewards', 'vacation_benefits'];
    } else {
      return ['general_rewards', 'balance_transfer', 'building_credit'];
    }
  }

  /**
   * Get applied filter criteria
   */
  private getAppliedFilters(userProfile: UserProfile): string[] {
    const filters: string[] = [];
    
    if (userProfile.preferences.maxAnnualFee < 500) {
      filters.push('low_annual_fee');
    }
    
    if (userProfile.preferences.prioritizedCategories.length > 0) {
      filters.push('category_preference');
    }
    
    if (userProfile.demographics.creditScore && userProfile.demographics.creditScore < 700) {
      filters.push('credit_score_requirement');
    }

    return filters;
  }

  /**
   * Get personalization factors
   */
  private getPersonalizationFactors(userProfile: UserProfile, contextualData: ContextualData): string[] {
    const factors: string[] = [];
    
    factors.push('spending_patterns');
    factors.push('user_preferences');
    factors.push('demographic_matching');
    
    if (contextualData.marketTrends.length > 0) {
      factors.push('market_trends');
    }
    
    if (userProfile.spendingPatterns.totalMonthlySpending > 5000) {
      factors.push('high_spending_optimization');
    }

    return factors;
  }

  /**
   * Analyze influencing factors
   */
  private async analyzeInfluencingFactors(userId: string, cardId: string) {
    // This should get detailed influencing factor analysis from ML service
    return [
      {
        factor: 'spending_pattern_match',
        weight: 0.35,
        description: 'Your spending pattern highly matches this card\'s reward structure'
      },
      {
        factor: 'reward_optimization',
        weight: 0.25,
        description: 'This card can significantly improve your reward earnings'
      },
      {
        factor: 'fee_value_ratio',
        weight: 0.20,
        description: 'Annual fee to expected benefit ratio is reasonable'
      },
      {
        factor: 'similar_user_preference',
        weight: 0.20,
        description: 'Similar users rate this card highly'
      }
    ];
  }

  /**
   * Get general card score
   */
  private async getGeneralCardScore(cardId: string): Promise<number> {
    // General score based on market data
    const card = await creditCardRepository.findById(cardId);
    if (!card) return 0;

    // Simplified score calculation
    let score = 0.5; // Base score

    // Adjust based on annual fee
    if (card.annualFee === 0) score += 0.2;
    else if (card.annualFee > 500) score -= 0.1;

    // Adjust based on reward structure
    if (card.rewardStructure && card.rewardStructure.length > 0) {
      const maxReward = Math.max(...card.rewardStructure.map(r => r.rewardRate));
      score += Math.min(0.3, maxReward / 10);
    }

    return Math.max(0, Math.min(1, score));
  }
}

export const personalizedRankerService = new PersonalizedRankerService();