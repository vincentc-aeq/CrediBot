
import React, { useState } from 'react';
import { Box, Typography, Container, Alert, Button } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import RecommendationCarousel from '../components/recommendations/RecommendationCarousel';
import CardDetailsModal from '../components/recommendations/CardDetailsModal';
import FallbackRecommendations from '../components/recommendations/FallbackRecommendations';
import { RecommendationItem, recommendationApi } from '../api/recommendationApi';

const HomePage = () => {
  const { user } = useAuth();
  const [selectedRecommendation, setSelectedRecommendation] = useState<RecommendationItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get dynamic homepage content
  const { data: dynamicContent } = useQuery({
    queryKey: ['dynamic-homepage-content'],
    queryFn: () => recommendationApi.getDynamicHomepageContent(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get recommendation data to determine whether to show fallback component
  const { data: recommendationResult } = useQuery({
    queryKey: ['homepage-recommendations-check'],
    queryFn: () => recommendationApi.getHomepageRecommendations({ maxResults: 1 }),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Handle card click
  const handleCardClick = (recommendation: RecommendationItem) => {
    setSelectedRecommendation(recommendation);
    setIsModalOpen(true);
  };

  // Handle click tracking
  const handleTrackClick = async (recommendation: RecommendationItem, position: number) => {
    try {
      await recommendationApi.trackRecommendationClick({
        recommendationId: 'homepage-carousel',
        cardId: recommendation.cardId,
        position,
        section: 'homepage-carousel',
      });
    } catch (error) {
      console.error('Failed to track click:', error);
    }
  };

  // Handle card application
  const handleApplyCard = (cardId: string) => {
    // Card application logic can be implemented here
    console.log('Apply for card:', cardId);
    setIsModalOpen(false);
    // Can navigate to application page or show application form
  };

  // Fallback component handler functions
  const handleGetStarted = () => {
    // Navigate to profile setup page
    console.log('Navigate to profile setup');
  };

  const handleConnectPlaid = () => {
    // Navigate to Plaid connection page
    console.log('Navigate to Plaid connection');
  };

  const handleViewPopularCards = () => {
    // Navigate to popular cards page
    console.log('Navigate to popular cards');
  };

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            Welcome to CrediBot
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Intelligent Credit Card Recommendation System
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Please login to get personalized credit card recommendations
          </Alert>
        </Box>
      </Container>
    );
  }

  // Check if there are sufficient recommendation data
  const hasRecommendations = recommendationResult?.recommendations && recommendationResult.recommendations.length > 0;

  return (
    <Box>
      {/* If there are insufficient recommendation data, show fallback component */}
      {!hasRecommendations ? (
        <FallbackRecommendations
          onGetStarted={handleGetStarted}
          onConnectPlaid={handleConnectPlaid}
          onViewPopularCards={handleViewPopularCards}
        />
      ) : (
        <>
          {/* Welcome message section */}
          <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h3" component="h1" gutterBottom>
                {dynamicContent?.primaryMessage || `Welcome back, ${user.name}!`}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                {dynamicContent?.secondaryMessage || 'We found better credit card options for you'}
              </Typography>
            </Box>

            {/* Urgent recommendation alerts */}
            {dynamicContent?.urgentRecommendations && dynamicContent.urgentRecommendations.length > 0 && (
              <Alert severity="warning" sx={{ mb: 4 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Important Alert
                </Typography>
                <Typography variant="body2">
                  Based on your recent spending records, we found credit card options that are better suited for you.
                </Typography>
                <Button size="small" sx={{ mt: 1 }}>
                  View Details
                </Button>
              </Alert>
            )}
          </Container>

          {/* Recommendation carousel */}
          <RecommendationCarousel
            onCardClick={handleCardClick}
            onTrackClick={handleTrackClick}
            maxResults={6}
            enablePersonalization={true}
          />

          {/* Time-sensitive recommendations */}
          {dynamicContent?.timeBasedRecommendations && dynamicContent.timeBasedRecommendations.length > 0 && (
            <Container maxWidth="lg" sx={{ py: 4 }}>
              <Typography variant="h5" component="h2" gutterBottom sx={{ textAlign: 'center' }}>
                Limited Time Recommendations
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mb: 4 }}>
                Recommendations based on current time and market conditions
              </Typography>
              {/* Another carousel component or card display can be added here */}
            </Container>
          )}
        </>
      )}

      {/* Card details modal */}
      <CardDetailsModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        recommendation={selectedRecommendation}
        onApplyCard={handleApplyCard}
      />
    </Box>
  );
};

export default HomePage;
