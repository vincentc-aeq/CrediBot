// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR requests from command log
Cypress.on('window:before:load', (win) => {
  const originalFetch = win.fetch;
  win.fetch = function (...args) {
    return originalFetch.apply(this, args);
  };
});

// Handle uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from
  // failing the test on uncaught exceptions
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  if (err.message.includes('ChunkLoadError')) {
    return false;
  }
  if (err.message.includes('Loading chunk')) {
    return false;
  }
  return true;
});

// Global before hook
beforeEach(() => {
  // Reset database state before each test
  cy.task('resetDatabase');
  
  // Set up test data
  cy.task('seedTestData');
  
  // Clear local storage
  cy.clearLocalStorage();
  
  // Clear cookies
  cy.clearCookies();
});

// Global after hook
afterEach(() => {
  // Clean up after each test
  cy.task('cleanupTestData');
});

// Custom assertions
declare global {
  namespace Cypress {
    interface Chainable {
      // Auth commands
      loginAsUser(user?: any): Chainable<Element>;
      logout(): Chainable<Element>;
      
      // API commands
      apiRequest(method: string, url: string, body?: any): Chainable<any>;
      
      // Database commands
      resetDatabase(): Chainable<any>;
      seedTestData(): Chainable<any>;
      cleanupTestData(): Chainable<any>;
      
      // UI commands
      waitForSpinner(): Chainable<Element>;
      selectCard(cardName: string): Chainable<Element>;
      fillRegistrationForm(user: any): Chainable<Element>;
      
      // Assertions
      shouldShowError(message: string): Chainable<Element>;
      shouldShowSuccess(message: string): Chainable<Element>;
      shouldBeOnPage(path: string): Chainable<Element>;
    }
  }
}