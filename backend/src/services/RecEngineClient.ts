import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  RecEngineConfig,
  RecEngineException,
  TriggerClassifierRequest,
  TriggerClassifierResponse,
  RewardEstimatorRequest,
  RewardEstimatorResponse,
  PortfolioOptimizerRequest,
  PortfolioOptimizerResponse,
  PersonalizedRankerRequest,
  PersonalizedRankerResponse,
  BatchRequest,
  BatchResponse
} from '../models/RecEngine';

export class RecEngineClient {
  private client: AxiosInstance;
  private config: RecEngineConfig;

  constructor(config: RecEngineConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'X-API-Version': '1.0'
      }
    });

    this.setupInterceptors();
  }

  /**
   * 設置請求和回應攔截器
   */
  private setupInterceptors(): void {
    // 請求攔截器
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[RecEngine] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[RecEngine] Request error:', error);
        return Promise.reject(error);
      }
    );

    // 回應攔截器
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[RecEngine] Response ${response.status} from ${response.config.url}`);
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // 重試邏輯
        if (
          error.response?.status >= 500 && 
          originalRequest._retryCount < this.config.retryAttempts
        ) {
          originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
          
          const delay = this.config.retryDelay * Math.pow(2, originalRequest._retryCount - 1);
          console.log(`[RecEngine] Retrying request after ${delay}ms (attempt ${originalRequest._retryCount})`);
          
          await this.sleep(delay);
          return this.client(originalRequest);
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  /**
   * 觸發分類器 - 分析交易是否應該觸發推薦
   */
  async triggerClassifier(request: TriggerClassifierRequest): Promise<TriggerClassifierResponse> {
    try {
      const response = await this.client.post<TriggerClassifierResponse>(
        '/trigger-classify',
        request
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'TRIGGER_CLASSIFIER_ERROR');
    }
  }

  /**
   * 獎勵估算器 - 計算潛在獎勵收益
   */
  async estimateRewards(request: RewardEstimatorRequest): Promise<RewardEstimatorResponse> {
    try {
      const response = await this.client.post<RewardEstimatorResponse>(
        '/estimate-rewards',
        request
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'REWARD_ESTIMATOR_ERROR');
    }
  }

  /**
   * 投資組合優化器 - 提供組合優化建議
   */
  async optimizePortfolio(request: PortfolioOptimizerRequest): Promise<PortfolioOptimizerResponse> {
    try {
      const response = await this.client.post<PortfolioOptimizerResponse>(
        '/optimize-portfolio',
        request
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'PORTFOLIO_OPTIMIZER_ERROR');
    }
  }

  /**
   * Personalized Ranker - Homepage recommendation ranking
   */
  async personalizedRanking(request: PersonalizedRankerRequest): Promise<PersonalizedRankerResponse> {
    try {
      const response = await this.client.post<PersonalizedRankerResponse>(
        '/personalized-ranking',
        request
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'PERSONALIZED_RANKER_ERROR');
    }
  }

  /**
   * 批次請求處理
   */
  async batchRequest(request: BatchRequest): Promise<BatchResponse> {
    try {
      const response = await this.client.post<BatchResponse>(
        '/batch',
        request
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'BATCH_REQUEST_ERROR');
    }
  }

  /**
   * 健康檢查
   */
  async healthCheck(): Promise<{ status: string; timestamp: string; version: string }> {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'HEALTH_CHECK_ERROR');
    }
  }

  /**
   * 獲取模型資訊
   */
  async getModelInfo(): Promise<{
    models: Array<{
      name: string;
      version: string;
      lastTrained: string;
      status: string;
    }>;
  }> {
    try {
      const response = await this.client.get('/models/info');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'MODEL_INFO_ERROR');
    }
  }

  /**
   * 錯誤處理
   */
  private handleError(error: any, defaultCode = 'UNKNOWN_ERROR'): RecEngineException {
    if (error instanceof RecEngineException) {
      return error;
    }

    if (error.response) {
      // API 回應錯誤
      const { status, data } = error.response;
      const message = data?.message || data?.error || `HTTP ${status} Error`;
      const code = data?.code || `HTTP_${status}`;
      
      return new RecEngineException(code, message, {
        status,
        data,
        url: error.config?.url
      });
    }

    if (error.request) {
      // 網路錯誤
      return new RecEngineException(
        'NETWORK_ERROR',
        'Failed to connect to RecEngine service',
        { originalError: error.message }
      );
    }

    // 其他錯誤
    return new RecEngineException(
      defaultCode,
      error.message || 'Unknown RecEngine error',
      { originalError: error }
    );
  }

  /**
   * 延遲函數
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<RecEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 更新 client 配置
    if (newConfig.baseUrl) {
      this.client.defaults.baseURL = newConfig.baseUrl;
    }
    if (newConfig.apiKey) {
      this.client.defaults.headers['Authorization'] = `Bearer ${newConfig.apiKey}`;
    }
    if (newConfig.timeout) {
      this.client.defaults.timeout = newConfig.timeout;
    }
  }

  /**
   * 獲取當前配置
   */
  public getConfig(): RecEngineConfig {
    return { ...this.config };
  }
}

/**
 * RecEngine 客戶端工廠
 */
export class RecEngineClientFactory {
  private static instance: RecEngineClient;

  /**
   * 創建或獲取 RecEngine 客戶端實例
   */
  public static getInstance(config?: RecEngineConfig): RecEngineClient {
    if (!this.instance) {
      if (!config) {
        throw new Error('RecEngine config is required for first initialization');
      }
      this.instance = new RecEngineClient(config);
    }
    
    if (config) {
      this.instance.updateConfig(config);
    }
    
    return this.instance;
  }

  /**
   * 重置實例（主要用於測試）
   */
  public static reset(): void {
    this.instance = null as any;
  }
}

// 預設配置
export const defaultRecEngineConfig: RecEngineConfig = {
  baseUrl: process.env.RECENGINE_BASE_URL || 'http://localhost:8080',
  apiKey: process.env.RECENGINE_API_KEY || '',
  timeout: parseInt(process.env.RECENGINE_TIMEOUT || '30000'),
  retryAttempts: parseInt(process.env.RECENGINE_RETRY_ATTEMPTS || '3'),
  retryDelay: parseInt(process.env.RECENGINE_RETRY_DELAY || '1000')
};