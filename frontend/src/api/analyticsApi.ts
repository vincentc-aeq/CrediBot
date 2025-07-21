import { apiClient } from './apiClient';

export interface AnalyticsRequest {
  timeframe?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate?: string;
  endDate?: string;
  cardIds?: string;
}

export interface DashboardAnalyticsResponse {
  summary: {
    totalSpent: number;
    totalRewards: number;
    averageRewardRate: number;
    totalTransactions: number;
  };
  cardPerformance: Array<{
    cardId: string;
    cardName: string;
    totalSpent: number;
    totalRewards: number;
    rewardRate: number;
    monthlyData: Array<{
      month: string;
      spent: number;
      rewards: number;
    }>;
    categoryBreakdown: Array<{
      category: string;
      amount: number;
      rewardRate: number;
    }>;
  }>;
  trends: {
    spendingTrend: 'up' | 'down' | 'stable';
    rewardsTrend: 'up' | 'down' | 'stable';
    monthlyComparison: number;
  };
}

export interface SpendingCategoriesResponse {
  totalSpent: number;
  categories: Array<{
    category: string;
    amount: number;
    percentage: number;
    transactions: number;
    trend: 'up' | 'down' | 'stable';
    bestCard: string;
    potentialSavings: number;
    monthlyData: Array<{
      month: string;
      amount: number;
    }>;
  }>;
}

export interface CardComparisonResponse {
  cards: Array<{
    cardId: string;
    cardName: string;
    issuer: string;
    image: string;
    totalSpent: number;
    totalRewards: number;
    rewardRate: number;
    annualFee: number;
    effectiveRate: number;
    monthlyAvgSpent: number;
    categoryBreakdown: Array<{
      category: string;
      amount: number;
      rewardRate: number;
    }>;
    rank: number;
    score: number;
    trend: 'up' | 'down' | 'stable';
    missedOpportunities: number;
    optimization: string;
    features: {
      cashback: boolean;
      points: boolean;
      miles: boolean;
      noForeignFee: boolean;
      insurance: boolean;
      concierge: boolean;
    };
  }>;
}

export interface OptimizationOpportunitiesResponse {
  opportunities: Array<{
    id: string;
    type: 'card_switch' | 'new_card' | 'category_optimization' | 'fee_optimization' | 'portfolio_rebalance';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    potentialSavings: number;
    effort: 'easy' | 'medium' | 'hard';
    timeframe: 'immediate' | 'short_term' | 'long_term';
    confidence: number;
    currentCard?: string;
    recommendedCard?: string;
    category?: string;
    details: {
      currentSituation: string;
      proposedAction: string;
      expectedOutcome: string;
      requirements: string[];
      considerations: string[];
    };
  }>;
}

export interface TrendsAnalyticsResponse {
  spendingTrends: Array<{
    period: string;
    totalSpent: number;
    totalRewards: number;
    rewardRate: number;
    categoryBreakdown: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
  }>;
  cardTrends: Array<{
    cardId: string;
    cardName: string;
    monthlyData: Array<{
      month: string;
      spent: number;
      rewards: number;
      rewardRate: number;
    }>;
  }>;
}

export const analyticsApi = {
  getDashboardAnalytics: async (params: AnalyticsRequest): Promise<DashboardAnalyticsResponse> => {
    const response = await apiClient.get('/analytics/dashboard', { params });
    return response.data;
  },

  getSpendingCategoriesAnalytics: async (params: AnalyticsRequest): Promise<SpendingCategoriesResponse> => {
    const response = await apiClient.get('/analytics/dashboard/spending-categories', { params });
    return response.data;
  },

  getCardPerformanceComparison: async (params: AnalyticsRequest): Promise<CardComparisonResponse> => {
    const response = await apiClient.get('/analytics/dashboard/card-performance', { params });
    return response.data;
  },

  getOptimizationOpportunities: async (params: AnalyticsRequest): Promise<OptimizationOpportunitiesResponse> => {
    const response = await apiClient.get('/analytics/dashboard/optimization-opportunities', { params });
    return response.data;
  },

  getTrendsAnalytics: async (params: AnalyticsRequest): Promise<TrendsAnalyticsResponse> => {
    const response = await apiClient.get('/analytics/dashboard/trends', { params });
    return response.data;
  },

  getRecentTransactions: async (limit: number = 20, offset: number = 0) => {
    const response = await apiClient.get('/analytics/recent-transactions', {
      params: { limit, offset }
    });
    return response.data;
  },
};