import { RecEngineClientFactory, defaultRecEngineConfig } from './RecEngineClient';
import { triggerClassifierService } from './TriggerClassifierService';
import { rewardEstimatorService } from './RewardEstimatorService';
import { portfolioOptimizerService } from './PortfolioOptimizerService';
import { personalizedRankerService } from './PersonalizedRankerService';
import { RecEngineException, RecEngineConfig } from '../models/RecEngine';

export interface RecEngineHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  services: {
    triggerClassifier: ServiceStatus;
    rewardEstimator: ServiceStatus;
    portfolioOptimizer: ServiceStatus;
    personalizedRanker: ServiceStatus;
  };
  responseTime: number;
  version: string;
}

export interface ServiceStatus {
  available: boolean;
  responseTime?: number;
  lastError?: string;
  errorCount: number;
  lastSuccess?: Date;
}

export interface RecEngineMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  errorRate: number;
  serviceBreakdown: {
    [serviceName: string]: {
      requests: number;
      successes: number;
      failures: number;
      avgResponseTime: number;
    };
  };
}

export class RecEngineManager {
  private static instance: RecEngineManager;
  private healthStatus: RecEngineHealthStatus;
  private metrics: RecEngineMetrics;
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;

  private constructor() {
    this.healthStatus = this.initializeHealthStatus();
    this.metrics = this.initializeMetrics();
  }

  public static getInstance(): RecEngineManager {
    if (!RecEngineManager.instance) {
      RecEngineManager.instance = new RecEngineManager();
    }
    return RecEngineManager.instance;
  }

  /**
   * 初始化 RecEngine 管理器
   */
  async initialize(config?: Partial<RecEngineConfig>): Promise<void> {
    try {
      // 更新配置
      if (config) {
        const client = RecEngineClientFactory.getInstance();
        client.updateConfig(config);
      }

      // 執行健康檢查
      await this.performHealthCheck();

      // 開始監控
      this.startMonitoring();

      console.log('RecEngine Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RecEngine Manager:', error);
      throw new RecEngineException(
        'INITIALIZATION_ERROR',
        'Failed to initialize RecEngine Manager',
        { originalError: error }
      );
    }
  }

  /**
   * 獲取健康狀態
   */
  async getHealthStatus(): Promise<RecEngineHealthStatus> {
    await this.performHealthCheck();
    return { ...this.healthStatus };
  }

  /**
   * 獲取服務指標
   */
  getMetrics(): RecEngineMetrics {
    return { ...this.metrics };
  }

