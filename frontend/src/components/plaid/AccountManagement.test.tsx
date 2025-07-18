import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AccountManagement } from './AccountManagement';
import { plaidApi } from '../../api/plaidApi';

// Mock plaidApi
jest.mock('../../api/plaidApi', () => ({
  plaidApi: {
    getLinkedAccounts: jest.fn(),
    getAccountStats: jest.fn(),
    unlinkAccount: jest.fn(),
    syncTransactions: jest.fn(),
    getAccountBalances: jest.fn()
  }
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date) => '2024/01/15 10:30'),
  zhTW: {}
}));

const mockPlaidApi = plaidApi as jest.Mocked<typeof plaidApi>;

const mockAccounts = [
  {
    id: 'account-1',
    itemId: 'item-1',
    name: 'Chase Checking',
    type: 'depository',
    subtype: 'checking',
    mask: '1234',
    isActive: true,
    lastUpdated: new Date().toISOString(),
    balance: {
      available: 1500,
      current: 1500,
      limit: null
    }
  },
  {
    id: 'account-2',
    itemId: 'item-2',
    name: 'Chase Savings',
    type: 'depository',
    subtype: 'savings',
    mask: '5678',
    isActive: true,
    lastUpdated: new Date().toISOString(),
    balance: {
      available: 5000,
      current: 5000,
      limit: null
    }
  }
];

const mockStats = {
  totalAccounts: 2,
  activeAccounts: 2,
  lastSyncTime: new Date().toISOString(),
  totalTransactions: 150
};

