import React, { useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Divider,
  Stack,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  AccountBalance,
  Insights,
  SwapHoriz,
  Warning,
  CheckCircle,
  Info,
  Refresh
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

import { RecentTransactions } from '../components/analytics/RecentTransactions';

// Mock API functions (replace with actual API calls)
const dashboardApi = {
  getCardPerformance: async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      cards: [
        {
          id: '1',
          name: 'Chase Sapphire Preferred',
          type: 'Travel',
          annualFee: 95,
          rewardsEarned: 324.50,
          netValue: 229.50,
          utilizationRate: 32,
          performance: 'excellent',
          lastUsed: '2024-01-15'
        },
        {
          id: '2', 
          name: 'Citi Double Cash',
          type: 'Cashback',
          annualFee: 0,
          rewardsEarned: 156.75,
          netValue: 156.75,
          utilizationRate: 18,
          performance: 'good',
          lastUsed: '2024-01-12'
        },
        {
          id: '3',
          name: 'Capital One Venture',
          type: 'Travel', 
          annualFee: 95,
          rewardsEarned: 89.20,
          netValue: -5.80,
          utilizationRate: 8,
          performance: 'poor',
          lastUsed: '2024-01-08'
        }
      ],
      totalAnnualFees: 190,
      totalRewardsEarned: 570.45,
      netAnnualValue: 380.45
    };
  },

  getSpendingAnalysis: async () => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      categories: [
        { name: 'Dining', amount: 1245.30, percentage: 28, missedRewards: 45.20, bestCard: 'Chase Sapphire Preferred' },
        { name: 'Groceries', amount: 892.15, percentage: 20, missedRewards: 23.10, bestCard: 'Citi Double Cash' },
        { name: 'Gas', amount: 456.80, percentage: 10, missedRewards: 18.50, bestCard: 'Chase Freedom' },
        { name: 'Travel', amount: 678.90, percentage: 15, missedRewards: 67.20, bestCard: 'Capital One Venture' },
        { name: 'Shopping', amount: 567.45, percentage: 13, missedRewards: 28.90, bestCard: 'Amazon Prime Card' },
        { name: 'Other', amount: 623.40, percentage: 14, missedRewards: 12.30, bestCard: 'Citi Double Cash' }
      ],
      totalSpending: 4464.00,
      totalMissedRewards: 195.20,
      monthlyTrend: [3200, 3450, 3890, 4100, 4464]
    };
  },

  getOptimizationOpportunities: async () => {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    return {
      recommendations: [
        {
          type: 'upgrade',
          priority: 'high',
          title: 'Upgrade to Chase Sapphire Reserve',
          description: 'Based on your travel spending, upgrading could earn you an additional $234 annually',
          projectedSavings: 234,
          confidence: 92,
          action: 'upgrade_card'
        },
        {
          type: 'new_card',
          priority: 'medium', 
          title: 'Add a Gas Rewards Card',
          description: 'You could earn 18% more on gas purchases with a specialized gas rewards card',
          projectedSavings: 85,
          confidence: 78,
          action: 'apply_new'
        },
        {
          type: 'usage_optimization',
          priority: 'low',
          title: 'Optimize Card Usage',
          description: 'Use your Chase Sapphire Preferred for dining purchases instead of Citi Double Cash',
          projectedSavings: 45,
          confidence: 85,
          action: 'change_usage'
        }
      ],
      totalPotentialSavings: 364
    };
  }
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard data
  const { data: cardPerformance, isLoading: loadingCards, refetch: refetchCards } = useQuery({
    queryKey: ['card-performance'],
    queryFn: dashboardApi.getCardPerformance,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: spendingAnalysis, isLoading: loadingSpending, refetch: refetchSpending } = useQuery({
    queryKey: ['spending-analysis'],
    queryFn: dashboardApi.getSpendingAnalysis,
    staleTime: 5 * 60 * 1000,
  });

  const { data: optimizationData, isLoading: loadingOptimization, refetch: refetchOptimization } = useQuery({
    queryKey: ['optimization-opportunities'],
    queryFn: dashboardApi.getOptimizationOpportunities,
    staleTime: 10 * 60 * 1000,
  });

  const isLoading = loadingCards || loadingSpending || loadingOptimization;

  // Handle refresh all data
  const handleRefreshAll = async () => {
    setRefreshing(true);
    await Promise.all([refetchCards(), refetchSpending(), refetchOptimization()]);
    setRefreshing(false);
  };

  // Chart configurations
  const spendingCategoryChart = {
    labels: spendingAnalysis?.categories.map(cat => cat.name) || [],
    datasets: [
      {
        data: spendingAnalysis?.categories.map(cat => cat.amount) || [],
        backgroundColor: [
          '#FF6384',
          '#36A2EB', 
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40'
        ],
        hoverBackgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56', 
          '#4BC0C0',
          '#9966FF',
          '#FF9F40'
        ]
      }
    ]
  };

  const monthlySpendingChart = {
    labels: ['Month -4', 'Month -3', 'Month -2', 'Month -1', 'Current'],
    datasets: [
      {
        label: 'Monthly Spending ($)',
        data: spendingAnalysis?.monthlyTrend || [],
        borderColor: '#36A2EB',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        tension: 0.4
      }
    ]
  };

  const rewardsVsFeesChart = {
    labels: cardPerformance?.cards.map(card => card.name) || [],
    datasets: [
      {
        label: 'Annual Fee ($)',
        data: cardPerformance?.cards.map(card => card.annualFee) || [],
        backgroundColor: '#FF6384'
      },
      {
        label: 'Rewards Earned ($)',
        data: cardPerformance?.cards.map(card => card.rewardsEarned) || [],
        backgroundColor: '#36A2EB'
      }
    ]
  };

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case 'excellent': return 'success';
      case 'good': return 'info';
      case 'poor': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Credit Card Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Welcome back, {user?.firstName}! Here's your card performance overview.
          </Typography>
        </Box>
        <Tooltip title="Refresh all data">
          <IconButton 
            onClick={handleRefreshAll} 
            disabled={refreshing}
            color="primary"
          >
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Key Metrics Overview */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <CreditCard color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Cards</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {cardPerformance?.cards.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active credit cards
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <AccountBalance color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Rewards</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                ${cardPerformance?.totalRewardsEarned.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Earned this year
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <TrendingUp color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Annual Fees</Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                ${cardPerformance?.totalAnnualFees}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total yearly cost
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Insights color={cardPerformance?.netAnnualValue && cardPerformance.netAnnualValue > 0 ? "success" : "error"} sx={{ mr: 1 }} />
                <Typography variant="h6">Net Value</Typography>
              </Box>
              <Typography 
                variant="h4" 
                color={cardPerformance?.netAnnualValue && cardPerformance.netAnnualValue > 0 ? "success.main" : "error.main"}
              >
                ${cardPerformance?.netAnnualValue.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Rewards minus fees
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Optimization Opportunities Alert */}
      {optimizationData && optimizationData.totalPotentialSavings > 0 && (
        <Alert severity="info" sx={{ mb: 4 }} icon={<TrendingUp />}>
          <Typography variant="subtitle1" gutterBottom>
            Optimization Opportunity Detected!
          </Typography>
          <Typography variant="body2">
            You could potentially save <strong>${optimizationData.totalPotentialSavings}</strong> annually 
            by optimizing your credit card portfolio. Check the recommendations below.
          </Typography>
        </Alert>
      )}

      {/* Card Performance Table */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Card Performance Analysis
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Card Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Annual Fee</TableCell>
                  <TableCell align="right">Rewards Earned</TableCell>
                  <TableCell align="right">Net Value</TableCell>
                  <TableCell align="center">Utilization</TableCell>
                  <TableCell align="center">Performance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cardPerformance?.cards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell>
                      <Typography variant="subtitle2">{card.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Last used: {new Date(card.lastUsed).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={card.type} variant="outlined" size="small" />
                    </TableCell>
                    <TableCell align="right">${card.annualFee}</TableCell>
                    <TableCell align="right">${card.rewardsEarned.toFixed(2)}</TableCell>
                    <TableCell align="right">
                      <Typography 
                        color={card.netValue > 0 ? "success.main" : "error.main"}
                        fontWeight="bold"
                      >
                        ${card.netValue.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ width: '100%', mr: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={card.utilizationRate} 
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="caption" sx={{ mt: 0.5 }}>
                          {card.utilizationRate}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={card.performance} 
                        color={getPerformanceColor(card.performance) as any}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <Grid container spacing={3} mb={4}>
        {/* Annual Fee vs Rewards Chart */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Annual Fee vs. Rewards Earned
              </Typography>
              <Box sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Bar 
                  data={rewardsVsFeesChart} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Amount ($)'
                        }
                      }
                    }
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Spending Categories Chart */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Spending Categories
              </Typography>
              <Box sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Doughnut 
                  data={spendingCategoryChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom'
                      }
                    }
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Monthly Spending Trend */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monthly Spending Trend
              </Typography>
              <Box sx={{ height: 300 }}>
                <Line 
                  data={monthlySpendingChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Spending ($)'
                        }
                      }
                    }
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Spending Categories Analysis */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Spending Categories vs. Missed Benefits
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Amount Spent</TableCell>
                  <TableCell align="right">Percentage</TableCell>
                  <TableCell align="right">Missed Rewards</TableCell>
                  <TableCell>Best Card for Category</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {spendingAnalysis?.categories.map((category, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="subtitle2">{category.name}</Typography>
                    </TableCell>
                    <TableCell align="right">${category.amount.toFixed(2)}</TableCell>
                    <TableCell align="right">{category.percentage}%</TableCell>
                    <TableCell align="right">
                      <Typography color="error.main" fontWeight="bold">
                        ${category.missedRewards.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={category.bestCard} variant="outlined" size="small" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Divider sx={{ my: 2 }} />
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Total Missed Rewards: 
              <Typography component="span" color="error.main" fontWeight="bold" sx={{ ml: 1 }}>
                ${spendingAnalysis?.totalMissedRewards.toFixed(2)}
              </Typography>
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <RecentTransactions />

      {/* Optimization Recommendations */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Optimization Opportunities
          </Typography>
          <Stack spacing={2}>
            {optimizationData?.recommendations.map((rec, index) => (
              <Paper key={index} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box flex={1}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Typography variant="h6" sx={{ mr: 2 }}>
                        {rec.title}
                      </Typography>
                      <Chip 
                        label={rec.priority} 
                        color={getPriorityColor(rec.priority) as any}
                        size="small" 
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      {rec.description}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Typography variant="subtitle2" color="success.main">
                        Potential Savings: ${rec.projectedSavings}/year
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Confidence: {rec.confidence}%
                      </Typography>
                    </Box>
                  </Box>
                  <Button 
                    variant="contained" 
                    size="small"
                    startIcon={rec.type === 'upgrade' ? <TrendingUp /> : rec.type === 'new_card' ? <CreditCard /> : <SwapHoriz />}
                  >
                    {rec.type === 'upgrade' ? 'Upgrade' : rec.type === 'new_card' ? 'Apply' : 'Optimize'}
                  </Button>
                </Box>
              </Paper>
            ))}
          </Stack>
          
          {optimizationData && optimizationData.recommendations.length === 0 && (
            <Box textAlign="center" py={4}>
              <CheckCircle color="success" sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="h6" color="success.main">
                Your card portfolio is already optimized!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No immediate optimization opportunities found.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default DashboardPage;