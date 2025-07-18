import { apiClient } from './apiClient';

export interface PlaidLinkTokenResponse {
  linkToken: string;
}

export interface PlaidAccount {
  id: string;
  itemId: string;
  name: string;
  type: string;
  subtype: string;
  mask: string;
  isActive: boolean;
  lastUpdated: string;
  balance?: {
    available: number;
    current: number;
    limit?: number;
  };
}

export interface PlaidAccountStats {
  totalAccounts: number;
  activeAccounts: number;
  lastSyncTime: string;
  totalTransactions: number;
}

export interface PlaidExchangeTokenRequest {
  publicToken: string;
  metadata: {
    institution: {
      name: string;
      institution_id: string;
    };
    accounts: Array<{
      id: string;
      name: string;
      type: string;
      subtype: string;
    }>;
  };
}

export interface PlaidSyncTransactionsRequest {
  accountIds?: string[];
  startDate?: string;
  endDate?: string;
}

export interface PlaidSyncTransactionsResponse {
  added: number;
  modified: number;
  removed: number;
  nextCursor?: string;
}

export const plaidApi = {
  /**
   * 創建 Link Token
   */
  createLinkToken: async (): Promise<PlaidLinkTokenResponse> => {
    const response = await apiClient.post('/api/plaid/link-token');
    return response.data.data;
  },

  /**
   * 交換 Public Token
   */
  exchangePublicToken: async (data: PlaidExchangeTokenRequest): Promise<{ accounts: PlaidAccount[] }> => {
    const response = await apiClient.post('/api/plaid/exchange-token', data);
    return response.data.data;
  },

  /**
   * 獲取已連結帳戶
   */
  getLinkedAccounts: async (): Promise<{ accounts: PlaidAccount[] }> => {
    const response = await apiClient.get('/api/plaid/accounts');
    return response.data.data;
  },

  /**
   * 獲取帳戶餘額
   */
  getAccountBalances: async (accountId: string): Promise<{ balance: PlaidAccount['balance'] }> => {
    const response = await apiClient.get(`/api/plaid/accounts/${accountId}/balances`);
    return response.data.data;
  },

  /**
   * 同步交易記錄
   */
  syncTransactions: async (data: PlaidSyncTransactionsRequest): Promise<PlaidSyncTransactionsResponse> => {
    const response = await apiClient.post('/api/plaid/sync-transactions', data);
    return response.data.data;
  },

  /**
   * 取消連結帳戶
   */
  unlinkAccount: async (itemId: string): Promise<void> => {
    await apiClient.delete(`/api/plaid/items/${itemId}`);
  },

  /**
   * 獲取帳戶統計資訊
   */
  getAccountStats: async (): Promise<PlaidAccountStats> => {
    const response = await apiClient.get('/api/plaid/stats');
    return response.data.data;
  }
};