import { RecEngineClientFactory, defaultRecEngineConfig } from './RecEngineClient';
import {
  PortfolioOptimizerRequest,
  PortfolioOptimizerResponse,
  UserProfile,
  UserPreferences,
  ActionType,
  OptimizationRecommendation,
  RecEngineException
} from '../models/RecEngine';
import { CreditCard } from '../models/CreditCard';
import { userCardRepository } from '../repositories/UserCardRepository';
import { creditCardRepository } from '../repositories/CreditCardRepository';
import { userRepository } from '../repositories/UserRepository';

export interface PortfolioAnalysis {
  currentScore: number;
  optimizedScore: number;
  improvementPotential: number;
  recommendations: DetailedRecommendation[];
  portfolioMetrics: PortfolioMetrics;
  actionPlan: ActionPlan;
}

export interface DetailedRecommendation extends OptimizationRecommendation {
  currentCard?: CreditCard;
  suggestedCard: CreditCard;
  impact: {
    rewardIncrease: number;
    feeChange: number;
    netBenefit: number;
  };
  timeline: string;
  priority: 'high' | 'medium' | 'low';
}

export interface PortfolioMetrics {
  totalCards: number;
  totalAnnualFees: number;
  totalCreditLimit: number;
  utilizationRate: number;
  diversificationScore: number;
  rewardEfficiency: number;
  yearlyRewardPotential: number;
}

export interface ActionPlan {
  immediateActions: string[];
  shortTermActions: string[];
  longTermActions: string[];
  costBenefitAnalysis: {
    totalImplementationCost: number;
    annualBenefit: number;
    paybackPeriod: number;
  };
}

export class PortfolioOptimizerService {
  private recEngineClient = RecEngineClientFactory.getInstance(defaultRecEngineConfig);

  /**
   * 分析並優化用戶信用卡組合
   */
  async optimizeUserPortfolio(userId: string): Promise<PortfolioAnalysis> {
    try {
      // 獲取用戶資料和偏好
      const userProfile = await this.buildUserProfile(userId);
      const userPreferences = await this.getUserPreferences(userId);
      
      // 獲取當前組合
      const userCards = await userCardRepository.findUserCardsWithDetails(userId);
      const currentPortfolio = userCards.map(uc => this.mapUserCardToCreditCard(uc));

      // 呼叫 RecEngine Portfolio Optimizer
      const request: PortfolioOptimizerRequest = {
        userProfile,
        currentPortfolio,
        preferences: userPreferences
      };

      const response = await this.recEngineClient.optimizePortfolio(request);

      // 分析當前組合指標
      const currentMetrics = await this.calculatePortfolioMetrics(userId, currentPortfolio);

      // 生成詳細推薦
      const detailedRecommendations = await this.generateDetailedRecommendations(
        response.recommendations,
        currentPortfolio
      );

      // 建立行動計劃
      const actionPlan = this.createActionPlan(detailedRecommendations);

      return {
        currentScore: response.portfolio_score,
        optimizedScore: response.portfolio_score + response.improvement_score,
        improvementPotential: response.improvement_score,
        recommendations: detailedRecommendations,
        portfolioMetrics: currentMetrics,
        actionPlan
      };

    } catch (error) {
      console.error('Error in PortfolioOptimizerService.optimizeUserPortfolio:', error);
      
      if (error instanceof RecEngineException) {
        throw error;
      }
      
      throw new RecEngineException(
        'PORTFOLIO_OPTIMIZATION_ERROR',
        `Failed to optimize portfolio: ${error.message}`,
        { userId, originalError: error }
      );
    }
  }

