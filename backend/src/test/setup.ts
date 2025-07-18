import dotenv from "dotenv";
import { createClient } from 'redis';

// Load test environment variables
dotenv.config({ path: ".env.test" });

// Set test environment
process.env.NODE_ENV = "test";

// Global test setup
import db from "../database/connection";
import redisClient from "../database/redis";

// Test database connection
export const testDbConnection = async () => {
  try {
    await db.raw("SELECT 1");
    console.log("✅ Test database connection successful");
    return true;
  } catch (error) {
    console.error("❌ Test database connection failed:", error);
    throw error;
  }
};

// Test Redis connection
export const testRedisConnection = async () => {
  try {
    const testClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    await testClient.connect();
    await testClient.ping();
    await testClient.disconnect();
    console.log("✅ Test Redis connection successful");
    return true;
  } catch (error) {
    console.error("❌ Test Redis connection failed:", error);
    throw error;
  }
};

// Clean database tables
export const cleanDatabase = async () => {
  try {
    // Clean tables according to foreign key dependencies
    const tables = [
      'recommendations',
      'user_cards',
      'transactions',
      'plaid_accounts',
      'plaid_items',
      'card_updates',
      'audit_logs',
      'analytics_cache',
      'notification_preferences',
      'notifications',
      'users',
      'credit_cards'
    ];

    for (const table of tables) {
      await db(table).del();
    }
    
    console.log("✅ Database cleaned successfully");
  } catch (error) {
    console.error("❌ Database cleanup failed:", error);
    throw error;
  }
};

// Seed test data
export const seedTestData = async () => {
  try {
    // Insert test user
    const testUser = await db('users').insert({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: '$2b$10$test.hash.here',
      first_name: 'Test',
      last_name: 'User',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');

    // Insert test credit card
    const testCard = await db('credit_cards').insert({
      card_name: 'Test Card',
      issuer: 'Test Bank',
      annual_fee: 0,
      category: 'cashback',
      reward_structure: JSON.stringify({
        base: 0.01,
        categories: {
          dining: 0.03,
          gas: 0.02
        }
      }),
      features: JSON.stringify(['No Foreign Transaction Fees']),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');

    // Insert test transaction
    await db('transactions').insert({
      user_id: testUser[0].id,
      amount: 100.00,
      description: 'Test Transaction',
      category: 'dining',
      merchant_name: 'Test Restaurant',
      date: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    });

    // Insert test user card association
    await db('user_cards').insert({
      user_id: testUser[0].id,
      card_id: testCard[0].id,
      date_added: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    });

    console.log("✅ Test data seeded successfully");
    return { testUser: testUser[0], testCard: testCard[0] };
  } catch (error) {
    console.error("❌ Test data seeding failed:", error);
    throw error;
  }
};

// Run migrations
export const runMigrations = async () => {
  try {
    await db.migrate.latest();
    console.log("✅ Test migrations completed successfully");
  } catch (error) {
    console.error("❌ Test migrations failed:", error);
    throw error;
  }
};

// Rollback migrations
export const rollbackMigrations = async () => {
  try {
    await db.migrate.rollback();
    console.log("✅ Test migrations rolled back successfully");
  } catch (error) {
    console.error("❌ Test migrations rollback failed:", error);
    throw error;
  }
};

// Test utilities
export const testUtils = {
  // Create test user
  createTestUser: async (overrides = {}) => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password_hash: '$2b$10$test.hash.here',
      first_name: 'Test',
      last_name: 'User',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };

    const [user] = await db('users').insert(userData).returning('*');
    return user;
  },

  // Create test credit card
  createTestCard: async (overrides = {}) => {
    const cardData = {
      card_name: 'Test Card',
      issuer: 'Test Bank',
      annual_fee: 0,
      category: 'cashback',
      reward_structure: JSON.stringify({
        base: 0.01,
        categories: { dining: 0.03, gas: 0.02 }
      }),
      features: JSON.stringify(['No Foreign Transaction Fees']),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };

    const [card] = await db('credit_cards').insert(cardData).returning('*');
    return card;
  },

  // Create test transaction
  createTestTransaction: async (userId: number, overrides = {}) => {
    const transactionData = {
      user_id: userId,
      amount: 100.00,
      description: 'Test Transaction',
      category: 'dining',
      merchant_name: 'Test Restaurant',
      date: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };

    const [transaction] = await db('transactions').insert(transactionData).returning('*');
    return transaction;
  },

  // Create test recommendation
  createTestRecommendation: async (userId: number, cardId: number, overrides = {}) => {
    const recommendationData = {
      user_id: userId,
      card_id: cardId,
      type: 'homepage',
      score: 0.95,
      reason: 'Test recommendation',
      metadata: JSON.stringify({
        category: 'cashback',
        estimatedAnnualReward: 500
      }),
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };

    const [recommendation] = await db('recommendations').insert(recommendationData).returning('*');
    return recommendation;
  },

  // Create test audit log
  createTestAuditLog: async (userId: number, overrides = {}) => {
    const auditData = {
      user_id: userId,
      action: 'test_action',
      resource: 'test_resource',
      resource_id: '1',
      details: JSON.stringify({ test: 'data' }),
      ip_address: '127.0.0.1',
      user_agent: 'test-agent',
      success: true,
      created_at: new Date(),
      ...overrides
    };

    const [audit] = await db('audit_logs').insert(auditData).returning('*');
    return audit;
  },

  // Generate JWT token for testing
  generateTestToken: (userId: number) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  },

  // Mock request object
  mockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides
  }),

  // Mock response object
  mockResponse: () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    res.locals = {};
    return res;
  },

  // Mock next function
  mockNext: () => jest.fn(),

  // Wait for async operations
  waitFor: async (condition: () => boolean | Promise<boolean>, timeout = 5000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  },

  // Mock external API
  mockExternalAPI: (url: string, response: any) => {
    const nock = require('nock');
    return nock(url).get('/').reply(200, response);
  }
};

// Setup test environment
beforeAll(async () => {
  try {
    // Test database connection
    await testDbConnection();
    
    // Test Redis connection
    await testRedisConnection();
    
    // Run migrations
    await runMigrations();
    
    console.log("✅ Test environment setup completed");
  } catch (error) {
    console.error("❌ Test environment setup failed:", error);
    throw error;
  }
});

// Clean up before each test
beforeEach(async () => {
  try {
    await cleanDatabase();
  } catch (error) {
    console.error("❌ Test cleanup failed:", error);
  }
});

// Global cleanup
afterAll(async () => {
  try {
    await cleanDatabase();
    await db.destroy();
    console.log("✅ Test cleanup completed");
  } catch (error) {
    console.error("❌ Test cleanup failed:", error);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export everything
export {
  db,
  redisClient,
  testUtils
};
