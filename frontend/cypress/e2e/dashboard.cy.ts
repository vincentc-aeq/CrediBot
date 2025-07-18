describe('Dashboard', () => {
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'ValidPassword123!',
    firstName: 'Test',
    lastName: 'User'
  };

  beforeEach(() => {
    cy.task('createTestUser', testUser);
    cy.loginAsUser(testUser);
    cy.visit('/dashboard');
  });

  describe('Dashboard Overview', () => {
    it('should display dashboard components', () => {
      // Should show welcome message
      cy.get('[data-testid="welcome-message"]').should('contain', testUser.firstName);
      
      // Should show spending overview
      cy.get('[data-testid="spending-overview"]').should('be.visible');
      
      // Should show card recommendations
      cy.get('[data-testid="card-recommendations"]').should('be.visible');
      
      // Should show recent transactions
      cy.get('[data-testid="recent-transactions"]').should('be.visible');
      
      // Should show portfolio optimization
      cy.get('[data-testid="portfolio-optimization"]').should('be.visible');
    });

    it('should display user cards', () => {
      cy.get('[data-testid="user-cards"]').should('be.visible');
      
      // Should show add card button
      cy.get('[data-testid="add-card-button"]').should('be.visible');
    });

    it('should display spending statistics', () => {
      cy.get('[data-testid="spending-chart"]').should('be.visible');
      
      // Should show spending breakdown
      cy.get('[data-testid="spending-breakdown"]').should('be.visible');
      
      // Should show monthly trends
      cy.get('[data-testid="monthly-trends"]').should('be.visible');
    });
  });

  describe('Card Management', () => {
    it('should add a new card', () => {
      cy.get('[data-testid="add-card-button"]').click();
      
      // Should open card selection modal
      cy.get('[data-testid="card-selection-modal"]').should('be.visible');
      
      // Select a card
      cy.selectCard('Chase Sapphire Preferred');
      
      // Should show success message
      cy.shouldShowSuccess('卡片已添加');
      
      // Should show card in user cards
      cy.get('[data-testid="user-cards"]').should('contain', 'Chase Sapphire Preferred');
    });

    it('should remove a card', () => {
      // First add a card
      cy.task('addCardToUser', { userId: 1, cardId: 1 });
      cy.reload();
      
      // Remove the card
      cy.get('[data-testid="card-menu-button"]').first().click();
      cy.get('[data-testid="remove-card-button"]').click();
      
      // Confirm removal
      cy.get('[data-testid="confirm-remove-button"]').click();
      
      // Should show success message
      cy.shouldShowSuccess('卡片已移除');
      
      // Should not show card in user cards
      cy.get('[data-testid="user-cards"]').should('not.contain', 'Chase Sapphire Preferred');
    });

    it('should view card details', () => {
      // First add a card
      cy.task('addCardToUser', { userId: 1, cardId: 1 });
      cy.reload();
      
      // Click on card
      cy.get('[data-testid="card-item"]').first().click();
      
      // Should show card details modal
      cy.get('[data-testid="card-details-modal"]').should('be.visible');
      
      // Should show card information
      cy.get('[data-testid="card-name"]').should('be.visible');
      cy.get('[data-testid="card-rewards"]').should('be.visible');
      cy.get('[data-testid="card-features"]').should('be.visible');
    });
  });

  describe('Recommendations', () => {
    it('should display homepage recommendations', () => {
      cy.get('[data-testid="homepage-recommendations"]').should('be.visible');
      
      // Should show recommended cards
      cy.get('[data-testid="recommended-card"]').should('have.length.at.least', 1);
    });

    it('should analyze transaction for better card', () => {
      // First add some transactions
      cy.task('addTestTransaction', { userId: 1, amount: 50, category: 'dining' });
      cy.reload();
      
      // Click on transaction analysis
      cy.get('[data-testid="transaction-analysis-button"]').first().click();
      
      // Should show analysis results
      cy.get('[data-testid="analysis-results"]').should('be.visible');
      
      // Should show better card suggestion
      cy.get('[data-testid="better-card-suggestion"]').should('be.visible');
    });

    it('should view portfolio optimization', () => {
      cy.get('[data-testid="portfolio-optimization"]').should('be.visible');
      
      // Click on optimization button
      cy.get('[data-testid="optimize-portfolio-button"]').click();
      
      // Should show optimization results
      cy.get('[data-testid="optimization-results"]').should('be.visible');
      
      // Should show suggestions
      cy.get('[data-testid="optimization-suggestions"]').should('be.visible');
    });
  });

  describe('Analytics', () => {
    it('should display spending analytics', () => {
      cy.get('[data-testid="analytics-tab"]').click();
      
      // Should show spending patterns
      cy.get('[data-testid="spending-patterns"]').should('be.visible');
      
      // Should show category breakdown
      cy.get('[data-testid="category-breakdown"]').should('be.visible');
      
      // Should show trends
      cy.get('[data-testid="spending-trends"]').should('be.visible');
    });

    it('should display card performance', () => {
      cy.get('[data-testid="analytics-tab"]').click();
      
      // Click on card performance tab
      cy.get('[data-testid="card-performance-tab"]').click();
      
      // Should show card performance metrics
      cy.get('[data-testid="card-performance-metrics"]').should('be.visible');
      
      // Should show reward calculations
      cy.get('[data-testid="reward-calculations"]').should('be.visible');
    });

    it('should filter analytics by date range', () => {
      cy.get('[data-testid="analytics-tab"]').click();
      
      // Change date range
      cy.get('[data-testid="date-range-selector"]').click();
      cy.get('[data-testid="last-3-months"]').click();
      
      // Should update analytics
      cy.get('[data-testid="spending-patterns"]').should('be.visible');
    });
  });

  describe('Plaid Integration', () => {
    it('should connect bank account', () => {
      cy.get('[data-testid="connect-bank-button"]').click();
      
      // Should show Plaid Link modal
      cy.get('[data-testid="plaid-link-modal"]').should('be.visible');
      
      // Note: In a real test, you would mock the Plaid Link flow
      // For now, we'll just check the modal appears
    });

    it('should display connected accounts', () => {
      // First add a connected account
      cy.task('addPlaidAccount', { userId: 1 });
      cy.reload();
      
      // Should show connected accounts
      cy.get('[data-testid="connected-accounts"]').should('be.visible');
      
      // Should show account details
      cy.get('[data-testid="account-item"]').should('have.length.at.least', 1);
    });

    it('should import transactions', () => {
      // First add a connected account
      cy.task('addPlaidAccount', { userId: 1 });
      cy.reload();
      
      // Click import transactions
      cy.get('[data-testid="import-transactions-button"]').click();
      
      // Should show import status
      cy.get('[data-testid="import-status"]').should('be.visible');
      
      // Should show success message
      cy.shouldShowSuccess('交易已導入');
    });
  });

  describe('Real-time Updates', () => {
    it('should receive real-time recommendations', () => {
      // Add a transaction that should trigger recommendation
      cy.task('addTestTransaction', { userId: 1, amount: 100, category: 'dining' });
      
      // Should show new recommendation notification
      cy.get('[data-testid="recommendation-notification"]', { timeout: 10000 })
        .should('be.visible');
    });

    it('should update dashboard when new data arrives', () => {
      // Get initial spending amount
      cy.get('[data-testid="total-spending"]').then($el => {
        const initialAmount = $el.text();
        
        // Add a new transaction
        cy.task('addTestTransaction', { userId: 1, amount: 50, category: 'gas' });
        
        // Should update spending amount
        cy.get('[data-testid="total-spending"]').should('not.contain', initialAmount);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      // Simulate API error
      cy.intercept('GET', '/api/recommendations/homepage', {
        statusCode: 500,
        body: { error: 'Internal Server Error' }
      }).as('getRecommendations');
      
      cy.reload();
      
      // Should show error message
      cy.get('[data-testid="error-message"]').should('be.visible');
      
      // Should show retry button
      cy.get('[data-testid="retry-button"]').should('be.visible');
    });

    it('should handle network errors', () => {
      // Simulate network error
      cy.intercept('GET', '/api/analytics/spending-patterns', {
        forceNetworkError: true
      }).as('getSpendingPatterns');
      
      cy.get('[data-testid="analytics-tab"]').click();
      
      // Should show network error message
      cy.get('[data-testid="network-error"]').should('be.visible');
    });
  });

  describe('Performance', () => {
    it('should load dashboard quickly', () => {
      const start = performance.now();
      
      cy.visit('/dashboard');
      
      cy.get('[data-testid="dashboard-loaded"]').should('be.visible').then(() => {
        const loadTime = performance.now() - start;
        expect(loadTime).to.be.lessThan(3000); // Should load within 3 seconds
      });
    });

    it('should handle large datasets', () => {
      // Add many transactions
      cy.task('addManyTransactions', { userId: 1, count: 1000 });
      
      cy.visit('/dashboard');
      
      // Should still load without issues
      cy.get('[data-testid="recent-transactions"]').should('be.visible');
      
      // Should show virtualized list
      cy.get('[data-testid="transaction-list"]').should('be.visible');
    });
  });
});