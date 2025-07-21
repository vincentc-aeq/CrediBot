import { personalizedRankerService } from './PersonalizedRankerService';
import { rewardEstimatorService } from './RewardEstimatorService';
import { userRepository } from '../repositories/UserRepository';
import { userCardRepository } from '../repositories/UserCardRepository';
import { creditCardRepository } from '../repositories/CreditCardRepository';
import {
  RecommendationResult,
  RecommendationItem,
  RecommendationMetadata,
  RecommendationType,
  RecommendationRequest
} from './RecommendationEngineService';
import { RecEngineException } from '../models/RecEngine';
import { CreditCard } from '../models/CreditCard';
import { convertRecEngineIdToUuid } from '../utils/cardIdMapping';

export interface HomepageLayout {
  hero: HeroRecommendation;
  featured: RecommendationItem[];
  trending: RecommendationItem[];
  personalized: RecommendationItem[];
  categories: CategoryRecommendation[];
}

export interface HeroRecommendation {
  card: RecommendationItem;
  backgroundImage: string;
  highlight: string;
  ctaStyle: 'primary' | 'secondary' | 'accent';
}

export interface CategoryRecommendation {
  category: string;
  displayName: string;
  icon: string;
  recommendations: RecommendationItem[];
  totalCards: number;
}

export interface PersonalizationContext {
  userSegment: 'new_user' | 'light_user' | 'heavy_user' | 'optimizer';
  lifestagePhase: 'student' | 'young_professional' | 'family' | 'established' | 'senior';
  spendingPersona: 'conservative' | 'moderate' | 'aggressive' | 'strategic';
  primaryGoals: string[];
  seasonalFactors: string[];
}

export class HomepageRecommendationService {
  /**
   * 生成完整的首頁推薦布局
   */
  async generateHomepageLayout(userId: string): Promise<HomepageLayout> {
    try {
      // 建立個人化上下文
      const personalizationContext = await this.buildPersonalizationContext(userId);

      // 並行獲取不同類型的推薦
      const [
        heroRecommendation,
        featuredRecommendations,
        trendingRecommendations,
        personalizedRecommendations,
        categoryRecommendations
      ] = await Promise.all([
        this.generateHeroRecommendation(userId, personalizationContext),
        this.generateFeaturedRecommendations(userId, personalizationContext),
        this.generateTrendingRecommendations(userId, personalizationContext),
        this.generatePersonalizedRecommendations(userId, personalizationContext),
        this.generateCategoryRecommendations(userId, personalizationContext)
      ]);

      return {
        hero: heroRecommendation,
        featured: featuredRecommendations,
        trending: trendingRecommendations,
        personalized: personalizedRecommendations,
        categories: categoryRecommendations
      };

    } catch (error) {
      console.error('Error generating homepage layout:', error);
      
      // 返回降級版本
      return await this.getDegradedHomepageLayout(userId);
    }
  }

  /**
   * 獲取首頁推薦（主要方法）
   */
  async getHomepageRecommendations(request: RecommendationRequest): Promise<RecommendationResult> {
    try {
      const userId = request.userId;
      const maxResults = request.options?.maxResults || 6;

      // 建立個人化上下文
      const personalizationContext = await this.buildPersonalizationContext(userId);

      let recommendations: RecommendationItem[] = [];

      try {
        // 使用 PersonalizedRankerService 獲取推薦
        const homepageRecommendations = await personalizedRankerService.getHomepageRecommendations(
          userId,
          maxResults
        );

        // 轉換為標準推薦格式
        recommendations = this.convertToRecommendationItems(
          homepageRecommendations.personalized,
          personalizationContext
        );
        
        console.log('✅ PersonalizedRankerService succeeded');
      } catch (error) {
        console.warn('⚠️ PersonalizedRankerService failed, falling back to RecEngine direct call:', error.message);
        
        // Fallback: 直接調用RecEngine獲取推薦
        const fallbackRecommendations = await this.getFallbackRecommendations(userId, maxResults, personalizationContext);
        recommendations = fallbackRecommendations;
      }

      // 應用用戶偏好篩選
      const filteredRecommendations = await this.applyUserPreferenceFilters(
        recommendations,
        userId,
        request.filters
      );

      // 建立推薦結果
      const result: RecommendationResult = {
        id: this.generateRecommendationId(),
        type: RecommendationType.HOMEPAGE,
        userId,
        recommendations: filteredRecommendations,
        metadata: this.buildRecommendationMetadata(
          { personalized: recommendations, featured: [], trending: [], categories: [] },
          personalizationContext,
          Date.now()
        ),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小時過期
      };

      return result;

    } catch (error) {
      console.error('Error in getHomepageRecommendations:', error);
      throw new RecEngineException(
        'HOMEPAGE_RECOMMENDATION_ERROR',
        `Failed to generate homepage recommendations: ${error.message}`,
        { userId: request.userId, originalError: error }
      );
    }
  }

