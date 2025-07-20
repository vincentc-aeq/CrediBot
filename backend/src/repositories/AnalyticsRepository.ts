import { BaseRepository } from "./BaseRepository";
import { AnalyticsCache, AnalyticsRequest } from "../models/Analytics";
import { SpendingCategory } from "../models/types";
import db from "../database/connection";

export class AnalyticsRepository extends BaseRepository<AnalyticsCache> {
  constructor() {
    super("analytics_cache");
  }

  async findCachedAnalytics(
    userId: string,
    analyticsType: string,
    timeframe: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsCache | undefined> {
    const result = await this.db(this.tableName)
      .where({
        user_id: userId,
        analytics_type: analyticsType,
        timeframe: timeframe,
      })
      .where("start_date", "<=", startDate)
      .where("end_date", ">=", endDate)
      .where("expires_at", ">", new Date())
      .first();

    return result ? this.mapFromDb(result) : undefined;
  }

  async saveAnalyticsCache(
    userId: string,
    analyticsType: string,
    timeframe: string,
    startDate: Date,
    endDate: Date,
    data: any,
    expirationHours: number = 24
  ): Promise<AnalyticsCache> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    const cacheData = {
      userId,
      analyticsType: analyticsType as "spending" | "cardPerformance" | "portfolio" | "system",
      timeframe: timeframe as "day" | "week" | "month" | "quarter" | "year",
      startDate,
      endDate,
      cacheData: data,
      expiresAt,
    };

    return this.create(cacheData);
  }

