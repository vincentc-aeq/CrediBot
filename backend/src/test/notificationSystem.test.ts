import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  notificationService, 
  CreateNotificationRequest 
} from '../services/NotificationService';
import { notificationTriggerService } from '../services/NotificationTriggerService';
import { notificationPreferenceService } from '../services/NotificationPreferenceService';
import { notificationQueueService } from '../services/NotificationQueueService';
import { notificationAnalyticsService } from '../services/NotificationAnalyticsService';
import { 
  notificationRepository, 
  notificationPreferencesRepository, 
  notificationHistoryRepository,
  notificationQueueRepository 
} from '../repositories/NotificationRepository';
import { 
  NotificationType, 
  NotificationChannel, 
  NotificationPriority,
  NotificationStatus,
  Notification,
  NotificationPreferences
} from '../models/Notification';

// Mock repositories
jest.mock('../repositories/NotificationRepository');
jest.mock('../repositories/UserRepository');
jest.mock('../repositories/TransactionRepository');

const mockNotificationRepository = notificationRepository as jest.Mocked<typeof notificationRepository>;
const mockNotificationPreferencesRepository = notificationPreferencesRepository as jest.Mocked<typeof notificationPreferencesRepository>;
const mockNotificationHistoryRepository = notificationHistoryRepository as jest.Mocked<typeof notificationHistoryRepository>;

