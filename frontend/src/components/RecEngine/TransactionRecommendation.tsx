/**
 * Transaction Recommendation Component
 * Shows real-time card recommendations based on transaction analysis
 */

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Alert,
  Divider,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Close,
  TrendingUp,
  AccountBalance,
  Info,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { useTransactionTrigger } from '../../hooks/useRecEngine';
import { formatCurrency } from '../../utils/formatters';

interface TransactionRecommendationProps {
  transaction: {
    id: string;
    amount: number;
    category: string;
    merchant?: string;
    date: string;
    card_used?: string;
  };
  open: boolean;
  onClose: () => void;
  onApplyCard?: (cardId: string) => void;
}

export const TransactionRecommendation: React.FC<TransactionRecommendationProps> = ({
  transaction,
  open,
  onClose,
  onApplyCard,
}) => {
  const { triggerAnalysis, isAnalyzing, lastResult } = useTransactionTrigger();
  const [showDetails, setShowDetails] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  useEffect(() => {
    if (open && !hasAnalyzed) {
      triggerAnalysis(transaction);
      setHasAnalyzed(true);
    }
  }, [open, transaction, triggerAnalysis, hasAnalyzed]);

  const handleClose = () => {
    setHasAnalyzed(false);
    setShowDetails(false);
    onClose();
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, string> = {
      dining: '🍽️',
      travel: '✈️',
      groceries: '🛒',
      gas: '⛽',
      entertainment: '🎬',
      shopping: '🛍️',
      other: '💳',
    };
    return iconMap[category.toLowerCase()] || '💳';
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Transaction Analysis</Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Transaction Summary */}
        <Box
          sx={{
            p: 2,
            mb: 2,
            backgroundColor: 'grey.50',
            borderRadius: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={2} mb={1}>
            <Typography variant="h4">{getCategoryIcon(transaction.category)}</Typography>
            <Box flexGrow={1}>
              <Typography variant="body1" fontWeight="bold">
                {transaction.merchant || transaction.category}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(transaction.date).toLocaleDateString()} • {transaction.category}
              </Typography>
            </Box>
            <Typography variant="h6" fontWeight="bold">
              {formatCurrency(transaction.amount)}
            </Typography>
          </Box>
          {transaction.card_used && (
            <Chip
              label={`Paid with: ${transaction.card_used}`}
              size="small"
              variant="outlined"
              sx={{ mt: 1 }}
            />
          )}
        </Box>

        {/* Analysis Results */}
        {isAnalyzing && (
          <Box sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Analyzing transaction...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {!isAnalyzing && lastResult && (
          <>
            {lastResult.recommend_flag ? (
              <>
                {/* Recommendation Alert */}
                <Alert
                  severity="success"
                  icon={<TrendingUp />}
                  sx={{ mb: 2 }}
                >
                  <Typography variant="body1" fontWeight="bold" gutterBottom>
                    Better Card Available!
                  </Typography>
                  <Typography variant="body2">
                    You could earn {formatCurrency(lastResult.extra_reward)} more with the{' '}
                    <strong>{lastResult.suggested_card_id.replace(/_/g, ' ')}</strong>
                  </Typography>
                </Alert>

                {/* Confidence Score */}
                <Box sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">
                      Confidence Score
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {Math.round(lastResult.confidence_score * 100)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={lastResult.confidence_score * 100}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        background: `linear-gradient(90deg, #4caf50 0%, #8bc34a 100%)`,
                      },
                    }}
                  />
                </Box>

                {/* Reasoning */}
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: 'primary.50',
                    borderRadius: 2,
                    mb: 2,
                  }}
                >
                  <Typography variant="body2" color="primary.main">
                    <Info fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                    {lastResult.reasoning}
                  </Typography>
                </Box>

                {/* Expandable Details */}
                <Button
                  onClick={() => setShowDetails(!showDetails)}
                  endIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
                  sx={{ mb: 2 }}
                  fullWidth
                  variant="text"
                >
                  {showDetails ? 'Hide' : 'Show'} Calculation Details
                </Button>

                <Collapse in={showDetails}>
                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: 'grey.50',
                      borderRadius: 2,
                      mb: 2,
                    }}
                  >
                    <Typography variant="subtitle2" gutterBottom>
                      Reward Comparison
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Current Card Reward:</Typography>
                      <Typography variant="body2">
                        {formatCurrency(transaction.amount * 0.02)} (2%)
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Suggested Card Reward:</Typography>
                      <Typography variant="body2" color="success.main" fontWeight="bold">
                        {formatCurrency(transaction.amount * 0.02 + lastResult.extra_reward)}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" fontWeight="bold">
                        Additional Reward:
                      </Typography>
                      <Typography variant="body2" color="success.main" fontWeight="bold">
                        +{formatCurrency(lastResult.extra_reward)}
                      </Typography>
                    </Box>
                  </Box>
                </Collapse>
              </>
            ) : (
              <Alert severity="info" icon={<AccountBalance />}>
                <Typography variant="body1" fontWeight="bold" gutterBottom>
                  You're using the right card!
                </Typography>
                <Typography variant="body2">
                  {lastResult.reasoning || 'Your current card provides optimal rewards for this transaction.'}
                </Typography>
              </Alert>
            )}
          </>
        )}

        {!isAnalyzing && !lastResult && (
          <Alert severity="warning">
            Unable to analyze this transaction. Please try again later.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} variant="outlined">
          Close
        </Button>
        {lastResult?.recommend_flag && onApplyCard && (
          <Button
            onClick={() => onApplyCard(lastResult.suggested_card_id)}
            variant="contained"
            startIcon={<TrendingUp />}
          >
            Apply for This Card
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};