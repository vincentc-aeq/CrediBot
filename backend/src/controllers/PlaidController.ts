import { Request, Response } from 'express';
import { plaidService } from '../services/PlaidService';
import { plaidItemRepository } from '../repositories/PlaidItemRepository';
import { plaidAccountRepository } from '../repositories/PlaidAccountRepository';
import { transactionRepository } from '../repositories/TransactionRepository';
import { successResponse, errorResponse } from '../utils/response';
import { ValidationError } from '../utils/errors';
import { SpendingCategory } from '../models/types';

export class PlaidController {
  /**
   * 創建 Link Token
   */
  async createLinkToken(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.user!;
      
      const linkToken = await plaidService.createLinkToken({
        userId,
        clientName: 'CrediBot',
        products: ['transactions', 'auth', 'identity'],
        countryCodes: ['US', 'CA'],
        language: 'en',
      });

      res.json(successResponse('Link token created successfully', { linkToken }));
    } catch (error) {
      console.error('Error creating link token:', error);
      res.status(500).json(errorResponse('Failed to create link token'));
    }
  }

  /**
   * 交換 Public Token
   */
  async exchangePublicToken(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.user!;
      const { publicToken, metadata } = req.body;

      if (!publicToken) {
        res.status(400).json(errorResponse('Public token is required'));
        return;
      }

      // 交換 access token
      const accessToken = await plaidService.exchangePublicToken(publicToken);

      // 獲取帳戶資訊
      const accounts = await plaidService.getAccounts(accessToken);

      // 創建 Plaid Item 記錄
      const plaidItem = await plaidItemRepository.create({
        userId,
        itemId: metadata.item_id,
        accessToken,
        institutionId: metadata.institution.institution_id,
        institutionName: metadata.institution.name,
        availableProducts: metadata.products || [],
        billedProducts: metadata.products || [],
      });

      // 創建帳戶記錄
      const createdAccounts = [];
      for (const account of accounts) {
        const createdAccount = await plaidAccountRepository.create({
          userId,
          plaidItemId: plaidItem.id,
          accountId: account.accountId,
          name: account.name,
          officialName: account.officialName,
          type: account.type,
          subtype: account.subtype,
          mask: account.mask,
          balanceAvailable: account.balances.available,
          balanceCurrent: account.balances.current,
          balanceLimit: account.balances.limit,
          isoCurrencyCode: account.balances.isoCurrencyCode,
        });
        createdAccounts.push(createdAccount);
      }

      res.json(successResponse('Account linked successfully', {
        item: plaidItem,
        accounts: createdAccounts,
      }));
    } catch (error) {
      console.error('Error exchanging public token:', error);
      res.status(500).json(errorResponse('Failed to link account'));
    }
  }

  /**
   * 獲取連結的帳戶
   */
  async getLinkedAccounts(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.user!;
      
      const accounts = await plaidAccountRepository.findWithTransactionCounts(userId);
      
      res.json(successResponse('Linked accounts retrieved successfully', { accounts }));
    } catch (error) {
      console.error('Error getting linked accounts:', error);
      res.status(500).json(errorResponse('Failed to get linked accounts'));
    }
  }

  /**
   * 獲取帳戶餘額
   */
  async getAccountBalances(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.user!;
      const { accountId } = req.params;

      // 驗證帳戶所有權
      const account = await plaidAccountRepository.findByAccountId(accountId);
      if (!account || account.userId !== userId) {
        res.status(404).json(errorResponse('Account not found'));
        return;
      }

      // 獲取 Plaid Item
      const plaidItem = await plaidItemRepository.findById(account.plaidItemId);
      if (!plaidItem) {
        res.status(404).json(errorResponse('Plaid item not found'));
        return;
      }

      // 從 Plaid 獲取最新帳戶資訊
      const accounts = await plaidService.getAccounts(plaidItem.accessToken);
      const plaidAccount = accounts.find(acc => acc.accountId === accountId);

      if (!plaidAccount) {
        res.status(404).json(errorResponse('Account not found in Plaid'));
        return;
      }

      // 更新本地餘額
      await plaidAccountRepository.updateBalances(accountId, {
        available: plaidAccount.balances.available,
        current: plaidAccount.balances.current,
        limit: plaidAccount.balances.limit,
        isoCurrencyCode: plaidAccount.balances.isoCurrencyCode,
      });

      res.json(successResponse('Account balances retrieved successfully', {
        accountId,
        balances: plaidAccount.balances,
      }));
    } catch (error) {
      console.error('Error getting account balances:', error);
      res.status(500).json(errorResponse('Failed to get account balances'));
    }
  }

  /**
   * 同步交易記錄
   */
  async syncTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.user!;
      const { startDate, endDate, accountId } = req.body;

      if (!startDate || !endDate) {
        res.status(400).json(errorResponse('Start date and end date are required'));
        return;
      }

      let targetAccounts: any[] = [];
      
      if (accountId) {
        // 同步特定帳戶
        const account = await plaidAccountRepository.findByAccountId(accountId);
        if (!account || account.userId !== userId) {
          res.status(404).json(errorResponse('Account not found'));
          return;
        }
        targetAccounts = [account];
      } else {
        // 同步所有帳戶
        targetAccounts = await plaidAccountRepository.findByUserId(userId);
      }

      let totalSynced = 0;
      const results = [];

      for (const account of targetAccounts) {
        try {
          const plaidItem = await plaidItemRepository.findById(account.plaidItemId);
          if (!plaidItem) {
            continue;
          }

          // 獲取交易記錄
          const transactions = await plaidService.syncAllTransactions(plaidItem.accessToken, {
            startDate,
            endDate,
            accountIds: [account.accountId],
          });

          // 儲存交易記錄
          let syncedCount = 0;
          for (const transaction of transactions) {
            try {
              // 檢查交易是否已存在
              const existingTransaction = await transactionRepository.findByPlaidTransactionId(transaction.transactionId);
              
              if (!existingTransaction) {
                await transactionRepository.createTransaction({
                  userId,
                  plaidTransactionId: transaction.transactionId,
                  amount: transaction.amount,
                  transactionDate: new Date(transaction.date),
                  description: transaction.name,
                  category: transaction.category?.[0] || SpendingCategory.OTHER,
                  merchant: transaction.merchantName || 'Unknown',
                  metadata: {
                    subcategory: transaction.subcategory || null,
                    isRecurring: false,
                  },
                });
                syncedCount++;
              }
            } catch (error) {
              console.error('Error saving transaction:', error);
            }
          }

          results.push({
            accountId: account.accountId,
            accountName: account.name,
            transactionCount: transactions.length,
            syncedCount,
          });

          totalSynced += syncedCount;
        } catch (error) {
          console.error(`Error syncing account ${account.accountId}:`, error);
          results.push({
            accountId: account.accountId,
            accountName: account.name,
            error: error.message,
          });
        }
      }

      res.json(successResponse('Transactions synced successfully', {
        totalSynced,
        results,
      }));
    } catch (error) {
      console.error('Error syncing transactions:', error);
      res.status(500).json(errorResponse('Failed to sync transactions'));
    }
  }

  /**
   * 取消連結帳戶
   */
  async unlinkAccount(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.user!;
      const { itemId } = req.params;

      // 驗證 Plaid Item 所有權
      const plaidItem = await plaidItemRepository.findById(itemId);
      if (!plaidItem || plaidItem.userId !== userId) {
        res.status(404).json(errorResponse('Plaid item not found'));
        return;
      }

      // 軟刪除相關帳戶
      const accounts = await plaidAccountRepository.findByPlaidItemId(itemId);
      for (const account of accounts) {
        await plaidAccountRepository.deactivate(account.id);
      }

      // 刪除 Plaid Item
      await plaidItemRepository.delete(itemId);

      res.json(successResponse('Account unlinked successfully'));
    } catch (error) {
      console.error('Error unlinking account:', error);
      res.status(500).json(errorResponse('Failed to unlink account'));
    }
  }

  /**
   * 獲取帳戶統計
   */
  async getAccountStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.user!;
      
      const stats = await plaidAccountRepository.getAccountTypeStats(userId);
      const items = await plaidItemRepository.findWithCounts(userId);
      
      res.json(successResponse('Account statistics retrieved successfully', {
        accountStats: stats,
        linkedInstitutions: items.length,
        totalAccounts: stats.reduce((sum, stat) => sum + stat.count, 0),
        totalBalance: stats.reduce((sum, stat) => sum + stat.totalBalance, 0),
      }));
    } catch (error) {
      console.error('Error getting account stats:', error);
      res.status(500).json(errorResponse('Failed to get account statistics'));
    }
  }
}

export const plaidController = new PlaidController();