import express from 'express';
import { plaidController } from '../controllers/PlaidController';
import { authMiddleware } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// 所有 Plaid 路由都需要認證
router.use(authMiddleware.authenticate);

/**
 * @route   POST /api/plaid/link-token
 * @desc    創建 Link Token 用於初始化 Plaid Link
 * @access  Private
 */
router.post('/link-token', rateLimiter.generalLimiter, plaidController.createLinkToken);

/**
 * @route   POST /api/plaid/exchange-token
 * @desc    交換 Public Token 為 Access Token 並創建帳戶連結
 * @access  Private
 */
router.post('/exchange-token', rateLimiter.generalLimiter, plaidController.exchangePublicToken);

/**
 * @route   GET /api/plaid/accounts
 * @desc    獲取用戶所有連結的帳戶
 * @access  Private
 */
router.get('/accounts', rateLimiter.generalLimiter, plaidController.getLinkedAccounts);

/**
 * @route   GET /api/plaid/accounts/:accountId/balances
 * @desc    獲取特定帳戶的最新餘額
 * @access  Private
 */
router.get('/accounts/:accountId/balances', rateLimiter.generalLimiter, plaidController.getAccountBalances);

/**
 * @route   POST /api/plaid/sync-transactions
 * @desc    同步交易記錄
 * @access  Private
 */
router.post('/sync-transactions', rateLimiter.generalLimiter, plaidController.syncTransactions);

/**
 * @route   DELETE /api/plaid/items/:itemId
 * @desc    取消連結帳戶
 * @access  Private
 */
router.delete('/items/:itemId', rateLimiter.generalLimiter, plaidController.unlinkAccount);

/**
 * @route   GET /api/plaid/stats
 * @desc    獲取帳戶統計資訊
 * @access  Private
 */
router.get('/stats', rateLimiter.generalLimiter, plaidController.getAccountStats);

export default router;