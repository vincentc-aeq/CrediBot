import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Tab,
  Tabs,
  useTheme,
  Alert,
  CircularProgress,
  Fade,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import {
  CardPerformanceChart,
  SpendingCategoriesChart,
  CardComparisonInterface,
  OptimizationRecommendations,
  TimePeriodSelector,
  TimePeriod,
} from '../components/analytics';
import { analyticsApi } from '../api/analyticsApi';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export const AnalyticsDashboard: React.FC = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = React.useState(0);
  const [timePeriod, setTimePeriod] = React.useState<TimePeriod>({
    type: 'preset',
    preset: 'last_30_days',
  });
  const [selectedCards, setSelectedCards] = React.useState<string[]>([]);
  const [comparisonPeriod, setComparisonPeriod] = React.useState<TimePeriod>({
    type: 'preset',
    preset: 'last_30_days',
  });

  // Fetch dashboard analytics
  const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError } = useQuery({
    queryKey: ['dashboard-analytics', timePeriod],
    queryFn: () => analyticsApi.getDashboardAnalytics({
      timeframe: timePeriod.preset || 'month',
      startDate: timePeriod.startDate?.toISOString(),
      endDate: timePeriod.endDate?.toISOString(),
    }),
  });

  // Fetch spending categories
  const { data: spendingData, isLoading: isSpendingLoading } = useQuery({
    queryKey: ['spending-categories', timePeriod],
    queryFn: () => analyticsApi.getSpendingCategoriesAnalytics({
      timeframe: timePeriod.preset || 'month',
      startDate: timePeriod.startDate?.toISOString(),
      endDate: timePeriod.endDate?.toISOString(),
    }),
  });

  // Fetch card performance comparison
  const { data: cardComparisonData, isLoading: isComparisonLoading } = useQuery({
    queryKey: ['card-performance-comparison', timePeriod, selectedCards],
    queryFn: () => analyticsApi.getCardPerformanceComparison({
      timeframe: timePeriod.preset || 'month',
      startDate: timePeriod.startDate?.toISOString(),
      endDate: timePeriod.endDate?.toISOString(),
      cardIds: selectedCards.join(','),
    }),
    enabled: selectedCards.length > 0,
  });

  // Fetch optimization opportunities
  const { data: optimizationData, isLoading: isOptimizationLoading } = useQuery({
    queryKey: ['optimization-opportunities', timePeriod],
    queryFn: () => analyticsApi.getOptimizationOpportunities({
      timeframe: timePeriod.preset || 'month',
      startDate: timePeriod.startDate?.toISOString(),
      endDate: timePeriod.endDate?.toISOString(),
    }),
  });

  // Fetch trends analytics
  const { data: trendsData, isLoading: isTrendsLoading } = useQuery({
    queryKey: ['trends-analytics', timePeriod],
    queryFn: () => analyticsApi.getTrendsAnalytics({
      timeframe: timePeriod.preset || 'month',
      startDate: timePeriod.startDate?.toISOString(),
      endDate: timePeriod.endDate?.toISOString(),
    }),
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAcceptRecommendation = (id: string) => {
    // TODO: Implement recommendation acceptance
    console.log('Accepting recommendation:', id);
  };

  const handleDismissRecommendation = (id: string) => {
    // TODO: Implement recommendation dismissal
    console.log('Dismissing recommendation:', id);
  };

  const handleLearnMore = (id: string) => {
    // TODO: Implement learn more functionality
    console.log('Learning more about:', id);
  };

  const isLoading = isDashboardLoading || isSpendingLoading || isComparisonLoading || isOptimizationLoading || isTrendsLoading;

  if (dashboardError) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Error loading dashboard data. Please try again later.
        </Alert>
      </Container>
    );
  }

  // Transform data for components
  const cardPerformanceData = dashboardData?.cardPerformance?.map(card => ({
    cardId: card.cardId,
    cardName: card.cardName,
    totalSpent: card.totalSpent || 0,
    totalRewards: card.totalRewards || 0,
    rewardRate: card.rewardRate || 0,
    monthlyData: card.monthlyData || [],
    categoryBreakdown: card.categoryBreakdown || [],
  })) || [];

  const spendingCategoriesData = spendingData?.categories?.map(category => ({
    category: category.category,
    amount: category.amount || 0,
    percentage: category.percentage || 0,
    transactions: category.transactions || 0,
    trend: category.trend || 'stable',
    bestCard: category.bestCard || '',
    potentialSavings: category.potentialSavings || 0,
    monthlyData: category.monthlyData || [],
  })) || [];

  const comparisonInterfaceData = cardComparisonData?.cards?.map(card => ({
    cardId: card.cardId,
    cardName: card.cardName,
    issuer: card.issuer || '',
    image: card.image || '',
    metrics: {
      totalSpent: card.totalSpent || 0,
      totalRewards: card.totalRewards || 0,
      rewardRate: card.rewardRate || 0,
      annualFee: card.annualFee || 0,
      effectiveRate: card.effectiveRate || 0,
      monthlyAvgSpent: card.monthlyAvgSpent || 0,
      categoryBreakdown: card.categoryBreakdown || [],
    },
    performance: {
      rank: card.rank || 0,
      score: card.score || 0,
      trend: card.trend || 'stable',
      missedOpportunities: card.missedOpportunities || 0,
      optimization: card.optimization || '',
    },
    features: {
      cashback: card.features?.cashback || false,
      points: card.features?.points || false,
      miles: card.features?.miles || false,
      noForeignFee: card.features?.noForeignFee || false,
      insurance: card.features?.insurance || false,
      concierge: card.features?.concierge || false,
    },
  })) || [];

  const optimizationOpportunities = optimizationData?.opportunities?.map(opp => ({
    id: opp.id,
    type: opp.type,
    title: opp.title,
    description: opp.description,
    priority: opp.priority,
    potentialSavings: opp.potentialSavings || 0,
    effort: opp.effort,
    timeframe: opp.timeframe,
    confidence: opp.confidence || 0,
    currentCard: opp.currentCard,
    recommendedCard: opp.recommendedCard,
    category: opp.category,
    details: opp.details,
  })) || [];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Analytics Dashboard
      </Typography>

      <TimePeriodSelector
        value={timePeriod}
        onChange={setTimePeriod}
        showComparisonPeriod={activeTab === 3}
        comparisonPeriod={comparisonPeriod}
        onComparisonChange={setComparisonPeriod}
        label="Analytics Time Range"
      />

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Card Performance" />
          <Tab label="Spending Analysis" />
          <Tab label="Card Comparison" />
          <Tab label="Optimization Recommendations" />
        </Tabs>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        <Fade in={!isLoading}>
          <Box>
            <TabPanel value={activeTab} index={0}>
              <CardPerformanceChart
                data={cardPerformanceData}
                selectedTimeframe={timePeriod.preset === 'last_30_days' ? 'month' : 
                                 timePeriod.preset === 'last_3_months' ? 'quarter' : 'year'}
                onTimeframeChange={(timeframe) => {
                  const presetMap = {
                    'month': 'last_30_days',
                    'quarter': 'last_3_months',
                    'year': 'last_year',
                  };
                  setTimePeriod({
                    type: 'preset',
                    preset: presetMap[timeframe] as TimePeriod['preset'],
                  });
                }}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <SpendingCategoriesChart
                data={spendingCategoriesData}
                totalSpent={spendingData?.totalSpent || 0}
                timeframe={timePeriod.preset === 'last_30_days' ? 'month' : 
                          timePeriod.preset === 'last_3_months' ? 'quarter' : 'year'}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
              <CardComparisonInterface
                availableCards={comparisonInterfaceData}
                selectedCards={selectedCards}
                onCardSelection={setSelectedCards}
                timeframe={timePeriod.preset === 'last_30_days' ? 'month' : 
                          timePeriod.preset === 'last_3_months' ? 'quarter' : 'year'}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={3}>
              <OptimizationRecommendations
                opportunities={optimizationOpportunities}
                onAcceptRecommendation={handleAcceptRecommendation}
                onDismissRecommendation={handleDismissRecommendation}
                onLearnMore={handleLearnMore}
              />
            </TabPanel>
          </Box>
        </Fade>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Spending
              </Typography>
              <Typography variant="h4" color="primary">
                ${dashboardData?.summary?.totalSpent?.toLocaleString() || '0'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {timePeriod.preset === 'last_30_days' ? 'Last 30 Days' : 'Selected Time Range'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Rewards
              </Typography>
              <Typography variant="h4" color="success.main">
                ${dashboardData?.summary?.totalRewards?.toLocaleString() || '0'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average Reward Rate {dashboardData?.summary?.averageRewardRate?.toFixed(2) || '0.00'}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Optimization Opportunities
              </Typography>
              <Typography variant="h4" color="warning.main">
                {optimizationOpportunities.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Potential Savings ${optimizationOpportunities.reduce((sum, opp) => sum + opp.potentialSavings, 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Number of Cards
              </Typography>
              <Typography variant="h4" color="info.main">
                {cardPerformanceData.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Cards in Use
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AnalyticsDashboard;