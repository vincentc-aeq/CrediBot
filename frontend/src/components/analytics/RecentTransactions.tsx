import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Link,
  Alert,
  CircularProgress,
  Stack,
  Avatar
} from '@mui/material';
import {
  CreditCard,
  TrendingUp,
  Launch,
  Refresh,
  Restaurant,
  LocalGasStation,
  ShoppingCart,
  Flight,
  Home
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../api/analyticsApi';

interface Transaction {
  id: string;
  amount: string;
  category: string;
  merchant: string;
  description: string;
  transaction_date: string;
  card_name: string;
  issuer: string;
  card_type: string;
  rewards_earned: {
    points?: number;
    cashback?: number;
    miles?: number;
    rewardType: string;
  };
  betterCardRecommendation?: {
    cardName: string;
    issuer: string;
    additionalReward: number;
    rewardDifference: string;
    reason: string;
    applyUrl: string;
  } | null;
  triggerResult: {
    recommend_flag: boolean;
    confidence_score: number;
    reasoning: string;
  };
}

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'dining':
      return <Restaurant />;
    case 'gas':
      return <LocalGasStation />;
    case 'groceries':
      return <ShoppingCart />;
    case 'travel':
      return <Flight />;
    case 'shopping':
      return <ShoppingCart />;
    default:
      return <Home />;
  }
};

const formatCurrency = (amount: string | number) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(num);
};

const formatRewards = (rewards: Transaction['rewards_earned']) => {
  const { rewardType, points, cashback, miles } = rewards;
  
  switch (rewardType) {
    case 'cashback':
      return `$${(cashback! / 100).toFixed(2)} cash back`;
    case 'points':
      return `${points} points`;
    case 'miles':
      return `${miles} miles`;
    default:
      return 'N/A';
  }
};

