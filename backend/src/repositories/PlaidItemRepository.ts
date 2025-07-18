import { Knex } from 'knex';
import database from '../database/connection';
import { 
  PlaidItem, 
  CreatePlaidItemData, 
  UpdatePlaidItemData, 
  PlaidItemFilters,
  PlaidItemWithCounts 
} from '../models/PlaidItem';

export class PlaidItemRepository {
  private db: Knex;

  constructor(db: Knex = database) {
    this.db = db;
  }

  /**
   * 創建新的 Plaid Item
   */
  async create(data: CreatePlaidItemData): Promise<PlaidItem> {
    const [item] = await this.db('plaid_items')
      .insert({
        user_id: data.userId,
        item_id: data.itemId,
        access_token: data.accessToken,
        institution_id: data.institutionId,
        institution_name: data.institutionName,
        available_products: JSON.stringify(data.availableProducts),
        billed_products: JSON.stringify(data.billedProducts),
        error: data.error ? JSON.stringify(data.error) : null,
      })
      .returning('*');

    return this.mapToPlaidItem(item);
  }

  /**
   * 根據 ID 查找 Plaid Item
   */
  async findById(id: string): Promise<PlaidItem | null> {
    const item = await this.db('plaid_items')
      .where({ id })
      .first();

    return item ? this.mapToPlaidItem(item) : null;
  }

  /**
   * 根據 item_id 查找 Plaid Item
   */
  async findByItemId(itemId: string): Promise<PlaidItem | null> {
    const item = await this.db('plaid_items')
      .where({ item_id: itemId })
      .first();

    return item ? this.mapToPlaidItem(item) : null;
  }

  /**
   * 根據用戶 ID 查找所有 Plaid Items
   */
  async findByUserId(userId: string): Promise<PlaidItem[]> {
    const items = await this.db('plaid_items')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');

    return items.map(this.mapToPlaidItem);
  }

  /**
   * 根據條件搜索 Plaid Items
   */
  async findByFilters(filters: PlaidItemFilters): Promise<PlaidItem[]> {
    let query = this.db('plaid_items');

    if (filters.userId) {
      query = query.where({ user_id: filters.userId });
    }

    if (filters.itemId) {
      query = query.where({ item_id: filters.itemId });
    }

    if (filters.institutionId) {
      query = query.where({ institution_id: filters.institutionId });
    }

    if (filters.hasError !== undefined) {
      if (filters.hasError) {
        query = query.whereNotNull('error');
      } else {
        query = query.whereNull('error');
      }
    }

    const items = await query.orderBy('created_at', 'desc');
    return items.map(this.mapToPlaidItem);
  }

  /**
   * 更新 Plaid Item
   */
  async update(id: string, data: UpdatePlaidItemData): Promise<PlaidItem | null> {
    const updateData: any = {};

    if (data.accessToken !== undefined) {
      updateData.access_token = data.accessToken;
    }
    if (data.institutionName !== undefined) {
      updateData.institution_name = data.institutionName;
    }
    if (data.availableProducts !== undefined) {
      updateData.available_products = JSON.stringify(data.availableProducts);
    }
    if (data.billedProducts !== undefined) {
      updateData.billed_products = JSON.stringify(data.billedProducts);
    }
    if (data.error !== undefined) {
      updateData.error = data.error ? JSON.stringify(data.error) : null;
    }

    const [updated] = await this.db('plaid_items')
      .where({ id })
      .update(updateData)
      .returning('*');

    return updated ? this.mapToPlaidItem(updated) : null;
  }

  /**
   * 刪除 Plaid Item
   */
  async delete(id: string): Promise<boolean> {
    const deletedCount = await this.db('plaid_items')
      .where({ id })
      .delete();

    return deletedCount > 0;
  }

  /**
   * 獲取包含統計資訊的 Plaid Items
   */
  async findWithCounts(userId: string): Promise<PlaidItemWithCounts[]> {
    const items = await this.db('plaid_items')
      .leftJoin('plaid_accounts', 'plaid_items.id', 'plaid_accounts.plaid_item_id')
      .leftJoin('transactions', 'plaid_accounts.account_id', 'transactions.plaid_transaction_id')
      .where('plaid_items.user_id', userId)
      .groupBy('plaid_items.id')
      .select(
        'plaid_items.*',
        this.db.raw('COUNT(DISTINCT plaid_accounts.id) as account_count'),
        this.db.raw('COUNT(DISTINCT transactions.id) as transaction_count')
      );

    return items.map(item => ({
      ...this.mapToPlaidItem(item),
      accountCount: parseInt(item.account_count) || 0,
      transactionCount: parseInt(item.transaction_count) || 0,
    }));
  }

  /**
   * 檢查用戶是否已連結特定機構
   */
  async isInstitutionLinked(userId: string, institutionId: string): Promise<boolean> {
    const item = await this.db('plaid_items')
      .where({ 
        user_id: userId,
        institution_id: institutionId 
      })
      .first();

    return !!item;
  }

  /**
   * 映射資料庫記錄到 PlaidItem 模型
   */
  private mapToPlaidItem(item: any): PlaidItem {
    return {
      id: item.id,
      userId: item.user_id,
      itemId: item.item_id,
      accessToken: item.access_token,
      institutionId: item.institution_id,
      institutionName: item.institution_name,
      availableProducts: JSON.parse(item.available_products),
      billedProducts: JSON.parse(item.billed_products),
      error: item.error ? JSON.parse(item.error) : null,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };
  }
}

export const plaidItemRepository = new PlaidItemRepository();