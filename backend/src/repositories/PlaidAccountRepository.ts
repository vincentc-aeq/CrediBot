import { Knex } from 'knex';
import database from '../database/connection';
import { 
  PlaidAccount, 
  CreatePlaidAccountData, 
  UpdatePlaidAccountData, 
  PlaidAccountFilters,
  PlaidAccountWithTransactions 
} from '../models/PlaidAccount';

export class PlaidAccountRepository {
  private db: Knex;

  constructor(db: Knex = database) {
    this.db = db;
  }

  /**
   * 創建新的 Plaid Account
   */
  async create(data: CreatePlaidAccountData): Promise<PlaidAccount> {
    const [account] = await this.db('plaid_accounts')
      .insert({
        user_id: data.userId,
        plaid_item_id: data.plaidItemId,
        account_id: data.accountId,
        name: data.name,
        official_name: data.officialName || null,
        type: data.type,
        subtype: data.subtype || null,
        mask: data.mask || null,
        balance_available: data.balanceAvailable || null,
        balance_current: data.balanceCurrent || null,
        balance_limit: data.balanceLimit || null,
        iso_currency_code: data.isoCurrencyCode || null,
        is_active: data.isActive !== undefined ? data.isActive : true,
        last_synced_at: data.lastSyncedAt || null,
      })
      .returning('*');

    return this.mapToPlaidAccount(account);
  }

  /**
   * 根據 ID 查找 Plaid Account
   */
  async findById(id: string): Promise<PlaidAccount | null> {
    const account = await this.db('plaid_accounts')
      .where({ id })
      .first();

    return account ? this.mapToPlaidAccount(account) : null;
  }

  /**
   * 根據 account_id 查找 Plaid Account
   */
  async findByAccountId(accountId: string): Promise<PlaidAccount | null> {
    const account = await this.db('plaid_accounts')
      .where({ account_id: accountId })
      .first();

    return account ? this.mapToPlaidAccount(account) : null;
  }

  /**
   * 根據用戶 ID 查找所有 Plaid Accounts
   */
  async findByUserId(userId: string): Promise<PlaidAccount[]> {
    const accounts = await this.db('plaid_accounts')
      .where({ user_id: userId, is_active: true })
      .orderBy('created_at', 'desc');

    return accounts.map(this.mapToPlaidAccount);
  }

  /**
   * 根據 Plaid Item ID 查找所有 Plaid Accounts
   */
  async findByPlaidItemId(plaidItemId: string): Promise<PlaidAccount[]> {
    const accounts = await this.db('plaid_accounts')
      .where({ plaid_item_id: plaidItemId, is_active: true })
      .orderBy('created_at', 'desc');

    return accounts.map(this.mapToPlaidAccount);
  }

  /**
   * 根據條件搜索 Plaid Accounts
   */
  async findByFilters(filters: PlaidAccountFilters): Promise<PlaidAccount[]> {
    let query = this.db('plaid_accounts');

    if (filters.userId) {
      query = query.where({ user_id: filters.userId });
    }

    if (filters.plaidItemId) {
      query = query.where({ plaid_item_id: filters.plaidItemId });
    }

    if (filters.accountId) {
      query = query.where({ account_id: filters.accountId });
    }

    if (filters.type) {
      query = query.where({ type: filters.type });
    }

    if (filters.subtype) {
      query = query.where({ subtype: filters.subtype });
    }

    if (filters.isActive !== undefined) {
      query = query.where({ is_active: filters.isActive });
    }

    const accounts = await query.orderBy('created_at', 'desc');
    return accounts.map(this.mapToPlaidAccount);
  }

  /**
   * 更新 Plaid Account
   */
  async update(id: string, data: UpdatePlaidAccountData): Promise<PlaidAccount | null> {
    const updateData: any = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.officialName !== undefined) {
      updateData.official_name = data.officialName;
    }
    if (data.type !== undefined) {
      updateData.type = data.type;
    }
    if (data.subtype !== undefined) {
      updateData.subtype = data.subtype;
    }
    if (data.mask !== undefined) {
      updateData.mask = data.mask;
    }
    if (data.balanceAvailable !== undefined) {
      updateData.balance_available = data.balanceAvailable;
    }
    if (data.balanceCurrent !== undefined) {
      updateData.balance_current = data.balanceCurrent;
    }
    if (data.balanceLimit !== undefined) {
      updateData.balance_limit = data.balanceLimit;
    }
    if (data.isoCurrencyCode !== undefined) {
      updateData.iso_currency_code = data.isoCurrencyCode;
    }
    if (data.isActive !== undefined) {
      updateData.is_active = data.isActive;
    }
    if (data.lastSyncedAt !== undefined) {
      updateData.last_synced_at = data.lastSyncedAt;
    }

