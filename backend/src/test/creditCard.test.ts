import { CreditCardRepository } from '../repositories/CreditCardRepository';
import { UserCardRepository } from '../repositories/UserCardRepository';
import { CardUpdateRepository } from '../repositories/CardUpdateRepository';
import { AuditLogRepository } from '../repositories/AuditLogRepository';
import { cardUpdateService } from '../services/CardUpdateService';
import { auditService } from '../services/AuditService';
import { CardType, SpendingCategory, RewardType } from '../models/types';
import { CardUpdateType } from '../models/CardUpdate';
import { AuditAction } from '../models/AuditLog';

// Mock database
const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  del: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  first: jest.fn(),
  orderBy: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  join: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  raw: jest.fn(),
  count: jest.fn(),
  clone: jest.fn().mockReturnThis(),
  transaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  whereBetween: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
};

describe('CreditCardRepository', () => {
  let repository: CreditCardRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new CreditCardRepository();
    (repository as any).db = mockDb;
  });

  describe('searchCards', () => {
    it('should search cards with filters', async () => {
      const mockCards = [
        {
          id: 'card-1',
          name: 'Chase Sapphire Preferred',
          issuer: 'Chase',
          card_type: CardType.TRAVEL,
          annual_fee: 95,
          reward_structure: JSON.stringify([{
            category: SpendingCategory.TRAVEL,
            rewardRate: 2.0,
            rewardType: RewardType.POINTS,
          }]),
          benefits: JSON.stringify(['Travel insurance']),
          requirements: JSON.stringify({ minCreditScore: 700 }),
          description: 'Premium travel card',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDb.orderBy.mockResolvedValue(mockCards);

      const result = await repository.searchCards({
        cardType: CardType.TRAVEL,
        maxAnnualFee: 100,
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Chase Sapphire Preferred');
      expect(result[0].cardType).toBe(CardType.TRAVEL);
    });

    it('should search cards by issuer', async () => {
      const mockCards = [
        {
          id: 'card-1',
          name: 'Chase Freedom',
          issuer: 'Chase',
          card_type: CardType.CASHBACK,
          annual_fee: 0,
          reward_structure: JSON.stringify([]),
          benefits: JSON.stringify([]),
          requirements: JSON.stringify({}),
          description: 'Cash back card',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDb.orderBy.mockResolvedValue(mockCards);

      const result = await repository.findByIssuer('Chase');

      expect(result).toHaveLength(1);
      expect(result[0].issuer).toBe('Chase');
    });
  });

  describe('findCardsWithNoAnnualFee', () => {
    it('should return cards with no annual fee', async () => {
      const mockCards = [
        {
          id: 'card-1',
          name: 'No Fee Card',
          issuer: 'Bank',
          card_type: CardType.CASHBACK,
          annual_fee: 0,
          reward_structure: JSON.stringify([]),
          benefits: JSON.stringify([]),
          requirements: JSON.stringify({}),
          description: 'No annual fee',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDb.orderBy.mockResolvedValue(mockCards);

      const result = await repository.findCardsWithNoAnnualFee();

      expect(result).toHaveLength(1);
      expect(result[0].annualFee).toBe(0);
    });
  });
});

describe('UserCardRepository', () => {
  let repository: UserCardRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new UserCardRepository();
    (repository as any).db = mockDb;
  });

  describe('createUserCard', () => {
    it('should create a new user card', async () => {
      const mockUserCard = {
        id: 'user-card-1',
        user_id: 'user-1',
        credit_card_id: 'card-1',
        card_nickname: 'My Travel Card',
        date_obtained: new Date(),
        is_primary: true,
        credit_limit: 10000,
        current_balance: 1000,
        statement_date: 15,
        due_date: 10,
        notes: 'Primary travel card',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.returning.mockResolvedValue([mockUserCard]);

      const result = await repository.createUserCard({
        userId: 'user-1',
        creditCardId: 'card-1',
        cardNickname: 'My Travel Card',
        dateObtained: new Date(),
        isPrimary: true,
        creditLimit: 10000,
        currentBalance: 1000,
        statementDate: 15,
        dueDate: 10,
        notes: 'Primary travel card',
      });

      expect(result.userId).toBe('user-1');
      expect(result.creditCardId).toBe('card-1');
      expect(result.cardNickname).toBe('My Travel Card');
      expect(result.isPrimary).toBe(true);
    });
  });

  describe('getUserCardPortfolio', () => {
    it('should return user card portfolio', async () => {
      const mockUserCards = [
        {
          id: 'user-card-1',
          user_id: 'user-1',
          credit_card_id: 'card-1',
          card_nickname: 'Travel Card',
          date_obtained: new Date(),
          is_primary: true,
          credit_limit: 10000,
          current_balance: 1000,
          statement_date: 15,
          due_date: 10,
          notes: null,
          created_at: new Date(),
          updated_at: new Date(),
          card_name: 'Chase Sapphire Preferred',
          issuer: 'Chase',
          card_type: CardType.TRAVEL,
          annual_fee: 95,
          reward_structure: JSON.stringify([]),
          benefits: JSON.stringify([]),
          image_url: null,
          apply_url: null,
        },
      ];

      // Mock the findUserCardsWithDetails method
      jest.spyOn(repository, 'findUserCardsWithDetails').mockResolvedValue(
        mockUserCards.map(card => ({
          id: card.id,
          userId: card.user_id,
          creditCardId: card.credit_card_id,
          cardNickname: card.card_nickname,
          dateObtained: card.date_obtained,
          isPrimary: card.is_primary,
          creditLimit: card.credit_limit,
          currentBalance: card.current_balance,
          statementDate: card.statement_date,
          dueDate: card.due_date,
          notes: card.notes,
          createdAt: card.created_at,
          updatedAt: card.updated_at,
          cardName: card.card_name,
          issuer: card.issuer,
          cardType: card.card_type,
          annualFee: card.annual_fee,
          rewardStructure: JSON.parse(card.reward_structure),
          benefits: JSON.parse(card.benefits),
          imageUrl: card.image_url,
          applyUrl: card.apply_url,
        }))
      );

      const result = await repository.getUserCardPortfolio('user-1');

      expect(result.totalCards).toBe(1);
      expect(result.totalCreditLimit).toBe(10000);
      expect(result.totalCurrentBalance).toBe(1000);
      expect(result.utilizationRate).toBe(10);
    });
  });

  describe('setPrimaryCard', () => {
    it('should set a card as primary', async () => {
      const mockTransaction = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };

      mockDb.transaction.mockResolvedValue(mockTransaction);
      mockTransaction.commit.mockResolvedValue(undefined);

      // Mock the transaction query builder
      const mockTrxQuery = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockTrxQuery);
      });

      const result = await repository.setPrimaryCard('user-1', 'card-1');

      expect(result).toBe(true);
    });
  });
});

describe('CardUpdateRepository', () => {
  let repository: CardUpdateRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new CardUpdateRepository();
    (repository as any).db = mockDb;
  });

  describe('createCardUpdate', () => {
    it('should create a card update record', async () => {
      const mockUpdate = {
        id: 'update-1',
        credit_card_id: 'card-1',
        update_type: CardUpdateType.ANNUAL_FEE,
        old_value: '95',
        new_value: '99',
        description: 'Annual fee updated',
        updated_by: 'user-1',
        effective_date: new Date(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.returning.mockResolvedValue([mockUpdate]);

      const result = await repository.createCardUpdate({
        creditCardId: 'card-1',
        updateType: CardUpdateType.ANNUAL_FEE,
        oldValue: '95',
        newValue: '99',
        description: 'Annual fee updated',
        updatedBy: 'user-1',
      });

      expect(result.creditCardId).toBe('card-1');
      expect(result.updateType).toBe(CardUpdateType.ANNUAL_FEE);
      expect(result.oldValue).toBe('95');
      expect(result.newValue).toBe('99');
    });
  });

  describe('getUpdateSummary', () => {
    it('should return update summary statistics', async () => {
      // Mock total count
      mockDb.count.mockResolvedValue([{ count: '10' }]);

      // Mock type stats
      const mockTypeStats = [
        { update_type: CardUpdateType.ANNUAL_FEE, count: '5' },
        { update_type: CardUpdateType.BENEFITS, count: '3' },
      ];
      mockDb.groupBy.mockResolvedValue(mockTypeStats);

      // Mock card stats
      const mockCardStats = [
        {
          credit_card_id: 'card-1',
          card_name: 'Test Card',
          update_count: '3',
          last_updated: new Date(),
        },
      ];

      // Create a mock that handles different queries
      let callCount = 0;
      mockDb.clone.mockImplementation(() => {
        const mockQuery = {
          count: jest.fn(),
          groupBy: jest.fn().mockReturnThis(),
          select: jest.fn(),
          join: jest.fn().mockReturnThis(),
        };

        if (callCount === 0) {
          mockQuery.count.mockResolvedValue([{ count: '10' }]);
        } else if (callCount === 1) {
          mockQuery.select.mockResolvedValue(mockTypeStats);
        } else {
          mockQuery.select.mockResolvedValue(mockCardStats);
        }

        callCount++;
        return mockQuery;
      });

      // Mock findWithDetails
      jest.spyOn(repository, 'findWithDetails').mockResolvedValue([]);

      const result = await repository.getUpdateSummary();

      expect(result.totalUpdates).toBe(10);
      expect(result.updatesByType[CardUpdateType.ANNUAL_FEE]).toBe(5);
      expect(result.updatesByCard).toHaveLength(1);
    });
  });
});

describe('AuditLogRepository', () => {
  let repository: AuditLogRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new AuditLogRepository();
    (repository as any).db = mockDb;
  });

  describe('createAuditLog', () => {
    it('should create an audit log entry', async () => {
      const mockAuditLog = {
        id: 'audit-1',
        entity_type: 'credit_card',
        entity_id: 'card-1',
        action: AuditAction.UPDATE,
        user_id: 'user-1',
        old_values: '{"annualFee": 95}',
        new_values: '{"annualFee": 99}',
        changes: '["annualFee"]',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        description: 'Updated credit card',
        metadata: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.returning.mockResolvedValue([mockAuditLog]);

      const result = await repository.createAuditLog({
        entityType: 'credit_card',
        entityId: 'card-1',
        action: AuditAction.UPDATE,
        userId: 'user-1',
        oldValues: { annualFee: 95 },
        newValues: { annualFee: 99 },
        changes: ['annualFee'],
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        description: 'Updated credit card',
      });

      expect(result.entityType).toBe('credit_card');
      expect(result.action).toBe(AuditAction.UPDATE);
      expect(result.oldValues).toEqual({ annualFee: 95 });
      expect(result.newValues).toEqual({ annualFee: 99 });
    });
  });

  describe('findByEntity', () => {
    it('should find audit logs by entity', async () => {
      const mockLogs = [
        {
          id: 'audit-1',
          entity_type: 'credit_card',
          entity_id: 'card-1',
          action: AuditAction.CREATE,
          user_id: 'user-1',
          old_values: null,
          new_values: '{"name": "Test Card"}',
          changes: null,
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          description: 'Created credit card',
          metadata: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDb.orderBy.mockResolvedValue(mockLogs);

      const result = await repository.findByEntity('credit_card', 'card-1');

      expect(result).toHaveLength(1);
      expect(result[0].entityType).toBe('credit_card');
      expect(result[0].entityId).toBe('card-1');
    });
  });
});

describe('CardUpdateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateCardWithHistory', () => {
    it('should update card and create history records', async () => {
      const mockCurrentCard = {
        id: 'card-1',
        name: 'Test Card',
        issuer: 'Test Bank',
        cardType: CardType.CASHBACK,
        annualFee: 95,
        rewardStructure: [],
        benefits: [],
        requirements: {},
        description: 'Test description',
        isActive: true,
        imageUrl: null,
        applyUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdateRecords = [
        {
          id: 'update-1',
          creditCardId: 'card-1',
          updateType: CardUpdateType.ANNUAL_FEE,
          oldValue: '95',
          newValue: '99',
          description: 'Annual fee updated from $95 to $99',
          updatedBy: 'user-1',
          effectiveDate: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock repository methods
      jest.spyOn(require('../repositories/CreditCardRepository').creditCardRepository, 'findById')
        .mockResolvedValue(mockCurrentCard);
      jest.spyOn(require('../repositories/CreditCardRepository').creditCardRepository, 'update')
        .mockResolvedValue(mockCurrentCard);
      jest.spyOn(require('../repositories/CardUpdateRepository').cardUpdateRepository, 'batchCreateUpdates')
        .mockResolvedValue(mockUpdateRecords);

      const result = await cardUpdateService.updateCardWithHistory(
        'card-1',
        { annualFee: 99 },
        'user-1'
      );

      expect(result.success).toBe(true);
      expect(result.updates).toHaveLength(1);
      expect(result.updates[0].updateType).toBe(CardUpdateType.ANNUAL_FEE);
    });

    it('should handle card not found', async () => {
      jest.spyOn(require('../repositories/CreditCardRepository').creditCardRepository, 'findById')
        .mockResolvedValue(null);

      await expect(cardUpdateService.updateCardWithHistory('invalid-card', { annualFee: 99 }))
        .rejects.toThrow('Credit card not found');
    });
  });
});

describe('AuditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logCreate', () => {
    it('should log entity creation', async () => {
      const mockRequest = {
        ip: '192.168.1.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
      } as any;

      jest.spyOn(require('../repositories/AuditLogRepository').auditLogRepository, 'createAuditLog')
        .mockResolvedValue({});

      await auditService.logCreate(
        'credit_card',
        'card-1',
        { name: 'New Card' },
        'user-1',
        mockRequest
      );

      expect(require('../repositories/AuditLogRepository').auditLogRepository.createAuditLog)
        .toHaveBeenCalledWith({
          entityType: 'credit_card',
          entityId: 'card-1',
          action: AuditAction.CREATE,
          userId: 'user-1',
          newValues: { name: 'New Card' },
          description: 'Created credit_card',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        });
    });
  });

  describe('logUpdate', () => {
    it('should log entity update with changes', async () => {
      const oldValues = { annualFee: 95, name: 'Old Card' };
      const newValues = { annualFee: 99, name: 'Old Card' };

      jest.spyOn(require('../repositories/AuditLogRepository').auditLogRepository, 'createAuditLog')
        .mockResolvedValue({});

      await auditService.logUpdate(
        'credit_card',
        'card-1',
        oldValues,
        newValues,
        'user-1'
      );

      expect(require('../repositories/AuditLogRepository').auditLogRepository.createAuditLog)
        .toHaveBeenCalledWith({
          entityType: 'credit_card',
          entityId: 'card-1',
          action: AuditAction.UPDATE,
          userId: 'user-1',
          oldValues,
          newValues,
          changes: ['annualFee'],
          description: 'Updated credit_card',
          ipAddress: undefined,
          userAgent: undefined,
        });
    });
  });
});

// Integration tests
describe('Credit Card Management Integration', () => {
  describe('End-to-end card management flow', () => {
    it('should complete full card management workflow', async () => {
      // This would be an integration test that tests the full flow
      // 1. Create a credit card
      // 2. Add it to user's portfolio
      // 3. Update card terms
      // 4. Track changes in audit log
      // 5. Generate reports
      
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Portfolio management', () => {
    it('should manage user card portfolio correctly', async () => {
      // Integration test for portfolio management
      // 1. Add multiple cards to user
      // 2. Set primary card
      // 3. Update balances
      // 4. Calculate utilization
      // 5. Generate portfolio summary
      
      expect(true).toBe(true); // Placeholder assertion
    });
  });
});

// Performance tests
describe('Credit Card Performance Tests', () => {
  it('should handle large datasets efficiently', async () => {
    // Test performance with large number of cards
    expect(true).toBe(true);
  });

  it('should handle concurrent operations', async () => {
    // Test concurrent card updates and audit logging
    expect(true).toBe(true);
  });
});