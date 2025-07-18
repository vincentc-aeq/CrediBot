// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { server } from './test/mocks/server';

// Configure testing library
configure({
  testIdAttribute: 'data-testid'
});

// Mock service worker setup
beforeAll(() => {
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(),
  putImageData: jest.fn(),
  createImageData: jest.fn(),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
});

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn();

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn(),
    readText: jest.fn(),
  },
  writable: true,
});

// Mock window.location
delete (window as any).location;
window.location = {
  ...window.location,
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
  href: 'http://localhost:3000',
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock crypto.getRandomValues
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn().mockReturnValue(new Uint32Array(1)),
  },
});

// Mock fetch
global.fetch = jest.fn();

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
  OPEN: 1,
  CLOSED: 3,
}));

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.error = jest.fn().mockImplementation((message) => {
    if (
      typeof message === 'string' &&
      (message.includes('Warning:') || 
       message.includes('ReactDOM.render') ||
       message.includes('act()')
      )
    ) {
      return;
    }
    originalConsoleError(message);
  });

  console.warn = jest.fn().mockImplementation((message) => {
    if (
      typeof message === 'string' &&
      message.includes('componentWillReceiveProps')
    ) {
      return;
    }
    originalConsoleWarn(message);
  });
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities
export const testUtils = {
  // Create a mock user
  createMockUser: (overrides = {}) => ({
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

  // Create a mock credit card
  createMockCard: (overrides = {}) => ({
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

  // Create a mock transaction
  createMockTransaction: (overrides = {}) => ({
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

  // Create a mock recommendation
  createMockRecommendation: (overrides = {}) => ({
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

  // Wait for async operations
  waitFor: async (callback: () => void | Promise<void>, timeout = 1000) => {
    const { waitFor } = await import('@testing-library/react');
    return waitFor(callback, { timeout });
  },

  // Act wrapper for async operations
  act: async (callback: () => void | Promise<void>) => {
    const { act } = await import('@testing-library/react');
    return act(callback);
  },

  // Create a mock error
  createMockError: (message = 'Test error', statusCode = 500) => ({
    message,
    statusCode,
    timestamp: new Date().toISOString(),
  }),

  // Create a mock API response
  createMockResponse: (data: any, success = true) => ({
    success,
    data,
    timestamp: new Date().toISOString(),
  }),
};

// Make testUtils available globally
(global as any).testUtils = testUtils;
