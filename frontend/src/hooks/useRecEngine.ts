/**
 * RecEngine React Hook
 * Provides easy access to RecEngine functionality in React components
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { useAuth } from './useAuth';
import { toast } from 'react-toastify';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Types
export interface RankedCard {
  card_id: string;
  issuer: string;
  card_name: string;
  ranking_score: number;
  annual_fee: number;
  signup_bonus: number;
  reason: string;
}

export interface TriggerAnalysis {
  recommend_flag: boolean;
  confidence_score: number;
  suggested_card_id: string;
  extra_reward: number;
  reasoning: string;
}

export interface RewardEstimation {
  estimated_annual_reward: number;
  category_breakdown: Record<string, number>;
  compared_to_current?: number;
}

export interface PortfolioOptimization {
  recommendations: Array<{
    action: 'add' | 'switch' | 'remove';
    card_id?: string;
    card_name?: string;
    reasoning: string;
    impact_score?: number;
    annual_fee?: number;
    annual_fee_savings?: number;
  }>;
  current_portfolio_score: number;
  optimized_portfolio_score: number;
}

export interface CardComparison {
  card_id: string;
  estimated_annual_reward: number;
  category_breakdown: Record<string, number>;
}

// Custom hook for RecEngine integration
export const useRecEngine = () => {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();

  // Configure axios instance
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  /**
   * Get personalized homepage recommendations
   */
  const useHomepageRecommendations = (enabled = true) => {
    return useQuery(
      ['recengine', 'homepage', user?.id],
      async () => {
        const response = await api.get('/recommendations/homepage');
        return response.data.data as { ranked_cards: RankedCard[] };
      },
      {
        enabled: enabled && !!user,
        staleTime: 30 * 60 * 1000, // 30 minutes
        cacheTime: 60 * 60 * 1000, // 1 hour
        onError: (error: any) => {
          console.error('Failed to get homepage recommendations:', error);
          toast.error('Unable to load recommendations');
        },
      }
    );
  };

  /**
   * Analyze transaction for recommendations
   */
  const analyzeTransaction = useMutation(
    async (params: {
      transaction_id?: string;
      amount?: number;
      category?: string;
      merchant?: string;
    }) => {
      const response = await api.post('/recommendations/transaction-analysis', params);
      return response.data.data as TriggerAnalysis;
    },
    {
      onSuccess: (data) => {
        if (data.recommend_flag) {
          toast.info(
            `💳 Better card available! Save $${data.extra_reward.toFixed(2)} with ${data.suggested_card_id}`,
            {
              position: 'bottom-right',
              autoClose: 10000,
            }
          );
        }
      },
      onError: (error: any) => {
        console.error('Transaction analysis failed:', error);
      },
    }
  );

  /**
   * Estimate rewards for a specific card
   */
  const estimateRewards = useMutation(
    async (params: {
      card_id: string;
      projected_spending: Record<string, number>;
      time_horizon_months?: number;
    }) => {
      const response = await api.post(
        `/recommendations/estimate-rewards/${params.card_id}`,
        {
          projected_spending: params.projected_spending,
          time_horizon_months: params.time_horizon_months || 12,
        }
      );
      return response.data.data as RewardEstimation;
    }
  );

  /**
   * Get portfolio optimization suggestions
   */
  const usePortfolioOptimization = () => {
    return useQuery(
      ['recengine', 'optimization', user?.id],
      async () => {
        const response = await api.get('/recommendations/optimization');
        return response.data.data as PortfolioOptimization;
      },
      {
        enabled: !!user,
        staleTime: 60 * 60 * 1000, // 1 hour
        onError: (error: any) => {
          console.error('Portfolio optimization failed:', error);
          toast.error('Unable to optimize portfolio');
        },
      }
    );
  };

  /**
   * Compare multiple cards
   */
  const compareCards = useMutation(
    async (params: {
      card_ids: string[];
      spending_pattern?: Record<string, number>;
    }) => {
      const response = await api.post('/recommendations/compare', params);
      return response.data.data as {
        comparisons: CardComparison[];
        best_card: string;
        spending_pattern: Record<string, number>;
      };
    }
  );

  /**
   * Clear user's recommendation cache
   */
  const clearCache = useMutation(
    async () => {
      const response = await api.post('/recommendations/cache/clear');
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['recengine']);
        toast.success('Recommendations refreshed');
      },
    }
  );

  /**
   * Check RecEngine service status
   */
  const useServiceStatus = () => {
    return useQuery(
      ['recengine', 'status'],
      async () => {
        const response = await api.get('/recommendations/status');
        return response.data.data as {
          available: boolean;
          responseTime?: number;
          error?: string;
        };
      },
      {
        staleTime: 60 * 1000, // 1 minute
        refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
      }
    );
  };

  return {
    // Queries
    useHomepageRecommendations,
    usePortfolioOptimization,
    useServiceStatus,
    
    // Mutations
    analyzeTransaction,
    estimateRewards,
    compareCards,
    clearCache,
  };
};

/**
 * Helper hook for transaction recommendation triggers
 */
export const useTransactionTrigger = () => {
  const { analyzeTransaction } = useRecEngine();
  const [lastAnalyzedTxn, setLastAnalyzedTxn] = useState<string | null>(null);

  const triggerAnalysis = useCallback(
    async (transaction: {
      id: string;
      amount: number;
      category: string;
      merchant?: string;
    }) => {
      // Avoid analyzing the same transaction twice
      if (transaction.id === lastAnalyzedTxn) return;

      setLastAnalyzedTxn(transaction.id);
      
      try {
        const result = await analyzeTransaction.mutateAsync({
          transaction_id: transaction.id,
          amount: transaction.amount,
          category: transaction.category,
          merchant: transaction.merchant,
        });

        return result;
      } catch (error) {
        console.error('Failed to analyze transaction:', error);
        return null;
      }
    },
    [analyzeTransaction, lastAnalyzedTxn]
  );

  return {
    triggerAnalysis,
    isAnalyzing: analyzeTransaction.isLoading,
    lastResult: analyzeTransaction.data,
  };
};

/**
 * Helper hook for card comparison widget
 */
export const useCardComparison = (initialCardIds: string[] = []) => {
  const { compareCards } = useRecEngine();
  const [selectedCards, setSelectedCards] = useState<string[]>(initialCardIds);
  const [customSpending, setCustomSpending] = useState<Record<string, number> | null>(null);

  const runComparison = useCallback(async () => {
    if (selectedCards.length < 2) {
      toast.warning('Select at least 2 cards to compare');
      return;
    }

    try {
      const result = await compareCards.mutateAsync({
        card_ids: selectedCards,
        spending_pattern: customSpending || undefined,
      });

      return result;
    } catch (error) {
      console.error('Comparison failed:', error);
      toast.error('Unable to compare cards');
      return null;
    }
  }, [selectedCards, customSpending, compareCards]);

  return {
    selectedCards,
    setSelectedCards,
    customSpending,
    setCustomSpending,
    runComparison,
    isComparing: compareCards.isLoading,
    comparisonResult: compareCards.data,
  };
};