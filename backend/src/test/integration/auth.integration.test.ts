import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import app from '../../index';
import { testDbConnection, cleanDatabase, testUtils } from '../setup';

describe('Authentication Integration Tests', () => {
  beforeEach(async () => {
    await testDbConnection();
    await cleanDatabase();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should return error for duplicate email', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...userData, username: 'testuser2' })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email already exists');
    });

    it('should return error for invalid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'tu', // too short
          email: 'invalid-email',
          password: 'weak',
          firstName: '',
          lastName: ''
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('輸入驗證失敗');
      expect(response.body.details.errors).toHaveLength(5);
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await testUtils.createTestUser({
        email: 'test@example.com',
        password_hash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // 'password'
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.id).toBe(testUser.id);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should return error for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return error for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });
  });

  describe('POST /api/auth/logout', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      testUser = await testUtils.createTestUser();
      authToken = testUtils.generateTestToken(testUser.id);
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out successfully');
    });

    it('should return error for invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token');
    });

    it('should return error without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('GET /api/auth/profile', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      testUser = await testUtils.createTestUser();
      authToken = testUtils.generateTestToken(testUser.id);
    });

    it('should get user profile successfully', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.id).toBe(testUser.id);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should return error for invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token');
    });
  });

  describe('PUT /api/auth/profile', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      testUser = await testUtils.createTestUser();
      authToken = testUtils.generateTestToken(testUser.id);
    });

    it('should update profile successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'User'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.firstName).toBe(updateData.firstName);
      expect(response.body.data.user.lastName).toBe(updateData.lastName);
    });

    it('should return error for invalid data', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: '', // empty
          lastName: 'x'.repeat(100) // too long
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('輸入驗證失敗');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on auth endpoints', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      // Send multiple requests rapidly
      const requests = Array(6).fill(null).map(() =>
        request(app)
          .post('/api/auth/login')
          .send(userData)
      );

      const responses = await Promise.all(requests);

      // First 5 should get through (even with 401)
      responses.slice(0, 5).forEach(response => {
        expect(response.status).toBe(401);
      });

      // 6th should be rate limited
      expect(responses[5].status).toBe(429);
      expect(responses[5].body.message).toContain('Too many');
    });
  });

  describe('Session Management', () => {
    it('should create session on login', async () => {
      const testUser = await testUtils.createTestUser({
        password_hash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'password'
        })
        .expect(200);

      // Check for session cookie
      expect(response.headers['set-cookie']).toBeDefined();
      
      const sessionCookie = response.headers['set-cookie'].find((cookie: string) => 
        cookie.includes('session')
      );
      
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain('HttpOnly');
    });

    it('should invalidate session on logout', async () => {
      const testUser = await testUtils.createTestUser({
        password_hash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
      });

      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'password'
        });

      const token = loginResponse.body.data.token;

      // Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Try to use token after logout
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(profileResponse.body.message).toContain('Invalid token');
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize XSS attempts', async () => {
      const userData = {
        username: '<script>alert("xss")</script>',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        firstName: '<img src=x onerror=alert(1)>',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('輸入驗證失敗');
    });

    it('should prevent SQL injection', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "test@example.com' OR '1'='1",
          password: 'password'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('輸入驗證失敗');
    });
  });

  describe('Audit Logging', () => {
    it('should log successful login attempts', async () => {
      const testUser = await testUtils.createTestUser({
        password_hash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
      });

      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'password'
        })
        .expect(200);

      // Check audit log
      const auditLogs = await db('audit_logs')
        .where('user_id', testUser.id)
        .where('action', 'user_login')
        .where('success', true);

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].resource).toBe('auth');
    });

    it('should log failed login attempts', async () => {
      const testUser = await testUtils.createTestUser();

      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      // Check audit log
      const auditLogs = await db('audit_logs')
        .where('action', 'user_login')
        .where('success', false);

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].resource).toBe('auth');
    });
  });
});

export {};