describe('Authentication Flow', () => {
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'ValidPassword123!',
    firstName: 'Test',
    lastName: 'User'
  };

  beforeEach(() => {
    cy.visit('/');
  });

  describe('User Registration', () => {
    it('should register a new user successfully', () => {
      cy.visit('/register');
      
      // Fill registration form
      cy.fillRegistrationForm(testUser);
      
      // Submit form
      cy.get('[data-testid="register-button"]').click();
      
      // Should redirect to dashboard
      cy.shouldBeOnPage('/dashboard');
      
      // Should show success message
      cy.shouldShowSuccess('註冊成功');
      
      // Should show user menu
      cy.get('[data-testid="user-menu"]').should('be.visible');
    });

    it('should show validation errors for invalid input', () => {
      cy.visit('/register');
      
      // Try to submit empty form
      cy.get('[data-testid="register-button"]').click();
      
      // Should show validation errors
      cy.get('[data-testid="username-error"]').should('be.visible');
      cy.get('[data-testid="email-error"]').should('be.visible');
      cy.get('[data-testid="password-error"]').should('be.visible');
    });

    it('should show error for existing email', () => {
      // First register a user
      cy.visit('/register');
      cy.fillRegistrationForm(testUser);
      cy.get('[data-testid="register-button"]').click();
      cy.shouldBeOnPage('/dashboard');
      
      // Logout
      cy.logout();
      
      // Try to register again with same email
      cy.visit('/register');
      cy.fillRegistrationForm(testUser);
      cy.get('[data-testid="register-button"]').click();
      
      // Should show error
      cy.shouldShowError('電子郵件已經存在');
    });
  });

  describe('User Login', () => {
    beforeEach(() => {
      // Create a test user first
      cy.task('createTestUser', testUser);
    });

    it('should login with valid credentials', () => {
      cy.visit('/login');
      
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="login-button"]').click();
      
      // Should redirect to dashboard
      cy.shouldBeOnPage('/dashboard');
      
      // Should show user menu
      cy.get('[data-testid="user-menu"]').should('be.visible');
    });

    it('should show error for invalid credentials', () => {
      cy.visit('/login');
      
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type('wrongpassword');
      cy.get('[data-testid="login-button"]').click();
      
      // Should show error
      cy.shouldShowError('登入失敗');
      
      // Should stay on login page
      cy.shouldBeOnPage('/login');
    });

    it('should show validation errors for empty fields', () => {
      cy.visit('/login');
      
      cy.get('[data-testid="login-button"]').click();
      
      // Should show validation errors
      cy.get('[data-testid="email-error"]').should('be.visible');
      cy.get('[data-testid="password-error"]').should('be.visible');
    });
  });

  describe('User Logout', () => {
    beforeEach(() => {
      cy.task('createTestUser', testUser);
      cy.loginAsUser(testUser);
    });

    it('should logout successfully', () => {
      cy.logout();
      
      // Should redirect to login page
      cy.shouldBeOnPage('/login');
      
      // Should not show user menu
      cy.get('[data-testid="user-menu"]').should('not.exist');
    });
  });

  describe('Protected Routes', () => {
    it('should redirect to login for unauthenticated users', () => {
      cy.visit('/dashboard');
      
      // Should redirect to login
      cy.shouldBeOnPage('/login');
    });

    it('should allow access to protected routes for authenticated users', () => {
      cy.task('createTestUser', testUser);
      cy.loginAsUser(testUser);
      
      cy.visit('/dashboard');
      
      // Should stay on dashboard
      cy.shouldBeOnPage('/dashboard');
    });
  });

  describe('Password Reset', () => {
    beforeEach(() => {
      cy.task('createTestUser', testUser);
    });

    it('should request password reset', () => {
      cy.visit('/forgot-password');
      
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="reset-button"]').click();
      
      // Should show success message
      cy.shouldShowSuccess('密碼重設郵件已發送');
    });

    it('should show error for non-existent email', () => {
      cy.visit('/forgot-password');
      
      cy.get('[data-testid="email-input"]').type('nonexistent@example.com');
      cy.get('[data-testid="reset-button"]').click();
      
      // Should show error
      cy.shouldShowError('找不到該電子郵件');
    });
  });

  describe('Profile Management', () => {
    beforeEach(() => {
      cy.task('createTestUser', testUser);
      cy.loginAsUser(testUser);
    });

    it('should update profile information', () => {
      cy.visit('/profile');
      
      // Update first name
      cy.get('[data-testid="first-name-input"]').clear().type('Updated');
      cy.get('[data-testid="save-button"]').click();
      
      // Should show success message
      cy.shouldShowSuccess('個人資料已更新');
      
      // Should reflect the change
      cy.get('[data-testid="first-name-input"]').should('have.value', 'Updated');
    });

    it('should change password', () => {
      cy.visit('/profile');
      
      // Go to password change section
      cy.get('[data-testid="change-password-tab"]').click();
      
      cy.get('[data-testid="current-password-input"]').type(testUser.password);
      cy.get('[data-testid="new-password-input"]').type('NewPassword123!');
      cy.get('[data-testid="confirm-password-input"]').type('NewPassword123!');
      cy.get('[data-testid="change-password-button"]').click();
      
      // Should show success message
      cy.shouldShowSuccess('密碼已更新');
    });
  });
});