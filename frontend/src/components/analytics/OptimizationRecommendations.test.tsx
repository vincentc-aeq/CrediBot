import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import OptimizationRecommendations from './OptimizationRecommendations';

const theme = createTheme();

const mockOpportunities = [
  {
    id: 'opp-1',
    type: 'card_switch' as const,
    title: 'Switch to Higher Reward Rate Card',
    description: 'You are using Chase Freedom for dining expenses. Consider switching to Chase Sapphire Reserve for higher rewards.',
    priority: 'high' as const,
    potentialSavings: 200,
    effort: 'easy' as const,
    timeframe: 'immediate' as const,
    confidence: 85,
    currentCard: 'Chase Freedom',
    recommendedCard: 'Chase Sapphire Reserve',
    category: 'dining',
    details: {
      currentSituation: 'Currently earning 1% rewards on dining with Chase Freedom card',
      proposedAction: 'Switch to Chase Sapphire Reserve card for dining expenses',
      expectedOutcome: 'Earn 3% rewards on dining, gain additional $200 annually',
      requirements: ['Have Chase Sapphire Reserve card', 'Remember to use this card for dining'],
      considerations: ['Ensure annual fee is worthwhile', 'Monitor credit limit restrictions'],
    },
  },
  {
    id: 'opp-2',
    type: 'new_card' as const,
    title: 'Apply for New Gas Station Rewards Card',
    description: 'You have high gas station spending. Consider applying for Discover It card for quarterly 5% rewards.',
    priority: 'medium' as const,
    potentialSavings: 150,
    effort: 'medium' as const,
    timeframe: 'short_term' as const,
    confidence: 75,
    category: 'gas',
    details: {
      currentSituation: 'Currently earning 1% rewards on gas station purchases',
      proposedAction: 'Apply for Discover It card and use during gas quarters',
      expectedOutcome: 'Earn 5% rewards on gas purchases, gain additional $150 annually',
      requirements: ['Good credit score', 'Pass credit card application', 'Activate quarterly bonus categories'],
      considerations: ['Quarterly rewards have caps', 'Must activate quarterly categories', 'First year double rewards'],
    },
  },
  {
    id: 'opp-3',
    type: 'fee_optimization' as const,
    title: 'Cancel Underused Annual Fee Card',
    description: 'Your Amex Platinum card has low usage frequency. Consider canceling to save annual fees.',
    priority: 'low' as const,
    potentialSavings: 695,
    effort: 'hard' as const,
    timeframe: 'long_term' as const,
    confidence: 60,
    currentCard: 'Amex Platinum',
    details: {
      currentSituation: 'Hold Amex Platinum card but with low usage frequency',
      proposedAction: 'Evaluate card value then consider cancellation',
      expectedOutcome: 'Save $695 annual fee',
      requirements: ['Evaluate all benefit values', 'Transfer automatic payments', 'Ensure credit score is not affected'],
      considerations: ['Lose airport lounge access', 'Impact credit history length', 'May affect other Amex cards'],
    },
  },
];

const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  );
};

