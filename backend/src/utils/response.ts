import { Response } from "express";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export class ResponseUtils {
  static success<T>(
    res: Response,
    data: T,
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId
    };

    return res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    code: string,
    message: string,
    statusCode: number = 400,
    details?: any
  ): Response {
    const response: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        details
      },
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId
    };

    return res.status(statusCode).json(response);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    currentPage: number,
    totalItems: number,
    itemsPerPage: number,
    statusCode: number = 200
  ): Response {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    const response: PaginatedResponse<T[]> = {
      success: true,
      data,
      pagination: {
        currentPage,
        totalPages,
        totalItems,
        itemsPerPage,
        hasNext: currentPage < totalPages,
        hasPrevious: currentPage > 1
      },
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId
    };

    return res.status(statusCode).json(response);
  }

  static validationError(
    res: Response,
    errors: any[],
    message: string = "Validation failed"
  ): Response {
    return this.error(res, "VALIDATION_ERROR", message, 400, { errors });
  }

  static notFound(
    res: Response,
    message: string = "Resource not found"
  ): Response {
    return this.error(res, "NOT_FOUND", message, 404);
  }

  static unauthorized(
    res: Response,
    message: string = "Unauthorized"
  ): Response {
    return this.error(res, "UNAUTHORIZED", message, 401);
  }

  static forbidden(
    res: Response,
    message: string = "Forbidden"
  ): Response {
    return this.error(res, "FORBIDDEN", message, 403);
  }

  static conflict(
    res: Response,
    message: string = "Conflict"
  ): Response {
    return this.error(res, "CONFLICT", message, 409);
  }

  static tooManyRequests(
    res: Response,
    message: string = "Too many requests"
  ): Response {
    return this.error(res, "TOO_MANY_REQUESTS", message, 429);
  }

  static internalServerError(
    res: Response,
    message: string = "Internal server error"
  ): Response {
    return this.error(res, "INTERNAL_SERVER_ERROR", message, 500);
  }
}

// Convenience functions for backwards compatibility
export const successResponse = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response => {
  return ResponseUtils.success(res, data, statusCode);
};

export const errorResponse = (
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400,
  details?: any
): Response => {
  return ResponseUtils.error(res, code, message, statusCode, details);
};