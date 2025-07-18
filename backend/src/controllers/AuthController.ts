import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { ResponseUtils } from "../utils/response";
import { SessionManager } from "../middleware/session";
import { CreateUserData, UpdateUserData } from "../models/User";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response) => {
    try {
      const userData: CreateUserData = {
        email: req.body.email,
        password: req.body.password,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        preferences: req.body.preferences
      };

      if (!userData.email || !userData.password || !userData.firstName || !userData.lastName) {
        return ResponseUtils.validationError(res, [
          "Email, password, first name, and last name are required"
        ]);
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        return ResponseUtils.validationError(res, ["Invalid email format"]);
      }

      const result = await this.authService.register(userData);
      
      if (req.sessionId) {
        await SessionManager.updateSession(req.sessionId, {
          userId: result.user.id
        });
      }

      return ResponseUtils.success(res, result, 201);
    } catch (error) {
      console.error("Registration error:", error);
      
      if (error instanceof Error) {
        if (error.message.includes("Password validation failed")) {
          return ResponseUtils.validationError(res, [error.message]);
        }
        if (error.message === "Email already registered") {
          return ResponseUtils.conflict(res, "Email already registered");
        }
      }
      
      return ResponseUtils.internalServerError(res, "Registration failed");
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return ResponseUtils.validationError(res, [
          "Email and password are required"
        ]);
      }

      const isLocked = await SessionManager.isAccountLocked(req);
      if (isLocked) {
        return ResponseUtils.tooManyRequests(res, "Account temporarily locked due to too many failed login attempts");
      }

      const result = await this.authService.login({ email, password });
      
      await SessionManager.resetLoginAttempts(req);
      
      if (req.sessionId) {
        await SessionManager.updateSession(req.sessionId, {
          userId: result.user.id
        });
      }

      return ResponseUtils.success(res, result);
    } catch (error) {
      console.error("Login error:", error);
      
      await SessionManager.trackLoginAttempt(req);
      
      if (error instanceof Error) {
        if (error.message === "Invalid credentials") {
          return ResponseUtils.unauthorized(res, "Invalid email or password");
        }
        if (error.message === "Account is deactivated") {
          return ResponseUtils.forbidden(res, "Account is deactivated");
        }
      }
      
      return ResponseUtils.internalServerError(res, "Login failed");
    }
  };

  refreshToken = async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return ResponseUtils.validationError(res, ["Refresh token is required"]);
      }

      const tokens = await this.authService.refreshToken(refreshToken);
      
      return ResponseUtils.success(res, { tokens });
    } catch (error) {
      console.error("Token refresh error:", error);
      return ResponseUtils.unauthorized(res, "Invalid refresh token");
    }
  };

  logout = async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      const userId = req.user?.id;

      if (userId) {
        await this.authService.logout(userId, refreshToken);
      }

      if (req.sessionId) {
        await SessionManager.destroySession(req.sessionId);
      }

      res.clearCookie("session_id");
      
      return ResponseUtils.success(res, { message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      return ResponseUtils.internalServerError(res, "Logout failed");
    }
  };

  getProfile = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return ResponseUtils.unauthorized(res, "User not authenticated");
      }

      return ResponseUtils.success(res, { user: req.user });
    } catch (error) {
      console.error("Get profile error:", error);
      return ResponseUtils.internalServerError(res, "Failed to get profile");
    }
  };

  updateProfile = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return ResponseUtils.unauthorized(res, "User not authenticated");
      }

      const updateData: UpdateUserData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        preferences: req.body.preferences
      };

      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof UpdateUserData] === undefined) {
          delete updateData[key as keyof UpdateUserData];
        }
      });

      if (Object.keys(updateData).length === 0) {
        return ResponseUtils.validationError(res, ["No valid fields to update"]);
      }

      const userRepository = new (await import("../repositories/UserRepository")).UserRepository();
      const updatedUser = await userRepository.update(req.user.id, updateData);

      if (!updatedUser) {
        return ResponseUtils.notFound(res, "User not found");
      }

      const { passwordHash, ...userWithoutPassword } = updatedUser;
      
      return ResponseUtils.success(res, { user: userWithoutPassword });
    } catch (error) {
      console.error("Update profile error:", error);
      return ResponseUtils.internalServerError(res, "Failed to update profile");
    }
  };
}

export const authController = new AuthController();