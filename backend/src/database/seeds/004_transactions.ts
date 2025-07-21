import { Knex } from "knex";
import { SpendingCategory, RewardType } from "../../models/types";

// Helper function to calculate rewards based on card and category
function calculateRewards(amount: number, category: SpendingCategory, cardId: string): {
  points?: number;
  cashback?: number;
  miles?: number;
  rewardType: RewardType;
} {
  // Simplified reward calculation based on card types
  const rewardStructures: Record<string, any> = {
    // Chase Sapphire Preferred
    "550e8400-e29b-41d4-a716-446655440001": {
      [SpendingCategory.TRAVEL]: { rate: 2.0, type: RewardType.POINTS },
      [SpendingCategory.DINING]: { rate: 2.0, type: RewardType.POINTS },
      default: { rate: 1.0, type: RewardType.POINTS }
    },
    // Citi Double Cash
    "550e8400-e29b-41d4-a716-446655440002": {
      default: { rate: 2.0, type: RewardType.CASHBACK }
    },
    // Amex Gold
    "550e8400-e29b-41d4-a716-446655440003": {
      [SpendingCategory.DINING]: { rate: 4.0, type: RewardType.POINTS },
      [SpendingCategory.GROCERIES]: { rate: 4.0, type: RewardType.POINTS },
      default: { rate: 1.0, type: RewardType.POINTS }
    },
    // Discover it
    "550e8400-e29b-41d4-a716-446655440004": {
      default: { rate: 1.0, type: RewardType.CASHBACK }
    },
    // Capital One Venture
    "550e8400-e29b-41d4-a716-446655440005": {
      default: { rate: 2.0, type: RewardType.MILES }
    }
  };

  const cardRewards = rewardStructures[cardId];
  if (!cardRewards) {
    return { rewardType: RewardType.POINTS, points: amount };
  }

  const categoryReward = cardRewards[category] || cardRewards.default;
  const rewardAmount = amount * categoryReward.rate;

  switch (categoryReward.type) {
    case RewardType.CASHBACK:
      return { cashback: rewardAmount, rewardType: RewardType.CASHBACK };
    case RewardType.MILES:
      return { miles: rewardAmount, rewardType: RewardType.MILES };
    default:
      return { points: rewardAmount, rewardType: RewardType.POINTS };
  }
}

export async function seed(knex: Knex): Promise<void> {
  // Clear existing entries
  await knex("transactions").del();

  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Enhanced transaction data with rewards calculation
  const baseTransactions = [
    // John Doe's transactions (more diverse spending)
    {
      id: "550e8400-e29b-41d4-a716-446655440301",
      user_id: "550e8400-e29b-41d4-a716-446655440101",
      amount: 85.5,
      category: SpendingCategory.GROCERIES,
      merchant: "Whole Foods Market",
      description: "Weekly grocery shopping",
      transaction_date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      card_used: "550e8400-e29b-41d4-a716-446655440002", // Citi Double Cash
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440302",
      user_id: "550e8400-e29b-41d4-a716-446655440101",
      amount: 45.75,
      category: SpendingCategory.DINING,
      merchant: "The Cheesecake Factory",
      description: "Dinner with friends",
      transaction_date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      card_used: "550e8400-e29b-41d4-a716-446655440001", // Chase Sapphire Preferred
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440303",
      user_id: "550e8400-e29b-41d4-a716-446655440101",
      amount: 1250.0,
      category: SpendingCategory.TRAVEL,
      merchant: "Delta Airlines",
      description: "Flight to New York",
      transaction_date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      card_used: "550e8400-e29b-41d4-a716-446655440001", // Chase Sapphire Preferred
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440304",
      user_id: "550e8400-e29b-41d4-a716-446655440101",
      amount: 65.2,
      category: SpendingCategory.GAS,
      merchant: "Shell",
      description: "Gas fill-up",
      transaction_date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      card_used: "550e8400-e29b-41d4-a716-446655440002", // Citi Double Cash
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440305",
      user_id: "550e8400-e29b-41d4-a716-446655440101",
      amount: 120.0,
      category: SpendingCategory.GROCERIES,
      merchant: "Costco",
      description: "Bulk shopping",
      transaction_date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      card_used: "550e8400-e29b-41d4-a716-446655440002", // Citi Double Cash - suboptimal for groceries
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440306",
      user_id: "550e8400-e29b-41d4-a716-446655440101",
      amount: 89.99,
      category: SpendingCategory.DINING,
      merchant: "Olive Garden",
      description: "Family dinner",
      transaction_date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      card_used: "550e8400-e29b-41d4-a716-446655440002", // Citi Double Cash - suboptimal for dining
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440307",
      user_id: "550e8400-e29b-41d4-a716-446655440101",
      amount: 156.78,
      category: SpendingCategory.SHOPPING,
      merchant: "Target",
      description: "Household items",
      transaction_date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      card_used: "550e8400-e29b-41d4-a716-446655440001", // Chase Sapphire Preferred
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440308",
      user_id: "550e8400-e29b-41d4-a716-446655440101",
      amount: 42.30,
      category: SpendingCategory.DINING,
      merchant: "Chipotle",
      description: "Quick lunch",
      transaction_date: new Date(now.getTime() - 0.5 * 24 * 60 * 60 * 1000),
      card_used: "550e8400-e29b-41d4-a716-446655440002", // Citi Double Cash - suboptimal
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440309",
      user_id: "550e8400-e29b-41d4-a716-446655440101",
      amount: 95.60,
      category: SpendingCategory.GROCERIES,
      merchant: "Safeway",
      description: "Weekly groceries",
      transaction_date: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      card_used: "550e8400-e29b-41d4-a716-446655440001", // Chase Sapphire Preferred - suboptimal
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440310",
      user_id: "550e8400-e29b-41d4-a716-446655440101",
      amount: 78.45,
      category: SpendingCategory.GAS,
      merchant: "Chevron",
      description: "Gas fill-up",
      transaction_date: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
      card_used: "550e8400-e29b-41d4-a716-446655440001", // Chase Sapphire Preferred - suboptimal
    },
  ];

  // Calculate rewards for each transaction and create final transaction objects
  const transactions = baseTransactions.map(transaction => {
    const rewards = calculateRewards(transaction.amount, transaction.category, transaction.card_used);
    return {
      ...transaction,
      rewards_earned: JSON.stringify(rewards),
      metadata: JSON.stringify({ 
        location: "Seattle, WA",
        ...rewards 
      }),
    };
  });

  // Insert enhanced transaction data
  await knex("transactions").insert(transactions);
}
