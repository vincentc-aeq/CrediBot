// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Authentication commands
Cypress.Commands.add('loginAsUser', (user = Cypress.env('testUser')) => {
  cy.visit('/login');
  cy.get('[data-testid="email-input"]').type(user.email);
  cy.get('[data-testid="password-input"]').type(user.password);
  cy.get('[data-testid="login-button"]').click();
  cy.url().should('not.include', '/login');
  cy.get('[data-testid="user-menu"]').should('be.visible');
});

Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="logout-button"]').click();
  cy.url().should('include', '/login');
});

// API commands
Cypress.Commands.add('apiRequest', (method: string, url: string, body?: any) => {
  return cy.request({
    method,
    url: `${Cypress.env('apiUrl')}${url}`,
    body,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
    },
    failOnStatusCode: false
  });
});

// Database commands
Cypress.Commands.add('resetDatabase', () => {
  return cy.task('resetDatabase');
});

Cypress.Commands.add('seedTestData', () => {
  return cy.task('seedTestData');
});

Cypress.Commands.add('cleanupTestData', () => {
  return cy.task('cleanupTestData');
});

// UI commands
Cypress.Commands.add('waitForSpinner', () => {
  cy.get('[data-testid="loading-spinner"]').should('not.exist');
});

Cypress.Commands.add('selectCard', (cardName: string) => {
  cy.contains('[data-testid="card-item"]', cardName).click();
});

Cypress.Commands.add('fillRegistrationForm', (user: any) => {
  cy.get('[data-testid="username-input"]').type(user.username);
  cy.get('[data-testid="email-input"]').type(user.email);
  cy.get('[data-testid="password-input"]').type(user.password);
  cy.get('[data-testid="first-name-input"]').type(user.firstName);
  cy.get('[data-testid="last-name-input"]').type(user.lastName);
});

// Assertion commands
Cypress.Commands.add('shouldShowError', (message: string) => {
  cy.get('[data-testid="error-message"]').should('contain', message);
});

Cypress.Commands.add('shouldShowSuccess', (message: string) => {
  cy.get('[data-testid="success-message"]').should('contain', message);
});

Cypress.Commands.add('shouldBeOnPage', (path: string) => {
  cy.url().should('include', path);
});

// Override default commands
Cypress.Commands.overwrite('visit', (originalFn, url, options) => {
  return originalFn(url, {
    ...options,
    onBeforeLoad: (win) => {
      // Mock console methods to reduce noise
      win.console.warn = cy.stub();
      win.console.error = cy.stub();
      
      // Mock window.matchMedia
      win.matchMedia = cy.stub().returns({
        matches: false,
        addListener: cy.stub(),
        removeListener: cy.stub(),
      });
      
      // Mock IntersectionObserver
      win.IntersectionObserver = cy.stub().returns({
        observe: cy.stub(),
        unobserve: cy.stub(),
        disconnect: cy.stub(),
      });
      
      // Mock ResizeObserver
      win.ResizeObserver = cy.stub().returns({
        observe: cy.stub(),
        unobserve: cy.stub(),
        disconnect: cy.stub(),
      });
      
      // Call original onBeforeLoad if provided
      if (options?.onBeforeLoad) {
        options.onBeforeLoad(win);
      }
    }
  });
});

// Add custom type declarations
declare global {
  namespace Cypress {
    interface Chainable {
      loginAsUser(user?: any): Chainable<Element>;
      logout(): Chainable<Element>;
      apiRequest(method: string, url: string, body?: any): Chainable<any>;
      resetDatabase(): Chainable<any>;
      seedTestData(): Chainable<any>;
      cleanupTestData(): Chainable<any>;
      waitForSpinner(): Chainable<Element>;
      selectCard(cardName: string): Chainable<Element>;
      fillRegistrationForm(user: any): Chainable<Element>;
      shouldShowError(message: string): Chainable<Element>;
      shouldShowSuccess(message: string): Chainable<Element>;
      shouldBeOnPage(path: string): Chainable<Element>;
    }
  }
}

export {};