import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Tabs,
  Tab,
  Badge,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Speed,
  Memory,
  Storage,
  NetworkCheck,
  Error,
  Warning,
  Info,
  CheckCircle,
  Refresh,
  Download,
  Analytics,
  Timeline,
  BugReport,
  Security,
  Database,
  Cloud,
  Api
} from '@mui/icons-material';
import { Line, Bar, Doughnut, Area } from 'react-chartjs-2';
import { format, subDays, subHours } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { adminApi } from '../../api/adminApi';

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
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

export const SystemAnalytics: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [timeRange, setTimeRange] = useState('24h');
  const [logLevel, setLogLevel] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(10000);

  // 獲取系統指標
  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['system-metrics'],
    queryFn: adminApi.getSystemMetrics,
    refetchInterval: refreshInterval,
  });

  // 獲取系統日誌
  const { data: logsData, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['system-logs', logLevel, timeRange],
    queryFn: () => adminApi.getSystemLogs({
      level: logLevel || undefined,
      startDate: format(subDays(new Date(), timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      limit: 100
    }),
    refetchInterval: 30000,
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // 模擬性能數據
  const performanceData = {
    labels: Array.from({ length: 24 }, (_, i) => 
      format(subHours(new Date(), 23 - i), 'HH:mm')
    ),
    datasets: [
      {
        label: '響應時間 (ms)',
        data: Array.from({ length: 24 }, () => Math.random() * 200 + 100),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      },
      {
        label: '吞吐量 (req/s)',
        data: Array.from({ length: 24 }, () => Math.random() * 1000 + 500),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1
      }
    ]
  };

  // 模擬錯誤分佈數據
  const errorData = {
    labels: ['4xx 錯誤', '5xx 錯誤', '網路錯誤', '超時錯誤'],
    datasets: [{
      data: [45, 23, 15, 17],
      backgroundColor: [
        '#FF6384',
        '#36A2EB',
        '#FFCE56',
        '#4BC0C0'
      ]
    }]
  };

  // 模擬資源使用數據
  const resourceData = {
    labels: Array.from({ length: 12 }, (_, i) => 
      format(subHours(new Date(), 11 - i), 'HH:mm')
    ),
    datasets: [
      {
        label: 'CPU 使用率 (%)',
        data: Array.from({ length: 12 }, () => Math.random() * 50 + 30),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1
      },
      {
        label: '記憶體使用率 (%)',
        data: Array.from({ length: 12 }, () => Math.random() * 40 + 40),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }
    ]
  };

  const getLogLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return 'error';
      case 'warn': return 'warning';
      case 'info': return 'info';
      case 'debug': return 'default';
      default: return 'default';
    }
  };

  const getLogLevelIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return <Error />;
      case 'warn': return <Warning />;
      case 'info': return <Info />;
      case 'debug': return <BugReport />;
      default: return <Info />;
    }
  };

  const logs = logsData?.logs || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          系統分析與監控
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>時間範圍</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              label="時間範圍"
            >
              <MenuItem value="24h">24小時</MenuItem>
              <MenuItem value="7d">7天</MenuItem>
              <MenuItem value="30d">30天</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="刷新數據">
            <IconButton>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<Download />}
            size="small"
          >
            匯出報告
          </Button>
        </Box>
      </Box>

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<Analytics />} label="性能監控" />
          <Tab icon={<Timeline />} label="系統日誌" />
          <Tab icon={<Memory />} label="資源使用" />
          <Tab icon={<Security />} label="安全分析" />
          <Tab icon={<Database />} label="資料庫監控" />
        </Tabs>

        <TabPanel value={currentTab} index={0}>
          {/* 性能監控 */}
          <Grid container spacing={3}>
            {/* 關鍵指標 */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        平均響應時間
                      </Typography>
                      <Typography variant="h4">
                        {metrics?.performance.responseTime || 0}ms
                      </Typography>
                    </Box>
                    <Speed color="primary" sx={{ fontSize: 40 }} />
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
                        吞吐量
                      </Typography>
                      <Typography variant="h4">
                        {metrics?.performance.throughput || 0}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        req/s
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
                        錯誤率
                      </Typography>
                      <Typography variant="h4">
                        {((metrics?.performance.errorRate || 0) * 100).toFixed(2)}%
                      </Typography>
                    </Box>
                    <Error color="error" sx={{ fontSize: 40 }} />
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
                        活躍連接
                      </Typography>
                      <Typography variant="h4">
                        {metrics?.performance.activeConnections || 0}
                      </Typography>
                    </Box>
                    <NetworkCheck color="info" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* 性能趨勢圖 */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardHeader title="性能趨勢" />
                <CardContent>
                  <Box sx={{ height: 300 }}>
                    <Line
                      data={performanceData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                          },
                          title: {
                            display: true,
                            text: '24小時性能趨勢',
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                          },
                        },
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* 錯誤分佈 */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardHeader title="錯誤分佈" />
                <CardContent>
                  <Box sx={{ height: 300 }}>
                    <Doughnut
                      data={errorData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                          },
                        },
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          {/* 系統日誌 */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardHeader
                  title="系統日誌"
                  action={
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>日誌級別</InputLabel>
                      <Select
                        value={logLevel}
                        onChange={(e) => setLogLevel(e.target.value)}
                        label="日誌級別"
                      >
                        <MenuItem value="">全部</MenuItem>
                        <MenuItem value="error">錯誤</MenuItem>
                        <MenuItem value="warn">警告</MenuItem>
                        <MenuItem value="info">資訊</MenuItem>
                        <MenuItem value="debug">調試</MenuItem>
                      </Select>
                    </FormControl>
                  }
                />
                <CardContent sx={{ p: 0 }}>
                  {isLoadingLogs ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <List>
                      {logs.map((log, index) => (
                        <React.Fragment key={index}>
                          <ListItem>
                            <ListItemIcon>
                              {getLogLevelIcon(log.level)}
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Chip
                                    label={log.level.toUpperCase()}
                                    size="small"
                                    color={getLogLevelColor(log.level)}
                                  />
                                  <Typography variant="body2">
                                    {log.message}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="caption">
                                    {format(new Date(log.timestamp), 'yyyy/MM/dd HH:mm:ss', { locale: zhTW })}
                                  </Typography>
                                  {log.metadata && (
                                    <Typography variant="caption" color="text.secondary">
                                      {Object.keys(log.metadata).length} 個附加屬性
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                          </ListItem>
                          {index < logs.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          {/* 資源使用 */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardHeader title="資源使用趨勢" />
                <CardContent>
                  <Box sx={{ height: 300 }}>
                    <Line
                      data={resourceData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                          },
                          title: {
                            display: true,
                            text: '系統資源使用趨勢',
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            max: 100,
                          },
                        },
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="資料庫連接池" />
                <CardContent>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <Database />
                      </ListItemIcon>
                      <ListItemText
                        primary="活躍連接數"
                        secondary={`${metrics?.database.connectionPool || 0} / 100`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Speed />
                      </ListItemIcon>
                      <ListItemText
                        primary="平均查詢時間"
                        secondary={`${metrics?.database.queryTime || 0}ms`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Warning />
                      </ListItemIcon>
                      <ListItemText
                        primary="慢查詢數量"
                        secondary={`${metrics?.database.slowQueries || 0} 個`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="快取狀態" />
                <CardContent>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle />
                      </ListItemIcon>
                      <ListItemText
                        primary="命中率"
                        secondary={`${((metrics?.cache.hitRate || 0) * 100).toFixed(2)}%`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Error />
                      </ListItemIcon>
                      <ListItemText
                        primary="錯失率"
                        secondary={`${((metrics?.cache.missRate || 0) * 100).toFixed(2)}%`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <TrendingDown />
                      </ListItemIcon>
                      <ListItemText
                        primary="驅逐率"
                        secondary={`${((metrics?.cache.evictionRate || 0) * 100).toFixed(2)}%`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          {/* 安全分析 */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info">
                安全分析功能正在開發中，將包含入侵檢測、異常活動監控等功能。
              </Alert>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={currentTab} index={4}>
          {/* 資料庫監控 */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info">
                資料庫監控功能正在開發中，將包含查詢性能、索引使用情況等功能。
              </Alert>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default SystemAnalytics;