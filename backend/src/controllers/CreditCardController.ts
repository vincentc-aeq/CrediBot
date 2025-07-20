import { Request, Response } from 'express';
import { creditCardRepository } from '../repositories/CreditCardRepository';
import { userCardRepository } from '../repositories/UserCardRepository';
import { successResponse, errorResponse } from '../utils/response';
import { CardType, SpendingCategory } from '../models/types';

export class CreditCardController {
  /**
   * Get all credit cards
   */
  async getAllCards(req: Request, res: Response): Promise<void> {
    try {
      const { 
        page = 1, 
        limit = 20, 
        cardType, 
        issuer, 
        maxAnnualFee, 
        minRewardRate,
        category,
        search 
      } = req.query;

      const filters: any = {};
      
      if (cardType) {
        filters.cardType = cardType as CardType;
      }
      if (issuer) {
        filters.issuer = issuer as string;
      }
      if (maxAnnualFee) {
        filters.maxAnnualFee = parseFloat(maxAnnualFee as string);
      }
      if (minRewardRate) {
        filters.minRewardRate = parseFloat(minRewardRate as string);
      }
      if (category) {
        filters.category = category as SpendingCategory;
      }
      if (search) {
        filters.search = search as string;
      }

      const cards = await creditCardRepository.searchCards(filters);
      
      // Simple pagination
      const startIndex = (Number(page) - 1) * Number(limit);
      const endIndex = startIndex + Number(limit);
      const paginatedCards = cards.slice(startIndex, endIndex);

      successResponse(res, {
        cards: paginatedCards,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: cards.length,
          pages: Math.ceil(cards.length / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error getting credit cards:', error);
      errorResponse(res, 'INTERNAL_ERROR', 'Failed to get credit cards', 500);
    }
  }

  /**
   * Get credit card details by ID
   */
  async getCardById(req: Request, res: Response): Promise<void> {
    try {
      const { cardId } = req.params;
      
      const card = await creditCardRepository.findById(cardId);
      
      if (!card) {
        errorResponse(res, 'NOT_FOUND', 'Credit card not found', 404);
        return;
      }

      // Transform data to match frontend expectations
      const transformedCard = {
        ...card,
        rewardCategories: card.rewardStructure?.map(reward => ({
          category: reward.category,
          rate: reward.rewardRate,
          description: `${reward.rewardRate}% ${reward.rewardType} on ${reward.category} purchases`
        })) || [],
        interestRate: 18.99, // Default interest rate
        creditLimit: 10000, // Default credit limit
        requirements: {
          ...card.requirements,
          description: `Minimum credit score of ${card.requirements?.minCreditScore || 650} and annual income of $${(card.requirements?.minIncome || 40000).toLocaleString()}`
        },
        terms: [
          "Terms and conditions apply",
          "APR varies based on creditworthiness",
          "Balance transfers may incur fees",
          "Over-limit fees may apply",
          "Late payment fees apply for missed payments"
        ],
        promotions: [
          {
            title: "Welcome Bonus",
            description: "Earn bonus rewards after spending threshold in first 3 months",
            expiryDate: "Limited time offer"
          }
        ]
      };

      successResponse(res, { card: transformedCard });
    } catch (error) {
      console.error('Error getting credit card:', error);
      errorResponse(res, 'INTERNAL_ERROR', 'Failed to get credit card', 500);
    }
  }

  /**
   * Get credit cards by type
   */
  async getCardsByType(req: Request, res: Response): Promise<void> {
    try {
      const { cardType } = req.params;
      
      const cards = await creditCardRepository.findByCardType(cardType as CardType);
      
      successResponse(res, { cards });
    } catch (error) {
      console.error('Error getting cards by type:', error);
      errorResponse(res, 'INTERNAL_ERROR', 'Failed to get cards by type', 500);
    }
  }

  /**
   * Get credit cards by issuer
   */
  async getCardsByIssuer(req: Request, res: Response): Promise<void> {
    try {
      const { issuer } = req.params;
      
      const cards = await creditCardRepository.findByIssuer(issuer);
      
      successResponse(res, { cards });
    } catch (error) {
      console.error('Error getting cards by issuer:', error);
      errorResponse(res, 'INTERNAL_ERROR', 'Failed to get cards by issuer', 500);
    }
  }

  /**
   * Get no annual fee credit cards
   */
  async getNoAnnualFeeCards(req: Request, res: Response): Promise<void> {
    try {
      const cards = await creditCardRepository.findCardsWithNoAnnualFee();
      
      successResponse(res, { cards });
    } catch (error) {
      console.error('Error getting no annual fee cards:', error);
      errorResponse(res, 'INTERNAL_ERROR', 'Failed to get no annual fee cards', 500);
    }
  }

  /**
   * Get user's credit cards
   */
  async getUserCards(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.user!;
      
      const userCards = await userCardRepository.findUserCardsWithDetails(userId);
      
      successResponse(res, { userCards });
    } catch (error) {
      console.error('Error getting user cards:', error);
      errorResponse(res, 'INTERNAL_ERROR', 'Failed to get user cards', 500);
    }
  }

  /**
   * Add credit card for user
   */
  async addUserCard(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.user!;
      const { 
        creditCardId, 
        cardNickname, 
        dateObtained, 
        isPrimary, 
        creditLimit, 
        currentBalance,
        statementDate,
        dueDate,
        notes 
      } = req.body;

      if (!creditCardId) {
        errorResponse(res, 'VALIDATION_ERROR', 'Credit card ID is required', 400);
        return;
      }

      // Check if credit card exists
      const creditCard = await creditCardRepository.findById(creditCardId);
      if (!creditCard) {
        errorResponse(res, 'NOT_FOUND', 'Credit card not found', 404);
        return;
      }

      // Check if user already has this card
      const hasCard = await userCardRepository.hasCard(userId, creditCardId);
      if (hasCard) {
        errorResponse(res, 'CONFLICT', 'User already has this credit card', 409);
        return;
      }

      // If setting as primary card, clear other primary cards first
      if (isPrimary) {
        await userCardRepository.setPrimaryCard(userId, ''); // Clear all primary cards
      }

      const userCard = await userCardRepository.createUserCard({
        userId,
        creditCardId,
        cardNickname,
        dateObtained: dateObtained ? new Date(dateObtained) : new Date(),
        isPrimary: isPrimary || false,
        creditLimit,
        currentBalance: currentBalance || 0,
        statementDate: statementDate ? parseInt(statementDate) : null,
        dueDate: dueDate ? parseInt(dueDate) : null,
        notes,
      });

      successResponse(res, { userCard }, 201);
    } catch (error) {
      console.error('Error adding user card:', error);
      errorResponse(res, 'INTERNAL_ERROR', 'Failed to add credit card', 500);
    }
  }

  /**
   * Update user credit card information
   */
  async updateUserCard(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.user!;
      const { cardId } = req.params;
      const updateData = req.body;

      // Verify card ownership
      const userCard = await userCardRepository.findById(cardId);
      if (!userCard || userCard.userId !== userId) {
        errorResponse(res, 'NOT_FOUND', 'User card not found', 404);
        return;
      }

      // If setting as primary card, clear other primary cards first
      if (updateData.isPrimary) {
        await userCardRepository.setPrimaryCard(userId, cardId);
      }

      const updatedCard = await userCardRepository.updateUserCard(cardId, updateData);
      
      successResponse(res, { userCard: updatedCard });
    } catch (error) {
      console.error('Error updating user card:', error);
      errorResponse(res, 'INTERNAL_ERROR', 'Failed to update user card', 500);
    }
  }

