import { Knex } from "knex";
import { CardType, SpendingCategory, RewardType } from "../../models/types";

export async function seed(knex: Knex): Promise<void> {
  // Clear existing entries in correct order (dependent tables first)
  await knex("user_cards").del();
  await knex("transactions").del();
  await knex("credit_cards").del();

  // Insert seed data
  await knex("credit_cards").insert([
    {
      id: "550e8400-e29b-41d4-a716-446655440001",
      name: "Chase Sapphire Preferred",
      issuer: "Chase",
      card_type: CardType.TRAVEL,
      annual_fee: 95,
      reward_structure: JSON.stringify([
        {
          category: SpendingCategory.TRAVEL,
          rewardRate: 2.0,
          rewardType: RewardType.POINTS,
        },
        {
          category: SpendingCategory.DINING,
          rewardRate: 2.0,
          rewardType: RewardType.POINTS,
        },
        {
          category: SpendingCategory.OTHER,
          rewardRate: 1.0,
          rewardType: RewardType.POINTS,
        },
      ]),
      benefits: JSON.stringify([
        "25% more value when you redeem for airfare, hotels, car rentals and cruises through Chase Ultimate Rewards",
        "No foreign transaction fees",
        "Trip cancellation/interruption insurance",
        "Baggage delay insurance",
      ]),
      requirements: JSON.stringify({
        minCreditScore: 700,
        minIncome: 50000,
      }),
      description:
        "Earn 2X points on travel and dining at restaurants worldwide, plus 1 point per $1 spent on all other purchases.",
      is_active: true,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440002",
      name: "Citi Double Cash Card",
      issuer: "Citi",
      card_type: CardType.CASHBACK,
      annual_fee: 0,
      reward_structure: JSON.stringify([
        {
          category: SpendingCategory.OTHER,
          rewardRate: 2.0,
          rewardType: RewardType.CASHBACK,
        },
      ]),
      benefits: JSON.stringify([
        "Earn 1% cash back when you buy, plus 1% as you pay",
        "No annual fee",
        "No category restrictions or quarterly activation required",
      ]),
      requirements: JSON.stringify({
        minCreditScore: 650,
      }),
      description:
        "Earn 2% on every purchase with unlimited 1% cash back when you buy, plus an additional 1% as you pay for those purchases.",
      is_active: true,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440003",
      name: "American Express Gold Card",
      issuer: "American Express",
      card_type: CardType.TRAVEL,
      annual_fee: 250,
      reward_structure: JSON.stringify([
        {
          category: SpendingCategory.DINING,
          rewardRate: 4.0,
          rewardType: RewardType.POINTS,
        },
        {
          category: SpendingCategory.GROCERIES,
          rewardRate: 4.0,
          rewardType: RewardType.POINTS,
          cap: 25000,
        },
        {
          category: SpendingCategory.OTHER,
          rewardRate: 1.0,
          rewardType: RewardType.POINTS,
        },
      ]),
      benefits: JSON.stringify([
        "$120 Uber Cash annually",
        "$120 dining credit annually",
        "No foreign transaction fees",
        "Baggage insurance plan",
      ]),
      requirements: JSON.stringify({
        minCreditScore: 700,
        minIncome: 60000,
      }),
      description:
        "Earn 4X Membership Rewards points at Restaurants worldwide, plus takeout and delivery in the U.S., and 4X points at U.S. supermarkets (up to $25,000 per calendar year in purchases, then 1X).",
      is_active: true,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440004",
      name: "Discover it Cash Back",
      issuer: "Discover",
      card_type: CardType.CASHBACK,
      annual_fee: 0,
      reward_structure: JSON.stringify([
        {
          category: SpendingCategory.OTHER,
          rewardRate: 1.0,
          rewardType: RewardType.CASHBACK,
        },
      ]),
      benefits: JSON.stringify([
        "5% cash back on everyday purchases at different places each quarter like grocery stores, restaurants, gas stations, and more, up to the quarterly maximum when you activate",
        "Unlimited 1% cash back on all other purchases",
        "Cashback Match - Discover will automatically match all the cash back you've earned at the end of your first year",
        "No annual fee",
      ]),
      requirements: JSON.stringify({
        minCreditScore: 600,
      }),
      description:
        "Earn 5% cash back on everyday purchases at different places each quarter like grocery stores, restaurants, gas stations, and more, up to the quarterly maximum when you activate. Plus, earn unlimited 1% cash back on all other purchases.",
      is_active: true,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440005",
      name: "Capital One Venture Rewards",
      issuer: "Capital One",
      card_type: CardType.TRAVEL,
      annual_fee: 95,
      reward_structure: JSON.stringify([
        {
          category: SpendingCategory.OTHER,
          rewardRate: 2.0,
          rewardType: RewardType.MILES,
        },
      ]),
      benefits: JSON.stringify([
        "Earn unlimited 2X miles on every purchase",
        "No foreign transaction fees",
        "Transfer miles to 15+ travel loyalty programs",
        "Global Entry or TSA PreCheck application fee credit",
      ]),
      requirements: JSON.stringify({
        minCreditScore: 660,
        minIncome: 40000,
      }),
      description:
        "Earn unlimited 2X miles on every purchase, every day. Miles won't expire for the life of the account and there's no limit to how many you can earn.",
      is_active: true,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440006",
      name: "Chase Freedom Unlimited",
      issuer: "Chase",
      card_type: CardType.CASHBACK,
      annual_fee: 0,
      reward_structure: JSON.stringify([
        {
          category: SpendingCategory.OTHER,
          rewardRate: 1.5,
          rewardType: RewardType.CASHBACK,
        },
      ]),
      benefits: JSON.stringify([
        "Earn 1.5% cash back on all purchases",
        "No annual fee",
        "No category restrictions or quarterly activation required",
        "Redeem for cash back, travel, gift cards and more",
      ]),
      requirements: JSON.stringify({
        minCreditScore: 650,
      }),
      description:
        "Earn 1.5% cash back on all purchases with no limit to how much you can earn and no expiration on rewards.",
      is_active: true,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440007",
      name: "Blue Cash Preferred Card",
      issuer: "American Express",
      card_type: CardType.CASHBACK,
      annual_fee: 95,
      reward_structure: JSON.stringify([
        {
          category: SpendingCategory.GROCERIES,
          rewardRate: 6.0,
          rewardType: RewardType.CASHBACK,
          cap: 6000,
        },
        {
          category: SpendingCategory.ENTERTAINMENT,
          rewardRate: 3.0,
          rewardType: RewardType.CASHBACK,
        },
        {
          category: SpendingCategory.GAS,
          rewardRate: 3.0,
          rewardType: RewardType.CASHBACK,
        },
        {
          category: SpendingCategory.OTHER,
          rewardRate: 1.0,
          rewardType: RewardType.CASHBACK,
        },
      ]),
      benefits: JSON.stringify([
        "6% cash back at U.S. supermarkets on up to $6,000 per year",
        "3% cash back at U.S. gas stations",
        "3% cash back on transit",
        "1% cash back on other purchases",
      ]),
      requirements: JSON.stringify({
        minCreditScore: 670,
      }),
      description:
        "Earn 6% cash back at U.S. supermarkets on up to $6,000 per year in purchases, then 1%. 3% cash back at U.S. gas stations and on transit. 1% cash back on other purchases.",
      is_active: true,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440008",
      name: "Wells Fargo Active Cash Card",
      issuer: "Wells Fargo",
      card_type: CardType.CASHBACK,
      annual_fee: 0,
      reward_structure: JSON.stringify([
        {
          category: SpendingCategory.OTHER,
          rewardRate: 2.0,
          rewardType: RewardType.CASHBACK,
        },
      ]),
      benefits: JSON.stringify([
        "Earn unlimited 2% cash rewards on purchases",
        "No annual fee",
        "No category restrictions or quarterly activation required",
        "Cellphone protection up to $600",
      ]),
      requirements: JSON.stringify({
        minCreditScore: 600,
      }),
      description:
        "Earn unlimited 2% cash rewards on purchases. No annual fee, no category restrictions, and no quarterly activation required.",
      is_active: true,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440009",
      name: "Chase Sapphire Reserve",
      issuer: "Chase",
      card_type: CardType.TRAVEL,
      annual_fee: 550,
      reward_structure: JSON.stringify([
        {
          category: SpendingCategory.TRAVEL,
          rewardRate: 3.0,
          rewardType: RewardType.POINTS,
        },
        {
          category: SpendingCategory.DINING,
          rewardRate: 3.0,
          rewardType: RewardType.POINTS,
        },
        {
          category: SpendingCategory.OTHER,
          rewardRate: 1.0,
          rewardType: RewardType.POINTS,
        },
      ]),
      benefits: JSON.stringify([
        "$300 annual travel credit",
        "50% more value when you redeem for travel through Chase Ultimate Rewards",
        "Priority Pass Select membership",
        "No foreign transaction fees",
        "Trip cancellation/interruption insurance",
        "Primary rental car insurance",
      ]),
      requirements: JSON.stringify({
        minCreditScore: 750,
        minIncome: 100000,
      }),
      description:
        "Earn 3X points on travel and dining at restaurants worldwide, plus 1 point per $1 spent on all other purchases.",
      is_active: true,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440010",
      name: "Capital One Quicksilver",
      issuer: "Capital One",
      card_type: CardType.CASHBACK,
      annual_fee: 0,
      reward_structure: JSON.stringify([
        {
          category: SpendingCategory.OTHER,
          rewardRate: 1.5,
          rewardType: RewardType.CASHBACK,
        },
      ]),
      benefits: JSON.stringify([
        "Earn unlimited 1.5% cash back on every purchase",
        "No annual fee",
        "No foreign transaction fees",
        "No rotating categories to track",
      ]),
      requirements: JSON.stringify({
        minCreditScore: 650,
      }),
      description:
        "Earn unlimited 1.5% cash back on every purchase, every day. No rotating categories or sign-ups needed.",
      is_active: true,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440011",
      name: "Chase Ink Business Preferred",
      issuer: "Chase",
      card_type: CardType.BUSINESS,
      annual_fee: 95,
      reward_structure: JSON.stringify([
        {
          category: SpendingCategory.TRAVEL,
          rewardRate: 3.0,
          rewardType: RewardType.POINTS,
        },
        {
          category: SpendingCategory.SHOPPING,
          rewardRate: 3.0,
          rewardType: RewardType.POINTS,
          cap: 150000,
        },
        {
          category: SpendingCategory.OTHER,
          rewardRate: 1.0,
          rewardType: RewardType.POINTS,
        },
      ]),
      benefits: JSON.stringify([
        "3X points on travel",
        "3X points on shipping purchases, internet, cable and phone services",
        "3X points on advertising purchases with social media sites and search engines",
        "25% more value when you redeem for travel through Chase Ultimate Rewards",
      ]),
      requirements: JSON.stringify({
        minCreditScore: 680,
        businessRequired: true,
      }),
      description:
        "Earn 3X points on travel and on shipping purchases, internet, cable and phone services, and advertising purchases made with social media sites and search engines on up to $150,000 combined in purchases each account anniversary year.",
      is_active: true,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440012",
      name: "Discover it Student Cash Back",
      issuer: "Discover",
      card_type: CardType.STUDENT,
      annual_fee: 0,
      reward_structure: JSON.stringify([
        {
          category: SpendingCategory.OTHER,
          rewardRate: 1.0,
          rewardType: RewardType.CASHBACK,
        },
      ]),
      benefits: JSON.stringify([
        "5% cash back on everyday purchases at different places each quarter",
        "Unlimited 1% cash back on all other purchases",
        "Cashback Match for first year",
        "No annual fee",
        "Good Grade Rewards",
      ]),
      requirements: JSON.stringify({
        minCreditScore: 580,
      }),
      description:
        "Earn 5% cash back on everyday purchases at different places each quarter like grocery stores, restaurants, gas stations, and more, up to the quarterly maximum when you activate.",
      is_active: true,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440013",
      name: "Capital One Secured Mastercard",
      issuer: "Capital One",
      card_type: CardType.SECURED,
      annual_fee: 0,
      reward_structure: JSON.stringify([
        {
          category: SpendingCategory.OTHER,
          rewardRate: 0.0,
          rewardType: RewardType.CASHBACK,
        },
      ]),
      benefits: JSON.stringify([
        "Build credit with responsible use",
        "No annual fee",
        "Access to a higher credit line after making your first 5 monthly payments on time",
        "Free access to CreditWise from Capital One",
      ]),
      requirements: JSON.stringify({
        minCreditScore: 300,
      }),
      description:
        "Build credit with responsible use. Put down a refundable security deposit starting at $49, $99 or $200 minimum based on your creditworthiness.",
      is_active: true,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440014",
      name: "Bank of America Premium Rewards",
      issuer: "Bank of America",
      card_type: CardType.TRAVEL,
      annual_fee: 95,
      reward_structure: JSON.stringify([
        {
          category: SpendingCategory.TRAVEL,
          rewardRate: 2.0,
          rewardType: RewardType.POINTS,
        },
        {
          category: SpendingCategory.DINING,
          rewardRate: 2.0,
          rewardType: RewardType.POINTS,
        },
        {
          category: SpendingCategory.OTHER,
          rewardRate: 1.5,
          rewardType: RewardType.POINTS,
        },
      ]),
      benefits: JSON.stringify([
        "$100 annual airline incidental credit",
        "No foreign transaction fees",
        "Priority Pass Select membership",
        "Preferred Rewards program boosts",
      ]),
      requirements: JSON.stringify({
        minCreditScore: 650,
      }),
      description:
        "Earn 2 points per $1 spent on travel and dining purchases, and 1.5 points per $1 spent on all other purchases.",
      is_active: true,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440015",
      name: "Citi Premier Card",
      issuer: "Citi",
      card_type: CardType.TRAVEL,
      annual_fee: 95,
      reward_structure: JSON.stringify([
        {
          category: SpendingCategory.TRAVEL,
          rewardRate: 3.0,
          rewardType: RewardType.POINTS,
        },
        {
          category: SpendingCategory.DINING,
          rewardRate: 3.0,
          rewardType: RewardType.POINTS,
        },
        {
          category: SpendingCategory.GROCERIES,
          rewardRate: 3.0,
          rewardType: RewardType.POINTS,
        },
        {
          category: SpendingCategory.GAS,
          rewardRate: 3.0,
          rewardType: RewardType.POINTS,
        },
        {
          category: SpendingCategory.OTHER,
          rewardRate: 1.0,
          rewardType: RewardType.POINTS,
        },
      ]),
      benefits: JSON.stringify([
        "3X points on restaurants, supermarkets, gas stations, air travel and hotels",
        "1X points on all other purchases",
        "Transfer points to 18+ airline and hotel partners",
        "No foreign transaction fees",
      ]),
      requirements: JSON.stringify({
        minCreditScore: 650,
      }),
      description:
        "Earn 3 ThankYou Points per $1 spent at restaurants, supermarkets, gas stations, air travel and hotels, and 1 point per $1 spent on all other purchases.",
      is_active: true,
    },
  ]);
}
