import { RecEngineClientFactory, defaultRecEngineConfig } from './RecEngineClient';
import {
  RewardEstimatorRequest,
  RewardEstimatorResponse,
  RewardEstimate,
  CategoryRewards,
  SpendingPattern,
  RecEngineException
} from '../models/RecEngine';
import { CreditCard } from '../models/CreditCard';
import { userCardRepository } from '../repositories/UserCardRepository';
import { creditCardRepository } from '../repositories/CreditCardRepository';
import { transactionRepository } from '../repositories/TransactionRepository';

export interface RewardComparisonResult {
  currentAnnualRewards: number;
  potentialAnnualRewards: number;
  totalGainPotential: number;
  bestRewardCards: RewardEstimate[];
  categoryAnalysis: CategoryRewards;
  recommendations: {
    cardId: string;
    cardName: string;
    estimatedGain: number;
    reasoning: string;
    confidence: number;
  }[];
}

export interface CardRewardCalculation {
  cardId: string;
  cardName: string;
  annualReward: number;
  categoryBreakdown: Record<string, {
    spending: number;
    rate: number;
    reward: number;
  }>;
  annualFee: number;
  netBenefit: number;
}

export class RewardEstimatorService {
  private recEngineClient = RecEngineClientFactory.getInstance(defaultRecEngineConfig);

  /**
   * 估算用戶的獎勵收益潛力
   */
  async estimateUserRewards(
    userId: string,
    candidateCardIds?: string[]
  ): Promise<RewardComparisonResult> {
    try {
      // 獲取用戶消費模式
      const spendingPattern = await this.getUserSpendingPattern(userId);

      // 獲取用戶當前信用卡
      const userCards = await userCardRepository.findUserCardsWithDetails(userId);
      const currentCards = userCards.map(uc => this.mapUserCardToCreditCard(uc));

      // 獲取候選信用卡
      let candidateCards: CreditCard[];
      if (candidateCardIds && candidateCardIds.length > 0) {
        candidateCards = await this.getCardsByIds(candidateCardIds);
      } else {
        // 獲取所有活躍的信用卡作為候選
        candidateCards = await creditCardRepository.findActiveCards();
      }

      // 呼叫 RecEngine Reward Estimator
      const request: RewardEstimatorRequest = {
        userSpending: spendingPattern,
        currentCards,
        candidateCards
      };

      const response = await this.recEngineClient.estimateRewards(request);

      // 計算當前獎勵
      const currentAnnualRewards = await this.calculateCurrentRewards(userId, spendingPattern);

      // 生成推薦
      const recommendations = this.generateRecommendations(response.reward_deltas);

      return {
        currentAnnualRewards,
        potentialAnnualRewards: currentAnnualRewards + response.total_potential_gain,
        totalGainPotential: response.total_potential_gain,
        bestRewardCards: response.reward_deltas,
        categoryAnalysis: response.category_breakdown,
        recommendations
      };

    } catch (error) {
      console.error('Error in RewardEstimatorService.estimateUserRewards:', error);
      
      if (error instanceof RecEngineException) {
        throw error;
      }
      
      throw new RecEngineException(
        'REWARD_ESTIMATION_ERROR',
        `Failed to estimate rewards: ${error.message}`,
        { userId, candidateCardIds, originalError: error }
      );
    }
  }

  /**
   * 比較特定信用卡的獎勵潛力
   */
  async compareCardRewards(
    userId: string,
    cardIds: string[]
  ): Promise<CardRewardCalculation[]> {
    try {
      const spendingPattern = await this.getUserSpendingPattern(userId);
      const cards = await this.getCardsByIds(cardIds);
      
      const calculations: CardRewardCalculation[] = [];

      for (const card of cards) {
        const calculation = await this.calculateCardRewards(card, spendingPattern);
        calculations.push(calculation);
      }

      // 按淨收益排序
      calculations.sort((a, b) => b.netBenefit - a.netBenefit);

      return calculations;

    } catch (error) {
      console.error('Error in RewardEstimatorService.compareCardRewards:', error);
      throw new RecEngineException(
        'CARD_COMPARISON_ERROR',
        `Failed to compare card rewards: ${error.message}`,
        { userId, cardIds, originalError: error }
      );
    }
  }

