import { AxiosError } from 'axios';
import { errorReportingService } from '../services/errorReportingService';

export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  details?: any;
}

export interface UserFriendlyError {
  title: string;
  message: string;
  type: 'network' | 'authentication' | 'authorization' | 'validation' | 'server' | 'client' | 'unknown';
  statusCode?: number;
  originalError?: any;
  suggestions?: string[];
  retryable: boolean;
}

export class ApiErrorHandler {
  private static errorMessages: Record<number, UserFriendlyError> = {
    // 4xx Client errors
    400: {
      title: 'Bad Request',
      message: 'The request format is incorrect, please check your input.',
      type: 'validation',
      retryable: false,
      suggestions: ['Check input format', 'Confirm required fields are filled']
    },
    401: {
      title: 'Authentication Required',
      message: 'Your login has expired, please log in again.',
      type: 'authentication',
      retryable: false,
      suggestions: ['Log in again', 'Check account credentials']
    },
    403: {
      title: 'Access Denied',
      message: 'You do not have permission to perform this operation.',
      type: 'authorization',
      retryable: false,
      suggestions: ['Contact administrator', 'Check permission settings']
    },
    404: {
      title: 'Resource Not Found',
      message: 'Cannot find the resource you are trying to access.',
      type: 'client',
      retryable: false,
      suggestions: ['Check if URL is correct', 'Confirm resource exists']
    },
    409: {
      title: 'Data Conflict',
      message: 'Data already exists or conflict occurred.',
      type: 'validation',
      retryable: false,
      suggestions: ['Check for duplicate data', 'Refresh page']
    },
    422: {
      title: 'Data Validation Failed',
      message: 'The submitted data format is incorrect.',
      type: 'validation',
      retryable: false,
      suggestions: ['Check input format', 'Confirm required fields']
    },
    429: {
      title: 'Too Many Requests',
      message: 'Your requests are too frequent, please try again later.',
      type: 'client',
      retryable: true,
      suggestions: ['Wait a few minutes before retrying', 'Reduce request frequency']
    },

    // 5xx Server errors
    500: {
      title: 'Server Error',
      message: 'An internal server error occurred, please try again later.',
      type: 'server',
      retryable: true,
      suggestions: ['Retry later', 'Contact technical support']
    },
    502: {
      title: 'Service Unavailable',
      message: 'Service is temporarily unavailable, please try again later.',
      type: 'server',
      retryable: true,
      suggestions: ['Retry later', 'Check network connection']
    },
    503: {
      title: 'Service Under Maintenance',
      message: 'Service is under maintenance, please try again later.',
      type: 'server',
      retryable: true,
      suggestions: ['Retry later', 'Check maintenance announcements']
    },
    504: {
      title: 'Request Timeout',
      message: 'Server response timeout, please try again later.',
      type: 'server',
      retryable: true,
      suggestions: ['Retry later', 'Check network connection']
    }
  };

  static handleApiError(error: any): UserFriendlyError {
    // Network errors
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return {
          title: 'Request Timeout',
          message: 'Network connection timeout, please check your network and try again.',
          type: 'network',
          retryable: true,
          suggestions: ['Check network connection', 'Retry later'],
          originalError: error
        };
      }

      return {
        title: 'Network Error',
        message: 'Unable to connect to server, please check your network connection.',
        type: 'network',
        retryable: true,
        suggestions: ['Check network connection', 'Refresh page'],
        originalError: error
      };
    }

    const statusCode = error.response.status;
    const responseData = error.response.data;

    // Get default error message
    const defaultError = ApiErrorHandler.errorMessages[statusCode] || {
      title: 'Unknown Error',
      message: 'An unknown error occurred, please try again later.',
      type: 'unknown' as const,
      retryable: false,
      suggestions: ['Refresh page', 'Contact technical support']
    };

    // If server returned custom error message, use it
    let customMessage = defaultError.message;
    if (responseData && typeof responseData === 'object') {
      if (responseData.message) {
        customMessage = responseData.message;
      } else if (responseData.error) {
        customMessage = responseData.error;
      }
    }

    const userFriendlyError: UserFriendlyError = {
      ...defaultError,
      message: ApiErrorHandler.sanitizeErrorMessage(customMessage),
      statusCode,
      originalError: error
    };

    // Log error to error reporting service
    errorReportingService.captureException(error, {
      statusCode,
      responseData,
      userFriendlyError
    });

    return userFriendlyError;
  }

  // Sanitize error message, remove sensitive information
  private static sanitizeErrorMessage(message: string): string {
    if (!message || typeof message !== 'string') {
      return 'An unknown error occurred.';
    }

    // Remove technical details and sensitive information
    const sanitized = message
      .replace(/stack trace|stacktrace/gi, '')
      .replace(/at\s+.*:\d+:\d+/g, '')
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]')
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      .replace(/password|pwd|token|secret|key/gi, '[SENSITIVE]')
      .trim();

    return sanitized.length > 200 ? sanitized.substring(0, 200) + '...' : sanitized;
  }

  // Check if error is retryable
  static isRetryableError(error: UserFriendlyError): boolean {
    return error.retryable && 
           (error.type === 'network' || error.type === 'server' || error.statusCode === 429);
  }

  // Get retry delay time
  static getRetryDelay(attemptNumber: number): number {
    // Exponential backoff algorithm
    return Math.min(1000 * Math.pow(2, attemptNumber), 30000);
  }

  // Format error message for display
  static formatErrorForDisplay(error: UserFriendlyError): string {
    let message = `${error.title}: ${error.message}`;
    
    if (error.suggestions && error.suggestions.length > 0) {
      message += `\n\nSuggested solutions:\n${error.suggestions.map(s => `• ${s}`).join('\n')}`;
    }

    return message;
  }

  // Check if re-authentication is required
  static requiresReauth(error: UserFriendlyError): boolean {
    return error.type === 'authentication' || error.statusCode === 401;
  }

  // Check if permission upgrade is required
  static requiresPermission(error: UserFriendlyError): boolean {
    return error.type === 'authorization' || error.statusCode === 403;
  }
}

// Error notification service
export class ErrorNotificationService {
  private static notifications: Array<{
    id: string;
    error: UserFriendlyError;
    timestamp: Date;
    dismissed: boolean;
  }> = [];

  static addNotification(error: UserFriendlyError): string {
    const id = `error_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    this.notifications.push({
      id,
      error,
      timestamp: new Date(),
      dismissed: false
    });

    // Automatically clean up old notifications
    this.cleanup();

    return id;
  }

  static dismissNotification(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.dismissed = true;
    }
  }

  static getActiveNotifications() {
    return this.notifications.filter(n => !n.dismissed);
  }

  static clearAllNotifications(): void {
    this.notifications.forEach(n => n.dismissed = true);
  }

  private static cleanup(): void {
    const now = new Date();
    this.notifications = this.notifications.filter(n => {
      const age = now.getTime() - n.timestamp.getTime();
      return age < 5 * 60 * 1000; // Keep only notifications within 5 minutes
    });
  }
}

// Export convenience functions
export const handleApiError = ApiErrorHandler.handleApiError;
export const isRetryableError = ApiErrorHandler.isRetryableError;
export const getRetryDelay = ApiErrorHandler.getRetryDelay;
export const formatErrorForDisplay = ApiErrorHandler.formatErrorForDisplay;
export const requiresReauth = ApiErrorHandler.requiresReauth;
export const requiresPermission = ApiErrorHandler.requiresPermission;

export default ApiErrorHandler;