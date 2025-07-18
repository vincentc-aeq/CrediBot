import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Badge,
  Tab,
  Tabs,
  Paper,
  useTheme,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  CheckCircle as CheckCircleIcon,
  Circle as CircleIcon,
  TrendingUp,
  Warning,
  CreditCard,
  Notifications,
} from '@mui/icons-material';
import { useNotification, NotificationPreferences } from '../../context/NotificationContext';
import { TransactionNotificationData } from './TransactionNotification';

interface NotificationHistoryProps {
  open: boolean;
  onClose: () => void;
  onLearnMore: (notification: TransactionNotificationData) => void;
  onApplyCard: (cardId: string) => void;
}

const NotificationHistory: React.FC<NotificationHistoryProps> = ({
  open,
  onClose,
  onLearnMore,
  onApplyCard,
}) => {
  const {
    notifications,
    unreadCount,
    dismissNotification,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    updateNotificationPreferences,
  } = useNotification();
  
  const [currentTab, setCurrentTab] = useState(0);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    autoHide: true,
    autoHideDuration: 8000,
    enabledTypes: ['better_reward', 'missed_opportunity', 'category_optimization', 'spending_threshold'],
    minSeverity: 'low',
    position: 'top-right',
    maxVisible: 3,
  });

  const theme = useTheme();

  // 篩選通知
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // 按標籤頁篩選
    if (currentTab === 1) {
      filtered = filtered.filter(n => !n.isRead);
    } else if (currentTab === 2) {
      filtered = filtered.filter(n => n.isRead);
    }

    // 按類型篩選
    if (filterType !== 'all') {
      filtered = filtered.filter(n => n.type === filterType);
    }

    // 按嚴重程度篩選
    if (filterSeverity !== 'all') {
      filtered = filtered.filter(n => n.severity === filterSeverity);
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [notifications, currentTab, filterType, filterSeverity]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'better_reward': return <TrendingUp />;
      case 'missed_opportunity': return <Warning />;
      case 'category_optimization': return <CreditCard />;
      case 'spending_threshold': return <Notifications />;
      default: return <Notifications />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'better_reward': return '更好回饋';
      case 'missed_opportunity': return '錯失機會';
      case 'category_optimization': return '分類優化';
      case 'spending_threshold': return '消費門檻';
      default: return type;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleSavePreferences = () => {
    updateNotificationPreferences(preferences);
    setShowSettings(false);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleNotificationClick = (notification: TransactionNotificationData) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">通知中心</Typography>
          <Box>
            <IconButton onClick={() => setShowSettings(true)}>
              <SettingsIcon />
            </IconButton>
            <IconButton onClick={onClose}>
              <ClearIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* 標籤頁 */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label={`全部 (${notifications.length})`} />
            <Tab 
              label={
                <Badge badgeContent={unreadCount} color="error">
                  未讀
                </Badge>
              } 
            />
            <Tab label={`已讀 (${notifications.filter(n => n.isRead).length})`} />
          </Tabs>
        </Box>

        {/* 篩選器 */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>類型</InputLabel>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              label="類型"
            >
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="better_reward">更好回饋</MenuItem>
              <MenuItem value="missed_opportunity">錯失機會</MenuItem>
              <MenuItem value="category_optimization">分類優化</MenuItem>
              <MenuItem value="spending_threshold">消費門檻</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>嚴重程度</InputLabel>
            <Select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              label="嚴重程度"
            >
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="urgent">緊急</MenuItem>
              <MenuItem value="high">高</MenuItem>
              <MenuItem value="medium">中</MenuItem>
              <MenuItem value="low">低</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ flexGrow: 1 }} />

          <Button
            variant="outlined"
            size="small"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            全部標記為已讀
          </Button>
        </Box>

        {/* 通知列表 */}
        {filteredNotifications.length === 0 ? (
          <Alert severity="info">
            沒有符合條件的通知
          </Alert>
        ) : (
          <List>
            {filteredNotifications.map((notification) => (
              <Paper key={notification.id} sx={{ mb: 1 }}>
                <ListItem
                  sx={{
                    cursor: 'pointer',
                    opacity: notification.isRead ? 0.7 : 1,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                    {notification.isRead ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <CircleIcon color="primary" />
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                    {getTypeIcon(notification.type)}
                  </Box>

                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" component="span">
                          {notification.title}
                        </Typography>
                        <Chip
                          label={getTypeLabel(notification.type)}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={notification.severity}
                          size="small"
                          color={getSeverityColor(notification.severity)}
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {notification.transaction.merchant} • {formatCurrency(notification.transaction.amount)} • {formatDate(notification.timestamp)}
                        </Typography>
                      </Box>
                    }
                  />

                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLearnMore(notification);
                        }}
                      >
                        了解更多
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={(e) => {
                          e.stopPropagation();
                          onApplyCard(notification.recommendation.cardId);
                        }}
                      >
                        {notification.ctaText}
                      </Button>
                      <Tooltip title="刪除">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissNotification(notification.id);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              </Paper>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={clearAllNotifications} color="error">
          清除所有通知
        </Button>
        <Button onClick={onClose}>
          關閉
        </Button>
      </DialogActions>

      {/* 設定對話框 */}
      <Dialog open={showSettings} onClose={() => setShowSettings(false)} maxWidth="sm" fullWidth>
        <DialogTitle>通知設定</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.enabled}
                  onChange={(e) => setPreferences(prev => ({ ...prev, enabled: e.target.checked }))}
                />
              }
              label="啟用通知"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={preferences.autoHide}
                  onChange={(e) => setPreferences(prev => ({ ...prev, autoHide: e.target.checked }))}
                />
              }
              label="自動隱藏通知"
            />

            {preferences.autoHide && (
              <TextField
                fullWidth
                label="自動隱藏時間（毫秒）"
                type="number"
                value={preferences.autoHideDuration}
                onChange={(e) => setPreferences(prev => ({ ...prev, autoHideDuration: Number(e.target.value) }))}
                sx={{ mt: 2 }}
              />
            )}

            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>最低嚴重程度</InputLabel>
              <Select
                value={preferences.minSeverity}
                onChange={(e) => setPreferences(prev => ({ ...prev, minSeverity: e.target.value as any }))}
                label="最低嚴重程度"
              >
                <MenuItem value="low">低</MenuItem>
                <MenuItem value="medium">中</MenuItem>
                <MenuItem value="high">高</MenuItem>
                <MenuItem value="urgent">緊急</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>顯示位置</InputLabel>
              <Select
                value={preferences.position}
                onChange={(e) => setPreferences(prev => ({ ...prev, position: e.target.value as any }))}
                label="顯示位置"
              >
                <MenuItem value="top-right">右上</MenuItem>
                <MenuItem value="top-left">左上</MenuItem>
                <MenuItem value="bottom-right">右下</MenuItem>
                <MenuItem value="bottom-left">左下</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="最大顯示數量"
              type="number"
              value={preferences.maxVisible}
              onChange={(e) => setPreferences(prev => ({ ...prev, maxVisible: Number(e.target.value) }))}
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>取消</Button>
          <Button onClick={handleSavePreferences} variant="contained">
            儲存
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default NotificationHistory;