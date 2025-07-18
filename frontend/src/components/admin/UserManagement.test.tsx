import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserManagement } from './UserManagement';
import { adminApi } from '../../api/adminApi';

// Mock adminApi
jest.mock('../../api/adminApi', () => ({
  adminApi: {
    getAllUsers: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    getUserStats: jest.fn()
  }
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date) => '2024/01/15'),
  zhTW: {}
}));

const mockAdminApi = adminApi as jest.Mocked<typeof adminApi>;

const mockUsers = [
  {
    id: '1',
    username: 'john_doe',
    email: 'john@example.com',
    role: 'user',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    preferences: {
      notifications: true,
      dataSharing: false,
      marketingEmails: true
    },
    stats: {
      totalTransactions: 150,
      totalSpending: 5000,
      connectedAccounts: 2
    }
  },
  {
    id: '2',
    username: 'jane_smith',
    email: 'jane@example.com',
    role: 'admin',
    isActive: true,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-16T00:00:00Z',
    preferences: {
      notifications: true,
      dataSharing: true,
      marketingEmails: false
    },
    stats: {
      totalTransactions: 200,
      totalSpending: 8000,
      connectedAccounts: 3
    }
  }
];

const mockUsersData = {
  users: mockUsers,
  total: 2,
  page: 1,
  limit: 10
};