  /**
   * 分析特定行動的影響
   */
  async analyzeActionImpact(
    userId: string,
    action: ActionType,
    cardId: string,
    replaceCardId?: string
  ): Promise<{
    rewardImpact: number;
    feeImpact: number;
    creditImpact: number;
    portfolioScoreChange: number;
    risks: string[];
    benefits: string[];
  }> {
    try {
      const userCards = await userCardRepository.findUserCardsWithDetails(userId);
      const currentPortfolio = userCards.map(uc => this.mapUserCardToCreditCard(uc));
      
      const targetCard = await creditCardRepository.findById(cardId);
      if (!targetCard) {
        throw new Error(`Card ${cardId} not found`);
      }

      let replaceCard: CreditCard | undefined;
      if (replaceCardId) {
        replaceCard = currentPortfolio.find(c => c.id === replaceCardId);
        if (!replaceCard) {
          throw new Error(`Replace card ${replaceCardId} not found in portfolio`);
        }
      }

      // 計算影響
      const rewardImpact = await this.calculateRewardImpact(userId, action, targetCard, replaceCard);
      const feeImpact = this.calculateFeeImpact(action, targetCard, replaceCard);
      const creditImpact = this.calculateCreditImpact(action, targetCard, replaceCard);

      // 分析風險和益處
      const risks = this.analyzeRisks(action, targetCard, replaceCard, currentPortfolio);
      const benefits = this.analyzeBenefits(action, targetCard, replaceCard);

      return {
        rewardImpact,
        feeImpact,
        creditImpact,
        portfolioScoreChange: rewardImpact - feeImpact,
        risks,
        benefits
      };

    } catch (error) {
      console.error('Error analyzing action impact:', error);
      throw new RecEngineException(
        'ACTION_ANALYSIS_ERROR',
        `Failed to analyze action impact: ${error.message}`,
        { userId, action, cardId, replaceCardId, originalError: error }
      );
    }
  }

