import express from 'express';
import { creditCardController } from '../controllers/CreditCardController';
import { authMiddleware } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Public routes - no authentication required
/**
 * @route   GET /api/cards
 * @desc    Get all credit cards (supports search and filtering)
 * @access  Public
 */
router.get('/', rateLimiter.generalLimiter, creditCardController.getAllCards);

/**
 * @route   GET /api/cards/:cardId
 * @desc    Get credit card details by ID
 * @access  Public
 */
router.get('/:cardId', rateLimiter.generalLimiter, creditCardController.getCardById);

/**
 * @route   GET /api/cards/type/:cardType
 * @desc    Get credit cards by card type
 * @access  Public
 */
router.get('/type/:cardType', rateLimiter.generalLimiter, creditCardController.getCardsByType);

/**
 * @route   GET /api/cards/issuer/:issuer
 * @desc    Get credit cards by issuer
 * @access  Public
 */
router.get('/issuer/:issuer', rateLimiter.generalLimiter, creditCardController.getCardsByIssuer);

/**
 * @route   GET /api/cards/filter/no-annual-fee
 * @desc    Get credit cards with no annual fee
 * @access  Public
 */
router.get('/filter/no-annual-fee', rateLimiter.generalLimiter, creditCardController.getNoAnnualFeeCards);

// Authenticated routes
router.use(authMiddleware.authenticate);

// User card management routes
/**
 * @route   GET /api/cards/user/my-cards
 * @desc    Get all user's credit cards
 * @access  Private
 */
router.get('/user/my-cards', rateLimiter.generalLimiter, creditCardController.getUserCards);

/**
 * @route   POST /api/cards/user/add
 * @desc    Add credit card for user
 * @access  Private
 */
router.post('/user/add', rateLimiter.generalLimiter, creditCardController.addUserCard);

/**
 * @route   PUT /api/cards/user/:cardId
 * @desc    Update user credit card information
 * @access  Private
 */
router.put('/user/:cardId', rateLimiter.generalLimiter, creditCardController.updateUserCard);

/**
 * @route   DELETE /api/cards/user/:cardId
 * @desc    Delete user credit card
 * @access  Private
 */
router.delete('/user/:cardId', rateLimiter.generalLimiter, creditCardController.removeUserCard);

/**
 * @route   POST /api/cards/user/:cardId/set-primary
 * @desc    Set primary credit card
 * @access  Private
 */
router.post('/user/:cardId/set-primary', rateLimiter.generalLimiter, creditCardController.setPrimaryCard);

/**
 * @route   PUT /api/cards/user/:cardId/balance
 * @desc    Update card balance
 * @access  Private
 */
router.put('/user/:cardId/balance', rateLimiter.generalLimiter, creditCardController.updateCardBalance);

/**
 * @route   POST /api/cards/user/batch-update-balances
 * @desc    Batch update card balances
 * @access  Private
 */
router.post('/user/batch-update-balances', rateLimiter.generalLimiter, creditCardController.batchUpdateBalances);

/**
 * @route   GET /api/cards/user/portfolio
 * @desc    Get user card portfolio overview
 * @access  Private
 */
router.get('/user/portfolio', rateLimiter.generalLimiter, creditCardController.getUserCardPortfolio);

/**
 * @route   GET /api/cards/user/stats
 * @desc    Get user card statistics
 * @access  Private
 */
router.get('/user/stats', rateLimiter.generalLimiter, creditCardController.getUserCardStats);

// Admin routes - requires admin permissions
// Note: Should add admin permission middleware here, currently using auth middleware temporarily

/**
 * @route   POST /api/cards/admin/create
 * @desc    Create new credit card (Admin)
 * @access  Private (Admin)
 */
router.post('/admin/create', rateLimiter.strictLimiter, creditCardController.createCard);

/**
 * @route   PUT /api/cards/admin/:cardId
 * @desc    Update credit card (Admin)
 * @access  Private (Admin)
 */
router.put('/admin/:cardId', rateLimiter.strictLimiter, creditCardController.updateCard);

/**
 * @route   DELETE /api/cards/admin/:cardId
 * @desc    Delete credit card (Admin)
 * @access  Private (Admin)
 */
router.delete('/admin/:cardId', rateLimiter.strictLimiter, creditCardController.deleteCard);

/**
 * @route   GET /api/cards/admin/statistics
 * @desc    Get card statistics (Admin)
 * @access  Private (Admin)
 */
router.get('/admin/statistics', rateLimiter.generalLimiter, creditCardController.getCardStatistics);

export default router;