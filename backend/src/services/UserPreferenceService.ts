import { userRepository } from '../repositories/UserRepository';
import { userCardRepository } from '../repositories/UserCardRepository';
import { transactionRepository } from '../repositories/TransactionRepository';
import { auditService } from './AuditService';
import { CreditCard } from '../models/CreditCard';
import { RecommendationItem } from './RecommendationEngineService';
import { SpendingCategory, CardType } from '../models/types';
import { RecEngineException } from '../models/RecEngine';

export interface UserPreferences {
  id: string;
  userId: string;
  cardTypePreferences: CardTypePreference[];
  spendingCategoryPriorities: CategoryPriority[];
  financialConstraints: FinancialConstraints;
  behavioralPreferences: BehavioralPreferences;
  riskProfile: RiskProfile;
  goals: UserGoals;
  createdAt: Date;
  updatedAt: Date;
}

export interface CardTypePreference {
  cardType: CardType;
  preference: 'strongly_prefer' | 'prefer' | 'neutral' | 'avoid' | 'strongly_avoid';
  reasoning?: string;
}

export interface CategoryPriority {
  category: SpendingCategory;
  priority: number; // 1-10, 10 being highest priority
  monthlySpending: number;
  importance: 'high' | 'medium' | 'low';
}

export interface FinancialConstraints {
  maxAnnualFee: number;
  minCreditScore: number;
  maxTotalCards: number;
  maxTotalAnnualFees: number;
  incomeRange: 'under_30k' | '30k_50k' | '50k_75k' | '75k_100k' | '100k_plus';
}

export interface BehavioralPreferences {
  rewardRedemptionStyle: 'immediate' | 'accumulate' | 'strategic';
  managementStyle: 'simple' | 'moderate' | 'complex';
  applicationFrequency: 'conservative' | 'moderate' | 'aggressive';
  loyaltyToIssuers: boolean;
  preferredChannels: string[];
}

export interface RiskProfile {
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  creditUtilizationComfort: number; // 0-1
  annualFeeAcceptance: 'none' | 'low' | 'moderate' | 'high';
  newProductOpenness: 'closed' | 'selective' | 'open' | 'early_adopter';
}

export interface UserGoals {
  primary: PrimaryGoal;
  secondary: SecondaryGoal[];
  timeframe: 'short_term' | 'medium_term' | 'long_term';
  specificTargets: Record<string, number>;
}

export enum PrimaryGoal {
  MAXIMIZE_REWARDS = 'maximize_rewards',
  MINIMIZE_FEES = 'minimize_fees',
  BUILD_CREDIT = 'build_credit',
  SIMPLIFY_FINANCES = 'simplify_finances',
  TRAVEL_BENEFITS = 'travel_benefits',
  BUSINESS_OPTIMIZATION = 'business_optimization'
}

export enum SecondaryGoal {
  EMERGENCY_FUND = 'emergency_fund',
  BALANCE_TRANSFER = 'balance_transfer',
  LARGE_PURCHASE = 'large_purchase',
  CREDIT_REPAIR = 'credit_repair',
  FAMILY_BENEFITS = 'family_benefits'
}

export interface PreferenceScore {
  totalScore: number;
  componentScores: {
    cardTypeMatch: number;
    categoryAlignment: number;
    constraintCompliance: number;
    behavioralFit: number;
    riskAlignment: number;
    goalAlignment: number;
  };
  explanation: string[];
  confidence: number;
}

