import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Avatar,
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  TrendingUp,
  CreditCard,
  SwapHoriz,
  Cancel,
  CheckCircle,
  Info,
  Close,
  Launch,
  Star,
  Warning,
  Lightbulb,
} from '@mui/icons-material';

interface OptimizationOpportunity {
  id: string;
  type: 'card_switch' | 'new_card' | 'category_optimization' | 'fee_optimization' | 'portfolio_rebalance';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  potentialSavings: number;
  effort: 'easy' | 'medium' | 'hard';
  timeframe: 'immediate' | 'short_term' | 'long_term';
  confidence: number;
  currentCard?: string;
  recommendedCard?: string;
  category?: string;
  details: {
    currentSituation: string;
    proposedAction: string;
    expectedOutcome: string;
    requirements: string[];
    considerations: string[];
  };
}

interface OptimizationRecommendationsProps {
  opportunities: OptimizationOpportunity[];
  onAcceptRecommendation: (id: string) => void;
  onDismissRecommendation: (id: string) => void;
  onLearnMore: (id: string) => void;
}

export const OptimizationRecommendations: React.FC<OptimizationRecommendationsProps> = ({
  opportunities,
  onAcceptRecommendation,
  onDismissRecommendation,
  onLearnMore,
}) => {
  const theme = useTheme();
  const [selectedOpportunity, setSelectedOpportunity] = React.useState<OptimizationOpportunity | null>(null);
  const [filter, setFilter] = React.useState<'all' | 'high' | 'medium' | 'low'>('all');

  const filteredOpportunities = opportunities.filter(opp => 
    filter === 'all' || opp.priority === filter
  );

  const sortedOpportunities = [...filteredOpportunities].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority] || b.potentialSavings - a.potentialSavings;
  });

  const getTypeIcon = (type: OptimizationOpportunity['type']) => {
    switch (type) {
      case 'card_switch':
        return <SwapHoriz />;
      case 'new_card':
        return <CreditCard />;
      case 'category_optimization':
        return <TrendingUp />;
      case 'fee_optimization':
        return <Cancel />;
      case 'portfolio_rebalance':
        return <Star />;
      default:
        return <Lightbulb />;
    }
  };

  const getTypeColor = (type: OptimizationOpportunity['type']) => {
    switch (type) {
      case 'card_switch':
        return theme.palette.info.main;
      case 'new_card':
        return theme.palette.success.main;
      case 'category_optimization':
        return theme.palette.primary.main;
      case 'fee_optimization':
        return theme.palette.error.main;
      case 'portfolio_rebalance':
        return theme.palette.warning.main;
      default:
        return theme.palette.secondary.main;
    }
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return theme.palette.error.main;
      case 'medium':
        return theme.palette.warning.main;
      case 'low':
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getEffortColor = (effort: 'easy' | 'medium' | 'hard') => {
    switch (effort) {
      case 'easy':
        return theme.palette.success.main;
      case 'medium':
        return theme.palette.warning.main;
      case 'hard':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalPotentialSavings = opportunities.reduce((sum, opp) => sum + opp.potentialSavings, 0);

  const handleCloseDialog = () => {
    setSelectedOpportunity(null);
  };

  const handleAccept = (id: string) => {
    onAcceptRecommendation(id);
    setSelectedOpportunity(null);
  };

  const handleDismiss = (id: string) => {
    onDismissRecommendation(id);
    setSelectedOpportunity(null);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2">
            優化建議
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant={filter === 'all' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setFilter('all')}
            >
              全部
            </Button>
            <Button
              variant={filter === 'high' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setFilter('high')}
              color="error"
            >
              高優先級
            </Button>
            <Button
              variant={filter === 'medium' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setFilter('medium')}
              color="warning"
            >
              中優先級
            </Button>
            <Button
              variant={filter === 'low' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setFilter('low')}
              color="success"
            >
              低優先級
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  總潛在節省
                </Typography>
                <Typography variant="h4" color="success.main">
                  {formatCurrency(totalPotentialSavings)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  每年可節省的金額
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  優化機會
                </Typography>
                <Typography variant="h4" color="primary">
                  {opportunities.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  個可執行的建議
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  高優先級
                </Typography>
                <Typography variant="h4" color="error">
                  {opportunities.filter(opp => opp.priority === 'high').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  個緊急建議
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {sortedOpportunities.length === 0 ? (
          <Alert severity="info">
            <AlertTitle>沒有找到優化機會</AlertTitle>
            您的信用卡使用已經很優化了！繼續保持良好的使用習慣。
          </Alert>
        ) : (
          <List>
            {sortedOpportunities.map((opportunity) => (
              <ListItem key={opportunity.id} divider>
                <ListItemIcon>
                  <Avatar sx={{ bgcolor: getTypeColor(opportunity.type) }}>
                    {getTypeIcon(opportunity.type)}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6">{opportunity.title}</Typography>
                      <Chip
                        label={opportunity.priority}
                        size="small"
                        sx={{ bgcolor: getPriorityColor(opportunity.priority), color: 'white' }}
                      />
                      <Chip
                        label={opportunity.effort}
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: getEffortColor(opportunity.effort) }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {opportunity.description}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                        <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
                          可節省：{formatCurrency(opportunity.potentialSavings)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          信心度：{opportunity.confidence}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          時間框架：{opportunity.timeframe}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={opportunity.confidence}
                        sx={{ mt: 1, height: 4 }}
                        color={opportunity.confidence >= 80 ? 'success' : opportunity.confidence >= 60 ? 'warning' : 'error'}
                      />
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="查看詳情">
                      <IconButton
                        onClick={() => setSelectedOpportunity(opportunity)}
                        size="small"
                      >
                        <Info />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="接受建議">
                      <IconButton
                        onClick={() => handleAccept(opportunity.id)}
                        size="small"
                        color="success"
                      >
                        <CheckCircle />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="忽略建議">
                      <IconButton
                        onClick={() => handleDismiss(opportunity.id)}
                        size="small"
                        color="error"
                      >
                        <Close />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}

        <Dialog
          open={!!selectedOpportunity}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          {selectedOpportunity && (
            <>
              <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ bgcolor: getTypeColor(selectedOpportunity.type) }}>
                    {getTypeIcon(selectedOpportunity.type)}
                  </Avatar>
                  {selectedOpportunity.title}
                </Box>
              </DialogTitle>
              <DialogContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      目前狀況
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {selectedOpportunity.details.currentSituation}
                    </Typography>

                    <Typography variant="h6" gutterBottom>
                      建議行動
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {selectedOpportunity.details.proposedAction}
                    </Typography>

                    <Typography variant="h6" gutterBottom>
                      預期結果
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {selectedOpportunity.details.expectedOutcome}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      執行要求
                    </Typography>
                    <List dense>
                      {selectedOpportunity.details.requirements.map((req, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <CheckCircle color="success" />
                          </ListItemIcon>
                          <ListItemText primary={req} />
                        </ListItem>
                      ))}
                    </List>

                    <Typography variant="h6" gutterBottom>
                      注意事項
                    </Typography>
                    <List dense>
                      {selectedOpportunity.details.considerations.map((consideration, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <Warning color="warning" />
                          </ListItemIcon>
                          <ListItemText primary={consideration} />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, p: 2, bgcolor: theme.palette.grey[50], borderRadius: 1 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        潛在節省
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        {formatCurrency(selectedOpportunity.potentialSavings)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        執行難度
                      </Typography>
                      <Typography variant="h6" sx={{ color: getEffortColor(selectedOpportunity.effort) }}>
                        {selectedOpportunity.effort}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        時間框架
                      </Typography>
                      <Typography variant="h6">
                        {selectedOpportunity.timeframe}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        信心度
                      </Typography>
                      <Typography variant="h6">
                        {selectedOpportunity.confidence}%
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseDialog}>
                  關閉
                </Button>
                <Button onClick={() => handleDismiss(selectedOpportunity.id)} color="error">
                  忽略
                </Button>
                <Button
                  onClick={() => handleAccept(selectedOpportunity.id)}
                  variant="contained"
                  color="success"
                >
                  接受建議
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default OptimizationRecommendations;