import { Knex } from 'knex';
import database from '../database/connection';
import { BaseRepository } from './BaseRepository';
import { 
  Transaction, 
  CreateTransactionData, 
  UpdateTransactionData, 
  TransactionFilters,
  TransactionSummary,
  SpendingPattern 
} from '../models/Transaction';
import { SpendingCategory } from '../models/types';

export class TransactionRepository extends BaseRepository<Transaction> {
  constructor() {
    super('transactions');
  }

  /**
   * 創建新交易
   */
  async createTransaction(data: CreateTransactionData): Promise<Transaction> {
    const [transaction] = await this.db(this.tableName)
      .insert({
        user_id: data.userId,
        amount: data.amount,
        category: data.category,
        merchant: data.merchant,
        description: data.description,
        transaction_date: data.transactionDate,
        card_used: data.cardUsed,
        plaid_transaction_id: data.plaidTransactionId,
        metadata: JSON.stringify(data.metadata || {}),
      })
      .returning('*');

    return this.mapFromDb(transaction);
  }

  /**
   * 根據 Plaid Transaction ID 查找交易
   */
  async findByPlaidTransactionId(plaidTransactionId: string): Promise<Transaction | null> {
    const transaction = await this.db(this.tableName)
      .where({ plaid_transaction_id: plaidTransactionId })
      .first();

    return transaction ? this.mapFromDb(transaction) : null;
  }