  /**
   * 獲取組合優化建議
   */
  async getOptimizationSuggestions(
    userId: string,
    focusArea: 'rewards' | 'fees' | 'benefits' | 'balance'
  ): Promise<{
    primarySuggestion: string;
    actionItems: string[];
    expectedImpact: string;
    timeframe: string;
  }> {
    try {
      const analysis = await this.optimizeUserPortfolio(userId);
      
      let primarySuggestion: string;
      let actionItems: string[];
      let expectedImpact: string;
      let timeframe: string;

      switch (focusArea) {
        case 'rewards':
          primarySuggestion = this.generateRewardFocusedSuggestion(analysis);
          actionItems = this.extractRewardActions(analysis.recommendations);
          expectedImpact = `年度獎勵增加 $${analysis.improvementPotential.toFixed(0)}`;
          timeframe = '3-6個月';
          break;

        case 'fees':
          primarySuggestion = this.generateFeeFocusedSuggestion(analysis);
          actionItems = this.extractFeeActions(analysis.recommendations);
          expectedImpact = `年度費用節省 $${this.calculateFeeSavings(analysis.recommendations).toFixed(0)}`;
          timeframe = '1-3個月';
          break;

        case 'benefits':
          primarySuggestion = this.generateBenefitFocusedSuggestion(analysis);
          actionItems = this.extractBenefitActions(analysis.recommendations);
          expectedImpact = '擴大保障和福利覆蓋範圍';
          timeframe = '2-4個月';
          break;

        case 'balance':
        default:
          primarySuggestion = this.generateBalancedSuggestion(analysis);
          actionItems = this.extractBalancedActions(analysis.recommendations);
          expectedImpact = `組合分數提升 ${analysis.improvementPotential.toFixed(1)} 分`;
          timeframe = '3-6個月';
          break;
      }

      return {
        primarySuggestion,
        actionItems,
        expectedImpact,
        timeframe
      };

    } catch (error) {
      console.error('Error getting optimization suggestions:', error);
      throw new RecEngineException(
        'OPTIMIZATION_SUGGESTIONS_ERROR',
        `Failed to get optimization suggestions: ${error.message}`,
        { userId, focusArea, originalError: error }
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

    // 計算消費模式
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
   * 獲取用戶偏好
   */
  private async getUserPreferences(userId: string): Promise<UserPreferences> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    return {
      maxCards: user.maxCards || 5,
      maxTotalAnnualFees: user.maxTotalAnnualFees || 1000,
      prioritizedRewards: user.prioritizedCategories || ['dining', 'travel'],
      balanceTransferNeeds: user.hasDebt || false,
      travelFrequency: user.travelFrequency || 'occasional'
    };
  }

  /**
   * 計算組合指標
   */
  private async calculatePortfolioMetrics(
    userId: string,
    portfolio: CreditCard[]
  ): Promise<PortfolioMetrics> {
    const userCards = await userCardRepository.findUserCardsWithDetails(userId);
    
    const totalCards = portfolio.length;
    const totalAnnualFees = portfolio.reduce((sum, card) => sum + card.annualFee, 0);
    const totalCreditLimit = userCards.reduce((sum, uc) => sum + (uc.creditLimit || 0), 0);
    const totalBalance = userCards.reduce((sum, uc) => sum + (uc.currentBalance || 0), 0);
    const utilizationRate = totalCreditLimit > 0 ? (totalBalance / totalCreditLimit) * 100 : 0;

    // 計算多樣化分數
    const cardTypes = new Set(portfolio.map(card => card.cardType));
    const diversificationScore = Math.min(cardTypes.size / 3, 1) * 100;

    // 計算獎勵效率
    const spendingPatterns = await this.calculateSpendingPatterns(userId);
    const yearlyRewardPotential = this.calculateYearlyRewards(portfolio, spendingPatterns);
    const rewardEfficiency = totalAnnualFees > 0 ? yearlyRewardPotential / totalAnnualFees : yearlyRewardPotential;

    return {
      totalCards,
      totalAnnualFees,
      totalCreditLimit,
      utilizationRate,
      diversificationScore,
      rewardEfficiency,
      yearlyRewardPotential
    };
  }

  /**
   * 生成詳細推薦
   */
  private async generateDetailedRecommendations(
    recommendations: OptimizationRecommendation[],
    currentPortfolio: CreditCard[]
  ): Promise<DetailedRecommendation[]> {
    const detailed: DetailedRecommendation[] = [];

    for (const rec of recommendations) {
      const suggestedCard = await creditCardRepository.findById(rec.cardId);
      if (!suggestedCard) continue;

      let currentCard: CreditCard | undefined;
      if (rec.replaceCardId) {
        currentCard = currentPortfolio.find(c => c.id === rec.replaceCardId);
      }

      const impact = await this.calculateRecommendationImpact(rec, suggestedCard, currentCard);
      const priority = this.determinePriority(rec, impact);
      const timeline = this.determineTimeline(rec.action);

      detailed.push({
        ...rec,
        currentCard,
        suggestedCard,
        impact,
        timeline,
        priority
      });
    }

    return detailed.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 建立行動計劃
   */
  private createActionPlan(recommendations: DetailedRecommendation[]): ActionPlan {
    const immediateActions: string[] = [];
    const shortTermActions: string[] = [];
    const longTermActions: string[] = [];

    let totalCost = 0;
    let totalBenefit = 0;

    for (const rec of recommendations) {
      totalCost += rec.impact.feeChange > 0 ? rec.impact.feeChange : 0;
      totalBenefit += rec.impact.netBenefit;

      const action = `${this.getActionText(rec.action)} ${rec.suggestedCard.name}`;

      if (rec.priority === 'high' && rec.action === ActionType.CANCEL_CARD) {
        immediateActions.push(action);
      } else if (rec.priority === 'high') {
        shortTermActions.push(action);
      } else {
        longTermActions.push(action);
      }
    }

    const paybackPeriod = totalCost > 0 ? totalCost / (totalBenefit / 12) : 0;

    return {
      immediateActions,
      shortTermActions,
      longTermActions,
      costBenefitAnalysis: {
        totalImplementationCost: totalCost,
        annualBenefit: totalBenefit,
        paybackPeriod
      }
    };
  }

  // Helper methods
  private async calculateSpendingPatterns(userId: string) {
    // 實作消費模式計算邏輯
    return {
      totalMonthlySpending: 3000,
      categorySpending: {
        dining: 800,
        groceries: 600,
        travel: 400,
        gas: 300,
        other: 900
      },
      transactionFrequency: 45,
      averageTransactionAmount: 67
    };
  }

  private calculateYearlyRewards(portfolio: CreditCard[], spendingPatterns: any): number {
    // 實作年度獎勵計算邏輯
    return 2400;
  }

  private async calculateRewardImpact(userId: string, action: ActionType, targetCard: CreditCard, replaceCard?: CreditCard): Promise<number> {
    // 實作獎勵影響計算邏輯
    return 300;
  }

  private calculateFeeImpact(action: ActionType, targetCard: CreditCard, replaceCard?: CreditCard): number {
    switch (action) {
      case ActionType.ADD_NEW:
        return targetCard.annualFee;
      case ActionType.REPLACE_EXISTING:
        return targetCard.annualFee - (replaceCard?.annualFee || 0);
      case ActionType.CANCEL_CARD:
        return -(replaceCard?.annualFee || 0);
      default:
        return 0;
    }
  }

  private calculateCreditImpact(action: ActionType, targetCard: CreditCard, replaceCard?: CreditCard): number {
    // 簡化的信用額度影響計算
    return 0;
  }

  private analyzeRisks(action: ActionType, targetCard: CreditCard, replaceCard?: CreditCard, portfolio: CreditCard[]): string[] {
    const risks: string[] = [];
    
    if (action === ActionType.ADD_NEW && portfolio.length >= 5) {
      risks.push('管理多張信用卡可能增加複雜度');
    }
    
    if (targetCard.annualFee > 300) {
      risks.push('年費較高，需確保獎勵收益能覆蓋成本');
    }

    return risks;
  }

  private analyzeBenefits(action: ActionType, targetCard: CreditCard, replaceCard?: CreditCard): string[] {
    const benefits: string[] = [];
    
    if (targetCard.rewardStructure && targetCard.rewardStructure.length > 0) {
      benefits.push('提供更好的獎勵結構');
    }
    
    if (targetCard.benefits && targetCard.benefits.length > 0) {
      benefits.push('增加額外福利和保障');
    }

    return benefits;
  }

  private async calculateRecommendationImpact(rec: OptimizationRecommendation, suggestedCard: CreditCard, currentCard?: CreditCard) {
    return {
      rewardIncrease: rec.expectedBenefit,
      feeChange: suggestedCard.annualFee - (currentCard?.annualFee || 0),
      netBenefit: rec.expectedBenefit - (suggestedCard.annualFee - (currentCard?.annualFee || 0))
    };
  }

  private determinePriority(rec: OptimizationRecommendation, impact: any): 'high' | 'medium' | 'low' {
    if (impact.netBenefit > 500 || rec.confidence > 0.8) return 'high';
    if (impact.netBenefit > 200 || rec.confidence > 0.6) return 'medium';
    return 'low';
  }

  private determineTimeline(action: ActionType): string {
    switch (action) {
      case ActionType.CANCEL_CARD:
        return '立即執行';
      case ActionType.ADD_NEW:
        return '1-2個月';
      case ActionType.REPLACE_EXISTING:
        return '2-3個月';
      default:
        return '1個月內';
    }
  }

  private getActionText(action: ActionType): string {
    switch (action) {
      case ActionType.ADD_NEW:
        return '申請';
      case ActionType.REPLACE_EXISTING:
        return '更換為';
      case ActionType.CANCEL_CARD:
        return '取消';
      case ActionType.UPGRADE_CURRENT:
        return '升級至';
      case ActionType.DOWNGRADE_CURRENT:
        return '降級至';
      default:
        return '處理';
    }
  }

  // 建議生成方法
  private generateRewardFocusedSuggestion(analysis: PortfolioAnalysis): string {
    return `優化您的獎勵結構，重點關注高消費類別的獎勵率提升`;
  }

  private generateFeeFocusedSuggestion(analysis: PortfolioAnalysis): string {
    return `檢視年費結構，取消低效益信用卡並優化費用配置`;
  }

  private generateBenefitFocusedSuggestion(analysis: PortfolioAnalysis): string {
    return `擴大保障和福利覆蓋，增加旅遊、購物等附加價值`;
  }

  private generateBalancedSuggestion(analysis: PortfolioAnalysis): string {
    return `平衡獎勵、費用和福利，建立最優化的信用卡組合`;
  }

  private extractRewardActions(recommendations: DetailedRecommendation[]): string[] {
    return recommendations
      .filter(r => r.impact.rewardIncrease > 100)
      .map(r => `申請 ${r.suggestedCard.name} 以提升獎勵收益`)
      .slice(0, 3);
  }

  private extractFeeActions(recommendations: DetailedRecommendation[]): string[] {
    return recommendations
      .filter(r => r.impact.feeChange < 0 || r.action === ActionType.CANCEL_CARD)
      .map(r => `${this.getActionText(r.action)} ${r.suggestedCard.name} 以節省年費`)
      .slice(0, 3);
  }

  private extractBenefitActions(recommendations: DetailedRecommendation[]): string[] {
    return recommendations
      .filter(r => r.suggestedCard.benefits && r.suggestedCard.benefits.length > 0)
      .map(r => `申請 ${r.suggestedCard.name} 以獲得更多福利`)
      .slice(0, 3);
  }

  private extractBalancedActions(recommendations: DetailedRecommendation[]): string[] {
    return recommendations
      .slice(0, 3)
      .map(r => `${this.getActionText(r.action)} ${r.suggestedCard.name}`);
  }

  private calculateFeeSavings(recommendations: DetailedRecommendation[]): number {
    return recommendations
      .filter(r => r.impact.feeChange < 0)
      .reduce((sum, r) => sum + Math.abs(r.impact.feeChange), 0);
  }

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
}

export const portfolioOptimizerService = new PortfolioOptimizerService();