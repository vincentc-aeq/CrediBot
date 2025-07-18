import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { theme } from '../../theme';

// Mock authentication context
const mockAuthContext = {
  user: null,
  token: null,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  isAuthenticated: false,
  isLoading: false,
};

// Create a custom render function that includes providers
export function customRender(
  ui: ReactElement,
  options: RenderOptions & {
    initialEntries?: string[];
    queryClient?: QueryClient;
    authContext?: typeof mockAuthContext;
  } = {}
) {
  const {
    initialEntries = ['/'],
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    }),
    authContext = mockAuthContext,
    ...renderOptions
  } = options;

  function AllTheProviders({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>{children}</BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: AllTheProviders, ...renderOptions });
}

// Mock user event helpers
export const mockUserEvent = {
  click: jest.fn(),
  type: jest.fn(),
  clear: jest.fn(),
  selectOptions: jest.fn(),
  upload: jest.fn(),
  hover: jest.fn(),
  unhover: jest.fn(),
  keyboard: jest.fn(),
  tab: jest.fn(),
  paste: jest.fn(),
};

// Mock API responses
export const mockApiResponses = {
  auth: {
    login: {
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
    },
    register: {
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
    },
    profile: {
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
    },
  },
  cards: {
    list: {
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
      ],
    },
    single: {
      success: true,
      data: {
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
    },
  },
  recommendations: {
    homepage: {
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
    },
    transactionAnalysis: {
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
    },
  },
  analytics: {
    spendingPatterns: {
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
    },
    cardPerformance: {
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
      ],
    },
  },
  plaid: {
    linkToken: {
      success: true,
      data: {
        linkToken: 'link-sandbox-12345',
        expiration: '2023-12-31T23:59:59.000Z',
      },
    },
    accounts: {
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
    },
    transactions: {
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
      ],
    },
  },
};

// Test data factories
export const testDataFactory = {
  user: (overrides = {}) => ({
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
    ...overrides,
  }),

  creditCard: (overrides = {}) => ({
    id: 1,
    cardName: 'Test Card',
    issuer: 'Test Bank',
    annualFee: 0,
    category: 'cashback',
    rewardStructure: {
      base: 0.01,
      categories: {
        dining: 0.03,
        gas: 0.02,
      },
    },
    features: ['No Foreign Transaction Fees'],
    isActive: true,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
    ...overrides,
  }),

  transaction: (overrides = {}) => ({
    id: 1,
    amount: 100.0,
    description: 'Test Transaction',
    category: 'dining',
    merchantName: 'Test Restaurant',
    date: '2023-01-01',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
    ...overrides,
  }),

  recommendation: (overrides = {}) => ({
    id: 1,
    cardId: 1,
    userId: 1,
    type: 'homepage',
    score: 0.95,
    reason: 'Great cashback rewards',
    metadata: {
      category: 'cashback',
      estimatedAnnualReward: 500,
    },
    createdAt: '2023-01-01T00:00:00.000Z',
    ...overrides,
  }),

  plaidAccount: (overrides = {}) => ({
    id: 'account-1',
    name: 'Test Account',
    type: 'depository',
    subtype: 'checking',
    balance: 5000.0,
    institutionName: 'Test Bank',
    ...overrides,
  }),

  plaidTransaction: (overrides = {}) => ({
    id: 'transaction-1',
    accountId: 'account-1',
    amount: 25.0,
    date: '2023-01-01',
    description: 'Test Transaction',
    category: 'dining',
    merchantName: 'Test Merchant',
    ...overrides,
  }),
};

// Common test helpers
export const testHelpers = {
  // Wait for loading to complete
  waitForLoading: async (getByTestId: any) => {
    const { waitForElementToBeRemoved } = await import('@testing-library/react');
    try {
      await waitForElementToBeRemoved(() => getByTestId('loading-spinner'));
    } catch (error) {
      // Loading spinner might not be present
    }
  },

  // Check if element is in document
  isInDocument: (element: any) => {
    return document.body.contains(element);
  },

  // Get form data
  getFormData: (form: HTMLFormElement) => {
    const formData = new FormData(form);
    const data: Record<string, any> = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });
    return data;
  },

  // Mock API error
  mockApiError: (status = 500, message = 'Test error') => ({
    response: {
      status,
      data: {
        success: false,
        error: 'Test Error',
        message,
      },
    },
    message,
  }),

  // Mock successful API response
  mockApiSuccess: (data: any) => ({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  }),

  // Create mock event
  createMockEvent: (type: string, properties = {}) => ({
    type,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    target: { value: '' },
    ...properties,
  }),

  // Mock file
  createMockFile: (name = 'test.jpg', size = 1024, type = 'image/jpeg') => {
    return new File([''], name, { type, size });
  },

  // Mock clipboard
  mockClipboard: (text = 'test') => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
        readText: jest.fn().mockResolvedValue(text),
      },
      writable: true,
    });
  },

  // Mock window.location
  mockLocation: (href = 'http://localhost:3000') => {
    delete (window as any).location;
    window.location = {
      href,
      origin: 'http://localhost:3000',
      pathname: '/',
      search: '',
      hash: '',
      assign: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
    } as any;
  },

  // Mock localStorage
  mockLocalStorage: () => {
    const store: Record<string, string> = {};
    return {
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      }),
    };
  },

  // Mock fetch
  mockFetch: (response: any, ok = true) => {
    global.fetch = jest.fn().mockResolvedValue({
      ok,
      json: jest.fn().mockResolvedValue(response),
      text: jest.fn().mockResolvedValue(JSON.stringify(response)),
    });
  },

  // Mock WebSocket
  mockWebSocket: () => {
    const mockWs = {
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      readyState: 1,
      OPEN: 1,
      CONNECTING: 0,
      CLOSING: 2,
      CLOSED: 3,
    };
    
    global.WebSocket = jest.fn().mockImplementation(() => mockWs);
    return mockWs;
  },

  // Mock ResizeObserver
  mockResizeObserver: () => {
    const mockObserver = {
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    };
    
    global.ResizeObserver = jest.fn().mockImplementation(() => mockObserver);
    return mockObserver;
  },

  // Mock IntersectionObserver
  mockIntersectionObserver: () => {
    const mockObserver = {
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    };
    
    global.IntersectionObserver = jest.fn().mockImplementation(() => mockObserver);
    return mockObserver;
  },
};

// Export everything for easy importing
export * from '@testing-library/react';
export { customRender as render };
export { mockUserEvent as userEvent };
export { testDataFactory };
export { testHelpers };
export { mockApiResponses };

// Common test scenarios
export const testScenarios = {
  // Authentication scenarios
  auth: {
    unauthenticated: {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    },
    authenticated: {
      user: testDataFactory.user(),
      token: 'mock-jwt-token',
      isAuthenticated: true,
      isLoading: false,
    },
    loading: {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
    },
  },

  // API response scenarios
  api: {
    loading: { isLoading: true, data: null, error: null },
    success: { isLoading: false, data: {}, error: null },
    error: { isLoading: false, data: null, error: testHelpers.mockApiError() },
  },

  // Form scenarios
  form: {
    empty: {},
    validData: {
      email: 'test@example.com',
      password: 'ValidPassword123!',
      firstName: 'Test',
      lastName: 'User',
    },
    invalidData: {
      email: 'invalid-email',
      password: 'weak',
      firstName: '',
      lastName: '',
    },
  },
};

export default {
  render: customRender,
  userEvent: mockUserEvent,
  testDataFactory,
  testHelpers,
  mockApiResponses,
  testScenarios,
};