  async getSpendingByCategory(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<
    {
      category: SpendingCategory;
      totalAmount: number;
      transactionCount: number;
    }[]
  > {
    const results = await db("transactions")
      .select("category")
      .sum("amount as totalAmount")
      .count("* as transactionCount")
      .where("user_id", userId)
      .whereBetween("transaction_date", [startDate, endDate])
      .groupBy("category");

    return results.map((row) => ({
      category: row.category as SpendingCategory,
      totalAmount: parseFloat(row.totalAmount),
      transactionCount: parseInt(row.transactionCount as string),
    }));
  }

  async getTopMerchants(
    userId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 10
  ): Promise<
    { merchant: string; totalAmount: number; transactionCount: number }[]
  > {
    const results = await db("transactions")
      .select("merchant")
      .sum("amount as totalAmount")
      .count("* as transactionCount")
      .where("user_id", userId)
      .whereBetween("transaction_date", [startDate, endDate])
      .groupBy("merchant")
      .orderBy("totalAmount", "desc")
      .limit(limit);

    return results.map((row) => ({
      merchant: row.merchant,
      totalAmount: parseFloat(row.totalAmount),
      transactionCount: parseInt(row.transactionCount as string),
    }));
  }

  async getCardSpending(
    userId: string,
    cardId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalSpent: number;
    transactionCount: number;
    categoryBreakdown: {
      category: SpendingCategory;
      amount: number;
      count: number;
    }[];
  }> {
    const totalResults = await db("transactions")
      .select(
        db.raw("SUM(amount) as total_spent, COUNT(*) as transaction_count")
      )
      .where({
        user_id: userId,
        card_used: cardId,
      })
      .whereBetween("transaction_date", [startDate, endDate])
      .first();

    const categoryResults = await db("transactions")
      .select("category")
      .sum("amount as total_amount")
      .count("* as transaction_count")
      .where({
        user_id: userId,
        card_used: cardId,
      })
      .whereBetween("transaction_date", [startDate, endDate])
      .groupBy("category");

    const categoryBreakdown = categoryResults.map((row) => ({
      category: row.category as SpendingCategory,
      amount: parseFloat(row.total_amount),
      count: parseInt(row.transaction_count as string),
    }));

    return {
      totalSpent: parseFloat(totalResults?.total_spent || "0"),
      transactionCount: parseInt(totalResults?.transaction_count || "0"),
      categoryBreakdown,
    };
  }

  async getMonthlySpendingTrends(
    userId: string,
    months: number = 12
  ): Promise<{ month: string; totalSpent: number }[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const results = await db("transactions")
      .select(
        db.raw(
          "TO_CHAR(transaction_date, 'YYYY-MM') as month, SUM(amount) as total_spent"
        )
      )
      .where("user_id", userId)
      .whereBetween("transaction_date", [startDate, endDate])
      .groupByRaw("TO_CHAR(transaction_date, 'YYYY-MM')")
      .orderByRaw("TO_CHAR(transaction_date, 'YYYY-MM')");

    return results.map((row) => ({
      month: row.month,
      totalSpent: parseFloat(row.total_spent),
    }));
  }

  async getCardRewardPerformance(
    userId: string,
    cardId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalSpent: number;
    estimatedRewards: number;
    effectiveRate: number;
  }> {
    // Get card reward structure
    const card = await db("credit_cards")
      .select("reward_structure", "annual_fee")
      .where("id", cardId)
      .first();

    if (!card) {
      return {
        totalSpent: 0,
        estimatedRewards: 0,
        effectiveRate: 0,
      };
    }

    const rewardStructure = card.reward_structure;
    const annualFee = parseFloat(card.annual_fee);

    // Get spending by category
    const categorySpending = await db("transactions")
      .select("category")
      .sum("amount as total_amount")
      .where({
        user_id: userId,
        card_used: cardId,
      })
      .whereBetween("transaction_date", [startDate, endDate])
      .groupBy("category");

    let totalSpent = 0;
    let totalRewards = 0;

    // Calculate rewards based on spending and reward structure
    categorySpending.forEach((spending) => {
      const amount = parseFloat(spending.total_amount);
      totalSpent += amount;

      // Find matching reward rate for this category
      const categoryReward = rewardStructure.find(
        (r: any) => r.category === spending.category
      );

      if (categoryReward) {
        totalRewards += amount * (categoryReward.rewardRate / 100);
      } else {
        // Use default/other category rate
        const defaultReward = rewardStructure.find(
          (r: any) =>
            r.category === "other" || r.category === SpendingCategory.OTHER
        );
        if (defaultReward) {
          totalRewards += amount * (defaultReward.rewardRate / 100);
        }
      }
    });

    // Calculate effective rate (accounting for annual fee)
    const effectiveRate =
      totalSpent > 0 ? ((totalRewards - annualFee) / totalSpent) * 100 : 0;

    return {
      totalSpent,
      estimatedRewards: totalRewards,
      effectiveRate: Math.max(0, effectiveRate), // Don't show negative rates
    };
  }

  async getMissedRewardOpportunities(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalMissedRewards: number;
    missedByCategory: {
      category: SpendingCategory;
      amount: number;
      potentialCard: string;
    }[];
  }> {
    // This is a complex calculation that would involve:
    // 1. Getting user's transactions
    // 2. Getting all available cards
    // 3. Calculating optimal card for each transaction
    // 4. Comparing with actual card used

    // For now, we'll implement a simplified version
    const transactions = await db("transactions")
      .select("category", "amount", "card_used")
      .where("user_id", userId)
      .whereBetween("transaction_date", [startDate, endDate]);

    const cards = await db("credit_cards")
      .select("id", "name", "reward_structure")
      .where("is_active", true);

    let totalMissedRewards = 0;
    const missedByCategory: Record<
      string,
      { amount: number; potentialCard: string }
    > = {};

    transactions.forEach((transaction) => {
      const amount = parseFloat(transaction.amount);
      const category = transaction.category;
      const cardUsed = transaction.card_used;

      // Find best card for this category
      let bestRewardRate = 0;
      let bestCardId = "";
      let bestCardName = "";

      cards.forEach((card) => {
        const rewardStructure = card.reward_structure;

        // Find matching reward rate for this category
        const categoryReward = rewardStructure.find(
          (r: any) => r.category === category
        );

        const rewardRate = categoryReward
          ? categoryReward.rewardRate
          : rewardStructure.find((r: any) => r.category === "other")
              ?.rewardRate || 0;

        if (rewardRate > bestRewardRate) {
          bestRewardRate = rewardRate;
          bestCardId = card.id;
          bestCardName = card.name;
        }
      });

      // If card used is not the best card, calculate missed rewards
      if (cardUsed !== bestCardId && bestCardId) {
        // Get reward rate of used card
        const usedCard = cards.find((c) => c.id === cardUsed);
        let usedCardRate = 0;

        if (usedCard) {
          const rewardStructure = usedCard.reward_structure;
          const categoryReward = rewardStructure.find(
            (r: any) => r.category === category
          );
          usedCardRate = categoryReward
            ? categoryReward.rewardRate
            : rewardStructure.find((r: any) => r.category === "other")
                ?.rewardRate || 0;
        }

        // Calculate missed rewards
        const missedReward = amount * ((bestRewardRate - usedCardRate) / 100);

        if (missedReward > 0) {
          totalMissedRewards += missedReward;

          if (!missedByCategory[category]) {
            missedByCategory[category] = {
              amount: 0,
              potentialCard: bestCardName,
            };
          }

          missedByCategory[category].amount += missedReward;
        }
      }
    });

    // Convert to array format
    const missedByCategories = Object.entries(missedByCategory).map(
      ([category, data]) => ({
        category: category as SpendingCategory,
        amount: data.amount,
        potentialCard: data.potentialCard,
      })
    );

    return {
      totalMissedRewards,
      missedByCategory: missedByCategories,
    };
  }

  async getSystemPerformanceMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    apiRequests: number;
    averageResponseTime: number;
    errorRate: number;
    recommendationMetrics: {
      totalGenerated: number;
      clickThroughRate: number;
      conversionRate: number;
    };
  }> {
    // This would typically come from application monitoring tools
    // For now, we'll return mock data
    return {
      apiRequests: 15000,
      averageResponseTime: 120, // ms
      errorRate: 0.2, // percentage
      recommendationMetrics: {
        totalGenerated: 5200,
        clickThroughRate: 22.5, // percentage
        conversionRate: 3.8, // percentage
      },
    };
  }

