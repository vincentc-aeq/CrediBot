import jwt from "jsonwebtoken";
import { User } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_ACCESS_TOKEN_EXPIRY = "15m";
const JWT_REFRESH_TOKEN_EXPIRY = "7d";

export interface JwtPayload {
  userId: string;
  email: string;
  tokenType: "access" | "refresh";
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class JwtUtils {
  static generateAccessToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      tokenType: "access"
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_ACCESS_TOKEN_EXPIRY,
      issuer: "credibot-api",
      audience: "credibot-client"
    });
  }

  static generateRefreshToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      tokenType: "refresh"
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_REFRESH_TOKEN_EXPIRY,
      issuer: "credibot-api",
      audience: "credibot-client"
    });
  }

  static generateTokenPair(user: User): TokenPair {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user)
    };
  }

  static verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: "credibot-api",
        audience: "credibot-client"
      }) as JwtPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error("Token expired");
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error("Invalid token");
      }
      throw new Error("Token verification failed");
    }
  }

  static verifyAccessToken(token: string): JwtPayload {
    const decoded = this.verifyToken(token);
    
    if (decoded.tokenType !== "access") {
      throw new Error("Invalid token type");
    }

    return decoded;
  }

  static verifyRefreshToken(token: string): JwtPayload {
    const decoded = this.verifyToken(token);
    
    if (decoded.tokenType !== "refresh") {
      throw new Error("Invalid token type");
    }

    return decoded;
  }

  static getTokenExpiryDate(token: string): Date {
    try {
      const decoded = jwt.decode(token) as any;
      return new Date(decoded.exp * 1000);
    } catch (error) {
      throw new Error("Failed to decode token");
    }
  }

  static isTokenExpired(token: string): boolean {
    try {
      const expiryDate = this.getTokenExpiryDate(token);
      return expiryDate < new Date();
    } catch (error) {
      return true;
    }
  }
}