import { plaidService } from './PlaidService';
import { plaidItemRepository } from '../repositories/PlaidItemRepository';
import { plaidAccountRepository } from '../repositories/PlaidAccountRepository';
import { transactionRepository } from '../repositories/TransactionRepository';
import { PlaidTransactionInfo } from './PlaidService';
import { CreateTransactionData } from '../models/Transaction';
import { SpendingCategory } from '../models/types';

export interface TransactionSyncResult {
  success: boolean;
  syncedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: string[];
}

export interface TransactionProcessingOptions {
  userId: string;
  accountId?: string;
  startDate: string;
  endDate: string;
  batchSize?: number;
  skipExisting?: boolean;
}

export class TransactionProcessingService {
  private readonly DEFAULT_BATCH_SIZE = 100;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  /**
   * 主要交易處理管道
   */
  async processTransactions(options: TransactionProcessingOptions): Promise<TransactionSyncResult> {
    const result: TransactionSyncResult = {
      success: true,
      syncedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      errors: [],
    };

    try {
      // 獲取目標帳戶
      const targetAccounts = await this.getTargetAccounts(options.userId, options.accountId);
      
      if (targetAccounts.length === 0) {
        result.errors.push('No accounts found for processing');
        result.success = false;
        return result;
      }

      // 處理每個帳戶
      for (const account of targetAccounts) {
        try {
          const accountResult = await this.processAccountTransactions(account, options);
          
          result.syncedCount += accountResult.syncedCount;
          result.skippedCount += accountResult.skippedCount;
          result.errorCount += accountResult.errorCount;
          result.errors.push(...accountResult.errors);
        } catch (error) {
          result.errorCount++;
          result.errors.push(`Account ${account.accountId}: ${error instanceof Error ? error.message : String(error)}`);
          console.error(`Error processing account ${account.accountId}:`, error);
        }
      }

      result.success = result.errorCount === 0;
      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`Processing failed: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Transaction processing failed:', error);
      return result;
    }
  }

  /**
   * 處理單個帳戶的交易
   */
  private async processAccountTransactions(
    account: any,
    options: TransactionProcessingOptions
  ): Promise<TransactionSyncResult> {
    const result: TransactionSyncResult = {
      success: true,
      syncedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      errors: [],
    };

    try {
      // 獲取 Plaid Item
      const plaidItem = await plaidItemRepository.findById(account.plaidItemId);
      if (!plaidItem) {
        throw new Error(`Plaid item not found for account ${account.accountId}`);
      }

      // 從 Plaid 獲取交易
      const plaidTransactions = await this.fetchPlaidTransactions(
        plaidItem.accessToken,
        account.accountId,
        options
      );

      // 批量處理交易
      const batchSize = options.batchSize || this.DEFAULT_BATCH_SIZE;
      for (let i = 0; i < plaidTransactions.length; i += batchSize) {
        const batch = plaidTransactions.slice(i, i + batchSize);
        const batchResult = await this.processBatch(batch, options.userId, options.skipExisting);
        
        result.syncedCount += batchResult.syncedCount;
        result.skippedCount += batchResult.skippedCount;
        result.errorCount += batchResult.errorCount;
        result.errors.push(...batchResult.errors);
      }

      // 更新帳戶同步時間
      await plaidAccountRepository.update(account.id, {
        lastSyncedAt: new Date(),
      });

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`Account processing failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 從 Plaid 獲取交易
   */
  private async fetchPlaidTransactions(
    accessToken: string,
    accountId: string,
    options: TransactionProcessingOptions
  ): Promise<PlaidTransactionInfo[]> {
    let retries = 0;
    
    while (retries < this.MAX_RETRIES) {
      try {
        const transactions = await plaidService.syncAllTransactions(accessToken, {
          startDate: options.startDate,
          endDate: options.endDate,
          accountIds: [accountId],
        });

        return transactions;
      } catch (error) {
        retries++;
        console.warn(`Retry ${retries}/${this.MAX_RETRIES} for account ${accountId}:`, error instanceof Error ? error.message : String(error));
        
        if (retries >= this.MAX_RETRIES) {
          throw error;
        }
        
        await this.delay(this.RETRY_DELAY * retries);
      }
    }
    
    return [];
  }

  /**
   * 批量處理交易
   */
  private async processBatch(
    transactions: PlaidTransactionInfo[],
    userId: string,
    skipExisting: boolean = true
  ): Promise<TransactionSyncResult> {
    const result: TransactionSyncResult = {
      success: true,
      syncedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      errors: [],
    };

    for (const transaction of transactions) {
      try {
        // 檢查是否已存在
        if (skipExisting) {
          const existing = await transactionRepository.findByPlaidTransactionId(transaction.transactionId);
          if (existing) {
            result.skippedCount++;
            continue;
          }
        }

        // 轉換並儲存交易
        const transactionData = this.convertPlaidTransaction(transaction, userId);
        await transactionRepository.createTransaction(transactionData);
        
        result.syncedCount++;
      } catch (error) {
        result.errorCount++;
        result.errors.push(`Transaction ${transaction.transactionId}: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`Error processing transaction ${transaction.transactionId}:`, error);
      }
    }

    return result;
  }

  /**
   * 轉換 Plaid 交易為系統交易格式
   */
  private convertPlaidTransaction(
    plaidTransaction: PlaidTransactionInfo,
    userId: string
  ): CreateTransactionData {
    return {
      userId,
      plaidTransactionId: plaidTransaction.transactionId,
      amount: Math.abs(plaidTransaction.amount), // 轉為正數
      transactionDate: new Date(plaidTransaction.date),
      description: plaidTransaction.name,
      category: this.mapPlaidCategory(plaidTransaction.category),
      merchant: plaidTransaction.merchantName || 'Unknown',
      cardUsed: undefined, // 可以後續根據需要設定
      metadata: {
        plaidCategory: plaidTransaction.category,
        plaidCategoryId: plaidTransaction.categoryId,
        subcategory: plaidTransaction.subcategory,
        pending: plaidTransaction.pending,
        location: plaidTransaction.location,
        isRecurring: this.detectRecurringTransaction(plaidTransaction),
      },
    };
  }

  /**
   * 映射 Plaid 分類到系統分類
   */
  private mapPlaidCategory(plaidCategory: string[] | null): SpendingCategory {
    if (!plaidCategory || plaidCategory.length === 0) {
      return SpendingCategory.OTHER;
    }

    const mainCategory = plaidCategory[0].toLowerCase();
    
    // 映射常見分類
    const categoryMap: { [key: string]: SpendingCategory } = {
      'food and drink': SpendingCategory.DINING,
      'shops': SpendingCategory.SHOPPING,
      'transportation': SpendingCategory.TRAVEL,
      'travel': SpendingCategory.TRAVEL,
      'recreation': SpendingCategory.ENTERTAINMENT,
      'service': SpendingCategory.OTHER,
      'healthcare': SpendingCategory.HEALTHCARE,
      'bank fees': SpendingCategory.OTHER,
      'interest': SpendingCategory.OTHER,
      'transfer': SpendingCategory.OTHER,
      'deposit': SpendingCategory.OTHER,
      'payroll': SpendingCategory.OTHER,
    };

    return categoryMap[mainCategory] || SpendingCategory.OTHER;
  }

  /**
   * 檢測是否為重複交易（基本邏輯）
   */
  private detectRecurringTransaction(transaction: PlaidTransactionInfo): boolean {
    // 基本重複交易檢測邏輯
    // 可以根據 merchant name、amount 等進行更複雜的檢測
    const recurringKeywords = [
      'subscription',
      'monthly',
      'netflix',
      'spotify',
      'amazon prime',
      'gym',
      'insurance',
      'phone',
      'internet',
      'utilities',
    ];

    const transactionName = transaction.name.toLowerCase();
    return recurringKeywords.some(keyword => transactionName.includes(keyword));
  }

  /**
   * 獲取目標帳戶
   */
  private async getTargetAccounts(userId: string, accountId?: string) {
    if (accountId) {
      const account = await plaidAccountRepository.findByAccountId(accountId);
      if (!account || account.userId !== userId) {
        throw new Error('Account not found or access denied');
      }
      return [account];
    }

    return await plaidAccountRepository.findByUserId(userId);
  }

  /**
   * 延遲工具函數
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 獲取帳戶的最後同步時間
   */
  async getLastSyncTime(accountId: string): Promise<Date | null> {
    const account = await plaidAccountRepository.findByAccountId(accountId);
    return account?.lastSyncedAt || null;
  }

  /**
   * 清理舊交易（可選功能）
   */
  async cleanupOldTransactions(userId: string, daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // 這裡可以實作清理邏輯
    // 目前只是返回 0，實際實作需要根據業務需求
    return 0;
  }
}

export const transactionProcessingService = new TransactionProcessingService();