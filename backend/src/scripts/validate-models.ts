#!/usr/bin/env ts-node

import { UserRepository } from "../repositories/UserRepository";
import { CreditCardRepository } from "../repositories/CreditCardRepository";
import { CardType, SpendingCategory } from "../models/types";
import db from "../database/connection";

async function validateModels() {
  console.log("🔍 Validating data models and database schema...\n");

  try {
    // Test database connection
    await db.raw("SELECT 1");
    console.log("✅ Database connection successful");

    // Initialize repositories
    const userRepo = new UserRepository();
    const cardRepo = new CreditCardRepository();

    // Test User model
    console.log("\n📊 Testing User model:");
    const users = await userRepo.findActiveUsers(5);
    console.log(`✅ Found ${users.length} active users`);

    if (users.length > 0) {
      const user = users[0];
      console.log(
        `✅ User: ${user.firstName} ${user.lastName} (${user.email})`
      );
      console.log(`✅ Preferences: ${user.preferences.cardTypes.join(", ")}`);
      console.log(`✅ Max annual fee: $${user.preferences.maxAnnualFee}`);
    }

    // Test CreditCard model
    console.log("\n💳 Testing CreditCard model:");
    const cards = await cardRepo.findActiveCards();
    console.log(`✅ Found ${cards.length} active credit cards`);

    if (cards.length > 0) {
      const card = cards[0];
      console.log(`✅ Card: ${card.name} by ${card.issuer}`);
      console.log(`✅ Type: ${card.cardType}, Annual Fee: $${card.annualFee}`);
      console.log(
        `✅ Reward structure: ${card.rewardStructure.length} categories`
      );
    }

    // Test card filtering
    const travelCards = await cardRepo.findByCardType(CardType.TRAVEL);
    console.log(`✅ Found ${travelCards.length} travel cards`);

    const noFeeCards = await cardRepo.findCardsWithNoAnnualFee();
    console.log(`✅ Found ${noFeeCards.length} cards with no annual fee`);

    // Test database relationships
    console.log("\n🔗 Testing database relationships:");
    const userCardsQuery = await db("user_cards")
      .join("users", "user_cards.user_id", "users.id")
      .join("credit_cards", "user_cards.card_id", "credit_cards.id")
      .select(
        "users.first_name",
        "users.last_name",
        "credit_cards.name as card_name",
        "user_cards.nickname",
        "user_cards.is_primary"
      )
      .limit(5);

    console.log(`✅ Found ${userCardsQuery.length} user-card relationships`);
    userCardsQuery.forEach((uc) => {
      console.log(
        `  - ${uc.first_name} ${uc.last_name}: ${uc.card_name}${
          uc.nickname ? ` (${uc.nickname})` : ""
        }${uc.is_primary ? " [PRIMARY]" : ""}`
      );
    });

    // Test transactions
    console.log("\n💰 Testing transaction data:");
    const transactionSummary = await db("transactions")
      .select("category")
      .count("* as count")
      .sum("amount as total")
      .groupBy("category")
      .orderBy("total", "desc");

    console.log("✅ Transaction summary by category:");
    transactionSummary.forEach((ts) => {
      console.log(
        `  - ${ts.category}: ${ts.count} transactions, $${parseFloat(
          ts.total
        ).toFixed(2)} total`
      );
    });

    // Test enum values
    console.log("\n🏷️  Testing enum values:");
    console.log(`✅ Card types: ${Object.values(CardType).join(", ")}`);
    console.log(
      `✅ Spending categories: ${Object.values(SpendingCategory).join(", ")}`
    );

    console.log("\n🎉 All model validations passed successfully!");
  } catch (error) {
    console.error("❌ Model validation failed:", error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  validateModels();
}

export { validateModels };
