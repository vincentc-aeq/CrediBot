import { Request, Response } from 'express';
import { userRepository } from '../repositories/UserRepository';
import { ResponseUtils } from '../utils/response';
import { AuditService } from '../services/AuditService';

export class UserPreferenceController {
  /**
   * Get user preferences
   */
  async getUserPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      
      const user = await userRepository.findById(userId);
      if (!user) {
        ResponseUtils.notFound(res, 'User not found');
        return;
      }

      // Default preferences if user doesn't have any set
      const defaultPreferences = {
        cardTypes: ['cashback', 'travel', 'business'],
        maxAnnualFee: 200,
        prioritizedCategories: ['dining', 'groceries', 'gas_stations'],
        riskTolerance: 'medium' as const,
        notificationPreferences: {
          email: true,
          push: true,
          transactionAlerts: true,
        }
      };

      const preferences = user.preferences || defaultPreferences;

      ResponseUtils.success(res, preferences);
    } catch (error) {
      console.error('Get user preferences error:', error);
      ResponseUtils.internalServerError(res, 'Failed to get user preferences');
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const preferencesData = req.body;

      const user = await userRepository.findById(userId);
      if (!user) {
        ResponseUtils.notFound(res, 'User not found');
        return;
      }

      // Merge with existing preferences
      const currentPreferences = user.preferences || {};
      const updatedPreferences = {
        ...currentPreferences,
        ...preferencesData
      };

      // Update user with new preferences
      const updatedUser = await userRepository.update(userId, {
        preferences: updatedPreferences
      });

      if (!updatedUser) {
        ResponseUtils.internalServerError(res, 'Failed to update user preferences');
        return;
      }

      // Log the preference update
      await AuditService.logAction({
        userId,
        action: 'UPDATE_PREFERENCES',
        resource: 'user_preferences',
        resourceId: userId.toString(),
        details: {
          updatedFields: Object.keys(preferencesData),
          newValues: preferencesData
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: true
      });

      ResponseUtils.success(res, updatedUser.preferences);
    } catch (error) {
      console.error('Update user preferences error:', error);
      
      // Log failed attempt
      await AuditService.logAction({
        userId: req.user?.id,
        action: 'UPDATE_PREFERENCES',
        resource: 'user_preferences',
        resourceId: req.user?.id?.toString() || 'unknown',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: false
      });

      ResponseUtils.internalServerError(res, 'Failed to update user preferences');
    }
  }
}