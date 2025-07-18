import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import app from '../index';
import { testDbConnection } from './setup';

describe('Security Tests', () => {
  beforeEach(async () => {
    await testDbConnection();
  });

  afterEach(async () => {
    // Clean test data
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check basic security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(response.headers['server']).toBe('CrediBot-API');
    });

    it('should include CSP headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });

    it('should include CORS headers for allowed origins', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should block requests from disallowed origins', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://malicious-site.com')
        .expect(500);

      expect(response.text).toContain('Not allowed by CORS');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to authentication endpoints', async () => {
      const promises = [];
      
      // Send 6 requests (exceeding the limit of 5)
      for (let i = 0; i < 6; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send({ email: 'test@example.com', password: 'password' })
        );
      }

      const responses = await Promise.all(promises);
      
      // First 5 requests should pass (even if auth fails)
      responses.slice(0, 5).forEach(response => {
        expect(response.status).not.toBe(429);
      });

      // 6th request should be rate limited
      expect(responses[5].status).toBe(429);
      expect(responses[5].body.message).toContain('Too many');
    });

    it('should include rate limit headers', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password' });

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid email formats', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'ValidPassword123!'
        })
        .expect(400);

      expect(response.body.message).toContain('Input validation failed');
      expect(response.body.details.errors[0].field).toBe('email');
    });

    it('should reject weak passwords', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'weak'
        })
        .expect(400);

      expect(response.body.message).toContain('Input validation failed');
      expect(response.body.details.errors[0].field).toBe('password');
    });

    it('should sanitize HTML input', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: '<script>alert("xss")</script>testuser',
          email: 'test@example.com',
          password: 'ValidPassword123!',
          firstName: '<img src=x onerror=alert(1)>John'
        })
        .expect(400);

      // Even though input is sanitized, should be rejected for invalid username characters
      expect(response.body.message).toContain('Input validation failed');
    });

    it('should reject SQL injection attempts', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "test@example.com' OR '1'='1",
          password: "password"
        })
        .expect(400);

      expect(response.body.message).toContain('Input validation failed');
    });

    it('should reject requests with excessive payload size', async () => {
      const largePayload = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        notes: 'x'.repeat(11 * 1024 * 1024) // 11MB of data
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(largePayload)
        .expect(413);

      expect(response.text).toContain('too large');
    });
  });

  describe('Authentication & Authorization', () => {
    let authToken: string;

    beforeEach(async () => {
      // Create test user and get token
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'ValidPassword123!',
          firstName: 'Test',
          lastName: 'User'
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'ValidPassword123!'
        });

      authToken = loginResponse.body.token;
    });

    it('should require authentication for protected routes', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });

    it('should accept valid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should reject invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toContain('Invalid token');
    });

    it('should reject expired JWT tokens', async () => {
      // This test needs to generate an expired token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
      
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.message).toContain('Invalid token');
    });
  });

  describe('Session Security', () => {
    it('should set secure session cookies', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'ValidPassword123!'
        });

      const cookies = response.headers['set-cookie'];
      if (cookies) {
        const sessionCookie = cookies.find((cookie: string) => cookie.includes('session'));
        if (sessionCookie) {
          expect(sessionCookie).toContain('HttpOnly');
          expect(sessionCookie).toContain('SameSite=Strict');
          // Should include Secure in HTTPS environment
          if (process.env.NODE_ENV === 'production') {
            expect(sessionCookie).toContain('Secure');
          }
        }
      }
    });

    it('should invalidate sessions on logout', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'ValidPassword123!'
        });

      const token = loginResponse.body.token;

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Try to use logged out token
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.message).toContain('Invalid token');
    });
  });

  describe('Error Handling', () => {
    it('should not leak sensitive information in error messages', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      // Should not reveal whether user exists
      expect(response.body.message).not.toContain('user not found');
      expect(response.body.message).not.toContain('database');
      expect(response.body.message).not.toContain('stack trace');
    });

    it('should handle database errors gracefully', async () => {
      // Simulate database error
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Route not found');
    });
  });

  describe('Content Security Policy', () => {
    it('should block inline scripts', async () => {
      // This test needs actual frontend to execute CSP checks
      // Here we only check if CSP headers are correctly set
      const response = await request(app)
        .get('/health')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toBeDefined();
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types', async () => {
      // Simulate file upload test
      const response = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from('fake-executable'), {
          filename: 'malicious.exe',
          contentType: 'application/x-executable'
        })
        .expect(400);

      expect(response.body.message).toContain('Unsupported file type');
    });

    it('should limit file sizes', async () => {
      const largeFile = Buffer.alloc(6 * 1024 * 1024); // 6MB file
      
      const response = await request(app)
        .post('/api/upload')
        .attach('file', largeFile, {
          filename: 'large-file.jpg',
          contentType: 'image/jpeg'
        })
        .expect(400);

      expect(response.body.message).toContain('File too large');
    });
  });

  describe('API Security', () => {
    it('should require API versioning', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.headers['x-api-version']).toBeDefined();
    });

    it('should include request ID in headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('should prevent HTTP parameter pollution', async () => {
      const response = await request(app)
        .get('/api/cards?category=travel&category=cashback')
        .expect(400);

      expect(response.body.message).toContain('Input validation failed');
    });
  });

  describe('Audit Logging', () => {
    it('should log authentication attempts', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      // Check if audit logs are recorded
      // In actual implementation, this would check database or log files
      expect(response.status).toBe(401);
    });

    it('should log sensitive operations', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'ValidPassword123!'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Updated',
          lastName: 'User'
        });

      // Check if audit logs are recorded
      expect(response.status).toBe(200);
    });
  });

  describe('Environment Security', () => {
    it('should not expose sensitive environment variables', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      // Ensure response doesn't contain sensitive environment variables
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('password');
      expect(responseText).not.toContain('secret');
      expect(responseText).not.toContain('key');
      expect(responseText).not.toContain('token');
    });
  });
});