  /**
   * 估算特定類別的獎勵優化
   */
  async estimateCategoryOptimization(
    userId: string,
    targetCategory: string
  ): Promise<{
    currentCategoryReward: number;
    bestCards: Array<{
      cardId: string;
      cardName: string;
      rewardRate: number;
      estimatedAnnualReward: number;
      improvement: number;
    }>;
    recommendations: string[];
  }> {
    try {
      const spendingPattern = await this.getUserSpendingPattern(userId);
      const categorySpending = spendingPattern.categorySpending[targetCategory] || 0;

      if (categorySpending === 0) {
        return {
          currentCategoryReward: 0,
          bestCards: [],
          recommendations: [`您在 ${targetCategory} 類別沒有消費記錄`]
        };
      }

      // 獲取該類別最佳的信用卡
      const bestCards = await creditCardRepository.findBestCardsForCategory(targetCategory, 5);
      
      // 計算每張卡的潛在獎勵
      const cardAnalysis = bestCards.map(card => {
        const rewardRate = this.getRewardRateForCategory(card, targetCategory);
        const estimatedAnnualReward = categorySpending * 12 * (rewardRate / 100);
        
        return {
          cardId: card.id,
          cardName: card.name,
          rewardRate,
          estimatedAnnualReward,
          improvement: estimatedAnnualReward
        };
      }).sort((a, b) => b.estimatedAnnualReward - a.estimatedAnnualReward);

      // 獲取當前最佳獎勵
      const userCards = await userCardRepository.findUserCardsWithDetails(userId);
      const currentBestReward = Math.max(...userCards.map(uc => {
        const card = this.mapUserCardToCreditCard(uc);
        const rate = this.getRewardRateForCategory(card, targetCategory);
        return categorySpending * 12 * (rate / 100);
      }));

      // 計算改進
      cardAnalysis.forEach(analysis => {
        analysis.improvement = analysis.estimatedAnnualReward - currentBestReward;
      });

      const recommendations = this.generateCategoryRecommendations(
        targetCategory,
        cardAnalysis,
        categorySpending * 12
      );

      return {
        currentCategoryReward: currentBestReward,
        bestCards: cardAnalysis,
        recommendations
      };

    } catch (error) {
      console.error('Error in category optimization:', error);
      throw new RecEngineException(
        'CATEGORY_OPTIMIZATION_ERROR',
        `Failed to optimize category ${targetCategory}: ${error.message}`,
        { userId, targetCategory, originalError: error }
      );
    }
  }

  /**
   * 獲取用戶消費模式
   */
  private async getUserSpendingPattern(userId: string): Promise<SpendingPattern> {
    // 獲取最近12個月的交易
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);

    const transactions = await transactionRepository.findByUserAndDateRange(
      userId,
      startDate,
      endDate
    );

    // 計算月平均消費
    const totalSpending = transactions.reduce((sum, t) => sum + t.amount, 0);
    const monthlySpending: Record<string, number> = {};

    // 按類別分組
    transactions.forEach(t => {
      const category = t.category || 'other';
      monthlySpending[category] = (monthlySpending[category] || 0) + t.amount;
    });

    // 轉換為月平均
    Object.keys(monthlySpending).forEach(category => {
      monthlySpending[category] = monthlySpending[category] / 12;
    });