describe('Notification System Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('NotificationService', () => {
    describe('createNotification', () => {
      test('should create notification successfully', async () => {
        const mockNotification: Notification = {
          id: 'notif_123',
          userId: 'user_123',
          type: NotificationType.TRANSACTION_SUGGESTION,
          title: 'Test Notification',
          message: 'Test message',
          data: { metadata: { testData: true } },
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.PENDING,
          priority: NotificationPriority.MEDIUM,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const mockPreferences: NotificationPreferences = {
          id: 'pref_123',
          userId: 'user_123',
          transactionSuggestions: {
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            minimumBenefit: 5,
            frequency: 'immediate'
          },
          portfolioOptimization: {
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            frequency: 'weekly'
          },
          spendingAlerts: {
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            thresholds: {
              dailyLimit: 500,
              monthlyLimit: 3000,
              categoryLimits: {}
            }
          },
          rewardMilestones: {
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            milestones: [100, 250, 500, 1000]
          },
          systemNotifications: {
            enabled: true,
            channels: [NotificationChannel.IN_APP]
          },
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '08:00',
            timezone: 'Asia/Taipei'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockNotificationPreferencesRepository.findByUserId.mockResolvedValue(mockPreferences);
        mockNotificationRepository.create.mockResolvedValue(mockNotification);
        mockNotificationHistoryRepository.logAction.mockResolvedValue({} as any);

        const request: CreateNotificationRequest = {
          userId: 'user_123',
          type: NotificationType.TRANSACTION_SUGGESTION,
          title: 'Test Notification',
          message: 'Test message',
          data: { metadata: { testData: true } },
          channel: NotificationChannel.IN_APP,
          priority: NotificationPriority.MEDIUM
        };

        const notificationId = await notificationService.createNotification(request);

        expect(notificationId).toBe('notif_123');
        expect(mockNotificationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user_123',
            type: NotificationType.TRANSACTION_SUGGESTION,
            title: 'Test Notification',
            message: 'Test message',
            channel: NotificationChannel.IN_APP,
            priority: NotificationPriority.MEDIUM
          })
        );
      });

      test('should not create notification when disabled in preferences', async () => {
        const mockPreferences: NotificationPreferences = {
          id: 'pref_123',
          userId: 'user_123',
          transactionSuggestions: {
            enabled: false, // Disabled
            channels: [NotificationChannel.IN_APP],
            minimumBenefit: 5,
            frequency: 'immediate'
          },
          portfolioOptimization: {
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            frequency: 'weekly'
          },
          spendingAlerts: {
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            thresholds: {
              dailyLimit: 500,
              monthlyLimit: 3000,
              categoryLimits: {}
            }
          },
          rewardMilestones: {
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            milestones: [100, 250, 500, 1000]
          },
          systemNotifications: {
            enabled: true,
            channels: [NotificationChannel.IN_APP]
          },
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '08:00',
            timezone: 'Asia/Taipei'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockNotificationPreferencesRepository.findByUserId.mockResolvedValue(mockPreferences);

        const request: CreateNotificationRequest = {
          userId: 'user_123',
          type: NotificationType.TRANSACTION_SUGGESTION,
          title: 'Test Notification',
          message: 'Test message',
          channel: NotificationChannel.IN_APP
        };

        const notificationId = await notificationService.createNotification(request);

        expect(notificationId).toBe('');
        expect(mockNotificationRepository.create).not.toHaveBeenCalled();
      });
    });

    describe('getUserNotifications', () => {
      test('should return user notifications with counts', async () => {
        const mockNotifications: Notification[] = [
          {
            id: 'notif_1',
            userId: 'user_123',
            type: NotificationType.TRANSACTION_SUGGESTION,
            title: 'Notification 1',
            message: 'Message 1',
            data: {},
            channel: NotificationChannel.IN_APP,
            status: NotificationStatus.SENT,
            priority: NotificationPriority.MEDIUM,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];

        mockNotificationRepository.findByUserId.mockResolvedValue(mockNotifications);
        mockNotificationRepository.getUnreadCount.mockResolvedValue(5);

        const result = await notificationService.getUserNotifications('user_123', {
          limit: 10,
          unreadOnly: false
        });

        expect(result.notifications).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(result.unreadCount).toBe(5);
        expect(mockNotificationRepository.findByUserId).toHaveBeenCalledWith(
          'user_123',
          { limit: 10, unreadOnly: false }
        );
      });
    });

    describe('markAsRead', () => {
      test('should mark notification as read successfully', async () => {
        mockNotificationRepository.markAsRead.mockResolvedValue(true);
        mockNotificationHistoryRepository.logAction.mockResolvedValue({} as any);

        const result = await notificationService.markAsRead('notif_123', 'user_123');

        expect(result).toBe(true);
        expect(mockNotificationRepository.markAsRead).toHaveBeenCalledWith('notif_123', 'user_123');
        expect(mockNotificationHistoryRepository.logAction).toHaveBeenCalled();
      });
    });
  });

  describe('NotificationTriggerService', () => {
    describe('handleTransactionTrigger', () => {
      test('should handle transaction trigger when preferences enabled', async () => {
        const mockPreferences: NotificationPreferences = {
          id: 'pref_123',
          userId: 'user_123',
          transactionSuggestions: {
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            minimumBenefit: 5,
            frequency: 'immediate'
          },
          portfolioOptimization: {
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            frequency: 'weekly'
          },
          spendingAlerts: {
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            thresholds: {
              dailyLimit: 500,
              monthlyLimit: 3000,
              categoryLimits: {}
            }
          },
          rewardMilestones: {
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            milestones: [100, 250, 500, 1000]
          },
          systemNotifications: {
            enabled: true,
            channels: [NotificationChannel.IN_APP]
          },
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '08:00',
            timezone: 'Asia/Taipei'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockNotificationPreferencesRepository.findByUserId.mockResolvedValue(mockPreferences);

        // Mock the transaction recommendation service
        const mockRecommendation = {
          id: 'rec_123',
          type: 'TRANSACTION_TRIGGERED',
          userId: 'user_123',
          recommendations: [
            {
              cardId: 'card_123',
              cardName: 'Test Card',
              score: 0.8,
              reasoning: 'Better rewards',
              estimatedBenefit: 10,
              confidence: 0.8,
              priority: 'high',
              ctaText: 'Apply Now',
              messageTitle: 'Better Card Available',
              messageDescription: 'You could earn more rewards',
              tags: ['transaction']
            }
          ],
          metadata: {},
          createdAt: new Date(),
          expiresAt: new Date()
        };

        // Mock transaction recommendation service - simplified for test
        const mockTransactionRecommendationService = {
          analyzeTransactionAndRecommend: jest.fn().mockResolvedValue(mockRecommendation)
        };

        const result = await notificationTriggerService.handleTransactionTrigger(
          'txn_123',
          'user_123'
        );

        expect(result.triggered).toBe(true);
        expect(result.notifications.length).toBeGreaterThan(0);
      });

      test('should not trigger when preferences disabled', async () => {
        const mockPreferences: NotificationPreferences = {
          id: 'pref_123',
          userId: 'user_123',
          transactionSuggestions: {
            enabled: false, // Disabled
            channels: [NotificationChannel.IN_APP],
            minimumBenefit: 5,
            frequency: 'immediate'
          },
          portfolioOptimization: {
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            frequency: 'weekly'
          },
          spendingAlerts: {
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            thresholds: {
              dailyLimit: 500,
              monthlyLimit: 3000,
              categoryLimits: {}
            }
          },
          rewardMilestones: {
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            milestones: [100, 250, 500, 1000]
          },
          systemNotifications: {
            enabled: true,
            channels: [NotificationChannel.IN_APP]
          },
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '08:00',
            timezone: 'Asia/Taipei'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockNotificationPreferencesRepository.findByUserId.mockResolvedValue(mockPreferences);

        const result = await notificationTriggerService.handleTransactionTrigger(
          'txn_123',
          'user_123'
        );

        expect(result.triggered).toBe(false);
        expect(result.notifications).toHaveLength(0);
        expect(result.recommendations).toHaveLength(0);
      });
    });

    describe('handleSpendingAlertTrigger', () => {
      test('should create spending alert when threshold exceeded', async () => {
        const mockPreferences: NotificationPreferences = {
          id: 'pref_123',
          userId: 'user_123',
          transactionSuggestions: {
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            minimumBenefit: 5,
            frequency: 'immediate'
          },
          portfolioOptimization: {
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            frequency: 'weekly'
          },
          spendingAlerts: {
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            thresholds: {
              dailyLimit: 500,
              monthlyLimit: 1000, // Low threshold for testing
              categoryLimits: { dining: 200 }
            }
          },
          rewardMilestones: {
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            milestones: [100, 250, 500, 1000]
          },
          systemNotifications: {
            enabled: true,
            channels: [NotificationChannel.IN_APP]
          },
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '08:00',
            timezone: 'Asia/Taipei'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockNotificationPreferencesRepository.findByUserId.mockResolvedValue(mockPreferences);

        const mockNotification: Notification = {
          id: 'notif_alert_123',
          userId: 'user_123',
          type: NotificationType.SPENDING_ALERT,
          title: 'Spending Alert',
          message: 'Your monthly spending has exceeded the set limit of $1000',
          data: {},
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.PENDING,
          priority: NotificationPriority.HIGH,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Mock notification service creation - simplified for test
        const mockNotificationServiceCreate = jest.fn().mockResolvedValue('notif_alert_123');

        const result = await notificationTriggerService.handleSpendingAlertTrigger(
          'user_123',
          'dining' as any,
          100,
          1500 // Exceeds monthly limit
        );

        expect(result).toBe('notif_alert_123');
      });
    });
  });

  describe('NotificationPreferenceService', () => {
    describe('updateUserPreferences', () => {
      test('should update user preferences successfully', async () => {
        const existingPreferences: NotificationPreferences = {
          id: 'pref_123',
          userId: 'user_123',
          transactionSuggestions: {
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            minimumBenefit: 5,
            frequency: 'immediate'
          },
          portfolioOptimization: {
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            frequency: 'weekly'
          },
          spendingAlerts: {
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            thresholds: {
              dailyLimit: 500,
              monthlyLimit: 3000,
              categoryLimits: {}
            }
          },
          rewardMilestones: {
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            milestones: [100, 250, 500, 1000]
          },
          systemNotifications: {
            enabled: true,
            channels: [NotificationChannel.IN_APP]
          },
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '08:00',
            timezone: 'Asia/Taipei'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const updatedPreferences: NotificationPreferences = {
          ...existingPreferences,
          transactionSuggestions: {
            ...existingPreferences.transactionSuggestions,
            minimumBenefit: 10 // Updated value
          },
          updatedAt: new Date()
        };

        mockNotificationPreferencesRepository.findByUserId.mockResolvedValue(existingPreferences);
        mockNotificationPreferencesRepository.upsert.mockResolvedValue(updatedPreferences);

        const result = await notificationPreferenceService.updateUserPreferences(
          'user_123',
          {
            transactionSuggestions: {
              ...existingPreferences.transactionSuggestions,
              minimumBenefit: 10
            }
          }
        );

        expect(result.transactionSuggestions.minimumBenefit).toBe(10);
        expect(mockNotificationPreferencesRepository.upsert).toHaveBeenCalled();
      });
    });

    describe('handleNotificationDismissal', () => {
      test('should learn from dismissal and update preferences', async () => {
        const mockNotification: Notification = {
          id: 'notif_123',
          userId: 'user_123',
          type: NotificationType.TRANSACTION_SUGGESTION,
          title: 'Test Notification',
          message: 'Test message',
          data: {},
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.SENT,
          priority: NotificationPriority.MEDIUM,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockNotificationRepository.findById.mockResolvedValue(mockNotification);
        mockNotificationHistoryRepository.logAction.mockResolvedValue({} as any);

        const result = await notificationPreferenceService.handleNotificationDismissal(
          'notif_123',
          'user_123',
          {
            reason: 'too_frequent',
            feedback: 'Getting too many notifications'
          }
        );

        expect(result.suggestedChanges.length).toBeGreaterThan(0);
        expect(mockNotificationHistoryRepository.logAction).toHaveBeenCalled();
      });
    });
  });

  describe('NotificationQueueService', () => {
    describe('enqueueNotification', () => {
      test('should enqueue notification successfully', async () => {
        const mockNotification: Notification = {
          id: 'notif_123',
          userId: 'user_123',
          type: NotificationType.TRANSACTION_SUGGESTION,
          title: 'Test Notification',
          message: 'Test message',
          data: {},
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.PENDING,
          priority: NotificationPriority.MEDIUM,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockNotificationRepository.findById.mockResolvedValue(mockNotification);

        // Mock Redis operations (would need proper Redis mock in real implementation)
        await expect(
          notificationQueueService.enqueueNotification(
            'notif_123',
            NotificationPriority.HIGH
          )
        ).resolves.not.toThrow();
      });
    });
  });

  describe('NotificationAnalyticsService', () => {
    describe('getUserNotificationAnalytics', () => {
      test('should return user analytics', async () => {
        const mockStats = {
          total: 100,
          read: 60,
          dismissed: 10,
          byType: {
            [NotificationType.TRANSACTION_SUGGESTION]: 50,
            [NotificationType.REWARD_MILESTONE]: 30
          },
          byChannel: {
            [NotificationChannel.IN_APP]: 80,
            [NotificationChannel.PUSH]: 20
          }
        };

        const mockActionStats = {
          [NotificationAction.CREATED]: 100,
          [NotificationAction.SENT]: 100,
          [NotificationAction.DELIVERED]: 95,
          [NotificationAction.READ]: 60,
          [NotificationAction.CLICKED]: 15,
          [NotificationAction.DISMISSED]: 10,
          [NotificationAction.EXPIRED]: 5,
          [NotificationAction.FAILED]: 5
        };

        mockNotificationRepository.getNotificationStats.mockResolvedValue(mockStats);
        mockNotificationHistoryRepository.getUserActionStats.mockResolvedValue(mockActionStats);

        const analytics = await notificationAnalyticsService.getUserNotificationAnalytics('user_123');

        expect(analytics.userId).toBe('user_123');
        expect(analytics.summary.totalSent).toBe(100);
        expect(analytics.summary.readRate).toBe(0.6);
        expect(analytics.summary.clickThroughRate).toBe(0.15);
        expect(analytics.channelBreakdown).toBeDefined();
        expect(analytics.typeBreakdown).toBeDefined();
      });
    });

    describe('generateNotificationReport', () => {
      test('should generate user report successfully', async () => {
        const mockAnalytics = {
          userId: 'user_123',
          dateRange: { start: new Date(), end: new Date() },
          summary: {
            totalSent: 100,
            readRate: 0.6,
            clickThroughRate: 0.15,
            dismissalRate: 0.1
          }
        };

        // Mock analytics service methods
        jest.spyOn(notificationAnalyticsService, 'getUserNotificationAnalytics')
          .mockResolvedValue(mockAnalytics as any);

        const report = await notificationAnalyticsService.generateNotificationReport('user_123');

        expect(report.reportId).toBeDefined();
        expect(report.scope).toBe('user');
        expect(report.keyFindings.length).toBeGreaterThan(0);
        expect(report.recommendations.length).toBeGreaterThan(0);
        expect(report.metrics).toBeDefined();
      });
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete notification workflow', async () => {
      // Test the complete flow from trigger to delivery to analytics
      
      // 1. Setup user preferences
      const preferences: NotificationPreferences = {
        id: 'pref_123',
        userId: 'user_123',
        transactionSuggestions: {
          enabled: true,
          channels: [NotificationChannel.IN_APP],
          minimumBenefit: 5,
          frequency: 'immediate'
        },
        portfolioOptimization: {
          enabled: true,
          channels: [NotificationChannel.IN_APP],
          frequency: 'weekly'
        },
        spendingAlerts: {
          enabled: true,
          channels: [NotificationChannel.IN_APP],
          thresholds: {
            dailyLimit: 500,
            monthlyLimit: 3000,
            categoryLimits: {}
          }
        },
        rewardMilestones: {
          enabled: true,
          channels: [NotificationChannel.IN_APP],
          milestones: [100, 250, 500, 1000]
        },
        systemNotifications: {
          enabled: true,
          channels: [NotificationChannel.IN_APP]
        },
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'Asia/Taipei'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockNotificationPreferencesRepository.findByUserId.mockResolvedValue(preferences);

      // 2. Create notification
      const mockNotification: Notification = {
        id: 'notif_123',
        userId: 'user_123',
        type: NotificationType.TRANSACTION_SUGGESTION,
        title: 'Better Card Available',
        message: 'You could earn more rewards with this card',
        data: { cardId: 'card_123', metadata: { benefit: 15 } },
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.PENDING,
        priority: NotificationPriority.HIGH,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockNotificationRepository.create.mockResolvedValue(mockNotification);
      mockNotificationHistoryRepository.logAction.mockResolvedValue({} as any);

      const notificationId = await notificationService.createNotification({
        userId: 'user_123',
        type: NotificationType.TRANSACTION_SUGGESTION,
        title: 'Better Card Available',
        message: 'You could earn more rewards with this card',
        data: { cardId: 'card_123', metadata: { benefit: 15 } },
        channel: NotificationChannel.IN_APP,
        priority: NotificationPriority.HIGH
      });

      expect(notificationId).toBe('notif_123');

      // 3. Mark as read
      mockNotificationRepository.markAsRead.mockResolvedValue(true);
      
      const readResult = await notificationService.markAsRead('notif_123', 'user_123');
      expect(readResult).toBe(true);

      // 4. Get user notifications
      mockNotificationRepository.findByUserId.mockResolvedValue([mockNotification]);
      mockNotificationRepository.getUnreadCount.mockResolvedValue(0);

      const userNotifications = await notificationService.getUserNotifications('user_123');
      expect(userNotifications.notifications).toHaveLength(1);
      expect(userNotifications.unreadCount).toBe(0);
    });

    test('should handle notification dismissal and learning', async () => {
      const mockNotification: Notification = {
        id: 'notif_123',
        userId: 'user_123',
        type: NotificationType.TRANSACTION_SUGGESTION,
        title: 'Test Notification',
        message: 'Test message',
        data: {},
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        priority: NotificationPriority.MEDIUM,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockNotificationRepository.findById.mockResolvedValue(mockNotification);
      mockNotificationRepository.dismissNotification.mockResolvedValue(true);
      mockNotificationHistoryRepository.logAction.mockResolvedValue({} as any);

      // Dismiss notification
      const dismissResult = await notificationService.dismissNotification('notif_123', 'user_123');
      expect(dismissResult).toBe(true);

      // Handle dismissal learning
      const learningResult = await notificationPreferenceService.handleNotificationDismissal(
        'notif_123',
        'user_123',
        { reason: 'not_interested' }
      );

      expect(learningResult).toBeDefined();
      expect(mockNotificationHistoryRepository.logAction).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle notification creation errors gracefully', async () => {
      mockNotificationRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(
        notificationService.createNotification({
          userId: 'user_123',
          type: NotificationType.TRANSACTION_SUGGESTION,
          title: 'Test',
          message: 'Test message',
          channel: NotificationChannel.IN_APP
        })
      ).rejects.toThrow('Database error');
    });

    test('should handle missing notification gracefully', async () => {
      mockNotificationRepository.findById.mockResolvedValue(undefined);

      const result = await notificationService.markAsRead('nonexistent', 'user_123');
      expect(result).toBe(false);
    });

    test('should handle analytics errors gracefully', async () => {
      mockNotificationRepository.getNotificationStats.mockRejectedValue(new Error('Stats error'));

      await expect(
        notificationAnalyticsService.getUserNotificationAnalytics('user_123')
      ).rejects.toThrow('Stats error');
    });
  });

  describe('Performance Tests', () => {
    test('should handle batch notification creation efficiently', async () => {
      const batchSize = 100;
      const notifications = Array.from({ length: batchSize }, (_, i) => ({
        notificationId: `notif_${i}`,
        priority: NotificationPriority.MEDIUM
      }));

      mockNotificationRepository.findById.mockImplementation((id) =>
        Promise.resolve({
          id,
          userId: 'user_123',
          type: NotificationType.TRANSACTION_SUGGESTION,
          title: 'Test',
          message: 'Test',
          data: {},
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.PENDING,
          priority: NotificationPriority.MEDIUM,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      );

      const startTime = Date.now();
      const result = await notificationQueueService.enqueueBatch(notifications);
      const endTime = Date.now();

      expect(result.enqueued).toBe(batchSize);
      expect(result.failed).toBe(0);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});