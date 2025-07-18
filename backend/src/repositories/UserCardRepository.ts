import { Knex } from 'knex';
import database from '../database/connection';
import { BaseRepository } from './BaseRepository';
import { 
  UserCard, 
  CreateUserCardData, 
  UpdateUserCardData, 
  UserCardFilters,
  UserCardWithDetails,
  CardPortfolio
} from '../models/UserCard';

export class UserCardRepository extends BaseRepository<UserCard> {
  constructor() {
    super('user_cards');
  }

  /**
   * 創建用戶卡片關聯
   */
  async createUserCard(data: CreateUserCardData): Promise<UserCard> {
    const [userCard] = await this.db(this.tableName)
      .insert({
        user_id: data.userId,
        card_id: data.creditCardId,
        card_nickname: data.cardNickname,
        date_obtained: data.dateObtained,
        is_primary: data.isPrimary || false,
        credit_limit: data.creditLimit,
        current_balance: data.currentBalance || 0,
        statement_date: data.statementDate,
        due_date: data.dueDate,
        notes: data.notes,
      })
      .returning('*');

    return this.mapFromDb(userCard);
  }

  /**
   * 根據用戶ID查找所有卡片
   */
  async findByUserId(userId: string): Promise<UserCard[]> {
    const userCards = await this.db(this.tableName)
      .where({ user_id: userId })
      .orderBy('is_primary', 'desc')
      .orderBy('date_obtained', 'desc');

    return userCards.map(this.mapFromDb);
  }

  /**
   * 獲取用戶卡片詳細信息（包含信用卡信息）
   */
  async findUserCardsWithDetails(userId: string): Promise<UserCardWithDetails[]> {
    const userCards = await this.db(this.tableName)
      .join('credit_cards', 'user_cards.card_id', '=', 'credit_cards.id')
      .where('user_cards.user_id', userId)
      .select(
        'user_cards.*',
        'credit_cards.name as card_name',
        'credit_cards.issuer',
        'credit_cards.card_type',
        'credit_cards.annual_fee',
        'credit_cards.reward_structure',
        'credit_cards.benefits',
        'credit_cards.image_url',
        'credit_cards.apply_url'
      )
      .orderBy('user_cards.is_primary', 'desc')
      .orderBy('user_cards.date_obtained', 'desc');

    return userCards.map(this.mapToUserCardWithDetails);
  }

  /**
   * 根據條件搜索用戶卡片
   */
  async findByFilters(filters: UserCardFilters): Promise<UserCard[]> {
    let query = this.db(this.tableName);

    if (filters.userId) {
      query = query.where({ user_id: filters.userId });
    }

    if (filters.creditCardId) {
      query = query.where({ card_id: filters.creditCardId });
    }

    if (filters.isPrimary !== undefined) {
      query = query.where({ is_primary: filters.isPrimary });
    }

    if (filters.minCreditLimit !== undefined) {
      query = query.where('credit_limit', '>=', filters.minCreditLimit);
    }

    if (filters.maxCreditLimit !== undefined) {
      query = query.where('credit_limit', '<=', filters.maxCreditLimit);
    }

    if (filters.hasBalance !== undefined) {
      if (filters.hasBalance) {
        query = query.where('current_balance', '>', 0);
      } else {
        query = query.where('current_balance', '=', 0);
      }
    }

    const userCards = await query.orderBy('created_at', 'desc');
    return userCards.map(this.mapFromDb);
  }

