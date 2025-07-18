import { Knex } from 'knex';
import database from '../database/connection';
import { BaseRepository } from './BaseRepository';
import { 
  CardUpdate, 
  CreateCardUpdateData, 
  UpdateCardUpdateData, 
  CardUpdateFilters,
  CardUpdateWithDetails,
  CardUpdateSummary,
  CardUpdateType
} from '../models/CardUpdate';

export class CardUpdateRepository extends BaseRepository<CardUpdate> {
  constructor() {
    super('card_updates');
  }

  /**
   * 創建卡片更新記錄
   */
  async createCardUpdate(data: CreateCardUpdateData): Promise<CardUpdate> {
    const [cardUpdate] = await this.db(this.tableName)
      .insert({
        credit_card_id: data.creditCardId,
        update_type: data.updateType,
        old_value: data.oldValue,
        new_value: data.newValue,
        description: data.description,
        updated_by: data.updatedBy,
        effective_date: data.effectiveDate,
        is_active: data.isActive !== undefined ? data.isActive : true,
      })
      .returning('*');

    return this.mapFromDb(cardUpdate);
  }

  /**
   * 根據信用卡ID查找更新記錄
   */
  async findByCreditCardId(creditCardId: string): Promise<CardUpdate[]> {
    const updates = await this.db(this.tableName)
      .where({ credit_card_id: creditCardId })
      .orderBy('created_at', 'desc');

    return updates.map(this.mapFromDb);
  }