  /**
   * Remove user credit card
   */
  async removeUserCard(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.user!;
      const { cardId } = req.params;

      // Verify card ownership
      const userCard = await userCardRepository.findById(cardId);
      if (!userCard || userCard.userId !== userId) {
        errorResponse(res, 'NOT_FOUND', 'User card not found', 404);
        return;
      }

      const deleted = await userCardRepository.delete(cardId);
      
      if (deleted) {
        successResponse(res, { message: 'User card removed successfully' });
      } else {
        errorResponse(res, 'NOT_FOUND', 'User card not found', 404);
      }
    } catch (error) {
      console.error('Error removing user card:', error);
      errorResponse(res, 'INTERNAL_ERROR', 'Failed to remove user card', 500);
    }
  }

  /**
   * Set primary credit card
   */
  async setPrimaryCard(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.user!;
      const { cardId } = req.params;

      // Verify card ownership
      const userCard = await userCardRepository.findById(cardId);
      if (!userCard || userCard.userId !== userId) {
        errorResponse(res, 'NOT_FOUND', 'User card not found', 404);
        return;
      }

      const success = await userCardRepository.setPrimaryCard(userId, cardId);
      
      if (success) {
        successResponse(res, { message: 'Primary card set successfully' });
      } else {
        errorResponse(res, 'INTERNAL_ERROR', 'Failed to set primary card', 400);
      }
    } catch (error) {
      console.error('Error setting primary card:', error);
      errorResponse(res, 'INTERNAL_ERROR', 'Failed to set primary card', 500);
    }
  }

  /**
   * Update card balance
   */
  async updateCardBalance(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.user!;
      const { cardId } = req.params;
      const { currentBalance } = req.body;

      if (currentBalance === undefined) {
        errorResponse(res, 'VALIDATION_ERROR', 'Current balance is required', 400);
        return;
      }

      // Verify card ownership
      const userCard = await userCardRepository.findById(cardId);
      if (!userCard || userCard.userId !== userId) {
        errorResponse(res, 'NOT_FOUND', 'User card not found', 404);
        return;
      }

      const updatedCard = await userCardRepository.updateBalance(cardId, currentBalance);
      
      successResponse(res, { userCard: updatedCard });
    } catch (error) {
      console.error('Error updating card balance:', error);
      errorResponse(res, 'INTERNAL_ERROR', 'Failed to update card balance', 500);
    }
  }

  /**
   * Get user card portfolio overview
   */
  async getUserCardPortfolio(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.user!;
      
      const portfolio = await userCardRepository.getUserCardPortfolio(userId);
      
      successResponse(res, { portfolio });
    } catch (error) {
      console.error('Error getting user card portfolio:', error);
      errorResponse(res, 'INTERNAL_ERROR', 'Failed to get user card portfolio', 500);
    }
  }

  /**
   * Get user card statistics
   */
  async getUserCardStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.user!;
      
      const stats = await userCardRepository.getUserCardStats(userId);
      
      successResponse(res, { stats });
    } catch (error) {
      console.error('Error getting user card stats:', error);
      errorResponse(res, 'INTERNAL_ERROR', 'Failed to get user card statistics', 500);
    }
  }

  /**
   * Batch update card balances
   */
  async batchUpdateBalances(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.user!;
      const { updates } = req.body;

      if (!updates || !Array.isArray(updates)) {
        errorResponse(res, 'VALIDATION_ERROR', 'Updates array is required', 400);
        return;
      }

      // Verify all cards belong to this user
      for (const update of updates) {
        const userCard = await userCardRepository.findById(update.cardId);
        if (!userCard || userCard.userId !== userId) {
          errorResponse(res, 'NOT_FOUND', `User card ${update.cardId} not found`, 404);
          return;
        }
      }

      const updatedCount = await userCardRepository.batchUpdateBalances(updates);
      
      successResponse(res, { updatedCount });
    } catch (error) {
      console.error('Error batch updating card balances:', error);
      errorResponse(res, 'INTERNAL_ERROR', 'Failed to update card balances', 500);
    }
  }

  // Admin functions

  /**
   * Create new credit card (Admin)
   */
  async createCard(req: Request, res: Response): Promise<void> {
    try {
      const cardData = req.body;
      
      const card = await creditCardRepository.create(cardData);
      
      successResponse(res, { card }, 201);
    } catch (error) {
      console.error('Error creating credit card:', error);
      errorResponse(res, 'INTERNAL_ERROR', 'Failed to create credit card', 500);
    }
  }

  /**
   * Update credit card (Admin)
   */
  async updateCard(req: Request, res: Response): Promise<void> {
    try {
      const { cardId } = req.params;
      const updateData = req.body;
      
      const updatedCard = await creditCardRepository.update(cardId, updateData);
      
      if (updatedCard) {
        successResponse(res, { card: updatedCard });
      } else {
        errorResponse(res, 'NOT_FOUND', 'Credit card not found', 404);
      }
    } catch (error) {
      console.error('Error updating credit card:', error);
      errorResponse(res, 'INTERNAL_ERROR', 'Failed to update credit card', 500);
    }
  }

  /**
   * Delete credit card (Admin)
   */
  async deleteCard(req: Request, res: Response): Promise<void> {
    try {
      const { cardId } = req.params;
      
      const deleted = await creditCardRepository.delete(cardId);
      
      if (deleted) {
        successResponse(res, { message: 'Credit card deleted successfully' });
      } else {
        errorResponse(res, 'NOT_FOUND', 'Credit card not found', 404);
      }
    } catch (error) {
      console.error('Error deleting credit card:', error);
      errorResponse(res, 'INTERNAL_ERROR', 'Failed to delete credit card', 500);
    }
  }

  /**
   * Get card statistics (Admin)
   */
  async getCardStatistics(req: Request, res: Response): Promise<void> {
    try {
      const totalCards = await creditCardRepository.count();
      const activeCards = await creditCardRepository.findActiveCards();
      
      // Statistics by type
      const cardsByType = await Promise.all(
        Object.values(CardType).map(async (type) => {
          const cards = await creditCardRepository.findByCardType(type);
          return { type, count: cards.length };
        })
      );

      // Statistics by issuer
      const allCards = await creditCardRepository.findAll();
      const cardsByIssuer = allCards.reduce((acc, card) => {
        acc[card.issuer] = (acc[card.issuer] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      successResponse(res, {
        totalCards,
        activeCards: activeCards.length,
        cardsByType,
        cardsByIssuer,
      });
    } catch (error) {
      console.error('Error getting card statistics:', error);
      errorResponse(res, 'INTERNAL_ERROR', 'Failed to get card statistics', 500);
    }
  }
}

export const creditCardController = new CreditCardController();