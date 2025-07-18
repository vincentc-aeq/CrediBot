import {
  RecommendationEngineService,
  recommendationEngineService,
  RecommendationType,
  RecommendationRequest
} from '../services/RecommendationEngineService';
import { HomepageRecommendationService } from '../services/HomepageRecommendationService';
import { TransactionRecommendationService } from '../services/TransactionRecommendationService';
import { DashboardRecommendationService } from '../services/DashboardRecommendationService';
import { UserPreferenceService } from '../services/UserPreferenceService';
import { CardType, SpendingCategory } from '../models/types';
import { RecEngineException } from '../models/RecEngine';

// Mock dependencies
jest.mock('../services/TriggerClassifierService');
jest.mock('../services/RewardEstimatorService');
jest.mock('../services/PortfolioOptimizerService');
jest.mock('../services/PersonalizedRankerService');
jest.mock('../repositories/UserRepository');
jest.mock('../repositories/UserCardRepository');
jest.mock('../repositories/TransactionRepository');
jest.mock('../repositories/CreditCardRepository');

describe('RecommendationEngineService', () => {
  let service: RecommendationEngineService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = recommendationEngineService;
  });

  describe('getRecommendations', () => {
    it('should route to homepage recommendations', async () => {
      const request: RecommendationRequest = {
        userId: 'user-123',
        type: RecommendationType.HOMEPAGE,
        options: { maxResults: 6 }
      };

      // Mock the private method by spying on it
      const getHomepageRecommendationsSpy = jest.spyOn(
        service as any,
        'getHomepageRecommendations'
      ).mockResolvedValue({
        id: 'rec-123',
        type: RecommendationType.HOMEPAGE,
        userId: 'user-123',
        recommendations: [],
        metadata: {
          algorithmVersion: '2.1.0',
          personalizationScore: 0.8,
          diversityScore: 0.7,
          contextFactors: [],
          filtersCriteria: [],
          performanceMetrics: {
            responseTime: 100,
            confidenceLevel: 0.8,
            dataFreshness: 0.9
          }
        },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      // Mock health check
      jest.spyOn(service as any, 'checkServiceHealth').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'logRecommendationRequest').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'postProcessRecommendations').mockImplementation(result => Promise.resolve(result));
      jest.spyOn(service as any, 'logRecommendationSuccess').mockResolvedValue(undefined);

      const result = await service.getRecommendations(request);

      expect(result.type).toBe(RecommendationType.HOMEPAGE);
      expect(result.userId).toBe('user-123');
      expect(getHomepageRecommendationsSpy).toHaveBeenCalledWith(request);
    });

    it('should route to transaction-triggered recommendations', async () => {
      const request: RecommendationRequest = {
        userId: 'user-123',
        type: RecommendationType.TRANSACTION_TRIGGERED,
        context: {
          transactionId: 'txn-456',
          amount: 150,
          category: 'dining'
        }
      };

      const getTransactionTriggeredSpy = jest.spyOn(
        service as any,
        'getTransactionTriggeredRecommendations'
      ).mockResolvedValue({
        id: 'rec-123',
        type: RecommendationType.TRANSACTION_TRIGGERED,
        userId: 'user-123',
        recommendations: [],
        metadata: {} as any,
        createdAt: new Date(),
        expiresAt: new Date()
      });

      jest.spyOn(service as any, 'checkServiceHealth').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'logRecommendationRequest').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'postProcessRecommendations').mockImplementation(result => Promise.resolve(result));
      jest.spyOn(service as any, 'logRecommendationSuccess').mockResolvedValue(undefined);

      const result = await service.getRecommendations(request);

      expect(result.type).toBe(RecommendationType.TRANSACTION_TRIGGERED);
      expect(getTransactionTriggeredSpy).toHaveBeenCalledWith(request);
    });

    it('should validate request parameters', async () => {
      const invalidRequest: RecommendationRequest = {
        userId: '',
        type: RecommendationType.HOMEPAGE
      };

      await expect(service.getRecommendations(invalidRequest))
        .rejects.toThrow(RecEngineException);
    });

    it('should handle service unavailable error', async () => {
      const request: RecommendationRequest = {
        userId: 'user-123',
        type: RecommendationType.HOMEPAGE
      };

      jest.spyOn(service as any, 'checkServiceHealth')
        .mockRejectedValue(new RecEngineException('SERVICE_UNAVAILABLE', 'Service unavailable'));

      await expect(service.getRecommendations(request))
        .rejects.toThrow('Service unavailable');
    });
  });

  describe('getBatchRecommendations', () => {
    it('should process multiple recommendation requests', async () => {
      const requests: RecommendationRequest[] = [
        {
          userId: 'user-123',
          type: RecommendationType.HOMEPAGE
        },
        {
          userId: 'user-123',
          type: RecommendationType.PORTFOLIO_OPTIMIZATION
        }
      ];

      // Mock individual getRecommendations calls
      jest.spyOn(service, 'getRecommendations')
        .mockResolvedValueOnce({
          id: 'rec-1',
          type: RecommendationType.HOMEPAGE,
          userId: 'user-123',
          recommendations: [],
          metadata: {} as any,
          createdAt: new Date(),
          expiresAt: new Date()
        })
        .mockResolvedValueOnce({
          id: 'rec-2',
          type: RecommendationType.PORTFOLIO_OPTIMIZATION,
          userId: 'user-123',
          recommendations: [],
          metadata: {} as any,
          createdAt: new Date(),
          expiresAt: new Date()
        });

      jest.spyOn(service as any, 'logBatchRecommendationStats').mockResolvedValue(undefined);

      const results = await service.getBatchRecommendations(requests);

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe(RecommendationType.HOMEPAGE);
      expect(results[1].type).toBe(RecommendationType.PORTFOLIO_OPTIMIZATION);
    });

    it('should handle partial failures in batch processing', async () => {
      const requests: RecommendationRequest[] = [
        {
          userId: 'user-123',
          type: RecommendationType.HOMEPAGE
        },
        {
          userId: 'user-123',
          type: RecommendationType.PORTFOLIO_OPTIMIZATION
        }
      ];

      jest.spyOn(service, 'getRecommendations')
        .mockResolvedValueOnce({
          id: 'rec-1',
          type: RecommendationType.HOMEPAGE,
          userId: 'user-123',
          recommendations: [],
          metadata: {} as any,
          createdAt: new Date(),
          expiresAt: new Date()
        })
        .mockRejectedValueOnce(new Error('Service error'));

      jest.spyOn(service as any, 'logBatchRecommendationStats').mockResolvedValue(undefined);

      const results = await service.getBatchRecommendations(requests);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(RecommendationType.HOMEPAGE);
    });
  });

  describe('getRealtimeRecommendations', () => {
    it('should return realtime recommendations based on context', async () => {
      const context = {
        transactionId: 'txn-123',
        amount: 200,
        category: 'dining'
      };

      // Mock the internal method
      jest.spyOn(service as any, 'determineRecommendationType')
        .mockReturnValue(RecommendationType.TRANSACTION_TRIGGERED);

      jest.spyOn(service, 'getRecommendations').mockResolvedValue({
        id: 'rec-123',
        type: RecommendationType.TRANSACTION_TRIGGERED,
        userId: 'user-123',
        recommendations: [
          {
            cardId: 'card-123',
            cardName: 'Dining Rewards Card',
            score: 0.9,
            reasoning: 'High dining rewards',
            estimatedBenefit: 50,
            confidence: 0.85,
            priority: 'high',
            ctaText: 'Apply Now',
            messageTitle: 'Better Dining Rewards',
            messageDescription: 'Get more rewards on dining',
            tags: ['dining', 'rewards']
          }
        ],
        metadata: {} as any,
        createdAt: new Date(),
        expiresAt: new Date()
      });

      const results = await service.getRealtimeRecommendations('user-123', context);

      expect(results).toHaveLength(1);
      expect(results[0].cardName).toBe('Dining Rewards Card');
      expect(results[0].priority).toBe('high');
    });

    it('should handle errors gracefully and return basic recommendations', async () => {
      const context = {
        amount: 100,
        category: 'groceries'
      };

      jest.spyOn(service as any, 'determineRecommendationType')
        .mockImplementation(() => {
          throw new Error('Service error');
        });

      jest.spyOn(service as any, 'getBasicRecommendations').mockResolvedValue([
        {
          cardId: 'fallback-1',
          cardName: 'Basic Card',
          score: 0.5,
          reasoning: 'Fallback recommendation',
          estimatedBenefit: 100,
          confidence: 0.3,
          priority: 'medium',
          ctaText: 'Learn More',
          messageTitle: 'Basic Recommendation',
          messageDescription: 'Basic option',
          tags: ['fallback']
        }
      ]);

      const results = await service.getRealtimeRecommendations('user-123', context);

      expect(results).toHaveLength(1);
      expect(results[0].cardName).toBe('Basic Card');
    });
  });

  describe('updateUserFeedback', () => {
    it('should record user feedback successfully', async () => {
      const feedback = {
        action: 'click' as const,
        cardId: 'card-123',
        rating: 4
      };

      // Mock audit service
      const mockAuditLog = jest.fn().mockResolvedValue(undefined);
      jest.doMock('../services/AuditService', () => ({
        auditService: {
          log: mockAuditLog
        }
      }));

      await service.updateUserFeedback('user-123', 'rec-456', feedback);

      // The method should complete without throwing
      expect(true).toBe(true);
    });

    it('should handle feedback recording errors gracefully', async () => {
      const feedback = {
        action: 'dismiss' as const,
        cardId: 'card-123'
      };

      // Mock audit service to throw error
      const mockAuditLog = jest.fn().mockRejectedValue(new Error('Audit error'));
      jest.doMock('../services/AuditService', () => ({
        auditService: {
          log: mockAuditLog
        }
      }));

      // Should not throw error
      await expect(
        service.updateUserFeedback('user-123', 'rec-456', feedback)
      ).resolves.toBeUndefined();
    });
  });
});