export class UserPreferenceService {
  /**
   * 獲取用戶偏好
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      // 嘗試從數據庫獲取已存儲的偏好
      let preferences = await this.loadStoredPreferences(userId);
      
      if (!preferences) {
        // 如果沒有存儲的偏好，則推斷偏好
        preferences = await this.inferUserPreferences(userId);
        
        // 保存推斷的偏好
        await this.saveUserPreferences(preferences);
      }

      return preferences;

    } catch (error) {
      console.error('Error getting user preferences:', error);
      throw new RecEngineException(
        'PREFERENCE_RETRIEVAL_ERROR',
        `Failed to get user preferences: ${error.message}`,
        { userId, originalError: error }
      );
    }
  }

  /**
   * 更新用戶偏好
   */
  async updateUserPreferences(
    userId: string,
    updates: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    try {
      const currentPreferences = await this.getUserPreferences(userId);
      
      const updatedPreferences: UserPreferences = {
        ...currentPreferences,
        ...updates,
        userId,
        updatedAt: new Date()
      };

      await this.saveUserPreferences(updatedPreferences);

      // 記錄偏好更新
      await auditService.logUpdate(
        'user_preferences',
        userId,
        currentPreferences,
        updatedPreferences,
        userId
      );

      return updatedPreferences;

    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw new RecEngineException(
        'PREFERENCE_UPDATE_ERROR',
        `Failed to update user preferences: ${error.message}`,
        { userId, updates, originalError: error }
      );
    }
  }

  /**
   * 根據偏好篩選信用卡
   */
  async filterCardsByPreferences(
    userId: string,
    cards: CreditCard[]
  ): Promise<CreditCard[]> {
    try {
      const preferences = await this.getUserPreferences(userId);
      let filteredCards = [...cards];

      // 應用財務約束篩選
      filteredCards = this.applyFinancialConstraints(filteredCards, preferences.financialConstraints);

      // 應用卡片類型偏好篩選
      filteredCards = this.applyCardTypePreferences(filteredCards, preferences.cardTypePreferences);

      // 應用風險偏好篩選
      filteredCards = this.applyRiskProfileFilters(filteredCards, preferences.riskProfile);

      return filteredCards;

    } catch (error) {
      console.error('Error filtering cards by preferences:', error);
      return cards; // 如果篩選失敗，返回原始列表
    }
  }

  /**
   * 根據偏好為信用卡評分
   */
  async scoreCardsByPreferences(
    userId: string,
    cards: CreditCard[]
  ): Promise<Array<{ card: CreditCard; score: PreferenceScore }>> {
    try {
      const preferences = await this.getUserPreferences(userId);
      const scoredCards: Array<{ card: CreditCard; score: PreferenceScore }> = [];

      for (const card of cards) {
        const score = this.calculatePreferenceScore(card, preferences);
        scoredCards.push({ card, score });
      }

      // 按總分排序
      scoredCards.sort((a, b) => b.score.totalScore - a.score.totalScore);

      return scoredCards;

    } catch (error) {
      console.error('Error scoring cards by preferences:', error);
      throw new RecEngineException(
        'PREFERENCE_SCORING_ERROR',
        `Failed to score cards by preferences: ${error.message}`,
        { userId, originalError: error }
      );
    }
  }

  /**
   * 根據偏好篩選推薦
   */
  async filterRecommendationsByPreferences(
    userId: string,
    recommendations: RecommendationItem[]
  ): Promise<RecommendationItem[]> {
    try {
      const preferences = await this.getUserPreferences(userId);
      let filtered = [...recommendations];

      // 根據目標篩選
      filtered = this.filterByGoals(filtered, preferences.goals);

      // 根據行為偏好篩選
      filtered = this.filterByBehavioralPreferences(filtered, preferences.behavioralPreferences);

      // 限制結果數量（基於管理偏好）
      const maxResults = this.getMaxResultsBasedOnPreferences(preferences);
      filtered = filtered.slice(0, maxResults);

      return filtered;

    } catch (error) {
      console.error('Error filtering recommendations by preferences:', error);
      return recommendations;
    }
  }