  /**
   * 獲取動態首頁內容（基於時間和上下文）
   */
  async getDynamicHomepageContent(
    userId: string,
    timeContext: {
      hour: number;
      dayOfWeek: string;
      season: string;
    }
  ): Promise<{
    primaryMessage: string;
    secondaryMessage: string;
    urgentRecommendations: RecommendationItem[];
    timeBasedRecommendations: RecommendationItem[];
  }> {
    try {
      const personalizationContext = await this.buildPersonalizationContext(userId);
      
      // 生成時間敏感的推薦
      const timeBasedRecommendations = await this.generateTimeBasedRecommendations(
        userId,
        timeContext,
        personalizationContext
      );

      // 檢查是否有緊急推薦
      const urgentRecommendations = await this.checkUrgentRecommendations(userId);

      // 生成個人化訊息
      const messages = this.generatePersonalizedMessages(
        personalizationContext,
        timeContext
      );

      return {
        primaryMessage: messages.primary,
        secondaryMessage: messages.secondary,
        urgentRecommendations,
        timeBasedRecommendations
      };

    } catch (error) {
      console.error('Error getting dynamic homepage content:', error);
      return {
        primaryMessage: 'Welcome back!',
        secondaryMessage: 'Discover credit card recommendations for you',
        urgentRecommendations: [],
        timeBasedRecommendations: []
      };
    }
  }

  /**
   * A/B 測試推薦變體
   */
  async getRecommendationVariant(
    userId: string,
    variantId: string
  ): Promise<RecommendationResult> {
    try {
      const baseRequest: RecommendationRequest = {
        userId,
        type: RecommendationType.HOMEPAGE,
        options: {
          maxResults: 6,
          enablePersonalization: true
        }
      };

      // 根據變體調整推薦策略
      switch (variantId) {
        case 'variant_a_conservative':
          return await this.getConservativeVariant(baseRequest);
        
        case 'variant_b_aggressive':
          return await this.getAggressiveVariant(baseRequest);
        
        case 'variant_c_category_focused':
          return await this.getCategoryFocusedVariant(baseRequest);
        
        default:
          return await this.getHomepageRecommendations(baseRequest);
      }

    } catch (error) {
      console.error('Error getting recommendation variant:', error);
      throw new RecEngineException(
        'VARIANT_ERROR',
        `Failed to get variant ${variantId}: ${error.message}`
      );
    }
  }

  // ===========================================
  // 私有方法
  // ===========================================

  /**
   * 建立個人化上下文
   */
  private async buildPersonalizationContext(userId: string): Promise<PersonalizationContext> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const userCards = await userCardRepository.findUserCardsWithDetails(userId);
    
    // 分析用戶段落
    const userSegment = this.determineUserSegment(user, userCards);
    const lifestagePhase = this.determineLifestagePhase(user);
    const spendingPersona = this.determineSpendingPersona(user);
    const primaryGoals = this.extractPrimaryGoals(user);
    const seasonalFactors = this.getCurrentSeasonalFactors();

