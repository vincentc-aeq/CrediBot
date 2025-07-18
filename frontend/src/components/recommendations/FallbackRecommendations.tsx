import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Grid,
  Container,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  TrendingUp,
  Assessment,
  CreditCard,
  AccountBalance,
  School,
  Work,
  Home,
  DirectionsCar,
} from '@mui/icons-material';

interface FallbackRecommendationsProps {
  onGetStarted?: () => void;
  onConnectPlaid?: () => void;
  onViewPopularCards?: () => void;
}

const FallbackRecommendations: React.FC<FallbackRecommendationsProps> = ({
  onGetStarted,
  onConnectPlaid,
  onViewPopularCards,
}) => {
  const popularCards = [
    {
      name: 'Cash Back Card',
      description: 'Simple rewards for everyday spending',
      benefit: '1-2% cash back',
      icon: <CreditCard />,
    },
    {
      name: 'Student Card',
      description: 'Easy approval for students',
      benefit: 'Build credit history',
      icon: <School />,
    },
    {
      name: 'Debit Card',
      description: 'Direct bank account access',
      benefit: 'Safe and convenient',
      icon: <AccountBalance />,
    },
  ];

  const steps = [
    {
      label: 'Connect Your Bank Account',
      description: 'Securely connect your bank account to help us understand your spending patterns',
      action: onConnectPlaid,
      buttonText: 'Connect Plaid',
    },
    {
      label: 'Complete Your Profile',
      description: 'Tell us about your income, spending habits, and preferences',
      action: onGetStarted,
      buttonText: 'Complete Profile',
    },
    {
      label: 'Get Personalized Recommendations',
      description: "Based on your data, we'll recommend the best credit cards for you",
      action: undefined,
      buttonText: 'Coming Soon',
    },
  ];

  const benefits = [
    {
      icon: <TrendingUp />,
      title: 'Smart Analysis',
      description: 'Personalized recommendations based on your spending patterns',
    },
    {
      icon: <Assessment />,
      title: 'Rewards Optimization',
      description: 'Find the credit card combination with the highest rewards rate',
    },
    {
      icon: <CreditCard />,
      title: 'Simplified Applications',
      description: 'Streamlined application process saves you time',
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Main description */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h4" component="h2" gutterBottom>
          Start Your Credit Card Optimization Journey
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          We don't have enough data yet to provide personalized recommendations
        </Typography>
        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="body1">
            To provide the most accurate recommendations, we need to understand your spending habits and preferences.
            Please take a few minutes to complete the following steps to get your personalized credit card recommendations.
          </Typography>
        </Alert>
      </Box>

      {/* Step guide */}
      <Grid container spacing={4} sx={{ mb: 6 }}>
        <Grid item xs={12} md={6}>
          <Typography variant="h5" component="h3" gutterBottom>
            How to Get Personalized Recommendations
          </Typography>
          <Stepper orientation="vertical">
            {steps.map((step, index) => (
              <Step key={index} active={true}>
                <StepLabel>{step.label}</StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {step.description}
                  </Typography>
                  {step.action && (
                    <Button
                      variant="contained"
                      onClick={step.action}
                      size="small"
                    >
                      {step.buttonText}
                    </Button>
                  )}
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h5" component="h3" gutterBottom>
            Why Choose Us
          </Typography>
          <List>
            {benefits.map((benefit, index) => (
              <ListItem key={index} alignItems="flex-start">
                <ListItemIcon sx={{ mt: 1 }}>
                  {benefit.icon}
                </ListItemIcon>
                <ListItemText
                  primary={benefit.title}
                  secondary={benefit.description}
                />
              </ListItem>
            ))}
          </List>
        </Grid>
      </Grid>

      {/* Popular card recommendations */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" component="h3" gutterBottom sx={{ textAlign: 'center' }}>
          Popular Credit Card Choices
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mb: 4 }}>
          Before you complete your setup, explore these popular credit cards
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3, 
          width: '100%' 
        }}>
          {popularCards.map((card, index) => (
            <Box key={index} sx={{ flex: { xs: 'none', md: '1 1 0' }, display: 'flex' }}>
              <Card sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: '240px' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {card.icon}
                    <Typography variant="h6" component="h4" sx={{ ml: 1 }}>
                      {card.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {card.description}
                  </Typography>
                  <Typography variant="subtitle1" color="primary">
                    {card.benefit}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={onViewPopularCards}>
                    Learn More
                  </Button>
                </CardActions>
              </Card>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Call to action */}
      <Box sx={{ textAlign: 'center', py: 4, bgcolor: 'grey.50', borderRadius: 2 }}>
        <Typography variant="h5" component="h3" gutterBottom>
          Ready to Get Started?
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Get your personalized credit card recommendations in just a few minutes
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            onClick={onConnectPlaid}
            sx={{ minWidth: 200 }}
          >
            Connect Bank Account
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={onGetStarted}
            sx={{ minWidth: 200 }}
          >
            Complete Profile
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default FallbackRecommendations;