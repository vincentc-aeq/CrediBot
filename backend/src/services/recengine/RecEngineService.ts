/**
 * RecEngine Integration Service
 * Provides a unified interface for CrediBot to interact with RecEngine ML services
 */

import axios, { AxiosInstance } from 'axios';
// Fallback implementations if modules not available
const redis = {
  get: async (key: string) => null,
  setex: async (key: string, ttl: number, value: string) => {},
  del: async (...keys: string[]) => {},
  scan: async (cursor: string, ...args: any[]) => ['0', []]
};
const logger = {
  debug: (...args: any[]) => console.debug(...args),
  info: (...args: any[]) => console.info(...args),
  error: (...args: any[]) => console.error(...args),
  warn: (...args: any[]) => console.warn(...args)
};

// Request/Response Types
export interface TriggerClassifyRequest {
  user_id: string;
  amount: number;
  category: string;
  current_card_id?: string;
  merchant?: string;
  timestamp?: string;
}

export interface TriggerClassifyResponse {
  recommend_flag: boolean;
  confidence_score: number;
  suggested_card_id: string;
  extra_reward: number;
  reasoning: string;
}

export interface PersonalizedRankingRequest {
  user_id: string;
  user_cards?: string[];
  spending_pattern?: Record<string, number>;
  preferences?: Record<string, any>;
}

export interface PersonalizedRankingResponse {
  ranked_cards: Array<{
    card_id: string;
    issuer: string;
    card_name: string;
    ranking_score: number;
    annual_fee: number;
    signup_bonus: number;
    reason: string;
  }>;
  user_id: string;
  ranking_score: number;
}

export interface RewardEstimationRequest {
  user_id: string;
  card_id: string;
  projected_spending: Record<string, number>;
  time_horizon_months?: number;
}

export interface RewardEstimationResponse {
  estimated_annual_reward: number;
  category_breakdown: Record<string, number>;
  compared_to_current?: number;
}

export interface PortfolioOptimizationRequest {
  user_id: string;
  current_cards: string[];
  spending_pattern: Record<string, number>;
  max_cards?: number;
  consider_annual_fees?: boolean;
}

export interface PortfolioOptimizationResponse {
  recommendations: Array<{
    action: 'add' | 'switch' | 'remove';
    card_id?: string;
    card_name?: string;
    reasoning: string;
    impact_score?: number;
    annual_fee?: number;
    annual_fee_savings?: number;
  }>;
  current_portfolio_score: number;
  optimized_portfolio_score: number;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  models_loaded: boolean;
  uptime_seconds: number;
}

export interface ModelInfoResponse {
  models: Record<string, any>;
  last_updated: string;
  version: string;
}

export class RecEngineService {
  private client: AxiosInstance;
  private baseUrl: string;
  private cacheEnabled: boolean;

