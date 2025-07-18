import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import SpendingCategoriesChart from './SpendingCategoriesChart';

const theme = createTheme();

const mockSpendingData = [
  {
    category: 'dining',
    amount: 2000,
    percentage: 40.0,
    transactions: 25,
    trend: 'up' as const,
    bestCard: 'Chase Sapphire Reserve',
    potentialSavings: 50,
    monthlyData: [
      { month: '2023-01', amount: 600 },
      { month: '2023-02', amount: 700 },
      { month: '2023-03', amount: 700 },
    ],
  },
  {
    category: 'groceries',
    amount: 1500,
    percentage: 30.0,
    transactions: 20,
    trend: 'stable' as const,
    bestCard: 'Discover It Cash Back',
    potentialSavings: 75,
    monthlyData: [
      { month: '2023-01', amount: 500 },
      { month: '2023-02', amount: 500 },
      { month: '2023-03', amount: 500 },
    ],
  },
  {
    category: 'gas',
    amount: 1000,
    percentage: 20.0,
    transactions: 15,
    trend: 'down' as const,
    bestCard: 'Chase Freedom',
    potentialSavings: 25,
    monthlyData: [
      { month: '2023-01', amount: 400 },
      { month: '2023-02', amount: 300 },
      { month: '2023-03', amount: 300 },
    ],
  },
  {
    category: 'shopping',
    amount: 500,
    percentage: 10.0,
    transactions: 10,
    trend: 'up' as const,
    bestCard: 'Amazon Prime Card',
    potentialSavings: 15,
    monthlyData: [
      { month: '2023-01', amount: 100 },
      { month: '2023-02', amount: 200 },
      { month: '2023-03', amount: 200 },
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

describe('SpendingCategoriesChart', () => {
  const totalSpent = 5000;
  const timeframe = 'month';

  it('renders chart title correctly', () => {
    render(
      <SpendingCategoriesChart
        data={mockSpendingData}
        totalSpent={totalSpent}
        timeframe={timeframe}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('消費分類分析')).toBeInTheDocument();
  });

  it('renders all tab options correctly', () => {
    render(
      <SpendingCategoriesChart
        data={mockSpendingData}
        totalSpent={totalSpent}
        timeframe={timeframe}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('分類分佈')).toBeInTheDocument();
    expect(screen.getByText('金額比較')).toBeInTheDocument();
    expect(screen.getByText('趨勢分析')).toBeInTheDocument();
    expect(screen.getByText('詳細列表')).toBeInTheDocument();
  });

  it('switches between tabs correctly', () => {
    render(
      <SpendingCategoriesChart
        data={mockSpendingData}
        totalSpent={totalSpent}
        timeframe={timeframe}
      />,
      { wrapper: createWrapper() }
    );

    // Click on amount comparison tab
    const amountTab = screen.getByText('金額比較');
    fireEvent.click(amountTab);

    expect(amountTab).toHaveAttribute('aria-selected', 'true');
  });

  it('displays summary statistics correctly', () => {
    render(
      <SpendingCategoriesChart
        data={mockSpendingData}
        totalSpent={totalSpent}
        timeframe={timeframe}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('總消費')).toBeInTheDocument();
    expect(screen.getByText('$5,000')).toBeInTheDocument();
    expect(screen.getByText('主要分類')).toBeInTheDocument();
    expect(screen.getByText('dining')).toBeInTheDocument();
    expect(screen.getByText('40.0% 的消費')).toBeInTheDocument();
  });

  it('displays total transactions correctly', () => {
    render(
      <SpendingCategoriesChart
        data={mockSpendingData}
        totalSpent={totalSpent}
        timeframe={timeframe}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('總交易筆數')).toBeInTheDocument();
    expect(screen.getByText('70')).toBeInTheDocument(); // 25 + 20 + 15 + 10
  });

  it('displays potential savings correctly', () => {
    render(
      <SpendingCategoriesChart
        data={mockSpendingData}
        totalSpent={totalSpent}
        timeframe={timeframe}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('可節省金額')).toBeInTheDocument();
    expect(screen.getByText('$165')).toBeInTheDocument(); // 50 + 75 + 25 + 15
  });

  it('displays detailed list when switching to detail tab', () => {
    render(
      <SpendingCategoriesChart
        data={mockSpendingData}
        totalSpent={totalSpent}
        timeframe={timeframe}
      />,
      { wrapper: createWrapper() }
    );

    // Switch to detailed list tab
    const detailTab = screen.getByText('詳細列表');
    fireEvent.click(detailTab);

    // Check if category details are shown
    expect(screen.getByText('40.0% 的總消費 • 25 筆交易')).toBeInTheDocument();
    expect(screen.getByText('30.0% 的總消費 • 20 筆交易')).toBeInTheDocument();
    expect(screen.getByText('20.0% 的總消費 • 15 筆交易')).toBeInTheDocument();
    expect(screen.getByText('10.0% 的總消費 • 10 筆交易')).toBeInTheDocument();
  });

  it('displays trend indicators correctly', () => {
    render(
      <SpendingCategoriesChart
        data={mockSpendingData}
        totalSpent={totalSpent}
        timeframe={timeframe}
      />,
      { wrapper: createWrapper() }
    );

    // Switch to detailed list tab to see trends
    const detailTab = screen.getByText('詳細列表');
    fireEvent.click(detailTab);

    expect(screen.getByText('↗ 上升')).toBeInTheDocument();
    expect(screen.getByText('→ 穩定')).toBeInTheDocument();
    expect(screen.getByText('↘ 下降')).toBeInTheDocument();
  });

  it('displays recommended cards correctly', () => {
    render(
      <SpendingCategoriesChart
        data={mockSpendingData}
        totalSpent={totalSpent}
        timeframe={timeframe}
      />,
      { wrapper: createWrapper() }
    );

    // Switch to detailed list tab to see recommended cards
    const detailTab = screen.getByText('詳細列表');
    fireEvent.click(detailTab);

    expect(screen.getByText('建議使用：Chase Sapphire Reserve')).toBeInTheDocument();
    expect(screen.getByText('建議使用：Discover It Cash Back')).toBeInTheDocument();
    expect(screen.getByText('建議使用：Chase Freedom')).toBeInTheDocument();
    expect(screen.getByText('建議使用：Amazon Prime Card')).toBeInTheDocument();
  });

  it('displays potential savings for each category', () => {
    render(
      <SpendingCategoriesChart
        data={mockSpendingData}
        totalSpent={totalSpent}
        timeframe={timeframe}
      />,
      { wrapper: createWrapper() }
    );

    // Switch to detailed list tab to see potential savings
    const detailTab = screen.getByText('詳細列表');
    fireEvent.click(detailTab);

    expect(screen.getByText('可節省：$50')).toBeInTheDocument();
    expect(screen.getByText('可節省：$75')).toBeInTheDocument();
    expect(screen.getByText('可節省：$25')).toBeInTheDocument();
    expect(screen.getByText('可節省：$15')).toBeInTheDocument();
  });

  it('sorts categories by spending amount', () => {
    render(
      <SpendingCategoriesChart
        data={mockSpendingData}
        totalSpent={totalSpent}
        timeframe={timeframe}
      />,
      { wrapper: createWrapper() }
    );

    // Switch to detailed list tab
    const detailTab = screen.getByText('詳細列表');
    fireEvent.click(detailTab);

    // Get all category amounts and verify they're sorted
    const categoryAmounts = screen.getAllByText(/\$\d+/);
    // First should be dining ($2,000), then groceries ($1,500), etc.
    expect(categoryAmounts[0]).toHaveTextContent('$2,000');
    expect(categoryAmounts[1]).toHaveTextContent('$1,500');
    expect(categoryAmounts[2]).toHaveTextContent('$1,000');
    expect(categoryAmounts[3]).toHaveTextContent('$500');
  });

  it('handles empty data gracefully', () => {
    render(
      <SpendingCategoriesChart
        data={[]}
        totalSpent={0}
        timeframe={timeframe}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('消費分類分析')).toBeInTheDocument();
    expect(screen.getByText('$0')).toBeInTheDocument();
  });

  it('displays trends analysis tab correctly', () => {
    render(
      <SpendingCategoriesChart
        data={mockSpendingData}
        totalSpent={totalSpent}
        timeframe={timeframe}
      />,
      { wrapper: createWrapper() }
    );

    // Switch to trends tab
    const trendsTab = screen.getByText('趨勢分析');
    fireEvent.click(trendsTab);

    expect(trendsTab).toHaveAttribute('aria-selected', 'true');
  });
});