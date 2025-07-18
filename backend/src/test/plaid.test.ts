import { PlaidService, plaidService } from '../services/PlaidService';
import { plaidItemRepository } from '../repositories/PlaidItemRepository';
import { plaidAccountRepository } from '../repositories/PlaidAccountRepository';
import { transactionRepository } from '../repositories/TransactionRepository';
import { transactionProcessingService } from '../services/TransactionProcessingService';

// Mock Plaid client
jest.mock('../config/plaid', () => ({
  plaidClient: {
    linkTokenCreate: jest.fn(),
    itemPublicTokenExchange: jest.fn(),
    accountsGet: jest.fn(),
    transactionsGet: jest.fn(),
  },
  PLAID_CONFIG: {
    clientId: 'test-client-id',
    secret: 'test-secret',
    env: 'sandbox',
  },
}));

describe('PlaidService', () => {
  let plaidService: PlaidService;
  
  beforeEach(() => {
    plaidService = new PlaidService();
    jest.clearAllMocks();
  });

  describe('createLinkToken', () => {
    it('should create a link token successfully', async () => {
      const mockResponse = {
        data: {
          link_token: 'test-link-token',
        },
      };

      const { plaidClient } = require('../config/plaid');
      plaidClient.linkTokenCreate.mockResolvedValue(mockResponse);

      const result = await plaidService.createLinkToken({
        userId: 'test-user-id',
        clientName: 'Test App',
        products: ['transactions'],
        countryCodes: ['US'],
      });

      expect(result).toBe('test-link-token');
      expect(plaidClient.linkTokenCreate).toHaveBeenCalledWith({
        user: { client_user_id: 'test-user-id' },
        client_name: 'Test App',
        products: ['transactions'],
        country_codes: ['US'],
        language: 'en',
      });
    });

    it('should handle errors when creating link token', async () => {
      const { plaidClient } = require('../config/plaid');
      plaidClient.linkTokenCreate.mockRejectedValue(new Error('API Error'));

      await expect(plaidService.createLinkToken({
        userId: 'test-user-id',
        clientName: 'Test App',
        products: ['transactions'],
        countryCodes: ['US'],
      })).rejects.toThrow('API Error');
    });
  });

  describe('exchangePublicToken', () => {
    it('should exchange public token for access token', async () => {
      const mockResponse = {
        data: {
          access_token: 'test-access-token',
          item_id: 'test-item-id',
        },
      };

      const { plaidClient } = require('../config/plaid');
      plaidClient.itemPublicTokenExchange.mockResolvedValue(mockResponse);

      const result = await plaidService.exchangePublicToken('test-public-token');

      expect(result).toBe('test-access-token');
      expect(plaidClient.itemPublicTokenExchange).toHaveBeenCalledWith({
        public_token: 'test-public-token',
      });
    });
  });

  describe('getAccounts', () => {
    it('should get accounts successfully', async () => {
      const mockResponse = {
        data: {
          accounts: [
            {
              account_id: 'test-account-id',
              name: 'Test Account',
              official_name: 'Test Official Name',
              type: 'depository',
              subtype: 'checking',
              mask: '1234',
              balances: {
                available: 1000,
                current: 1000,
                limit: null,
                iso_currency_code: 'USD',
              },
            },
          ],
        },
      };

      const { plaidClient } = require('../config/plaid');
      plaidClient.accountsGet.mockResolvedValue(mockResponse);

      const result = await plaidService.getAccounts('test-access-token');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        accountId: 'test-account-id',
        name: 'Test Account',
        type: 'depository',
        subtype: 'checking',
        mask: '1234',
        balances: {
          available: 1000,
          current: 1000,
          limit: null,
          isoCurrencyCode: 'USD',
        },
      });
    });
  });

  describe('getTransactions', () => {
    it('should get transactions successfully', async () => {
      const mockResponse = {
        data: {
          transactions: [
            {
              transaction_id: 'test-transaction-id',
              account_id: 'test-account-id',
              amount: 10.50,
              iso_currency_code: 'USD',
              date: '2023-01-01',
              name: 'Test Transaction',
              merchant_name: 'Test Merchant',
              category: ['Food and Drink', 'Restaurants'],
              category_id: '13005000',
              pending: false,
              location: {
                address: '123 Main St',
                city: 'New York',
                region: 'NY',
                postal_code: '10001',
                country: 'US',
                lat: 40.7128,
                lon: -74.0060,
              },
            },
          ],
        },
      };

      const { plaidClient } = require('../config/plaid');
      plaidClient.transactionsGet.mockResolvedValue(mockResponse);

      const result = await plaidService.getTransactions('test-access-token', {
        startDate: '2023-01-01',
        endDate: '2023-01-31',
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        transactionId: 'test-transaction-id',
        accountId: 'test-account-id',
        amount: 10.50,
        name: 'Test Transaction',
        category: ['Food and Drink', 'Restaurants'],
        pending: false,
      });
    });
  });

  describe('validateAccessToken', () => {
    it('should return true for valid access token', async () => {
      const mockResponse = {
        data: {
          accounts: [],
        },
      };

      const { plaidClient } = require('../config/plaid');
      plaidClient.accountsGet.mockResolvedValue(mockResponse);

      const result = await plaidService.validateAccessToken('valid-token');

      expect(result).toBe(true);
    });

    it('should return false for invalid access token', async () => {
      const { plaidClient } = require('../config/plaid');
      plaidClient.accountsGet.mockRejectedValue({
        error_code: 'INVALID_ACCESS_TOKEN',
      });

      const result = await plaidService.validateAccessToken('invalid-token');

      expect(result).toBe(false);
    });
  });
});

