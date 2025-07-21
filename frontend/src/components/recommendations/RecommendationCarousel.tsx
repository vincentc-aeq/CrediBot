import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Grid,
  Skeleton,
  Alert,
  Container,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { NavigateNext, NavigateBefore, Star, TrendingUp, LocalOffer } from '@mui/icons-material';
import { RecommendationItem, recommendationApi } from '../../api/recommendationApi';
import { useQuery } from '@tanstack/react-query';

interface RecommendationCarouselProps {
  onCardClick?: (recommendation: RecommendationItem) => void;
  onTrackClick?: (recommendation: RecommendationItem, position: number) => void;
  maxResults?: number;
  enablePersonalization?: boolean;
}

const RecommendationCarousel: React.FC<RecommendationCarouselProps> = ({
  onCardClick,
  onTrackClick,
  maxResults = 6,
  enablePersonalization = true,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Responsive settings
  const getCardsPerView = () => {
    if (isMobile) return 1;
    if (isTablet) return 2;
    return 3;
  };

  const cardsPerView = getCardsPerView();

  // Get recommendation data
  const {
    data: recommendationResult,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['homepage-recommendations', maxResults, enablePersonalization],
    queryFn: () => recommendationApi.getHomepageRecommendations({ maxResults, enablePersonalization }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  const recommendations = recommendationResult?.recommendations || [];

  // Handle card click
  const handleCardClick = (recommendation: RecommendationItem, position: number) => {
    // Track click
    if (onTrackClick) {
      onTrackClick(recommendation, position);
    }
    
    // Notify parent component
    if (onCardClick) {
      onCardClick(recommendation);
    }
  };

  // Carousel controls
  const goToNext = () => {
    setCurrentIndex((prev) => 
      prev + cardsPerView >= recommendations.length ? 0 : prev + cardsPerView
    );
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => 
      prev === 0 ? Math.max(0, recommendations.length - cardsPerView) : prev - cardsPerView
    );
  };

  // Auto-play carousel (disabled)
  // useEffect(() => {
  //   if (recommendations.length > cardsPerView) {
  //     const interval = setInterval(goToNext, 5000); // Auto-switch every 5 seconds
  //     return () => clearInterval(interval);
  //   }
  // }, [recommendations.length, cardsPerView]);

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  // Format benefit amount
  const formatBenefit = (benefit: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(benefit);
  };

  // Loading state
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="text" width="60%" height={40} />
          <Skeleton variant="text" width="40%" height={24} />
        </Box>
        <Grid container spacing={3}>
          {Array.from({ length: cardsPerView }).map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="80%" height={28} />
                  <Skeleton variant="text" width="60%" height={20} />
                  <Skeleton variant="text" width="100%" height={60} />
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Skeleton variant="rounded" width={60} height={24} />
                    <Skeleton variant="rounded" width={80} height={24} />
                  </Box>
                </CardContent>
                <CardActions>
                  <Skeleton variant="rounded" width={120} height={36} />
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          Unable to load recommendations. Please try again later.
        </Alert>
      </Container>
    );
  }

  // Empty state - use fallback component
  if (!recommendations.length) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h5" component="h2" gutterBottom color="text.secondary">
            No Recommendations Available
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            We don't have enough information to provide personalized credit card recommendations at this time.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please complete your profile setup or connect your bank account to receive personalized recommendations.
          </Typography>
        </Box>
      </Container>
    );
  }

  const visibleRecommendations = recommendations.slice(currentIndex, currentIndex + cardsPerView);

  return (
    <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, sm: 3, md: 4 } }}>
      {/* Title section */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h2" gutterBottom>
          Recommended for You
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Credit cards carefully selected based on your spending habits
        </Typography>
      </Box>

      {/* Carousel section */}
      <Box sx={{ position: 'relative', width: '100%' }}>
        {/* Navigation buttons */}
        {recommendations.length > cardsPerView && (
          <>
            <Button
              variant="outlined"
              size="small"
              sx={{
                position: 'absolute',
                left: -60,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 1,
                minWidth: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: 'background.paper',
                '&:hover': {
                  backgroundColor: 'background.paper',
                },
              }}
              onClick={goToPrevious}
              disabled={currentIndex === 0}
            >
              <NavigateBefore />
            </Button>
            <Button
              variant="outlined"
              size="small"
              sx={{
                position: 'absolute',
                right: -60,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 1,
                minWidth: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: 'background.paper',
                '&:hover': {
                  backgroundColor: 'background.paper',
                },
              }}
              onClick={goToNext}
              disabled={currentIndex + cardsPerView >= recommendations.length}
            >
              <NavigateNext />
            </Button>
          </>
        )}

        {/* Recommendation cards */}
        <Box 
          sx={{ 
            display: 'flex',
            gap: 3,
            width: '100%',
            justifyContent: 'flex-start',
          }}
        >
          {visibleRecommendations.map((recommendation, index) => (
            <Box
              key={recommendation.cardId}
              sx={{
                width: 'calc(33.333% - 16px)', // 1/3 width minus gap compensation
                display: 'flex',
                flexShrink: 0,
                flexGrow: 0,
              }}
            >
              <Card
                sx={{
                  width: '100%',
                  height: '100%',
                  minHeight: 280,
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[8],
                  },
                }}
                onClick={() => handleCardClick(recommendation, currentIndex + index)}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Card name and score */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2, minHeight: 48 }}>
                    <Typography variant="h6" component="h3" sx={{ 
                      flexGrow: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {recommendation.cardName}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', ml: 1, flexShrink: 0 }}>
                      <Star color="primary" fontSize="small" />
                      <Typography variant="body2" sx={{ ml: 0.5 }}>
                        {(recommendation.score * 10).toFixed(1)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Recommendation reason */}
                  <Typography variant="body2" color="text.secondary" sx={{ 
                    mb: 2, 
                    minHeight: 40,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {recommendation.reasoning}
                  </Typography>

                  {/* Estimated benefit */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, minHeight: 24 }}>
                    <TrendingUp color="success" fontSize="small" />
                    <Typography variant="body2" sx={{ ml: 0.5, fontSize: '0.875rem' }}>
                      Annual Benefit: {formatBenefit(recommendation.estimatedBenefit)}
                    </Typography>
                  </Box>

                  {/* Tags */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, minHeight: 32 }}>
                    <Chip
                      label={recommendation.priority}
                      color={getPriorityColor(recommendation.priority)}
                      size="small"
                    />
                    {recommendation.tags.slice(0, 2).map((tag, tagIndex) => (
                      <Chip
                        key={tagIndex}
                        label={tag}
                        variant="outlined"
                        size="small"
                        icon={<LocalOffer />}
                      />
                    ))}
                  </Box>
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Confidence: {(recommendation.confidence * 100).toFixed(0)}%
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(recommendation, currentIndex + index);
                    }}
                  >
                    {recommendation.ctaText}
                  </Button>
                </CardActions>
              </Card>
            </Box>
          ))}
        </Box>

        {/* Indicators */}
        {recommendations.length > cardsPerView && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            {Array.from({ length: Math.ceil(recommendations.length / cardsPerView) }).map((_, index) => (
              <Box
                key={index}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: index === Math.floor(currentIndex / cardsPerView) ? 'primary.main' : 'grey.300',
                  mx: 0.5,
                  cursor: 'pointer',
                }}
                onClick={() => setCurrentIndex(index * cardsPerView)}
              />
            ))}
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default RecommendationCarousel;