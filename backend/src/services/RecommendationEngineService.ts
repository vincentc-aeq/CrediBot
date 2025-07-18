import { triggerClassifierService, TriggerAnalysisResult } from './TriggerClassifierService';
import { rewardEstimatorService, RewardComparisonResult } from './RewardEstimatorService';
import { portfolioOptimizerService, PortfolioAnalysis } from './PortfolioOptimizerService';
import { personalizedRankerService, HomepageRecommendations } from './PersonalizedRankerService';
import { recEngineManager } from './RecEngineManager';
import { auditService } from './AuditService';
import { CreditCard } from '../models/CreditCard';
import { Transaction } from '../models/Transaction';
import { RecEngineException } from '../models/RecEngine';

// 推薦類型枚舉
export enum RecommendationType {
  HOMEPAGE = 'homepage',
  TRANSACTION_TRIGGERED = 'transaction_triggered',
  PORTFOLIO_OPTIMIZATION = 'portfolio_optimization',
  CATEGORY_SPECIFIC = 'category_specific',
  SEASONAL = 'seasonal',
  LIFECYCLE = 'lifecycle'
}

// 推薦結果介面
export interface RecommendationResult {
  id: string;
  type: RecommendationType;
  userId: string;
  recommendations: RecommendationItem[];
  metadata: RecommendationMetadata;
  createdAt: Date;
  expiresAt: Date;
}

export interface RecommendationItem {
  cardId: string;
  cardName: string;
  score: number;
  reasoning: string;
  estimatedBenefit: number;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  ctaText: string;
  messageTitle: string;
  messageDescription: string;
  tags: string[];
}

export interface RecommendationMetadata {
  algorithmVersion: string;
  personalizationScore: number;
  diversityScore: number;
  contextFactors: string[];
  filtersCriteria: string[];
  performanceMetrics: {
    responseTime: number;
    confidenceLevel: number;
    dataFreshness: number;
  };
  abTestGroup?: string;
}

// 推薦請求介面
export interface RecommendationRequest {
  userId: string;
  type: RecommendationType;
  context?: RecommendationContext;
  filters?: RecommendationFilters;
  options?: RecommendationOptions;
}

export interface RecommendationContext {
  transactionId?: string;
  category?: string;
  amount?: number;
  location?: string;
  timeOfDay?: string;
  userIntent?: string;
  sessionData?: Record<string, any>;
}

export interface RecommendationFilters {
  maxAnnualFee?: number;
  cardTypes?: string[];
  issuers?: string[];
  minCreditScore?: number;
  excludeCardIds?: string[];
  includeOnlyCardIds?: string[];
}

export interface RecommendationOptions {
  maxResults?: number;
  includeExplanations?: boolean;
  includeFallbacks?: boolean;
  enablePersonalization?: boolean;
  diversityWeight?: number;
  freshnessWeight?: number;
}

/**
 * 推薦引擎服務 - 統籌所有推薦邏輯的核心服務
 */
export class RecommendationEngineService {
  private static instance: RecommendationEngineService;
  
  private constructor() {}

  public static getInstance(): RecommendationEngineService {
    if (!RecommendationEngineService.instance) {
      RecommendationEngineService.instance = new RecommendationEngineService();
    }
    return RecommendationEngineService.instance;
  }

  /**
   * 主要推薦方法 - 根據類型路由到適當的推薦邏輯
   */
  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResult> {
    const startTime = Date.now();
    
    try {
      // 驗證請求
      this.validateRequest(request);

      // 檢查服務健康狀態
      await this.checkServiceHealth();

      // 記錄請求
      await this.logRecommendationRequest(request);

      let result: RecommendationResult;

      // 根據推薦類型路由到適當的處理方法
      switch (request.type) {
        case RecommendationType.HOMEPAGE:
          result = await this.getHomepageRecommendations(request);
          break;
        
        case RecommendationType.TRANSACTION_TRIGGERED:
          result = await this.getTransactionTriggeredRecommendations(request);
          break;
        
        case RecommendationType.PORTFOLIO_OPTIMIZATION:
          result = await this.getPortfolioOptimizationRecommendations(request);
          break;
        
        case RecommendationType.CATEGORY_SPECIFIC:
          result = await this.getCategorySpecificRecommendations(request);
          break;
        
        case RecommendationType.SEASONAL:
          result = await this.getSeasonalRecommendations(request);
          break;
        
        case RecommendationType.LIFECYCLE:
          result = await this.getLifecycleRecommendations(request);
          break;
        
        default:
          throw new RecEngineException(
            'INVALID_RECOMMENDATION_TYPE',
            `Unsupported recommendation type: ${request.type}`
          );
      }

      // 後處理：篩選、排序、多樣化
      result = await this.postProcessRecommendations(result, request);

      // 記錄成功指標
      const responseTime = Date.now() - startTime;
      await this.logRecommendationSuccess(result, responseTime);

      return result;

    } catch (error) {
      console.error('Error in RecommendationEngineService.getRecommendations:', error);
      
      // 記錄錯誤
      await this.logRecommendationError(request, error as Error);

      // 如果可能，返回降級推薦
      if (request.options?.includeFallbacks) {
        return await this.getFallbackRecommendations(request);
      }

      throw error;
    }
  }

