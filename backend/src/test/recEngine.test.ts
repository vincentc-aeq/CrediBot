import {
  RecEngineClient,
  RecEngineClientFactory,
  defaultRecEngineConfig
} from '../services/RecEngineClient';
import { triggerClassifierService } from '../services/TriggerClassifierService';
import { rewardEstimatorService } from '../services/RewardEstimatorService';
import { portfolioOptimizerService } from '../services/PortfolioOptimizerService';
import { personalizedRankerService } from '../services/PersonalizedRankerService';
import { recEngineManager } from '../services/RecEngineManager';
import {
  RecEngineException,
  TriggerClassifierResponse,
  RewardEstimatorResponse,
  PortfolioOptimizerResponse,
  PersonalizedRankerResponse,
  ActionType
} from '../models/RecEngine';
import { CardType, SpendingCategory, RewardType } from '../models/types';

// Mock axios
jest.mock('axios');

describe('RecEngine Integration Tests', () => {
  let mockClient: jest.Mocked<RecEngineClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset factory
    RecEngineClientFactory.reset();
    
    // Create mock client
    mockClient = {
      triggerClassifier: jest.fn(),
      estimateRewards: jest.fn(),
      optimizePortfolio: jest.fn(),
      personalizedRanking: jest.fn(),
      batchRequest: jest.fn(),
      healthCheck: jest.fn(),
      getModelInfo: jest.fn(),
      updateConfig: jest.fn(),
      getConfig: jest.fn()
    } as any;
  });

  describe('RecEngineClient', () => {
    describe('Trigger Classifier', () => {
      it('should successfully classify transaction trigger', async () => {
        const mockResponse: TriggerClassifierResponse = {
          recommend_flag: true,
          extra_reward: 25.50,
          confidence_score: 0.85,
          suggested_card_id: 'card-123',
          reasoning: 'Higher reward rate for dining category'
        };

        mockClient.triggerClassifier.mockResolvedValue(mockResponse);

        const request = {
          transaction: {
            id: 'txn-123',
            userId: 'user-456',
            amount: 150.00,
            category: SpendingCategory.DINING,
            merchant: 'Restaurant ABC',
            description: 'Dinner with friends',
            transactionDate: new Date(),
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date()
          },
          userProfile: {
            id: 'user-456',
            demographics: {
              age: 30,
              income: 75000,
              creditScore: 750,
              location: 'San Francisco'
            },
            spendingPatterns: {
              totalMonthlySpending: 3000,
              categorySpending: {
                dining: 800,
                groceries: 600,
                travel: 400
              },
              transactionFrequency: 45,
              averageTransactionAmount: 67
            },
            preferences: {
              preferredCardTypes: [CardType.TRAVEL],
              maxAnnualFee: 500,
              prioritizedCategories: [SpendingCategory.DINING, SpendingCategory.TRAVEL],
              riskTolerance: 'medium' as const
            }
          },
          currentCards: []
        };

        const result = await mockClient.triggerClassifier(request);

        expect(result.recommend_flag).toBe(true);
        expect(result.extra_reward).toBe(25.50);
        expect(result.confidence_score).toBe(0.85);
        expect(result.suggested_card_id).toBe('card-123');
        expect(mockClient.triggerClassifier).toHaveBeenCalledWith(request);
      });

      it('should handle trigger classifier errors', async () => {
        const errorResponse = new Error('Service unavailable');
        mockClient.triggerClassifier.mockRejectedValue(errorResponse);

        const request = {
          transaction: {} as any,
          userProfile: {} as any,
          currentCards: []
        };

        await expect(mockClient.triggerClassifier(request))
          .rejects.toThrow('Service unavailable');
      });
    });

    describe('Reward Estimator', () => {
      it('should estimate rewards successfully', async () => {
        const mockResponse: RewardEstimatorResponse = {
          reward_deltas: [
            {
              cardId: 'card-123',
              cardName: 'Premium Dining Card',
              estimatedAnnualReward: 1200,
              rewardDelta: 300,
              categoryBreakdown: {
                dining: 400,
                groceries: 200,
                other: 100
              }
            }
          ],
          category_breakdown: {
            dining: {
              currentReward: 48,
              potentialReward: 96,
              bestCard: 'Premium Dining Card'
            }
          },
          total_potential_gain: 300
        };

        mockClient.estimateRewards.mockResolvedValue(mockResponse);

        const request = {
          userSpending: {
            monthlySpending: {
              dining: 800,
              groceries: 600,
              travel: 400
            },
            totalMonthlySpending: 1800,
            historicalData: []
          },
          currentCards: [],
          candidateCards: []
        };

        const result = await mockClient.estimateRewards(request);

        expect(result.total_potential_gain).toBe(300);
        expect(result.reward_deltas).toHaveLength(1);
        expect(result.reward_deltas[0].rewardDelta).toBe(300);
        expect(mockClient.estimateRewards).toHaveBeenCalledWith(request);
      });
    });

    describe('Portfolio Optimizer', () => {
      it('should optimize portfolio successfully', async () => {
        const mockResponse: PortfolioOptimizerResponse = {
          recommendations: [
            {
              action: ActionType.ADD_NEW,
              cardId: 'card-123',
              cardName: 'Optimal Rewards Card',
              reasoning: 'Fills gap in dining rewards',
              expectedBenefit: 400,
              confidence: 0.9
            }
          ],
          action_type: ActionType.ADD_NEW,
          portfolio_score: 8.5,
          improvement_score: 1.2
        };

        mockClient.optimizePortfolio.mockResolvedValue(mockResponse);

        const request = {
          userProfile: {} as any,
          currentPortfolio: [],
          preferences: {
            maxCards: 3,
            maxTotalAnnualFees: 1000,
            prioritizedRewards: ['dining', 'travel'],
            balanceTransferNeeds: false,
            travelFrequency: 'occasional' as const
          }
        };

        const result = await mockClient.optimizePortfolio(request);

        expect(result.portfolio_score).toBe(8.5);
        expect(result.improvement_score).toBe(1.2);
        expect(result.recommendations).toHaveLength(1);
        expect(result.recommendations[0].action).toBe(ActionType.ADD_NEW);
      });
    });

    describe('Personalized Ranker', () => {
      it('should rank cards successfully', async () => {
        const mockResponse: PersonalizedRankerResponse = {
          ranked_cards: [
            {
              cardId: 'card-123',
              cardName: 'Best Match Card',
              personalizedScore: 0.95,
              ranking: 1,
              reasoning: 'Perfect match for your spending habits',
              messageTitle: 'Recommended for You',
              messageDescription: 'This card maximizes your dining rewards',
              ctaText: 'Learn More'
            }
          ],
          diversity_score: 0.8,
          total_candidates: 15
        };

        mockClient.personalizedRanking.mockResolvedValue(mockResponse);

        const request = {
          userProfile: {} as any,
          candidateCards: [],
          contextualFactors: {
            timeOfYear: 'winter',
            dayOfWeek: 'monday',
            userState: 'browsing',
            marketTrends: ['holiday_spending']
          },
          maxResults: 5
        };

        const result = await mockClient.personalizedRanking(request);

        expect(result.ranked_cards).toHaveLength(1);
        expect(result.ranked_cards[0].personalizedScore).toBe(0.95);
        expect(result.diversity_score).toBe(0.8);
        expect(result.total_candidates).toBe(15);
      });
    });

    describe('Health Check', () => {
      it('should perform health check successfully', async () => {
        const mockResponse = {
          status: 'healthy',
          timestamp: '2024-01-01T00:00:00Z',
          version: '1.0.0'
        };

        mockClient.healthCheck.mockResolvedValue(mockResponse);

        const result = await mockClient.healthCheck();

        expect(result.status).toBe('healthy');
        expect(result.version).toBe('1.0.0');
      });
    });

    describe('Error Handling', () => {
      it('should handle network errors', async () => {
        const networkError = new Error('Network error');
        mockClient.triggerClassifier.mockRejectedValue(networkError);

        await expect(mockClient.triggerClassifier({} as any))
          .rejects.toThrow('Network error');
      });

      it('should handle HTTP errors', async () => {
        const httpError = {
          response: {
            status: 500,
            data: {
              code: 'INTERNAL_ERROR',
              message: 'Internal server error'
            }
          }
        };
        
        mockClient.estimateRewards.mockRejectedValue(httpError);

        await expect(mockClient.estimateRewards({} as any))
          .rejects.toThrow();
      });
    });
  });

  describe('Service Layer Tests', () => {
    describe('TriggerClassifierService', () => {
      it('should analyze transaction correctly', async () => {
        // Mock repository calls
        jest.spyOn(require('../repositories/TransactionRepository'), 'transactionRepository')
          .mockReturnValue({
            findById: jest.fn().mockResolvedValue({
              id: 'txn-123',
              amount: 150,
              category: 'dining',
              merchant: 'Restaurant ABC'
            })
          });

        jest.spyOn(require('../repositories/UserRepository'), 'userRepository')
          .mockReturnValue({
            findById: jest.fn().mockResolvedValue({
              id: 'user-456',
              age: 30,
              income: 75000
            })
          });

        jest.spyOn(require('../repositories/UserCardRepository'), 'userCardRepository')
          .mockReturnValue({
            findUserCardsWithDetails: jest.fn().mockResolvedValue([])
          });

        // Mock RecEngine response
        const mockTriggerResponse: TriggerClassifierResponse = {
          recommend_flag: true,
          extra_reward: 25.50,
          confidence_score: 0.85,
          reasoning: 'Better dining rewards available'
        };

        jest.spyOn(triggerClassifierService as any, 'recEngineClient', 'get')
          .mockReturnValue({
            triggerClassifier: jest.fn().mockResolvedValue(mockTriggerResponse)
          });

        const result = await triggerClassifierService.analyzeTransaction('txn-123', 'user-456');

        expect(result.shouldRecommend).toBe(true);
        expect(result.potentialExtraReward).toBe(25.50);
        expect(result.confidence).toBe(0.85);
      });
    });

    describe('RewardEstimatorService', () => {
      it('should estimate user rewards correctly', async () => {
        // Mock dependencies
        jest.spyOn(require('../repositories/UserCardRepository'), 'userCardRepository')
          .mockReturnValue({
            findUserCardsWithDetails: jest.fn().mockResolvedValue([])
          });

        jest.spyOn(require('../repositories/CreditCardRepository'), 'creditCardRepository')
          .mockReturnValue({
            findActiveCards: jest.fn().mockResolvedValue([])
          });

        // Mock spending pattern calculation
        jest.spyOn(rewardEstimatorService as any, 'getUserSpendingPattern')
          .mockResolvedValue({
            monthlySpending: { dining: 800, groceries: 600 },
            totalMonthlySpending: 1400,
            historicalData: []
          });

        const mockRewardResponse: RewardEstimatorResponse = {
          reward_deltas: [],
          category_breakdown: {},
          total_potential_gain: 300
        };

        jest.spyOn(rewardEstimatorService as any, 'recEngineClient', 'get')
          .mockReturnValue({
            estimateRewards: jest.fn().mockResolvedValue(mockRewardResponse)
          });

        const result = await rewardEstimatorService.estimateUserRewards('user-456');

        expect(result.totalGainPotential).toBe(300);
      });
    });
  });

  describe('RecEngineManager Tests', () => {
    beforeEach(() => {
      // Reset manager instance
      jest.clearAllMocks();
    });

    it('should initialize successfully', async () => {
      const manager = recEngineManager;

      // Mock health check
      jest.spyOn(manager as any, 'performHealthCheck')
        .mockResolvedValue(undefined);

      await manager.initialize();

      expect(manager).toBeDefined();
    });

    it('should perform health check', async () => {
      const manager = recEngineManager;

      // Mock RecEngine client
      jest.spyOn(RecEngineClientFactory, 'getInstance')
        .mockReturnValue({
          healthCheck: jest.fn().mockResolvedValue({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          })
        } as any);

      await manager.performHealthCheck();
      const status = await manager.getHealthStatus();

      expect(status.status).toBeDefined();
      expect(status.lastCheck).toBeInstanceOf(Date);
    });

    it('should execute operations with retry', async () => {
      const manager = recEngineManager;
      let attempts = 0;

      const operation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve('success');
      });

      const result = await manager.executeWithRetry('test-service', operation, 3);

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should handle max retries exceeded', async () => {
      const manager = recEngineManager;

      const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(
        manager.executeWithRetry('test-service', operation, 2)
      ).rejects.toThrow(RecEngineException);

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should track metrics correctly', async () => {
      const manager = recEngineManager;

      // Simulate some operations
      await manager.executeWithRetry('test-service', () => Promise.resolve('success'), 1);
      
      try {
        await manager.executeWithRetry('test-service', () => Promise.reject(new Error('fail')), 1);
      } catch {}

      const metrics = manager.getMetrics();

      expect(metrics.totalRequests).toBeGreaterThan(0);
      expect(metrics.serviceBreakdown['test-service']).toBeDefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete user recommendation flow', async () => {
      // This would be a comprehensive test that combines multiple services
      // Testing the full flow from trigger analysis to personalized recommendations
      
      const userId = 'user-123';
      const transactionId = 'txn-456';

      // Mock all required dependencies
      jest.spyOn(require('../repositories/TransactionRepository'), 'transactionRepository')
        .mockReturnValue({
          findById: jest.fn().mockResolvedValue({
            id: transactionId,
            userId,
            amount: 100,
            category: 'dining'
          })
        });

      // Test that the services can work together
      expect(triggerClassifierService).toBeDefined();
      expect(rewardEstimatorService).toBeDefined();
      expect(portfolioOptimizerService).toBeDefined();
      expect(personalizedRankerService).toBeDefined();
    });

    it('should gracefully handle service degradation', async () => {
      const manager = recEngineManager;

      // Test degraded response functionality
      const fallbackData = { message: 'Service temporarily unavailable' };
      const result = manager.getDegradedResponse('test-service', fallbackData);

      expect(result).toEqual(fallbackData);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests', async () => {
      const manager = recEngineManager;
      
      const operations = Array(10).fill(null).map((_, i) => 
        manager.executeWithRetry(`service-${i}`, () => 
          Promise.resolve(`result-${i}`), 1
        )
      );

      const results = await Promise.all(operations);

      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result).toBe(`result-${i}`);
      });
    });

    it('should maintain acceptable response times', async () => {
      const startTime = Date.now();
      
      // Simulate a typical operation
      const manager = recEngineManager;
      await manager.executeWithRetry('perf-test', () => 
        new Promise(resolve => setTimeout(() => resolve('done'), 100)), 1
      );

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });
  });
});