/**
 * Homepage Recommendation Carousel Component
 * Displays personalized credit card recommendations powered by RecEngine
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Skeleton,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ArrowBackIos,
  ArrowForwardIos,
  TrendingUp,
  MonetizationOn,
  CardGiftcard,
} from '@mui/icons-material';
import Carousel from 'react-material-ui-carousel';
import { useRecEngine } from '../../hooks/useRecEngine';
import { formatCurrency } from '../../utils/formatters';

interface CreditCardDisplayProps {
  card: {
    card_id: string;
    issuer: string;
    card_name: string;
    ranking_score: number;
    annual_fee: number;
    signup_bonus: number;
    reason: string;
  };
  onLearnMore: (cardId: string) => void;
}

const CreditCardDisplay: React.FC<CreditCardDisplayProps> = ({ card, onLearnMore }) => {
  const theme = useTheme();
  
  // Map card types to colors
  const getCardColor = (issuer: string) => {
    const colorMap: Record<string, string> = {
      'Chase': '#1976d2',
      'American Express': '#006fcf',
      'Citi': '#003d7a',
      'Capital One': '#d03027',
      'Discover': '#ff6000',
      'Wells Fargo': '#d71e2b',
    };
    return colorMap[issuer] || theme.palette.primary.main;
  };

  return (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${getCardColor(card.issuer)} 0%, ${getCardColor(card.issuer)}dd 100%)`,
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: -50,
          right: -50,
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
        },
      }}
    >
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Card Header */}
        <Box mb={2}>
          <Typography variant="overline" sx={{ opacity: 0.9 }}>
            {card.issuer}
          </Typography>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            {card.card_name}
          </Typography>
          <Chip
            label={`Match Score: ${Math.round(card.ranking_score * 100)}%`}
            size="small"
            sx={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              fontWeight: 'bold',
            }}
            icon={<TrendingUp sx={{ color: 'white' }} />}
          />
        </Box>

        {/* Card Benefits */}
        <Box flexGrow={1} mb={2}>
          <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
            {card.reason}
          </Typography>
          
          <Box display="flex" gap={2} flexWrap="wrap">
            {card.signup_bonus > 0 && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <CardGiftcard fontSize="small" />
                <Typography variant="body2">
                  {formatCurrency(card.signup_bonus)} bonus
                </Typography>
              </Box>
            )}
            <Box display="flex" alignItems="center" gap={0.5}>
              <MonetizationOn fontSize="small" />
              <Typography variant="body2">
                {card.annual_fee === 0 ? 'No annual fee' : `${formatCurrency(card.annual_fee)}/year`}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Action Button */}
        <Button
          variant="contained"
          fullWidth
          onClick={() => onLearnMore(card.card_id)}
          sx={{
            backgroundColor: 'rgba(255,255,255,0.9)',
            color: getCardColor(card.issuer),
            fontWeight: 'bold',
            '&:hover': {
              backgroundColor: 'white',
            },
          }}
        >
          Learn More
        </Button>
      </CardContent>
    </Card>
  );
};

export const HomepageCarousel: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { useHomepageRecommendations } = useRecEngine();
  const { data, isLoading, error } = useHomepageRecommendations();
  
  const [activeIndex, setActiveIndex] = useState(0);

  const handleLearnMore = (cardId: string) => {
    // Navigate to card details page or open modal
    window.location.href = `/cards/${cardId}`;
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        Unable to load recommendations. Please try again later.
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          Recommended for You
        </Typography>
        <Box display="flex" gap={2} overflow="hidden">
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              width={350}
              height={250}
              sx={{ borderRadius: 2 }}
            />
          ))}
        </Box>
      </Box>
    );
  }

  const recommendations = data?.ranked_cards || [];

  if (recommendations.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        No personalized recommendations available at this time.
      </Alert>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Recommended for You
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
        Based on your spending patterns and preferences
      </Typography>

      {isMobile ? (
        // Mobile: Carousel view
        <Carousel
          autoPlay={false}
          indicators
          navButtonsAlwaysVisible
          animation="slide"
          index={activeIndex}
          onChange={setActiveIndex}
          sx={{ width: '100%' }}
        >
          {recommendations.map((card) => (
            <Box key={card.card_id} sx={{ px: 1, height: 300 }}>
              <CreditCardDisplay card={card} onLearnMore={handleLearnMore} />
            </Box>
          ))}
        </Carousel>
      ) : (
        // Desktop: Horizontal scroll
        <Box
          sx={{
            display: 'flex',
            gap: 3,
            overflowX: 'auto',
            pb: 2,
            '&::-webkit-scrollbar': {
              height: 8,
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: theme.palette.grey[200],
              borderRadius: 4,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: theme.palette.primary.main,
              borderRadius: 4,
            },
          }}
        >
          {recommendations.map((card) => (
            <Box
              key={card.card_id}
              sx={{
                minWidth: 350,
                height: 250,
              }}
            >
              <CreditCardDisplay card={card} onLearnMore={handleLearnMore} />
            </Box>
          ))}
        </Box>
      )}

      {/* Quick Stats */}
      <Box
        sx={{
          mt: 3,
          p: 2,
          backgroundColor: theme.palette.grey[50],
          borderRadius: 2,
          display: 'flex',
          justifyContent: 'space-around',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box textAlign="center">
          <Typography variant="h6" color="primary">
            {recommendations.length}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Cards Matched
          </Typography>
        </Box>
        <Box textAlign="center">
          <Typography variant="h6" color="primary">
            {Math.round(Math.max(...recommendations.map(c => c.ranking_score)) * 100)}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Best Match Score
          </Typography>
        </Box>
        <Box textAlign="center">
          <Typography variant="h6" color="primary">
            {formatCurrency(
              Math.max(...recommendations.map(c => c.signup_bonus))
            )}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Highest Bonus
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};