  /**
   * 學習用戶偏好（基於行為）
   */
  async learnFromUserBehavior(
    userId: string,
    behavior: {
      cardViewed?: string;
      cardClicked?: string;
      cardApplied?: string;
      cardDismissed?: string;
      categoryInteraction?: { category: string; action: string };
      feedbackProvided?: { rating: number; comment?: string };
    }
  ): Promise<void> {
    try {
      const currentPreferences = await this.getUserPreferences(userId);
      let updates: Partial<UserPreferences> = {};

      // 根據不同行為更新偏好
      if (behavior.cardApplied) {
        updates = await this.updatePreferencesFromApplication(
          currentPreferences,
          behavior.cardApplied
        );
      } else if (behavior.cardDismissed) {
        updates = await this.updatePreferencesFromDismissal(
          currentPreferences,
          behavior.cardDismissed
        );
      } else if (behavior.categoryInteraction) {
        updates = this.updateCategoryPreferences(
          currentPreferences,
          behavior.categoryInteraction
        );
      }

      if (Object.keys(updates).length > 0) {
        await this.updateUserPreferences(userId, updates);
      }

      // 記錄學習事件
      await auditService.log({
        entityType: 'user_preferences',
        entityId: userId,
        action: 'LEARNING' as any,
        userId,
        metadata: { behavior, updates },
        description: 'Learning from user behavior'
      });

    } catch (error) {
      console.error('Error learning from user behavior:', error);
    }
  }

  /**
   * 獲取偏好洞察
   */
  async getPreferenceInsights(userId: string): Promise<{
    strengths: string[];
    gaps: string[];
    recommendations: string[];
    confidence: number;
  }> {
    try {
      const preferences = await this.getUserPreferences(userId);
      const userCards = await userCardRepository.findUserCardsWithDetails(userId);

      const strengths = this.identifyPreferenceStrengths(preferences, userCards);
      const gaps = this.identifyPreferenceGaps(preferences, userCards);
      const recommendations = this.generatePreferenceRecommendations(preferences, gaps);
      const confidence = this.calculatePreferenceConfidence(preferences);

      return {
        strengths,
        gaps,
        recommendations,
        confidence
      };

    } catch (error) {
      console.error('Error getting preference insights:', error);
      return {
        strengths: [],
        gaps: [],
        recommendations: [],
        confidence: 0.5
      };
    }
  }

  // ===========================================
  // 私有方法
  // ===========================================

  /**
   * 推斷用戶偏好
   */
  private async inferUserPreferences(userId: string): Promise<UserPreferences> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const userCards = await userCardRepository.findUserCardsWithDetails(userId);
    const transactions = await this.getRecentTransactions(userId);

    // 推斷卡片類型偏好
    const cardTypePreferences = this.inferCardTypePreferences(userCards);

    // 推斷消費類別優先級
    const spendingCategoryPriorities = this.inferCategoryPriorities(transactions);

    // 推斷財務約束
    const financialConstraints = this.inferFinancialConstraints(user, userCards);

    // 推斷行為偏好
    const behavioralPreferences = this.inferBehavioralPreferences(user, userCards);

    // 推斷風險偏好
    const riskProfile = this.inferRiskProfile(user, userCards);

    // 推斷目標
    const goals = this.inferUserGoals(user, userCards, transactions);

