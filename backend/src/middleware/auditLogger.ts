import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/AuditService';
import { ResponseUtils } from '../utils/response';
import { randomUUID } from 'crypto';

export interface AuditLogEntry {
  entityType: string;
  entityId: string;
  action: string;
  userId?: string;
  description?: string;
  metadata?: Record<string, any>;
  oldValues?: any;
  newValues?: any;
  changes?: string[];
}

export interface AuditableAction {
  action: string;
  resource: string;
  requiresAuth?: boolean;
  logRequest?: boolean;
  logResponse?: boolean;
  sensitiveFields?: string[];
}

export class AuditLogger {
  private auditService: AuditService;
  
  constructor() {
    this.auditService = new AuditService();
  }

  // Record audit logs
  async logAuditEvent(
    req: Request,
    res: Response,
    auditableAction: AuditableAction,
    success: boolean = true,
    additionalDetails?: Record<string, any>
  ) {
    try {
      // Generate a valid UUID for entity_id if none exists
      let entityId = req.params.id || additionalDetails?.resourceId;
      if (!entityId) {
        if (req.user?.id) {
          entityId = req.user.id.toString();
        } else {
          // Generate a unique UUID for anonymous/system actions
          entityId = randomUUID();
        }
      }

      const auditEntry = {
        entityType: auditableAction.resource,
        entityId: entityId,
        action: auditableAction.action,
        userId: req.user?.id?.toString(),
        description: `${auditableAction.action} on ${auditableAction.resource}`,
        metadata: {
          method: req.method,
          path: req.path,
          query: req.query,
          statusCode: res.statusCode,
          success,
          ipAddress: this.getClientIP(req),
          userAgent: req.headers['user-agent'],
          requestId: req.headers['x-request-id'] as string,
          ...additionalDetails
        }
      };

      await this.auditService.log(auditEntry);
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't let audit log failures affect main functionality
    }
  }

  // Build audit details
  private buildAuditDetails(
    req: Request,
    res: Response,
    auditableAction: AuditableAction,
    additionalDetails?: Record<string, any>
  ): Record<string, any> {
    const details: Record<string, any> = {
      method: req.method,
      path: req.path,
      query: req.query,
      statusCode: res.statusCode,
      ...additionalDetails
    };

    // Record request body (excluding sensitive fields)
    if (auditableAction.logRequest && req.body) {
      details.requestBody = this.sanitizeData(req.body, auditableAction.sensitiveFields);
    }

    // Record response (excluding sensitive fields)
    if (auditableAction.logResponse && res.locals.responseData) {
      details.responseBody = this.sanitizeData(res.locals.responseData, auditableAction.sensitiveFields);
    }

    return details;
  }

