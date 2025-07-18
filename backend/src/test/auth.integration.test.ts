import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "@jest/globals";
import request from "supertest";
import { app } from "../app";
import { knex } from "../config/database";
import { redisClient } from "../config/redis";
import { User } from "../models/User";
import { PasswordUtils } from "../utils/password";

describe("Authentication Integration Tests", () => {
  let server: any;
  let testUser: User;

  beforeAll(async () => {
    // Start server for integration tests
    server = app.listen(0);
    
    // Run migrations
    await knex.migrate.latest();
  });

  afterAll(async () => {
    // Close server and database connections
    if (server) {
      server.close();
    }
    await knex.destroy();
    await redisClient.disconnect();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await knex("users").del();
    await redisClient.flushdb();
  });

  afterEach(async () => {
    // Clean up after each test
    await knex("users").del();
    await redisClient.flushdb();
  });

  describe("Complete Authentication Flow", () => {
    const userData = {
      email: "integration@test.com",
      password: "SecurePass123!",
      firstName: "Integration",
      lastName: "Test",
    };

    it("should complete full registration -> login -> profile -> logout flow", async () => {
      // 1. Register user
      const registerResponse = await request(app)
        .post("/api/auth/register")
        .send(userData);

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.email).toBe(userData.email);

      // Verify user was created in database
      const createdUser = await knex("users")
        .where({ email: userData.email })
        .first();
      expect(createdUser).toBeDefined();
      expect(createdUser.email).toBe(userData.email);

      // 2. Login with registered user
      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({
          email: userData.email,
          password: userData.password,
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.accessToken).toBeDefined();
      expect(loginResponse.body.data.refreshToken).toBeDefined();

      const { accessToken, refreshToken } = loginResponse.body.data;

      // Verify session was created in Redis
      const sessionKeys = await redisClient.keys("session:*");
      expect(sessionKeys.length).toBe(1);

      // 3. Get user profile with access token
      const profileResponse = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.user.email).toBe(userData.email);
      expect(profileResponse.body.data.user.passwordHash).toBeUndefined();

      // 4. Refresh access token
      const refreshResponse = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data.accessToken).toBeDefined();

      // 5. Update profile
      const profileUpdateResponse = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          firstName: "Updated",
          lastName: "Name",
        });

      expect(profileUpdateResponse.status).toBe(200);
      expect(profileUpdateResponse.body.success).toBe(true);
      expect(profileUpdateResponse.body.data.user.firstName).toBe("Updated");
      expect(profileUpdateResponse.body.data.user.lastName).toBe("Name");

      // 6. Logout
      const logoutResponse = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.success).toBe(true);

      // Verify session was destroyed
      const sessionKeysAfterLogout = await redisClient.keys("session:*");
      expect(sessionKeysAfterLogout.length).toBe(0);
    });

    it("should handle concurrent login attempts", async () => {
      // First register a user
      await request(app)
        .post("/api/auth/register")
        .send(userData);

      // Make multiple concurrent login requests
      const loginPromises = Array.from({ length: 5 }, () =>
        request(app)
          .post("/api/auth/login")
          .send({
            email: userData.email,
            password: userData.password,
          })
      );

      const responses = await Promise.all(loginPromises);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Should have multiple sessions
      const sessionKeys = await redisClient.keys("session:*");
      expect(sessionKeys.length).toBe(5);
    });

    it("should enforce rate limiting on login attempts", async () => {
      // Register a user first
      await request(app)
        .post("/api/auth/register")
        .send(userData);

      // Make 6 login attempts (rate limit is 5 per 15 minutes)
      const loginAttempts = [];
      for (let i = 0; i < 6; i++) {
        const response = await request(app)
          .post("/api/auth/login")
          .send({
            email: userData.email,
            password: "wrong-password",
          });
        loginAttempts.push(response);
      }

      // First 5 should return 401 (invalid credentials)
      for (let i = 0; i < 5; i++) {
        expect(loginAttempts[i].status).toBe(401);
        expect(loginAttempts[i].body.error.code).toBe("INVALID_CREDENTIALS");
      }

      // 6th should be rate limited
      expect(loginAttempts[5].status).toBe(429);
      expect(loginAttempts[5].body.error.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("Token Expiration and Refresh", () => {
    let userData: any;
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      userData = {
        email: "token-test@example.com",
        password: "SecurePass123!",
        firstName: "Token",
        lastName: "Test",
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
      refreshToken = loginResponse.body.data.refreshToken;
    });

    it("should refresh token successfully", async () => {
      const refreshResponse = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data.accessToken).toBeDefined();
      expect(refreshResponse.body.data.accessToken).not.toBe(accessToken);
    });

    it("should reject expired or invalid refresh token", async () => {
      const invalidRefreshResponse = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: "invalid-token" });

      expect(invalidRefreshResponse.status).toBe(401);
      expect(invalidRefreshResponse.body.success).toBe(false);
      expect(invalidRefreshResponse.body.error.code).toBe("INVALID_TOKEN");
    });

    it("should handle refresh token reuse", async () => {
      // Use refresh token once
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
  });

  describe("Session Management", () => {
    let userData: any;
    let accessToken: string;

    beforeEach(async () => {
      userData = {
        email: "session-test@example.com",
        password: "SecurePass123!",
        firstName: "Session",
        lastName: "Test",
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
    });

    it("should maintain session across multiple requests", async () => {
      // Make multiple profile requests
      for (let i = 0; i < 3; i++) {
        const profileResponse = await request(app)
          .get("/api/auth/profile")
          .set("Authorization", `Bearer ${accessToken}`);

        expect(profileResponse.status).toBe(200);
        expect(profileResponse.body.success).toBe(true);
      }

      // Session should still exist
      const sessionKeys = await redisClient.keys("session:*");
      expect(sessionKeys.length).toBe(1);
    });

    it("should handle session cleanup on logout", async () => {
      // Verify session exists
      let sessionKeys = await redisClient.keys("session:*");
      expect(sessionKeys.length).toBe(1);

      // Logout
      const logoutResponse = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(logoutResponse.status).toBe(200);

      // Verify session is cleaned up
      sessionKeys = await redisClient.keys("session:*");
      expect(sessionKeys.length).toBe(0);

      // Subsequent requests should fail
      const profileResponse = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(profileResponse.status).toBe(401);
    });
  });

  describe("Password Security", () => {
    it("should reject weak passwords during registration", async () => {
      const weakPasswords = [
        "123456",
        "password",
        "abc123",
        "qwerty",
        "12345678",
        "NoSpecialChar123",
        "nouppercasechar123!",
        "NOLOWERCASECHAR123!",
        "NoNumber!",
        "Sh0rt!",
      ];

      for (const weakPassword of weakPasswords) {
        const response = await request(app)
          .post("/api/auth/register")
          .send({
            email: "weak@test.com",
            password: weakPassword,
            firstName: "Weak",
            lastName: "Password",
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe("INVALID_PASSWORD");
      }
    });

    it("should accept strong passwords", async () => {
      const strongPasswords = [
        "SecurePass123!",
        "AnotherGoodOne456@",
        "VeryStrong789#",
        "ComplexPassword012$",
      ];

      for (const strongPassword of strongPasswords) {
        const response = await request(app)
          .post("/api/auth/register")
          .send({
            email: `strong-${Date.now()}@test.com`,
            password: strongPassword,
            firstName: "Strong",
            lastName: "Password",
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);

        // Clean up
        await knex("users").where({ email: response.body.data.user.email }).del();
      }
    });

    it("should properly hash passwords", async () => {
      const userData = {
        email: "hash-test@example.com",
        password: "SecurePass123!",
        firstName: "Hash",
        lastName: "Test",
      };

      await request(app)
        .post("/api/auth/register")
        .send(userData);

      // Check that password is hashed in database
      const user = await knex("users")
        .where({ email: userData.email })
        .first();

      expect(user.password_hash).toBeDefined();
      expect(user.password_hash).not.toBe(userData.password);
      expect(user.password_hash.startsWith("$2b$")).toBe(true);

      // Verify password can be compared
      const isValid = await PasswordUtils.comparePassword(
        userData.password,
        user.password_hash
      );
      expect(isValid).toBe(true);
    });
  });
});