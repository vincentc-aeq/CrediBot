import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  LinearProgress,
  IconButton,
  Tooltip,
  useTheme,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  ListItemText,
  OutlinedInput,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Info,
  CompareArrows,
  Star,
  Remove,
  Add,
} from '@mui/icons-material';

interface CardComparisonData {
  cardId: string;
  cardName: string;
  issuer: string;
  image: string;
  metrics: {
    totalSpent: number;
    totalRewards: number;
    rewardRate: number;
    annualFee: number;
    effectiveRate: number;
    monthlyAvgSpent: number;
    categoryBreakdown: Array<{
      category: string;
      amount: number;
      rewardRate: number;
    }>;
  };
  performance: {
    rank: number;
    score: number;
    trend: 'up' | 'down' | 'stable';
    missedOpportunities: number;
    optimization: string;
  };
  features: {
    cashback: boolean;
    points: boolean;
    miles: boolean;
    noForeignFee: boolean;
    insurance: boolean;
    concierge: boolean;
  };
}

interface CardComparisonInterfaceProps {
  availableCards: CardComparisonData[];
  selectedCards: string[];
  onCardSelection: (cardIds: string[]) => void;
  timeframe: 'month' | 'quarter' | 'year';
}

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

export const CardComparisonInterface: React.FC<CardComparisonInterfaceProps> = ({
  availableCards,
  selectedCards,
  onCardSelection,
  timeframe,
}) => {
  const theme = useTheme();
  const [comparisonView, setComparisonView] = React.useState<'table' | 'cards'>('cards');

  const selectedCardData = availableCards.filter(card => selectedCards.includes(card.cardId));

  const handleCardSelectionChange = (event: any) => {
    const value = event.target.value;
    onCardSelection(typeof value === 'string' ? value.split(',') : value);
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return theme.palette.success.main;
    if (score >= 60) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp sx={{ color: theme.palette.success.main }} />;
      case 'down':
        return <TrendingDown sx={{ color: theme.palette.error.main }} />;
      case 'stable':
        return <CompareArrows sx={{ color: theme.palette.warning.main }} />;
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

  const getFeatureIcon = (feature: string, enabled: boolean) => {
    const iconColor = enabled ? theme.palette.success.main : theme.palette.grey[400];
    return <Star sx={{ color: iconColor, fontSize: 16 }} />;
  };

  const renderCardView = () => (
    <Grid container spacing={3}>
      {selectedCardData.map((card) => (
        <Grid item xs={12} md={6} lg={4} key={card.cardId}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar src={card.image} sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{card.cardName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {card.issuer}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => onCardSelection(selectedCards.filter(id => id !== card.cardId))}
                  sx={{ ml: 'auto' }}
                >
                  <Remove />
                </IconButton>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  效能分數
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LinearProgress
                    variant="determinate"
                    value={card.performance.score}
                    sx={{ flexGrow: 1, mr: 1 }}
                    color={card.performance.score >= 80 ? 'success' : card.performance.score >= 60 ? 'warning' : 'error'}
                  />
                  <Typography variant="body2">{card.performance.score}%</Typography>
                  {getTrendIcon(card.performance.trend)}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  排名：#{card.performance.rank}
                </Typography>
              </Box>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    總消費
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(card.metrics.totalSpent)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    總回饋
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {formatCurrency(card.metrics.totalRewards)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    回饋率
                  </Typography>
                  <Typography variant="h6">
                    {card.metrics.rewardRate.toFixed(2)}%
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    有效回饋率
                  </Typography>
                  <Typography variant="h6">
                    {card.metrics.effectiveRate.toFixed(2)}%
                  </Typography>
                </Grid>
              </Grid>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  主要特色
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {Object.entries(card.features).map(([feature, enabled]) => (
                    <Chip
                      key={feature}
                      label={feature}
                      size="small"
                      color={enabled ? 'primary' : 'default'}
                      variant={enabled ? 'filled' : 'outlined'}
                    />
                  ))}
                </Box>
              </Box>

              {card.performance.missedOpportunities > 0 && (
                <Box sx={{ p: 1, backgroundColor: theme.palette.warning.light, borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    錯失機會：{formatCurrency(card.performance.missedOpportunities)}
                  </Typography>
                </Box>
              )}

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  優化建議
                </Typography>
                <Typography variant="body2">
                  {card.performance.optimization}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderTableView = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>卡片</TableCell>
            <TableCell align="right">總消費</TableCell>
            <TableCell align="right">總回饋</TableCell>
            <TableCell align="right">回饋率</TableCell>
            <TableCell align="right">年費</TableCell>
            <TableCell align="right">有效回饋率</TableCell>
            <TableCell align="right">效能分數</TableCell>
            <TableCell align="center">趨勢</TableCell>
            <TableCell align="center">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {selectedCardData.map((card) => (
            <TableRow key={card.cardId}>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar src={card.image} sx={{ mr: 2, width: 32, height: 32 }} />
                  <Box>
                    <Typography variant="body2">{card.cardName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {card.issuer}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell align="right">
                {formatCurrency(card.metrics.totalSpent)}
              </TableCell>
              <TableCell align="right">
                <Typography color="success.main">
                  {formatCurrency(card.metrics.totalRewards)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                {card.metrics.rewardRate.toFixed(2)}%
              </TableCell>
              <TableCell align="right">
                {formatCurrency(card.metrics.annualFee)}
              </TableCell>
              <TableCell align="right">
                {card.metrics.effectiveRate.toFixed(2)}%
              </TableCell>
              <TableCell align="right">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LinearProgress
                    variant="determinate"
                    value={card.performance.score}
                    sx={{ width: 60, mr: 1 }}
                    color={card.performance.score >= 80 ? 'success' : card.performance.score >= 60 ? 'warning' : 'error'}
                  />
                  <Typography variant="body2">{card.performance.score}%</Typography>
                </Box>
              </TableCell>
              <TableCell align="center">
                {getTrendIcon(card.performance.trend)}
              </TableCell>
              <TableCell align="center">
                <IconButton
                  size="small"
                  onClick={() => onCardSelection(selectedCards.filter(id => id !== card.cardId))}
                >
                  <Remove />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2">
            卡片比較分析
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>選擇卡片</InputLabel>
              <Select
                multiple
                value={selectedCards}
                onChange={handleCardSelectionChange}
                input={<OutlinedInput label="選擇卡片" />}
                renderValue={(selected) => `已選擇 ${selected.length} 張卡片`}
                MenuProps={MenuProps}
              >
                {availableCards.map((card) => (
                  <MenuItem key={card.cardId} value={card.cardId}>
                    <Checkbox checked={selectedCards.indexOf(card.cardId) > -1} />
                    <ListItemText primary={card.cardName} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              onClick={() => setComparisonView(comparisonView === 'cards' ? 'table' : 'cards')}
            >
              {comparisonView === 'cards' ? '表格檢視' : '卡片檢視'}
            </Button>
          </Box>
        </Box>

        {selectedCardData.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              請選擇至少一張卡片進行比較
            </Typography>
          </Box>
        ) : (
          <>
            {comparisonView === 'cards' ? renderCardView() : renderTableView()}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CardComparisonInterface;