describe('AccountManagement', () => {
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
    mockPlaidApi.getLinkedAccounts.mockResolvedValue({ accounts: mockAccounts });
    mockPlaidApi.getAccountStats.mockResolvedValue(mockStats);
  });

  describe('初始渲染', () => {
    test('應該顯示帳戶管理標題', async () => {
      renderWithQuery(<AccountManagement />);
      
      expect(screen.getByText('帳戶管理')).toBeInTheDocument();
    });

    test('應該顯示統計資訊', async () => {
      renderWithQuery(<AccountManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // 總帳戶數
        expect(screen.getByText('150')).toBeInTheDocument(); // 總交易數
      });
    });

    test('應該顯示帳戶列表', async () => {
      renderWithQuery(<AccountManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Chase Checking')).toBeInTheDocument();
        expect(screen.getByText('Chase Savings')).toBeInTheDocument();
      });
    });

    test('應該顯示帳戶類型標籤', async () => {
      renderWithQuery(<AccountManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('支票帳戶')).toBeInTheDocument();
        expect(screen.getByText('儲蓄帳戶')).toBeInTheDocument();
      });
    });

    test('應該顯示帳戶餘額', async () => {
      renderWithQuery(<AccountManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('餘額: $1,500')).toBeInTheDocument();
        expect(screen.getByText('餘額: $5,000')).toBeInTheDocument();
      });
    });

    test('應該顯示帳戶末四位', async () => {
      renderWithQuery(<AccountManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('帳戶末四位: ****1234')).toBeInTheDocument();
        expect(screen.getByText('帳戶末四位: ****5678')).toBeInTheDocument();
      });
    });
  });

  describe('帳戶操作', () => {
    test('應該顯示同步所有按鈕', async () => {
      renderWithQuery(<AccountManagement />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /同步所有/i })).toBeInTheDocument();
      });
    });

    test('應該顯示新增帳戶按鈕', async () => {
      renderWithQuery(<AccountManagement />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /新增帳戶/i })).toBeInTheDocument();
      });
    });

    test('點擊同步所有應該呼叫 syncTransactions', async () => {
      mockPlaidApi.syncTransactions.mockResolvedValue({
        added: 5,
        modified: 2,
        removed: 0
      });

      renderWithQuery(<AccountManagement />);
      
      await waitFor(() => {
        const syncButton = screen.getByRole('button', { name: /同步所有/i });
        fireEvent.click(syncButton);
      });

      expect(mockPlaidApi.syncTransactions).toHaveBeenCalledWith({});
    });

    test('點擊新增帳戶應該開啟對話框', async () => {
      renderWithQuery(<AccountManagement />);
      
      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /新增帳戶/i });
        fireEvent.click(addButton);
      });

      expect(screen.getByText('新增銀行帳戶')).toBeInTheDocument();
    });
  });

  describe('帳戶選單', () => {
    test('應該顯示帳戶選單按鈕', async () => {
      renderWithQuery(<AccountManagement />);
      
      await waitFor(() => {
        const menuButtons = screen.getAllByRole('button', { name: /More options/i });
        expect(menuButtons).toHaveLength(2);
      });
    });

    test('點擊選單按鈕應該顯示選單選項', async () => {
      renderWithQuery(<AccountManagement />);
      
      await waitFor(() => {
        const menuButtons = screen.getAllByRole('button', { name: /More options/i });
        fireEvent.click(menuButtons[0]);
      });

      expect(screen.getByText('更新餘額')).toBeInTheDocument();
      expect(screen.getByText('同步交易')).toBeInTheDocument();
      expect(screen.getByText('取消連結')).toBeInTheDocument();
    });

    test('點擊更新餘額應該呼叫 getAccountBalances', async () => {
      mockPlaidApi.getAccountBalances.mockResolvedValue({
        balance: {
          available: 1600,
          current: 1600,
          limit: null
        }
      });

      renderWithQuery(<AccountManagement />);
      
      await waitFor(() => {
        const menuButtons = screen.getAllByRole('button', { name: /More options/i });
        fireEvent.click(menuButtons[0]);
      });

      const refreshButton = screen.getByText('更新餘額');
      fireEvent.click(refreshButton);

      expect(mockPlaidApi.getAccountBalances).toHaveBeenCalledWith('account-1');
    });

    test('點擊取消連結應該顯示確認對話框', async () => {
      renderWithQuery(<AccountManagement />);
      
      await waitFor(() => {
        const menuButtons = screen.getAllByRole('button', { name: /More options/i });
        fireEvent.click(menuButtons[0]);
      });

      const unlinkButton = screen.getByText('取消連結');
      fireEvent.click(unlinkButton);

      expect(screen.getByText('取消連結帳戶')).toBeInTheDocument();
      expect(screen.getByText('您確定要取消連結「Chase Checking」嗎？')).toBeInTheDocument();
    });
  });

  describe('取消連結確認', () => {
    test('確認取消連結應該呼叫 unlinkAccount', async () => {
      mockPlaidApi.unlinkAccount.mockResolvedValue();

      renderWithQuery(<AccountManagement />);
      
      await waitFor(() => {
        const menuButtons = screen.getAllByRole('button', { name: /More options/i });
        fireEvent.click(menuButtons[0]);
      });

      const unlinkButton = screen.getByText('取消連結');
      fireEvent.click(unlinkButton);

      const confirmButton = screen.getByText('確定取消連結');
      fireEvent.click(confirmButton);

      expect(mockPlaidApi.unlinkAccount).toHaveBeenCalledWith('item-1');
    });

    test('取消對話框應該關閉對話框', async () => {
      renderWithQuery(<AccountManagement />);
      
      await waitFor(() => {
        const menuButtons = screen.getAllByRole('button', { name: /More options/i });
        fireEvent.click(menuButtons[0]);
      });

      const unlinkButton = screen.getByText('取消連結');
      fireEvent.click(unlinkButton);

      const cancelButton = screen.getByText('取消');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('取消連結帳戶')).not.toBeInTheDocument();
      });
    });
  });

  describe('空狀態', () => {
    test('沒有帳戶時應該顯示空狀態', async () => {
      mockPlaidApi.getLinkedAccounts.mockResolvedValue({ accounts: [] });

      renderWithQuery(<AccountManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('尚未連結任何帳戶')).toBeInTheDocument();
        expect(screen.getByText('連結您的銀行帳戶以獲得個人化的信用卡推薦')).toBeInTheDocument();
      });
    });

    test('空狀態應該顯示連結第一個帳戶按鈕', async () => {
      mockPlaidApi.getLinkedAccounts.mockResolvedValue({ accounts: [] });

      renderWithQuery(<AccountManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('連結第一個帳戶')).toBeInTheDocument();
      });
    });
  });

  describe('錯誤處理', () => {
    test('API 錯誤應該顯示錯誤訊息', async () => {
      mockPlaidApi.getLinkedAccounts.mockRejectedValue(new Error('API 錯誤'));

      renderWithQuery(<AccountManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('無法載入帳戶資訊。請稍後再試。')).toBeInTheDocument();
      });
    });
  });

  describe('載入狀態', () => {
    test('載入中應該顯示載入指示器', () => {
      mockPlaidApi.getLinkedAccounts.mockImplementation(() => new Promise(() => {}));

      renderWithQuery(<AccountManagement />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });
});