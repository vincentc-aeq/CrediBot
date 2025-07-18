import { Knex } from "knex";
import bcrypt from "bcryptjs";
import { CardType } from "../../models/types";

export async function seed(knex: Knex): Promise<void> {
  // Clear existing entries
  await knex("users").del();

  const hashedPassword = await bcrypt.hash("password123", 10);

  // Insert seed data
  await knex("users").insert([
    {
      id: "550e8400-e29b-41d4-a716-446655440101",
      email: "john.doe@example.com",
      password_hash: hashedPassword,
      first_name: "John",
      last_name: "Doe",
      preferences: JSON.stringify({
        cardTypes: [CardType.TRAVEL, CardType.CASHBACK],
        maxAnnualFee: 200,
        excludedCards: [],
        notificationSettings: {
          transactionAlerts: true,
          homepageRecommendations: true,
          optimizationSuggestions: true,
          emailNotifications: true,
          pushNotifications: false,
        },
      }),
      is_active: true,
      email_verified_at: new Date(),
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440102",
      email: "jane.smith@example.com",
      password_hash: hashedPassword,
      first_name: "Jane",
      last_name: "Smith",
      preferences: JSON.stringify({
        cardTypes: [CardType.CASHBACK],
        maxAnnualFee: 0,
        excludedCards: [],
        notificationSettings: {
          transactionAlerts: true,
          homepageRecommendations: true,
          optimizationSuggestions: false,
          emailNotifications: false,
          pushNotifications: false,
        },
      }),
      is_active: true,
      email_verified_at: new Date(),
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440103",
      email: "mike.wilson@example.com",
      password_hash: hashedPassword,
      first_name: "Mike",
      last_name: "Wilson",
      preferences: JSON.stringify({
        cardTypes: [CardType.TRAVEL, CardType.BUSINESS],
        maxAnnualFee: 500,
        excludedCards: ["550e8400-e29b-41d4-a716-446655440002"],
        notificationSettings: {
          transactionAlerts: true,
          homepageRecommendations: true,
          optimizationSuggestions: true,
          emailNotifications: true,
          pushNotifications: true,
        },
      }),
      is_active: true,
      email_verified_at: new Date(),
    },
  ]);
}
