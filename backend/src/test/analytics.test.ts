import { AnalyticsService } from "../services/AnalyticsService";
import { TransactionRepository } from "../repositories/TransactionRepository";
import { UserRepository } from "../repositories/UserRepository";
import { CreditCardRepository } from "../repositories/CreditCardRepository";
import { UserCardRepository } from "../repositories/UserCardRepository";
import { SpendingCategory } from "../models/types";
import db from "../database/connection";

// Mock repositories
jest.mock("../repositories/TransactionRepository");
jest.mock("../repositories/UserRepository");
jest.mock("../repositories/CreditCardRepository");
jest.mock("../repositories/UserCardRepository");
jest.mock("../database/redis", () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue("OK"),
}));

describe("Analytics Service", () => {
  let analyticsService: AnalyticsService;
  let mockTransactionRepo: jest.Mocked<TransactionRepository>;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockCreditCardRepo: jest.Mocked<CreditCardRepository>;
  let mockUserCardRepo: jest.Mocked<UserCardRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock repositories
    mockTransactionRepo =
      new TransactionRepository() as jest.Mocked<TransactionRepository>;
    mockUserRepo = new UserRepository() as jest.Mocked<UserRepository>;
    mockCreditCardRepo =
      new CreditCardRepository() as jest.Mocked<CreditCardRepository>;
    mockUserCardRepo =
      new UserCardRepository() as jest.Mocked<UserCardRepository>;

    // Create service with mocked dependencies
    analyticsService = new AnalyticsService();

    // Replace service repositories with mocks
    (analyticsService as any).transactionRepository = mockTransactionRepo;
    (analyticsService as any).userRepository = mockUserRepo;
    (analyticsService as any).creditCardRepository = mockCreditCardRepo;
    (analyticsService as any).userCardRepository = mockUserCardRepo;
  });

  describe("getSpendingAnalytics", () => {
    it("should return spending analytics for a user", async () => {
      // Mock user
      mockUserRepo.findById.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        // Add other required user properties
      } as any);

      // Mock transactions
      mockTransactionRepo.findByDateRange.mockResolvedValue([
        {
          id: "tx-1",
          userId: "user-123",
          amount: 100,
          category: SpendingCategory.GROCERIES,
          merchant: "Whole Foods",
          transactionDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "tx-2",
          userId: "user-123",
          amount: 50,
          category: SpendingCategory.DINING,
          merchant: "Restaurant",
          transactionDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);

      // Call the service
      const result = await analyticsService.getSpendingAnalytics({
        userId: "user-123",
        timeframe: "month",
      });

      // Assertions
      expect(result).toBeDefined();
      expect(result.userId).toBe("user-123");
      expect(result.totalSpent).toBe(150);
      expect(result.transactionCount).toBe(2);
      expect(result.spendingByCategory.length).toBe(2);
      expect(mockUserRepo.findById).toHaveBeenCalledWith("user-123");
      expect(mockTransactionRepo.findByDateRange).toHaveBeenCalledTimes(2);
    });

    it("should return empty analytics when no transactions exist", async () => {
      // Mock user
      mockUserRepo.findById.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        // Add other required user properties
      } as any);

      // Mock empty transactions
      mockTransactionRepo.findByDateRange.mockResolvedValue([]);

      // Call the service
      const result = await analyticsService.getSpendingAnalytics({
        userId: "user-123",
        timeframe: "month",
      });

      // Assertions
      expect(result).toBeDefined();
      expect(result.userId).toBe("user-123");
      expect(result.totalSpent).toBe(0);
      expect(result.transactionCount).toBe(0);
      expect(result.spendingByCategory.length).toBe(0);
    });

    it("should throw error when user not found", async () => {
      // Mock user not found
      mockUserRepo.findById.mockResolvedValue(undefined);

      // Call the service and expect error
      await expect(
        analyticsService.getSpendingAnalytics({
          userId: "non-existent-user",
          timeframe: "month",
        })
      ).rejects.toThrow("User not found");
    });
  });

  describe("getCardPerformanceAnalytics", () => {
    it("should return card performance analytics", async () => {
      // Mock user card
      mockUserCardRepo.findByUserAndCardId.mockResolvedValue({
        id: "user-card-1",
        userId: "user-123",
        creditCardId: "card-456",
        // Add other required properties
      } as any);

      // Mock credit card
      mockCreditCardRepo.findById.mockResolvedValue({
        id: "card-456",
        name: "Test Card",
        issuer: "Test Bank",
        annualFee: 95,
        rewardStructure: [
          {
            category: SpendingCategory.GROCERIES,
            rewardRate: 3.0,
            rewardType: "cashback",
          },
          {
            category: SpendingCategory.DINING,
            rewardRate: 2.0,
            rewardType: "cashback",
          },
          {
            category: SpendingCategory.OTHER,
            rewardRate: 1.0,
            rewardType: "cashback",
          },
        ],
        // Add other required properties
      } as any);

      // Mock transactions
      mockTransactionRepo.findByCardAndDateRange.mockResolvedValue([
        {
          id: "tx-1",
          userId: "user-123",
          amount: 100,
          category: SpendingCategory.GROCERIES,
          merchant: "Whole Foods",
          cardUsed: "card-456",
          transactionDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "tx-2",
          userId: "user-123",
          amount: 50,
          category: SpendingCategory.DINING,
          merchant: "Restaurant",
          cardUsed: "card-456",
          transactionDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);

      // Mock active cards for missed rewards calculation
      mockCreditCardRepo.findActiveCards.mockResolvedValue([
        {
          id: "card-456",
          name: "Test Card",
          // Same as above
        } as any,
        {
          id: "card-789",
          name: "Better Card",
          rewardStructure: [
            {
              category: SpendingCategory.GROCERIES,
              rewardRate: 5.0,
              rewardType: "cashback",
            },
          ],
          // Add other required properties
        } as any,
      ]);

      // Call the service
      const result = await analyticsService.getCardPerformanceAnalytics(
        "user-123",
        "card-456",
        "month"
      );

      // Assertions
      expect(result).toBeDefined();
      expect(result.userId).toBe("user-123");
      expect(result.cardId).toBe("card-456");
      expect(result.totalSpent).toBe(150);
      expect(result.transactionCount).toBe(2);
      expect(result.rewardsEarned).toBe(4); // (100 * 0.03) + (50 * 0.02)
      expect(result.annualFee).toBe(95);
      expect(result.spendingByCategory.length).toBe(2);
    });
  });

  describe("getPortfolioAnalytics", () => {
    it("should return portfolio analytics", async () => {
      // Mock user cards
      mockUserCardRepo.findByUserId.mockResolvedValue([
        {
          id: "user-card-1",
          userId: "user-123",
          creditCardId: "card-456",
          // Add other required properties
        } as any,
        {
          id: "user-card-2",
          userId: "user-123",
          creditCardId: "card-789",
          // Add other required properties
        } as any,
      ]);

      // Mock credit cards
      mockCreditCardRepo.findById.mockImplementation((id) => {
        if (id === "card-456") {
          return Promise.resolve({
            id: "card-456",
            name: "Test Card 1",
            issuer: "Test Bank",
            annualFee: 95,
            rewardStructure: [
              {
                category: SpendingCategory.GROCERIES,
                rewardRate: 3.0,
                rewardType: "cashback",
              },
              {
                category: SpendingCategory.OTHER,
                rewardRate: 1.0,
                rewardType: "cashback",
              },
            ],
            // Add other required properties
          } as any);
        } else {
          return Promise.resolve({
            id: "card-789",
            name: "Test Card 2",
            issuer: "Other Bank",
            annualFee: 0,
            rewardStructure: [
              {
                category: SpendingCategory.DINING,
                rewardRate: 4.0,
                rewardType: "cashback",
              },
              {
                category: SpendingCategory.OTHER,
                rewardRate: 1.5,
                rewardType: "cashback",
              },
            ],
            // Add other required properties
          } as any);
        }
      });

      // Mock transactions
      mockTransactionRepo.findByDateRange.mockResolvedValue([
        {
          id: "tx-1",
          userId: "user-123",
          amount: 100,
          category: SpendingCategory.GROCERIES,
          merchant: "Whole Foods",
          cardUsed: "card-456",
          transactionDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "tx-2",
          userId: "user-123",
          amount: 50,
          category: SpendingCategory.DINING,
          merchant: "Restaurant",
          cardUsed: "card-789",
          transactionDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);

      // Mock active cards for optimization recommendations
      mockCreditCardRepo.findActiveCards.mockResolvedValue([
        {
          id: "card-456",
          name: "Test Card 1",
          // Same as above
        } as any,
        {
          id: "card-789",
          name: "Test Card 2",
          // Same as above
        } as any,
        {
          id: "card-999",
          name: "New Card",
          annualFee: 99,
          rewardStructure: [
            {
              category: SpendingCategory.GROCERIES,
              rewardRate: 6.0,
              rewardType: "cashback",
            },
            {
              category: SpendingCategory.DINING,
              rewardRate: 4.0,
              rewardType: "cashback",
            },
          ],
          // Add other required properties
        } as any,
      ]);

      // Mock primary card check
      mockUserCardRepo.isUserPrimaryCard.mockResolvedValue(false);

      // Call the service
      const result = await analyticsService.getPortfolioAnalytics(
        "user-123",
        "month"
      );

      // Assertions
      expect(result).toBeDefined();
      expect(result.userId).toBe("user-123");
      expect(result.totalCards).toBe(2);
      expect(result.totalAnnualFees).toBe(95);
      expect(result.cardPerformance.length).toBe(2);
      expect(result.optimizationRecommendations.length).toBeGreaterThan(0);
    });

    it("should throw error when user has no cards", async () => {
      // Mock empty user cards
      mockUserCardRepo.findByUserId.mockResolvedValue([]);

      // Call the service and expect error
      await expect(
        analyticsService.getPortfolioAnalytics("user-123", "month")
      ).rejects.toThrow("User has no cards");
    });
  });
});