    const [updated] = await this.db('plaid_accounts')
      .where({ id })
      .update(updateData)
      .returning('*');

    return updated ? this.mapToPlaidAccount(updated) : null;
  }

  /**
   * 批量更新帳戶餘額
   */
  async updateBalances(accountId: string, balances: {
    available?: number;
    current?: number;
    limit?: number;
    isoCurrencyCode?: string;
  }): Promise<PlaidAccount | null> {
    const updateData: any = {
      last_synced_at: new Date(),
    };

    if (balances.available !== undefined) {
      updateData.balance_available = balances.available;
    }
    if (balances.current !== undefined) {
      updateData.balance_current = balances.current;
    }
    if (balances.limit !== undefined) {
      updateData.balance_limit = balances.limit;
    }
    if (balances.isoCurrencyCode !== undefined) {
      updateData.iso_currency_code = balances.isoCurrencyCode;
    }

    const [updated] = await this.db('plaid_accounts')
      .where({ account_id: accountId })
      .update(updateData)
      .returning('*');

    return updated ? this.mapToPlaidAccount(updated) : null;
  }

  /**
   * 軟刪除 Plaid Account
   */
  async deactivate(id: string): Promise<boolean> {
    const updatedCount = await this.db('plaid_accounts')
      .where({ id })
      .update({ is_active: false });

    return updatedCount > 0;
  }

  /**
   * 永久刪除 Plaid Account
   */
  async delete(id: string): Promise<boolean> {
    const deletedCount = await this.db('plaid_accounts')
      .where({ id })
      .delete();

    return deletedCount > 0;
  }

  /**
   * 獲取包含交易統計的 Plaid Accounts
   */
  async findWithTransactionCounts(userId: string): Promise<PlaidAccountWithTransactions[]> {
    const accounts = await this.db('plaid_accounts')
      .leftJoin('transactions', 'plaid_accounts.account_id', 'transactions.plaid_transaction_id')
      .where('plaid_accounts.user_id', userId)
      .where('plaid_accounts.is_active', true)
      .groupBy('plaid_accounts.id')
      .select(
        'plaid_accounts.*',
        this.db.raw('COUNT(transactions.id) as transaction_count'),
        this.db.raw('MAX(transactions.transaction_date) as last_transaction_date')
      );

    return accounts.map(account => ({
      ...this.mapToPlaidAccount(account),
      transactionCount: parseInt(account.transaction_count) || 0,
      lastTransactionDate: account.last_transaction_date || null,
    }));
  }

  /**
   * 根據類型獲取帳戶統計
   */
  async getAccountTypeStats(userId: string): Promise<Array<{
    type: string;
    count: number;
    totalBalance: number;
  }>> {
    const stats = await this.db('plaid_accounts')
      .where({ user_id: userId, is_active: true })
      .groupBy('type')
      .select(
        'type',
        this.db.raw('COUNT(*) as count'),
        this.db.raw('SUM(balance_current) as total_balance')
      );

    return stats.map(stat => ({
      type: stat.type,
      count: parseInt(stat.count),
      totalBalance: parseFloat(stat.total_balance) || 0,
    }));
  }

  /**
   * 映射資料庫記錄到 PlaidAccount 模型
   */
  private mapToPlaidAccount(account: any): PlaidAccount {
    return {
      id: account.id,
      userId: account.user_id,
      plaidItemId: account.plaid_item_id,
      accountId: account.account_id,
      name: account.name,
      officialName: account.official_name,
      type: account.type,
      subtype: account.subtype,
      mask: account.mask,
      balanceAvailable: account.balance_available ? parseFloat(account.balance_available) : null,
      balanceCurrent: account.balance_current ? parseFloat(account.balance_current) : null,
      balanceLimit: account.balance_limit ? parseFloat(account.balance_limit) : null,
      isoCurrencyCode: account.iso_currency_code,
      isActive: account.is_active,
      lastSyncedAt: account.last_synced_at,
      createdAt: account.created_at,
      updatedAt: account.updated_at,
    };
  }
}

export const plaidAccountRepository = new PlaidAccountRepository();