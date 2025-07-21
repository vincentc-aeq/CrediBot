/**
 * Utility functions for mapping between database UUIDs and RecEngine card IDs
 */

/**
 * Map database UUID card IDs to RecEngine card IDs
 */
export const getCardUuidToRecEngineIdMapping = (): Record<string, string> => {
  return {
    // Database UUID -> RecEngine card_id mapping
    '550e8400-e29b-41d4-a716-446655440001': 'chase_sapphire_preferred',
    '550e8400-e29b-41d4-a716-446655440002': 'citi_double_cash_card',
    '550e8400-e29b-41d4-a716-446655440003': 'american_express_gold_card',
    '550e8400-e29b-41d4-a716-446655440004': 'discover_it_cash_back',
    '550e8400-e29b-41d4-a716-446655440005': 'capital_one_venture_rewards',
    '550e8400-e29b-41d4-a716-446655440006': 'chase_freedom_unlimited',
    '550e8400-e29b-41d4-a716-446655440007': 'blue_cash_preferred_card',
    '550e8400-e29b-41d4-a716-446655440008': 'wells_fargo_active_cash_card',
    '550e8400-e29b-41d4-a716-446655440009': 'chase_sapphire_reserve',
    '550e8400-e29b-41d4-a716-446655440010': 'capital_one_quicksilver',
    '550e8400-e29b-41d4-a716-446655440011': 'chase_ink_business_preferred',
    '550e8400-e29b-41d4-a716-446655440012': 'discover_it_student_cash_back',
    '550e8400-e29b-41d4-a716-446655440013': 'capital_one_secured_mastercard',
    '550e8400-e29b-41d4-a716-446655440014': 'bank_of_america_premium_rewards',
    '550e8400-e29b-41d4-a716-446655440015': 'citi_premier_card',
  };
};

/**
 * Map RecEngine card IDs to database UUIDs
 */
export const getRecEngineIdToCardUuidMapping = (): Record<string, string> => {
  const uuidToRecEngine = getCardUuidToRecEngineIdMapping();
  const recEngineToUuid: Record<string, string> = {};
  
  // Reverse the mapping
  for (const [uuid, recEngineId] of Object.entries(uuidToRecEngine)) {
    recEngineToUuid[recEngineId] = uuid;
  }
  
  return recEngineToUuid;
};

/**
 * Convert RecEngine card ID to database UUID
 */
export const convertRecEngineIdToUuid = (recEngineId: string): string | null => {
  const mapping = getRecEngineIdToCardUuidMapping();
  return mapping[recEngineId] || null;
};

/**
 * Convert database UUID to RecEngine card ID
 */
export const convertUuidToRecEngineId = (uuid: string): string | null => {
  const mapping = getCardUuidToRecEngineIdMapping();
  return mapping[uuid] || null;
};