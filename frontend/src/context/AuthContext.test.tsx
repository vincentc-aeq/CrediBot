
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import apiClient from '../api/apiClient';

// Mock apiClient
jest.mock('../api/apiClient');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const TestComponent = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  return (
    <div>
      <span>Authenticated: {isAuthenticated.toString()}</span>
      <span>User: {user ? user.email : 'null'}</span>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should be loading initially and then not authenticated', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });
    expect(screen.getByText('Authenticated: false')).toBeInTheDocument();
    expect(screen.getByText('User: null')).toBeInTheDocument();
  });

  it('should authenticate user if token is valid', async () => {
    localStorage.setItem('authToken', 'valid-token');
    mockedApiClient.get.mockResolvedValue({ data: { user: { id: '1', email: 'test@test.com' } } });

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    expect(mockedApiClient.get).toHaveBeenCalledWith('/auth/profile');
    expect(screen.getByText('Authenticated: true')).toBeInTheDocument();
    expect(screen.getByText('User: test@test.com')).toBeInTheDocument();
  });

  it('should not authenticate if token is invalid', async () => {
    localStorage.setItem('authToken', 'invalid-token');
    mockedApiClient.get.mockRejectedValue(new Error('Invalid token'));

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    expect(screen.getByText('Authenticated: false')).toBeInTheDocument();
    expect(localStorage.getItem('authToken')).toBeNull();
  });
});