  /**
   * 批次推薦 - 一次獲取多種類型的推薦
   */
  async getBatchRecommendations(
    requests: RecommendationRequest[]
  ): Promise<RecommendationResult[]> {
    const results: RecommendationResult[] = [];
    const errors: Array<{ request: RecommendationRequest; error: Error }> = [];

    // 並行處理多個推薦請求
    const promises = requests.map(async (request) => {
      try {
        const result = await this.getRecommendations(request);
        return { success: true, result, request };
      } catch (error) {
        return { success: false, error: error as Error, request };
      }
    });

    const outcomes = await Promise.allSettled(promises);

    for (const outcome of outcomes) {
      if (outcome.status === 'fulfilled') {
        const { success, result, error, request } = outcome.value;
        if (success && result) {
          results.push(result);
        } else if (!success && error) {
          errors.push({ request, error });
        }
      }
    }

    // 記錄批次處理統計
    await this.logBatchRecommendationStats(requests.length, results.length, errors.length);

    // 如果有部分失敗但仍有成功結果，返回成功的結果
    if (results.length > 0) {
      return results;
    }

    // 如果全部失敗，拋出錯誤
    throw new RecEngineException(
      'BATCH_RECOMMENDATION_FAILED',
      `All ${requests.length} recommendation requests failed`,
      { errors: errors.slice(0, 3) } // 只包含前3個錯誤以避免過大的錯誤對象
    );
  }

  /**
   * 即時推薦 - 基於用戶當前活動的推薦
   */
  async getRealtimeRecommendations(
    userId: string,
    context: RecommendationContext
  ): Promise<RecommendationItem[]> {
    try {
      // 決定推薦類型
      const recommendationType = this.determineRecommendationType(context);

      const request: RecommendationRequest = {
        userId,
        type: recommendationType,
        context,
        options: {
          maxResults: 3,
          includeExplanations: true,
          enablePersonalization: true
        }
      };

      const result = await this.getRecommendations(request);
      return result.recommendations.slice(0, 3);

    } catch (error) {
      console.error('Error in realtime recommendations:', error);
      
      // 返回基本推薦作為後備
      return await this.getBasicRecommendations(userId, 3);
    }
  }

  /**
   * 獲取推薦解釋
   */
  async getRecommendationExplanation(
    userId: string,
    cardId: string,
    recommendationType: RecommendationType
  ): Promise<{
    reasoning: string;
    benefits: string[];
    risks: string[];
    comparison: string;
    confidence: number;
  }> {
    try {
      // 根據推薦類型提供不同的解釋
      switch (recommendationType) {
        case RecommendationType.TRANSACTION_TRIGGERED:
          return await this.explainTransactionRecommendation(userId, cardId);
        
        case RecommendationType.PORTFOLIO_OPTIMIZATION:
          return await this.explainPortfolioRecommendation(userId, cardId);
        
        default:
          return await this.explainGeneralRecommendation(userId, cardId);
      }

    } catch (error) {
      console.error('Error getting recommendation explanation:', error);
      return {
        reasoning: '無法生成推薦解釋',
        benefits: [],
        risks: [],
        comparison: '',
        confidence: 0
      };
    }
  }

  /**
   * 更新用戶反饋 - 用於改進推薦算法
   */
  async updateUserFeedback(
    userId: string,
    recommendationId: string,
    feedback: {
      action: 'view' | 'click' | 'apply' | 'dismiss' | 'negative';
      cardId?: string;
      rating?: number;
      comment?: string;
    }
  ): Promise<void> {
    try {
      // 記錄用戶反饋到審計日誌
      await auditService.log({
        entityType: 'recommendation',
        entityId: recommendationId,
        action: 'FEEDBACK' as any,
        userId,
        metadata: {
          feedback,
          timestamp: new Date()
        },
        description: `User feedback: ${feedback.action}`
      });

      // TODO: 將反饋發送到 ML 服務以改進模型
      console.log(`Recorded feedback for recommendation ${recommendationId}:`, feedback);

    } catch (error) {
      console.error('Error updating user feedback:', error);
    }
  }

  // ===========================================
  // 私有輔助方法
  // ===========================================

  /**
   * 驗證推薦請求
   */
  private validateRequest(request: RecommendationRequest): void {
    if (!request.userId) {
      throw new RecEngineException('INVALID_REQUEST', 'User ID is required');
    }

    if (!Object.values(RecommendationType).includes(request.type)) {
      throw new RecEngineException('INVALID_REQUEST', 'Invalid recommendation type');
    }

    // 特定類型的額外驗證
    if (request.type === RecommendationType.TRANSACTION_TRIGGERED) {
      if (!request.context?.transactionId && !request.context?.amount) {
        throw new RecEngineException(
          'INVALID_REQUEST',
          'Transaction ID or amount is required for transaction-triggered recommendations'
        );
      }
    }
  }

