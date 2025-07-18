import { Knex } from "knex";
import { SpendingCategory } from "../../models/types";

export async function seed(knex: Knex): Promise<void> {
  // Clear existing entries
  await knex("transactions").del();

  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Insert seed data
  await knex("transactions").insert([
    // John Doe's transactions
    {
      id: "550e8400-e29b-41d4-a716-446655440301",
      user_id: "550e8400-e29b-41d4-a716-446655440101",
      amount: 85.5,
      category: SpendingCategory.GROCERIES,
      merchant: "Whole Foods Market",
      description: "Weekly grocery shopping",
      transaction_date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      card_used: "550e8400-e29b-41d4-a716-446655440002",
      metadata: JSON.stringify({ location: "Seattle, WA" }),
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440302",
      user_id: "550e8400-e29b-41d4-a716-446655440101",
      amount: 45.75,
      category: SpendingCategory.DINING,
      merchant: "The Cheesecake Factory",
      description: "Dinner with friends",
      transaction_date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      card_used: "550e8400-e29b-41d4-a716-446655440001",
      metadata: JSON.stringify({ location: "Seattle, WA" }),
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440303",
      user_id: "550e8400-e29b-41d4-a716-446655440101",
      amount: 1250.0,
      category: SpendingCategory.TRAVEL,
      merchant: "Delta Airlines",
      description: "Flight to New York",
      transaction_date: new Date(
        oneMonthAgo.getTime() - 3 * 24 * 60 * 60 * 1000
      ),
      card_used: "550e8400-e29b-41d4-a716-446655440001",
      metadata: JSON.stringify({ location: "Online", flightNumber: "DL1234" }),
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440304",
      user_id: "550e8400-e29b-41d4-a716-446655440101",
      amount: 65.2,
      category: SpendingCategory.GAS,
      merchant: "Shell",
      description: "Gas fill-up",
      transaction_date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      card_used: "550e8400-e29b-41d4-a716-446655440002",
      metadata: JSON.stringify({ location: "Seattle, WA" }),
    },

    // Jane Smith's transactions
    {
      id: "550e8400-e29b-41d4-a716-446655440305",
      user_id: "550e8400-e29b-41d4-a716-446655440102",
      amount: 125.3,
      category: SpendingCategory.SHOPPING,
      merchant: "Amazon",
      description: "Online shopping",
      transaction_date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      card_used: "550e8400-e29b-41d4-a716-446655440004",
      metadata: JSON.stringify({
        location: "Online",
        orderNumber: "AMZ123456",
      }),
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440306",
      user_id: "550e8400-e29b-41d4-a716-446655440102",
      amount: 75.0,
      category: SpendingCategory.GROCERIES,
      merchant: "Safeway",
      description: "Grocery shopping",
      transaction_date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      card_used: "550e8400-e29b-41d4-a716-446655440004",
      metadata: JSON.stringify({ location: "Portland, OR" }),
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440307",
      user_id: "550e8400-e29b-41d4-a716-446655440102",
      amount: 35.5,
      category: SpendingCategory.DINING,
      merchant: "Starbucks",
      description: "Coffee and pastry",
      transaction_date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      card_used: "550e8400-e29b-41d4-a716-446655440004",
      metadata: JSON.stringify({ location: "Portland, OR" }),
    },

    // Mike Wilson's transactions
    {
      id: "550e8400-e29b-41d4-a716-446655440308",
      user_id: "550e8400-e29b-41d4-a716-446655440103",
      amount: 180.75,
      category: SpendingCategory.DINING,
      merchant: "Morton's The Steakhouse",
      description: "Business dinner",
      transaction_date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      card_used: "550e8400-e29b-41d4-a716-446655440003",
      metadata: JSON.stringify({
        location: "San Francisco, CA",
        businessExpense: true,
      }),
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440309",
      user_id: "550e8400-e29b-41d4-a716-446655440103",
      amount: 2100.0,
      category: SpendingCategory.TRAVEL,
      merchant: "Marriott Hotels",
      description: "Business trip accommodation",
      transaction_date: new Date(
        oneMonthAgo.getTime() - 10 * 24 * 60 * 60 * 1000
      ),
      card_used: "550e8400-e29b-41d4-a716-446655440005",
      metadata: JSON.stringify({
        location: "New York, NY",
        businessExpense: true,
      }),
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440310",
      user_id: "550e8400-e29b-41d4-a716-446655440103",
      amount: 95.4,
      category: SpendingCategory.GROCERIES,
      merchant: "Trader Joe's",
      description: "Weekly groceries",
      transaction_date: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      card_used: "550e8400-e29b-41d4-a716-446655440003",
      metadata: JSON.stringify({ location: "San Francisco, CA" }),
    },
  ]);
}