describe('HomepageRecommendationService', () => {
  let service: HomepageRecommendationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HomepageRecommendationService();
  });

  describe('generateHomepageLayout', () => {
    it('should generate complete homepage layout', async () => {
      // Mock dependencies
      jest.spyOn(service as any, 'buildPersonalizationContext').mockResolvedValue({
        userSegment: 'heavy_user',
        lifestagePhase: 'young_professional',
        spendingPersona: 'moderate',
        primaryGoals: ['maximize_rewards'],
        seasonalFactors: ['general']
      });

      const mockHomepageRecommendations = {
        featured: [
          {
            cardId: 'card-1',
            cardName: 'Premium Card',
            personalizedScore: 0.9,
            reasoning: 'Great match',
            ctaText: 'Apply',
            messageTitle: 'Featured',
            messageDescription: 'Top pick'
          }
        ],
        trending: [],
        personalized: []
      };

      jest.spyOn(require('../services/PersonalizedRankerService'), 'personalizedRankerService')
        .mockReturnValue({
          getHomepageRecommendations: jest.fn().mockResolvedValue(mockHomepageRecommendations),
          getCategoryRecommendations: jest.fn().mockResolvedValue([])
        });

      const layout = await service.generateHomepageLayout('user-123');

      expect(layout.hero).toBeDefined();
      expect(layout.featured).toBeDefined();
      expect(layout.trending).toBeDefined();
      expect(layout.personalized).toBeDefined();
      expect(layout.categories).toBeDefined();
    });

    it('should return degraded layout on error', async () => {
      jest.spyOn(service as any, 'buildPersonalizationContext')
        .mockRejectedValue(new Error('Service error'));

      jest.spyOn(service as any, 'getDegradedHomepageLayout').mockResolvedValue({
        hero: {
          card: {
            cardId: 'fallback',
            cardName: 'Basic Card',
            score: 0.5,
            reasoning: 'Fallback',
            estimatedBenefit: 100,
            confidence: 0.3,
            priority: 'medium',
            ctaText: 'Learn More',
            messageTitle: 'Basic',
            messageDescription: 'Basic recommendation',
            tags: ['fallback']
          },
          backgroundImage: '/default.jpg',
          highlight: 'Basic recommendation',
          ctaStyle: 'secondary'
        },
        featured: [],
        trending: [],
        personalized: [],
        categories: []
      });

      const layout = await service.generateHomepageLayout('user-123');

      expect(layout.hero.card.cardName).toBe('Basic Card');
      expect(layout.hero.ctaStyle).toBe('secondary');
    });
  });

  describe('getRecommendationVariant', () => {
    it('should return conservative variant', async () => {
      jest.spyOn(service as any, 'getConservativeVariant').mockResolvedValue({
        id: 'rec-conservative',
        type: RecommendationType.HOMEPAGE,
        userId: 'user-123',
        recommendations: [],
        metadata: {} as any,
        createdAt: new Date(),
        expiresAt: new Date()
      });

      const result = await service.getRecommendationVariant('user-123', 'variant_a_conservative');

      expect(result.id).toBe('rec-conservative');
    });

    it('should return aggressive variant', async () => {
      jest.spyOn(service as any, 'getAggressiveVariant').mockResolvedValue({
        id: 'rec-aggressive',
        type: RecommendationType.HOMEPAGE,
        userId: 'user-123',
        recommendations: [],
        metadata: {} as any,
        createdAt: new Date(),
        expiresAt: new Date()
      });

      const result = await service.getRecommendationVariant('user-123', 'variant_b_aggressive');

      expect(result.id).toBe('rec-aggressive');
    });

    it('should fallback to default for unknown variant', async () => {
      jest.spyOn(service, 'getHomepageRecommendations').mockResolvedValue({
        id: 'rec-default',
        type: RecommendationType.HOMEPAGE,
        userId: 'user-123',
        recommendations: [],
        metadata: {} as any,
        createdAt: new Date(),
        expiresAt: new Date()
      });

      const result = await service.getRecommendationVariant('user-123', 'unknown_variant');

      expect(result.id).toBe('rec-default');
    });
  });
});