    return {
      id: this.generatePreferenceId(),
      userId,
      cardTypePreferences,
      spendingCategoryPriorities,
      financialConstraints,
      behavioralPreferences,
      riskProfile,
      goals,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * 計算偏好分數
   */
  private calculatePreferenceScore(
    card: CreditCard,
    preferences: UserPreferences
  ): PreferenceScore {
    const scores = {
      cardTypeMatch: this.scoreCardTypeMatch(card, preferences.cardTypePreferences),
      categoryAlignment: this.scoreCategoryAlignment(card, preferences.spendingCategoryPriorities),
      constraintCompliance: this.scoreConstraintCompliance(card, preferences.financialConstraints),
      behavioralFit: this.scoreBehavioralFit(card, preferences.behavioralPreferences),
      riskAlignment: this.scoreRiskAlignment(card, preferences.riskProfile),
      goalAlignment: this.scoreGoalAlignment(card, preferences.goals)
    };

    // 加權計算總分
    const weights = {
      cardTypeMatch: 0.15,
      categoryAlignment: 0.25,
      constraintCompliance: 0.20,
      behavioralFit: 0.15,
      riskAlignment: 0.10,
      goalAlignment: 0.15
    };

    const totalScore = Object.entries(scores).reduce((sum, [key, score]) => {
      return sum + score * weights[key as keyof typeof weights];
    }, 0);

    const explanation = this.generateScoreExplanation(scores, card);
    const confidence = this.calculateScoreConfidence(scores);

    return {
      totalScore,
      componentScores: scores,
      explanation,
      confidence
    };
  }

  /**
   * 應用財務約束篩選
   */
  private applyFinancialConstraints(
    cards: CreditCard[],
    constraints: FinancialConstraints
  ): CreditCard[] {
    return cards.filter(card => {
      // 年費約束
      if (card.annualFee > constraints.maxAnnualFee) {
        return false;
      }

      // 信用分數約束
      if (card.requirements && typeof card.requirements === 'object') {
        const minScore = (card.requirements as any).minCreditScore;
        if (minScore && minScore > constraints.minCreditScore) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 應用卡片類型偏好篩選
   */
  private applyCardTypePreferences(
    cards: CreditCard[],
    preferences: CardTypePreference[]
  ): CreditCard[] {
    const avoidTypes = preferences
      .filter(p => p.preference === 'avoid' || p.preference === 'strongly_avoid')
      .map(p => p.cardType);

    return cards.filter(card => !avoidTypes.includes(card.cardType));
  }

  /**
   * 應用風險偏好篩選
   */
  private applyRiskProfileFilters(
    cards: CreditCard[],
    riskProfile: RiskProfile
  ): CreditCard[] {
    return cards.filter(card => {
      // 年費接受度篩選
      if (riskProfile.annualFeeAcceptance === 'none' && card.annualFee > 0) {
        return false;
      }
      if (riskProfile.annualFeeAcceptance === 'low' && card.annualFee > 100) {
        return false;
      }
      if (riskProfile.annualFeeAcceptance === 'moderate' && card.annualFee > 300) {
        return false;
      }

      return true;
    });
  }

  // 評分方法
  private scoreCardTypeMatch(card: CreditCard, preferences: CardTypePreference[]): number {
    const preference = preferences.find(p => p.cardType === card.cardType);
    if (!preference) return 0.5;

    const scoreMap = {
      'strongly_prefer': 1.0,
      'prefer': 0.8,
      'neutral': 0.5,
      'avoid': 0.2,
      'strongly_avoid': 0.0
    };

    return scoreMap[preference.preference];
  }

  private scoreCategoryAlignment(card: CreditCard, priorities: CategoryPriority[]): number {
    if (!card.rewardStructure) return 0.3;

    let totalScore = 0;
    let totalWeight = 0;

    for (const priority of priorities) {
      const rewardRate = this.getRewardRateForCategory(card, priority.category);
      const weight = priority.priority / 10;
      totalScore += rewardRate * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.min(totalScore / totalWeight / 5, 1) : 0.3;
  }

  private scoreConstraintCompliance(card: CreditCard, constraints: FinancialConstraints): number {
    let score = 1.0;

    // 年費合規性
    if (card.annualFee > constraints.maxAnnualFee) {
      score -= 0.5;
    }

    // 信用分數要求
    if (card.requirements && typeof card.requirements === 'object') {
      const minScore = (card.requirements as any).minCreditScore;
      if (minScore && minScore > constraints.minCreditScore) {
        score -= 0.3;
      }
    }

    return Math.max(score, 0);
  }

  private scoreBehavioralFit(card: CreditCard, behavioral: BehavioralPreferences): number {
    let score = 0.5;

    // 簡化複雜度偏好
    if (behavioral.managementStyle === 'simple') {
      if (card.annualFee === 0) score += 0.2;
      if (!card.rewardStructure || card.rewardStructure.length <= 2) score += 0.2;
    }

    return Math.min(score, 1);
  }

  private scoreRiskAlignment(card: CreditCard, risk: RiskProfile): number {
    let score = 0.5;

    // 年費風險
    if (risk.annualFeeAcceptance === 'none' && card.annualFee === 0) score += 0.3;
    if (risk.annualFeeAcceptance === 'high' && card.annualFee > 200) score += 0.2;

    return Math.min(score, 1);
  }

  private scoreGoalAlignment(card: CreditCard, goals: UserGoals): number {
    let score = 0.5;

    switch (goals.primary) {
      case PrimaryGoal.MAXIMIZE_REWARDS:
        if (card.rewardStructure && card.rewardStructure.some(r => r.rewardRate > 2)) {
          score += 0.3;
        }
        break;
      case PrimaryGoal.MINIMIZE_FEES:
        if (card.annualFee === 0) score += 0.4;
        break;
      case PrimaryGoal.BUILD_CREDIT:
        if (card.requirements && (card.requirements as any).minCreditScore < 650) {
          score += 0.3;
        }
        break;
    }

    return Math.min(score, 1);
  }

  // 推斷方法
  private inferCardTypePreferences(userCards: any[]): CardTypePreference[] {
    const typeCount = new Map<CardType, number>();
    
    userCards.forEach(card => {
      typeCount.set(card.cardType, (typeCount.get(card.cardType) || 0) + 1);
    });

    const preferences: CardTypePreference[] = [];
    for (const [cardType, count] of typeCount.entries()) {
      const preference = count > 1 ? 'prefer' : count === 1 ? 'neutral' : 'neutral';
      preferences.push({ cardType, preference });
    }

    return preferences;
  }

  private inferCategoryPriorities(transactions: any[]): CategoryPriority[] {
    const categorySpending = new Map<SpendingCategory, number>();
    
    transactions.forEach(txn => {
      const category = txn.category || SpendingCategory.OTHER;
      categorySpending.set(category, (categorySpending.get(category) || 0) + txn.amount);
    });

    const priorities: CategoryPriority[] = [];
    const total = Array.from(categorySpending.values()).reduce((sum, amount) => sum + amount, 0);

    for (const [category, amount] of categorySpending.entries()) {
      const percentage = total > 0 ? amount / total : 0;
      const priority = Math.ceil(percentage * 10);
      const importance = percentage > 0.2 ? 'high' : percentage > 0.1 ? 'medium' : 'low';
      
      priorities.push({
        category,
        priority,
        monthlySpending: amount / 3, // 假設3個月數據
        importance
      });
    }

    return priorities.sort((a, b) => b.priority - a.priority);
  }

  private inferFinancialConstraints(user: any, userCards: any[]): FinancialConstraints {
    const maxAnnualFee = Math.max(...userCards.map(c => c.annualFee || 0), 200);
    const maxTotalCards = Math.max(userCards.length + 2, 5);
    const totalCurrentFees = userCards.reduce((sum, c) => sum + (c.annualFee || 0), 0);

    return {
      maxAnnualFee,
      minCreditScore: user.creditScore || 650,
      maxTotalCards,
      maxTotalAnnualFees: Math.max(totalCurrentFees * 1.5, 500),
      incomeRange: this.mapIncomeToRange(user.income)
    };
  }

  private inferBehavioralPreferences(user: any, userCards: any[]): BehavioralPreferences {
    return {
      rewardRedemptionStyle: 'accumulate',
      managementStyle: userCards.length <= 2 ? 'simple' : userCards.length <= 4 ? 'moderate' : 'complex',
      applicationFrequency: 'moderate',
      loyaltyToIssuers: this.checkIssuerLoyalty(userCards),
      preferredChannels: ['web', 'mobile']
    };
  }

  private inferRiskProfile(user: any, userCards: any[]): RiskProfile {
    const hasAnnualFeeCards = userCards.some(c => c.annualFee > 0);
    const averageFee = userCards.reduce((sum, c) => sum + (c.annualFee || 0), 0) / userCards.length;

    return {
      riskTolerance: user.riskTolerance || 'moderate',
      creditUtilizationComfort: 0.3,
      annualFeeAcceptance: hasAnnualFeeCards ? (averageFee > 200 ? 'high' : 'moderate') : 'low',
      newProductOpenness: 'selective'
    };
  }

  private inferUserGoals(user: any, userCards: any[], transactions: any[]): UserGoals {
    // 簡化的目標推斷邏輯
    let primary = PrimaryGoal.MAXIMIZE_REWARDS;
    
    if (userCards.every(c => c.annualFee === 0)) {
      primary = PrimaryGoal.MINIMIZE_FEES;
    } else if (user.creditScore < 650) {
      primary = PrimaryGoal.BUILD_CREDIT;
    }

    return {
      primary,
      secondary: [SecondaryGoal.EMERGENCY_FUND],
      timeframe: 'medium_term',
      specificTargets: {}
    };
  }

  // 輔助方法
  private async getRecentTransactions(userId: string) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    
    return await transactionRepository.findByUserAndDateRange(userId, startDate, endDate);
  }

  private getRewardRateForCategory(card: CreditCard, category: SpendingCategory): number {
    if (!card.rewardStructure) return 0;
    
    const reward = card.rewardStructure.find(r => r.category === category);
    return reward ? reward.rewardRate : 0;
  }

  private mapIncomeToRange(income?: number): FinancialConstraints['incomeRange'] {
    if (!income) return '50k_75k';
    if (income < 30000) return 'under_30k';
    if (income < 50000) return '30k_50k';
    if (income < 75000) return '50k_75k';
    if (income < 100000) return '75k_100k';
    return '100k_plus';
  }

  private checkIssuerLoyalty(userCards: any[]): boolean {
    const issuers = new Set(userCards.map(c => c.issuer));
    return issuers.size < userCards.length;
  }

  private generateScoreExplanation(scores: any, card: CreditCard): string[] {
    const explanations: string[] = [];
    
    if (scores.categoryAlignment > 0.7) {
      explanations.push('此卡在您的主要消費類別提供良好獎勵');
    }
    if (scores.constraintCompliance < 0.5) {
      explanations.push('此卡可能不符合您的財務約束');
    }
    
    return explanations;
  }

  private calculateScoreConfidence(scores: any): number {
    const variance = Object.values(scores).reduce((sum: number, score: any) => {
      const diff = score - 0.5;
      return sum + diff * diff;
    }, 0) / Object.keys(scores).length;
    
    return Math.min(0.9, 0.5 + variance);
  }

  // 更多輔助方法
  private filterByGoals(items: RecommendationItem[], goals: UserGoals): RecommendationItem[] {
    return items; // 簡化實現
  }

  private filterByBehavioralPreferences(items: RecommendationItem[], behavioral: BehavioralPreferences): RecommendationItem[] {
    return items; // 簡化實現
  }

  private getMaxResultsBasedOnPreferences(preferences: UserPreferences): number {
    switch (preferences.behavioralPreferences.managementStyle) {
      case 'simple': return 3;
      case 'moderate': return 5;
      case 'complex': return 8;
      default: return 5;
    }
  }

  private async updatePreferencesFromApplication(preferences: UserPreferences, cardId: string): Promise<Partial<UserPreferences>> {
    // 實現從申請行為學習偏好的邏輯
    return {};
  }

  private async updatePreferencesFromDismissal(preferences: UserPreferences, cardId: string): Promise<Partial<UserPreferences>> {
    // 實現從拒絕行為學習偏好的邏輯
    return {};
  }

  private updateCategoryPreferences(preferences: UserPreferences, interaction: any): Partial<UserPreferences> {
    // 實現從分類互動學習偏好的邏輯
    return {};
  }

  private identifyPreferenceStrengths(preferences: UserPreferences, userCards: any[]): string[] {
    return ['明確的消費類別偏好', '合理的風險控制'];
  }

  private identifyPreferenceGaps(preferences: UserPreferences, userCards: any[]): string[] {
    return ['需要更多旅遊類別的優化', '年費效益可以改善'];
  }

  private generatePreferenceRecommendations(preferences: UserPreferences, gaps: string[]): string[] {
    return ['考慮申請旅遊獎勵卡', '檢視年費與收益比例'];
  }

  private calculatePreferenceConfidence(preferences: UserPreferences): number {
    return 0.8; // 簡化實現
  }

  private async loadStoredPreferences(userId: string): Promise<UserPreferences | null> {
    // 從數據庫加載偏好（需要實現）
    return null;
  }

  private async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    // 保存偏好到數據庫（需要實現）
    console.log('Saving preferences for user:', preferences.userId);
  }

  private generatePreferenceId(): string {
    return `pref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const userPreferenceService = new UserPreferenceService();