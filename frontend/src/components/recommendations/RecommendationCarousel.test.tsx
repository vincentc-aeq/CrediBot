import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import RecommendationCarousel from './RecommendationCarousel';
import { recommendationApi } from '../../api/recommendationApi';

// Mock the recommendation API
jest.mock('../../api/recommendationApi', () => ({
  recommendationApi: {
    getHomepageRecommendations: jest.fn(),
  },
}));

const mockRecommendations = {
  id: 'test-rec-1',
  type: 'HOMEPAGE',
  userId: 'user-1',
  recommendations: [
    {
      cardId: 'card-1',
      cardName: 'Cash Back Card',
      score: 0.9,
      reasoning: 'Perfect for your spending habits',
      estimatedBenefit: 500,
      confidence: 0.85,
      priority: 'high' as const,
      ctaText: 'Learn More',
      messageTitle: 'Recommended for You',
      messageDescription: 'This card offers excellent cash back rewards',
      tags: ['cashback', 'no-fee'],
    },
    {
      cardId: 'card-2',
      cardName: 'Travel Rewards Card',
      score: 0.8,
      reasoning: 'Great for frequent travelers',
      estimatedBenefit: 750,
      confidence: 0.78,
      priority: 'medium' as const,
      ctaText: 'Apply Now',
      messageTitle: 'Travel Benefits',
      messageDescription: 'Earn points on travel purchases',
      tags: ['travel', 'rewards'],
    },
    {
      cardId: 'card-3',
      cardName: 'Student Card',
      score: 0.7,
      reasoning: 'Good for building credit',
      estimatedBenefit: 200,
      confidence: 0.65,
      priority: 'low' as const,
      ctaText: 'View Details',
      messageTitle: 'Build Credit',
      messageDescription: 'Start building your credit history',
      tags: ['student', 'no-fee'],
    },
  ],
  metadata: {
    algorithmVersion: '2.1.0',
    personalizationScore: 0.8,
    diversityScore: 0.7,
    contextFactors: ['user_segment:light_user'],
    filtersCriteria: [],
    performanceMetrics: {
      responseTime: 150,
      confidenceLevel: 0.8,
      dataFreshness: 0.9,
    },
  },
  createdAt: '2023-01-01T00:00:00Z',
  expiresAt: '2023-01-02T00:00:00Z',
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const theme = createTheme();

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('RecommendationCarousel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (recommendationApi.getHomepageRecommendations as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<RecommendationCarousel />, { wrapper: createWrapper() });

    expect(screen.getByText('為您推薦')).toBeInTheDocument();
    expect(screen.getAllByTestId('skeleton')).toHaveLength(3); // Default cards per view
  });

  it('renders recommendations successfully', async () => {
    (recommendationApi.getHomepageRecommendations as jest.Mock).mockResolvedValue(
      mockRecommendations
    );

    render(<RecommendationCarousel />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Cash Back Card')).toBeInTheDocument();
      expect(screen.getByText('Travel Rewards Card')).toBeInTheDocument();
      expect(screen.getByText('Student Card')).toBeInTheDocument();
    });

    // Check recommendation details
    expect(screen.getByText('Perfect for your spending habits')).toBeInTheDocument();
    expect(screen.getByText('預估年收益：NT$500')).toBeInTheDocument();
    expect(screen.getByText('信心度：85%')).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    (recommendationApi.getHomepageRecommendations as jest.Mock).mockRejectedValue(
      new Error('API Error')
    );

    render(<RecommendationCarousel />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('無法載入推薦資料，請稍後再試')).toBeInTheDocument();
      expect(screen.getByText('重試')).toBeInTheDocument();
    });
  });

  it('handles empty recommendations', async () => {
    (recommendationApi.getHomepageRecommendations as jest.Mock).mockResolvedValue({
      ...mockRecommendations,
      recommendations: [],
    });

    render(<RecommendationCarousel />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.queryByText('Cash Back Card')).not.toBeInTheDocument();
    });
  });

  it('calls onCardClick when card is clicked', async () => {
    const mockOnCardClick = jest.fn();
    (recommendationApi.getHomepageRecommendations as jest.Mock).mockResolvedValue(
      mockRecommendations
    );

    render(
      <RecommendationCarousel onCardClick={mockOnCardClick} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Cash Back Card')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cash Back Card'));

    expect(mockOnCardClick).toHaveBeenCalledWith(mockRecommendations.recommendations[0]);
  });

  it('calls onTrackClick when card is clicked', async () => {
    const mockOnTrackClick = jest.fn();
    (recommendationApi.getHomepageRecommendations as jest.Mock).mockResolvedValue(
      mockRecommendations
    );

    render(
      <RecommendationCarousel onTrackClick={mockOnTrackClick} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Cash Back Card')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cash Back Card'));

    expect(mockOnTrackClick).toHaveBeenCalledWith(
      mockRecommendations.recommendations[0],
      0
    );
  });

  it('navigates through carousel with navigation buttons', async () => {
    const manyRecommendations = {
      ...mockRecommendations,
      recommendations: [
        ...mockRecommendations.recommendations,
        ...mockRecommendations.recommendations.map((rec, index) => ({
          ...rec,
          cardId: `card-${index + 4}`,
          cardName: `Card ${index + 4}`,
        })),
      ],
    };

    (recommendationApi.getHomepageRecommendations as jest.Mock).mockResolvedValue(
      manyRecommendations
    );

    render(<RecommendationCarousel />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Cash Back Card')).toBeInTheDocument();
    });

    // Check navigation buttons are present
    const nextButton = screen.getByRole('button', { name: /next/i });
    const prevButton = screen.getByRole('button', { name: /previous/i });

    expect(nextButton).toBeInTheDocument();
    expect(prevButton).toBeInTheDocument();
    expect(prevButton).toBeDisabled(); // Should be disabled initially

    // Click next button
    fireEvent.click(nextButton);

    // Should show different cards or change state
    await waitFor(() => {
      expect(prevButton).not.toBeDisabled();
    });
  });

  it('displays priority chips with correct colors', async () => {
    (recommendationApi.getHomepageRecommendations as jest.Mock).mockResolvedValue(
      mockRecommendations
    );

    render(<RecommendationCarousel />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
      expect(screen.getByText('low')).toBeInTheDocument();
    });
  });

  it('displays tags correctly', async () => {
    (recommendationApi.getHomepageRecommendations as jest.Mock).mockResolvedValue(
      mockRecommendations
    );

    render(<RecommendationCarousel />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('cashback')).toBeInTheDocument();
      expect(screen.getByText('no-fee')).toBeInTheDocument();
      expect(screen.getByText('travel')).toBeInTheDocument();
      expect(screen.getByText('rewards')).toBeInTheDocument();
    });
  });

  it('respects maxResults prop', async () => {
    (recommendationApi.getHomepageRecommendations as jest.Mock).mockResolvedValue(
      mockRecommendations
    );

    render(<RecommendationCarousel maxResults={2} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(recommendationApi.getHomepageRecommendations).toHaveBeenCalledWith({
        maxResults: 2,
        enablePersonalization: true,
      });
    });
  });

  it('respects enablePersonalization prop', async () => {
    (recommendationApi.getHomepageRecommendations as jest.Mock).mockResolvedValue(
      mockRecommendations
    );

    render(
      <RecommendationCarousel enablePersonalization={false} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(recommendationApi.getHomepageRecommendations).toHaveBeenCalledWith({
        maxResults: 6,
        enablePersonalization: false,
      });
    });
  });

  it('formats currency correctly', async () => {
    (recommendationApi.getHomepageRecommendations as jest.Mock).mockResolvedValue(
      mockRecommendations
    );

    render(<RecommendationCarousel />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('預估年收益：NT$500')).toBeInTheDocument();
      expect(screen.getByText('預估年收益：NT$750')).toBeInTheDocument();
    });
  });

  it('displays confidence percentage correctly', async () => {
    (recommendationApi.getHomepageRecommendations as jest.Mock).mockResolvedValue(
      mockRecommendations
    );

    render(<RecommendationCarousel />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('信心度：85%')).toBeInTheDocument();
      expect(screen.getByText('信心度：78%')).toBeInTheDocument();
      expect(screen.getByText('信心度：65%')).toBeInTheDocument();
    });
  });

  it('handles retry on error', async () => {
    (recommendationApi.getHomepageRecommendations as jest.Mock)
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce(mockRecommendations);

    render(<RecommendationCarousel />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('重試')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('重試'));

    await waitFor(() => {
      expect(screen.getByText('Cash Back Card')).toBeInTheDocument();
    });
  });
});