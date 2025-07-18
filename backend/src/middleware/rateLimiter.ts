import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { ResponseUtils } from "../utils/response";
import redisClient from "../database/redis";

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export class RateLimiter {
  static createLimiter(options: RateLimitOptions) {
    return rateLimit({
      windowMs: options.windowMs,
      max: options.maxRequests,
      message: options.message || "Too many requests from this IP",
      // Fix: Use express-rate-limit's default keyGenerator to properly handle IPv6
      keyGenerator: options.keyGenerator,
      handler: (req: Request, res: Response) => {
        ResponseUtils.tooManyRequests(res, options.message || "Too many requests");
      },
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  static authLimiter = this.createLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: process.env.NODE_ENV === 'development' ? 50 : 5, // Allow more requests in development mode
    message: "Too many authentication attempts, please try again later"
  });

  static generalLimiter = this.createLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: process.env.NODE_ENV === 'development' ? 1000 : 100, // Allow more requests in development mode
    message: "Too many requests from this IP"
  });

  static strictLimiter = this.createLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    message: "Rate limit exceeded for this endpoint"
  });

  static async createCustomRateLimiter(
    key: string,
    windowMs: number,
    maxRequests: number
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const identifier = `ratelimit:${key}:${req.ip}`;
      const window = Math.floor(Date.now() / windowMs);
      const redisKey = `${identifier}:${window}`;

      try {
        const current = await redisClient.get(redisKey);
        const requests = current ? parseInt(current) : 0;

        if (requests >= maxRequests) {
          return ResponseUtils.tooManyRequests(res, "Rate limit exceeded");
        }

        const multi = redisClient.multi();
        multi.incr(redisKey);
        multi.expire(redisKey, Math.ceil(windowMs / 1000));
        await multi.exec();

        res.set({
          "X-RateLimit-Limit": maxRequests.toString(),
          "X-RateLimit-Remaining": Math.max(0, maxRequests - requests - 1).toString(),
          "X-RateLimit-Reset": new Date(Date.now() + windowMs).toISOString()
        });

        next();
      } catch (error) {
        console.error("Rate limiter error:", error);
        next();
      }
    };
  }

  static async getUserBasedRateLimiter(
    windowMs: number,
    maxRequests: number,
    message?: string
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user?.id || req.ip;
      const identifier = `user_ratelimit:${userId}`;
      const window = Math.floor(Date.now() / windowMs);
      const redisKey = `${identifier}:${window}`;

      try {
        const current = await redisClient.get(redisKey);
        const requests = current ? parseInt(current) : 0;

        if (requests >= maxRequests) {
          return ResponseUtils.tooManyRequests(res, message || "Rate limit exceeded");
        }

        const multi = redisClient.multi();
        multi.incr(redisKey);
        multi.expire(redisKey, Math.ceil(windowMs / 1000));
        await multi.exec();

        res.set({
          "X-RateLimit-Limit": maxRequests.toString(),
          "X-RateLimit-Remaining": Math.max(0, maxRequests - requests - 1).toString(),
          "X-RateLimit-Reset": new Date(Date.now() + windowMs).toISOString()
        });

        next();
      } catch (error) {
        console.error("User-based rate limiter error:", error);
        next();
      }
    };
  }
}

export const rateLimiter = RateLimiter;