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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
} from '@mui/material';

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

interface CardPerformanceData {
  cardId: string;
  cardName: string;
  totalSpent: number;
  totalRewards: number;
  rewardRate: number;
  monthlyData: Array<{
    month: string;
    spent: number;
    rewards: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    rewardRate: number;
  }>;
}

interface CardPerformanceChartProps {
  data: CardPerformanceData[];
  selectedTimeframe: 'month' | 'quarter' | 'year';
  onTimeframeChange: (timeframe: 'month' | 'quarter' | 'year') => void;
}

export const CardPerformanceChart: React.FC<CardPerformanceChartProps> = ({
  data,
  selectedTimeframe,
  onTimeframeChange,
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = React.useState(0);

  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // yellow
    '#ef4444', // red
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
  ];

  const rewardRatesData = {
    labels: data.map(card => card.cardName),
    datasets: [
      {
        label: '回饋率 (%)',
        data: data.map(card => card.rewardRate),
        backgroundColor: colors.slice(0, data.length),
        borderColor: colors.slice(0, data.length),
        borderWidth: 1,
      },
    ],
  };

  const totalRewardsData = {
    labels: data.map(card => card.cardName),
    datasets: [
      {
        label: '總回饋金額 ($)',
        data: data.map(card => card.totalRewards),
        backgroundColor: colors.slice(0, data.length),
        borderColor: colors.slice(0, data.length),
        borderWidth: 1,
      },
    ],
  };

  const monthlyTrendsData = {
    labels: data[0]?.monthlyData.map(item => item.month) || [],
    datasets: data.map((card, index) => ({
      label: card.cardName,
      data: card.monthlyData.map(item => item.rewards),
      borderColor: colors[index],
      backgroundColor: colors[index] + '20',
      fill: false,
    })),
  };

  const categoryBreakdownData = data[0] ? {
    labels: data[0].categoryBreakdown.map(item => item.category),
    datasets: [
      {
        data: data[0].categoryBreakdown.map(item => item.amount),
        backgroundColor: colors.slice(0, data[0].categoryBreakdown.length),
        borderColor: colors.slice(0, data[0].categoryBreakdown.length),
        borderWidth: 1,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '卡片效能分析',
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
        text: '月度回饋趨勢',
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

  return (
    <Card>
      <CardContent>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" component="h2">
            卡片效能分析
          </Typography>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>時間範圍</InputLabel>
            <Select
              value={selectedTimeframe}
              label="時間範圍"
              onChange={(e) => onTimeframeChange(e.target.value as 'month' | 'quarter' | 'year')}
            >
              <MenuItem value="month">月度</MenuItem>
              <MenuItem value="quarter">季度</MenuItem>
              <MenuItem value="year">年度</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="回饋率比較" />
          <Tab label="回饋金額比較" />
          <Tab label="月度趨勢" />
          <Tab label="消費分類" />
        </Tabs>

        <Box sx={{ height: 400 }}>
          {activeTab === 0 && (
            <Bar data={rewardRatesData} options={chartOptions} />
          )}
          {activeTab === 1 && (
            <Bar data={totalRewardsData} options={chartOptions} />
          )}
          {activeTab === 2 && (
            <Line data={monthlyTrendsData} options={lineOptions} />
          )}
          {activeTab === 3 && categoryBreakdownData && (
            <Doughnut data={categoryBreakdownData} options={doughnutOptions} />
          )}
        </Box>

        <Grid container spacing={2} sx={{ mt: 3 }}>
          {data.map((card) => (
            <Grid item xs={12} md={4} key={card.cardId}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {card.cardName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    總消費：${card.totalSpent.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    總回饋：${card.totalRewards.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    回饋率：{card.rewardRate.toFixed(2)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default CardPerformanceChart;