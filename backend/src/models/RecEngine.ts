import { CreditCard } from './CreditCard';
import { Transaction } from './Transaction';
import { User } from './User';

// RecEngine API 請求和回應類型

export interface UserProfile {
  id: string;
  demographics: {
    age?: number;
    income?: number;
    creditScore?: number;
    location?: string;
  };
  spendingPatterns: {
    totalMonthlySpending: number;
    categorySpending: Record<string, number>;
    transactionFrequency: number;
    averageTransactionAmount: number;
  };
  preferences: {
    preferredCardTypes: string[];
    maxAnnualFee: number;
    prioritizedCategories: string[];
    riskTolerance: 'low' | 'medium' | 'high';
  };
}

export interface SpendingPattern {
  monthlySpending: Record<string, number>; // category -> amount
  totalMonthlySpending: number;
  historicalData: {
    month: string;
    categorySpending: Record<string, number>;
  }[];
}

export interface ContextualData {
  timeOfYear: string;
  dayOfWeek: string;
  userState: string;
  marketTrends: string[];
}

// Trigger Classifier
export interface TriggerClassifierRequest {
  transaction: Transaction;
  userProfile: UserProfile;
  currentCards: CreditCard[];
}

export interface TriggerClassifierResponse {
  recommend_flag: boolean;
  extra_reward: number;
  confidence_score: number;
  suggested_card_id?: string;
  reasoning: string;
}

// Reward Estimator
export interface RewardEstimatorRequest {
  userSpending: SpendingPattern;
  currentCards: CreditCard[];
  candidateCards: CreditCard[];
}

export interface RewardEstimate {
  cardId: string;
  cardName: string;
  estimatedAnnualReward: number;
  rewardDelta: number; // compared to current best
  categoryBreakdown: Record<string, number>;
}

export interface CategoryRewards {
  [category: string]: {
    currentReward: number;
    potentialReward: number;
    bestCard: string;
  };
}

export interface RewardEstimatorResponse {
  reward_deltas: RewardEstimate[];
  category_breakdown: CategoryRewards;
  total_potential_gain: number;
}

// Portfolio Optimizer
export interface PortfolioOptimizerRequest {
  userProfile: UserProfile;
  currentPortfolio: CreditCard[];
  preferences: UserPreferences;
}

export interface UserPreferences {
  maxCards: number;
  maxTotalAnnualFees: number;
  prioritizedRewards: string[];
  balanceTransferNeeds: boolean;
  travelFrequency: 'none' | 'occasional' | 'frequent';
}

export enum ActionType {
  ADD_NEW = 'ADD_NEW',
  REPLACE_EXISTING = 'REPLACE_EXISTING',
  UPGRADE_CURRENT = 'UPGRADE_CURRENT',
  DOWNGRADE_CURRENT = 'DOWNGRADE_CURRENT',
  CANCEL_CARD = 'CANCEL_CARD'
}

export interface OptimizationRecommendation {
  action: ActionType;
  cardId: string;
  cardName: string;
  reasoning: string;
  expectedBenefit: number;
  confidence: number;
  replaceCardId?: string; // for REPLACE_EXISTING actions
}

export interface PortfolioOptimizerResponse {
  recommendations: OptimizationRecommendation[];
  action_type: ActionType;
  portfolio_score: number;
  improvement_score: number;
}

// Personalized Ranker
export interface PersonalizedRankerRequest {
  user_id: string;
  user_cards?: string[];
  spending_pattern?: Record<string, number>;
  preferences?: Record<string, any>;
}

export interface PersonalizedRecommendation {
  card_id: string;
  issuer: string;
  card_name: string;
  ranking_score: number;
  annual_fee: number;
  signup_bonus: number;
  reason: string;
}

export interface PersonalizedRankerResponse {
  ranked_cards: PersonalizedRecommendation[];
  user_id: string;
  ranking_score: number;
}

// API 錯誤處理
export interface RecEngineError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export class RecEngineException extends Error {
  public code: string;
  public details?: any;
  public timestamp: Date;

  constructor(code: string, message: string, details?: any) {
    super(message);
    this.name = 'RecEngineException';
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

// API 配置
export interface RecEngineConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

// 批次請求支援
export interface BatchRequest {
  requests: Array<{
    id: string;
    type: 'trigger' | 'reward' | 'optimize' | 'rank';
    payload: any;
  }>;
}

export interface BatchResponse {
  results: Array<{
    id: string;
    success: boolean;
    data?: any;
    error?: RecEngineError;
  }>;
}