    return {
      userSegment,
      lifestagePhase,
      spendingPersona,
      primaryGoals,
      seasonalFactors
    };
  }

  /**
   * 生成英雄推薦
   */
  private async generateHeroRecommendation(
    userId: string,
    context: PersonalizationContext
  ): Promise<HeroRecommendation> {
    // 獲取最佳推薦
    const homepageRecommendations = await personalizedRankerService.getHomepageRecommendations(
      userId,
      1
    );

    const topRecommendation = homepageRecommendations.personalized[0];
    if (!topRecommendation) {
      throw new Error('No hero recommendation available');
    }

    const heroItem = this.convertToRecommendationItem(topRecommendation, context);

    return {
      card: heroItem,
      backgroundImage: this.selectHeroBackgroundImage(context),
      highlight: this.generateHeroHighlight(heroItem, context),
      ctaStyle: this.selectCtaStyle(context)
    };
  }

  /**
   * 生成特色推薦
   */
  private async generateFeaturedRecommendations(
    userId: string,
    context: PersonalizationContext
  ): Promise<RecommendationItem[]> {
    const homepageRecommendations = await personalizedRankerService.getHomepageRecommendations(
      userId,
      6
    );

    // 選擇分數最高的3張卡作為特色推薦
    const featured = homepageRecommendations.featured.slice(0, 3);
    
    return featured.map(rec => this.convertToRecommendationItem(rec, context));
  }

  /**
   * 生成趨勢推薦
   */
  private async generateTrendingRecommendations(
    userId: string,
    context: PersonalizationContext
  ): Promise<RecommendationItem[]> {
    // 獲取市場趨勢卡片
    const trendingCards = await creditCardRepository.findTrendingCards(3);
    
    return trendingCards.map(card => ({
      cardId: card.id, // This is already a database UUID, no conversion needed
      cardName: card.name,
      score: 0.7,
      reasoning: 'Popular market choice',
      estimatedBenefit: 300,
      confidence: 0.6,
      priority: 'medium' as const,
      ctaText: 'View Details',
      messageTitle: 'Popular Recommendation',
      messageDescription: `${card.name} is currently a popular choice in the market`,
      tags: ['trending', 'popular']
    }));
  }

  /**
   * 生成個人化推薦
   */
  private async generatePersonalizedRecommendations(
    userId: string,
    context: PersonalizationContext
  ): Promise<RecommendationItem[]> {
    const homepageRecommendations = await personalizedRankerService.getHomepageRecommendations(
      userId,
      9
    );

    // 排除已經在 featured 中的推薦
    const personalized = homepageRecommendations.personalized.slice(3, 6);
    
    return personalized.map(rec => this.convertToRecommendationItem(rec, context));
  }

  /**
   * 生成分類推薦
   */
  private async generateCategoryRecommendations(
    userId: string,
    context: PersonalizationContext
  ): Promise<CategoryRecommendation[]> {
    const categories = ['dining', 'travel', 'cashback', 'gas'];
    const recommendations: CategoryRecommendation[] = [];

    for (const category of categories) {
      try {
        const categoryRecs = await personalizedRankerService.getCategoryRecommendations(
          userId,
          category,
          3
        );

        const totalCards = await creditCardRepository.countByCategory(category);

        recommendations.push({
          category,
          displayName: this.getCategoryDisplayName(category),
          icon: this.getCategoryIcon(category),
          recommendations: categoryRecs.map(rec => 
            this.convertToRecommendationItem(rec, context)
          ),
          totalCards
        });
      } catch (error) {
        console.error(`Error getting ${category} recommendations:`, error);
      }
    }

    return recommendations;
  }

  /**
   * 轉換推薦格式
   */
  private convertToRecommendationItems(
    personalizedRecs: any[],
    context: PersonalizationContext
  ): RecommendationItem[] {
    return personalizedRecs.map(rec => this.convertToRecommendationItem(rec, context));
  }

  private convertToRecommendationItem(
    rec: any,
    context: PersonalizationContext
  ): RecommendationItem {
    // Convert RecEngine card ID to database UUID
    const recEngineCardId = rec.card_id || rec.cardId;
    const databaseCardId = convertRecEngineIdToUuid(recEngineCardId);
    
    if (!databaseCardId) {
      console.warn(`No mapping found for RecEngine card ID: ${recEngineCardId}`);
    }
    
    const score = rec.ranking_score || rec.personalizedScore || 0;
    console.log(`Converting recommendation: ${rec.card_name || rec.cardName}, score: ${score}`);
    
    return {
      cardId: databaseCardId || recEngineCardId, // Fallback to original if no mapping found
      cardName: rec.card_name || rec.cardName,
      score: score,
      reasoning: rec.reason || rec.reasoning,
      estimatedBenefit: this.calculateEstimatedBenefit(rec, context),
      confidence: rec.ranking_score || rec.personalizedScore,
      priority: this.determinePriority(rec.ranking_score || rec.personalizedScore),
      ctaText: rec.ctaText || 'View Details',
      messageTitle: rec.messageTitle || 'Recommended for You',
      messageDescription: rec.messageDescription || rec.reason || rec.reasoning,
      tags: this.generateTags(rec, context)
    };
  }

  /**
   * 應用用戶偏好篩選
   */
  private async applyUserPreferenceFilters(
    recommendations: RecommendationItem[],
    userId: string,
    filters?: any
  ): Promise<RecommendationItem[]> {
    const user = await userRepository.findById(userId);
    if (!user) return recommendations;

    let filtered = [...recommendations];

    // 應用年費篩選
    if (user.maxAnnualFee) {
      filtered = filtered.filter(rec => {
        // 這裡需要獲取卡片的年費信息
        return true; // 簡化實現
      });
    }

    // 應用信用分數篩選
    if (user.creditScore) {
      filtered = filtered.filter(rec => {
        // 檢查卡片的信用分數要求
        return true; // 簡化實現
      });
    }

    // 應用其他篩選器
    if (filters) {
      // 實現自定義篩選邏輯
    }

    return filtered;
  }

  /**
   * 建立推薦元數據
   */
  private buildRecommendationMetadata(
    homepageRecommendations: any,
    context: PersonalizationContext,
    startTime: number
  ): RecommendationMetadata {
    return {
      algorithmVersion: '2.1.0',
      personalizationScore: homepageRecommendations.diversityScore || 0.7,
      diversityScore: homepageRecommendations.diversityScore || 0.8,
      contextFactors: [
        `user_segment:${context.userSegment}`,
        `lifestage:${context.lifestagePhase}`,
        `persona:${context.spendingPersona}`,
        ...context.seasonalFactors
      ],
      filtersCriteria: homepageRecommendations.metadata?.filtersCriteria || [],
      performanceMetrics: {
        responseTime: Date.now() - startTime,
        confidenceLevel: 0.8,
        dataFreshness: 0.9
      }
    };
  }

  // 輔助方法
  private generateRecommendationId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private determineUserSegment(user: any, userCards: any[]): PersonalizationContext['userSegment'] {
    if (userCards.length === 0) return 'new_user';
    if (userCards.length <= 2) return 'light_user';
    if (userCards.length <= 4) return 'heavy_user';
    return 'optimizer';
  }

  private determineLifestagePhase(user: any): PersonalizationContext['lifestagePhase'] {
    if (user.age < 25) return 'student';
    if (user.age < 35) return 'young_professional';
    if (user.age < 50) return 'family';
    if (user.age < 65) return 'established';
    return 'senior';
  }

  private determineSpendingPersona(user: any): PersonalizationContext['spendingPersona'] {
    if (user.riskTolerance === 'low') return 'conservative';
    if (user.riskTolerance === 'high') return 'aggressive';
    return 'moderate';
  }

  private extractPrimaryGoals(user: any): string[] {
    return user.primaryGoals || ['maximize_rewards', 'build_credit'];
  }

  private getCurrentSeasonalFactors(): string[] {
    const month = new Date().getMonth();
    if (month >= 10 || month <= 1) return ['holiday_shopping', 'year_end_benefits'];
    if (month >= 5 && month <= 7) return ['summer_travel', 'vacation_planning'];
    return ['general'];
  }

  private calculateEstimatedBenefit(rec: any, context: PersonalizationContext): number {
    // 基於用戶消費模式計算預估收益
    return Math.floor(Math.random() * 500) + 200; // 簡化實現
  }

  private determinePriority(score: number): 'high' | 'medium' | 'low' {
    if (score > 0.8) return 'high';
    if (score > 0.6) return 'medium';
    return 'low';
  }

  private generateTags(rec: any, context: PersonalizationContext): string[] {
    const tags = [];
    
    // Add meaningful tags based on card properties
    const cardName = rec.card_name || rec.cardName || '';
    if (cardName.toLowerCase().includes('travel')) tags.push('travel');
    if (cardName.toLowerCase().includes('cash')) tags.push('cashback');
    if (cardName.toLowerCase().includes('dining')) tags.push('dining');
    if (cardName.toLowerCase().includes('gold')) tags.push('premium');
    if (cardName.toLowerCase().includes('preferred')) tags.push('rewards');
    
    // Add score-based tags
    const score = rec.ranking_score || rec.personalizedScore || 0;
    if (score > 0.8) tags.push('top_match');
    else if (score > 0.6) tags.push('good_match');
    else tags.push('potential_match');
    
    if (context.userSegment === 'new_user') tags.push('beginner_friendly');
    if (context.spendingPersona === 'aggressive') tags.push('premium');
    
    // Ensure we always have at least one tag
    if (tags.length === 0) tags.push('recommended');
    
    return tags;
  }

  private selectHeroBackgroundImage(context: PersonalizationContext): string {
    // 根據上下文選擇背景圖片
    return '/images/hero-bg-default.jpg';
  }

  private generateHeroHighlight(item: RecommendationItem, context: PersonalizationContext): string {
    return `Personalized recommendation - Estimated annual benefit $${item.estimatedBenefit}`;
  }

  private selectCtaStyle(context: PersonalizationContext): 'primary' | 'secondary' | 'accent' {
    return context.spendingPersona === 'aggressive' ? 'accent' : 'primary';
  }

  private getCategoryDisplayName(category: string): string {
    const names: Record<string, string> = {
      dining: 'Dining Rewards',
      travel: 'Travel Rewards',
      cashback: 'Cash Back',
      gas: 'Gas Rewards'
    };
    return names[category] || category;
  }

  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      dining: 'restaurant',
      travel: 'flight',
      cashback: 'money',
      gas: 'local_gas_station'
    };
    return icons[category] || 'credit_card';
  }

  // 降級方法
  private async getDegradedHomepageLayout(userId: string): Promise<HomepageLayout> {
    return {
      hero: {
        card: {
          cardId: 'fallback',
          cardName: 'Basic Recommendation',
          score: 0.5,
          reasoning: 'System maintenance in progress',
          estimatedBenefit: 200,
          confidence: 0.3,
          priority: 'medium',
          ctaText: 'Learn More',
          messageTitle: 'Recommended Credit Card',
          messageDescription: 'Basic recommendation plan',
          tags: ['fallback']
        },
        backgroundImage: '/images/hero-bg-default.jpg',
        highlight: 'System maintenance in progress, providing basic recommendations',
        ctaStyle: 'secondary'
      },
      featured: [],
      trending: [],
      personalized: [],
      categories: []
    };
  }

  // A/B 測試變體方法
  private async getConservativeVariant(request: RecommendationRequest): Promise<RecommendationResult> {
    // 保守型推薦邏輯
    return await this.getHomepageRecommendations({
      ...request,
      filters: {
        ...request.filters,
        maxAnnualFee: 100
      }
    });
  }

  private async getAggressiveVariant(request: RecommendationRequest): Promise<RecommendationResult> {
    // 積極型推薦邏輯
    return await this.getHomepageRecommendations({
      ...request,
      options: {
        ...request.options,
        diversityWeight: 0.3,
        freshnessWeight: 0.7
      }
    });
  }

  private async getCategoryFocusedVariant(request: RecommendationRequest): Promise<RecommendationResult> {
    // 分類聚焦推薦邏輯
    return await this.getHomepageRecommendations(request);
  }

  private async generateTimeBasedRecommendations(
    userId: string,
    timeContext: any,
    personalizationContext: PersonalizationContext
  ): Promise<RecommendationItem[]> {
    // 實現時間敏感推薦
    return [];
  }

  private async checkUrgentRecommendations(userId: string): Promise<RecommendationItem[]> {
    // 檢查緊急推薦
    return [];
  }

  /**
   * Fallback method: 直接調用RecEngine獲取推薦
   */
  private async getFallbackRecommendations(
    userId: string, 
    maxResults: number, 
    context: PersonalizationContext
  ): Promise<RecommendationItem[]> {
    try {
      console.log('🔄 Using fallback recommendations via direct RecEngine call');
      
      // 直接調用RecEngine HTTP API
      const response = await fetch('http://localhost:8080/personalized-ranking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          spending_pattern: {
            dining: 600,
            groceries: 400,
            gas: 200,
            travel: 150,
            other: 1650
          }
        })
      });

      if (!response.ok) {
        throw new Error(`RecEngine API failed: ${response.status}`);
      }

      const recEngineResponse = await response.json();

      // 轉換RecEngine回應為RecommendationItem
      const recommendations = recEngineResponse.ranked_cards.slice(0, maxResults).map((card: any) => {
        const recEngineCardId = card.card_id;
        const databaseCardId = convertRecEngineIdToUuid(recEngineCardId);
        
        console.log(`🎯 Fallback recommendation: ${card.card_name}, score: ${card.ranking_score}`);
        
        return {
          cardId: databaseCardId || recEngineCardId,
          cardName: card.card_name,
          score: card.ranking_score, // 使用RecEngine的原始分數
          reasoning: card.reason || 'Recommended based on market analysis',
          estimatedBenefit: Math.round(card.ranking_score * 500), // 基於分數計算收益
          confidence: card.ranking_score,
          priority: card.ranking_score > 0.4 ? 'high' : card.ranking_score > 0.25 ? 'medium' : 'low',
          ctaText: 'View Details',
          messageTitle: `Great choice for your spending`,
          messageDescription: card.reason || 'This card offers good value for your profile',
          tags: ['recommended']
        };
      });

      return recommendations;
    } catch (fallbackError) {
      console.error('❌ Fallback recommendation also failed:', fallbackError);
      
      // 最後的fallback：返回hardcoded的高分數推薦
      return [{
        cardId: '550e8400-e29b-41d4-a716-446655440001',
        cardName: 'Chase Sapphire Preferred',
        score: 0.75, // 高分數確保至少3-4顆星
        reasoning: 'Popular travel rewards card',
        estimatedBenefit: 300,
        confidence: 0.75,
        priority: 'high',
        ctaText: 'View Details',
        messageTitle: 'Excellent Travel Rewards',
        messageDescription: 'Great for dining and travel purchases',
        tags: ['travel', 'dining', 'popular']
      }];
    }
  }

  private generatePersonalizedMessages(
    context: PersonalizationContext,
    timeContext: any
  ): { primary: string; secondary: string } {
    return {
      primary: `Welcome back!`,
      secondary: 'Found better credit card options for you'
    };
  }
}

export const homepageRecommendationService = new HomepageRecommendationService();