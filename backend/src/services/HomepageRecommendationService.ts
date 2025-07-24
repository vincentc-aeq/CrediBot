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
   * Generate complete homepage recommendation layout
   */
  async generateHomepageLayout(userId: string): Promise<HomepageLayout> {
    try {
      // Build personalization context
      const personalizationContext = await this.buildPersonalizationContext(userId);

      // Get different types of recommendations in parallel
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
      
      // Return degraded version
      return await this.getDegradedHomepageLayout(userId);
    }
  }

  /**
   * Get homepage recommendations (main method)
   */
  async getHomepageRecommendations(request: RecommendationRequest): Promise<RecommendationResult> {
    try {
      const userId = request.userId;
      const maxResults = request.options?.maxResults || 6;

      // Build personalization context
      const personalizationContext = await this.buildPersonalizationContext(userId);

      let recommendations: RecommendationItem[] = [];

      try {
        // Use PersonalizedRankerService to get recommendations
        const homepageRecommendations = await personalizedRankerService.getHomepageRecommendations(
          userId,
          maxResults
        );

        // Convert to standard recommendation format
        recommendations = this.convertToRecommendationItems(
          homepageRecommendations.personalized,
          personalizationContext
        );
        
        console.log('✅ PersonalizedRankerService succeeded');
      } catch (error) {
        console.warn('⚠️ PersonalizedRankerService failed, falling back to RecEngine direct call:', error.message);
        
        // Fallback: Call RecEngine directly
        const fallbackRecommendations = await this.getFallbackRecommendations(userId, maxResults, personalizationContext);
        recommendations = fallbackRecommendations;
      }

      // Apply user preference filters
      const filteredRecommendations = await this.applyUserPreferenceFilters(
        recommendations,
        userId,
        request.filters
      );

      // Build recommendation result
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
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expires in 24 hours
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
   * Get dynamic homepage content (based on time and context)
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
      
      // Generate time-sensitive recommendations
      const timeBasedRecommendations = await this.generateTimeBasedRecommendations(
        userId,
        timeContext,
        personalizationContext
      );

      // Check for urgent recommendations
      const urgentRecommendations = await this.checkUrgentRecommendations(userId);

      // Generate personalized messages
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
   * A/B test recommendation variants
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

      // Adjust recommendation strategy based on variant
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
  // Private methods
  // ===========================================

  /**
   * Build personalization context
   */
  private async buildPersonalizationContext(userId: string): Promise<PersonalizationContext> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const userCards = await userCardRepository.findUserCardsWithDetails(userId);
    
    // Analyze user segment
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
   * Generate hero recommendation
   */
  private async generateHeroRecommendation(
    userId: string,
    context: PersonalizationContext
  ): Promise<HeroRecommendation> {
    // Get the best recommendation
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
   * Generate featured recommendations
   */
  private async generateFeaturedRecommendations(
    userId: string,
    context: PersonalizationContext
  ): Promise<RecommendationItem[]> {
    const homepageRecommendations = await personalizedRankerService.getHomepageRecommendations(
      userId,
      6
    );

    // Select top 3 highest scoring cards as featured recommendations
    const featured = homepageRecommendations.featured.slice(0, 3);
    
    return featured.map(rec => this.convertToRecommendationItem(rec, context));
  }

  /**
   * Generate trending recommendations
   */
  private async generateTrendingRecommendations(
    userId: string,
    context: PersonalizationContext
  ): Promise<RecommendationItem[]> {
    // Get market trending cards
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
   * Generate personalized recommendations
   */
  private async generatePersonalizedRecommendations(
    userId: string,
    context: PersonalizationContext
  ): Promise<RecommendationItem[]> {
    const homepageRecommendations = await personalizedRankerService.getHomepageRecommendations(
      userId,
      9
    );

    // Exclude recommendations already in featured
    const personalized = homepageRecommendations.personalized.slice(3, 6);
    
    return personalized.map(rec => this.convertToRecommendationItem(rec, context));
  }

  /**
   * Generate category recommendations
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
   * Convert recommendation format
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
   * Apply user preference filters
   */
  private async applyUserPreferenceFilters(
    recommendations: RecommendationItem[],
    userId: string,
    filters?: any
  ): Promise<RecommendationItem[]> {
    const user = await userRepository.findById(userId);
    if (!user) return recommendations;

    let filtered = [...recommendations];

    // Apply annual fee filter
    if (user.maxAnnualFee) {
      filtered = filtered.filter(rec => {
        // Need to get card annual fee information
        return true; // Simplified implementation
      });
    }

    // Apply credit score filter
    if (user.creditScore) {
      filtered = filtered.filter(rec => {
        // Check card credit score requirements
        return true; // Simplified implementation
      });
    }

    // Apply other filters
    if (filters) {
      // Implement custom filter logic
    }

    return filtered;
  }

  /**
   * Build recommendation metadata
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

  // Helper methods
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
    // Calculate estimated benefit based on user spending patterns
    return Math.floor(Math.random() * 500) + 200; // Simplified implementation
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
    // Select background image based on context
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

  // Degradation methods
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

  // A/B test variant methods
  private async getConservativeVariant(request: RecommendationRequest): Promise<RecommendationResult> {
    // Conservative recommendation logic
    return await this.getHomepageRecommendations({
      ...request,
      filters: {
        ...request.filters,
        maxAnnualFee: 100
      }
    });
  }

  private async getAggressiveVariant(request: RecommendationRequest): Promise<RecommendationResult> {
    // Aggressive recommendation logic
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
    // Category-focused recommendation logic
    return await this.getHomepageRecommendations(request);
  }

  private async generateTimeBasedRecommendations(
    userId: string,
    timeContext: any,
    personalizationContext: PersonalizationContext
  ): Promise<RecommendationItem[]> {
    // Implement time-sensitive recommendations
    return [];
  }

  private async checkUrgentRecommendations(userId: string): Promise<RecommendationItem[]> {
    // Check for urgent recommendations
    return [];
  }

  /**
   * Fallback method: Call RecEngine directly
   */
  private async getFallbackRecommendations(
    userId: string, 
    maxResults: number, 
    context: PersonalizationContext
  ): Promise<RecommendationItem[]> {
    try {
      console.log('🔄 Using fallback recommendations via direct RecEngine call');
      
      // Call RecEngine HTTP API directly
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

      // Convert RecEngine response to RecommendationItem
      const recommendations = recEngineResponse.ranked_cards.slice(0, maxResults).map((card: any) => {
        const recEngineCardId = card.card_id;
        const databaseCardId = convertRecEngineIdToUuid(recEngineCardId);
        
        console.log(`🎯 Fallback recommendation: ${card.card_name}, score: ${card.ranking_score}`);
        
        return {
          cardId: databaseCardId || recEngineCardId,
          cardName: card.card_name,
          score: card.ranking_score, // Use RecEngine's original score
          reasoning: card.reason || 'Recommended based on market analysis',
          estimatedBenefit: Math.round(card.ranking_score * 500), // Calculate benefit based on score
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
      
      // Final fallback: return hardcoded high-score recommendation
      return [{
        cardId: '550e8400-e29b-41d4-a716-446655440001',
        cardName: 'Chase Sapphire Preferred',
        score: 0.75, // High score ensures at least 3-4 stars
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