  // Sanitize sensitive data
  private sanitizeData(data: any, sensitiveFields: string[] = []): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const defaultSensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'apiKey',
      'accessToken',
      'refreshToken',
      'sessionId',
      'ssn',
      'socialSecurityNumber',
      'creditCard',
      'cardNumber',
      'cvv',
      'pin',
      'accountNumber',
      'routingNumber'
    ];

    const allSensitiveFields = [...defaultSensitiveFields, ...sensitiveFields];
    
    const sanitized = JSON.parse(JSON.stringify(data));
    
    const sanitizeObject = (obj: any, path: string = '') => {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            sanitizeObject(item, `${path}[${index}]`);
          }
        });
      } else if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach(key => {
          const currentPath = path ? `${path}.${key}` : key;
          
          if (allSensitiveFields.some(field => 
            key.toLowerCase().includes(field.toLowerCase()) ||
            currentPath.toLowerCase().includes(field.toLowerCase())
          )) {
            obj[key] = '[REDACTED]';
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key], currentPath);
          }
        });
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }

  // Get client IP
  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.headers['x-client-ip'] as string ||
      req.socket.remoteAddress ||
      req.connection.remoteAddress ||
      'unknown'
    );
  }

  // Create audit middleware
  createAuditMiddleware(auditableAction: AuditableAction) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Check if authentication is required
      if (auditableAction.requiresAuth && !req.user) {
        await this.logAuditEvent(req, res, auditableAction, false, {
          error: 'Unauthorized access attempt'
        });
        return ResponseUtils.unauthorized(res);
      }

      // Store original res.json method
      const originalJson = res.json;
      
      // Override res.json to capture response data
      res.json = function(data: any) {
        res.locals.responseData = data;
        return originalJson.call(this, data);
      };

      // Listen for response completion
      res.on('finish', async () => {
        const success = res.statusCode >= 200 && res.statusCode < 400;
        await this.logAuditEvent(req, res, auditableAction, success);
      });

      next();
    };
  }

  // Predefined audit actions
  static readonly ACTIONS = {
    // Authentication related
    USER_LOGIN: {
      action: 'user_login',
      resource: 'auth',
      logRequest: true,
      sensitiveFields: ['password']
    } as AuditableAction,

    USER_LOGOUT: {
      action: 'user_logout',
      resource: 'auth',
      requiresAuth: true
    } as AuditableAction,

    USER_REGISTER: {
      action: 'user_register',
      resource: 'user',
      logRequest: true,
      sensitiveFields: ['password']
    } as AuditableAction,

    PASSWORD_CHANGE: {
      action: 'password_change',
      resource: 'user',
      requiresAuth: true,
      sensitiveFields: ['currentPassword', 'newPassword']
    } as AuditableAction,

    // User data related
    USER_VIEW: {
      action: 'user_view',
      resource: 'user',
      requiresAuth: true
    } as AuditableAction,

    USER_UPDATE: {
      action: 'user_update',
      resource: 'user',
      requiresAuth: true,
      logRequest: true,
      logResponse: true
    } as AuditableAction,

    USER_DELETE: {
      action: 'user_delete',
      resource: 'user',
      requiresAuth: true
    } as AuditableAction,

    // Financial data related
    PLAID_LINK: {
      action: 'plaid_link',
      resource: 'plaid_account',
      requiresAuth: true,
      sensitiveFields: ['accessToken', 'itemId']
    } as AuditableAction,

    PLAID_UNLINK: {
      action: 'plaid_unlink',
      resource: 'plaid_account',
      requiresAuth: true
    } as AuditableAction,

    TRANSACTION_VIEW: {
      action: 'transaction_view',
      resource: 'transaction',
      requiresAuth: true
    } as AuditableAction,

    TRANSACTION_IMPORT: {
      action: 'transaction_import',
      resource: 'transaction',
      requiresAuth: true,
      logResponse: true
    } as AuditableAction,

    // Credit card related
    CARD_VIEW: {
      action: 'card_view',
      resource: 'credit_card',
      requiresAuth: true
    } as AuditableAction,

    CARD_ADD: {
      action: 'card_add',
      resource: 'user_card',
      requiresAuth: true,
      logRequest: true,
      logResponse: true
    } as AuditableAction,

    CARD_REMOVE: {
      action: 'card_remove',
      resource: 'user_card',
      requiresAuth: true
    } as AuditableAction,

    // Recommendation related
    RECOMMENDATION_VIEW: {
      action: 'recommendation_view',
      resource: 'recommendation',
      requiresAuth: true
    } as AuditableAction,

    RECOMMENDATION_GENERATE: {
      action: 'recommendation_generate',
      resource: 'recommendation',
      requiresAuth: true,
      logRequest: true,
      logResponse: true
    } as AuditableAction,

    // Admin related
    ADMIN_LOGIN: {
      action: 'admin_login',
      resource: 'admin',
      logRequest: true,
      sensitiveFields: ['password']
    } as AuditableAction,

    ADMIN_CARD_CREATE: {
      action: 'admin_card_create',
      resource: 'credit_card',
      requiresAuth: true,
      logRequest: true,
      logResponse: true
    } as AuditableAction,

    ADMIN_CARD_UPDATE: {
      action: 'admin_card_update',
      resource: 'credit_card',
      requiresAuth: true,
      logRequest: true,
      logResponse: true
    } as AuditableAction,

    ADMIN_CARD_DELETE: {
      action: 'admin_card_delete',
      resource: 'credit_card',
      requiresAuth: true
    } as AuditableAction,

    ADMIN_USER_VIEW: {
      action: 'admin_user_view',
      resource: 'user',
      requiresAuth: true
    } as AuditableAction,

    ADMIN_ANALYTICS_VIEW: {
      action: 'admin_analytics_view',
      resource: 'analytics',
      requiresAuth: true
    } as AuditableAction,

    // System related
    SYSTEM_CONFIG_CHANGE: {
      action: 'system_config_change',
      resource: 'system',
      requiresAuth: true,
      logRequest: true,
      logResponse: true
    } as AuditableAction,

    DATA_EXPORT: {
      action: 'data_export',
      resource: 'data',
      requiresAuth: true,
      logRequest: true
    } as AuditableAction,

    DATA_IMPORT: {
      action: 'data_import',
      resource: 'data',
      requiresAuth: true,
      logRequest: true,
      logResponse: true
    } as AuditableAction
  };
}

// Global audit logger instance
export const auditLogger = new AuditLogger();

// Convenience functions
export const auditMiddleware = {
  // Authentication related
  userLogin: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.USER_LOGIN),
  userLogout: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.USER_LOGOUT),
  userRegister: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.USER_REGISTER),
  passwordChange: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.PASSWORD_CHANGE),
  
  // User data
  userView: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.USER_VIEW),
  userUpdate: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.USER_UPDATE),
  userDelete: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.USER_DELETE),
  
  // Financial data
  plaidLink: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.PLAID_LINK),
  plaidUnlink: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.PLAID_UNLINK),
  transactionView: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.TRANSACTION_VIEW),
  transactionImport: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.TRANSACTION_IMPORT),
  
  // Credit cards
  cardView: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.CARD_VIEW),
  cardAdd: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.CARD_ADD),
  cardRemove: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.CARD_REMOVE),
  
  // Recommendations
  recommendationView: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.RECOMMENDATION_VIEW),
  recommendationGenerate: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.RECOMMENDATION_GENERATE),
  
  // Admin
  adminLogin: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.ADMIN_LOGIN),
  adminCardCreate: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.ADMIN_CARD_CREATE),
  adminCardUpdate: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.ADMIN_CARD_UPDATE),
  adminCardDelete: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.ADMIN_CARD_DELETE),
  adminUserView: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.ADMIN_USER_VIEW),
  adminAnalyticsView: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.ADMIN_ANALYTICS_VIEW),
  
  // System
  systemConfigChange: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.SYSTEM_CONFIG_CHANGE),
  dataExport: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.DATA_EXPORT),
  dataImport: () => auditLogger.createAuditMiddleware(AuditLogger.ACTIONS.DATA_IMPORT),
  
  // Custom audit action
  custom: (action: AuditableAction) => auditLogger.createAuditMiddleware(action)
};

export default AuditLogger;