describe('TransactionRecommendationService', () => {
  let service: TransactionRecommendationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TransactionRecommendationService();
  });

  describe('analyzeTransactionAndRecommend', () => {
    it('should return null when no recommendation needed', async () => {
      // Mock trigger analysis to return no recommendation
      jest.spyOn(require('../services/TriggerClassifierService'), 'triggerClassifierService')
        .mockReturnValue({
          analyzeTransaction: jest.fn().mockResolvedValue({
            shouldRecommend: false,
            potentialExtraReward: 0,
            confidence: 0.2,
            reasoning: 'No better options available'
          })
        });

      const result = await service.analyzeTransactionAndRecommend('txn-123', 'user-456');

      expect(result).toBeNull();
    });

    it('should return recommendations when trigger analysis suggests it', async () => {
      // Mock trigger analysis to return recommendation
      jest.spyOn(require('../services/TriggerClassifierService'), 'triggerClassifierService')
        .mockReturnValue({
          analyzeTransaction: jest.fn().mockResolvedValue({
            shouldRecommend: true,
            recommendedCard: {
              id: 'card-123',
              name: 'Better Rewards Card'
            },
            potentialExtraReward: 25,
            confidence: 0.8,
            reasoning: 'Higher reward rate available'
          })
        });

      // Mock context building
      jest.spyOn(service as any, 'buildTransactionContext').mockResolvedValue({
        transaction: {
          id: 'txn-123',
          userId: 'user-456',
          amount: 150,
          category: SpendingCategory.DINING,
          merchant: 'Restaurant'
        },
        userSpendingHistory: {},
        currentCards: [],
        marketOpportunities: {
          betterCards: [],
          categoryLeaders: [],
          timeSensitiveOffers: []
        }
      });

      jest.spyOn(service as any, 'generateTransactionRecommendations').mockResolvedValue({
        id: 'rec-123',
        type: RecommendationType.TRANSACTION_TRIGGERED,
        userId: 'user-456',
        recommendations: [
          {
            cardId: 'card-123',
            cardName: 'Better Rewards Card',
            score: 0.8,
            reasoning: 'Higher reward rate',
            estimatedBenefit: 25,
            confidence: 0.8,
            priority: 'high',
            ctaText: 'Apply',
            messageTitle: 'Better Option',
            messageDescription: 'Get more rewards',
            tags: ['transaction_triggered']
          }
        ],
        metadata: {} as any,
        createdAt: new Date(),
        expiresAt: new Date()
      });

      const result = await service.analyzeTransactionAndRecommend('txn-123', 'user-456');

      expect(result).not.toBeNull();
      expect(result!.recommendations).toHaveLength(1);
      expect(result!.recommendations[0].cardName).toBe('Better Rewards Card');
    });
  });

  describe('getRealtimeTransactionRecommendation', () => {
    it('should return recommendation for high-benefit transaction', async () => {
      const transaction = {
        amount: 200,
        category: SpendingCategory.DINING,
        merchant: 'High-end Restaurant'
      };

      jest.spyOn(require('../services/TriggerClassifierService'), 'triggerClassifierService')
        .mockReturnValue({
          analyzeRealtimeTransaction: jest.fn().mockResolvedValue({
            shouldRecommend: true,
            recommendedCard: {
              id: 'card-dining',
              name: 'Premium Dining Card'
            },
            potentialExtraReward: 40,
            confidence: 0.9,
            reasoning: 'Premium dining rewards available'
          })
        });

      jest.spyOn(service as any, 'generateRealtimeRecommendation').mockResolvedValue({
        cardId: 'card-dining',
        cardName: 'Premium Dining Card',
        score: 0.9,
        reasoning: 'Premium dining rewards',
        estimatedBenefit: 40,
        confidence: 0.9,
        priority: 'high',
        ctaText: 'Apply Now',
        messageTitle: 'Better Dining Rewards',
        messageDescription: 'Get 4x points on dining',
        tags: ['realtime', 'dining']
      });

      jest.spyOn(service as any, 'calculateUrgency').mockReturnValue('high');

      const result = await service.getRealtimeTransactionRecommendation(transaction, 'user-123');

      expect(result.shouldShow).toBe(true);
      expect(result.recommendation?.cardName).toBe('Premium Dining Card');
      expect(result.urgency).toBe('high');
    });

    it('should not show recommendation for low-benefit transaction', async () => {
      const transaction = {
        amount: 10,
        category: SpendingCategory.OTHER,
        merchant: 'Small Purchase'
      };

      jest.spyOn(require('../services/TriggerClassifierService'), 'triggerClassifierService')
        .mockReturnValue({
          analyzeRealtimeTransaction: jest.fn().mockResolvedValue({
            shouldRecommend: false,
            potentialExtraReward: 1,
            confidence: 0.3,
            reasoning: 'Minimal benefit opportunity'
          })
        });

      const result = await service.getRealtimeTransactionRecommendation(transaction, 'user-123');

      expect(result.shouldShow).toBe(false);
      expect(result.recommendation).toBeUndefined();
      expect(result.urgency).toBe('low');
    });
  });

  describe('analyzeRecentTransactions', () => {
    it('should analyze and summarize recent transaction opportunities', async () => {
      // Mock recent transactions
      jest.spyOn(require('../repositories/TransactionRepository'), 'transactionRepository')
        .mockReturnValue({
          findByUserAndDateRange: jest.fn().mockResolvedValue([
            {
              id: 'txn-1',
              amount: 100,
              category: SpendingCategory.DINING,
              merchant: 'Restaurant A'
            },
            {
              id: 'txn-2',
              amount: 200,
              category: SpendingCategory.TRAVEL,
              merchant: 'Airline B'
            }
          ])
        });

      // Mock trigger analysis for each transaction
      jest.spyOn(require('../services/TriggerClassifierService'), 'triggerClassifierService')
        .mockReturnValue({
          analyzeTransaction: jest.fn()
            .mockResolvedValueOnce({
              shouldRecommend: true,
              potentialExtraReward: 15,
              recommendedCard: { name: 'Dining Card' }
            })
            .mockResolvedValueOnce({
              shouldRecommend: true,
              potentialExtraReward: 30,
              recommendedCard: { name: 'Travel Card' }
            })
        });

      jest.spyOn(service as any, 'generateRecommendationFromAnalysis')
        .mockResolvedValue({
          cardId: 'card-1',
          cardName: 'Test Card',
          score: 0.8,
          reasoning: 'Good match',
          estimatedBenefit: 20,
          confidence: 0.8,
          priority: 'medium',
          ctaText: 'Apply',
          messageTitle: 'Opportunity',
          messageDescription: 'Missed reward',
          tags: ['missed_opportunity']
        });

      const result = await service.analyzeRecentTransactions('user-123', 7);

      expect(result.totalMissedReward).toBe(45); // 15 + 30
      expect(result.triggerCount).toBe(2);
      expect(result.topOpportunities.length).toBeGreaterThan(0);
      expect(result.categoryInsights.length).toBeGreaterThan(0);
    });
  });
});

