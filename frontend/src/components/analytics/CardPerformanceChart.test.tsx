import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CardPerformanceChart from './CardPerformanceChart';

const theme = createTheme();

const mockCardData = [
  {
    cardId: 'card-1',
    cardName: 'Chase Sapphire Reserve',
    totalSpent: 5000,
    totalRewards: 150,
    rewardRate: 3.0,
    monthlyData: [
      { month: '2023-01', spent: 1000, rewards: 30 },
      { month: '2023-02', spent: 1200, rewards: 36 },
      { month: '2023-03', spent: 1500, rewards: 45 },
    ],
    categoryBreakdown: [
      { category: 'dining', amount: 2000, rewardRate: 3.0 },
      { category: 'travel', amount: 1500, rewardRate: 3.0 },
      { category: 'groceries', amount: 1500, rewardRate: 1.5 },
    ],
  },
  {
    cardId: 'card-2',
    cardName: 'Discover It Cash Back',
    totalSpent: 3000,
    totalRewards: 90,
    rewardRate: 3.0,
    monthlyData: [
      { month: '2023-01', spent: 800, rewards: 24 },
      { month: '2023-02', spent: 1000, rewards: 30 },
      { month: '2023-03', spent: 1200, rewards: 36 },
    ],
    categoryBreakdown: [
      { category: 'groceries', amount: 1200, rewardRate: 5.0 },
      { category: 'gas', amount: 1000, rewardRate: 5.0 },
      { category: 'other', amount: 800, rewardRate: 1.0 },
    ],
  },
];

const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  );
};

describe('CardPerformanceChart', () => {
  const mockOnTimeframeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders chart title correctly', () => {
    render(
      <CardPerformanceChart
        data={mockCardData}
        selectedTimeframe="month"
        onTimeframeChange={mockOnTimeframeChange}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('卡片效能分析')).toBeInTheDocument();
  });

  it('renders timeframe selector correctly', () => {
    render(
      <CardPerformanceChart
        data={mockCardData}
        selectedTimeframe="month"
        onTimeframeChange={mockOnTimeframeChange}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('時間範圍')).toBeInTheDocument();
    expect(screen.getByDisplayValue('month')).toBeInTheDocument();
  });

  it('calls onTimeframeChange when timeframe is changed', () => {
    render(
      <CardPerformanceChart
        data={mockCardData}
        selectedTimeframe="month"
        onTimeframeChange={mockOnTimeframeChange}
      />,
      { wrapper: createWrapper() }
    );

    const timeframeSelect = screen.getByDisplayValue('month');
    fireEvent.mouseDown(timeframeSelect);
    
    const quarterOption = screen.getByText('季度');
    fireEvent.click(quarterOption);

    expect(mockOnTimeframeChange).toHaveBeenCalledWith('quarter');
  });

  it('renders all tab options correctly', () => {
    render(
      <CardPerformanceChart
        data={mockCardData}
        selectedTimeframe="month"
        onTimeframeChange={mockOnTimeframeChange}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('回饋率比較')).toBeInTheDocument();
    expect(screen.getByText('回饋金額比較')).toBeInTheDocument();
    expect(screen.getByText('月度趨勢')).toBeInTheDocument();
    expect(screen.getByText('消費分類')).toBeInTheDocument();
  });

  it('switches between tabs correctly', () => {
    render(
      <CardPerformanceChart
        data={mockCardData}
        selectedTimeframe="month"
        onTimeframeChange={mockOnTimeframeChange}
      />,
      { wrapper: createWrapper() }
    );

    // Click on rewards amount tab
    const rewardsTab = screen.getByText('回饋金額比較');
    fireEvent.click(rewardsTab);

    // Check that the active tab has changed
    expect(rewardsTab).toHaveAttribute('aria-selected', 'true');
  });

  it('renders card summary information correctly', () => {
    render(
      <CardPerformanceChart
        data={mockCardData}
        selectedTimeframe="month"
        onTimeframeChange={mockOnTimeframeChange}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Chase Sapphire Reserve')).toBeInTheDocument();
    expect(screen.getByText('Discover It Cash Back')).toBeInTheDocument();
    expect(screen.getByText('總消費：$5,000')).toBeInTheDocument();
    expect(screen.getByText('總回饋：$150')).toBeInTheDocument();
    expect(screen.getByText('回饋率：3.00%')).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    render(
      <CardPerformanceChart
        data={[]}
        selectedTimeframe="month"
        onTimeframeChange={mockOnTimeframeChange}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('卡片效能分析')).toBeInTheDocument();
    // Should not crash and should still render basic structure
  });

  it('formats currency values correctly', () => {
    render(
      <CardPerformanceChart
        data={mockCardData}
        selectedTimeframe="month"
        onTimeframeChange={mockOnTimeframeChange}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('總消費：$5,000')).toBeInTheDocument();
    expect(screen.getByText('總回饋：$150')).toBeInTheDocument();
    expect(screen.getByText('總消費：$3,000')).toBeInTheDocument();
    expect(screen.getByText('總回饋：$90')).toBeInTheDocument();
  });

  it('displays reward rates with correct precision', () => {
    render(
      <CardPerformanceChart
        data={mockCardData}
        selectedTimeframe="month"
        onTimeframeChange={mockOnTimeframeChange}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('回饋率：3.00%')).toBeInTheDocument();
  });

  it('renders category breakdown tab correctly', () => {
    render(
      <CardPerformanceChart
        data={mockCardData}
        selectedTimeframe="month"
        onTimeframeChange={mockOnTimeframeChange}
      />,
      { wrapper: createWrapper() }
    );

    // Switch to category breakdown tab
    const categoryTab = screen.getByText('消費分類');
    fireEvent.click(categoryTab);

    // Should show doughnut chart (we can't test chart rendering directly, but can verify tab switch)
    expect(categoryTab).toHaveAttribute('aria-selected', 'true');
  });

  it('renders monthly trends tab correctly', () => {
    render(
      <CardPerformanceChart
        data={mockCardData}
        selectedTimeframe="month"
        onTimeframeChange={mockOnTimeframeChange}
      />,
      { wrapper: createWrapper() }
    );

    // Switch to monthly trends tab
    const trendsTab = screen.getByText('月度趨勢');
    fireEvent.click(trendsTab);

    // Should show line chart
    expect(trendsTab).toHaveAttribute('aria-selected', 'true');
  });

  it('maintains responsive design structure', () => {
    render(
      <CardPerformanceChart
        data={mockCardData}
        selectedTimeframe="month"
        onTimeframeChange={mockOnTimeframeChange}
      />,
      { wrapper: createWrapper() }
    );

    // Check if grid structure is present
    const cardElements = screen.getAllByText(/Chase Sapphire Reserve|Discover It Cash Back/);
    expect(cardElements).toHaveLength(2);
  });
});