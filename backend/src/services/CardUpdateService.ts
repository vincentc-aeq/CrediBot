import { creditCardRepository } from '../repositories/CreditCardRepository';
import { cardUpdateRepository } from '../repositories/CardUpdateRepository';
import { CardUpdateType, CreateCardUpdateData } from '../models/CardUpdate';
import { UpdateCreditCardData } from '../models/CreditCard';

export class CardUpdateService {
  /**
   * 更新信用卡並記錄變更歷史
   */
  async updateCardWithHistory(
    cardId: string,
    updateData: UpdateCreditCardData,
    updatedBy?: string
  ): Promise<{ success: boolean; updates: any[] }> {
    const updates: any[] = [];
    
    try {
      // 獲取當前卡片資料
      const currentCard = await creditCardRepository.findById(cardId);
      if (!currentCard) {
        throw new Error('Credit card not found');
      }

      // 準備更新記錄
      const updateRecords: CreateCardUpdateData[] = [];

      // 檢查各個欄位的變更
      if (updateData.annualFee !== undefined && updateData.annualFee !== currentCard.annualFee) {
        updateRecords.push({
          creditCardId: cardId,
          updateType: CardUpdateType.ANNUAL_FEE,
          oldValue: currentCard.annualFee?.toString() || '0',
          newValue: updateData.annualFee.toString(),
          description: `Annual fee updated from $${currentCard.annualFee || 0} to $${updateData.annualFee}`,
          updatedBy,
        });
      }

      if (updateData.rewardStructure !== undefined) {
        const oldRewardStructure = JSON.stringify(currentCard.rewardStructure);
        const newRewardStructure = JSON.stringify(updateData.rewardStructure);
        
        if (oldRewardStructure !== newRewardStructure) {
          updateRecords.push({
            creditCardId: cardId,
            updateType: CardUpdateType.REWARD_STRUCTURE,
            oldValue: oldRewardStructure,
            newValue: newRewardStructure,
            description: 'Reward structure updated',
            updatedBy,
          });
        }
      }

      if (updateData.benefits !== undefined) {
        const oldBenefits = JSON.stringify(currentCard.benefits);
        const newBenefits = JSON.stringify(updateData.benefits);
        
        if (oldBenefits !== newBenefits) {
          updateRecords.push({
            creditCardId: cardId,
            updateType: CardUpdateType.BENEFITS,
            oldValue: oldBenefits,
            newValue: newBenefits,
            description: 'Benefits updated',
            updatedBy,
          });
        }
      }

      if (updateData.requirements !== undefined) {
        const oldRequirements = JSON.stringify(currentCard.requirements);
        const newRequirements = JSON.stringify(updateData.requirements);
        
        if (oldRequirements !== newRequirements) {
          updateRecords.push({
            creditCardId: cardId,
            updateType: CardUpdateType.REQUIREMENTS,
            oldValue: oldRequirements,
            newValue: newRequirements,
            description: 'Requirements updated',
            updatedBy,
          });
        }
      }

      if (updateData.description !== undefined && updateData.description !== currentCard.description) {
        updateRecords.push({
          creditCardId: cardId,
          updateType: CardUpdateType.DESCRIPTION,
          oldValue: currentCard.description || '',
          newValue: updateData.description,
          description: 'Card description updated',
          updatedBy,
        });
      }

      if (updateData.isActive !== undefined && updateData.isActive !== currentCard.isActive) {
        updateRecords.push({
          creditCardId: cardId,
          updateType: CardUpdateType.STATUS,
          oldValue: currentCard.isActive.toString(),
          newValue: updateData.isActive.toString(),
          description: `Card status changed to ${updateData.isActive ? 'active' : 'inactive'}`,
          updatedBy,
        });
      }

      if (updateData.applyUrl !== undefined && updateData.applyUrl !== currentCard.applyUrl) {
        updateRecords.push({
          creditCardId: cardId,
          updateType: CardUpdateType.APPLY_URL,
          oldValue: currentCard.applyUrl || '',
          newValue: updateData.applyUrl,
          description: 'Apply URL updated',
          updatedBy,
        });
      }

      if (updateData.imageUrl !== undefined && updateData.imageUrl !== currentCard.imageUrl) {
        updateRecords.push({
          creditCardId: cardId,
          updateType: CardUpdateType.IMAGE_URL,
          oldValue: currentCard.imageUrl || '',
          newValue: updateData.imageUrl,
          description: 'Image URL updated',
          updatedBy,
        });
      }

      // 執行更新
      if (updateRecords.length > 0) {
        // 更新信用卡
        await creditCardRepository.update(cardId, updateData);
        
        // 批量創建更新記錄
        const createdUpdates = await cardUpdateRepository.batchCreateUpdates(updateRecords);
        updates.push(...createdUpdates);
      }

      return { success: true, updates };
    } catch (error) {
      console.error('Error updating card with history:', error);
      throw error;
    }
  }

  /**
   * 獲取卡片更新歷史
   */
  async getCardUpdateHistory(cardId: string) {
    return await cardUpdateRepository.findByCreditCardId(cardId);
  }

  /**
   * 獲取所有卡片的更新摘要
   */
  async getUpdateSummary(filters?: any) {
    return await cardUpdateRepository.getUpdateSummary(filters);
  }

  /**
   * 批量更新多張卡片
   */
  async batchUpdateCards(
    updates: Array<{ cardId: string; updateData: UpdateCreditCardData }>,
    updatedBy?: string
  ) {
    const results = [];
    
    for (const update of updates) {
      try {
        const result = await this.updateCardWithHistory(
          update.cardId,
          update.updateData,
          updatedBy
        );
        results.push({ cardId: update.cardId, ...result });
      } catch (error) {
        results.push({
          cardId: update.cardId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    return results;
  }

  /**
   * 撤銷更新
   */
  async revertUpdate(updateId: string, updatedBy?: string) {
    const update = await cardUpdateRepository.findById(updateId);
    if (!update) {
      throw new Error('Update record not found');
    }

    // 停用原更新記錄
    await cardUpdateRepository.deactivateUpdate(updateId);

    // 如果有舊值，則恢復
    if (update.oldValue) {
      const revertData: any = {};
      
      switch (update.updateType) {
        case CardUpdateType.ANNUAL_FEE:
          revertData.annualFee = parseFloat(update.oldValue);
          break;
        case CardUpdateType.REWARD_STRUCTURE:
          revertData.rewardStructure = JSON.parse(update.oldValue);
          break;
        case CardUpdateType.BENEFITS:
          revertData.benefits = JSON.parse(update.oldValue);
          break;
        case CardUpdateType.REQUIREMENTS:
          revertData.requirements = JSON.parse(update.oldValue);
          break;
        case CardUpdateType.DESCRIPTION:
          revertData.description = update.oldValue;
          break;
        case CardUpdateType.STATUS:
          revertData.isActive = update.oldValue === 'true';
          break;
        case CardUpdateType.APPLY_URL:
          revertData.applyUrl = update.oldValue;
          break;
        case CardUpdateType.IMAGE_URL:
          revertData.imageUrl = update.oldValue;
          break;
      }

      // 執行恢復更新
      await this.updateCardWithHistory(
        update.creditCardId,
        revertData,
        updatedBy
      );
    }

    return { success: true };
  }
}

export const cardUpdateService = new CardUpdateService();