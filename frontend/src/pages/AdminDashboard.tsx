import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Tabs,
  Tab,
  Container,
  Paper,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  Tooltip,
  Dialog,
  DialogContent
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  CreditCard,
  People,
  Analytics,
  Settings,
  Refresh,
  TrendingUp,
  TrendingDown,
  Error,
  Warning,
  Info,
  CheckCircle,
  Memory,
  Storage,
  Speed,
  NetworkCheck
} from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
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
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { adminApi, CreditCardData } from '../api/adminApi';
import { 
  CardManagement, 
  CardForm, 
  UserManagement, 
  SystemAnalytics, 
  ABTestingManagement 
} from '../components/admin';

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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentCardDialogOpen, setCurrentCardDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CreditCardData | null>(null);

  // Get admin statistics
  const { data: stats, isLoading: isLoadingStats, error: statsError } = useQuery({
    queryKey: ['admin-stats', refreshKey],
    queryFn: adminApi.getAdminStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get system metrics
  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['system-metrics', refreshKey],
    queryFn: adminApi.getSystemMetrics,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Get credit card statistics
  const { data: cardStats } = useQuery({
    queryKey: ['card-statistics', refreshKey],
    queryFn: adminApi.getCardStatistics,
    refetchInterval: 60000, // Refresh every 1 minute
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleEditCard = (card: CreditCardData) => {
    setSelectedCard(card);
    setCurrentCardDialogOpen(true);
  };

  const handleCardDialogClose = () => {
    setCurrentCardDialogOpen(false);
    setSelectedCard(null);
  };

  const getSystemHealthColor = (usage: number) => {
    if (usage < 50) return 'success';
    if (usage < 80) return 'warning';
    return 'error';
  };

  const getSystemHealthIcon = (usage: number) => {
    if (usage < 50) return <CheckCircle color="success" />;
    if (usage < 80) return <Warning color="warning" />;
    return <Error color="error" />;
  };

  if (isLoadingStats || isLoadingMetrics) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (statsError) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Unable to load admin data. Please check your permissions or try again later.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1">
          Admin Dashboard
        </Typography>
        <Tooltip title="Refresh Data">
          <IconButton onClick={handleRefresh} size="large">
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<DashboardIcon />} label="Overview" />
          <Tab icon={<CreditCard />} label="Credit Card Management" />
          <Tab icon={<People />} label="User Management" />
          <Tab icon={<Analytics />} label="System Analytics" />
          <Tab icon={<Settings />} label="Settings" />
        </Tabs>

        <TabPanel value={currentTab} index={0}>
          {/* Overview page */}
          <Grid container spacing={3}>
            {/* System statistics cards */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Total Users
                      </Typography>
                      <Typography variant="h4">
                        {stats?.totalUsers.toLocaleString()}
                      </Typography>
                    </Box>
                    <People color="primary" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Active Users
                      </Typography>
                      <Typography variant="h4">
                        {stats?.activeUsers.toLocaleString()}
                      </Typography>
                    </Box>
                    <TrendingUp color="success" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Total Credit Cards
                      </Typography>
                      <Typography variant="h4">
                        {stats?.totalCards.toLocaleString()}
                      </Typography>
                    </Box>
                    <CreditCard color="info" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Total Transactions
                      </Typography>
                      <Typography variant="h4">
                        {stats?.totalTransactions.toLocaleString()}
                      </Typography>
                    </Box>
                    <Analytics color="warning" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* System health status */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader
                  title="System Health Status"
                  action={
                    <Chip
                      icon={getSystemHealthIcon(Math.max(
                        stats?.systemHealth.memoryUsage || 0,
                        stats?.systemHealth.cpuUsage || 0
                      ))}
                      label={
                        Math.max(
                          stats?.systemHealth.memoryUsage || 0,
                          stats?.systemHealth.cpuUsage || 0
                        ) < 50 ? 'Good' : 
                        Math.max(
                          stats?.systemHealth.memoryUsage || 0,
                          stats?.systemHealth.cpuUsage || 0
                        ) < 80 ? 'Warning' : 'Critical'
                      }
                      color={getSystemHealthColor(Math.max(
                        stats?.systemHealth.memoryUsage || 0,
                        stats?.systemHealth.cpuUsage || 0
                      ))}
                    />
                  }
                />
                <CardContent>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <Memory />
                      </ListItemIcon>
                      <ListItemText
                        primary="Memory Usage"
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={stats?.systemHealth.memoryUsage || 0}
                              color={getSystemHealthColor(stats?.systemHealth.memoryUsage || 0)}
                              sx={{ flexGrow: 1 }}
                            />
                            <Typography variant="body2">
                              {stats?.systemHealth.memoryUsage || 0}%
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Speed />
                      </ListItemIcon>
                      <ListItemText
                        primary="CPU Usage"
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={stats?.systemHealth.cpuUsage || 0}
                              color={getSystemHealthColor(stats?.systemHealth.cpuUsage || 0)}
                              sx={{ flexGrow: 1 }}
                            />
                            <Typography variant="body2">
                              {stats?.systemHealth.cpuUsage || 0}%
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Storage />
                      </ListItemIcon>
                      <ListItemText
                        primary="Disk Usage"
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={stats?.systemHealth.diskUsage || 0}
                              color={getSystemHealthColor(stats?.systemHealth.diskUsage || 0)}
                              sx={{ flexGrow: 1 }}
                            />
                            <Typography variant="body2">
                              {stats?.systemHealth.diskUsage || 0}%
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <NetworkCheck />
                      </ListItemIcon>
                      <ListItemText
                        primary="System Uptime"
                        secondary={`${Math.floor((stats?.systemHealth.uptime || 0) / 3600)} hours`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Credit card statistics */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Credit Card Statistics" />
                <CardContent>
                  {cardStats && (
                    <Box sx={{ height: 300 }}>
                      <Doughnut
                        data={{
                          labels: Object.keys(cardStats.byIssuer),
                          datasets: [{
                            data: Object.values(cardStats.byIssuer),
                            backgroundColor: [
                              '#FF6384',
                              '#36A2EB',
                              '#FFCE56',
                              '#4BC0C0',
                              '#9966FF',
                              '#FF9F40'
                            ]
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            title: {
                              display: true,
                              text: 'Distribution by Issuer'
                            },
                            legend: {
                              position: 'bottom'
                            }
                          }
                        }}
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* System performance metrics */}
            {metrics && (
              <Grid item xs={12}>
                <Card>
                  <CardHeader title="System Performance Metrics" />
                  <CardContent>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" color="primary">
                            {metrics.performance.responseTime}ms
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Average Response Time
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" color="success.main">
                            {metrics.performance.throughput}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Throughput (req/s)
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" color="error.main">
                            {(metrics.performance.errorRate * 100).toFixed(2)}%
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Error Rate
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" color="info.main">
                            {metrics.performance.activeConnections}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Active Connections
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          {/* Credit card management page */}
          <CardManagement 
            onCreateCard={() => setCurrentCardDialogOpen(true)}
            onEditCard={handleEditCard}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          {/* User management page */}
          <UserManagement />
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          {/* System analytics page */}
          <SystemAnalytics />
        </TabPanel>

        <TabPanel value={currentTab} index={4}>
          {/* Settings page */}
          <ABTestingManagement />
        </TabPanel>
      </Paper>

      {/* Credit card form dialog */}
      <Dialog
        open={currentCardDialogOpen}
        onClose={handleCardDialogClose}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent>
          <CardForm
            card={selectedCard || undefined}
            onSuccess={handleCardDialogClose}
            onCancel={handleCardDialogClose}
          />
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default AdminDashboard;