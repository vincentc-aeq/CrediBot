import express from "express";
import { AnalyticsController } from "../controllers/AnalyticsController";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();
const analyticsController = new AnalyticsController();

// Apply authentication middleware to all analytics routes
router.use(authMiddleware.authenticate);

// User spending analytics
router.get("/spending", (req, res) =>
  analyticsController.getSpendingAnalytics(req, res)
);

router.get("/spending/:userId", (req, res) =>
  analyticsController.getSpendingAnalytics(req, res)
);

// Card performance analytics
router.get("/cards/:cardId", (req, res) =>
  analyticsController.getCardPerformanceAnalytics(req, res)
);

router.get("/users/:userId/cards/:cardId", (req, res) =>
  analyticsController.getCardPerformanceAnalytics(req, res)
);

// Portfolio analytics
router.get("/portfolio", (req, res) =>
  analyticsController.getPortfolioAnalytics(req, res)
);

router.get("/users/:userId/portfolio", (req, res) =>
  analyticsController.getPortfolioAnalytics(req, res)
);

// Missed rewards analytics
router.get("/missed-rewards", (req, res) =>
  analyticsController.getMissedRewardsAnalytics(req, res)
);

router.get("/users/:userId/missed-rewards", (req, res) =>
  analyticsController.getMissedRewardsAnalytics(req, res)
);

// Dashboard analytics
router.get("/dashboard", (req, res) =>
  analyticsController.getDashboardAnalytics(req, res)
);

router.get("/dashboard/spending-categories", (req, res) =>
  analyticsController.getSpendingCategoriesAnalytics(req, res)
);

router.get("/dashboard/card-performance", (req, res) =>
  analyticsController.getCardPerformanceComparison(req, res)
);

router.get("/dashboard/optimization-opportunities", (req, res) =>
  analyticsController.getOptimizationOpportunities(req, res)
);

router.get("/dashboard/trends", (req, res) =>
  analyticsController.getTrendsAnalytics(req, res)
);

// Recent transactions with recommendations
router.get("/recent-transactions", (req, res) =>
  analyticsController.getRecentTransactionsWithRecommendations(req, res)
);

// System performance metrics (admin only)
router.get("/system", (req, res) =>
  analyticsController.getSystemPerformanceMetrics(req, res)
);

export default router;
