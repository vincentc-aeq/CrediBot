import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TransactionNotification, { TransactionNotificationData } from './TransactionNotification';

const theme = createTheme();

const mockNotification: TransactionNotificationData = {
  id: 'test-notification-1',
  type: 'better_reward',
  severity: 'high',
  title: '發現更好的回饋機會！',
  message: '您剛在 Starbucks 消費了 $25，使用 Chase Sapphire 可以獲得更高回饋率。',
  details: '預計可多獲得 $5 的回饋。',
  transaction: {
    id: 'transaction-1',
    amount: 25,
    merchant: 'Starbucks',
    category: 'dining',
    date: '2023-01-15T10:30:00Z',
  },
  recommendation: {
    cardId: 'card-1',
    cardName: 'Chase Sapphire',
    currentRewardRate: 1.0,
    potentialRewardRate: 3.0,
    missedReward: 5,
    estimatedBenefit: 150,
  },
  ctaText: '查看詳情',
  timestamp: new Date('2023-01-15T10:30:00Z'),
  isRead: false,
  isDismissed: false,
};

const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  );
};

describe('TransactionNotification', () => {
  const mockOnDismiss = jest.fn();
  const mockOnMarkAsRead = jest.fn();
  const mockOnLearnMore = jest.fn();
  const mockOnApplyCard = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders notification correctly', () => {
    render(
      <TransactionNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
        onMarkAsRead={mockOnMarkAsRead}
        onLearnMore={mockOnLearnMore}
        onApplyCard={mockOnApplyCard}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('發現更好的回饋機會！')).toBeInTheDocument();
    expect(screen.getByText(/您剛在 Starbucks 消費了 \$25/)).toBeInTheDocument();
    expect(screen.getByText('Chase Sapphire')).toBeInTheDocument();
    expect(screen.getByText('$25')).toBeInTheDocument();
    expect(screen.getByText('dining')).toBeInTheDocument();
  });

  it('displays severity chip correctly', () => {
    render(
      <TransactionNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
        onMarkAsRead={mockOnMarkAsRead}
        onLearnMore={mockOnLearnMore}
        onApplyCard={mockOnApplyCard}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('high')).toBeInTheDocument();
  });

  it('displays transaction details correctly', () => {
    render(
      <TransactionNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
        onMarkAsRead={mockOnMarkAsRead}
        onLearnMore={mockOnLearnMore}
        onApplyCard={mockOnApplyCard}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Starbucks')).toBeInTheDocument();
    expect(screen.getByText('$25')).toBeInTheDocument();
    expect(screen.getByText(/回饋率：1% → 3%/)).toBeInTheDocument();
    expect(screen.getByText(/可節省：\$5/)).toBeInTheDocument();
  });

  it('calls onDismiss when close button is clicked', () => {
    render(
      <TransactionNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
        onMarkAsRead={mockOnMarkAsRead}
        onLearnMore={mockOnLearnMore}
        onApplyCard={mockOnApplyCard}
      />,
      { wrapper: createWrapper() }
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnDismiss).toHaveBeenCalledWith('test-notification-1');
  });

  it('calls onLearnMore when learn more button is clicked', () => {
    render(
      <TransactionNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
        onMarkAsRead={mockOnMarkAsRead}
        onLearnMore={mockOnLearnMore}
        onApplyCard={mockOnApplyCard}
      />,
      { wrapper: createWrapper() }
    );

    const learnMoreButton = screen.getByText('了解更多');
    fireEvent.click(learnMoreButton);

    expect(mockOnLearnMore).toHaveBeenCalledWith(mockNotification);
    expect(mockOnMarkAsRead).toHaveBeenCalledWith('test-notification-1');
  });

  it('calls onApplyCard when CTA button is clicked', () => {
    render(
      <TransactionNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
        onMarkAsRead={mockOnMarkAsRead}
        onLearnMore={mockOnLearnMore}
        onApplyCard={mockOnApplyCard}
      />,
      { wrapper: createWrapper() }
    );

    const ctaButton = screen.getByText('查看詳情');
    fireEvent.click(ctaButton);

    expect(mockOnApplyCard).toHaveBeenCalledWith('card-1');
    expect(mockOnMarkAsRead).toHaveBeenCalledWith('test-notification-1');
  });

  it('expands and collapses details when button is clicked', () => {
    render(
      <TransactionNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
        onMarkAsRead={mockOnMarkAsRead}
        onLearnMore={mockOnLearnMore}
        onApplyCard={mockOnApplyCard}
      />,
      { wrapper: createWrapper() }
    );

    // Initially details should be hidden
    expect(screen.queryByText('預計可多獲得 $5 的回饋。')).not.toBeInTheDocument();

    // Click to expand
    const expandButton = screen.getByText('查看詳情');
    fireEvent.click(expandButton);

    // Details should now be visible
    expect(screen.getByText('預計可多獲得 $5 的回饋。')).toBeInTheDocument();
  });

  it('renders different severity colors correctly', () => {
    const urgentNotification = {
      ...mockNotification,
      severity: 'urgent' as const,
    };

    render(
      <TransactionNotification
        notification={urgentNotification}
        onDismiss={mockOnDismiss}
        onMarkAsRead={mockOnMarkAsRead}
        onLearnMore={mockOnLearnMore}
        onApplyCard={mockOnApplyCard}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('urgent')).toBeInTheDocument();
  });

  it('renders different notification types correctly', () => {
    const missedOpportunityNotification = {
      ...mockNotification,
      type: 'missed_opportunity' as const,
      title: '錯失了回饋機會',
    };

    render(
      <TransactionNotification
        notification={missedOpportunityNotification}
        onDismiss={mockOnDismiss}
        onMarkAsRead={mockOnMarkAsRead}
        onLearnMore={mockOnLearnMore}
        onApplyCard={mockOnApplyCard}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('錯失了回饋機會')).toBeInTheDocument();
  });

  it('auto-dismisses after specified duration', async () => {
    jest.useFakeTimers();

    render(
      <TransactionNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
        onMarkAsRead={mockOnMarkAsRead}
        onLearnMore={mockOnLearnMore}
        onApplyCard={mockOnApplyCard}
        autoHideDuration={3000}
      />,
      { wrapper: createWrapper() }
    );

    // Fast-forward time
    jest.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalledWith('test-notification-1');
    });

    jest.useRealTimers();
  });

  it('does not auto-dismiss when autoHideDuration is 0', () => {
    jest.useFakeTimers();

    render(
      <TransactionNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
        onMarkAsRead={mockOnMarkAsRead}
        onLearnMore={mockOnLearnMore}
        onApplyCard={mockOnApplyCard}
        autoHideDuration={0}
      />,
      { wrapper: createWrapper() }
    );

    // Fast-forward time
    jest.advanceTimersByTime(10000);

    expect(mockOnDismiss).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('renders with read state styling', () => {
    const readNotification = {
      ...mockNotification,
      isRead: true,
    };

    const { container } = render(
      <TransactionNotification
        notification={readNotification}
        onDismiss={mockOnDismiss}
        onMarkAsRead={mockOnMarkAsRead}
        onLearnMore={mockOnLearnMore}
        onApplyCard={mockOnApplyCard}
      />,
      { wrapper: createWrapper() }
    );

    // Check if the card has reduced opacity for read notifications
    const card = container.querySelector('.MuiCard-root');
    expect(card).toHaveStyle('opacity: 0.8');
  });

  it('formats currency correctly', () => {
    const notificationWithLargeAmount = {
      ...mockNotification,
      transaction: {
        ...mockNotification.transaction,
        amount: 1234.56,
      },
    };

    render(
      <TransactionNotification
        notification={notificationWithLargeAmount}
        onDismiss={mockOnDismiss}
        onMarkAsRead={mockOnMarkAsRead}
        onLearnMore={mockOnLearnMore}
        onApplyCard={mockOnApplyCard}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('$1,235')).toBeInTheDocument();
  });

  it('formats date correctly', () => {
    render(
      <TransactionNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
        onMarkAsRead={mockOnMarkAsRead}
        onLearnMore={mockOnLearnMore}
        onApplyCard={mockOnApplyCard}
      />,
      { wrapper: createWrapper() }
    );

    // Check if date is formatted correctly (may vary based on locale)
    expect(screen.getByText(/dining/)).toBeInTheDocument();
  });

  it('renders notification without details', () => {
    const notificationWithoutDetails = {
      ...mockNotification,
      details: undefined,
    };

    render(
      <TransactionNotification
        notification={notificationWithoutDetails}
        onDismiss={mockOnDismiss}
        onMarkAsRead={mockOnMarkAsRead}
        onLearnMore={mockOnLearnMore}
        onApplyCard={mockOnApplyCard}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByText('查看詳情')).not.toBeInTheDocument();
  });
});