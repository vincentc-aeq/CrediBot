import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/AuthService";
import { ResponseUtils } from "../utils/response";
import { UserWithoutPassword } from "../models/User";

declare global {
  namespace Express {
    interface Request {
      user?: UserWithoutPassword;
    }
  }
}

export class AuthMiddleware {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return ResponseUtils.unauthorized(res, "No token provided");
      }

      const token = authHeader.substring(7);
      
      const user = await this.authService.validateAccessToken(token);
      req.user = user;
      
      next();
    } catch (error) {
      return ResponseUtils.unauthorized(res, "Invalid or expired token");
    }
  };

  optionalAuthenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const user = await this.authService.validateAccessToken(token);
        req.user = user;
      }
      
      next();
    } catch (error) {
      next();
    }
  };

  requireRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return ResponseUtils.unauthorized(res, "Authentication required");
      }

      next();
    };
  };
}

export const authMiddleware = new AuthMiddleware();