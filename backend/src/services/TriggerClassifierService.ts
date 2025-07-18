import { RecEngineClientFactory, defaultRecEngineConfig } from './RecEngineClient';
import {
  TriggerClassifierRequest,
  TriggerClassifierResponse,
  UserProfile,
  RecEngineException
} from '../models/RecEngine';
import { Transaction } from '../models/Transaction';
import { CreditCard } from '../models/CreditCard';
import { User } from '../models/User';
import { userRepository } from '../repositories/UserRepository';
import { userCardRepository } from '../repositories/UserCardRepository';
import { transactionRepository } from '../repositories/TransactionRepository';

export interface TriggerAnalysisResult {
  shouldRecommend: boolean;
  recommendedCard?: CreditCard;
  potentialExtraReward: number;
  confidence: number;
  reasoning: string;
  metadata: {
    transactionCategory: string;
    currentBestCard?: string;
    analysisTimestamp: Date;
  };
}

export class TriggerClassifierService {
  private recEngineClient = RecEngineClientFactory.getInstance(defaultRecEngineConfig);

  /**
   * 分析交易並判斷是否應該觸發推薦
   */
  async analyzeTransaction(
    transactionId: string,
    userId: string
  ): Promise<TriggerAnalysisResult> {
    try {
      // 獲取交易資料
      const transaction = await transactionRepository.findById(transactionId);
      if (!transaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      // 獲取用戶資料
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // 獲取用戶當前信用卡
      const userCards = await userCardRepository.findUserCardsWithDetails(userId);
      const currentCards = userCards.map(uc => this.mapUserCardToCreditCard(uc));

      // 建立用戶檔案
      const userProfile = await this.buildUserProfile(userId);

      // 呼叫 RecEngine Trigger Classifier
      const request: TriggerClassifierRequest = {
        transaction,
        userProfile,
        currentCards
      };

      const response = await this.recEngineClient.triggerClassifier(request);

      // 獲取推薦的信用卡詳細資訊
      let recommendedCard: CreditCard | undefined;
      if (response.recommend_flag && response.suggested_card_id) {
        // 這裡需要從信用卡資料庫獲取推薦的卡片
        // 暫時用 placeholder
        recommendedCard = await this.getCardById(response.suggested_card_id);
      }

      return {
        shouldRecommend: response.recommend_flag,
        recommendedCard,
        potentialExtraReward: response.extra_reward,
        confidence: response.confidence_score,
        reasoning: response.reasoning,
        metadata: {
          transactionCategory: transaction.category || 'other',
          currentBestCard: this.findBestCurrentCard(transaction, currentCards)?.name,
          analysisTimestamp: new Date()
        }
      };

    } catch (error) {
      console.error('Error in TriggerClassifierService.analyzeTransaction:', error);
      
      if (error instanceof RecEngineException) {
        throw error;
      }
      
      throw new RecEngineException(
        'TRIGGER_ANALYSIS_ERROR',
        `Failed to analyze transaction: ${error.message}`,
        { transactionId, userId, originalError: error }
      );
    }
  }

  /**
   * 批次分析多個交易
   */
  async analyzeTransactionBatch(
    transactionIds: string[],
    userId: string
  ): Promise<TriggerAnalysisResult[]> {
    const results: TriggerAnalysisResult[] = [];
    
    for (const transactionId of transactionIds) {
      try {
        const result = await this.analyzeTransaction(transactionId, userId);
        results.push(result);
      } catch (error) {
        console.error(`Error analyzing transaction ${transactionId}:`, error);
        // 添加失敗的結果
        results.push({
          shouldRecommend: false,
          potentialExtraReward: 0,
          confidence: 0,
          reasoning: `Analysis failed: ${error.message}`,
          metadata: {
            transactionCategory: 'unknown',
            analysisTimestamp: new Date()
          }
        });
      }
    }
    
    return results;
  }

  /**
   * 即時交易分析（用於新交易觸發）
   */
  async analyzeRealtimeTransaction(
    transaction: Partial<Transaction>,
    userId: string
  ): Promise<TriggerAnalysisResult> {
    try {
      // 驗證交易資料
      if (!transaction.amount || !transaction.category) {
        throw new Error('Transaction amount and category are required');
      }

      // 建立完整的交易物件
      const fullTransaction: Transaction = {
        id: 'temp-' + Date.now(),
        userId,
        accountId: transaction.accountId || 'unknown',
        amount: transaction.amount,
        category: transaction.category,
        subcategory: transaction.subcategory,
        merchant: transaction.merchant,
        description: transaction.description || '',
        date: transaction.date || new Date(),
        cardUsed: transaction.cardUsed,
        location: transaction.location,
        isRecurring: transaction.isRecurring || false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 獲取用戶資料和當前卡片
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      const userCards = await userCardRepository.findUserCardsWithDetails(userId);
      const currentCards = userCards.map(uc => this.mapUserCardToCreditCard(uc));

      const userProfile = await this.buildUserProfile(userId);

      // 呼叫 RecEngine
      const request: TriggerClassifierRequest = {
        transaction: fullTransaction,
        userProfile,
        currentCards
      };

      const response = await this.recEngineClient.triggerClassifier(request);

      let recommendedCard: CreditCard | undefined;
      if (response.recommend_flag && response.suggested_card_id) {
        recommendedCard = await this.getCardById(response.suggested_card_id);
      }

      return {
        shouldRecommend: response.recommend_flag,
        recommendedCard,
        potentialExtraReward: response.extra_reward,
        confidence: response.confidence_score,
        reasoning: response.reasoning,
        metadata: {
          transactionCategory: fullTransaction.category,
          currentBestCard: this.findBestCurrentCard(fullTransaction, currentCards)?.name,
          analysisTimestamp: new Date()
        }
      };

    } catch (error) {
      console.error('Error in realtime transaction analysis:', error);
      throw new RecEngineException(
        'REALTIME_ANALYSIS_ERROR',
        `Failed to analyze realtime transaction: ${error.message}`,
        { transaction, userId, originalError: error }
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

    // 獲取用戶消費模式
    const spendingPatterns = await this.calculateSpendingPatterns(userId);

    return {
      id: userId,
      demographics: {
        age: user.age,
        income: user.income,
        creditScore: user.creditScore,
        location: user.location
      },
      spendingPatterns,
      preferences: {
        preferredCardTypes: user.preferredCardTypes || [],
        maxAnnualFee: user.maxAnnualFee || 500,
        prioritizedCategories: user.prioritizedCategories || [],
        riskTolerance: user.riskTolerance || 'medium'
      }
    };
  }

  /**
   * 計算用戶消費模式
   */
  private async calculateSpendingPatterns(userId: string) {
    // 獲取最近3個月的交易
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);

    const transactions = await transactionRepository.findByUserAndDateRange(
      userId,
      startDate,
      endDate
    );

    const totalMonthlySpending = transactions.reduce((sum, t) => sum + t.amount, 0) / 3;
    
    // 按類別分組
    const categorySpending: Record<string, number> = {};
    transactions.forEach(t => {
      const category = t.category || 'other';
      categorySpending[category] = (categorySpending[category] || 0) + t.amount;
    });

    // 月平均
    Object.keys(categorySpending).forEach(category => {
      categorySpending[category] = categorySpending[category] / 3;
    });

    return {
      totalMonthlySpending,
      categorySpending,
      transactionFrequency: transactions.length / 3,
      averageTransactionAmount: totalMonthlySpending / (transactions.length || 1)
    };
  }

  /**
   * 找到當前最佳信用卡
   */
  private findBestCurrentCard(transaction: Transaction, currentCards: CreditCard[]): CreditCard | undefined {
    if (!currentCards.length) return undefined;

    // 簡單邏輯：找到對該類別獎勵最高的卡
    const category = transaction.category || 'other';
    
    let bestCard = currentCards[0];
    let bestReward = 0;

    for (const card of currentCards) {
      const reward = this.getRewardRateForCategory(card, category);
      if (reward > bestReward) {
        bestReward = reward;
        bestCard = card;
      }
    }

    return bestCard;
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
   * 映射 UserCard 到 CreditCard（簡化版）
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
   * 根據 ID 獲取信用卡（需要實現）
   */
  private async getCardById(cardId: string): Promise<CreditCard | undefined> {
    // 這裡應該呼叫 CreditCardRepository
    // 暫時返回 undefined
    return undefined;
  }
}

export const triggerClassifierService = new TriggerClassifierService();