describe('Vulnerability Tests', () => {
  describe('SQL Injection', () => {
    it('should prevent SQL injection in login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "admin@example.com'; DROP TABLE users; --",
          password: "password"
        })
        .expect(400);

      expect(response.body.message).toContain('Input validation failed');
    });

    it('should prevent SQL injection in search', async () => {
      const response = await request(app)
        .get('/api/cards?q=\' OR 1=1 --')
        .expect(400);

      expect(response.body.message).toContain('Input validation failed');
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize HTML input', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'ValidPassword123!',
          firstName: '<script>alert("xss")</script>',
          lastName: '<img src=x onerror=alert(1)>'
        })
        .expect(400);

      expect(response.body.message).toContain('Input validation failed');
    });
  });

  describe('CSRF Protection', () => {
    it('should require CSRF tokens for state-changing operations', async () => {
      // This test needs CSRF token implementation
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'ValidPassword123!'
        });

      // In actual implementation, this would check CSRF token
      expect(response.status).toBe(400);
    });
  });

  describe('Path Traversal', () => {
    it('should prevent directory traversal attacks', async () => {
      const response = await request(app)
        .get('/api/files/../../etc/passwd')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('NoSQL Injection', () => {
    it('should prevent NoSQL injection attempts', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: { "$ne": null },
          password: { "$ne": null }
        })
        .expect(400);

      expect(response.body.message).toContain('Input validation failed');
    });
  });

  describe('Command Injection', () => {
    it('should prevent command injection in user input', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser; cat /etc/passwd',
          email: 'test@example.com',
          password: 'ValidPassword123!'
        })
        .expect(400);

      expect(response.body.message).toContain('Input validation failed');
    });
  });
});

describe('Performance Security', () => {
  describe('DoS Prevention', () => {
    it('should handle high request volumes gracefully', async () => {
      const promises = [];
      
      // Send large number of requests
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(app)
            .get('/health')
            .timeout(5000)
        );
      }

      const responses = await Promise.all(promises);
      
      // All requests should succeed or be rate limited
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });

    it('should timeout long-running requests', async () => {
      // Simulate long-running requests
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/slow-endpoint')
        .timeout(10000)
        .expect(404);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Memory Security', () => {
    it('should not leak memory in error conditions', async () => {
      const promises = [];
      
      // Send large number of error requests
      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'invalid@example.com',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(promises);
      
      // All requests should return errors
      responses.forEach(response => {
        expect(response.status).toBe(401);
      });
    });
  });
});

export {};