describe('UserManagement', () => {
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
    mockAdminApi.getAllUsers.mockResolvedValue(mockUsersData);
  });

  describe('初始渲染', () => {
    test('應該顯示用戶管理標題', async () => {
      renderWithQuery(<UserManagement />);
      
      expect(screen.getByText('用戶管理')).toBeInTheDocument();
    });

    test('應該顯示新增用戶按鈕', async () => {
      renderWithQuery(<UserManagement />);
      
      expect(screen.getByText('新增用戶')).toBeInTheDocument();
    });

    test('應該顯示標籤頁', async () => {
      renderWithQuery(<UserManagement />);
      
      expect(screen.getByText('用戶列表')).toBeInTheDocument();
      expect(screen.getByText('支援工單')).toBeInTheDocument();
      expect(screen.getByText('活動記錄')).toBeInTheDocument();
    });

    test('應該顯示搜尋和篩選區域', async () => {
      renderWithQuery(<UserManagement />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('搜尋用戶名稱或郵箱...')).toBeInTheDocument();
        expect(screen.getByLabelText('角色')).toBeInTheDocument();
        expect(screen.getByLabelText('狀態')).toBeInTheDocument();
      });
    });

    test('應該顯示用戶列表', async () => {
      renderWithQuery(<UserManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
        expect(screen.getByText('jane_smith')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      });
    });
  });

  describe('用戶列表功能', () => {
    test('應該顯示用戶資訊', async () => {
      renderWithQuery(<UserManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('user')).toBeInTheDocument();
        expect(screen.getByText('admin')).toBeInTheDocument();
      });
    });

    test('應該顯示用戶統計', async () => {
      renderWithQuery(<UserManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('$5,000')).toBeInTheDocument();
        expect(screen.getByText('$8,000')).toBeInTheDocument();
      });
    });

    test('應該能夠搜尋用戶', async () => {
      renderWithQuery(<UserManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
        expect(screen.getByText('jane_smith')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('搜尋用戶名稱或郵箱...');
      fireEvent.change(searchInput, { target: { value: 'john' } });

      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
        expect(screen.queryByText('jane_smith')).not.toBeInTheDocument();
      });
    });

    test('應該能夠按角色篩選', async () => {
      renderWithQuery(<UserManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
        expect(screen.getByText('jane_smith')).toBeInTheDocument();
      });

      const roleSelect = screen.getByLabelText('角色');
      fireEvent.mouseDown(roleSelect);
      fireEvent.click(screen.getByText('管理員'));

      await waitFor(() => {
        expect(screen.queryByText('john_doe')).not.toBeInTheDocument();
        expect(screen.getByText('jane_smith')).toBeInTheDocument();
      });
    });
  });

  describe('用戶操作', () => {
    test('應該能夠切換用戶狀態', async () => {
      mockAdminApi.updateUser.mockResolvedValue(mockUsers[0]);
      
      renderWithQuery(<UserManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
      });

      const statusSwitches = screen.getAllByRole('checkbox');
      fireEvent.click(statusSwitches[0]);

      await waitFor(() => {
        expect(mockAdminApi.updateUser).toHaveBeenCalledWith('1', { isActive: false });
      });
    });

    test('應該能夠開啟操作選單', async () => {
      renderWithQuery(<UserManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
      });

      const menuButtons = screen.getAllByRole('button', { name: /more/i });
      fireEvent.click(menuButtons[0]);

      expect(screen.getByText('查看詳情')).toBeInTheDocument();
      expect(screen.getByText('編輯')).toBeInTheDocument();
      expect(screen.getByText('刪除')).toBeInTheDocument();
    });

    test('應該能夠查看用戶詳情', async () => {
      renderWithQuery(<UserManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
      });

      const menuButtons = screen.getAllByRole('button', { name: /more/i });
      fireEvent.click(menuButtons[0]);

      const viewButton = screen.getByText('查看詳情');
      fireEvent.click(viewButton);

      expect(screen.getByText('用戶詳情')).toBeInTheDocument();
      expect(screen.getByText('基本資訊')).toBeInTheDocument();
      expect(screen.getByText('使用統計')).toBeInTheDocument();
    });

    test('應該能夠刪除用戶', async () => {
      mockAdminApi.deleteUser.mockResolvedValue();
      
      renderWithQuery(<UserManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
      });

      const menuButtons = screen.getAllByRole('button', { name: /more/i });
      fireEvent.click(menuButtons[0]);

      const deleteButton = screen.getByText('刪除');
      fireEvent.click(deleteButton);

      // 確認刪除對話框出現
      expect(screen.getByText('確認刪除')).toBeInTheDocument();

      // 點擊確認刪除
      const confirmButton = screen.getByText('確定刪除');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockAdminApi.deleteUser).toHaveBeenCalledWith('1');
      });
    });
  });

  describe('標籤頁功能', () => {
    test('應該能夠切換到支援工單標籤', async () => {
      renderWithQuery(<UserManagement />);
      
      const supportTab = screen.getByText('支援工單');
      fireEvent.click(supportTab);

      expect(screen.getByText('支援工單')).toBeInTheDocument();
      expect(screen.getByText('無法連結銀行帳戶')).toBeInTheDocument();
    });

    test('應該能夠切換到活動記錄標籤', async () => {
      renderWithQuery(<UserManagement />);
      
      const historyTab = screen.getByText('活動記錄');
      fireEvent.click(historyTab);

      expect(screen.getByText('活動記錄功能正在開發中')).toBeInTheDocument();
    });
  });

  describe('支援工單', () => {
    test('應該顯示支援工單列表', async () => {
      renderWithQuery(<UserManagement />);
      
      const supportTab = screen.getByText('支援工單');
      fireEvent.click(supportTab);

      expect(screen.getByText('無法連結銀行帳戶')).toBeInTheDocument();
      expect(screen.getByText('信用卡推薦不準確')).toBeInTheDocument();
      expect(screen.getByText('帳戶資料更新問題')).toBeInTheDocument();
    });

    test('應該顯示工單狀態', async () => {
      renderWithQuery(<UserManagement />);
      
      const supportTab = screen.getByText('支援工單');
      fireEvent.click(supportTab);

      expect(screen.getByText('開放')).toBeInTheDocument();
      expect(screen.getByText('處理中')).toBeInTheDocument();
      expect(screen.getByText('已解決')).toBeInTheDocument();
    });
  });

  describe('載入狀態', () => {
    test('應該在載入中顯示載入訊息', () => {
      mockAdminApi.getAllUsers.mockImplementation(() => new Promise(() => {}));
      
      renderWithQuery(<UserManagement />);
      
      expect(screen.getByText('載入中...')).toBeInTheDocument();
    });
  });

  describe('錯誤處理', () => {
    test('應該顯示錯誤訊息', async () => {
      mockAdminApi.getAllUsers.mockRejectedValue(new Error('API Error'));
      
      renderWithQuery(<UserManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('無法載入用戶資料。請稍後再試。')).toBeInTheDocument();
      });
    });
  });

  describe('分頁功能', () => {
    test('應該顯示分頁控制項', async () => {
      renderWithQuery(<UserManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('每頁行數：')).toBeInTheDocument();
      });
    });
  });
});