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
   * 獲取首頁個人化推薦
   */
  async getHomepageRecommendations(
    userId: string,
    maxResults: number = 6
  ): Promise<HomepageRecommendations> {
    try {
      // 建立用戶檔案
      const userProfile = await this.buildUserProfile(userId);
      
      // 獲取上下文資訊
      const contextualFactors = await this.buildContextualData(userId);
      
      // 獲取候選信用卡
      const candidateCards = await this.getCandidateCards(userId);
      
      // 獲取用戶當前持有的信用卡ID列表
      const userCards = await this.getUserCardIds(userId);
      
      // 呼叫 RecEngine Personalized Ranker
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

      // 分類推薦結果
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
   * 獲取特定類別的個人化推薦
   */
  async getCategoryRecommendations(
    userId: string,
    category: string,
    maxResults: number = 3
  ): Promise<PersonalizedRecommendation[]> {
    try {
      const userProfile = await this.buildUserProfile(userId);
      const contextualFactors = await this.buildContextualData(userId);
      
      // 篩選特定類別的信用卡
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
   * 獲取相似用戶推薦
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
      
      // 獲取所有候選卡片
      const candidateCards = await this.getCandidateCards(userId);
      
      // 使用協作過濾的上下文
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
        similarUserProfiles: ['similar_user_1', 'similar_user_2'], // 這應該從 ML 服務返回
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
   * 重新排序現有推薦
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
   * 獲取推薦解釋
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
      // 獲取單張卡片的個人化推薦
      const recommendations = await this.reRankRecommendations(userId, [cardId]);
      
      if (recommendations.length === 0) {
        throw new Error(`No recommendation found for card ${cardId}`);
      }

      const recommendation = recommendations[0];
      
      // 分析影響因素
      const factorsInfluencing = await this.analyzeInfluencingFactors(userId, cardId);
      
      // 獲取一般分數（非個人化）
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
   * 建立用戶檔案
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
   * 建立上下文資料
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

    // 獲取市場趨勢
    const marketTrends = await this.getCurrentMarketTrends();

    return {
      timeOfYear: season,
      dayOfWeek,
      userState: `${timeOfDay}_${dayOfWeek}`,
      marketTrends
    };
  }

  /**
   * 獲取用戶當前持有的信用卡ID列表
   */
  private async getUserCardIds(userId: string): Promise<string[]> {
    const userCards = await userCardRepository.findUserCardsWithDetails(userId);
    return userCards.map(uc => uc.creditCardId);
  }

  /**
   * 獲取候選信用卡
   */
  private async getCandidateCards(userId: string): Promise<CreditCard[]> {
    // 獲取用戶當前沒有的活躍信用卡
    const allActiveCards = await creditCardRepository.findActiveCards();
    const userCards = await userCardRepository.findUserCardsWithDetails(userId);
    const userCardIds = new Set(userCards.map(uc => uc.creditCardId));

    return allActiveCards.filter(card => !userCardIds.has(card.id));
  }

  /**
   * 分類推薦結果
   */
  private categorizeRecommendations(
    recommendations: PersonalizedRecommendation[],
    maxPerCategory: number
  ): {
    featured: PersonalizedRecommendation[];
    trending: PersonalizedRecommendation[];
    personalized: PersonalizedRecommendation[];
  } {
    // 按分數排序
    const sorted = [...recommendations].sort((a, b) => b.ranking_score - a.ranking_score);

    // 特色推薦：高分且有特殊優勢的卡片
    const featured = sorted
      .filter(rec => rec.ranking_score > 0.8)
      .slice(0, maxPerCategory);

    // 趨勢推薦：市場熱門或新推出的卡片
    const trending = sorted
      .filter(rec => rec.reason.includes('trending') || rec.reason.includes('popular'))
      .slice(0, maxPerCategory);

    // 個人化推薦：剩餘的高分推薦
    const used = new Set([...featured.map(r => r.card_id), ...trending.map(r => r.card_id)]);
    const personalized = sorted
      .filter(rec => !used.has(rec.card_id))
      .slice(0, maxPerCategory);

    return { featured, trending, personalized };
  }

  /**
   * 檢查卡片是否符合類別
   */
  private cardMatchesCategory(card: CreditCard, category: string): boolean {
    // 根據卡片類型和獎勵結構判斷
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
   * 根據 IDs 獲取信用卡
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
   * 計算消費模式
   */
  private async calculateSpendingPatterns(userId: string) {
    try {
      // 獲取過去6個月的交易記錄
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const transactions = await transactionRepository.findByUserIdSince(userId, sixMonthsAgo);
      
      if (!transactions || transactions.length === 0) {
        // 沒有交易記錄時返回默認模式
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

      // 計算各類別消費總額
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

      // 計算月平均
      const monthsOfData = Math.max(1, (new Date().getTime() - sixMonthsAgo.getTime()) / (1000 * 60 * 60 * 24 * 30));
      const totalMonthlySpending = totalAmount / monthsOfData;
      const transactionFrequency = totalCount / monthsOfData;
      const averageTransactionAmount = totalCount > 0 ? totalAmount / totalCount : 0;

      // 轉換為月平均類別消費
      const categorySpending: Record<string, number> = {};
      Object.keys(categoryTotals).forEach(category => {
        categorySpending[category] = categoryTotals[category] / monthsOfData;
      });

      // 確保有基本類別
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
      
      // 錯誤時返回默認模式
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
   * 獲取當前市場趨勢
   */
  private async getCurrentMarketTrends(): Promise<string[]> {
    // 這裡可以從外部 API 或數據庫獲取市場趨勢
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
   * 獲取應用的篩選條件
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
   * 獲取個人化因素
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
   * 分析影響因素
   */
  private async analyzeInfluencingFactors(userId: string, cardId: string) {
    // 這應該從 ML 服務獲取詳細的影響因素分析
    return [
      {
        factor: 'spending_pattern_match',
        weight: 0.35,
        description: '您的消費模式與此卡的獎勵結構高度匹配'
      },
      {
        factor: 'reward_optimization',
        weight: 0.25,
        description: '此卡可顯著提升您的獎勵收益'
      },
      {
        factor: 'fee_value_ratio',
        weight: 0.20,
        description: '年費與預期收益比例合理'
      },
      {
        factor: 'similar_user_preference',
        weight: 0.20,
        description: '類似用戶對此卡評價良好'
      }
    ];
  }

  /**
   * 獲取一般卡片分數
   */
  private async getGeneralCardScore(cardId: string): Promise<number> {
    // 基於市場數據的一般分數
    const card = await creditCardRepository.findById(cardId);
    if (!card) return 0;

    // 簡化的分數計算
    let score = 0.5; // 基礎分數

    // 根據年費調整
    if (card.annualFee === 0) score += 0.2;
    else if (card.annualFee > 500) score -= 0.1;

    // 根據獎勵結構調整
    if (card.rewardStructure && card.rewardStructure.length > 0) {
      const maxReward = Math.max(...card.rewardStructure.map(r => r.rewardRate));
      score += Math.min(0.3, maxReward / 10);
    }

    return Math.max(0, Math.min(1, score));
  }
}

export const personalizedRankerService = new PersonalizedRankerService();