  /**
   * 根據用戶 ID 和過濾條件查找交易
   */
  async findByFilters(filters: TransactionFilters): Promise<Transaction[]> {
    let query = this.db(this.tableName);

    if (filters.userId) {
      query = query.where({ user_id: filters.userId });
    }

    if (filters.category) {
      query = query.where({ category: filters.category });
    }

    if (filters.merchant) {
      query = query.where('merchant', 'ilike', `%${filters.merchant}%`);
    }

    if (filters.cardUsed) {
      query = query.where({ card_used: filters.cardUsed });
    }

    if (filters.startDate) {
      query = query.where('transaction_date', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('transaction_date', '<=', filters.endDate);
    }

    if (filters.minAmount !== undefined) {
      query = query.where('amount', '>=', filters.minAmount);
    }

    if (filters.maxAmount !== undefined) {
      query = query.where('amount', '<=', filters.maxAmount);
    }

    const transactions = await query.orderBy('transaction_date', 'desc');
    return transactions.map(this.mapFromDb);
  }

  /**
   * 根據用戶 ID 獲取交易摘要
   */
  async getTransactionSummary(userId: string, filters?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<TransactionSummary> {
    let query = this.db(this.tableName).where({ user_id: userId });

    if (filters?.startDate) {
      query = query.where('transaction_date', '>=', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.where('transaction_date', '<=', filters.endDate);
    }

    // 總體統計
    const [overallStats] = await query
      .select(
        this.db.raw('SUM(amount) as total_spent'),
        this.db.raw('COUNT(*) as transaction_count'),
        this.db.raw('AVG(amount) as average_transaction')
      );

    // 按類別分組統計
    const categoryStats = await query
      .groupBy('category')
      .select(
        'category',
        this.db.raw('SUM(amount) as total_amount'),
        this.db.raw('COUNT(*) as transaction_count'),
        this.db.raw('AVG(amount) as average_amount')
      );

    // 按商家分組統計
    const merchantStats = await query
      .groupBy('merchant')
      .select(
        'merchant',
        this.db.raw('SUM(amount) as total_amount'),
        this.db.raw('COUNT(*) as transaction_count')
      )
      .orderBy('total_amount', 'desc')
      .limit(10);

    // 計算月平均（假設數據跨度為一個月）
    const monthlyMultiplier = 1; // 可以根據實際日期範圍調整

    const spendingByCategory: SpendingPattern[] = categoryStats.map(stat => ({
      category: stat.category as SpendingCategory,
      totalAmount: parseFloat(stat.total_amount) || 0,
      transactionCount: parseInt(stat.transaction_count) || 0,
      averageAmount: parseFloat(stat.average_amount) || 0,
      monthlyAverage: (parseFloat(stat.total_amount) || 0) * monthlyMultiplier,
    }));

    const topMerchants = merchantStats.map(stat => ({
      merchant: stat.merchant,
      totalAmount: parseFloat(stat.total_amount) || 0,
      transactionCount: parseInt(stat.transaction_count) || 0,
    }));

    return {
      totalSpent: parseFloat(overallStats.total_spent) || 0,
      transactionCount: parseInt(overallStats.transaction_count) || 0,
      averageTransaction: parseFloat(overallStats.average_transaction) || 0,
      spendingByCategory,
      topMerchants,
    };
  }

  /**
   * 獲取指定期間的消費模式
   */
  async getSpendingPatterns(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SpendingPattern[]> {
    const patterns = await this.db(this.tableName)
      .where({ user_id: userId })
      .whereBetween('transaction_date', [startDate, endDate])
      .groupBy('category')
      .select(
        'category',
        this.db.raw('SUM(amount) as total_amount'),
        this.db.raw('COUNT(*) as transaction_count'),
        this.db.raw('AVG(amount) as average_amount')
      );

    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const monthlyMultiplier = 30 / daysDiff;

    return patterns.map(pattern => ({
      category: pattern.category as SpendingCategory,
      totalAmount: parseFloat(pattern.total_amount) || 0,
      transactionCount: parseInt(pattern.transaction_count) || 0,
      averageAmount: parseFloat(pattern.average_amount) || 0,
      monthlyAverage: (parseFloat(pattern.total_amount) || 0) * monthlyMultiplier,
    }));
  }

  /**
   * 獲取重複交易
   */
  async getRecurringTransactions(userId: string): Promise<Transaction[]> {
    const transactions = await this.db(this.tableName)
      .where({ user_id: userId })
      .where('is_recurring', true)
      .orderBy('transaction_date', 'desc');

    return transactions.map(this.mapFromDb);
  }

  /**
   * 更新交易
   */
  async updateTransaction(id: string, data: UpdateTransactionData): Promise<Transaction | null> {
    const updateData: any = {};

    if (data.amount !== undefined) {
      updateData.amount = data.amount;
    }
    if (data.category !== undefined) {
      updateData.category = data.category;
    }
    if (data.merchant !== undefined) {
      updateData.merchant = data.merchant;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.transactionDate !== undefined) {
      updateData.transaction_date = data.transactionDate;
    }
    if (data.cardUsed !== undefined) {
      updateData.card_used = data.cardUsed;
    }
    if (data.metadata !== undefined) {
      updateData.metadata = JSON.stringify(data.metadata);
    }

    const [updated] = await this.db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');

    return updated ? this.mapFromDb(updated) : null;
  }

  /**
   * 批量創建交易
   */
  async createBatch(transactions: CreateTransactionData[]): Promise<Transaction[]> {
    const insertData = transactions.map(data => ({
      user_id: data.userId,
      amount: data.amount,
      category: data.category,
      merchant: data.merchant,
      description: data.description,
      transaction_date: data.transactionDate,
      card_used: data.cardUsed,
      plaid_transaction_id: data.plaidTransactionId,
      metadata: JSON.stringify(data.metadata || {}),
    }));

    const result = await this.db(this.tableName)
      .insert(insertData)
      .returning('*');

    return result.map(this.mapFromDb);
  }

  /**
   * 刪除舊交易
   */
  async deleteOldTransactions(userId: string, cutoffDate: Date): Promise<number> {
    const deletedCount = await this.db(this.tableName)
      .where({ user_id: userId })
      .where('transaction_date', '<', cutoffDate)
      .delete();

    return deletedCount;
  }

  /**
   * 映射資料庫記錄到 Transaction 模型
   */
  protected mapFromDb(transaction: any): Transaction {
    return {
      id: transaction.id,
      userId: transaction.user_id,
      amount: parseFloat(transaction.amount),
      category: transaction.category,
      merchant: transaction.merchant,
      description: transaction.description,
      transactionDate: transaction.transaction_date,
      cardUsed: transaction.card_used,
      plaidTransactionId: transaction.plaid_transaction_id,
      metadata: transaction.metadata ? JSON.parse(transaction.metadata) : {},
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at,
    };
  }

  /**
   * 映射 Transaction 模型到資料庫記錄
   */
  protected mapToDb(transaction: Partial<Transaction>): any {
    const dbData: any = {};
    
    if (transaction.userId !== undefined) {
      dbData.user_id = transaction.userId;
    }
    if (transaction.amount !== undefined) {
      dbData.amount = transaction.amount;
    }
    if (transaction.category !== undefined) {
      dbData.category = transaction.category;
    }
    if (transaction.merchant !== undefined) {
      dbData.merchant = transaction.merchant;
    }
    if (transaction.description !== undefined) {
      dbData.description = transaction.description;
    }
    if (transaction.transactionDate !== undefined) {
      dbData.transaction_date = transaction.transactionDate;
    }
    if (transaction.cardUsed !== undefined) {
      dbData.card_used = transaction.cardUsed;
    }
    if (transaction.plaidTransactionId !== undefined) {
      dbData.plaid_transaction_id = transaction.plaidTransactionId;
    }
    if (transaction.metadata !== undefined) {
      dbData.metadata = JSON.stringify(transaction.metadata);
    }
    
    return dbData;
  }
}

export const transactionRepository = new TransactionRepository();