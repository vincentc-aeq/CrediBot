import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Rating,
  Card,
  CardContent,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Star,
  TrendingUp,
  LocalOffer,
  CreditCard,
  AccountBalance,
  AttachMoney,
  FlightTakeoff,
  Restaurant,
  LocalGasStation,
  Warning,
} from '@mui/icons-material';
import { RecommendationItem } from '../../api/recommendationApi';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';

interface CardDetailsModalProps {
  open: boolean;
  onClose: () => void;
  recommendation: RecommendationItem | null;
  onApplyCard?: (cardId: string) => void;
}

interface CreditCardDetails {
  id: string;
  name: string;
  issuer: string;
  cardType: string;
  annualFee: number;
  interestRate: number;
  creditLimit: number;
  rewardCategories: {
    category: string;
    rate: number;
    description: string;
  }[];
  benefits: string[];
  requirements: {
    minCreditScore: number;
    minIncome: number;
    description: string;
  };
  terms: string[];
  promotions: {
    title: string;
    description: string;
    expiryDate: string;
  }[];
}

const CardDetailsModal: React.FC<CardDetailsModalProps> = ({
  open,
  onClose,
  recommendation,
  onApplyCard,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'benefits' | 'requirements'>('overview');

  // Get card details
  const {
    data: cardDetails,
    isLoading,
    error,
  } = useQuery<CreditCardDetails>({
    queryKey: ['card-details', recommendation?.cardId],
    queryFn: async () => {
      const response = await apiClient.get(`/cards/${recommendation?.cardId}`);
      return response.data.data;
    },
    enabled: !!recommendation?.cardId && open,
  });

  const handleApplyCard = () => {
    if (recommendation && onApplyCard) {
      onApplyCard(recommendation.cardId);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'dining':
      case 'restaurant':
        return <Restaurant />;
      case 'travel':
      case 'flight':
        return <FlightTakeoff />;
      case 'gas':
      case 'gasoline':
        return <LocalGasStation />;
      case 'cashback':
        return <AttachMoney />;
      default:
        return <LocalOffer />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  if (!recommendation) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div">
            {recommendation.cardName}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">
            Unable to load card details. Please try again later.
          </Alert>
        ) : (
          <Box>
            {/* Recommendation summary */}
            <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Star sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    {recommendation.messageTitle}
                  </Typography>
                  <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                    <Rating value={recommendation.score} readOnly precision={0.1} />
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      {(recommendation.score * 10).toFixed(1)}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {recommendation.messageDescription}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <TrendingUp sx={{ mr: 1 }} />
                      <Typography variant="body2">
                        Estimated Annual Benefit: {formatCurrency(recommendation.estimatedBenefit)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2">
                        Confidence: {(recommendation.confidence * 100).toFixed(0)}%
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2 }}>
                  <Chip
                    label={recommendation.priority}
                    color={getPriorityColor(recommendation.priority)}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  {recommendation.tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      variant="outlined"
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* Tab switcher */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Box sx={{ display: 'flex' }}>
                {['overview', 'benefits', 'requirements'].map((tab) => (
                  <Button
                    key={tab}
                    variant={activeTab === tab ? 'contained' : 'text'}
                    onClick={() => setActiveTab(tab as any)}
                    sx={{ mr: 1, mb: 1 }}
                  >
                    {tab === 'overview' ? 'Overview' : tab === 'benefits' ? 'Benefits' : 'Requirements'}
                  </Button>
                ))}
              </Box>
            </Box>

            {/* Content section */}
            {activeTab === 'overview' && cardDetails && (
              <Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      <CreditCard sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Basic Information
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="Issuing Bank"
                          secondary={cardDetails.issuer}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Card Type"
                          secondary={cardDetails.cardType}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Annual Fee"
                          secondary={cardDetails.annualFee === 0 ? 'No annual fee' : formatCurrency(cardDetails.annualFee)}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Interest Rate"
                          secondary={`${cardDetails.interestRate}%`}
                        />
                      </ListItem>
                    </List>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      <LocalOffer sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Reward Categories
                    </Typography>
                    <List dense>
                      {cardDetails.rewardCategories.map((category, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            {getCategoryIcon(category.category)}
                          </ListItemIcon>
                          <ListItemText
                            primary={category.description}
                            secondary={`${category.rate}% rewards`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                </Grid>
              </Box>
            )}

            {activeTab === 'benefits' && cardDetails && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Card Benefits
                </Typography>
                <List>
                  {cardDetails.benefits.map((benefit, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Star color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={benefit} />
                    </ListItem>
                  ))}
                </List>

                {cardDetails.promotions && cardDetails.promotions.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Limited Time Offers
                    </Typography>
                    {cardDetails.promotions.map((promotion, index) => (
                      <Card key={index} sx={{ mb: 2 }}>
                        <CardContent>
                          <Typography variant="subtitle1" color="primary">
                            {promotion.title}
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {promotion.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Expires: {promotion.expiryDate}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </Box>
            )}

            {activeTab === 'requirements' && cardDetails && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  <Warning sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Application Requirements
                </Typography>
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          Minimum Credit Score
                        </Typography>
                        <Typography variant="h6">
                          {cardDetails.requirements.minCreditScore}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          Minimum Annual Income
                        </Typography>
                        <Typography variant="h6">
                          {formatCurrency(cardDetails.requirements.minIncome)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2">
                          {cardDetails.requirements.description}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                <Typography variant="h6" gutterBottom>
                  Terms and Conditions
                </Typography>
                <List>
                  {cardDetails.terms.map((term, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={term}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Close
        </Button>
        <Button
          variant="contained"
          onClick={handleApplyCard}
          disabled={isLoading}
        >
          {recommendation.ctaText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CardDetailsModal;