  /**
   * 獲取用戶卡片組合概況
   */
  async getUserCardPortfolio(userId: string): Promise<CardPortfolio> {
    const userCards = await this.findUserCardsWithDetails(userId);
    
    const totalCreditLimit = userCards.reduce((sum, card) => sum + (card.creditLimit || 0), 0);
    const totalCurrentBalance = userCards.reduce((sum, card) => sum + (card.currentBalance || 0), 0);
    const utilizationRate = totalCreditLimit > 0 ? (totalCurrentBalance / totalCreditLimit) * 100 : 0;

    // 按卡片類型分組統計
    const cardsByType = userCards.reduce((acc, card) => {
      const type = card.cardType;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(card);
      return acc;
    }, {} as Record<string, UserCardWithDetails[]>);

    // 按發行商分組統計
    const cardsByIssuer = userCards.reduce((acc, card) => {
      const issuer = card.issuer;
      if (!acc[issuer]) {
        acc[issuer] = [];
      }
      acc[issuer].push(card);
      return acc;
    }, {} as Record<string, UserCardWithDetails[]>);

    return {
      totalCards: userCards.length,
      totalCreditLimit,
      totalCurrentBalance,
      utilizationRate,
      cardsByType,
      cardsByIssuer,
      userCards,
    };
  }

