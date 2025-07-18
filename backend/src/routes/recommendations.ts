import express from 'express';
import { homepageRecommendationService } from '../services/HomepageRecommendationService';
import { transactionRecommendationService } from '../services/TransactionRecommendationService';
import { dashboardRecommendationService } from '../services/DashboardRecommendationService';
import { authMiddleware } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { successResponse, errorResponse } from '../utils/response';
import { RecommendationRequest, RecommendationType } from '../services/RecommendationEngineService';

const router = express.Router();

// All recommendation routes require authentication
router.use(authMiddleware.authenticate);

/**
 * @route   GET /api/recommendations/homepage
 * @desc    Get homepage recommendation carousel
 * @access  Private
 */
router.get('/homepage', rateLimiter.generalLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const maxResults = parseInt(req.query.maxResults as string) || 6;
    const enablePersonalization = req.query.enablePersonalization !== 'false';

    const request: RecommendationRequest = {
      userId,
      type: RecommendationType.HOMEPAGE,
      options: {
        maxResults,
        enablePersonalization
      }
    };

    const recommendations = await homepageRecommendationService.getHomepageRecommendations(request);
    
    return successResponse(res, recommendations, 'Homepage recommendations retrieved successfully');
  } catch (error) {
    console.error('Error getting homepage recommendations:', error);
    return errorResponse(res, 'RECOMMENDATION_ERROR', 'Failed to get homepage recommendations', 500);
  }
});

/**
 * @route   GET /api/recommendations/homepage/layout
 * @desc    Get complete homepage layout
 * @access  Private
 */
router.get('/homepage/layout', rateLimiter.generalLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const layout = await homepageRecommendationService.generateHomepageLayout(userId);
    
    return successResponse(res, layout, 'Homepage layout retrieved successfully');
  } catch (error) {
    console.error('Error getting homepage layout:', error);
    return errorResponse(res, 'LAYOUT_ERROR', 'Failed to get homepage layout', 500);
  }
});

/**
 * @route   GET /api/recommendations/homepage/dynamic
 * @desc    Get dynamic homepage content
 * @access  Private
 */
router.get('/homepage/dynamic', rateLimiter.generalLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    
    const timeContext = {
      hour: now.getHours(),
      dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
      season: req.query.season as string || 'general'
    };

    const dynamicContent = await homepageRecommendationService.getDynamicHomepageContent(userId, timeContext);
    
    return successResponse(res, dynamicContent, 'Dynamic homepage content retrieved successfully');
  } catch (error) {
    console.error('Error getting dynamic homepage content:', error);
    return errorResponse(res, 'DYNAMIC_CONTENT_ERROR', 'Failed to get dynamic homepage content', 500);
  }
});

/**
 * @route   POST /api/recommendations/transaction-analysis
 * @desc    Transaction-based recommendation analysis
 * @access  Private
 */
router.post('/transaction-analysis', rateLimiter.generalLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const { transactionId, amount, category, merchantName } = req.body;

    if (!transactionId || !amount || !category) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Missing required transaction data', 400);
    }

    const request: RecommendationRequest = {
      userId,
      type: RecommendationType.TRANSACTION,
      context: {
        transactionId,
        amount,
        category,
        merchantName
      }
    };

    const recommendations = await transactionRecommendationService.getTransactionRecommendations(request);
    
    return successResponse(res, recommendations, 'Transaction recommendations retrieved successfully');
  } catch (error) {
    console.error('Error getting transaction recommendations:', error);
    return errorResponse(res, 'TRANSACTION_RECOMMENDATION_ERROR', 'Failed to get transaction recommendations', 500);
  }
});

/**
 * @route   GET /api/recommendations/dashboard
 * @desc    Get dashboard optimization recommendations
 * @access  Private
 */
router.get('/dashboard', rateLimiter.generalLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const timeframe = req.query.timeframe as string || '30d';

    const request: RecommendationRequest = {
      userId,
      type: RecommendationType.DASHBOARD,
      options: {
        timeframe,
        includeOptimization: true
      }
    };

    const recommendations = await dashboardRecommendationService.getDashboardRecommendations(request);
    
    return successResponse(res, recommendations, 'Dashboard recommendations retrieved successfully');
  } catch (error) {
    console.error('Error getting dashboard recommendations:', error);
    return errorResponse(res, 'DASHBOARD_RECOMMENDATION_ERROR', 'Failed to get dashboard recommendations', 500);
  }
});

/**
 * @route   GET /api/recommendations/variant/:variantId
 * @desc    Get A/B test variant recommendations
 * @access  Private
 */
router.get('/variant/:variantId', rateLimiter.generalLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const { variantId } = req.params;

    const recommendations = await homepageRecommendationService.getRecommendationVariant(userId, variantId);
    
    return successResponse(res, recommendations, `Variant ${variantId} recommendations retrieved successfully`);
  } catch (error) {
    console.error('Error getting variant recommendations:', error);
    return errorResponse(res, 'VARIANT_ERROR', 'Failed to get variant recommendations', 500);
  }
});

/**
 * @route   POST /api/recommendations/track-click
 * @desc    Track recommendation clicks
 * @access  Private
 */
router.post('/track-click', rateLimiter.generalLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const { recommendationId, cardId, position, section } = req.body;

    if (!recommendationId || !cardId) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Missing required tracking data', 400);
    }

    // Should call analytics service to record clicks
    // await analyticsService.trackRecommendationClick(userId, recommendationId, cardId, position, section);
    
    return successResponse(res, { tracked: true }, 'Click tracked successfully');
  } catch (error) {
    console.error('Error tracking recommendation click:', error);
    return errorResponse(res, 'TRACKING_ERROR', 'Failed to track click', 500);
  }
});

export default router;