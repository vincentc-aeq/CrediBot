import { http, HttpResponse } from 'msw';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const handlers = [
  // Auth endpoints
  http.post(`${API_BASE_URL}/auth/register`, ({ request }) => {
    return HttpResponse.json({
      success: true,
      data: {
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
        token: 'mock-jwt-token',
      },
    });
  }),

  http.post(`${API_BASE_URL}/auth/login`, ({ request }) => {
    return HttpResponse.json({
      success: true,
      data: {
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
        token: 'mock-jwt-token',
      },
    });
  }),

  http.post(`${API_BASE_URL}/auth/logout`, () => {
    return HttpResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  }),

  http.get(`${API_BASE_URL}/auth/profile`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
      },
    });
  }),

  // Credit cards endpoints
  http.get(`${API_BASE_URL}/cards`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 1,
          cardName: 'Chase Sapphire Preferred',
          issuer: 'Chase',
          annualFee: 95,
          category: 'travel',
          rewardStructure: {
            base: 0.01,
            categories: {
              travel: 0.02,
              dining: 0.02,
            },
          },
          features: ['No Foreign Transaction Fees', 'Travel Insurance'],
          isActive: true,
        },
        {
          id: 2,
          cardName: 'Citi Double Cash',
          issuer: 'Citi',
          annualFee: 0,
          category: 'cashback',
          rewardStructure: {
            base: 0.02,
            categories: {},
          },
          features: ['No Annual Fee', 'Simple Rewards'],
          isActive: true,
        },
      ],
    });
  }),

  http.get(`${API_BASE_URL}/cards/:id`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      success: true,
      data: {
        id: Number(id),
        cardName: 'Chase Sapphire Preferred',
        issuer: 'Chase',
        annualFee: 95,
        category: 'travel',
        rewardStructure: {
          base: 0.01,
          categories: {
            travel: 0.02,
            dining: 0.02,
          },
        },
        features: ['No Foreign Transaction Fees', 'Travel Insurance'],
        isActive: true,
      },
    });
  }),

  // User cards endpoints
  http.get(`${API_BASE_URL}/user/cards`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 1,
          cardId: 1,
          userId: 1,
          dateAdded: '2023-01-01T00:00:00.000Z',
          card: {
            id: 1,
            cardName: 'Chase Sapphire Preferred',
            issuer: 'Chase',
            annualFee: 95,
            category: 'travel',
          },
        },
      ],
    });
  }),

  http.post(`${API_BASE_URL}/user/cards`, ({ request }) => {
    return HttpResponse.json({
      success: true,
      data: {
        id: 1,
        cardId: 1,
        userId: 1,
        dateAdded: new Date().toISOString(),
      },
    });
  }),

  http.delete(`${API_BASE_URL}/user/cards/:id`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      message: 'Card removed successfully',
    });
  }),

  // Recommendations endpoints
  http.get(`${API_BASE_URL}/recommendations/homepage`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 1,
          cardId: 1,
          userId: 1,
          type: 'homepage',
          score: 0.95,
          reason: 'Great travel rewards for your spending pattern',
          metadata: {
            category: 'travel',
            estimatedAnnualReward: 500,
          },
          card: {
            id: 1,
            cardName: 'Chase Sapphire Preferred',
            issuer: 'Chase',
            annualFee: 95,
            category: 'travel',
          },
        },
      ],
    });
  }),

  http.post(`${API_BASE_URL}/recommendations/transaction-analysis`, ({ request }) => {
    return HttpResponse.json({
      success: true,
      data: {
        currentCard: {
          id: 1,
          cardName: 'Current Card',
          reward: 1.0,
        },
        betterCard: {
          id: 2,
          cardName: 'Better Card',
          reward: 2.0,
          improvementPercent: 100,
        },
        suggestions: [
          {
            cardId: 2,
            reason: 'Better rewards for dining',
            estimatedReward: 2.0,
          },
        ],
      },
    });
  }),

  http.get(`${API_BASE_URL}/recommendations/optimization`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        suggestions: [
          {
            type: 'add_card',
            cardId: 3,
            reason: 'Add gas rewards card',
            estimatedAnnualBenefit: 200,
          },
          {
            type: 'remove_card',
            cardId: 4,
            reason: 'Underutilized card',
            estimatedAnnualSavings: 95,
          },
        ],
        currentPortfolio: {
          totalAnnualFees: 190,
          estimatedAnnualRewards: 1200,
          netBenefit: 1010,
        },
        optimizedPortfolio: {
          totalAnnualFees: 95,
          estimatedAnnualRewards: 1400,
          netBenefit: 1305,
        },
      },
    });
  }),

  // Analytics endpoints
  http.get(`${API_BASE_URL}/analytics/spending-patterns`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        monthlySpending: [
          { month: '2023-01', amount: 1000, category: 'dining' },
          { month: '2023-02', amount: 1200, category: 'dining' },
          { month: '2023-03', amount: 900, category: 'dining' },
        ],
        categoryBreakdown: {
          dining: 3100,
          gas: 400,
          groceries: 800,
          travel: 1200,
          other: 500,
        },
        trends: {
          totalSpending: 6000,
          avgMonthlySpending: 2000,
          topCategory: 'dining',
        },
      },
    });
  }),

  http.get(`${API_BASE_URL}/analytics/card-performance`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          cardId: 1,
          cardName: 'Chase Sapphire Preferred',
          totalSpending: 3000,
          totalRewards: 60,
          rewardRate: 0.02,
          annualFee: 95,
          netBenefit: -35,
        },
        {
          cardId: 2,
          cardName: 'Citi Double Cash',
          totalSpending: 2000,
          totalRewards: 40,
          rewardRate: 0.02,
          annualFee: 0,
          netBenefit: 40,
        },
      ],
    });
  }),

  // Plaid endpoints
  http.post(`${API_BASE_URL}/plaid/link-token`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        linkToken: 'link-sandbox-12345',
        expiration: '2023-12-31T23:59:59.000Z',
      },
    });
  }),

  http.post(`${API_BASE_URL}/plaid/exchange-token`, ({ request }) => {
    return HttpResponse.json({
      success: true,
      data: {
        itemId: 'item-12345',
        accounts: [
          {
            id: 'account-1',
            name: 'Checking Account',
            type: 'depository',
            subtype: 'checking',
            balance: 5000.0,
          },
        ],
      },
    });
  }),

  http.get(`${API_BASE_URL}/plaid/accounts`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'account-1',
          name: 'Checking Account',
          type: 'depository',
          subtype: 'checking',
          balance: 5000.0,
          institutionName: 'Bank of America',
        },
      ],
    });
  }),

  http.get(`${API_BASE_URL}/plaid/transactions`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'transaction-1',
          accountId: 'account-1',
          amount: 25.0,
          date: '2023-01-01',
          description: 'Starbucks Coffee',
          category: 'dining',
          merchantName: 'Starbucks',
        },
        {
          id: 'transaction-2',
          accountId: 'account-1',
          amount: 45.0,
          date: '2023-01-02',
          description: 'Shell Gas Station',
          category: 'gas',
          merchantName: 'Shell',
        },
      ],
    });
  }),

  // Admin endpoints
  http.get(`${API_BASE_URL}/admin/cards`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 1,
          cardName: 'Chase Sapphire Preferred',
          issuer: 'Chase',
          annualFee: 95,
          category: 'travel',
          isActive: true,
        },
      ],
    });
  }),

  http.post(`${API_BASE_URL}/admin/cards`, ({ request }) => {
    return HttpResponse.json({
      success: true,
      data: {
        id: 3,
        cardName: 'New Card',
        issuer: 'New Bank',
        annualFee: 0,
        category: 'cashback',
        isActive: true,
      },
    });
  }),

  http.put(`${API_BASE_URL}/admin/cards/:id`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        id: Number(params.id),
        cardName: 'Updated Card',
        issuer: 'Updated Bank',
        annualFee: 50,
        category: 'cashback',
        isActive: true,
      },
    });
  }),

  http.delete(`${API_BASE_URL}/admin/cards/:id`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      message: 'Card deleted successfully',
    });
  }),

  http.get(`${API_BASE_URL}/admin/analytics`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        totalUsers: 1000,
        totalCards: 50,
        totalTransactions: 10000,
        systemHealth: 'healthy',
        performance: {
          avgResponseTime: 120,
          uptime: 99.9,
        },
      },
    });
  }),

  // Error scenarios
  http.get(`${API_BASE_URL}/error/500`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        message: 'Something went wrong on the server',
      },
      { status: 500 }
    );
  }),

  http.get(`${API_BASE_URL}/error/404`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: 'Not Found',
        message: 'Resource not found',
      },
      { status: 404 }
    );
  }),

  http.get(`${API_BASE_URL}/error/401`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      },
      { status: 401 }
    );
  }),

  http.get(`${API_BASE_URL}/error/403`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: 'Forbidden',
        message: 'Access denied',
      },
      { status: 403 }
    );
  }),

  // Slow response simulation
  http.get(`${API_BASE_URL}/slow`, async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return HttpResponse.json({
      success: true,
      data: { message: 'Slow response' },
    });
  }),

  // Network error simulation
  http.get(`${API_BASE_URL}/network-error`, () => {
    return HttpResponse.error();
  }),
];

export default handlers;