  /**
   * 重置指標
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
  }

  /**
   * 執行健康檢查
   */
  async performHealthCheck(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const client = RecEngineClientFactory.getInstance(defaultRecEngineConfig);
      
      // 檢查主服務健康狀態
      const healthResponse = await client.healthCheck();
      const responseTime = Date.now() - startTime;

      // 檢查各個子服務
      const serviceChecks = await Promise.allSettled([
        this.checkTriggerClassifier(),
        this.checkRewardEstimator(),
        this.checkPortfolioOptimizer(),
        this.checkPersonalizedRanker()
      ]);

      // 更新健康狀態
      this.healthStatus = {
        status: this.determineOverallStatus(serviceChecks),
        lastCheck: new Date(),
        services: {
          triggerClassifier: this.extractServiceStatus(serviceChecks[0]),
          rewardEstimator: this.extractServiceStatus(serviceChecks[1]),
          portfolioOptimizer: this.extractServiceStatus(serviceChecks[2]),
          personalizedRanker: this.extractServiceStatus(serviceChecks[3])
        },
        responseTime,
        version: healthResponse.version || 'unknown'
      };

      console.log(`[RecEngine] Health check completed - Status: ${this.healthStatus.status}`);
    } catch (error) {
      console.error('[RecEngine] Health check failed:', error);
      
      this.healthStatus.status = 'unhealthy';
      this.healthStatus.lastCheck = new Date();
      this.healthStatus.responseTime = Date.now() - startTime;
    }
  }

  /**
   * 執行帶有重試的服務呼叫
   */
  async executeWithRetry<T>(
    serviceName: string,
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMultiplier: number = 2
  ): Promise<T> {
    const startTime = Date.now();
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // 記錄成功指標
        this.recordSuccess(serviceName, Date.now() - startTime);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // 記錄失敗指標
        this.recordFailure(serviceName, Date.now() - startTime);

        // 如果是最後一次嘗試，拋出錯誤
        if (attempt === maxRetries) {
          break;
        }

        // 計算延遲時間
        const delay = Math.pow(backoffMultiplier, attempt - 1) * 1000;
        console.log(`[RecEngine] ${serviceName} failed (attempt ${attempt}), retrying in ${delay}ms...`);
        
        await this.sleep(delay);
      }
    }

    throw new RecEngineException(
      'MAX_RETRIES_EXCEEDED',
      `Service ${serviceName} failed after ${maxRetries} attempts: ${lastError.message}`,
      { serviceName, maxRetries, originalError: lastError }
    );
  }

  /**
   * 獲取服務降級響應
   */
  getDegradedResponse<T>(serviceName: string, fallbackData: T): T {
    console.warn(`[RecEngine] Returning degraded response for ${serviceName}`);
    
    // 記錄降級事件
    this.recordFailure(serviceName, 0);
    
    return fallbackData;
  }

  /**
   * 檢查服務是否可用
   */
  isServiceAvailable(serviceName: keyof RecEngineHealthStatus['services']): boolean {
    return this.healthStatus.services[serviceName]?.available || false;
  }

  /**
   * 開始監控
   */
  private startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('[RecEngine] Monitoring health check failed:', error);
      }
    }, 60000); // 每分鐘檢查一次

    console.log('[RecEngine] Health monitoring started');
  }

  /**
   * 停止監控
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
    console.log('[RecEngine] Health monitoring stopped');
  }

  /**
   * 檢查各個服務
   */
  private async checkTriggerClassifier(): Promise<ServiceStatus> {
    try {
      // 模擬簡單的服務檢查
      const startTime = Date.now();
      // 這裡可以添加實際的服務檢查邏輯
      await this.sleep(50); // 模擬延遲
      
      return {
        available: true,
        responseTime: Date.now() - startTime,
        errorCount: 0,
        lastSuccess: new Date()
      };
    } catch (error) {
      return {
        available: false,
        lastError: error.message,
        errorCount: 1
      };
    }
  }

  private async checkRewardEstimator(): Promise<ServiceStatus> {
    try {
      const startTime = Date.now();
      await this.sleep(50);
      
      return {
        available: true,
        responseTime: Date.now() - startTime,
        errorCount: 0,
        lastSuccess: new Date()
      };
    } catch (error) {
      return {
        available: false,
        lastError: error.message,
        errorCount: 1
      };
    }
  }

  private async checkPortfolioOptimizer(): Promise<ServiceStatus> {
    try {
      const startTime = Date.now();
      await this.sleep(50);
      
      return {
        available: true,
        responseTime: Date.now() - startTime,
        errorCount: 0,
        lastSuccess: new Date()
      };
    } catch (error) {
      return {
        available: false,
        lastError: error.message,
        errorCount: 1
      };
    }
  }

  private async checkPersonalizedRanker(): Promise<ServiceStatus> {
    try {
      const startTime = Date.now();
      await this.sleep(50);
      
      return {
        available: true,
        responseTime: Date.now() - startTime,
        errorCount: 0,
        lastSuccess: new Date()
      };
    } catch (error) {
      return {
        available: false,
        lastError: error.message,
        errorCount: 1
      };
    }
  }

  /**
   * 輔助方法
   */
  private initializeHealthStatus(): RecEngineHealthStatus {
    return {
      status: 'unhealthy',
      lastCheck: new Date(),
      services: {
        triggerClassifier: { available: false, errorCount: 0 },
        rewardEstimator: { available: false, errorCount: 0 },
        portfolioOptimizer: { available: false, errorCount: 0 },
        personalizedRanker: { available: false, errorCount: 0 }
      },
      responseTime: 0,
      version: 'unknown'
    };
  }

  private initializeMetrics(): RecEngineMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      serviceBreakdown: {}
    };
  }

  private determineOverallStatus(serviceChecks: PromiseSettledResult<ServiceStatus>[]): 'healthy' | 'degraded' | 'unhealthy' {
    const available = serviceChecks.filter(check => 
      check.status === 'fulfilled' && check.value.available
    ).length;

    if (available === serviceChecks.length) return 'healthy';
    if (available > 0) return 'degraded';
    return 'unhealthy';
  }

  private extractServiceStatus(result: PromiseSettledResult<ServiceStatus>): ServiceStatus {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        available: false,
        lastError: result.reason?.message || 'Unknown error',
        errorCount: 1
      };
    }
  }

  private recordSuccess(serviceName: string, responseTime: number): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    
    if (!this.metrics.serviceBreakdown[serviceName]) {
      this.metrics.serviceBreakdown[serviceName] = {
        requests: 0,
        successes: 0,
        failures: 0,
        avgResponseTime: 0
      };
    }

    const service = this.metrics.serviceBreakdown[serviceName];
    service.requests++;
    service.successes++;
    service.avgResponseTime = (service.avgResponseTime * (service.successes - 1) + responseTime) / service.successes;

    this.updateAverageResponseTime();
    this.updateErrorRate();
  }

  private recordFailure(serviceName: string, responseTime: number): void {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    
    if (!this.metrics.serviceBreakdown[serviceName]) {
      this.metrics.serviceBreakdown[serviceName] = {
        requests: 0,
        successes: 0,
        failures: 0,
        avgResponseTime: 0
      };
    }

    const service = this.metrics.serviceBreakdown[serviceName];
    service.requests++;
    service.failures++;

    this.updateErrorRate();
  }

  private updateAverageResponseTime(): void {
    const totalResponseTime = Object.values(this.metrics.serviceBreakdown)
      .reduce((sum, service) => sum + (service.avgResponseTime * service.successes), 0);
    
    this.metrics.averageResponseTime = this.metrics.successfulRequests > 0 
      ? totalResponseTime / this.metrics.successfulRequests 
      : 0;
  }

  private updateErrorRate(): void {
    this.metrics.errorRate = this.metrics.totalRequests > 0 
      ? this.metrics.failedRequests / this.metrics.totalRequests 
      : 0;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 單例實例
export const recEngineManager = RecEngineManager.getInstance();