  /**
   * 檢查服務健康狀態
   */
  private async checkServiceHealth(): Promise<void> {
    const healthStatus = await recEngineManager.getHealthStatus();
    
    if (healthStatus.status === 'unhealthy') {
      throw new RecEngineException(
        'SERVICE_UNAVAILABLE',
        'RecEngine services are currently unavailable'
      );
    }
  }

  /**
   * 決定推薦類型
   */
  private determineRecommendationType(context: RecommendationContext): RecommendationType {
    if (context.transactionId || context.amount) {
      return RecommendationType.TRANSACTION_TRIGGERED;
    }
    
    if (context.category) {
      return RecommendationType.CATEGORY_SPECIFIC;
    }
    
    if (context.userIntent === 'optimize') {
      return RecommendationType.PORTFOLIO_OPTIMIZATION;
    }
    
    return RecommendationType.HOMEPAGE;
  }

  /**
   * 獲取基本推薦（後備方案）
   */
  private async getBasicRecommendations(userId: string, maxResults: number): Promise<RecommendationItem[]> {
    // 簡單的後備推薦邏輯
    return [
      {
        cardId: 'fallback-1',
        cardName: '基本現金回饋卡',
        score: 0.5,
        reasoning: '適合日常使用的基本現金回饋',
        estimatedBenefit: 200,
        confidence: 0.3,
        priority: 'medium',
        ctaText: '了解更多',
        messageTitle: '推薦信用卡',
        messageDescription: '基於您的基本資料推薦',
        tags: ['basic', 'cashback']
      }
    ].slice(0, maxResults);
  }

  /**
   * 記錄推薦請求
   */
  private async logRecommendationRequest(request: RecommendationRequest): Promise<void> {
    await auditService.log({
      entityType: 'recommendation',
      entityId: 'request',
      action: 'REQUEST' as any,
      userId: request.userId,
      metadata: {
        type: request.type,
        context: request.context,
        filters: request.filters,
        options: request.options
      },
      description: `Recommendation request: ${request.type}`
    });
  }

  /**
   * 記錄推薦成功
   */
  private async logRecommendationSuccess(
    result: RecommendationResult,
    responseTime: number
  ): Promise<void> {
    await auditService.log({
      entityType: 'recommendation',
      entityId: result.id,
      action: 'SUCCESS' as any,
      userId: result.userId,
      metadata: {
        type: result.type,
        recommendationCount: result.recommendations.length,
        responseTime,
        metadata: result.metadata
      },
      description: `Recommendation success: ${result.type}`
    });
  }

  /**
   * 記錄推薦錯誤
   */
  private async logRecommendationError(
    request: RecommendationRequest,
    error: Error
  ): Promise<void> {
    await auditService.log({
      entityType: 'recommendation',
      entityId: 'error',
      action: 'ERROR' as any,
      userId: request.userId,
      metadata: {
        type: request.type,
        error: error.message,
        context: request.context
      },
      description: `Recommendation error: ${error.message}`
    });
  }

  /**
   * 記錄批次推薦統計
   */
  private async logBatchRecommendationStats(
    total: number,
    successful: number,
    failed: number
  ): Promise<void> {
    await auditService.log({
      entityType: 'recommendation',
      entityId: 'batch',
      action: 'BATCH_STATS' as any,
      metadata: {
        total,
        successful,
        failed,
        successRate: successful / total
      },
      description: `Batch recommendation stats: ${successful}/${total} successful`
    });
  }

  // 這些方法將在後續的特定推薦服務中實現
  private async getHomepageRecommendations(request: RecommendationRequest): Promise<RecommendationResult> {
    throw new Error('Method not implemented - will be implemented in HomepageRecommendationService');
  }

  private async getTransactionTriggeredRecommendations(request: RecommendationRequest): Promise<RecommendationResult> {
    throw new Error('Method not implemented - will be implemented in TransactionRecommendationService');
  }

  private async getPortfolioOptimizationRecommendations(request: RecommendationRequest): Promise<RecommendationResult> {
    throw new Error('Method not implemented - will be implemented in PortfolioRecommendationService');
  }

  private async getCategorySpecificRecommendations(request: RecommendationRequest): Promise<RecommendationResult> {
    throw new Error('Method not implemented');
  }

  private async getSeasonalRecommendations(request: RecommendationRequest): Promise<RecommendationResult> {
    throw new Error('Method not implemented');
  }

  private async getLifecycleRecommendations(request: RecommendationRequest): Promise<RecommendationResult> {
    throw new Error('Method not implemented');
  }

  private async postProcessRecommendations(
    result: RecommendationResult,
    request: RecommendationRequest
  ): Promise<RecommendationResult> {
    // 後處理邏輯將在後續實現
    return result;
  }

  private async getFallbackRecommendations(request: RecommendationRequest): Promise<RecommendationResult> {
    throw new Error('Method not implemented');
  }

  private async explainTransactionRecommendation(userId: string, cardId: string) {
    throw new Error('Method not implemented');
  }

  private async explainPortfolioRecommendation(userId: string, cardId: string) {
    throw new Error('Method not implemented');
  }

  private async explainGeneralRecommendation(userId: string, cardId: string) {
    throw new Error('Method not implemented');
  }
}

// 導出單例實例
export const recommendationEngineService = RecommendationEngineService.getInstance();