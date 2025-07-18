import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CardManagement } from './CardManagement';
import { adminApi } from '../../api/adminApi';

// Mock adminApi
jest.mock('../../api/adminApi', () => ({
  adminApi: {
    getAllCards: jest.fn(),
    getCardStatistics: jest.fn(),
    deleteCard: jest.fn(),
    updateCard: jest.fn()
  }
}));

// Mock chart components
jest.mock('react-chartjs-2', () => ({
  Line: () => <div>Line Chart</div>,
  Bar: () => <div>Bar Chart</div>,
  Doughnut: () => <div>Doughnut Chart</div>
}));

const mockAdminApi = adminApi as jest.Mocked<typeof adminApi>;

const mockCards = [
  {
    id: '1',
    name: 'Chase Sapphire Preferred',
    issuer: 'Chase',
    cardType: 'travel',
    annualFee: 95,
    rewardStructure: {
      travel: 2.0,
      dining: 2.0,
      general: 1.0
    },
    signupBonus: {
      requirement: 4000,
      points: 60000,
      timeframe: 3
    },
    apr: {
      regular: 18.99,
      promotional: 0,
      promotionalEndDate: '2024-12-31'
    },
    features: ['Travel insurance', 'No foreign transaction fees'],
    pros: ['Great signup bonus', 'Excellent travel benefits'],
    cons: ['Annual fee', 'Limited transfer partners'],
    bestFor: ['Frequent travelers', 'Dining enthusiasts'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: '2',
    name: 'Citi Double Cash',
    issuer: 'Citibank',
    cardType: 'cashback',
    annualFee: 0,
    rewardStructure: {
      general: 2.0
    },
    signupBonus: {
      requirement: 1500,
      points: 200,
      timeframe: 4
    },
    apr: {
      regular: 15.99
    },
    features: ['No annual fee', 'Simple rewards'],
    pros: ['No annual fee', 'Flat 2% cashback'],
    cons: ['No signup bonus', 'Limited benefits'],
    bestFor: ['Everyday spending', 'Simplicity seekers'],
    isActive: true,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-16T00:00:00Z'
  }
];

const mockCardStats = {
  total: 2,
  active: 2,
  byIssuer: {
    Chase: 1,
    Citibank: 1
  },
  byType: {
    travel: 1,
    cashback: 1
  }
};

describe('CardManagement', () => {
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
    mockAdminApi.getAllCards.mockResolvedValue({ cards: mockCards });
    mockAdminApi.getCardStatistics.mockResolvedValue(mockCardStats);
  });

  describe('初始渲染', () => {
    test('應該顯示統計卡片', async () => {
      renderWithQuery(<CardManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('總卡片數')).toBeInTheDocument();
        expect(screen.getByText('活躍卡片')).toBeInTheDocument();
        expect(screen.getByText('發行商數量')).toBeInTheDocument();
        expect(screen.getByText('卡片類型')).toBeInTheDocument();
      });
    });

    test('應該顯示搜尋和篩選區域', async () => {
      renderWithQuery(<CardManagement />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('搜尋卡片名稱或發行商...')).toBeInTheDocument();
        expect(screen.getByLabelText('發行商')).toBeInTheDocument();
        expect(screen.getByLabelText('卡片類型')).toBeInTheDocument();
        expect(screen.getByLabelText('狀態')).toBeInTheDocument();
      });
    });

    test('應該顯示卡片列表', async () => {
      renderWithQuery(<CardManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Chase Sapphire Preferred')).toBeInTheDocument();
        expect(screen.getByText('Citi Double Cash')).toBeInTheDocument();
        expect(screen.getByText('Chase')).toBeInTheDocument();
        expect(screen.getByText('Citibank')).toBeInTheDocument();
      });
    });

    test('應該顯示新增卡片按鈕', async () => {
      renderWithQuery(<CardManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('新增卡片')).toBeInTheDocument();
      });
    });
  });

  describe('搜尋和篩選功能', () => {
    test('應該能夠搜尋卡片', async () => {
      renderWithQuery(<CardManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Chase Sapphire Preferred')).toBeInTheDocument();
        expect(screen.getByText('Citi Double Cash')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('搜尋卡片名稱或發行商...');
      fireEvent.change(searchInput, { target: { value: 'Chase' } });

      await waitFor(() => {
        expect(screen.getByText('Chase Sapphire Preferred')).toBeInTheDocument();
        expect(screen.queryByText('Citi Double Cash')).not.toBeInTheDocument();
      });
    });

    test('應該能夠按發行商篩選', async () => {
      renderWithQuery(<CardManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Chase Sapphire Preferred')).toBeInTheDocument();
        expect(screen.getByText('Citi Double Cash')).toBeInTheDocument();
      });

      const issuerSelect = screen.getByLabelText('發行商');
      fireEvent.mouseDown(issuerSelect);
      fireEvent.click(screen.getByText('Chase'));

      await waitFor(() => {
        expect(screen.getByText('Chase Sapphire Preferred')).toBeInTheDocument();
        expect(screen.queryByText('Citi Double Cash')).not.toBeInTheDocument();
      });
    });

    test('應該能夠按卡片類型篩選', async () => {
      renderWithQuery(<CardManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Chase Sapphire Preferred')).toBeInTheDocument();
        expect(screen.getByText('Citi Double Cash')).toBeInTheDocument();
      });

      const typeSelect = screen.getByLabelText('卡片類型');
      fireEvent.mouseDown(typeSelect);
      fireEvent.click(screen.getByText('travel'));

      await waitFor(() => {
        expect(screen.getByText('Chase Sapphire Preferred')).toBeInTheDocument();
        expect(screen.queryByText('Citi Double Cash')).not.toBeInTheDocument();
      });
    });
  });

  describe('卡片操作', () => {
    test('應該能夠切換卡片狀態', async () => {
      mockAdminApi.updateCard.mockResolvedValue(mockCards[0]);
      
      renderWithQuery(<CardManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Chase Sapphire Preferred')).toBeInTheDocument();
      });

      const statusSwitches = screen.getAllByRole('checkbox');
      fireEvent.click(statusSwitches[0]);

      await waitFor(() => {
        expect(mockAdminApi.updateCard).toHaveBeenCalledWith('1', { isActive: false });
      });
    });

    test('應該能夠呼叫新增卡片回調', async () => {
      const mockOnCreateCard = jest.fn();
      renderWithQuery(<CardManagement onCreateCard={mockOnCreateCard} />);
      
      await waitFor(() => {
        expect(screen.getByText('新增卡片')).toBeInTheDocument();
      });

      const createButton = screen.getByText('新增卡片');
      fireEvent.click(createButton);

      expect(mockOnCreateCard).toHaveBeenCalled();
    });

    test('應該能夠呼叫編輯卡片回調', async () => {
      const mockOnEditCard = jest.fn();
      renderWithQuery(<CardManagement onEditCard={mockOnEditCard} />);
      
      await waitFor(() => {
        expect(screen.getByText('Chase Sapphire Preferred')).toBeInTheDocument();
      });

      // 找到第一個選單按鈕並點擊
      const menuButtons = screen.getAllByRole('button', { name: /more/i });
      fireEvent.click(menuButtons[0]);

      const editButton = screen.getByText('編輯');
      fireEvent.click(editButton);

      expect(mockOnEditCard).toHaveBeenCalledWith(mockCards[0]);
    });

    test('應該能夠刪除卡片', async () => {
      mockAdminApi.deleteCard.mockResolvedValue();
      
      renderWithQuery(<CardManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Chase Sapphire Preferred')).toBeInTheDocument();
      });

      // 找到第一個選單按鈕並點擊
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
        expect(mockAdminApi.deleteCard).toHaveBeenCalledWith('1');
      });
    });
  });

  describe('卡片詳情', () => {
    test('應該能夠查看卡片詳情', async () => {
      renderWithQuery(<CardManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Chase Sapphire Preferred')).toBeInTheDocument();
      });

      // 找到第一個選單按鈕並點擊
      const menuButtons = screen.getAllByRole('button', { name: /more/i });
      fireEvent.click(menuButtons[0]);

      const viewButton = screen.getByText('查看詳情');
      fireEvent.click(viewButton);

      // 確認詳情對話框出現
      expect(screen.getByText('信用卡詳情')).toBeInTheDocument();
      expect(screen.getByText('Chase Sapphire Preferred')).toBeInTheDocument();
      expect(screen.getByText('travel')).toBeInTheDocument();
    });

    test('應該能夠關閉詳情對話框', async () => {
      renderWithQuery(<CardManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Chase Sapphire Preferred')).toBeInTheDocument();
      });

      // 找到第一個選單按鈕並點擊
      const menuButtons = screen.getAllByRole('button', { name: /more/i });
      fireEvent.click(menuButtons[0]);

      const viewButton = screen.getByText('查看詳情');
      fireEvent.click(viewButton);

      // 確認詳情對話框出現
      expect(screen.getByText('信用卡詳情')).toBeInTheDocument();

      // 點擊關閉按鈕
      const closeButton = screen.getByText('關閉');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('信用卡詳情')).not.toBeInTheDocument();
      });
    });
  });

  describe('載入狀態', () => {
    test('應該在載入中顯示載入訊息', () => {
      mockAdminApi.getAllCards.mockImplementation(() => new Promise(() => {}));
      
      renderWithQuery(<CardManagement />);
      
      expect(screen.getByText('載入中...')).toBeInTheDocument();
    });
  });

  describe('錯誤處理', () => {
    test('應該顯示錯誤訊息', async () => {
      mockAdminApi.getAllCards.mockRejectedValue(new Error('API Error'));
      
      renderWithQuery(<CardManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('無法載入信用卡資料。請稍後再試。')).toBeInTheDocument();
      });
    });
  });

  describe('分頁功能', () => {
    test('應該顯示分頁控制項', async () => {
      renderWithQuery(<CardManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('每頁行數：')).toBeInTheDocument();
      });
    });
  });
});