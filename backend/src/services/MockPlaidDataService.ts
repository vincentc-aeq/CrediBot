import { PlaidTransactionInfo, PlaidAccountInfo } from './PlaidService';

interface UserProfile {
  spendingProfile: 'conservative' | 'moderate' | 'high_spender';
  primaryCategories: string[];
  monthlyIncome: number;
  preferredMerchants: string[];
}

export class MockPlaidDataService {
  private userProfiles: Map<string, UserProfile> = new Map();

  /**
   * Generate personalized mock transaction data for user
   */
  generateTransactionsForUser(
    userId: string, 
    days: number = 30,
    existingTransactions?: PlaidTransactionInfo[]
  ): PlaidTransactionInfo[] {
    const profile = this.getUserProfile(userId);
    const transactions: PlaidTransactionInfo[] = [];
    
    const today = new Date();
    const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

    // If existing transactions are available, use them as foundation
    if (existingTransactions && existingTransactions.length > 0) {
      return this.personalizeExistingTransactions(existingTransactions, profile, userId);
    }

    // Generate new mock transactions
    const transactionCount = this.getTransactionCountForProfile(profile, days);
    
    for (let i = 0; i < transactionCount; i++) {
      const transaction = this.generateSingleTransaction(profile, startDate, today, userId, i);
      transactions.push(transaction);
    }

    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Generate personalized mock account data for user
   */
  generateAccountsForUser(userId: string): PlaidAccountInfo[] {
    const profile = this.getUserProfile(userId);
    const accounts: PlaidAccountInfo[] = [];

    // Primary checking account
    accounts.push({
      accountId: `acc_checking_${userId}`,
      name: 'Primary Checking',
      type: 'depository',
      subtype: 'checking',
      mask: '0000',
      officialName: 'Primary Checking Account',
      balances: {
        available: this.generateBalance(profile.monthlyIncome * 0.3, profile.monthlyIncome * 0.8),
        current: this.generateBalance(profile.monthlyIncome * 0.25, profile.monthlyIncome * 0.75),
        limit: null,
        isoCurrencyCode: 'USD',
      },
    });

    // Savings account
    accounts.push({
      accountId: `acc_savings_${userId}`,
      name: 'High Yield Savings',
      type: 'depository',
      subtype: 'savings',
      mask: '1111',
      officialName: 'High Yield Savings Account',
      balances: {
        available: this.generateBalance(profile.monthlyIncome * 2, profile.monthlyIncome * 8),
        current: this.generateBalance(profile.monthlyIncome * 2, profile.monthlyIncome * 8),
        limit: null,
        isoCurrencyCode: 'USD',
      },
    });

    // Credit card account
    accounts.push({
      accountId: `acc_credit_${userId}`,
      name: 'Rewards Credit Card',
      type: 'credit',
      subtype: 'credit card',
      mask: '2222',
      officialName: 'Rewards Credit Card',
      balances: {
        available: this.generateBalance(3000, 10000),
        current: this.generateBalance(-500, -2000), // Negative amount indicates debt
        limit: this.generateBalance(5000, 15000),
        isoCurrencyCode: 'USD',
      },
    });

    return accounts;
  }

  private getUserProfile(userId: string): UserProfile {
    if (!this.userProfiles.has(userId)) {
      this.userProfiles.set(userId, this.generateUserProfile(userId));
    }
    return this.userProfiles.get(userId)!;
  }

  private generateUserProfile(userId: string): UserProfile {
    const seed = this.generateSeed(userId);
    const profileTypes: UserProfile['spendingProfile'][] = ['conservative', 'moderate', 'high_spender'];
    
    const categories = [
      ['groceries', 'utilities', 'gas_stations'],
      ['dining', 'entertainment', 'shopping', 'travel'],
      ['luxury', 'shopping', 'dining', 'travel', 'entertainment']
    ];

    const incomes = [
      [3000, 5000],   // conservative
      [5000, 8000],   // moderate  
      [8000, 15000]   // high_spender
    ];

    const profileIndex = seed % 3;
    const profile = profileTypes[profileIndex];
    
    return {
      spendingProfile: profile,
      primaryCategories: categories[profileIndex],
      monthlyIncome: this.generateBalance(incomes[profileIndex][0], incomes[profileIndex][1]),
      preferredMerchants: this.getMerchantsForProfile(profile),
    };
  }

  private generateSeed(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private generateBalance(min: number, max: number): number {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
  }

  private getTransactionCountForProfile(profile: UserProfile, days: number): number {
    const dailyTransactions = {
      conservative: 2,
      moderate: 4,
      high_spender: 7
    };
    
    return Math.round(dailyTransactions[profile.spendingProfile] * days * (0.8 + Math.random() * 0.4));
  }

  private generateSingleTransaction(
    profile: UserProfile, 
    startDate: Date, 
    endDate: Date, 
    userId: string, 
    index: number
  ): PlaidTransactionInfo {
    const date = new Date(
      startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
    );

    const category = profile.primaryCategories[Math.floor(Math.random() * profile.primaryCategories.length)];
    const merchant = this.getMerchantForCategory(category, profile);
    const amount = this.getAmountForCategory(category, profile);

    return {
      transactionId: `txn_${userId}_${index}_${Date.now()}`,
      accountId: `acc_checking_${userId}`,
      amount: amount,
      isoCurrencyCode: 'USD',
      date: date.toISOString().split('T')[0],
      name: merchant,
      merchantName: merchant,
      category: [category],
      categoryId: this.getCategoryId(category),
      subcategory: category,
      pending: Math.random() < 0.1, // 10% chance of pending
      location: {
        address: null,
        city: this.getRandomCity(),
        region: 'CA',
        postalCode: null,
        country: 'US',
        lat: null,
        lon: null,
      },
    };
  }

  private getMerchantsForProfile(profile: UserProfile['spendingProfile']): string[] {
    const merchants = {
      conservative: ['Walmart', 'Target', 'Safeway', 'Shell', 'Chevron', 'PG&E'],
      moderate: ['Whole Foods', 'Starbucks', 'Uber', 'Netflix', 'Amazon', 'Best Buy'],
      high_spender: ['Nordstrom', 'Apple Store', 'Tesla', 'Saks Fifth Avenue', 'Louis Vuitton', 'Four Seasons']
    };
    return merchants[profile];
  }

  private getMerchantForCategory(category: string, profile: UserProfile): string {
    const merchantsByCategory: Record<string, string[]> = {
      groceries: ['Whole Foods Market', 'Safeway', 'Trader Joe\'s', 'Walmart Supercenter'],
      dining: ['Starbucks', 'McDonald\'s', 'Chipotle', 'The Cheesecake Factory'],
      gas_stations: ['Shell', 'Chevron', '76', 'Arco'],
      shopping: ['Amazon', 'Target', 'Best Buy', 'Nordstrom'],
      entertainment: ['Netflix', 'Spotify', 'AMC Theatres', 'Disney+'],
      travel: ['Uber', 'United Airlines', 'Marriott', 'Hertz'],
      utilities: ['PG&E', 'Comcast', 'AT&T', 'Verizon'],
      luxury: ['Apple Store', 'Tesla', 'Louis Vuitton', 'Tiffany & Co.']
    };

    const merchants = merchantsByCategory[category] || ['Generic Merchant'];
    return merchants[Math.floor(Math.random() * merchants.length)];
  }

  private getAmountForCategory(category: string, profile: UserProfile): number {
    const baseAmounts: Record<string, [number, number]> = {
      groceries: [25, 150],
      dining: [8, 80],
      gas_stations: [20, 60],
      shopping: [15, 300],
      entertainment: [10, 50],
      travel: [50, 800],
      utilities: [50, 200],
      luxury: [200, 2000]
    };

    const [min, max] = baseAmounts[category] || [10, 100];
    const multiplier = {
      conservative: 0.7,
      moderate: 1.0,
      high_spender: 1.5
    };

    const adjustedMin = min * multiplier[profile.spendingProfile];
    const adjustedMax = max * multiplier[profile.spendingProfile];
    
    return Math.round((Math.random() * (adjustedMax - adjustedMin) + adjustedMin) * 100) / 100;
  }

  private getCategoryId(category: string): string {
    const categoryIds: Record<string, string> = {
      groceries: '13005000',
      dining: '13005001', 
      gas_stations: '13005002',
      shopping: '13005003',
      entertainment: '13005004',
      travel: '13005005',
      utilities: '13005006',
      luxury: '13005007'
    };
    return categoryIds[category] || '13005000';
  }

  private getRandomCity(): string {
    const cities = [
      'San Francisco', 'Los Angeles', 'New York', 'Chicago', 
      'Houston', 'Phoenix', 'Philadelphia', 'San Antonio'
    ];
    return cities[Math.floor(Math.random() * cities.length)];
  }

  private personalizeExistingTransactions(
    transactions: PlaidTransactionInfo[], 
    profile: UserProfile, 
    userId: string
  ): PlaidTransactionInfo[] {
    return transactions.map((transaction, index) => ({
      ...transaction,
      transactionId: `${transaction.transactionId}_${userId}`,
      accountId: `acc_checking_${userId}`,
      amount: this.adjustAmountForProfile(transaction.amount, profile),
      merchantName: this.adjustMerchantForProfile(transaction.merchantName, profile),
      category: this.adjustCategoryForProfile(transaction.category, profile),
    }));
  }

  private adjustAmountForProfile(amount: number, profile: UserProfile): number {
    const multiplier = {
      conservative: 0.6 + Math.random() * 0.3, // 0.6-0.9
      moderate: 0.8 + Math.random() * 0.4,     // 0.8-1.2  
      high_spender: 1.2 + Math.random() * 0.8  // 1.2-2.0
    };
    return Math.round(amount * multiplier[profile.spendingProfile] * 100) / 100;
  }

  private adjustMerchantForProfile(merchantName: string | null, profile: UserProfile): string | null {
    if (!merchantName) return merchantName;
    
    // 20% chance to replace with merchant matching user profile
    if (Math.random() < 0.2) {
      const profileMerchants = this.getMerchantsForProfile(profile.spendingProfile);
      return profileMerchants[Math.floor(Math.random() * profileMerchants.length)];
    }
    
    return merchantName;
  }

  private adjustCategoryForProfile(category: string[] | null, profile: UserProfile): string[] | null {
    if (!category || category.length === 0) return category;
    
    // 30% chance to adjust to user's preferred categories
    if (Math.random() < 0.3) {
      const preferredCategory = profile.primaryCategories[Math.floor(Math.random() * profile.primaryCategories.length)];
      return [preferredCategory];
    }
    
    return category;
  }
}

export const mockPlaidDataService = new MockPlaidDataService();