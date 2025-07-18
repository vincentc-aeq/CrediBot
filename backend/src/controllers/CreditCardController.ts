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

      res.json(successResponse('Credit cards retrieved successfully', {
        cards: paginatedCards,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: cards.length,
          pages: Math.ceil(cards.length / Number(limit))
        }
      }));
    } catch (error) {
      console.error('Error getting credit cards:', error);
      res.status(500).json(errorResponse('Failed to get credit cards'));
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
        res.status(404).json(errorResponse('Credit card not found'));
        return;
      }

      res.json(successResponse('Credit card retrieved successfully', { card }));
    } catch (error) {
      console.error('Error getting credit card:', error);
      res.status(500).json(errorResponse('Failed to get credit card'));
    }
  }

  /**
   * Get credit cards by type
   */
  async getCardsByType(req: Request, res: Response): Promise<void> {
    try {
      const { cardType } = req.params;
      
      const cards = await creditCardRepository.findByCardType(cardType as CardType);
      
      res.json(successResponse('Credit cards retrieved successfully', { cards }));
    } catch (error) {
      console.error('Error getting cards by type:', error);
      res.status(500).json(errorResponse('Failed to get cards by type'));
    }
  }

  /**
   * Get credit cards by issuer
   */
  async getCardsByIssuer(req: Request, res: Response): Promise<void> {
    try {
      const { issuer } = req.params;
      
      const cards = await creditCardRepository.findByIssuer(issuer);
      
      res.json(successResponse('Credit cards retrieved successfully', { cards }));
    } catch (error) {
      console.error('Error getting cards by issuer:', error);
      res.status(500).json(errorResponse('Failed to get cards by issuer'));
    }
  }

  /**
   * Get no annual fee credit cards
   */
  async getNoAnnualFeeCards(req: Request, res: Response): Promise<void> {
    try {
      const cards = await creditCardRepository.findCardsWithNoAnnualFee();
      
      res.json(successResponse('No annual fee cards retrieved successfully', { cards }));
    } catch (error) {
      console.error('Error getting no annual fee cards:', error);
      res.status(500).json(errorResponse('Failed to get no annual fee cards'));
    }
  }

  /**
   * Get user's credit cards
   */
  async getUserCards(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.user!;
      
      const userCards = await userCardRepository.findUserCardsWithDetails(userId);
      
      res.json(successResponse('User cards retrieved successfully', { userCards }));
    } catch (error) {
      console.error('Error getting user cards:', error);
      res.status(500).json(errorResponse('Failed to get user cards'));
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
        res.status(400).json(errorResponse('Credit card ID is required'));
        return;
      }

      // Check if credit card exists
      const creditCard = await creditCardRepository.findById(creditCardId);
      if (!creditCard) {
        res.status(404).json(errorResponse('Credit card not found'));
        return;
      }

      // Check if user already has this card
      const hasCard = await userCardRepository.hasCard(userId, creditCardId);
      if (hasCard) {
        res.status(400).json(errorResponse('User already has this credit card'));
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

      res.status(201).json(successResponse('Credit card added successfully', { userCard }));
    } catch (error) {
      console.error('Error adding user card:', error);
      res.status(500).json(errorResponse('Failed to add credit card'));
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
        res.status(404).json(errorResponse('User card not found'));
        return;
      }

      // If setting as primary card, clear other primary cards first
      if (updateData.isPrimary) {
        await userCardRepository.setPrimaryCard(userId, cardId);
      }

      const updatedCard = await userCardRepository.updateUserCard(cardId, updateData);
      
      res.json(successResponse('User card updated successfully', { userCard: updatedCard }));
    } catch (error) {
      console.error('Error updating user card:', error);
      res.status(500).json(errorResponse('Failed to update user card'));
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
        res.status(404).json(errorResponse('User card not found'));
        return;
      }

      const deleted = await userCardRepository.delete(cardId);
      
      if (deleted) {
        res.json(successResponse('User card removed successfully'));
      } else {
        res.status(404).json(errorResponse('User card not found'));
      }
    } catch (error) {
      console.error('Error removing user card:', error);
      res.status(500).json(errorResponse('Failed to remove user card'));
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
        res.status(404).json(errorResponse('User card not found'));
        return;
      }

      const success = await userCardRepository.setPrimaryCard(userId, cardId);
      
      if (success) {
        res.json(successResponse('Primary card set successfully'));
      } else {
        res.status(400).json(errorResponse('Failed to set primary card'));
      }
    } catch (error) {
      console.error('Error setting primary card:', error);
      res.status(500).json(errorResponse('Failed to set primary card'));
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
        res.status(400).json(errorResponse('Current balance is required'));
        return;
      }

      // Verify card ownership
      const userCard = await userCardRepository.findById(cardId);
      if (!userCard || userCard.userId !== userId) {
        res.status(404).json(errorResponse('User card not found'));
        return;
      }

      const updatedCard = await userCardRepository.updateBalance(cardId, currentBalance);
      
      res.json(successResponse('Card balance updated successfully', { userCard: updatedCard }));
    } catch (error) {
      console.error('Error updating card balance:', error);
      res.status(500).json(errorResponse('Failed to update card balance'));
    }
  }

  /**
   * Get user card portfolio overview
   */
  async getUserCardPortfolio(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.user!;
      
      const portfolio = await userCardRepository.getUserCardPortfolio(userId);
      
      res.json(successResponse('User card portfolio retrieved successfully', { portfolio }));
    } catch (error) {
      console.error('Error getting user card portfolio:', error);
      res.status(500).json(errorResponse('Failed to get user card portfolio'));
    }
  }

  /**
   * Get user card statistics
   */
  async getUserCardStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.user!;
      
      const stats = await userCardRepository.getUserCardStats(userId);
      
      res.json(successResponse('User card statistics retrieved successfully', { stats }));
    } catch (error) {
      console.error('Error getting user card stats:', error);
      res.status(500).json(errorResponse('Failed to get user card statistics'));
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
        res.status(400).json(errorResponse('Updates array is required'));
        return;
      }

      // Verify all cards belong to this user
      for (const update of updates) {
        const userCard = await userCardRepository.findById(update.cardId);
        if (!userCard || userCard.userId !== userId) {
          res.status(404).json(errorResponse(`User card ${update.cardId} not found`));
          return;
        }
      }

      const updatedCount = await userCardRepository.batchUpdateBalances(updates);
      
      res.json(successResponse('Card balances updated successfully', { updatedCount }));
    } catch (error) {
      console.error('Error batch updating card balances:', error);
      res.status(500).json(errorResponse('Failed to update card balances'));
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
      
      res.status(201).json(successResponse('Credit card created successfully', { card }));
    } catch (error) {
      console.error('Error creating credit card:', error);
      res.status(500).json(errorResponse('Failed to create credit card'));
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
        res.json(successResponse('Credit card updated successfully', { card: updatedCard }));
      } else {
        res.status(404).json(errorResponse('Credit card not found'));
      }
    } catch (error) {
      console.error('Error updating credit card:', error);
      res.status(500).json(errorResponse('Failed to update credit card'));
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
        res.json(successResponse('Credit card deleted successfully'));
      } else {
        res.status(404).json(errorResponse('Credit card not found'));
      }
    } catch (error) {
      console.error('Error deleting credit card:', error);
      res.status(500).json(errorResponse('Failed to delete credit card'));
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

      res.json(successResponse('Card statistics retrieved successfully', {
        totalCards,
        activeCards: activeCards.length,
        cardsByType,
        cardsByIssuer,
      }));
    } catch (error) {
      console.error('Error getting card statistics:', error);
      res.status(500).json(errorResponse('Failed to get card statistics'));
    }
  }
}

export const creditCardController = new CreditCardController();