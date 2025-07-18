import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import request from "supertest";
import { app } from "../app";
import { UserRepository } from "../repositories/UserRepository";
import { PasswordUtils } from "../utils/password";
import { JWTUtils } from "../utils/jwt";
import { SessionManager } from "../middleware/session";
import { User } from "../models/User";
import { redisClient } from "../config/redis";

// Mock dependencies
jest.mock("../repositories/UserRepository");
jest.mock("../utils/password");
jest.mock("../utils/jwt");
jest.mock("../middleware/session");

const mockUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;
const mockPasswordUtils = PasswordUtils as jest.MockedClass<typeof PasswordUtils>;
const mockJWTUtils = JWTUtils as jest.MockedClass<typeof JWTUtils>;
const mockSessionManager = SessionManager as jest.MockedClass<typeof SessionManager>;

describe("Authentication Service", () => {
  let userRepository: jest.Mocked<UserRepository>;
  let sessionManager: jest.Mocked<SessionManager>;

  beforeEach(() => {
    userRepository = new mockUserRepository() as jest.Mocked<UserRepository>;
    sessionManager = new mockSessionManager() as jest.Mocked<SessionManager>;
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clear Redis cache between tests
    await redisClient.flushdb();
  });

  describe("User Registration", () => {
    const validUserData = {
      email: "test@example.com",
      password: "SecurePass123!",
      firstName: "John",
      lastName: "Doe",
    };

    it("should register a new user successfully", async () => {
      // Mock password hashing
      mockPasswordUtils.hashPassword.mockResolvedValue("hashedPassword123");
      mockPasswordUtils.validatePassword.mockReturnValue(true);
      
      // Mock user creation
      const mockUser: User = {
        id: "user-123",
        email: validUserData.email,
        passwordHash: "hashedPassword123",
        firstName: validUserData.firstName,
        lastName: validUserData.lastName,
        preferences: {
          cardTypes: [],
          maxAnnualFee: 500,
          excludedCards: [],
          notificationSettings: {
            transactionAlerts: true,
            homepageRecommendations: true,
            optimizationSuggestions: true,
            emailNotifications: true,
            pushNotifications: false,
          },
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      userRepository.findByEmail.mockResolvedValue(undefined);
      userRepository.createUser.mockResolvedValue(mockUser);

      const response = await request(app)
        .post("/api/auth/register")
        .send(validUserData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(validUserData.email);
      expect(response.body.data.user.passwordHash).toBeUndefined();
      expect(mockPasswordUtils.hashPassword).toHaveBeenCalledWith(validUserData.password);
      expect(userRepository.createUser).toHaveBeenCalled();
    });

    it("should reject registration with existing email", async () => {
      const existingUser: User = {
        id: "existing-user",
        email: validUserData.email,
        passwordHash: "existingHash",
        firstName: "Existing",
        lastName: "User",
        preferences: {
          cardTypes: [],
          maxAnnualFee: 500,
          excludedCards: [],
          notificationSettings: {
            transactionAlerts: true,
            homepageRecommendations: true,
            optimizationSuggestions: true,
            emailNotifications: true,
            pushNotifications: false,
          },
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      userRepository.findByEmail.mockResolvedValue(existingUser);

      const response = await request(app)
        .post("/api/auth/register")
        .send(validUserData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("USER_ALREADY_EXISTS");
    });

    it("should reject weak passwords", async () => {
      mockPasswordUtils.validatePassword.mockReturnValue(false);

      const weakPasswordData = {
        ...validUserData,
        password: "weak",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(weakPasswordData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("INVALID_PASSWORD");
    });

    it("should validate required fields", async () => {
      const incompleteData = {
        email: "test@example.com",
        // Missing password, firstName, lastName
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("User Login", () => {
    const loginData = {
      email: "test@example.com",
      password: "SecurePass123!",
    };

    const mockUser: User = {
      id: "user-123",
      email: loginData.email,
      passwordHash: "hashedPassword123",
      firstName: "John",
      lastName: "Doe",
      preferences: {
        cardTypes: [],
        maxAnnualFee: 500,
        excludedCards: [],
        notificationSettings: {
          transactionAlerts: true,
          homepageRecommendations: true,
          optimizationSuggestions: true,
          emailNotifications: true,
          pushNotifications: false,
        },
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should login successfully with valid credentials", async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordUtils.comparePassword.mockResolvedValue(true);
      mockJWTUtils.generateAccessToken.mockReturnValue("access-token");
      mockJWTUtils.generateRefreshToken.mockReturnValue("refresh-token");
      sessionManager.createSession.mockResolvedValue("session-id");

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBe("access-token");
      expect(response.body.data.refreshToken).toBe("refresh-token");
      expect(mockPasswordUtils.comparePassword).toHaveBeenCalledWith(
        loginData.password,
        mockUser.passwordHash
      );
      expect(sessionManager.createSession).toHaveBeenCalledWith(mockUser.id);
    });

    it("should reject login with invalid email", async () => {
      userRepository.findByEmail.mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("should reject login with invalid password", async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordUtils.comparePassword.mockResolvedValue(false);

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("should reject login for inactive user", async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      userRepository.findByEmail.mockResolvedValue(inactiveUser);

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("ACCOUNT_INACTIVE");
    });
  });

  describe("Token Refresh", () => {
    it("should refresh access token with valid refresh token", async () => {
      const refreshToken = "valid-refresh-token";
      const mockPayload = { userId: "user-123", type: "refresh" };

      mockJWTUtils.verifyToken.mockReturnValue(mockPayload);
      mockJWTUtils.generateAccessToken.mockReturnValue("new-access-token");
      userRepository.findById.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        passwordHash: "hash",
        firstName: "John",
        lastName: "Doe",
        preferences: {
          cardTypes: [],
          maxAnnualFee: 500,
          excludedCards: [],
          notificationSettings: {
            transactionAlerts: true,
            homepageRecommendations: true,
            optimizationSuggestions: true,
            emailNotifications: true,
            pushNotifications: false,
          },
        },
        isActive: true,
        refreshTokenHash: "hashed-refresh-token",
        refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBe("new-access-token");
    });

    it("should reject invalid refresh token", async () => {
      const invalidToken = "invalid-token";
      mockJWTUtils.verifyToken.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: invalidToken });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("INVALID_TOKEN");
    });
  });

  describe("User Profile", () => {
    it("should get user profile with valid token", async () => {
      const accessToken = "valid-access-token";
      const mockPayload = { userId: "user-123", type: "access" };
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        preferences: {
          cardTypes: [],
          maxAnnualFee: 500,
          excludedCards: [],
          notificationSettings: {
            transactionAlerts: true,
            homepageRecommendations: true,
            optimizationSuggestions: true,
            emailNotifications: true,
            pushNotifications: false,
          },
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockJWTUtils.verifyToken.mockReturnValue(mockPayload);
      userRepository.findByEmailWithoutPassword.mockResolvedValue(mockUser);

      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(mockUser.email);
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it("should reject request without authorization header", async () => {
      const response = await request(app).get("/api/auth/profile");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("MISSING_TOKEN");
    });
  });

  describe("Logout", () => {
    it("should logout successfully", async () => {
      const accessToken = "valid-access-token";
      const mockPayload = { userId: "user-123", type: "access" };

      mockJWTUtils.verifyToken.mockReturnValue(mockPayload);
      sessionManager.destroySession.mockResolvedValue(true);

      const response = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(sessionManager.destroySession).toHaveBeenCalledWith("user-123");
    });
  });
});