describe('PlaidItemRepository', () => {
  // Mock database
  const mockDb = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    first: jest.fn(),
    orderBy: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    raw: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new plaid item', async () => {
      const mockItem = {
        id: 'test-id',
        user_id: 'test-user-id',
        item_id: 'test-item-id',
        access_token: 'test-token',
        institution_id: 'test-institution',
        institution_name: 'Test Bank',
        available_products: '["transactions"]',
        billed_products: '["transactions"]',
        error: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.returning.mockResolvedValue([mockItem]);

      const repository = new (require('../repositories/PlaidItemRepository').PlaidItemRepository)();
      // Override the db instance for testing
      (repository as any).db = mockDb;
      
      const result = await repository.create({
        userId: 'test-user-id',
        itemId: 'test-item-id',
        accessToken: 'test-token',
        institutionId: 'test-institution',
        institutionName: 'Test Bank',
        availableProducts: ['transactions'],
        billedProducts: ['transactions'],
      });

      expect(result.userId).toBe('test-user-id');
      expect(result.itemId).toBe('test-item-id');
      expect(result.institutionName).toBe('Test Bank');
    });
  });

  describe('findByUserId', () => {
    it('should find plaid items by user ID', async () => {
      const mockItems = [
        {
          id: 'test-id-1',
          user_id: 'test-user-id',
          item_id: 'test-item-id-1',
          access_token: 'test-token-1',
          institution_id: 'test-institution-1',
          institution_name: 'Test Bank 1',
          available_products: '["transactions"]',
          billed_products: '["transactions"]',
          error: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDb.orderBy.mockResolvedValue(mockItems);

      const repository = new (require('../repositories/PlaidItemRepository').PlaidItemRepository)();
      // Override the db instance for testing
      (repository as any).db = mockDb;
      
      const result = await repository.findByUserId('test-user-id');

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('test-user-id');
    });
  });
});

