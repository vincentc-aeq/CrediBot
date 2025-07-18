import { 
  plaidClient, 
  PLAID_CONFIG, 
  SUPPORTED_COUNTRIES, 
  SUPPORTED_PRODUCTS,
  SupportedCountry,
  SupportedProduct
} from '../config/plaid';
import { mockPlaidDataService } from './MockPlaidDataService';
import {
  LinkTokenCreateRequest,
  LinkTokenCreateResponse,
  ItemPublicTokenExchangeRequest,
  ItemPublicTokenExchangeResponse,
  AccountsGetRequest,
  AccountsGetResponse,
  TransactionsGetRequest,
  TransactionsGetResponse,
  PlaidError,
  Transaction,
  Products,
  CountryCode,
} from 'plaid';

export interface PlaidLinkTokenOptions {
  userId: string;
  clientName: string;
  products: SupportedProduct[];
  countryCodes: SupportedCountry[];
  language?: 'en' | 'fr' | 'es' | 'nl';
  redirectUri?: string;
  androidPackageName?: string;
  iosVersion?: string;
}

export interface PlaidAccountInfo {
  accountId: string;
  name: string;
  type: string;
  subtype: string | null;
  mask: string | null;
  officialName: string | null;
  balances: {
    available: number | null;
    current: number | null;
    limit: number | null;
    isoCurrencyCode: string | null;
  };
}

export interface PlaidTransactionInfo {
  transactionId: string;
  accountId: string;
  amount: number;
  isoCurrencyCode: string | null;
  date: string;
  name: string;
  merchantName: string | null;
  category: string[] | null;
  categoryId: string | null;
  subcategory: string | null;
  pending: boolean;
  location: {
    address: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    country: string | null;
    lat: number | null;
    lon: number | null;
  };
}

export interface PlaidTransactionSyncOptions {
  startDate: string;
  endDate: string;
  accountIds?: string[];
  count?: number;
  offset?: number;
}

export class PlaidService {
  /**
   * Check if Plaid is configured
   */
  private checkPlaidConfiguration(): void {
    if (!PLAID_CONFIG.enabled || !plaidClient) {
      throw new Error('Plaid is not configured. Please check your environment variables.');
    }
  }

  /**
   * Check if in development mode (using mock data)
   */
  private isDevMode(): boolean {
    return process.env.NODE_ENV === 'development' && process.env.USE_MOCK_PLAID === 'true';
  }

  /**
   * Create Link Token for initializing Plaid Link
   */
  async createLinkToken(options: PlaidLinkTokenOptions): Promise<string> {
    this.checkPlaidConfiguration();
    
    try {
      const request: LinkTokenCreateRequest = {
        user: {
          client_user_id: options.userId,
        },
        client_name: options.clientName,
        products: options.products.map(p => p as Products),
        country_codes: options.countryCodes.map(c => c as CountryCode),
        language: options.language || 'en',
        redirect_uri: options.redirectUri,
        android_package_name: options.androidPackageName,
      };

      const response = await plaidClient!.linkTokenCreate(request);
      return response.data.link_token;
    } catch (error) {
      this.handlePlaidError(error, 'Failed to create link token');
      throw error;
    }
  }

  /**
   * Exchange public token for access token
   */
  async exchangePublicToken(publicToken: string): Promise<string> {
    this.checkPlaidConfiguration();
    
    try {
      const request: ItemPublicTokenExchangeRequest = {
        public_token: publicToken,
      };

      const response = await plaidClient!.itemPublicTokenExchange(request);
      return response.data.access_token;
    } catch (error) {
      this.handlePlaidError(error, 'Failed to exchange public token');
      throw error;
    }
  }

  /**
   * Get account information
   */
  async getAccounts(accessToken: string): Promise<PlaidAccountInfo[]> {
    // If in development mode using mock data
    if (this.isDevMode()) {
      const userId = this.extractUserIdFromAccessToken(accessToken);
      return mockPlaidDataService.generateAccountsForUser(userId);
    }

    try {
      const request: AccountsGetRequest = {
        access_token: accessToken,
      };

      const response = await plaidClient.accountsGet(request);
      return response.data.accounts.map(this.mapAccountInfo);
    } catch (error) {
      this.handlePlaidError(error, 'Failed to get accounts');
      throw error;
    }
  }

