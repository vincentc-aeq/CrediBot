import apiClient from './apiClient';

// 定義推薦相關的類型
export interface RecommendationItem {
  cardId: string;
  cardName: string;
  score: number;
  reasoning: string;
  estimatedBenefit: number;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  ctaText: string;
  messageTitle: string;
  messageDescription: string;
  tags: string[];
}

export interface RecommendationResult {
  id: string;
  type: string;
  userId: string;
  recommendations: RecommendationItem[];
  metadata: {
    algorithmVersion: string;
    personalizationScore: number;
    diversityScore: number;
    contextFactors: string[];
    filtersCriteria: string[];
    performanceMetrics: {
      responseTime: number;
      confidenceLevel: number;
      dataFreshness: number;
    };
  };
  createdAt: string;
  expiresAt: string;
}

export interface HomepageLayout {
  hero: {
    card: RecommendationItem;
    backgroundImage: string;
    highlight: string;
    ctaStyle: 'primary' | 'secondary' | 'accent';
  };
  featured: RecommendationItem[];
  trending: RecommendationItem[];
  personalized: RecommendationItem[];
  categories: {
    category: string;
    displayName: string;
    icon: string;
    recommendations: RecommendationItem[];
    totalCards: number;
  }[];
}

export interface DynamicHomepageContent {
  primaryMessage: string;
  secondaryMessage: string;
  urgentRecommendations: RecommendationItem[];
  timeBasedRecommendations: RecommendationItem[];
}

// API 方法
export const recommendationApi = {
  // 獲取首頁推薦
  getHomepageRecommendations: async (params?: {
    maxResults?: number;
    enablePersonalization?: boolean;
  }): Promise<RecommendationResult> => {
    const response = await apiClient.get('/recommendations/homepage', { params });
    return response.data.data;
  },

  // 獲取首頁完整布局
  getHomepageLayout: async (): Promise<HomepageLayout> => {
    const response = await apiClient.get('/recommendations/homepage/layout');
    return response.data.data;
  },

  // 獲取動態首頁內容
  getDynamicHomepageContent: async (season?: string): Promise<DynamicHomepageContent> => {
    const response = await apiClient.get('/recommendations/homepage/dynamic', {
      params: { season }
    });
    return response.data.data;
  },

  // 交易分析推薦
  getTransactionRecommendations: async (transactionData: {
    transactionId: string;
    amount: number;
    category: string;
    merchantName?: string;
  }): Promise<RecommendationResult> => {
    const response = await apiClient.post('/recommendations/transaction-analysis', transactionData);
    return response.data.data;
  },

  // 儀表板推薦
  getDashboardRecommendations: async (params?: {
    timeframe?: string;
  }): Promise<RecommendationResult> => {
    const response = await apiClient.get('/recommendations/dashboard', { params });
    return response.data.data;
  },

  // 追蹤點擊
  trackRecommendationClick: async (clickData: {
    recommendationId: string;
    cardId: string;
    position?: number;
    section?: string;
  }): Promise<void> => {
    await apiClient.post('/recommendations/track-click', clickData);
  },

  // 獲取 A/B 測試變體
  getRecommendationVariant: async (variantId: string): Promise<RecommendationResult> => {
    const response = await apiClient.get(`/recommendations/variant/${variantId}`);
    return response.data.data;
  }
};