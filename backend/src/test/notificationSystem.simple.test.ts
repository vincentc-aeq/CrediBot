import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { 
  NotificationType, 
  NotificationChannel, 
  NotificationPriority,
  NotificationStatus,
  NotificationAction,
  Notification,
  NotificationPreferences
} from '../models/Notification';

// Simple unit tests for notification system
describe('Notification System - Simple Tests', () => {
  describe('Notification Models', () => {
    test('should create notification object correctly', () => {
      const notification: Notification = {
        id: 'notif_123',
        userId: 'user_123',
        type: NotificationType.TRANSACTION_SUGGESTION,
        title: 'Test Notification',
        message: 'Test message',
        data: { cardId: 'card_123' },
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.PENDING,
        priority: NotificationPriority.MEDIUM,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(notification.id).toBe('notif_123');
      expect(notification.type).toBe(NotificationType.TRANSACTION_SUGGESTION);
      expect(notification.channel).toBe(NotificationChannel.IN_APP);
      expect(notification.priority).toBe(NotificationPriority.MEDIUM);
    });

    test('should create notification preferences correctly', () => {
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

      expect(preferences.userId).toBe('user_123');
      expect(preferences.transactionSuggestions.enabled).toBe(true);
      expect(preferences.transactionSuggestions.minimumBenefit).toBe(5);
      expect(preferences.quietHours.enabled).toBe(false);
    });
  });

  describe('Notification Enums', () => {
    test('should have correct notification types', () => {
      expect(NotificationType.TRANSACTION_SUGGESTION).toBe('transaction_suggestion');
      expect(NotificationType.CARD_RECOMMENDATION).toBe('card_recommendation');
      expect(NotificationType.SPENDING_ALERT).toBe('spending_alert');
      expect(NotificationType.REWARD_MILESTONE).toBe('reward_milestone');
      expect(NotificationType.PORTFOLIO_OPTIMIZATION).toBe('portfolio_optimization');
      expect(NotificationType.SYSTEM_ANNOUNCEMENT).toBe('system_announcement');
      expect(NotificationType.SECURITY_ALERT).toBe('security_alert');
    });

    test('should have correct notification channels', () => {
      expect(NotificationChannel.IN_APP).toBe('in_app');
      expect(NotificationChannel.PUSH).toBe('push');
      expect(NotificationChannel.EMAIL).toBe('email');
      expect(NotificationChannel.SMS).toBe('sms');
      expect(NotificationChannel.WEBHOOK).toBe('webhook');
    });

    test('should have correct notification statuses', () => {
      expect(NotificationStatus.PENDING).toBe('pending');
      expect(NotificationStatus.SENT).toBe('sent');
      expect(NotificationStatus.DELIVERED).toBe('delivered');
      expect(NotificationStatus.READ).toBe('read');
      expect(NotificationStatus.DISMISSED).toBe('dismissed');
      expect(NotificationStatus.FAILED).toBe('failed');
      expect(NotificationStatus.EXPIRED).toBe('expired');
    });

    test('should have correct notification priorities', () => {
      expect(NotificationPriority.LOW).toBe('low');
      expect(NotificationPriority.MEDIUM).toBe('medium');
      expect(NotificationPriority.HIGH).toBe('high');
      expect(NotificationPriority.URGENT).toBe('urgent');
    });

    test('should have correct notification actions', () => {
      expect(NotificationAction.CREATED).toBe('created');
      expect(NotificationAction.SENT).toBe('sent');
      expect(NotificationAction.DELIVERED).toBe('delivered');
      expect(NotificationAction.READ).toBe('read');
      expect(NotificationAction.CLICKED).toBe('clicked');
      expect(NotificationAction.DISMISSED).toBe('dismissed');
      expect(NotificationAction.EXPIRED).toBe('expired');
      expect(NotificationAction.FAILED).toBe('failed');
    });
  });

  describe('Notification Logic', () => {
    test('should prioritize urgent notifications correctly', () => {
      const priorities = [
        NotificationPriority.LOW,
        NotificationPriority.MEDIUM,
        NotificationPriority.HIGH,
        NotificationPriority.URGENT
      ];

      const priorityValues = {
        [NotificationPriority.LOW]: 1,
        [NotificationPriority.MEDIUM]: 2,
        [NotificationPriority.HIGH]: 3,
        [NotificationPriority.URGENT]: 4
      };

      // Test priority ordering
      expect(priorityValues[NotificationPriority.URGENT]).toBeGreaterThan(
        priorityValues[NotificationPriority.HIGH]
      );
      expect(priorityValues[NotificationPriority.HIGH]).toBeGreaterThan(
        priorityValues[NotificationPriority.MEDIUM]
      );
      expect(priorityValues[NotificationPriority.MEDIUM]).toBeGreaterThan(
        priorityValues[NotificationPriority.LOW]
      );
    });

    test('should validate notification preferences structure', () => {
      const isValidPreferences = (prefs: NotificationPreferences): boolean => {
        return !!(
          prefs.userId &&
          prefs.transactionSuggestions &&
          prefs.portfolioOptimization &&
          prefs.spendingAlerts &&
          prefs.rewardMilestones &&
          prefs.systemNotifications &&
          prefs.quietHours
        );
      };

      const validPreferences: NotificationPreferences = {
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

      expect(isValidPreferences(validPreferences)).toBe(true);
    });

    test('should handle quiet hours logic correctly', () => {
      const isInQuietHours = (
        quietHours: { enabled: boolean; startTime: string; endTime: string },
        currentTime: { hour: number; minute: number }
      ): boolean => {
        if (!quietHours.enabled) return false;

        const [startHour, startMin] = quietHours.startTime.split(':').map(Number);
        const [endHour, endMin] = quietHours.endTime.split(':').map(Number);
        
        const currentMinutes = currentTime.hour * 60 + currentTime.minute;
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        if (startMinutes <= endMinutes) {
          return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
        } else {
          // Spans midnight
          return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
        }
      };

      const quietHours = {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00'
      };

      // Test time within quiet hours
      expect(isInQuietHours(quietHours, { hour: 23, minute: 30 })).toBe(true);
      expect(isInQuietHours(quietHours, { hour: 2, minute: 0 })).toBe(true);
      expect(isInQuietHours(quietHours, { hour: 7, minute: 59 })).toBe(true);

      // Test time outside quiet hours
      expect(isInQuietHours(quietHours, { hour: 10, minute: 0 })).toBe(false);
      expect(isInQuietHours(quietHours, { hour: 14, minute: 30 })).toBe(false);

      // Test with disabled quiet hours
      const disabledQuietHours = { ...quietHours, enabled: false };
      expect(isInQuietHours(disabledQuietHours, { hour: 23, minute: 30 })).toBe(false);
    });

    test('should calculate notification effectiveness correctly', () => {
      const calculateEffectiveness = (stats: {
        sent: number;
        read: number;
        clicked: number;
        dismissed: number;
      }): number => {
        if (stats.sent === 0) return 0;
        
        const readRate = stats.read / stats.sent;
        const clickRate = stats.clicked / stats.sent;
        const dismissalRate = stats.dismissed / stats.sent;
        
        // Simple effectiveness formula
        return (readRate * 0.4 + clickRate * 0.5 - dismissalRate * 0.3);
      };

      const goodStats = { sent: 100, read: 80, clicked: 20, dismissed: 5 };
      const poorStats = { sent: 100, read: 30, clicked: 2, dismissed: 50 };

      expect(calculateEffectiveness(goodStats)).toBeGreaterThan(
        calculateEffectiveness(poorStats)
      );
      expect(calculateEffectiveness({ sent: 0, read: 0, clicked: 0, dismissed: 0 })).toBe(0);
    });
  });

  describe('Notification Data Structures', () => {
    test('should handle notification data correctly', () => {
      const transactionNotificationData = {
        cardId: 'card_123',
        transactionId: 'txn_456',
        amount: 100,
        category: 'dining',
        merchant: 'Restaurant ABC',
        potentialBenefit: 15,
        metadata: {
          triggerReason: 'better_rewards',
          confidence: 0.85
        }
      };

      expect(transactionNotificationData.cardId).toBe('card_123');
      expect(transactionNotificationData.potentialBenefit).toBe(15);
      expect(transactionNotificationData.metadata?.confidence).toBe(0.85);
    });

    test('should handle notification queue item correctly', () => {
      const queueItem = {
        id: 'queue_123',
        notificationId: 'notif_456',
        userId: 'user_789',
        channel: NotificationChannel.PUSH,
        priority: NotificationPriority.HIGH,
        scheduledAt: new Date(),
        attempts: 0,
        maxAttempts: 3,
        status: 'pending' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(queueItem.attempts).toBe(0);
      expect(queueItem.maxAttempts).toBe(3);
      expect(queueItem.status).toBe('pending');
      expect(queueItem.priority).toBe(NotificationPriority.HIGH);
    });
  });

  describe('Notification Utility Functions', () => {
    test('should generate notification IDs correctly', () => {
      const generateNotificationId = (): string => {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      };

      const id1 = generateNotificationId();
      const id2 = generateNotificationId();

      expect(id1).toMatch(/^notif_\d+_[a-z0-9]{9}$/);
      expect(id2).toMatch(/^notif_\d+_[a-z0-9]{9}$/);
      expect(id1).not.toBe(id2);
    });

    test('should validate notification channels', () => {
      const validChannels = Object.values(NotificationChannel);
      
      expect(validChannels).toContain('in_app');
      expect(validChannels).toContain('push');
      expect(validChannels).toContain('email');
      expect(validChannels).toContain('sms');
      expect(validChannels).toContain('webhook');
      expect(validChannels).toHaveLength(5);
    });

    test('should sort notifications by priority correctly', () => {
      const notifications = [
        { id: '1', priority: NotificationPriority.LOW },
        { id: '2', priority: NotificationPriority.URGENT },
        { id: '3', priority: NotificationPriority.MEDIUM },
        { id: '4', priority: NotificationPriority.HIGH }
      ];

      const priorityOrder = {
        [NotificationPriority.URGENT]: 4,
        [NotificationPriority.HIGH]: 3,
        [NotificationPriority.MEDIUM]: 2,
        [NotificationPriority.LOW]: 1
      };

      const sorted = notifications.sort((a, b) => 
        priorityOrder[b.priority] - priorityOrder[a.priority]
      );

      expect(sorted[0].priority).toBe(NotificationPriority.URGENT);
      expect(sorted[1].priority).toBe(NotificationPriority.HIGH);
      expect(sorted[2].priority).toBe(NotificationPriority.MEDIUM);
      expect(sorted[3].priority).toBe(NotificationPriority.LOW);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid notification data gracefully', () => {
      const validateNotification = (notification: Partial<Notification>): string[] => {
        const errors: string[] = [];
        
        if (!notification.userId) errors.push('userId is required');
        if (!notification.type) errors.push('type is required');
        if (!notification.title) errors.push('title is required');
        if (!notification.message) errors.push('message is required');
        if (!notification.channel) errors.push('channel is required');
        
        return errors;
      };

      const invalidNotification = {
        id: 'notif_123'
        // Missing required fields
      };

      const errors = validateNotification(invalidNotification);
      expect(errors).toContain('userId is required');
      expect(errors).toContain('type is required');
      expect(errors).toContain('title is required');
      expect(errors).toContain('message is required');
      expect(errors).toContain('channel is required');

      const validNotification = {
        userId: 'user_123',
        type: NotificationType.TRANSACTION_SUGGESTION,
        title: 'Test',
        message: 'Test message',
        channel: NotificationChannel.IN_APP
      };

      expect(validateNotification(validNotification)).toHaveLength(0);
    });
  });
});