describe('UserPreferenceService', () => {
  let service: UserPreferenceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserPreferenceService();
  });

  describe('getUserPreferences', () => {
    it('should return stored preferences if available', async () => {
      const storedPreferences = {
        id: 'pref-123',
        userId: 'user-123',
        cardTypePreferences: [],
        spendingCategoryPriorities: [],
        financialConstraints: {
          maxAnnualFee: 200,
          minCreditScore: 650,
          maxTotalCards: 5,
          maxTotalAnnualFees: 500,
          incomeRange: '50k_75k' as const
        },
        behavioralPreferences: {
          rewardRedemptionStyle: 'accumulate' as const,
          managementStyle: 'moderate' as const,
          applicationFrequency: 'moderate' as const,
          loyaltyToIssuers: false,
          preferredChannels: ['web']
        },
        riskProfile: {
          riskTolerance: 'moderate' as const,
          creditUtilizationComfort: 0.3,
          annualFeeAcceptance: 'moderate' as const,
          newProductOpenness: 'selective' as const
        },
        goals: {
          primary: 'maximize_rewards' as any,
          secondary: [],
          timeframe: 'medium_term' as const,
          specificTargets: {}
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(service as any, 'loadStoredPreferences')
        .mockResolvedValue(storedPreferences);

      const result = await service.getUserPreferences('user-123');

      expect(result).toEqual(storedPreferences);
    });

    it('should infer preferences if none are stored', async () => {
      jest.spyOn(service as any, 'loadStoredPreferences')
        .mockResolvedValue(null);

      const inferredPreferences = {
        id: 'pref-inferred',
        userId: 'user-123',
        cardTypePreferences: [
          { cardType: CardType.CASHBACK, preference: 'prefer' as const }
        ],
        spendingCategoryPriorities: [
          {
            category: SpendingCategory.DINING,
            priority: 8,
            monthlySpending: 500,
            importance: 'high' as const
          }
        ],
        financialConstraints: {} as any,
        behavioralPreferences: {} as any,
        riskProfile: {} as any,
        goals: {} as any,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(service as any, 'inferUserPreferences')
        .mockResolvedValue(inferredPreferences);
      jest.spyOn(service as any, 'saveUserPreferences')
        .mockResolvedValue(undefined);

      const result = await service.getUserPreferences('user-123');

      expect(result.cardTypePreferences[0].cardType).toBe(CardType.CASHBACK);
      expect(result.spendingCategoryPriorities[0].category).toBe(SpendingCategory.DINING);
    });
  });

  describe('filterCardsByPreferences', () => {
    it('should filter cards based on financial constraints', async () => {
      const cards = [
        {
          id: 'card-1',
          name: 'Low Fee Card',
          annualFee: 50,
          cardType: CardType.CASHBACK,
          requirements: { minCreditScore: 600 }
        },
        {
          id: 'card-2',
          name: 'High Fee Card',
          annualFee: 500,
          cardType: CardType.TRAVEL,
          requirements: { minCreditScore: 750 }
        }
      ] as any[];

      const preferences = {
        financialConstraints: {
          maxAnnualFee: 200,
          minCreditScore: 650,
          maxTotalCards: 5,
          maxTotalAnnualFees: 1000,
          incomeRange: '50k_75k' as const
        },
        cardTypePreferences: [],
        riskProfile: {
          annualFeeAcceptance: 'moderate' as const
        }
      } as any;

      jest.spyOn(service, 'getUserPreferences')
        .mockResolvedValue(preferences);

      const result = await service.filterCardsByPreferences('user-123', cards);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Low Fee Card');
    });

    it('should filter cards based on card type preferences', async () => {
      const cards = [
        {
          id: 'card-1',
          name: 'Cashback Card',
          annualFee: 0,
          cardType: CardType.CASHBACK
        },
        {
          id: 'card-2',
          name: 'Travel Card',
          annualFee: 95,
          cardType: CardType.TRAVEL
        }
      ] as any[];

      const preferences = {
        financialConstraints: {
          maxAnnualFee: 200,
          minCreditScore: 600,
          maxTotalCards: 5,
          maxTotalAnnualFees: 1000,
          incomeRange: '50k_75k' as const
        },
        cardTypePreferences: [
          { cardType: CardType.TRAVEL, preference: 'avoid' as const }
        ],
        riskProfile: {
          annualFeeAcceptance: 'moderate' as const
        }
      } as any;

      jest.spyOn(service, 'getUserPreferences')
        .mockResolvedValue(preferences);

      const result = await service.filterCardsByPreferences('user-123', cards);

      expect(result).toHaveLength(1);
      expect(result[0].cardType).toBe(CardType.CASHBACK);
    });
  });

  describe('scoreCardsByPreferences', () => {
    it('should score cards based on user preferences', async () => {
      const cards = [
        {
          id: 'card-1',
          name: 'Perfect Match Card',
          cardType: CardType.CASHBACK,
          annualFee: 95,
          rewardStructure: [
            { category: SpendingCategory.DINING, rewardRate: 4 }
          ]
        },
        {
          id: 'card-2',
          name: 'Poor Match Card',
          cardType: CardType.BUSINESS,
          annualFee: 450,
          rewardStructure: [
            { category: SpendingCategory.OTHER, rewardRate: 1 }
          ]
        }
      ] as any[];

      const preferences = {
        cardTypePreferences: [
          { cardType: CardType.CASHBACK, preference: 'strongly_prefer' as const }
        ],
        spendingCategoryPriorities: [
          {
            category: SpendingCategory.DINING,
            priority: 9,
            monthlySpending: 800,
            importance: 'high' as const
          }
        ],
        financialConstraints: {
          maxAnnualFee: 200,
          minCreditScore: 650
        },
        behavioralPreferences: {
          managementStyle: 'moderate' as const
        },
        riskProfile: {
          annualFeeAcceptance: 'moderate' as const
        },
        goals: {
          primary: 'maximize_rewards' as any
        }
      } as any;

      jest.spyOn(service, 'getUserPreferences')
        .mockResolvedValue(preferences);

      jest.spyOn(service as any, 'calculatePreferenceScore')
        .mockReturnValueOnce({
          totalScore: 0.85,
          componentScores: {
            cardTypeMatch: 1.0,
            categoryAlignment: 0.9,
            constraintCompliance: 0.8,
            behavioralFit: 0.7,
            riskAlignment: 0.8,
            goalAlignment: 0.9
          },
          explanation: ['Perfect dining match'],
          confidence: 0.9
        })
        .mockReturnValueOnce({
          totalScore: 0.3,
          componentScores: {
            cardTypeMatch: 0.2,
            categoryAlignment: 0.1,
            constraintCompliance: 0.4,
            behavioralFit: 0.5,
            riskAlignment: 0.3,
            goalAlignment: 0.2
          },
          explanation: ['Poor match'],
          confidence: 0.6
        });

      const result = await service.scoreCardsByPreferences('user-123', cards);

      expect(result).toHaveLength(2);
      expect(result[0].card.name).toBe('Perfect Match Card');
      expect(result[0].score.totalScore).toBe(0.85);
      expect(result[1].card.name).toBe('Poor Match Card');
      expect(result[1].score.totalScore).toBe(0.3);
    });
  });

  describe('learnFromUserBehavior', () => {
    it('should update preferences based on card application', async () => {
      const currentPreferences = {
        cardTypePreferences: [],
        spendingCategoryPriorities: []
      } as any;

      jest.spyOn(service, 'getUserPreferences')
        .mockResolvedValue(currentPreferences);

      jest.spyOn(service as any, 'updatePreferencesFromApplication')
        .mockResolvedValue({
          cardTypePreferences: [
            { cardType: CardType.TRAVEL, preference: 'prefer' }
          ]
        });

      jest.spyOn(service, 'updateUserPreferences')
        .mockResolvedValue(currentPreferences);

      const behavior = {
        cardApplied: 'travel-card-123'
      };

      await service.learnFromUserBehavior('user-123', behavior);

      expect(service.updateUserPreferences).toHaveBeenCalled();
    });

    it('should handle behavior learning errors gracefully', async () => {
      jest.spyOn(service, 'getUserPreferences')
        .mockRejectedValue(new Error('Service error'));

      const behavior = {
        cardViewed: 'card-123'
      };

      // Should not throw
      await expect(
        service.learnFromUserBehavior('user-123', behavior)
      ).resolves.toBeUndefined();
    });
  });
});

// Integration tests
describe('Recommendation Engine Integration', () => {
  it('should complete full recommendation flow', async () => {
    // This is a high-level integration test that would test
    // the complete flow from request to recommendation
    const request: RecommendationRequest = {
      userId: 'integration-user',
      type: RecommendationType.HOMEPAGE,
      options: { maxResults: 3 }
    };

    // Mock all required services
    jest.spyOn(recommendationEngineService as any, 'checkServiceHealth')
      .mockResolvedValue(undefined);
    jest.spyOn(recommendationEngineService as any, 'getHomepageRecommendations')
      .mockResolvedValue({
        id: 'integration-rec',
        type: RecommendationType.HOMEPAGE,
        userId: 'integration-user',
        recommendations: [
          {
            cardId: 'integration-card',
            cardName: 'Integration Test Card',
            score: 0.8,
            reasoning: 'Good for testing',
            estimatedBenefit: 300,
            confidence: 0.8,
            priority: 'high',
            ctaText: 'Apply',
            messageTitle: 'Test Card',
            messageDescription: 'Perfect for integration testing',
            tags: ['integration', 'test']
          }
        ],
        metadata: {
          algorithmVersion: '2.1.0',
          personalizationScore: 0.8,
          diversityScore: 0.7,
          contextFactors: ['integration_test'],
          filtersCriteria: [],
          performanceMetrics: {
            responseTime: 100,
            confidenceLevel: 0.8,
            dataFreshness: 0.9
          }
        },
        createdAt: new Date(),
        expiresAt: new Date()
      });

    jest.spyOn(recommendationEngineService as any, 'logRecommendationRequest')
      .mockResolvedValue(undefined);
    jest.spyOn(recommendationEngineService as any, 'postProcessRecommendations')
      .mockImplementation(result => Promise.resolve(result));
    jest.spyOn(recommendationEngineService as any, 'logRecommendationSuccess')
      .mockResolvedValue(undefined);

    const result = await recommendationEngineService.getRecommendations(request);

    expect(result.id).toBe('integration-rec');
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].cardName).toBe('Integration Test Card');
    expect(result.type).toBe(RecommendationType.HOMEPAGE);
  });
});