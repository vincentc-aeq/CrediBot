import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  useTheme,
  Paper,
} from '@mui/material';
import {
  Restaurant,
  LocalGasStation,
  ShoppingBag,
  LocalHospital,
  School,
  Home,
  FlightTakeoff,
  MoreHoriz,
} from '@mui/icons-material';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface SpendingCategoryData {
  category: string;
  amount: number;
  percentage: number;
  transactions: number;
  trend: 'up' | 'down' | 'stable';
  bestCard: string;
  potentialSavings: number;
  monthlyData: Array<{
    month: string;
    amount: number;
  }>;
}

interface SpendingCategoriesChartProps {
  data: SpendingCategoryData[];
  totalSpent: number;
  timeframe: 'month' | 'quarter' | 'year';
}

const getCategoryIcon = (category: string) => {
  const iconMap: { [key: string]: React.ReactNode } = {
    'dining': <Restaurant />,
    'gas': <LocalGasStation />,
    'shopping': <ShoppingBag />,
    'healthcare': <LocalHospital />,
    'education': <School />,
    'home': <Home />,
    'travel': <FlightTakeoff />,
    'other': <MoreHoriz />,
  };
  return iconMap[category] || <MoreHoriz />;
};

const getCategoryColor = (category: string) => {
  const colorMap: { [key: string]: string } = {
    'dining': '#ff6b6b',
    'gas': '#4ecdc4',
    'shopping': '#45b7d1',
    'healthcare': '#f9ca24',
    'education': '#6c5ce7',
    'home': '#a29bfe',
    'travel': '#fd79a8',
    'other': '#636e72',
  };
  return colorMap[category] || '#636e72';
};

export const SpendingCategoriesChart: React.FC<SpendingCategoriesChartProps> = ({
  data,
  totalSpent,
  timeframe,
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = React.useState(0);

  const sortedData = [...data].sort((a, b) => b.amount - a.amount);

  const doughnutData = {
    labels: sortedData.map(item => item.category),
    datasets: [
      {
        data: sortedData.map(item => item.amount),
        backgroundColor: sortedData.map(item => getCategoryColor(item.category)),
        borderColor: sortedData.map(item => getCategoryColor(item.category)),
        borderWidth: 1,
      },
    ],
  };

  const barData = {
    labels: sortedData.map(item => item.category),
    datasets: [
      {
        label: '消費金額 ($)',
        data: sortedData.map(item => item.amount),
        backgroundColor: sortedData.map(item => getCategoryColor(item.category)),
        borderColor: sortedData.map(item => getCategoryColor(item.category)),
        borderWidth: 1,
      },
    ],
  };

  const trendData = {
    labels: data[0]?.monthlyData.map(item => item.month) || [],
    datasets: data.map((category) => ({
      label: category.category,
      data: category.monthlyData.map(item => item.amount),
      borderColor: getCategoryColor(category.category),
      backgroundColor: getCategoryColor(category.category) + '20',
      fill: false,
    })),
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '消費分類分析',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      title: {
        display: true,
        text: '消費分類分佈',
      },
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '消費趨勢',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return theme.palette.error.main;
      case 'down':
        return theme.palette.success.main;
      case 'stable':
        return theme.palette.warning.main;
      default:
        return theme.palette.text.secondary;
    }
  };

  const getTrendText = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return '↗ 上升';
      case 'down':
        return '↘ 下降';
      case 'stable':
        return '→ 穩定';
      default:
        return '→ 穩定';
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          消費分類分析
        </Typography>

        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="分類分佈" />
          <Tab label="金額比較" />
          <Tab label="趨勢分析" />
          <Tab label="詳細列表" />
        </Tabs>

        <Box sx={{ height: 400 }}>
          {activeTab === 0 && (
            <Doughnut data={doughnutData} options={doughnutOptions} />
          )}
          {activeTab === 1 && (
            <Bar data={barData} options={chartOptions} />
          )}
          {activeTab === 2 && (
            <Line data={trendData} options={lineOptions} />
          )}
          {activeTab === 3 && (
            <Paper sx={{ height: '100%', overflow: 'auto' }}>
              <List>
                {sortedData.map((category) => (
                  <ListItem key={category.category} divider>
                    <ListItemIcon>
                      {getCategoryIcon(category.category)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="h6">
                            {category.category}
                          </Typography>
                          <Typography variant="h6" color="primary">
                            ${category.amount.toLocaleString()}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {category.percentage.toFixed(1)}% 的總消費 • {category.transactions} 筆交易
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                            <Typography variant="body2" sx={{ color: getTrendColor(category.trend) }}>
                              {getTrendText(category.trend)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              建議使用：{category.bestCard}
                            </Typography>
                          </Box>
                          {category.potentialSavings > 0 && (
                            <Typography variant="body2" color="success.main">
                              可節省：${category.potentialSavings.toLocaleString()}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Box>

        <Grid container spacing={2} sx={{ mt: 3 }}>
          <Grid item xs={12} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  總消費
                </Typography>
                <Typography variant="h4" color="primary">
                  ${totalSpent.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  主要分類
                </Typography>
                <Typography variant="h4" color="primary">
                  {sortedData[0]?.category || 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {sortedData[0]?.percentage.toFixed(1)}% 的消費
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  總交易筆數
                </Typography>
                <Typography variant="h4" color="primary">
                  {data.reduce((sum, cat) => sum + cat.transactions, 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  可節省金額
                </Typography>
                <Typography variant="h4" color="success.main">
                  ${data.reduce((sum, cat) => sum + cat.potentialSavings, 0).toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default SpendingCategoriesChart;