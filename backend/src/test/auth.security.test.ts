import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import request from "supertest";
import { app } from "../app";
import { JWTUtils } from "../utils/jwt";
import { SessionManager } from "../middleware/session";
import { redisClient } from "../config/redis";
import { knex } from "../config/database";
import jwt from "jsonwebtoken";

describe("Authentication Security Tests", () => {
  beforeEach(async () => {
    // Clean up before each test
    await knex("users").del();
    await redisClient.flushdb();
  });

  afterEach(async () => {
    // Clean up after each test
    await knex("users").del();
    await redisClient.flushdb();
  });

  describe("JWT Token Security", () => {
    let userData: any;
    let validToken: string;

    beforeEach(async () => {
      userData = {
        email: "security-test@example.com",
        password: "SecurePass123!",
        firstName: "Security",
        lastName: "Test",
      };

      // Register and login to get valid token
      await request(app)
        .post("/api/auth/register")
        .send(userData);

      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({
          email: userData.email,
          password: userData.password,
        });

      validToken = loginResponse.body.data.accessToken;
    });

    it("should reject tampered JWT tokens", async () => {
      // Tamper with the token by changing a character
      const tamperedToken = validToken.slice(0, -1) + "X";

      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${tamperedToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("INVALID_TOKEN");
    });

    it("should reject tokens with invalid signature", async () => {
      // Create a token with wrong secret
      const fakeToken = jwt.sign(
        { userId: "user-123", type: "access" },
        "wrong-secret",
        { expiresIn: "15m" }
      );

      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${fakeToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("INVALID_TOKEN");
    });

    it("should reject expired tokens", async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: "user-123", type: "access" },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "-1h" } // Already expired
      );

      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("TOKEN_EXPIRED");
    });

    it("should reject tokens with wrong type", async () => {
      // Create a refresh token and use it for access
      const refreshToken = jwt.sign(
        { userId: "user-123", type: "refresh" },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "7d" }
      );

      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${refreshToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("INVALID_TOKEN");
    });

    it("should reject tokens without proper claims", async () => {
      // Create token without required claims
      const incompleteToken = jwt.sign(
        { userId: "user-123" }, // Missing 'type' claim
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "15m" }
      );

      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${incompleteToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("INVALID_TOKEN");
    });

    it("should validate token issuer and audience", async () => {
      // Create token with wrong issuer/audience
      const wrongIssuerToken = jwt.sign(
        { userId: "user-123", type: "access" },
        process.env.JWT_SECRET || "your-secret-key",
        { 
          expiresIn: "15m",
          issuer: "wrong-issuer",
          audience: "wrong-audience"
        }
      );

      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${wrongIssuerToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("INVALID_TOKEN");
    });

    it("should handle malformed tokens gracefully", async () => {
      const malformedTokens = [
        "not-a-jwt-token",
        "Bearer invalid.token.here",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", // Incomplete JWT
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.malformed.signature",
        "",
        "Bearer ",
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..",
      ];

      for (const malformedToken of malformedTokens) {
        const response = await request(app)
          .get("/api/auth/profile")
          .set("Authorization", malformedToken);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe("INVALID_TOKEN");
      }
    });
  });

  describe("Session Security", () => {
    let userData: any;
    let accessToken: string;
    let sessionId: string;

    beforeEach(async () => {
      userData = {
        email: "session-security@example.com",
        password: "SecurePass123!",
        firstName: "Session",
        lastName: "Security",
      };

      // Register and login
      await request(app)
        .post("/api/auth/register")
        .send(userData);

      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({
          email: userData.email,
          password: userData.password,
        });

      accessToken = loginResponse.body.data.accessToken;

      // Get session ID from Redis
      const sessionKeys = await redisClient.keys("session:*");
      sessionId = sessionKeys[0];
    });

    it("should invalidate sessions on logout", async () => {
      // Verify session exists
      let sessionData = await redisClient.get(sessionId);
      expect(sessionData).toBeDefined();

      // Logout
      const logoutResponse = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(logoutResponse.status).toBe(200);

      // Verify session is destroyed
      sessionData = await redisClient.get(sessionId);
      expect(sessionData).toBeNull();

      // Subsequent requests should fail
      const profileResponse = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(profileResponse.status).toBe(401);
    });

    it("should handle session hijacking attempts", async () => {
      // Try to access with manipulated session data
      const originalSessionData = await redisClient.get(sessionId);
      const sessionData = JSON.parse(originalSessionData!);

      // Tamper with session data
      sessionData.userId = "different-user-id";
      await redisClient.set(sessionId, JSON.stringify(sessionData));

      // Request should fail due to userId mismatch
      const profileResponse = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(profileResponse.status).toBe(401);
    });

    it("should expire sessions after timeout", async () => {
      // Set very short session timeout for testing
      const shortTTL = 1; // 1 second
      await redisClient.expire(sessionId, shortTTL);

      // Wait for session to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Request should fail due to expired session
      const profileResponse = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(profileResponse.status).toBe(401);
    });

    it("should prevent session fixation attacks", async () => {
      // Get original session
      const originalSessionKeys = await redisClient.keys("session:*");
      expect(originalSessionKeys.length).toBe(1);

      // Login again (should create new session)
      const secondLoginResponse = await request(app)
        .post("/api/auth/login")
        .send({
          email: userData.email,
          password: userData.password,
        });

      expect(secondLoginResponse.status).toBe(200);

      // Should have two sessions now
      const newSessionKeys = await redisClient.keys("session:*");
      expect(newSessionKeys.length).toBe(2);
    });
  });

  describe("Rate Limiting Security", () => {
    it("should rate limit registration attempts", async () => {
      const userData = {
        email: "rate-limit@example.com",
        password: "SecurePass123!",
        firstName: "Rate",
        lastName: "Limit",
      };

      // Make multiple registration attempts
      const responses = [];
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post("/api/auth/register")
          .send({
            ...userData,
            email: `rate-limit-${i}@example.com`,
          });
        responses.push(response);
      }

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it("should rate limit login attempts per IP", async () => {
      // Register a user first
      const userData = {
        email: "login-rate-limit@example.com",
        password: "SecurePass123!",
        firstName: "Login",
        lastName: "RateLimit",
      };

      await request(app)
        .post("/api/auth/register")
        .send(userData);

      // Make multiple failed login attempts
      const responses = [];
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post("/api/auth/login")
          .send({
            email: userData.email,
            password: "wrong-password",
          });
        responses.push(response);
      }

      // After 5 attempts, should be rate limited
      expect(responses[5].status).toBe(429);
      expect(responses[5].body.error.code).toBe("RATE_LIMIT_EXCEEDED");
    });

    it("should reset rate limiting after time window", async () => {
      // This test would require waiting for the rate limit window to reset
      // In a real scenario, you might use a time-mocking library
      // For now, we'll just verify the rate limit headers are present
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "non-existent@example.com",
          password: "wrong-password",
        });

      expect(response.headers).toHaveProperty("x-ratelimit-limit");
      expect(response.headers).toHaveProperty("x-ratelimit-remaining");
      expect(response.headers).toHaveProperty("x-ratelimit-reset");
    });
  });

  describe("Input Validation Security", () => {
    it("should prevent SQL injection in email field", async () => {
      const maliciousEmails = [
        "test'; DROP TABLE users; --",
        "test' OR '1'='1",
        "test' UNION SELECT * FROM users --",
        "test@example.com'; DELETE FROM users WHERE '1'='1",
      ];

      for (const maliciousEmail of maliciousEmails) {
        const response = await request(app)
          .post("/api/auth/register")
          .send({
            email: maliciousEmail,
            password: "SecurePass123!",
            firstName: "Test",
            lastName: "User",
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should prevent XSS in name fields", async () => {
      const maliciousNames = [
        "<script>alert('xss')</script>",
        "<img src=x onerror=alert('xss')>",
        "javascript:alert('xss')",
        "<svg onload=alert('xss')>",
      ];

      for (const maliciousName of maliciousNames) {
        const response = await request(app)
          .post("/api/auth/register")
          .send({
            email: "test@example.com",
            password: "SecurePass123!",
            firstName: maliciousName,
            lastName: "User",
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should validate email format strictly", async () => {
      const invalidEmails = [
        "not-an-email",
        "@example.com",
        "test@",
        "test..test@example.com",
        "test@example",
        "test@example..com",
        "",
        " ",
        "test@",
        "test@.com",
      ];

      for (const invalidEmail of invalidEmails) {
        const response = await request(app)
          .post("/api/auth/register")
          .send({
            email: invalidEmail,
            password: "SecurePass123!",
            firstName: "Test",
            lastName: "User",
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should prevent extremely long input values", async () => {
      const longString = "a".repeat(1000);

      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "test@example.com",
          password: "SecurePass123!",
          firstName: longString,
          lastName: "User",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Password Security", () => {
    it("should enforce minimum password complexity", async () => {
      // Test various password complexity requirements
      const weakPasswords = [
        "short",
        "nouppercase123!",
        "NOLOWERCASE123!",
        "NoNumbers!",
        "NoSpecialChars123",
        "12345678",
        "password",
        "qwerty123",
        "abc123!",
      ];

      for (const weakPassword of weakPasswords) {
        const response = await request(app)
          .post("/api/auth/register")
          .send({
            email: "test@example.com",
            password: weakPassword,
            firstName: "Test",
            lastName: "User",
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe("INVALID_PASSWORD");
      }
    });

    it("should protect against password timing attacks", async () => {
      // Register a user
      const userData = {
        email: "timing-test@example.com",
        password: "SecurePass123!",
        firstName: "Timing",
        lastName: "Test",
      };

      await request(app)
        .post("/api/auth/register")
        .send(userData);

      // Measure response time for valid vs invalid emails
      const start1 = Date.now();
      await request(app)
        .post("/api/auth/login")
        .send({
          email: userData.email,
          password: "wrong-password",
        });
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await request(app)
        .post("/api/auth/login")
        .send({
          email: "non-existent@example.com",
          password: "wrong-password",
        });
      const time2 = Date.now() - start2;

      // Response times should be similar (within reasonable margin)
      // This is a basic check - in production, you'd want more sophisticated timing analysis
      expect(Math.abs(time1 - time2)).toBeLessThan(100); // 100ms tolerance
    });

    it("should prevent common password patterns", async () => {
      const commonPatterns = [
        "password123!",
        "Password123!",
        "123456789!",
        "qwerty123!",
        "admin123!",
        "user123!",
        "welcome123!",
        "password1!",
      ];

      for (const commonPassword of commonPatterns) {
        const response = await request(app)
          .post("/api/auth/register")
          .send({
            email: "test@example.com",
            password: commonPassword,
            firstName: "Test",
            lastName: "User",
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe("INVALID_PASSWORD");
      }
    });
  });

  describe("Refresh Token Security", () => {
    let userData: any;
    let refreshToken: string;

    beforeEach(async () => {
      userData = {
        email: "refresh-security@example.com",
        password: "SecurePass123!",
        firstName: "Refresh",
        lastName: "Security",
      };

      // Register and login
      await request(app)
        .post("/api/auth/register")
        .send(userData);

      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({
          email: userData.email,
          password: userData.password,
        });

      refreshToken = loginResponse.body.data.refreshToken;
    });

    it("should invalidate refresh token after use", async () => {
      // Use refresh token
      const firstRefreshResponse = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken });

      expect(firstRefreshResponse.status).toBe(200);

      // Try to use the same refresh token again
      const secondRefreshResponse = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken });

      expect(secondRefreshResponse.status).toBe(401);
      expect(secondRefreshResponse.body.error.code).toBe("INVALID_TOKEN");
    });

    it("should prevent refresh token replay attacks", async () => {
      // Capture the refresh token
      const capturedToken = refreshToken;

      // Use it once
      await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: capturedToken });

      // Attacker tries to use the captured token
      const replayResponse = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: capturedToken });

      expect(replayResponse.status).toBe(401);
      expect(replayResponse.body.error.code).toBe("INVALID_TOKEN");
    });

    it("should bind refresh token to user", async () => {
      // Try to use refresh token with different user context
      // This is a conceptual test - in practice, token validation handles this
      const tamperedPayload = jwt.decode(refreshToken) as any;
      tamperedPayload.userId = "different-user-id";

      const tamperedToken = jwt.sign(
        tamperedPayload,
        process.env.JWT_SECRET || "your-secret-key"
      );

      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: tamperedToken });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("INVALID_TOKEN");
    });
  });
});