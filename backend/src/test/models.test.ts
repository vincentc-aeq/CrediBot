import { UserRepository } from "../repositories/UserRepository";
import { CardType } from "../models/types";
import db from "../database/connection";

describe("Models and Database Integration", () => {
  let userRepository: UserRepository;

  beforeAll(async () => {
    userRepository = new UserRepository();
  });

  describe("UserRepository", () => {
    test("should find user by email", async () => {
      const user = await userRepository.findByEmail("john.doe@example.com");

      expect(user).toBeDefined();
      expect(user?.email).toBe("john.doe@example.com");
      expect(user?.firstName).toBe("John");
      expect(user?.lastName).toBe("Doe");
      expect(user?.preferences.cardTypes).toContain(CardType.TRAVEL);
      expect(user?.preferences.cardTypes).toContain(CardType.CASHBACK);
    });

    test("should find user without password", async () => {
      const user = await userRepository.findByEmailWithoutPassword(
        "jane.smith@example.com"
      );

      expect(user).toBeDefined();
      expect(user?.email).toBe("jane.smith@example.com");
      expect(user?.firstName).toBe("Jane");
      expect(user?.lastName).toBe("Smith");
      expect((user as any).passwordHash).toBeUndefined();
    });

    test("should return undefined for non-existent user", async () => {
      const user = await userRepository.findByEmail("nonexistent@example.com");
      expect(user).toBeUndefined();
    });

    test("should find active users", async () => {
      const users = await userRepository.findActiveUsers(10);

      expect(users.length).toBeGreaterThan(0);
      expect(users.every((user) => user.isActive)).toBe(true);
    });

    test("should count total users", async () => {
      const count = await userRepository.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  describe("Database Schema Validation", () => {
    test("should have all required tables", async () => {
      const tables = await db.raw(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `);

      const tableNames = tables.rows.map((row: any) => row.table_name);

      expect(tableNames).toContain("users");
      expect(tableNames).toContain("credit_cards");
      expect(tableNames).toContain("transactions");
      expect(tableNames).toContain("user_cards");
      expect(tableNames).toContain("recommendations");
    });

    test("should have seed data in credit_cards table", async () => {
      const cards = await db("credit_cards").select("*");

      expect(cards.length).toBeGreaterThan(0);
      expect(
        cards.some((card: any) => card.name === "Chase Sapphire Preferred")
      ).toBe(true);
      expect(
        cards.some((card: any) => card.name === "Citi Double Cash Card")
      ).toBe(true);
    });

    test("should have seed data in transactions table", async () => {
      const transactions = await db("transactions").select("*");

      expect(transactions.length).toBeGreaterThan(0);
      expect(
        transactions.some((tx: any) => tx.merchant === "Whole Foods Market")
      ).toBe(true);
    });

    test("should have proper foreign key relationships", async () => {
      // Test user_cards relationship
      const userCards = await db("user_cards")
        .join("users", "user_cards.user_id", "users.id")
        .join("credit_cards", "user_cards.card_id", "credit_cards.id")
        .select("user_cards.*", "users.email", "credit_cards.name")
        .first();

      expect(userCards).toBeDefined();
      expect(userCards.email).toBeDefined();
      expect(userCards.name).toBeDefined();
    });
  });
});