  protected mapFromDb(dbRow: any): AnalyticsCache {
    return {
      id: dbRow.id,
      userId: dbRow.user_id,
      analyticsType: dbRow.analytics_type,
      timeframe: dbRow.timeframe,
      startDate: dbRow.start_date,
      endDate: dbRow.end_date,
      cacheData: dbRow.cache_data,
      expiresAt: dbRow.expires_at,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
    };
  }

  protected mapToDb(entity: Partial<AnalyticsCache>): any {
    const dbRow: any = {};

    if (entity.userId !== undefined) dbRow.user_id = entity.userId;
    if (entity.analyticsType !== undefined)
      dbRow.analytics_type = entity.analyticsType;
    if (entity.timeframe !== undefined) dbRow.timeframe = entity.timeframe;
    if (entity.startDate !== undefined) dbRow.start_date = entity.startDate;
    if (entity.endDate !== undefined) dbRow.end_date = entity.endDate;
    if (entity.cacheData !== undefined)
      dbRow.cache_data = JSON.stringify(entity.cacheData);
    if (entity.expiresAt !== undefined) dbRow.expires_at = entity.expiresAt;

    return dbRow;
  }

  /**
   * Get recent transactions with card details and reward information
   */
  async getRecentTransactionsWithDetails(userId: string, limit: number = 20, offset: number = 0) {
    try {
      const query = `
        SELECT 
          t.id,
          t.user_id,
          t.amount,
          t.category,
          t.merchant,
          t.description,
          t.transaction_date,
          t.card_used,
          t.rewards_earned,
          t.metadata,
          cc.id as card_id,
          cc.name as card_name,
          cc.issuer,
          cc.card_type,
          cc.reward_structure
        FROM transactions t
        LEFT JOIN credit_cards cc ON t.card_used = cc.id
        WHERE t.user_id = ?
        ORDER BY t.transaction_date DESC
        LIMIT ? OFFSET ?
      `;

      const transactions = await db.raw(query, [userId, limit, offset]);
      
      return transactions.rows || transactions; // Handle different SQL drivers
    } catch (error) {
      console.error('Error getting recent transactions with details:', error);
      throw error;
    }
  }
}