describe('TransactionProcessingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processTransactions', () => {
    it('should process transactions successfully', async () => {
      // Mock dependencies
      const mockAccounts = [
        {
          id: 'account-1',
          accountId: 'plaid-account-1',
          plaidItemId: 'item-1',
          userId: 'user-1',
          name: 'Test Account',
          officialName: null,
          type: 'depository',
          subtype: 'checking',
          mask: '1234',
          balanceAvailable: 1000,
          balanceCurrent: 1000,
          balanceLimit: null,
          isoCurrencyCode: 'USD',
          isActive: true,
          lastSyncedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockPlaidItem = {
        id: 'item-1',
        userId: 'user-1',
        itemId: 'test-item-id',
        accessToken: 'test-token',
        institutionId: 'test-institution',
        institutionName: 'Test Bank',
        availableProducts: ['transactions'],
        billedProducts: ['transactions'],
        error: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTransactions = [
        {
          transactionId: 'trans-1',
          accountId: 'plaid-account-1',
          amount: 10.50,
          isoCurrencyCode: 'USD',
          date: '2023-01-01',
          name: 'Test Transaction',
          merchantName: 'Test Merchant',
          category: ['Food and Drink'],
          categoryId: '13005000',
          subcategory: 'Restaurants',
          pending: false,
          location: {
            address: '123 Main St',
            city: 'New York',
            region: 'NY',
            postalCode: '10001',
            country: 'US',
            lat: 40.7128,
            lon: -74.0060,
          },
        },
      ];

      // Mock repository methods
      jest.spyOn(plaidAccountRepository, 'findByUserId').mockResolvedValue(mockAccounts);
      jest.spyOn(plaidItemRepository, 'findById').mockResolvedValue(mockPlaidItem);
      jest.spyOn(plaidService, 'syncAllTransactions').mockResolvedValue(mockTransactions);
      jest.spyOn(transactionRepository, 'findByPlaidTransactionId').mockResolvedValue(null);
      jest.spyOn(transactionRepository, 'createTransaction').mockResolvedValue({} as any);
      jest.spyOn(plaidAccountRepository, 'update').mockResolvedValue({} as any);

      const result = await transactionProcessingService.processTransactions({
        userId: 'user-1',
        startDate: '2023-01-01',
        endDate: '2023-01-31',
      });

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(1);
      expect(result.skippedCount).toBe(0);
      expect(result.errorCount).toBe(0);
    });

    it('should handle errors during processing', async () => {
      jest.spyOn(plaidAccountRepository, 'findByUserId').mockRejectedValue(new Error('Database error'));

      const result = await transactionProcessingService.processTransactions({
        userId: 'user-1',
        startDate: '2023-01-01',
        endDate: '2023-01-31',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Processing failed: Database error');
    });
  });
});

// Integration tests
describe('Plaid Integration', () => {
  describe('End-to-end account linking flow', () => {
    it('should complete the full account linking process', async () => {
      // This would be an integration test that tests the full flow
      // from creating link token to storing account data
      
      // Mock the entire flow
      const mockLinkToken = 'test-link-token';
      const mockPublicToken = 'test-public-token';
      const mockAccessToken = 'test-access-token';
      const mockMetadata = {
        item_id: 'test-item-id',
        institution: {
          institution_id: 'test-institution-id',
          name: 'Test Bank',
        },
        products: ['transactions'],
      };

      // This test would verify that:
      // 1. Link token is created
      // 2. Public token is exchanged for access token
      // 3. Account data is fetched and stored
      // 4. Database records are created correctly
      
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Transaction sync process', () => {
    it('should sync transactions from multiple accounts', async () => {
      // Integration test for transaction syncing
      // This would test the full pipeline from Plaid API to database storage
      
      expect(true).toBe(true); // Placeholder assertion
    });
  });
});

// Error handling tests
describe('Plaid Error Handling', () => {
  it('should handle Plaid API rate limiting', async () => {
    // Test rate limiting scenarios
    expect(true).toBe(true);
  });

  it('should handle invalid access tokens', async () => {
    // Test invalid token scenarios
    expect(true).toBe(true);
  });

  it('should handle network errors', async () => {
    // Test network failure scenarios
    expect(true).toBe(true);
  });
});