import express from 'express';
import { creditCardController } from '../controllers/CreditCardController';
import { authMiddleware } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// 公開路由 - 不需要認證
/**
 * @route   GET /api/cards
 * @desc    獲取所有信用卡（支持搜索和篩選）
 * @access  Public
 */
router.get('/', rateLimiter.generalLimiter, creditCardController.getAllCards);

/**
 * @route   GET /api/cards/:cardId
 * @desc    根據ID獲取信用卡詳情
 * @access  Public
 */
router.get('/:cardId', rateLimiter.generalLimiter, creditCardController.getCardById);

/**
 * @route   GET /api/cards/type/:cardType
 * @desc    根據卡片類型獲取信用卡
 * @access  Public
 */
router.get('/type/:cardType', rateLimiter.generalLimiter, creditCardController.getCardsByType);

/**
 * @route   GET /api/cards/issuer/:issuer
 * @desc    根據發行商獲取信用卡
 * @access  Public
 */
router.get('/issuer/:issuer', rateLimiter.generalLimiter, creditCardController.getCardsByIssuer);

/**
 * @route   GET /api/cards/filter/no-annual-fee
 * @desc    獲取無年費信用卡
 * @access  Public
 */
router.get('/filter/no-annual-fee', rateLimiter.generalLimiter, creditCardController.getNoAnnualFeeCards);

// 需要認證的路由
router.use(authMiddleware.authenticate);

// 用戶卡片管理路由
/**
 * @route   GET /api/cards/user/my-cards
 * @desc    獲取用戶的所有信用卡
 * @access  Private
 */
router.get('/user/my-cards', rateLimiter.generalLimiter, creditCardController.getUserCards);

/**
 * @route   POST /api/cards/user/add
 * @desc    為用戶添加信用卡
 * @access  Private
 */
router.post('/user/add', rateLimiter.generalLimiter, creditCardController.addUserCard);

/**
 * @route   PUT /api/cards/user/:cardId
 * @desc    更新用戶信用卡信息
 * @access  Private
 */
router.put('/user/:cardId', rateLimiter.generalLimiter, creditCardController.updateUserCard);

/**
 * @route   DELETE /api/cards/user/:cardId
 * @desc    刪除用戶信用卡
 * @access  Private
 */
router.delete('/user/:cardId', rateLimiter.generalLimiter, creditCardController.removeUserCard);

/**
 * @route   POST /api/cards/user/:cardId/set-primary
 * @desc    設置主要信用卡
 * @access  Private
 */
router.post('/user/:cardId/set-primary', rateLimiter.generalLimiter, creditCardController.setPrimaryCard);

/**
 * @route   PUT /api/cards/user/:cardId/balance
 * @desc    更新卡片餘額
 * @access  Private
 */
router.put('/user/:cardId/balance', rateLimiter.generalLimiter, creditCardController.updateCardBalance);

/**
 * @route   POST /api/cards/user/batch-update-balances
 * @desc    批量更新卡片餘額
 * @access  Private
 */
router.post('/user/batch-update-balances', rateLimiter.generalLimiter, creditCardController.batchUpdateBalances);

/**
 * @route   GET /api/cards/user/portfolio
 * @desc    獲取用戶卡片組合概況
 * @access  Private
 */
router.get('/user/portfolio', rateLimiter.generalLimiter, creditCardController.getUserCardPortfolio);

/**
 * @route   GET /api/cards/user/stats
 * @desc    獲取用戶卡片統計
 * @access  Private
 */
router.get('/user/stats', rateLimiter.generalLimiter, creditCardController.getUserCardStats);

// 管理員路由 - 需要管理員權限
// 注意：這裡應該添加管理員權限中間件，目前暫時使用認證中間件

/**
 * @route   POST /api/cards/admin/create
 * @desc    創建新信用卡 (管理員)
 * @access  Private (Admin)
 */
router.post('/admin/create', rateLimiter.strictLimiter, creditCardController.createCard);

/**
 * @route   PUT /api/cards/admin/:cardId
 * @desc    更新信用卡 (管理員)
 * @access  Private (Admin)
 */
router.put('/admin/:cardId', rateLimiter.strictLimiter, creditCardController.updateCard);

/**
 * @route   DELETE /api/cards/admin/:cardId
 * @desc    刪除信用卡 (管理員)
 * @access  Private (Admin)
 */
router.delete('/admin/:cardId', rateLimiter.strictLimiter, creditCardController.deleteCard);

/**
 * @route   GET /api/cards/admin/statistics
 * @desc    獲取卡片統計 (管理員)
 * @access  Private (Admin)
 */
router.get('/admin/statistics', rateLimiter.generalLimiter, creditCardController.getCardStatistics);

export default router;