export const RecentTransactions: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);

  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['recentTransactions'],
    queryFn: () => analyticsApi.getRecentTransactions(20),
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const transactions = Array.isArray(response?.data) ? response.data : 
                      Array.isArray(response?.data?.transactions) ? response.data.transactions :
                      Array.isArray(response) ? response : [];

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            Failed to load recent transactions. Please try again.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h2">
            Recent Credit Card Transactions
          </Typography>
          <Tooltip title="Refresh transactions">
            <IconButton 
              onClick={handleRefresh} 
              disabled={refreshing}
              size="small"
            >
              <Refresh className={refreshing ? 'rotating' : ''} />
            </IconButton>
          </Tooltip>
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Transaction</TableCell>
                <TableCell>Card</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="center">Rewards Earned</TableCell>
                <TableCell align="center">Better Option</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.isArray(transactions) && transactions.map((transaction: Transaction) => (
                <TableRow key={transaction.id} hover>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(transaction.transaction_date).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.light' }}>
                        {getCategoryIcon(transaction.category)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {transaction.merchant}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {transaction.description}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>

                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {transaction.card_name}
                      </Typography>
                      <Chip 
                        label={transaction.issuer}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: '20px' }}
                      />
                    </Box>
                  </TableCell>

                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(transaction.amount)}
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    <Chip
                      label={formatRewards(transaction.rewards_earned)}
                      color="success"
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>

                  <TableCell align="center">
                    {transaction.triggerResult.recommend_flag ? (
                      <Tooltip 
                        title={
                          <Box sx={{ 
                            p: 2, 
                            background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                            borderRadius: 2,
                            minWidth: 280
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                              <Box sx={{ 
                                width: 32, 
                                height: 32, 
                                borderRadius: '50%', 
                                bgcolor: '#ff9800',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mr: 1.5
                              }}>
                                💡
                              </Box>
                              <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#e65100' }}>
                                Better Card Available
                              </Typography>
                            </Box>
                            {transaction.betterCardRecommendation && (
                              <Typography variant="body2" sx={{ mb: 1, color: '#e65100', fontWeight: 'medium' }}>
                                Recommended: {transaction.betterCardRecommendation.cardName}
                              </Typography>
                            )}
                            <Typography variant="body2" sx={{ mb: 1.5, color: '#6d4c41', lineHeight: 1.4 }}>
                              {transaction.triggerResult.reasoning
                                .replace('undefined', transaction.category)
                                .replace(/(\d+)% better reward rate/g, (match, percentage) => 
                                  `${percentage}% higher rewards (${((parseInt(percentage) + 100) / 100).toFixed(1)}x multiplier)`
                                )
                              }
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" sx={{ 
                                bgcolor: '#fff',
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 1,
                                border: '1px solid #ffcc02',
                                color: '#f57f17',
                                fontWeight: 'medium'
                              }}>
                                Confidence: {Math.round(transaction.triggerResult.confidence_score * 100)}%
                              </Typography>
                              {transaction.betterCardRecommendation && (
                                <Typography variant="caption" sx={{ 
                                  color: '#2e7d32',
                                  fontWeight: 'bold'
                                }}>
                                  {transaction.betterCardRecommendation.rewardDifference}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        }
                        placement="right-start"
                        arrow
                        componentsProps={{
                          tooltip: {
                            sx: {
                              bgcolor: 'transparent',
                              border: '1px solid #ffcc02',
                              borderRadius: 2,
                              boxShadow: '0 8px 32px rgba(255, 152, 0, 0.15)',
                              p: 0,
                              maxWidth: 320,
                              '& .MuiTooltip-arrow': {
                                color: '#fff3e0'
                              }
                            }
                          },
                          arrow: {
                            sx: {
                              color: '#fff3e0',
                              '&::before': {
                                border: '1px solid #ffcc02'
                              }
                            }
                          }
                        }}
                      >
                        <Button
                          variant="outlined"
                          size="small"
                          color="warning"
                          startIcon={<TrendingUp />}
                          endIcon={<Launch />}
                          onClick={() => {
                            // For MVP, we'll show a better formatted alert
                            const reasoning = transaction.triggerResult.reasoning.replace('undefined', transaction.category);
                            alert(`💡 Recommendation for ${transaction.merchant}\n\n${reasoning}\n\nConfidence: ${Math.round(transaction.triggerResult.confidence_score * 100)}%\n\nConsider applying for a better card for ${transaction.category} spending.`);
                          }}
                          sx={{ 
                            textTransform: 'none',
                            fontSize: '0.75rem',
                            minWidth: 'auto',
                            px: 1
                          }}
                        >
                          Better Card
                        </Button>
                      </Tooltip>
                    ) : (
                      <Tooltip 
                        title={
                          <Box sx={{ 
                            p: 2, 
                            background: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)',
                            borderRadius: 2,
                            minWidth: 240
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                              <Box sx={{ 
                                width: 32, 
                                height: 32, 
                                borderRadius: '50%', 
                                bgcolor: '#4caf50',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mr: 1.5
                              }}>
                                ✅
                              </Box>
                              <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#1b5e20' }}>
                                Optimal Choice
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: '#2e7d32', lineHeight: 1.4 }}>
                              {transaction.triggerResult.reasoning}
                            </Typography>
                          </Box>
                        }
                        placement="right-start"
                        arrow
                        componentsProps={{
                          tooltip: {
                            sx: {
                              bgcolor: 'transparent',
                              border: '1px solid #4caf50',
                              borderRadius: 2,
                              boxShadow: '0 8px 32px rgba(76, 175, 80, 0.15)',
                              p: 0,
                              maxWidth: 280,
                              '& .MuiTooltip-arrow': {
                                color: '#e8f5e8'
                              }
                            }
                          },
                          arrow: {
                            sx: {
                              color: '#e8f5e8',
                              '&::before': {
                                border: '1px solid #4caf50'
                              }
                            }
                          }
                        }}
                      >
                        <Chip
                          label="Optimal"
                          color="success"
                          size="small"
                          variant="filled"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {(!Array.isArray(transactions) || transactions.length === 0) && (
          <Box textAlign="center" py={4}>
            <Typography variant="body2" color="text.secondary">
              No recent transactions found.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};