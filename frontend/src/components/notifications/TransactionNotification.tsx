import React, { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Typography,
  IconButton,
  Collapse,
  Divider,
  useTheme,
  Slide,
  SlideProps,
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  TrendingUp,
  CreditCard,
  Notifications,
  CheckCircle,
  Warning,
  Error,
  Info,
} from '@mui/icons-material';

export interface TransactionNotificationData {
  id: string;
  type: 'better_reward' | 'missed_opportunity' | 'category_optimization' | 'spending_threshold';
  severity: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  details?: string;
  transaction: {
    id: string;
    amount: number;
    merchant: string;
    category: string;
    date: string;
  };
  recommendation: {
    cardId: string;
    cardName: string;
    currentRewardRate: number;
    potentialRewardRate: number;
    missedReward: number;
    estimatedBenefit: number;
  };
  ctaText: string;
  timestamp: Date;
  isRead: boolean;
  isDismissed: boolean;
}

interface TransactionNotificationProps {
  notification: TransactionNotificationData;
  onDismiss: (id: string) => void;
  onMarkAsRead: (id: string) => void;
  onLearnMore: (notification: TransactionNotificationData) => void;
  onApplyCard: (cardId: string) => void;
  autoHideDuration?: number;
  position?: 'top' | 'bottom';
  showDetails?: boolean;
}

const TransactionNotification: React.FC<TransactionNotificationProps> = ({
  notification,
  onDismiss,
  onMarkAsRead,
  onLearnMore,
  onApplyCard,
  autoHideDuration = 8000,
  position = 'top',
  showDetails = false,
}) => {
  const [expanded, setExpanded] = useState(showDetails);
  const [visible, setVisible] = useState(true);
  const theme = useTheme();

  // 自動隱藏邏輯
  React.useEffect(() => {
    if (autoHideDuration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [autoHideDuration]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss(notification.id), 300);
  };

  const handleMarkAsRead = () => {
    onMarkAsRead(notification.id);
  };

  const handleLearnMore = () => {
    handleMarkAsRead();
    onLearnMore(notification);
  };

  const handleApplyCard = () => {
    handleMarkAsRead();
    onApplyCard(notification.recommendation.cardId);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'info';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'urgent': return <Error />;
      case 'high': return <Warning />;
      case 'medium': return <Info />;
      case 'low': return <CheckCircle />;
      default: return <Info />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'better_reward': return <TrendingUp />;
      case 'missed_opportunity': return <Warning />;
      case 'category_optimization': return <CreditCard />;
      case 'spending_threshold': return <Notifications />;
      default: return <Info />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const SlideTransition = (props: SlideProps) => {
    return <Slide {...props} direction={position === 'top' ? 'down' : 'up'} />;
  };

  return (
    <SlideTransition in={visible} timeout={300}>
      <Card
        sx={{
          maxWidth: 400,
          mb: 1,
          border: `2px solid ${theme.palette[getSeverityColor(notification.severity) as keyof typeof theme.palette].main}`,
          borderRadius: 2,
          boxShadow: theme.shadows[4],
          opacity: notification.isRead ? 0.8 : 1,
        }}
      >
        <CardContent sx={{ pb: 1 }}>
          {/* 標題和關閉按鈕 */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
              {getTypeIcon(notification.type)}
              <Typography variant="subtitle1" sx={{ ml: 1, fontWeight: 'medium' }}>
                {notification.title}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Chip
                icon={getSeverityIcon(notification.severity)}
                label={notification.severity}
                color={getSeverityColor(notification.severity)}
                size="small"
                sx={{ mr: 1 }}
              />
              <IconButton size="small" onClick={handleDismiss}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* 主要訊息 */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {notification.message}
          </Typography>

          {/* 交易資訊 */}
          <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              交易詳情
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  {notification.transaction.merchant}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {notification.transaction.category} • {formatDate(notification.transaction.date)}
                </Typography>
              </Box>
              <Typography variant="h6" color="primary">
                {formatCurrency(notification.transaction.amount)}
              </Typography>
            </Box>
          </Box>

          {/* 推薦摘要 */}
          <Box sx={{ bgcolor: 'success.light', p: 2, borderRadius: 1, mb: 2 }}>
            <Typography variant="caption" color="success.dark">
              推薦優勢
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" fontWeight="medium">
                {notification.recommendation.cardName}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="caption">
                  回饋率：{notification.recommendation.currentRewardRate}% → {notification.recommendation.potentialRewardRate}%
                </Typography>
                <Typography variant="caption" color="success.dark" fontWeight="medium">
                  可節省：{formatCurrency(notification.recommendation.missedReward)}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* 展開詳細資訊 */}
          {notification.details && (
            <Box>
              <Button
                size="small"
                onClick={() => setExpanded(!expanded)}
                startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ p: 0, minWidth: 'auto' }}
              >
                {expanded ? '收起' : '查看詳情'}
              </Button>
              <Collapse in={expanded} timeout="auto" unmountOnExit>
                <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {notification.details}
                  </Typography>
                </Box>
              </Collapse>
            </Box>
          )}
        </CardContent>

        <Divider />

        <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={handleLearnMore}
            >
              了解更多
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleApplyCard}
            >
              {notification.ctaText}
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {formatDate(notification.timestamp.toISOString())}
          </Typography>
        </CardActions>
      </Card>
    </SlideTransition>
  );
};

export default TransactionNotification;