import { Request, Response, NextFunction } from "express";
import redisClient from "../database/redis";
import { randomUUID } from "crypto";

export interface SessionData {
  userId?: string;
  loginAttempts?: number;
  lastLoginAttempt?: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  lastAccessed: Date;
  expiresAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      session?: SessionData;
      sessionId?: string;
    }
  }
}

export class SessionManager {
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly SESSION_COOKIE_NAME = "session_id";

  static async createSession(
    req: Request,
    res: Response,
    userId?: string
  ): Promise<string> {
    const sessionId = randomUUID();
    const now = new Date();
    
    const sessionData: SessionData = {
      userId,
      loginAttempts: 0,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      createdAt: now,
      lastAccessed: now,
      expiresAt: new Date(now.getTime() + this.SESSION_DURATION)
    };

    await redisClient.setSession(
      sessionId,
      sessionData,
      Math.floor(this.SESSION_DURATION / 1000)
    );

    res.cookie(this.SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: this.SESSION_DURATION
    });

    return sessionId;
  }

  static async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const sessionData = await redisClient.get(`session:${sessionId}`);
      if (!sessionData) {
        return null;
      }

      // Check if sessionData is already a string and valid JSON
      let session: SessionData;
      try {
        if (typeof sessionData === 'string') {
          session = JSON.parse(sessionData) as SessionData;
        } else {
          // If it's already an object, use it directly
          session = sessionData as SessionData;
        }
      } catch (error) {
        console.error('Failed to parse session data:', error, 'Data:', sessionData);
        // Try to handle corrupted session data
        await this.destroySession(sessionId);
        return null;
      }
      
      if (new Date(session.expiresAt) < new Date()) {
        await this.destroySession(sessionId);
        return null;
      }

      return session;
    } catch (error) {
      console.error("Error getting session:", error);
      return null;
    }
  }

  static async updateSession(
    sessionId: string,
    updates: Partial<SessionData>
  ): Promise<void> {
    try {
      const currentSession = await this.getSession(sessionId);
      if (!currentSession) {
        return;
      }

      const updatedSession = {
        ...currentSession,
        ...updates,
        lastAccessed: new Date()
      };

      const ttl = Math.floor(
        (new Date(updatedSession.expiresAt).getTime() - Date.now()) / 1000
      );

      if (ttl > 0) {
        await redisClient.set(
          `session:${sessionId}`,
          JSON.stringify(updatedSession),
          ttl
        );
      }
    } catch (error) {
      console.error("Error updating session:", error);
    }
  }

  static async destroySession(sessionId: string): Promise<void> {
    try {
      await redisClient.del(`session:${sessionId}`);
    } catch (error) {
      console.error("Error destroying session:", error);
    }
  }

  static async extendSession(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return;
      }

      const newExpiresAt = new Date(Date.now() + this.SESSION_DURATION);
      await this.updateSession(sessionId, { expiresAt: newExpiresAt });
    } catch (error) {
      console.error("Error extending session:", error);
    }
  }

  static middleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.cookies[this.SESSION_COOKIE_NAME];
      
      if (sessionId) {
        const session = await this.getSession(sessionId);
        if (session) {
          req.session = session;
          req.sessionId = sessionId;
          
          await this.updateSession(sessionId, {
            lastAccessed: new Date(),
            ipAddress: req.ip,
            userAgent: req.get("User-Agent")
          });
          
          await this.extendSession(sessionId);
        }
      }

      if (!req.session) {
        const newSessionId = await this.createSession(req, res);
        req.sessionId = newSessionId;
        req.session = await this.getSession(newSessionId);
      }

      next();
    } catch (error) {
      console.error("Session middleware error:", error);
      next();
    }
  };

  static async trackLoginAttempt(req: Request): Promise<void> {
    if (!req.sessionId) {
      return;
    }

    const currentAttempts = req.session?.loginAttempts || 0;
    await this.updateSession(req.sessionId, {
      loginAttempts: currentAttempts + 1,
      lastLoginAttempt: new Date()
    });
  }

  static async resetLoginAttempts(req: Request): Promise<void> {
    if (!req.sessionId) {
      return;
    }

    await this.updateSession(req.sessionId, {
      loginAttempts: 0,
      lastLoginAttempt: undefined
    });
  }

  static async isAccountLocked(req: Request): Promise<boolean> {
    if (!req.session) {
      return false;
    }

    const maxAttempts = 5;
    const lockoutDuration = 15 * 60 * 1000; // 15 minutes

    if (req.session.loginAttempts >= maxAttempts) {
      const timeSinceLastAttempt = req.session.lastLoginAttempt
        ? Date.now() - new Date(req.session.lastLoginAttempt).getTime()
        : 0;

      return timeSinceLastAttempt < lockoutDuration;
    }

    return false;
  }
}

export const sessionManager = SessionManager;