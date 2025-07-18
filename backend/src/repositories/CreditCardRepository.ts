import { BaseRepository } from "./BaseRepository";
import {
  CreditCard,
  CreateCreditCardData,
  UpdateCreditCardData,
  CreditCardSearchFilters,
} from "../models/CreditCard";
import { CardType } from "../models/types";

export class CreditCardRepository extends BaseRepository<CreditCard> {
  constructor() {
    super("credit_cards");
  }

  async findByCardType(cardType: CardType): Promise<CreditCard[]> {
    const results = await this.db(this.tableName).where({
      card_type: cardType,
    });
    return results.map(this.mapFromDb);
  }

  async findByIssuer(issuer: string): Promise<CreditCard[]> {
    const results = await this.db(this.tableName).where({ issuer });
    return results.map(this.mapFromDb);
  }

  async findActiveCards(): Promise<CreditCard[]> {
    const results = await this.db(this.tableName).where({ is_active: true });
    return results.map(this.mapFromDb);
  }

  async searchCards(filters: CreditCardSearchFilters): Promise<CreditCard[]> {
    let query = this.db(this.tableName);

    if (filters.cardType) {
      query = query.where("card_type", filters.cardType);
    }

    if (filters.issuer) {
      query = query.where("issuer", filters.issuer);
    }

    if (filters.maxAnnualFee !== undefined) {
      query = query.where("annual_fee", "<=", filters.maxAnnualFee);
    }

    if (filters.isActive !== undefined) {
      query = query.where("is_active", filters.isActive);
    }

    const results = await query;
    return results.map(this.mapFromDb);
  }

  async findCardsWithNoAnnualFee(): Promise<CreditCard[]> {
    const results = await this.db(this.tableName)
      .where("annual_fee", 0)
      .where("is_active", true);
    return results.map(this.mapFromDb);
  }

  protected mapFromDb(dbRow: any): CreditCard {
    return {
      id: dbRow.id,
      name: dbRow.name,
      issuer: dbRow.issuer,
      cardType: dbRow.card_type,
      annualFee: parseFloat(dbRow.annual_fee),
      rewardStructure: dbRow.reward_structure || [],
      benefits: dbRow.benefits || [],
      requirements: dbRow.requirements || {},
      description: dbRow.description,
      imageUrl: dbRow.image_url,
      applyUrl: dbRow.apply_url,
      isActive: dbRow.is_active,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
    };
  }

  protected mapToDb(entity: Partial<CreditCard>): any {
    const dbRow: any = {};

    if (entity.name !== undefined) dbRow.name = entity.name;
    if (entity.issuer !== undefined) dbRow.issuer = entity.issuer;
    if (entity.cardType !== undefined) dbRow.card_type = entity.cardType;
    if (entity.annualFee !== undefined) dbRow.annual_fee = entity.annualFee;
    if (entity.rewardStructure !== undefined)
      dbRow.reward_structure = JSON.stringify(entity.rewardStructure);
    if (entity.benefits !== undefined)
      dbRow.benefits = JSON.stringify(entity.benefits);
    if (entity.requirements !== undefined)
      dbRow.requirements = JSON.stringify(entity.requirements);
    if (entity.description !== undefined)
      dbRow.description = entity.description;
    if (entity.imageUrl !== undefined) dbRow.image_url = entity.imageUrl;
    if (entity.applyUrl !== undefined) dbRow.apply_url = entity.applyUrl;
    if (entity.isActive !== undefined) dbRow.is_active = entity.isActive;

    return dbRow;
  }
}

export const creditCardRepository = new CreditCardRepository();