    // 建立歷史資料
    const historicalData = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);

      const monthTransactions = transactions.filter(t => 
        t.date >= monthStart && t.date <= monthEnd
      );

      const monthCategorySpending: Record<string, number> = {};
      monthTransactions.forEach(t => {
        const category = t.category || 'other';
        monthCategorySpending[category] = (monthCategorySpending[category] || 0) + t.amount;
      });

      historicalData.push({
        month: monthStart.toISOString().slice(0, 7), // YYYY-MM format
        categorySpending: monthCategorySpending
      });
    }

    return {
      monthlySpending,
      totalMonthlySpending: totalSpending / 12,
      historicalData
    };
  }

  /**
   * 計算當前獎勵
   */
  private async calculateCurrentRewards(
    userId: string,
    spendingPattern: SpendingPattern
  ): Promise<number> {
    const userCards = await userCardRepository.findUserCardsWithDetails(userId);
    let totalRewards = 0;

    for (const [category, monthlySpending] of Object.entries(spendingPattern.monthlySpending)) {
      // 找到該類別最佳的用戶卡片
      let bestRate = 0;
      
      for (const userCard of userCards) {
        const card = this.mapUserCardToCreditCard(userCard);
        const rate = this.getRewardRateForCategory(card, category);
        bestRate = Math.max(bestRate, rate);
      }

      totalRewards += monthlySpending * 12 * (bestRate / 100);
    }

    return totalRewards;
  }

  /**
   * 計算特定信用卡的獎勵
   */
  private async calculateCardRewards(
    card: CreditCard,
    spendingPattern: SpendingPattern
  ): Promise<CardRewardCalculation> {
    const categoryBreakdown: Record<string, { spending: number; rate: number; reward: number }> = {};
    let totalReward = 0;

    for (const [category, monthlySpending] of Object.entries(spendingPattern.monthlySpending)) {
      const annualSpending = monthlySpending * 12;
      const rate = this.getRewardRateForCategory(card, category);
      const reward = annualSpending * (rate / 100);

      categoryBreakdown[category] = {
        spending: annualSpending,
        rate,
        reward
      };

      totalReward += reward;
    }

    const netBenefit = totalReward - card.annualFee;

    return {
      cardId: card.id,
      cardName: card.name,
      annualReward: totalReward,
      categoryBreakdown,
      annualFee: card.annualFee,
      netBenefit
    };
  }

  /**
   * 生成推薦
   */
  private generateRecommendations(rewardDeltas: RewardEstimate[]): Array<{
    cardId: string;
    cardName: string;
    estimatedGain: number;
    reasoning: string;
    confidence: number;
  }> {
    return rewardDeltas
      .filter(delta => delta.rewardDelta > 0)
      .slice(0, 3) // 只取前3個
      .map(delta => ({
        cardId: delta.cardId,
        cardName: delta.cardName,
        estimatedGain: delta.rewardDelta,
        reasoning: this.generateReasoningText(delta),
        confidence: this.calculateConfidence(delta)
      }));
  }

  /**
   * 生成類別推薦
   */
  private generateCategoryRecommendations(
    category: string,
    cardAnalysis: any[],
    annualSpending: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (cardAnalysis.length === 0) {
      recommendations.push(`目前沒有針對 ${category} 類別的特殊獎勵信用卡`);
      return recommendations;
    }

    const bestCard = cardAnalysis[0];
    if (bestCard.improvement > 100) {
      recommendations.push(
        `推薦申請 ${bestCard.cardName}，可在 ${category} 類別獲得 ${bestCard.rewardRate}% 獎勵率`
      );
    }

    if (annualSpending > 10000) {
      recommendations.push(
        `您在 ${category} 類別年消費 $${annualSpending.toFixed(0)}，建議考慮高獎勵率的專門卡片`
      );
    }

    return recommendations;
  }

  /**
   * 生成推理文字
   */
  private generateReasoningText(delta: RewardEstimate): string {
    const categories = Object.keys(delta.categoryBreakdown);
    const topCategory = categories.reduce((a, b) => 
      delta.categoryBreakdown[a] > delta.categoryBreakdown[b] ? a : b
    );

    return `${delta.cardName} 在 ${topCategory} 類別提供更高獎勵率，年度可增加 $${delta.rewardDelta.toFixed(0)} 獎勵`;
  }

  /**
   * 計算信心度
   */
  private calculateConfidence(delta: RewardEstimate): number {
    // 基於獎勵差額和類別覆蓋率計算信心度
    const rewardRatio = delta.rewardDelta / delta.estimatedAnnualReward;
    const categoryCount = Object.keys(delta.categoryBreakdown).length;
    
    return Math.min(0.9, 0.5 + rewardRatio * 0.3 + categoryCount * 0.05);
  }

  /**
   * 獲取特定類別的獎勵率
   */
  private getRewardRateForCategory(card: CreditCard, category: string): number {
    if (!card.rewardStructure) return 0;

    for (const reward of card.rewardStructure) {
      if (reward.category === category) {
        return reward.rewardRate;
      }
    }

    // 如果沒有特定類別，找 'other' 或預設
    for (const reward of card.rewardStructure) {
      if (reward.category === 'other') {
        return reward.rewardRate;
      }
    }

    return 0;
  }

  /**
   * 映射 UserCard 到 CreditCard
   */
  private mapUserCardToCreditCard(userCard: any): CreditCard {
    return {
      id: userCard.creditCardId,
      name: userCard.cardName,
      issuer: userCard.issuer,
      cardType: userCard.cardType,
      annualFee: userCard.annualFee,
      rewardStructure: userCard.rewardStructure,
      benefits: userCard.benefits,
      requirements: {},
      description: '',
      isActive: true,
      imageUrl: userCard.imageUrl,
      applyUrl: userCard.applyUrl,
      createdAt: new Date(),
      updatedAt: new Date()
    };
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
}

export const rewardEstimatorService = new RewardEstimatorService();