  /**
   * Get transaction records
   */
  async getTransactions(
    accessToken: string,
    options: PlaidTransactionSyncOptions
  ): Promise<PlaidTransactionInfo[]> {
    // If in development mode using mock data
    if (this.isDevMode()) {
      const userId = this.extractUserIdFromAccessToken(accessToken);
      const startDate = new Date(options.startDate);
      const endDate = new Date(options.endDate);
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return mockPlaidDataService.generateTransactionsForUser(userId, daysDiff);
    }

    try {
      const request: any = {
        access_token: accessToken,
        start_date: options.startDate,
        end_date: options.endDate,
        count: options.count || 500,
        offset: options.offset || 0,
      };

      // Add account_ids if provided
      if (options.accountIds) {
        request.account_ids = options.accountIds;
      }

      const response = await plaidClient.transactionsGet(request);
      return response.data.transactions.map(this.mapTransactionInfo);
    } catch (error) {
      this.handlePlaidError(error, 'Failed to get transactions');
      throw error;
    }
  }

  /**
   * Sync all transaction records (handle pagination)
   */
  async syncAllTransactions(
    accessToken: string,
    options: Omit<PlaidTransactionSyncOptions, 'count' | 'offset'>
  ): Promise<PlaidTransactionInfo[]> {
    const allTransactions: PlaidTransactionInfo[] = [];
    const batchSize = 500;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        const transactions = await this.getTransactions(accessToken, {
          ...options,
          count: batchSize,
          offset,
        });

        allTransactions.push(...transactions);
        hasMore = transactions.length === batchSize;
        offset += batchSize;

        // Avoid exceeding API limits
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        this.handlePlaidError(error, `Failed to sync transactions at offset ${offset}`);
        throw error;
      }
    }

    return allTransactions;
  }

  /**
   * Check if access token is valid
   */
  async validateAccessToken(accessToken: string): Promise<boolean> {
    try {
      await this.getAccounts(accessToken);
      return true;
    } catch (error) {
      const plaidError = error as PlaidError;
      if (plaidError.error_code === 'INVALID_ACCESS_TOKEN') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Map account information
   */
  private mapAccountInfo(account: any): PlaidAccountInfo {
    return {
      accountId: account.account_id,
      name: account.name,
      type: account.type,
      subtype: account.subtype || null,
      mask: account.mask || null,
      officialName: account.official_name || null,
      balances: {
        available: account.balances.available,
        current: account.balances.current,
        limit: account.balances.limit,
        isoCurrencyCode: account.balances.iso_currency_code || null,
      },
    };
  }

  /**
   * Map transaction information
   */
  private mapTransactionInfo(transaction: Transaction): PlaidTransactionInfo {
    return {
      transactionId: transaction.transaction_id,
      accountId: transaction.account_id,
      amount: transaction.amount,
      isoCurrencyCode: transaction.iso_currency_code || null,
      date: transaction.date,
      name: transaction.name,
      merchantName: transaction.merchant_name || null,
      category: transaction.category || null,
      categoryId: transaction.category_id || null,
      subcategory: transaction.category?.[0] || null,
      pending: transaction.pending,
      location: {
        address: transaction.location.address || null,
        city: transaction.location.city || null,
        region: transaction.location.region || null,
        postalCode: transaction.location.postal_code || null,
        country: transaction.location.country || null,
        lat: transaction.location.lat || null,
        lon: transaction.location.lon || null,
      },
    };
  }

  /**
   * Extract user ID from access token (for development mode)
   */
  private extractUserIdFromAccessToken(accessToken: string): string {
    // In development mode, we use access token as user identifier
    // In production, this should be queried from your database
    if (accessToken.startsWith('access-sandbox-')) {
      return accessToken.replace('access-sandbox-', '');
    }
    return accessToken.split('-').pop() || 'default_user';
  }

  /**
   * Handle Plaid errors
   */
  private handlePlaidError(error: any, context: string): void {
    if (error.response?.data) {
      const plaidError = error.response.data as PlaidError;
      console.error(`${context}:`, {
        error_code: plaidError.error_code,
        error_message: plaidError.error_message,
        error_type: plaidError.error_type,
        display_message: plaidError.display_message,
        request_id: plaidError.request_id,
      });
    } else {
      console.error(`${context}:`, error.message);
    }
  }
}

// Export singleton
export const plaidService = new PlaidService();