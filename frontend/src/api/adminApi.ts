import { apiClient } from './apiClient';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalCards: number;
  totalTransactions: number;
  systemHealth: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
  };
}

export interface CreditCardData {
  id?: string;
  name: string;
  issuer: string;
  cardType: string;
  annualFee: number;
  rewardStructure: {
    [category: string]: number;
  };
  signupBonus: {
    requirement: number;
    points: number;
    timeframe: number;
  };
  apr: {
    regular: number;
    promotional?: number;
    promotionalEndDate?: string;
  };
  features: string[];
  pros: string[];
  cons: string[];
  bestFor: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  preferences: {
    notifications: boolean;
    dataSharing: boolean;
    marketingEmails: boolean;
  };
  stats: {
    totalTransactions: number;
    totalSpending: number;
    connectedAccounts: number;
  };
}

export interface SystemMetrics {
  timestamp: string;
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    activeConnections: number;
  };
  database: {
    connectionPool: number;
    queryTime: number;
    slowQueries: number;
  };
  cache: {
    hitRate: number;
    missRate: number;
    evictionRate: number;
  };
  api: {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorCount: number;
  };
}

export interface ABTestConfig {
  id?: string;
  name: string;
  description: string;
  variants: {
    name: string;
    percentage: number;
    config: Record<string, any>;
  }[];
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate: string;
  endDate?: string;
  targetMetric: string;
  createdAt?: string;
  updatedAt?: string;
}

export const adminApi = {
  // 系統統計
  getAdminStats: async (): Promise<AdminStats> => {
    const response = await apiClient.get('/api/admin/stats');
    return response.data.data;
  },

  getSystemMetrics: async (): Promise<SystemMetrics> => {
    const response = await apiClient.get('/api/analytics/system');
    return response.data.data;
  },

  // 信用卡管理
  getAllCards: async (): Promise<{ cards: CreditCardData[] }> => {
    const response = await apiClient.get('/api/cards/admin/all');
    return response.data.data;
  },

  createCard: async (cardData: Omit<CreditCardData, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditCardData> => {
    const response = await apiClient.post('/api/cards/admin/create', cardData);
    return response.data.data;
  },

  updateCard: async (cardId: string, cardData: Partial<CreditCardData>): Promise<CreditCardData> => {
    const response = await apiClient.put(`/api/cards/admin/${cardId}`, cardData);
    return response.data.data;
  },

  deleteCard: async (cardId: string): Promise<void> => {
    await apiClient.delete(`/api/cards/admin/${cardId}`);
  },

  getCardStatistics: async (): Promise<{
    total: number;
    active: number;
    byIssuer: Record<string, number>;
    byType: Record<string, number>;
  }> => {
    const response = await apiClient.get('/api/cards/admin/statistics');
    return response.data.data;
  },

  // 用戶管理
  getAllUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
  }> => {
    const response = await apiClient.get('/api/admin/users', { params });
    return response.data.data;
  },

  updateUser: async (userId: string, userData: Partial<User>): Promise<User> => {
    const response = await apiClient.put(`/api/admin/users/${userId}`, userData);
    return response.data.data;
  },

  deleteUser: async (userId: string): Promise<void> => {
    await apiClient.delete(`/api/admin/users/${userId}`);
  },

  getUserStats: async (userId: string): Promise<{
    totalTransactions: number;
    totalSpending: number;
    connectedAccounts: number;
    recommendations: number;
  }> => {
    const response = await apiClient.get(`/api/admin/users/${userId}/stats`);
    return response.data.data;
  },

  // A/B 測試管理
  getABTests: async (): Promise<{ tests: ABTestConfig[] }> => {
    const response = await apiClient.get('/api/admin/ab-tests');
    return response.data.data;
  },

  createABTest: async (testData: Omit<ABTestConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ABTestConfig> => {
    const response = await apiClient.post('/api/admin/ab-tests', testData);
    return response.data.data;
  },

  updateABTest: async (testId: string, testData: Partial<ABTestConfig>): Promise<ABTestConfig> => {
    const response = await apiClient.put(`/api/admin/ab-tests/${testId}`, testData);
    return response.data.data;
  },

  deleteABTest: async (testId: string): Promise<void> => {
    await apiClient.delete(`/api/admin/ab-tests/${testId}`);
  },

  // 系統監控
  getSystemLogs: async (params?: {
    level?: 'error' | 'warn' | 'info' | 'debug';
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<{
    logs: Array<{
      timestamp: string;
      level: string;
      message: string;
      metadata?: Record<string, any>;
    }>;
    total: number;
  }> => {
    const response = await apiClient.get('/api/admin/logs', { params });
    return response.data.data;
  },

  // 備份和維護
  createBackup: async (): Promise<{ backupId: string; filename: string }> => {
    const response = await apiClient.post('/api/admin/backup');
    return response.data.data;
  },

  getBackups: async (): Promise<{
    backups: Array<{
      id: string;
      filename: string;
      size: number;
      createdAt: string;
    }>;
  }> => {
    const response = await apiClient.get('/api/admin/backups');
    return response.data.data;
  },

  restoreBackup: async (backupId: string): Promise<void> => {
    await apiClient.post(`/api/admin/backups/${backupId}/restore`);
  },

  deleteBackup: async (backupId: string): Promise<void> => {
    await apiClient.delete(`/api/admin/backups/${backupId}`);
  }
};