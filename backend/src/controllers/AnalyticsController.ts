import { Request, Response } from "express";
import { AnalyticsService } from "../services/AnalyticsService";
import { AnalyticsRequest } from "../models/Analytics";

export class AnalyticsController {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  /**
   * Get spending analytics for a user
   */
  async getSpendingAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || (req.user as any).id;
      const { timeframe = "month", startDate, endDate } = req.query;

      // Validate user access
      if (
        userId !== (req.user as any).id &&
        (req.user as any).role !== "admin"
      ) {
        res.status(403).json({
          success: false,
          message: "Unauthorized access to user analytics",
        });
        return;
      }

      const request: AnalyticsRequest = {
        userId,
        timeframe: timeframe as "day" | "week" | "month" | "quarter" | "year",
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const analytics = await this.analyticsService.getSpendingAnalytics(
        request
      );

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error("Error getting spending analytics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve spending analytics",
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get card performance analytics
   */
  async getCardPerformanceAnalytics(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.params.userId || (req.user as any).id;
      const { cardId } = req.params;
      const { timeframe = "month", startDate, endDate } = req.query;

      // Validate user access
      if (
        userId !== (req.user as any).id &&
        (req.user as any).role !== "admin"
      ) {
        res.status(403).json({
          success: false,
          message: "Unauthorized access to user analytics",
        });
        return;
      }

      if (!cardId) {
        res.status(400).json({
          success: false,
          message: "Card ID is required",
        });
        return;
      }

      const request: AnalyticsRequest = {
        userId,
        timeframe: timeframe as "day" | "week" | "month" | "quarter" | "year",
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const analytics = await this.analyticsService.getCardPerformanceAnalytics(
        request,
        cardId
      );

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error("Error getting card performance analytics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve card performance analytics",
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get portfolio analytics
   */
  async getPortfolioAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || (req.user as any).id;
      const { timeframe = "month", startDate, endDate } = req.query;

      // Validate user access
      if (
        userId !== (req.user as any).id &&
        (req.user as any).role !== "admin"
      ) {
        res.status(403).json({
          success: false,
          message: "Unauthorized access to user analytics",
        });
        return;
      }

      const request: AnalyticsRequest = {
        userId,
        timeframe: timeframe as "day" | "week" | "month" | "quarter" | "year",
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const analytics = await this.analyticsService.getPortfolioAnalytics(
        request
      );

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error("Error getting portfolio analytics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve portfolio analytics",
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get missed rewards analytics
   */
  async getMissedRewardsAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || (req.user as any).id;
      const { timeframe = "month", startDate, endDate } = req.query;

      // Validate user access
      if (
        userId !== (req.user as any).id &&
        (req.user as any).role !== "admin"
      ) {
        res.status(403).json({
          success: false,
          message: "Unauthorized access to user analytics",
        });
        return;
      }

      const request: AnalyticsRequest = {
        userId,
        timeframe: timeframe as "day" | "week" | "month" | "quarter" | "year",
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      // Get missed rewards analytics
      const missedRewards = await this.analyticsService.getMissedRewardsAnalytics(
        request
      );

      // Calculate total missed rewards
      const totalMissedRewards = missedRewards.reduce(
        (sum, opportunity) => sum + opportunity.missedAmount,
        0
      );

      const missedRewardsData = {
        totalMissedRewards,
        opportunities: missedRewards,
      };

      res.status(200).json({
        success: true,
        data: missedRewardsData,
      });
    } catch (error) {
      console.error("Error getting missed rewards analytics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve missed rewards analytics",
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get dashboard analytics
   */
  async getDashboardAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const { timeframe = "month", startDate, endDate } = req.query;

      const request: AnalyticsRequest = {
        userId,
        timeframe: timeframe as "day" | "week" | "month" | "quarter" | "year",
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const analytics = await this.analyticsService.getDashboardAnalytics(request);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error("Error getting dashboard analytics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get dashboard analytics",
      });
    }
  }

  /**
   * Get spending categories analytics
   */
  async getSpendingCategoriesAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const { timeframe = "month", startDate, endDate } = req.query;

      const request: AnalyticsRequest = {
        userId,
        timeframe: timeframe as "day" | "week" | "month" | "quarter" | "year",
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const analytics = await this.analyticsService.getSpendingCategoriesAnalytics(request);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error("Error getting spending categories analytics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get spending categories analytics",
      });
    }
  }

  /**
   * Get card performance comparison
   */
  async getCardPerformanceComparison(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const { timeframe = "month", startDate, endDate, cardIds } = req.query;

      const request: AnalyticsRequest = {
        userId,
        timeframe: timeframe as "day" | "week" | "month" | "quarter" | "year",
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        cardIds: cardIds ? (cardIds as string).split(',') : undefined,
      };

      const analytics = await this.analyticsService.getCardPerformanceComparison(request);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error("Error getting card performance comparison:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get card performance comparison",
      });
    }
  }

  /**
   * Get optimization opportunities
   */
  async getOptimizationOpportunities(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const { timeframe = "month", startDate, endDate } = req.query;

      const request: AnalyticsRequest = {
        userId,
        timeframe: timeframe as "day" | "week" | "month" | "quarter" | "year",
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const analytics = await this.analyticsService.getOptimizationOpportunities(request);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error("Error getting optimization opportunities:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get optimization opportunities",
      });
    }
  }

  /**
   * Get trends analytics
   */
  async getTrendsAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const { timeframe = "month", startDate, endDate } = req.query;

      const request: AnalyticsRequest = {
        userId,
        timeframe: timeframe as "day" | "week" | "month" | "quarter" | "year",
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const analytics = await this.analyticsService.getTrendsAnalytics(request);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error("Error getting trends analytics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get trends analytics",
      });
    }
  }

  /**
   * Get system performance metrics (admin only)
   */
  async getSystemPerformanceMetrics(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // Check if user is admin
      if ((req.user as any).role !== "admin") {
        res.status(403).json({
          success: false,
          message: "Unauthorized access to system metrics",
        });
        return;
      }

      const { timeframe = "day" } = req.query;

      const metrics = await this.analyticsService.getSystemPerformanceMetrics(
        timeframe as "hour" | "day" | "week" | "month"
      );

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      console.error("Error getting system performance metrics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve system performance metrics",
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get recent transactions with card recommendations
   */
  async getRecentTransactionsWithRecommendations(req: Request, res: Response): Promise<void> {
    try {
      console.log('=== getRecentTransactionsWithRecommendations called ===');
      const userId = (req.user as any).id;
      const { limit = 20, offset = 0 } = req.query;
      console.log(`User ID: ${userId}, Limit: ${limit}, Offset: ${offset}`);

      const transactions = await this.analyticsService.getRecentTransactionsWithRecommendations(
        userId, 
        parseInt(limit as string), 
        parseInt(offset as string)
      );

      res.status(200).json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      console.error("Error getting recent transactions with recommendations:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get recent transactions with recommendations",
        error: (error as Error).message,
      });
    }
  }
}
