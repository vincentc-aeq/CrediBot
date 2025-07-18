import { UserRepository } from "../repositories/UserRepository";
import { User, CreateUserData, UserWithoutPassword } from "../models/User";
import { PasswordUtils } from "../utils/password";
import { JwtUtils, TokenPair } from "../utils/jwt";
import redisClient from "../database/redis";
import { defaultUserPreferences } from "../models/User";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  user: UserWithoutPassword;
  tokens: TokenPair;
}

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async register(userData: CreateUserData): Promise<AuthResult> {
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error("Email already registered");
    }

    const passwordValidation = PasswordUtils.validatePassword(userData.password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(", ")}`);
    }

    const passwordHash = await PasswordUtils.hashPassword(userData.password);
    
    const newUser: Omit<User, "id" | "createdAt" | "updatedAt"> = {
      email: userData.email.toLowerCase().trim(),
      passwordHash,
      firstName: userData.firstName.trim(),
      lastName: userData.lastName.trim(),
      preferences: { ...defaultUserPreferences, ...userData.preferences },
      isActive: true,
      emailVerifiedAt: null,
      lastLoginAt: null,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null
    };

    const user = await this.userRepository.create(newUser);
    const tokens = JwtUtils.generateTokenPair(user);

    await this.updateRefreshToken(user.id, tokens.refreshToken);

    const userWithoutPassword = this.excludePassword(user);
    
    return {
      user: userWithoutPassword,
      tokens
    };
  }

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    const user = await this.userRepository.findByEmail(credentials.email);
    if (!user) {
      throw new Error("Invalid credentials");
    }

    if (!user.isActive) {
      throw new Error("Account is deactivated");
    }

    const isPasswordValid = await PasswordUtils.verifyPassword(
      credentials.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    const tokens = JwtUtils.generateTokenPair(user);

    await this.updateRefreshToken(user.id, tokens.refreshToken);
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date()
    });

    const userWithoutPassword = this.excludePassword(user);

    return {
      user: userWithoutPassword,
      tokens
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = JwtUtils.verifyRefreshToken(refreshToken);
      const user = await this.userRepository.findById(payload.userId);
      
      if (!user || !user.isActive) {
        throw new Error("Invalid refresh token");
      }

      const isRefreshTokenValid = await PasswordUtils.verifyPassword(
        refreshToken,
        user.refreshTokenHash || ""
      );

      if (!isRefreshTokenValid) {
        throw new Error("Invalid refresh token");
      }

      if (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt < new Date()) {
        throw new Error("Refresh token expired");
      }

      const tokens = JwtUtils.generateTokenPair(user);
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch (error) {
      throw new Error("Invalid refresh token");
    }
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    await this.userRepository.update(userId, {
      refreshTokenHash: null,
      refreshTokenExpiresAt: null
    });

    if (refreshToken) {
      await this.blacklistToken(refreshToken);
    }
  }

  async validateAccessToken(token: string): Promise<UserWithoutPassword> {
    try {
      const payload = JwtUtils.verifyAccessToken(token);
      
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new Error("Token blacklisted");
      }

      const user = await this.userRepository.findById(payload.userId);
      if (!user || !user.isActive) {
        throw new Error("Invalid token");
      }

      return this.excludePassword(user);
    } catch (error) {
      throw new Error("Invalid access token");
    }
  }

  private async updateRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const refreshTokenHash = await PasswordUtils.hashPassword(refreshToken);
    const refreshTokenExpiresAt = JwtUtils.getTokenExpiryDate(refreshToken);

    await this.userRepository.update(userId, {
      refreshTokenHash,
      refreshTokenExpiresAt
    });
  }

  private async blacklistToken(token: string): Promise<void> {
    const expiryDate = JwtUtils.getTokenExpiryDate(token);
    const ttl = Math.floor((expiryDate.getTime() - Date.now()) / 1000);
    
    if (ttl > 0) {
      await redisClient.setEx(`blacklist:${token}`, ttl, "1");
    }
  }

  private async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await redisClient.get(`blacklist:${token}`);
    return result !== null;
  }

  private excludePassword(user: User): UserWithoutPassword {
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}