  /**
   * 根據條件搜索更新記錄
   */
  async findByFilters(filters: CardUpdateFilters): Promise<CardUpdate[]> {
    let query = this.db(this.tableName);

    if (filters.creditCardId) {
      query = query.where({ credit_card_id: filters.creditCardId });
    }

    if (filters.updateType) {
      query = query.where({ update_type: filters.updateType });
    }

    if (filters.updatedBy) {
      query = query.where({ updated_by: filters.updatedBy });
    }

    if (filters.startDate) {
      query = query.where('created_at', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('created_at', '<=', filters.endDate);
    }

    if (filters.isActive !== undefined) {
      query = query.where({ is_active: filters.isActive });
    }

    const updates = await query.orderBy('created_at', 'desc');
    return updates.map(this.mapFromDb);
  }

  /**
   * 獲取包含詳細信息的更新記錄
   */
  async findWithDetails(filters: CardUpdateFilters = {}): Promise<CardUpdateWithDetails[]> {
    let query = this.db(this.tableName)
      .leftJoin('credit_cards', 'card_updates.credit_card_id', '=', 'credit_cards.id')
      .leftJoin('users', 'card_updates.updated_by', '=', 'users.id')
      .select(
        'card_updates.*',
        'credit_cards.name as card_name',
        'credit_cards.issuer as card_issuer',
        'users.email as updated_by_name'
      );

    if (filters.creditCardId) {
      query = query.where('card_updates.credit_card_id', filters.creditCardId);
    }

    if (filters.updateType) {
      query = query.where('card_updates.update_type', filters.updateType);
    }

    if (filters.updatedBy) {
      query = query.where('card_updates.updated_by', filters.updatedBy);
    }

    if (filters.startDate) {
      query = query.where('card_updates.created_at', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('card_updates.created_at', '<=', filters.endDate);
    }

    if (filters.isActive !== undefined) {
      query = query.where('card_updates.is_active', filters.isActive);
    }

    const updates = await query.orderBy('card_updates.created_at', 'desc');
    return updates.map(this.mapToCardUpdateWithDetails);
  }

  /**
   * 更新卡片更新記錄
   */
  async updateCardUpdate(id: string, data: UpdateCardUpdateData): Promise<CardUpdate | null> {
    const updateData: any = {};

    if (data.updateType !== undefined) {
      updateData.update_type = data.updateType;
    }
    if (data.oldValue !== undefined) {
      updateData.old_value = data.oldValue;
    }
    if (data.newValue !== undefined) {
      updateData.new_value = data.newValue;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.updatedBy !== undefined) {
      updateData.updated_by = data.updatedBy;
    }
    if (data.effectiveDate !== undefined) {
      updateData.effective_date = data.effectiveDate;
    }
    if (data.isActive !== undefined) {
      updateData.is_active = data.isActive;
    }

    const [updated] = await this.db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');

    return updated ? this.mapFromDb(updated) : null;
  }

  /**
   * 根據更新類型查找更新記錄
   */
  async findByUpdateType(updateType: CardUpdateType): Promise<CardUpdate[]> {
    const updates = await this.db(this.tableName)
      .where({ update_type: updateType })
      .orderBy('created_at', 'desc');

    return updates.map(this.mapFromDb);
  }

  /**
   * 獲取卡片更新摘要
   */
  async getUpdateSummary(filters: CardUpdateFilters = {}): Promise<CardUpdateSummary> {
    let baseQuery = this.db(this.tableName);

    if (filters.startDate) {
      baseQuery = baseQuery.where('created_at', '>=', filters.startDate);
    }

    if (filters.endDate) {
      baseQuery = baseQuery.where('created_at', '<=', filters.endDate);
    }

    if (filters.isActive !== undefined) {
      baseQuery = baseQuery.where({ is_active: filters.isActive });
    }

    // 總更新數
    const [totalResult] = await baseQuery.clone().count('* as count');
    const totalUpdates = parseInt(totalResult.count as string);

    // 按類型統計
    const typeStats = await baseQuery.clone()
      .groupBy('update_type')
      .select('update_type', this.db.raw('COUNT(*) as count'));

    const updatesByType = typeStats.reduce((acc, stat) => {
      acc[stat.update_type as CardUpdateType] = parseInt(stat.count);
      return acc;
    }, {} as Record<CardUpdateType, number>);

    // 按卡片統計
    const cardStats = await baseQuery.clone()
      .join('credit_cards', 'card_updates.credit_card_id', '=', 'credit_cards.id')
      .groupBy('card_updates.credit_card_id', 'credit_cards.name')
      .select(
        'card_updates.credit_card_id',
        'credit_cards.name as card_name',
        this.db.raw('COUNT(*) as update_count'),
        this.db.raw('MAX(card_updates.created_at) as last_updated')
      );

    const updatesByCard = cardStats.map(stat => ({
      creditCardId: stat.credit_card_id,
      cardName: stat.card_name,
      updateCount: parseInt(stat.update_count),
      lastUpdated: stat.last_updated,
    }));

    // 最近更新
    const recentUpdates = await this.findWithDetails({
      ...filters,
      isActive: true,
    });

    return {
      totalUpdates,
      updatesByType,
      updatesByCard,
      recentUpdates: recentUpdates.slice(0, 10), // 最近10筆
    };
  }

  /**
   * 批量創建更新記錄
   */
  async batchCreateUpdates(updates: CreateCardUpdateData[]): Promise<CardUpdate[]> {
    const insertData = updates.map(data => ({
      credit_card_id: data.creditCardId,
      update_type: data.updateType,
      old_value: data.oldValue,
      new_value: data.newValue,
      description: data.description,
      updated_by: data.updatedBy,
      effective_date: data.effectiveDate,
      is_active: data.isActive !== undefined ? data.isActive : true,
    }));

    const result = await this.db(this.tableName)
      .insert(insertData)
      .returning('*');

    return result.map(this.mapFromDb);
  }

  /**
   * 停用更新記錄
   */
  async deactivateUpdate(id: string): Promise<boolean> {
    const updatedCount = await this.db(this.tableName)
      .where({ id })
      .update({ is_active: false });

    return updatedCount > 0;
  }

  /**
   * 獲取特定時間範圍內的更新統計
   */
  async getUpdateStatsByDateRange(startDate: Date, endDate: Date): Promise<{
    dailyStats: Array<{
      date: string;
      count: number;
    }>;
    typeStats: Array<{
      updateType: CardUpdateType;
      count: number;
    }>;
  }> {
    // 按日期統計
    const dailyStats = await this.db(this.tableName)
      .whereBetween('created_at', [startDate, endDate])
      .groupBy(this.db.raw('DATE(created_at)'))
      .select(
        this.db.raw('DATE(created_at) as date'),
        this.db.raw('COUNT(*) as count')
      );

    // 按類型統計
    const typeStats = await this.db(this.tableName)
      .whereBetween('created_at', [startDate, endDate])
      .groupBy('update_type')
      .select('update_type', this.db.raw('COUNT(*) as count'));

    return {
      dailyStats: dailyStats.map((stat: any) => ({
        date: stat.date,
        count: parseInt(stat.count),
      })),
      typeStats: typeStats.map((stat: any) => ({
        updateType: stat.update_type as CardUpdateType,
        count: parseInt(stat.count),
      })),
    };
  }

  /**
   * 映射資料庫記錄到 CardUpdate 模型
   */
  protected mapFromDb(cardUpdate: any): CardUpdate {
    return {
      id: cardUpdate.id,
      creditCardId: cardUpdate.credit_card_id,
      updateType: cardUpdate.update_type,
      oldValue: cardUpdate.old_value,
      newValue: cardUpdate.new_value,
      description: cardUpdate.description,
      updatedBy: cardUpdate.updated_by,
      effectiveDate: cardUpdate.effective_date,
      isActive: cardUpdate.is_active,
      createdAt: cardUpdate.created_at,
      updatedAt: cardUpdate.updated_at,
    };
  }

  /**
   * 映射 CardUpdate 模型到資料庫記錄
   */
  protected mapToDb(cardUpdate: Partial<CardUpdate>): any {
    const dbData: any = {};
    
    if (cardUpdate.creditCardId !== undefined) {
      dbData.credit_card_id = cardUpdate.creditCardId;
    }
    if (cardUpdate.updateType !== undefined) {
      dbData.update_type = cardUpdate.updateType;
    }
    if (cardUpdate.oldValue !== undefined) {
      dbData.old_value = cardUpdate.oldValue;
    }
    if (cardUpdate.newValue !== undefined) {
      dbData.new_value = cardUpdate.newValue;
    }
    if (cardUpdate.description !== undefined) {
      dbData.description = cardUpdate.description;
    }
    if (cardUpdate.updatedBy !== undefined) {
      dbData.updated_by = cardUpdate.updatedBy;
    }
    if (cardUpdate.effectiveDate !== undefined) {
      dbData.effective_date = cardUpdate.effectiveDate;
    }
    if (cardUpdate.isActive !== undefined) {
      dbData.is_active = cardUpdate.isActive;
    }
    
    return dbData;
  }

  /**
   * 映射到 CardUpdateWithDetails
   */
  private mapToCardUpdateWithDetails(row: any): CardUpdateWithDetails {
    return {
      id: row.id,
      creditCardId: row.credit_card_id,
      updateType: row.update_type,
      oldValue: row.old_value,
      newValue: row.new_value,
      description: row.description,
      updatedBy: row.updated_by,
      effectiveDate: row.effective_date,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      cardName: row.card_name,
      cardIssuer: row.card_issuer,
      updatedByName: row.updated_by_name,
    };
  }
}

export const cardUpdateRepository = new CardUpdateRepository();