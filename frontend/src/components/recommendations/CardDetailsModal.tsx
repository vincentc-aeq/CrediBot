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
      return response.data.data.card;
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
            <Typography variant="h6" gutterBottom>
              Failed to Load Card Details
            </Typography>
            <Typography variant="body2">
              We're unable to load the details for this credit card right now. This could be due to a temporary issue with our servers.
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Card ID: {recommendation?.cardId}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Error: {error?.message || 'Unknown error occurred'}
            </Typography>
          </Alert>
        ) : (
          <Box>
            {/* Hero section with card image and key info */}
            <Card sx={{ 
              mb: 3, 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CreditCard sx={{ mr: 2, fontSize: 40 }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                      {recommendation.cardName}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Rating value={recommendation.score * 5} readOnly precision={0.1} max={5}
                        sx={{ 
                          '& .MuiRating-iconFilled': { color: '#FFD700' },
                          '& .MuiRating-iconEmpty': { color: 'rgba(255, 255, 255, 0.3)' }
                        }} />
                      <Typography variant="body1" fontWeight="medium">
                        {(recommendation.score * 10).toFixed(1)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
                <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
                  {recommendation.messageDescription}
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ 
                      bgcolor: 'rgba(255,255,255,0.15)', 
                      p: 2, 
                      borderRadius: 2,
                      backdropFilter: 'blur(10px)'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <TrendingUp sx={{ mr: 1 }} />
                        <Typography variant="subtitle2" fontWeight="bold">
                          Annual Benefit
                        </Typography>
                      </Box>
                      <Typography variant="h6" fontWeight="bold">
                        {formatCurrency(recommendation.estimatedBenefit)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ 
                      bgcolor: 'rgba(255,255,255,0.15)', 
                      p: 2, 
                      borderRadius: 2,
                      backdropFilter: 'blur(10px)'
                    }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        Match Confidence
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {(recommendation.confidence * 100).toFixed(0)}%
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Chip
                    label={recommendation.priority.toUpperCase()}
                    color={getPriorityColor(recommendation.priority)}
                    size="small"
                    sx={{ fontWeight: 'bold' }}
                  />
                  {recommendation.tags && recommendation.tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      variant="outlined"
                      size="small"
                      sx={{ 
                        borderColor: 'rgba(255,255,255,0.5)',
                        color: 'white',
                        '&:hover': { borderColor: 'white' }
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
              
              {/* Decorative background elements */}
              <Box sx={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 150,
                height: 150,
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.1)',
                zIndex: 0
              }} />
              <Box sx={{
                position: 'absolute',
                bottom: -30,
                left: -30,
                width: 100,
                height: 100,
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.05)',
                zIndex: 0
              }} />
            </Card>

            {/* Enhanced Tab switcher */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ 
                display: 'flex',
                bgcolor: 'grey.100',
                borderRadius: 2,
                p: 0.5,
                gap: 0.5
              }}>
                {[
                  { key: 'overview', label: 'Overview', icon: <AccountBalance sx={{ fontSize: 18 }} /> },
                  { key: 'benefits', label: 'Benefits', icon: <Star sx={{ fontSize: 18 }} /> },
                  { key: 'requirements', label: 'Requirements', icon: <Warning sx={{ fontSize: 18 }} /> }
                ].map((tab) => (
                  <Button
                    key={tab.key}
                    variant={activeTab === tab.key ? 'contained' : 'text'}
                    onClick={() => setActiveTab(tab.key as any)}
                    startIcon={tab.icon}
                    sx={{ 
                      flex: 1,
                      py: 1.5,
                      borderRadius: 1.5,
                      fontWeight: activeTab === tab.key ? 'bold' : 'medium',
                      bgcolor: activeTab === tab.key ? 'primary.main' : 'transparent',
                      color: activeTab === tab.key ? 'white' : 'text.primary',
                      '& .MuiButton-startIcon': {
                        marginRight: 1,
                        marginLeft: 0
                      },
                      '&:hover': {
                        bgcolor: activeTab === tab.key ? 'primary.dark' : 'grey.200'
                      }
                    }}
                  >
                    {tab.label}
                  </Button>
                ))}
              </Box>
            </Box>

            {/* Content section */}
            {activeTab === 'overview' && cardDetails && (
              <Box>
                <Grid container spacing={3}>
                  {/* Basic Information */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
                      <AccountBalance sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
                      Basic Information
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {[
                        { label: 'Issuing Bank', value: cardDetails.issuer },
                        { label: 'Card Type', value: cardDetails.cardType?.charAt(0).toUpperCase() + cardDetails.cardType?.slice(1) },
                        { label: 'Annual Fee', value: cardDetails.annualFee === 0 ? 'No annual fee' : formatCurrency(cardDetails.annualFee) },
                        { label: 'Interest Rate', value: `${cardDetails.interestRate}%` }
                      ].map((item, index) => (
                        <Box key={index} sx={{
                          p: 2,
                          bgcolor: 'grey.50',
                          borderRadius: 1,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          '&:hover': { bgcolor: 'grey.100' }
                        }}>
                          <Typography variant="body2" color="text.secondary">
                            {item.label}
                          </Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {item.value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Grid>
                  
                  {/* Reward Categories */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: 'success.main', mb: 2 }}>
                      <LocalOffer sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
                      Reward Categories
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {cardDetails.rewardCategories && cardDetails.rewardCategories.map((category, index) => (
                        <Box key={index} sx={{
                          p: 2,
                          bgcolor: 'success.50',
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          '&:hover': { bgcolor: 'success.100' }
                        }}>
                          <Box sx={{ mr: 2, color: 'success.main' }}>
                            {getCategoryIcon(category.category)}
                          </Box>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              {category.description}
                            </Typography>
                            <Typography variant="body1" color="success.main" fontWeight="bold">
                              {category.rate}% rewards
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}

            {activeTab === 'benefits' && cardDetails && (
              <Box>
                {/* Card Benefits */}
                <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: 'warning.main', mb: 2 }}>
                  <Star sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
                  Card Benefits
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
                  {cardDetails.benefits && cardDetails.benefits.map((benefit, index) => (
                    <Box key={index} sx={{
                      p: 2.5,
                      bgcolor: 'warning.50',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'flex-start',
                      '&:hover': { bgcolor: 'warning.100' }
                    }}>
                      <Box sx={{ 
                        width: 6,
                        height: 6,
                        bgcolor: 'warning.main',
                        borderRadius: '50%',
                        mr: 2,
                        mt: 1,
                        flexShrink: 0
                      }} />
                      <Typography variant="body1" sx={{ flexGrow: 1, lineHeight: 1.6 }}>
                        {benefit}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* Limited Time Offers */}
                {cardDetails.promotions && cardDetails.promotions.length > 0 && (
                  <Box>
                    <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: 'error.main', mb: 2 }}>
                      <LocalOffer sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
                      Limited Time Offers
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {cardDetails.promotions && cardDetails.promotions.map((promotion, index) => (
                        <Box key={index} sx={{
                          p: 3,
                          bgcolor: 'error.50',
                          borderRadius: 1,
                          '&:hover': { bgcolor: 'error.100' }
                        }}>
                          <Typography variant="subtitle1" color="error.main" fontWeight="bold" gutterBottom>
                            {promotion.title}
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }}>
                            {promotion.description}
                          </Typography>
                          <Box sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            bgcolor: 'error.main',
                            color: 'white',
                            px: 2,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.875rem',
                            fontWeight: 'medium'
                          }}>
                            Expires: {promotion.expiryDate}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}

            {activeTab === 'requirements' && cardDetails && (
              <Box>
                {/* Application Requirements */}
                <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: 'info.main', mb: 2 }}>
                  <Warning sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
                  Application Requirements
                </Typography>
                
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{
                      p: 3,
                      bgcolor: 'info.50',
                      borderRadius: 1,
                      textAlign: 'center',
                      '&:hover': { bgcolor: 'info.100' }
                    }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Minimum Credit Score
                      </Typography>
                      <Typography variant="h4" fontWeight="bold" color="info.main">
                        {cardDetails.requirements?.minCreditScore || 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{
                      p: 3,
                      bgcolor: 'info.50',
                      borderRadius: 1,
                      textAlign: 'center',
                      '&:hover': { bgcolor: 'info.100' }
                    }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Minimum Annual Income
                      </Typography>
                      <Typography variant="h4" fontWeight="bold" color="info.main">
                        {cardDetails.requirements?.minIncome ? formatCurrency(cardDetails.requirements.minIncome) : 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                
                {cardDetails.requirements?.description && (
                  <Alert severity="info" sx={{ borderRadius: 1, mb: 4 }}>
                    <Typography variant="body1">
                      {cardDetails.requirements.description}
                    </Typography>
                  </Alert>
                )}

                {/* Terms and Conditions */}
                <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: 'grey.700', mb: 2 }}>
                  <Warning sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
                  Terms and Conditions
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {cardDetails.terms && cardDetails.terms.map((term, index) => (
                    <Box key={index} sx={{
                      p: 2.5,
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'flex-start',
                      '&:hover': { bgcolor: 'grey.100' }
                    }}>
                      <Typography variant="body2" sx={{ 
                        color: 'primary.main', 
                        fontWeight: 'bold', 
                        mr: 2, 
                        mt: 0.5,
                        minWidth: '24px'
                      }}>
                        {index + 1}.
                      </Typography>
                      <Typography variant="body1" sx={{ flexGrow: 1, lineHeight: 1.6 }}>
                        {term}
                      </Typography>
                    </Box>
                  ))}
                </Box>
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