  /**
   * 設置主要卡片
   */
  async setPrimaryCard(userId: string, cardId: string): Promise<boolean> {
    const trx = await this.db.transaction();
    
    try {
      // 先將所有卡片設為非主要
      await trx(this.tableName)
        .where({ user_id: userId })
        .update({ is_primary: false });

      // 設置指定卡片為主要
      const updatedCount = await trx(this.tableName)
        .where({ user_id: userId, id: cardId })
        .update({ is_primary: true });

      await trx.commit();
      return updatedCount > 0;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * 更新卡片餘額
   */
  async updateBalance(cardId: string, currentBalance: number): Promise<UserCard | null> {
    const [updated] = await this.db(this.tableName)
      .where({ id: cardId })
      .update({ 
        current_balance: currentBalance,
        updated_at: new Date()
      })
      .returning('*');

    return updated ? this.mapFromDb(updated) : null;
  }

  /**
   * 更新用戶卡片信息
   */
  async updateUserCard(id: string, data: UpdateUserCardData): Promise<UserCard | null> {
    const updateData: any = {};

    if (data.cardNickname !== undefined) {
      updateData.card_nickname = data.cardNickname;
    }
    if (data.dateObtained !== undefined) {
      updateData.date_obtained = data.dateObtained;
    }
    if (data.isPrimary !== undefined) {
      updateData.is_primary = data.isPrimary;
    }
    if (data.creditLimit !== undefined) {
      updateData.credit_limit = data.creditLimit;
    }
    if (data.currentBalance !== undefined) {
      updateData.current_balance = data.currentBalance;
    }
    if (data.statementDate !== undefined) {
      updateData.statement_date = data.statementDate;
    }
    if (data.dueDate !== undefined) {
      updateData.due_date = data.dueDate;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    const [updated] = await this.db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');

    return updated ? this.mapFromDb(updated) : null;
  }

  /**
   * 批量更新卡片餘額
   */
  async batchUpdateBalances(updates: Array<{ cardId: string; balance: number }>): Promise<number> {
    const trx = await this.db.transaction();
    
    try {
      let updatedCount = 0;
      
      for (const update of updates) {
        const count = await trx(this.tableName)
          .where({ id: update.cardId })
          .update({ 
            current_balance: update.balance,
            updated_at: new Date()
          });
        updatedCount += count;
      }

      await trx.commit();
      return updatedCount;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * 檢查用戶是否已有指定卡片
   */
  async hasCard(userId: string, creditCardId: string): Promise<boolean> {
    const userCard = await this.db(this.tableName)
      .where({ 
        user_id: userId,
        card_id: creditCardId 
      })
      .first();

    return !!userCard;
  }

  /**
   * 獲取用戶卡片統計信息
   */
  async getUserCardStats(userId: string): Promise<{
    totalCards: number;
    totalCreditLimit: number;
    totalBalance: number;
    utilizationRate: number;
    cardsByType: Record<string, number>;
    cardsByIssuer: Record<string, number>;
  }> {
    const userCards = await this.findUserCardsWithDetails(userId);
    
    const totalCreditLimit = userCards.reduce((sum, card) => sum + (card.creditLimit || 0), 0);
    const totalBalance = userCards.reduce((sum, card) => sum + (card.currentBalance || 0), 0);
    const utilizationRate = totalCreditLimit > 0 ? (totalBalance / totalCreditLimit) * 100 : 0;

    // 按類型統計
    const cardsByType = userCards.reduce((acc, card) => {
      const type = card.cardType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 按發行商統計
    const cardsByIssuer = userCards.reduce((acc, card) => {
      const issuer = card.issuer;
      acc[issuer] = (acc[issuer] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCards: userCards.length,
      totalCreditLimit,
      totalBalance,
      utilizationRate,
      cardsByType,
      cardsByIssuer,
    };
  }

  /**
   * 映射資料庫記錄到 UserCard 模型
   */
  protected mapFromDb(userCard: any): UserCard {
    return {
      id: userCard.id,
      userId: userCard.user_id,
      creditCardId: userCard.card_id,
      cardNickname: userCard.card_nickname,
      dateObtained: userCard.date_obtained,
      isPrimary: userCard.is_primary,
      creditLimit: userCard.credit_limit ? parseFloat(userCard.credit_limit) : null,
      currentBalance: userCard.current_balance ? parseFloat(userCard.current_balance) : 0,
      statementDate: userCard.statement_date,
      dueDate: userCard.due_date,
      notes: userCard.notes,
      createdAt: userCard.created_at,
      updatedAt: userCard.updated_at,
    };
  }

  /**
   * 映射 UserCard 模型到資料庫記錄
   */
  protected mapToDb(userCard: Partial<UserCard>): any {
    const dbData: any = {};
    
    if (userCard.userId !== undefined) {
      dbData.user_id = userCard.userId;
    }
    if (userCard.creditCardId !== undefined) {
      dbData.card_id = userCard.creditCardId;
    }
    if (userCard.cardNickname !== undefined) {
      dbData.card_nickname = userCard.cardNickname;
    }
    if (userCard.dateObtained !== undefined) {
      dbData.date_obtained = userCard.dateObtained;
    }
    if (userCard.isPrimary !== undefined) {
      dbData.is_primary = userCard.isPrimary;
    }
    if (userCard.creditLimit !== undefined) {
      dbData.credit_limit = userCard.creditLimit;
    }
    if (userCard.currentBalance !== undefined) {
      dbData.current_balance = userCard.currentBalance;
    }
    if (userCard.statementDate !== undefined) {
      dbData.statement_date = userCard.statementDate;
    }
    if (userCard.dueDate !== undefined) {
      dbData.due_date = userCard.dueDate;
    }
    if (userCard.notes !== undefined) {
      dbData.notes = userCard.notes;
    }
    
    return dbData;
  }

  /**
   * 映射到 UserCardWithDetails
   */
  private mapToUserCardWithDetails(row: any): UserCardWithDetails {
    return {
      id: row.id,
      userId: row.user_id,
      creditCardId: row.card_id,
      cardNickname: row.card_nickname,
      dateObtained: row.date_obtained,
      isPrimary: row.is_primary,
      creditLimit: row.credit_limit ? parseFloat(row.credit_limit) : null,
      currentBalance: row.current_balance ? parseFloat(row.current_balance) : 0,
      statementDate: row.statement_date,
      dueDate: row.due_date,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // 信用卡詳細信息
      cardName: row.card_name,
      issuer: row.issuer,
      cardType: row.card_type,
      annualFee: row.annual_fee ? parseFloat(row.annual_fee) : 0,
      rewardStructure: row.reward_structure ? JSON.parse(row.reward_structure) : [],
      benefits: row.benefits ? JSON.parse(row.benefits) : [],
      imageUrl: row.image_url,
      applyUrl: row.apply_url,
    };
  }
}

export const userCardRepository = new UserCardRepository();