describe('OptimizationRecommendations', () => {
  const mockOnAcceptRecommendation = jest.fn();
  const mockOnDismissRecommendation = jest.fn();
  const mockOnLearnMore = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders component title correctly', () => {
    render(
      <OptimizationRecommendations
        opportunities={mockOpportunities}
        onAcceptRecommendation={mockOnAcceptRecommendation}
        onDismissRecommendation={mockOnDismissRecommendation}
        onLearnMore={mockOnLearnMore}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Optimization Recommendations')).toBeInTheDocument();
  });

  it('displays summary statistics correctly', () => {
    render(
      <OptimizationRecommendations
        opportunities={mockOpportunities}
        onAcceptRecommendation={mockOnAcceptRecommendation}
        onDismissRecommendation={mockOnDismissRecommendation}
        onLearnMore={mockOnLearnMore}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Total Potential Savings')).toBeInTheDocument();
    expect(screen.getByText('$1,045')).toBeInTheDocument(); // 200 + 150 + 695
    expect(screen.getByText('Optimization Opportunities')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('High Priority')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // 1 high priority opportunity
  });

  it('renders all opportunities correctly', () => {
    render(
      <OptimizationRecommendations
        opportunities={mockOpportunities}
        onAcceptRecommendation={mockOnAcceptRecommendation}
        onDismissRecommendation={mockOnDismissRecommendation}
        onLearnMore={mockOnLearnMore}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Switch to Higher Reward Rate Card')).toBeInTheDocument();
    expect(screen.getByText('Apply for New Gas Station Rewards Card')).toBeInTheDocument();
    expect(screen.getByText('Cancel Underused Annual Fee Card')).toBeInTheDocument();
  });

  it('displays opportunity details correctly', () => {
    render(
      <OptimizationRecommendations
        opportunities={mockOpportunities}
        onAcceptRecommendation={mockOnAcceptRecommendation}
        onDismissRecommendation={mockOnDismissRecommendation}
        onLearnMore={mockOnLearnMore}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Savings: $200')).toBeInTheDocument();
    expect(screen.getByText('Savings: $150')).toBeInTheDocument();
    expect(screen.getByText('Savings: $695')).toBeInTheDocument();
    expect(screen.getByText('Confidence: 85%')).toBeInTheDocument();
    expect(screen.getByText('Confidence: 75%')).toBeInTheDocument();
    expect(screen.getByText('Confidence: 60%')).toBeInTheDocument();
  });

  it('filters opportunities by priority correctly', () => {
    render(
      <OptimizationRecommendations
        opportunities={mockOpportunities}
        onAcceptRecommendation={mockOnAcceptRecommendation}
        onDismissRecommendation={mockOnDismissRecommendation}
        onLearnMore={mockOnLearnMore}
      />,
      { wrapper: createWrapper() }
    );

    // Filter by high priority
    const highPriorityButton = screen.getByText('High Priority');
    fireEvent.click(highPriorityButton);

    // Should only show high priority opportunity
    expect(screen.getByText('Switch to Higher Reward Rate Card')).toBeInTheDocument();
    expect(screen.queryByText('Apply for New Gas Station Rewards Card')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancel Underused Annual Fee Card')).not.toBeInTheDocument();
  });

  it('opens detail dialog when info button is clicked', async () => {
    render(
      <OptimizationRecommendations
        opportunities={mockOpportunities}
        onAcceptRecommendation={mockOnAcceptRecommendation}
        onDismissRecommendation={mockOnDismissRecommendation}
        onLearnMore={mockOnLearnMore}
      />,
      { wrapper: createWrapper() }
    );

    const infoButtons = screen.getAllByTitle('View Details');
    fireEvent.click(infoButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Current Situation')).toBeInTheDocument();
      expect(screen.getByText('Proposed Action')).toBeInTheDocument();
      expect(screen.getByText('Expected Outcome')).toBeInTheDocument();
      expect(screen.getByText('Requirements')).toBeInTheDocument();
      expect(screen.getByText('Considerations')).toBeInTheDocument();
    });
  });

  it('calls onAcceptRecommendation when accept button is clicked', () => {
    render(
      <OptimizationRecommendations
        opportunities={mockOpportunities}
        onAcceptRecommendation={mockOnAcceptRecommendation}
        onDismissRecommendation={mockOnDismissRecommendation}
        onLearnMore={mockOnLearnMore}
      />,
      { wrapper: createWrapper() }
    );

    const acceptButtons = screen.getAllByTitle('Accept Recommendation');
    fireEvent.click(acceptButtons[0]);

    expect(mockOnAcceptRecommendation).toHaveBeenCalledWith('opp-1');
  });

  it('calls onDismissRecommendation when dismiss button is clicked', () => {
    render(
      <OptimizationRecommendations
        opportunities={mockOpportunities}
        onAcceptRecommendation={mockOnAcceptRecommendation}
        onDismissRecommendation={mockOnDismissRecommendation}
        onLearnMore={mockOnLearnMore}
      />,
      { wrapper: createWrapper() }
    );

    const dismissButtons = screen.getAllByTitle('Dismiss Recommendation');
    fireEvent.click(dismissButtons[0]);

    expect(mockOnDismissRecommendation).toHaveBeenCalledWith('opp-1');
  });

  it('handles empty opportunities list', () => {
    render(
      <OptimizationRecommendations
        opportunities={[]}
        onAcceptRecommendation={mockOnAcceptRecommendation}
        onDismissRecommendation={mockOnDismissRecommendation}
        onLearnMore={mockOnLearnMore}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('No optimization opportunities found')).toBeInTheDocument();
    expect(screen.getByText('Your credit card usage is already well optimized! Continue maintaining good usage habits.')).toBeInTheDocument();
  });

  it('displays priority chips with correct colors', () => {
    render(
      <OptimizationRecommendations
        opportunities={mockOpportunities}
        onAcceptRecommendation={mockOnAcceptRecommendation}
        onDismissRecommendation={mockOnDismissRecommendation}
        onLearnMore={mockOnLearnMore}
      />,
      { wrapper: createWrapper() }
    );

    const priorityChips = screen.getAllByText(/^(high|medium|low)$/);
    expect(priorityChips).toHaveLength(3);
    expect(priorityChips[0]).toHaveTextContent('high');
    expect(priorityChips[1]).toHaveTextContent('medium');
    expect(priorityChips[2]).toHaveTextContent('low');
  });

  it('displays effort chips correctly', () => {
    render(
      <OptimizationRecommendations
        opportunities={mockOpportunities}
        onAcceptRecommendation={mockOnAcceptRecommendation}
        onDismissRecommendation={mockOnDismissRecommendation}
        onLearnMore={mockOnLearnMore}
      />,
      { wrapper: createWrapper() }
    );

    const effortChips = screen.getAllByText(/^(easy|medium|hard)$/);
    expect(effortChips).toHaveLength(3);
    expect(effortChips[0]).toHaveTextContent('easy');
    expect(effortChips[1]).toHaveTextContent('medium');
    expect(effortChips[2]).toHaveTextContent('hard');
  });

  it('closes dialog when close button is clicked', async () => {
    render(
      <OptimizationRecommendations
        opportunities={mockOpportunities}
        onAcceptRecommendation={mockOnAcceptRecommendation}
        onDismissRecommendation={mockOnDismissRecommendation}
        onLearnMore={mockOnLearnMore}
      />,
      { wrapper: createWrapper() }
    );

    // Open dialog
    const infoButtons = screen.getAllByTitle('View Details');
    fireEvent.click(infoButtons[0]);

    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getByText('Current Situation')).toBeInTheDocument();
    });

    // Close dialog
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    // Wait for dialog to close
    await waitFor(() => {
      expect(screen.queryByText('Current Situation')).not.toBeInTheDocument();
    });
  });

  it('accepts recommendation from dialog', async () => {
    render(
      <OptimizationRecommendations
        opportunities={mockOpportunities}
        onAcceptRecommendation={mockOnAcceptRecommendation}
        onDismissRecommendation={mockOnDismissRecommendation}
        onLearnMore={mockOnLearnMore}
      />,
      { wrapper: createWrapper() }
    );

    // Open dialog
    const infoButtons = screen.getAllByTitle('View Details');
    fireEvent.click(infoButtons[0]);

    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getByText('Accept Recommendation')).toBeInTheDocument();
    });

    // Accept recommendation
    const acceptButton = screen.getByText('Accept Recommendation');
    fireEvent.click(acceptButton);

    expect(mockOnAcceptRecommendation).toHaveBeenCalledWith('opp-1');
  });
});