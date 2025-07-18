import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PlaidLinkComponent } from './PlaidLinkComponent';
import { plaidApi } from '../../api/plaidApi';

// Mock react-plaid-link
jest.mock('react-plaid-link', () => ({
  usePlaidLink: jest.fn()
}));

// Mock plaidApi
jest.mock('../../api/plaidApi', () => ({
  plaidApi: {
    createLinkToken: jest.fn(),
    exchangePublicToken: jest.fn()
  }
}));

const mockUsePlaidLink = require('react-plaid-link').usePlaidLink;
const mockPlaidApi = plaidApi as jest.Mocked<typeof plaidApi>;

describe('PlaidLinkComponent', () => {
  let queryClient: QueryClient;

  const renderWithQuery = (component: React.ReactElement) => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePlaidLink.mockReturnValue({
      open: jest.fn(),
      ready: true,
      error: null,
      exit: null
    });
  });

  describe('初始渲染', () => {
    test('應該顯示連結銀行帳戶的標題和說明', () => {
      renderWithQuery(<PlaidLinkComponent />);
      
      expect(screen.getByText('連結您的銀行帳戶')).toBeInTheDocument();
      expect(screen.getByText('安全地連結您的銀行帳戶，讓我們為您提供個人化的信用卡推薦')).toBeInTheDocument();
    });

    test('應該顯示連結好處列表', () => {
      renderWithQuery(<PlaidLinkComponent />);
      
      expect(screen.getByText('自動分析交易')).toBeInTheDocument();
      expect(screen.getByText('安全連結')).toBeInTheDocument();
      expect(screen.getByText('智能建議')).toBeInTheDocument();
    });

    test('應該顯示連結銀行帳戶按鈕', () => {
      renderWithQuery(<PlaidLinkComponent />);
      
      expect(screen.getByRole('button', { name: /連結銀行帳戶/i })).toBeInTheDocument();
    });
  });

  describe('連結流程', () => {
    test('點擊連結按鈕應該呼叫 createLinkToken', async () => {
      mockPlaidApi.createLinkToken.mockResolvedValue({ linkToken: 'test-token' });
      
      renderWithQuery(<PlaidLinkComponent />);
      
      const linkButton = screen.getByRole('button', { name: /連結銀行帳戶/i });
      fireEvent.click(linkButton);
      
      await waitFor(() => {
        expect(mockPlaidApi.createLinkToken).toHaveBeenCalled();
      });
    });

    test('createLinkToken 成功後應該顯示同意對話框', async () => {
      mockPlaidApi.createLinkToken.mockResolvedValue({ linkToken: 'test-token' });
      
      renderWithQuery(<PlaidLinkComponent />);
      
      const linkButton = screen.getByRole('button', { name: /連結銀行帳戶/i });
      
      await act(async () => {
        fireEvent.click(linkButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('資料隱私與同意')).toBeInTheDocument();
      });
    });

    test('同意對話框應該顯示資料存取資訊', async () => {
      mockPlaidApi.createLinkToken.mockResolvedValue({ linkToken: 'test-token' });
      
      renderWithQuery(<PlaidLinkComponent />);
      
      const linkButton = screen.getByRole('button', { name: /連結銀行帳戶/i });
      fireEvent.click(linkButton);
      
      await waitFor(() => {
        expect(screen.getByText('我們會存取什麼資料？')).toBeInTheDocument();
        expect(screen.getByText('帳戶餘額和基本資訊')).toBeInTheDocument();
        expect(screen.getByText('交易記錄（用於分析消費模式）')).toBeInTheDocument();
      });
    });

    test('點擊同意按鈕應該呼叫 Plaid open', async () => {
      const mockOpen = jest.fn();
      mockUsePlaidLink.mockReturnValue({
        open: mockOpen,
        ready: true,
        error: null,
        exit: null
      });
      mockPlaidApi.createLinkToken.mockResolvedValue({ linkToken: 'test-token' });
      
      renderWithQuery(<PlaidLinkComponent />);
      
      const linkButton = screen.getByRole('button', { name: /連結銀行帳戶/i });
      fireEvent.click(linkButton);
      
      await waitFor(() => {
        expect(screen.getByText('同意並繼續')).toBeInTheDocument();
      });
      
      const agreeButton = screen.getByText('同意並繼續');
      fireEvent.click(agreeButton);
      
      expect(mockOpen).toHaveBeenCalled();
    });
  });

  describe('成功回調', () => {
    test('Plaid 成功回調應該呼叫 exchangePublicToken', async () => {
      const mockOnSuccess = jest.fn();
      mockPlaidApi.exchangePublicToken.mockResolvedValue({
        accounts: [
          {
            id: 'test-account-1',
            itemId: 'test-item-1',
            name: 'Test Checking',
            type: 'depository',
            subtype: 'checking',
            mask: '1234',
            isActive: true,
            lastUpdated: new Date().toISOString()
          }
        ]
      });

      const mockUsePlaidLinkReturn = {
        open: jest.fn(),
        ready: true,
        error: null,
        exit: null
      };

      mockUsePlaidLink.mockImplementation(({ onSuccess }) => {
        // 模擬 Plaid 成功回調
        setTimeout(() => {
          onSuccess('test-public-token', {
            institution: {
              name: 'Test Bank',
              institution_id: 'test-bank-id'
            },
            accounts: [
              {
                id: 'test-account-1',
                name: 'Test Checking',
                type: 'depository',
                subtype: 'checking'
              }
            ]
          });
        }, 100);
        
        return mockUsePlaidLinkReturn;
      });

      renderWithQuery(<PlaidLinkComponent onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(mockPlaidApi.exchangePublicToken).toHaveBeenCalledWith({
          publicToken: 'test-public-token',
          metadata: {
            institution: {
              name: 'Test Bank',
              institution_id: 'test-bank-id'
            },
            accounts: [
              {
                id: 'test-account-1',
                name: 'Test Checking',
                type: 'depository',
                subtype: 'checking'
              }
            ]
          }
        });
      });
    });

    test('exchangePublicToken 成功應該呼叫 onSuccess 回調', async () => {
      const mockOnSuccess = jest.fn();
      const mockAccounts = [
        {
          id: 'test-account-1',
          itemId: 'test-item-1',
          name: 'Test Checking',
          type: 'depository',
          subtype: 'checking',
          mask: '1234',
          isActive: true,
          lastUpdated: new Date().toISOString()
        }
      ];

      mockPlaidApi.exchangePublicToken.mockResolvedValue({
        accounts: mockAccounts
      });

      mockUsePlaidLink.mockImplementation(({ onSuccess }) => {
        setTimeout(() => {
          onSuccess('test-public-token', {
            institution: {
              name: 'Test Bank',
              institution_id: 'test-bank-id'
            },
            accounts: [
              {
                id: 'test-account-1',
                name: 'Test Checking',
                type: 'depository',
                subtype: 'checking'
              }
            ]
          });
        }, 100);
        
        return {
          open: jest.fn(),
          ready: true,
          error: null,
          exit: null
        };
      });

      renderWithQuery(<PlaidLinkComponent onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(mockAccounts);
      });
    });
  });

  describe('錯誤處理', () => {
    test('createLinkToken 失敗應該顯示錯誤訊息', async () => {
      mockPlaidApi.createLinkToken.mockRejectedValue(new Error('無法創建連結令牌'));
      
      renderWithQuery(<PlaidLinkComponent />);
      
      const linkButton = screen.getByRole('button', { name: /連結銀行帳戶/i });
      fireEvent.click(linkButton);
      
      await waitFor(() => {
        expect(screen.getByText('無法初始化連結流程')).toBeInTheDocument();
      });
    });

    test('exchangePublicToken 失敗應該顯示錯誤訊息', async () => {
      mockPlaidApi.exchangePublicToken.mockRejectedValue(new Error('連結失敗'));

      mockUsePlaidLink.mockImplementation(({ onSuccess }) => {
        setTimeout(() => {
          onSuccess('test-public-token', {
            institution: {
              name: 'Test Bank',
              institution_id: 'test-bank-id'
            },
            accounts: []
          });
        }, 100);
        
        return {
          open: jest.fn(),
          ready: true,
          error: null,
          exit: null
        };
      });

      renderWithQuery(<PlaidLinkComponent />);
      
      await waitFor(() => {
        expect(screen.getByText('連結失敗')).toBeInTheDocument();
      });
    });

    test('Plaid 錯誤回調應該呼叫 onError', async () => {
      const mockOnError = jest.fn();
      
      mockUsePlaidLink.mockImplementation(({ onError }) => {
        setTimeout(() => {
          onError({
            error_type: 'INVALID_CREDENTIALS',
            error_code: 'INVALID_CREDENTIALS',
            error_message: 'Invalid credentials',
            display_message: '登入資訊錯誤'
          });
        }, 100);
        
        return {
          open: jest.fn(),
          ready: true,
          error: null,
          exit: null
        };
      });

      renderWithQuery(<PlaidLinkComponent onError={mockOnError} />);
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
      });
    });
  });

  describe('載入狀態', () => {
    test('載入中時應該顯示載入狀態', async () => {
      const mockPromise = new Promise(() => {}); // 永遠不會 resolve
      mockPlaidApi.createLinkToken.mockReturnValue(mockPromise);
      
      renderWithQuery(<PlaidLinkComponent />);
      
      const linkButton = screen.getByRole('button', { name: /連結銀行帳戶/i });
      
      await act(async () => {
        fireEvent.click(linkButton);
      });
      
      // 檢查是否顯示載入狀態
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /連結銀行帳戶/i })).toBeDisabled();
      });
    });

    test('Plaid 未準備好時同意按鈕應該被禁用', async () => {
      mockPlaidApi.createLinkToken.mockResolvedValue({ linkToken: 'test-token' });
      mockUsePlaidLink.mockReturnValue({
        open: jest.fn(),
        ready: false,
        error: null,
        exit: null
      });

      renderWithQuery(<PlaidLinkComponent />);
      
      const linkButton = screen.getByRole('button', { name: /連結銀行帳戶/i });
      
      await act(async () => {
        fireEvent.click(linkButton);
      });
      
      await waitFor(() => {
        const agreeButton = screen.getByText('同意並繼續');
        expect(agreeButton).toBeDisabled();
      });
    });
  });
});