  constructor() {
    this.baseUrl = process.env.RECENGINE_URL || 'http://localhost:8000';
    this.cacheEnabled = process.env.RECENGINE_CACHE_ENABLED !== 'false';
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`RecEngine Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('RecEngine Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`RecEngine Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('RecEngine Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Health check for RecEngine service
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      const response = await this.client.get<HealthCheckResponse>('/health');
      return response.data;
    } catch (error) {
      logger.error('RecEngine health check failed:', error);
      throw new Error('RecEngine service unavailable');
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(): Promise<ModelInfoResponse> {
    try {
      const response = await this.client.get<ModelInfoResponse>('/models/info');
      return response.data;
    } catch (error) {
      logger.error('Failed to get model info:', error);
      throw error;
    }
  }

  /**
   * Classify if a transaction should trigger a recommendation
   */
  async classifyTrigger(request: TriggerClassifyRequest): Promise<TriggerClassifyResponse> {
    try {
      // Check cooldown period
      const cooldownKey = `recengine:cooldown:${request.user_id}`;
      const inCooldown = await redis.get(cooldownKey);
      
      if (inCooldown) {
        return {
          recommend_flag: false,
          confidence_score: 0,
          suggested_card_id: '',
          extra_reward: 0,
          reasoning: 'User in cooldown period',
        };
      }

      const response = await this.client.post<TriggerClassifyResponse>('/trigger-classify', request);
      
      // Set cooldown if recommendation made
      if (response.data.recommend_flag) {
        await redis.setex(cooldownKey, 3600, '1'); // 1 hour cooldown
      }

      return response.data;
    } catch (error) {
      logger.error('Trigger classification failed:', error);
      throw error;
    }
  }

  /**
   * Get personalized card ranking for homepage
   */
  async getPersonalizedRanking(request: PersonalizedRankingRequest): Promise<PersonalizedRankingResponse> {
    try {
      // Check cache
      const cacheKey = `recengine:ranking:${request.user_id}`;
      
      if (this.cacheEnabled) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          logger.debug('Returning cached ranking for user:', request.user_id);
          return JSON.parse(cached);
        }
      }

      const response = await this.client.post<PersonalizedRankingResponse>('/personalized-ranking', request);
      
      // Cache result for 30 minutes
      if (this.cacheEnabled) {
        await redis.setex(cacheKey, 1800, JSON.stringify(response.data));
      }

      return response.data;
    } catch (error) {
      logger.error('Personalized ranking failed:', error);
      throw error;
    }
  }

  /**
   * Estimate rewards for a specific card
   */
  async estimateRewards(request: RewardEstimationRequest): Promise<RewardEstimationResponse> {
    try {
      // Cache key includes card_id and spending pattern hash
      const spendingHash = this.hashSpendingPattern(request.projected_spending);
      const cacheKey = `recengine:rewards:${request.user_id}:${request.card_id}:${spendingHash}`;
      
      if (this.cacheEnabled) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          logger.debug('Returning cached reward estimation');
          return JSON.parse(cached);
        }
      }

      const response = await this.client.post<RewardEstimationResponse>('/estimate-rewards', request);
      
      // Cache for 24 hours
      if (this.cacheEnabled) {
        await redis.setex(cacheKey, 86400, JSON.stringify(response.data));
      }

      return response.data;
    } catch (error) {
      logger.error('Reward estimation failed:', error);
      throw error;
    }
  }

  /**
   * Optimize card portfolio
   */
  async optimizePortfolio(request: PortfolioOptimizationRequest): Promise<PortfolioOptimizationResponse> {
    try {
      const response = await this.client.post<PortfolioOptimizationResponse>('/optimize-portfolio', request);
      return response.data;
    } catch (error) {
      logger.error('Portfolio optimization failed:', error);
      throw error;
    }
  }

  /**
   * Invalidate user caches
   */
  async invalidateUserCache(userId: string): Promise<void> {
    const keys = [
      `recengine:ranking:${userId}`,
      `recengine:cooldown:${userId}`,
      `recengine:rewards:${userId}:*`,
    ];

    for (const pattern of keys) {
      if (pattern.includes('*')) {
        // Use SCAN to find matching keys
        const matchingKeys = await this.scanKeys(pattern);
        if (matchingKeys.length > 0) {
          await redis.del(...matchingKeys);
        }
      } else {
        await redis.del(pattern);
      }
    }

    logger.info(`Invalidated RecEngine cache for user: ${userId}`);
  }

  /**
   * Helper method to scan Redis keys
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [newCursor, foundKeys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = newCursor;
      keys.push(...foundKeys);
    } while (cursor !== '0');

    return keys;
  }

  /**
   * Hash spending pattern for cache key
   */
  private hashSpendingPattern(spending: Record<string, number>): string {
    const sorted = Object.entries(spending).sort(([a], [b]) => a.localeCompare(b));
    return sorted.map(([k, v]) => `${k}:${v}`).join('|');
  }

  /**
   * Get service status
   */
  async getStatus(): Promise<{
    available: boolean;
    responseTime?: number;
    error?: string;
  }> {
    const start = Date.now();
    
    try {
      await this.healthCheck();
      return {
        available: true,
        responseTime: Date.now() - start,
      };
    } catch (error) {
      return {
        available: false,
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}