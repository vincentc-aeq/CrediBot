import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { ResponseUtils } from '../utils/response';
import DOMPurify from 'isomorphic-dompurify';

// Input sanitization functions
export class InputSanitizer {
  // HTML tag sanitization
  static sanitizeHtml(value: string): string {
    if (typeof value !== 'string') return value;
    return DOMPurify.sanitize(value, { 
      ALLOWED_TAGS: [], 
      ALLOWED_ATTR: [] 
    });
  }

  // SQL injection prevention
  static sanitizeSQL(value: string): string {
    if (typeof value !== 'string') return value;
    
    // Remove dangerous SQL keywords and characters
    const dangerousPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(\-\-|\;|\*|\/\*|\*\/)/g,
      /(\b(OR|AND)\s+\w+\s*=\s*\w+)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /(\'\s*(OR|AND)\s*\d+\s*=\s*\d+)/gi,
      /(\'\s*(OR|AND)\s*\'\w+\'\s*=\s*\'\w+)/gi
    ];

    let sanitized = value;
    dangerousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized;
  }

  // XSS prevention
  static sanitizeXSS(value: string): string {
    if (typeof value !== 'string') return value;
    
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
      /<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi,
      /<meta\b[^<]*>/gi,
      /<link\b[^<]*>/gi,
      /on\w+\s*=\s*["'][^"']*["']/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /data:text\/html/gi
    ];

    let sanitized = value;
    dangerousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized;
  }

  // Path traversal prevention
  static sanitizePath(value: string): string {
    if (typeof value !== 'string') return value;
    
    // Remove dangerous path characters
    return value.replace(/\.\./g, '').replace(/[\/\\]/g, '');
  }

  // General sanitization function
  static sanitize(value: any): any {
    if (typeof value === 'string') {
      let sanitized = value;
      sanitized = this.sanitizeHtml(sanitized);
      sanitized = this.sanitizeSQL(sanitized);
      sanitized = this.sanitizeXSS(sanitized);
      return sanitized.trim();
    }
    
    if (Array.isArray(value)) {
      return value.map(item => this.sanitize(item));
    }
    
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      for (const key in value) {
        if (value.hasOwnProperty(key)) {
          sanitized[key] = this.sanitize(value[key]);
        }
      }
      return sanitized;
    }
    
    return value;
  }
}

// Validation rules
export class ValidationRules {
  // User validation
  static userRegistration(): ValidationChain[] {
    return [
      body('email')
        .isEmail()
        .withMessage('Please enter a valid email address')
        .normalizeEmail()
        .isLength({ max: 254 })
        .withMessage('Email address is too long'),
        
      body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8-128 characters'),
        
      body('firstName')
        .notEmpty()
        .withMessage('First name is required')
        .isLength({ min: 1, max: 50 })
        .withMessage('First name cannot exceed 50 characters'),
        
      body('lastName')
        .notEmpty()
        .withMessage('Last name is required')
        .isLength({ min: 1, max: 50 })
        .withMessage('Last name cannot exceed 50 characters')
    ];
  }

  // Login validation
  static userLogin(): ValidationChain[] {
    return [
      body('email')
        .isEmail()
        .withMessage('Please enter a valid email address')
        .normalizeEmail(),
        
      body('password')
        .isLength({ min: 1, max: 128 })
        .withMessage('Password cannot be empty')
    ];
  }

  // Credit card validation
  static creditCard(): ValidationChain[] {
    return [
      body('cardName')
        .isLength({ min: 1, max: 100 })
        .withMessage('Card name must be between 1-100 characters')
        .customSanitizer(InputSanitizer.sanitize),
        
      body('issuer')
        .isLength({ min: 1, max: 50 })
        .withMessage('Issuer name must be between 1-50 characters')
        .customSanitizer(InputSanitizer.sanitize),
        
      body('annualFee')
        .isFloat({ min: 0 })
        .withMessage('Annual fee must be a non-negative number')
        .toFloat(),
        
      body('rewardStructure')
        .isObject()
        .withMessage('Reward structure must be an object')
        .custom((value) => {
          if (typeof value !== 'object' || value === null) {
            throw new Error('Reward structure must be an object');
          }
          return true;
        })
        .customSanitizer(InputSanitizer.sanitize),
        
      body('features')
        .optional()
        .isArray()
        .withMessage('Features list must be an array')
        .customSanitizer(InputSanitizer.sanitize),
        
      body('category')
        .isIn(['cashback', 'travel', 'dining', 'gas', 'shopping', 'business', 'student', 'secured'])
        .withMessage('Invalid card category')
    ];
  }

  // Transaction validation
  static transaction(): ValidationChain[] {
    return [
      body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Transaction amount must be greater than 0.01')
        .toFloat(),
        
      body('description')
        .isLength({ min: 1, max: 200 })
        .withMessage('Transaction description must be between 1-200 characters')
        .customSanitizer(InputSanitizer.sanitize),
        
      body('category')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('Transaction category must be between 1-50 characters')
        .customSanitizer(InputSanitizer.sanitize),
        
      body('merchantName')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('Merchant name must be between 1-100 characters')
        .customSanitizer(InputSanitizer.sanitize),
        
      body('date')
        .isISO8601()
        .withMessage('Invalid date format')
        .toDate()
    ];
  }

  // ID parameter validation
  static idParam(): ValidationChain[] {
    return [
      param('id')
        .isInt({ min: 1 })
        .withMessage('ID must be a positive integer')
        .toInt()
    ];
  }

  // Pagination validation
  static pagination(): ValidationChain[] {
    return [
      query('page')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Page number must be between 1-1000')
        .toInt(),
        
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Items per page must be between 1-100')
        .toInt(),
        
      query('sort')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort direction must be asc or desc'),
        
      query('sortBy')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('Sort field name is too long')
        .matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
        .withMessage('Invalid sort field name')
        .customSanitizer(InputSanitizer.sanitize)
    ];
  }

  // Search validation
  static search(): ValidationChain[] {
    return [
      query('q')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('Search keyword must be between 1-100 characters')
        .customSanitizer(InputSanitizer.sanitize),
        
      query('category')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('Category name is too long')
        .customSanitizer(InputSanitizer.sanitize)
    ];
  }

  // User preferences validation
  static userPreferences(): ValidationChain[] {
    return [
      body('cardTypes')
        .optional()
        .isArray()
        .withMessage('Card types must be an array')
        .custom((value) => {
          const validTypes = ['cashback', 'travel', 'business', 'rewards', 'balance_transfer', 'student'];
          return value.every((type: string) => validTypes.includes(type));
        })
        .withMessage('Invalid card type'),
      body('maxAnnualFee')
        .optional()
        .isInt({ min: 0, max: 10000 })
        .withMessage('Max annual fee must be between 0 and 10000'),
      body('prioritizedCategories')
        .optional()
        .isArray()
        .withMessage('Prioritized categories must be an array')
        .custom((value) => {
          const validCategories = ['dining', 'groceries', 'gas_stations', 'shopping', 'travel', 'entertainment', 'utilities', 'other'];
          return value.every((category: string) => validCategories.includes(category));
        })
        .withMessage('Invalid category'),
      body('riskTolerance')
        .optional()
        .isIn(['low', 'medium', 'high'])
        .withMessage('Risk tolerance must be low, medium, or high'),
      body('notificationPreferences.email')
        .optional()
        .isBoolean()
        .withMessage('Email notification preference must be boolean'),
      body('notificationPreferences.push')
        .optional()
        .isBoolean()
        .withMessage('Push notification preference must be boolean'),
      body('notificationPreferences.transactionAlerts')
        .optional()
        .isBoolean()
        .withMessage('Transaction alerts preference must be boolean')
    ];
  }
}

// Validation error handling middleware
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined
    }));
    
    console.warn('Validation errors:', errorMessages);
    
    return ResponseUtils.badRequest(res, 'Input validation failed', {
      errors: errorMessages,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize body
  if (req.body) {
    req.body = InputSanitizer.sanitize(req.body);
  }
  
  // Sanitize query
  if (req.query) {
    req.query = InputSanitizer.sanitize(req.query);
  }
  
  // Sanitize params
  if (req.params) {
    req.params = InputSanitizer.sanitize(req.params);
  }
  
  next();
};

// File upload validation
export const validateFileUpload = (allowedTypes: string[], maxSize: number = 5 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return next();
    }
    
    const file = req.file;
    
    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      return ResponseUtils.badRequest(res, 'Unsupported file type', {
        allowed: allowedTypes,
        received: file.mimetype
      });
    }
    
    // Check file size
    if (file.size > maxSize) {
      return ResponseUtils.badRequest(res, 'File too large', {
        maxSize: maxSize,
        received: file.size
      });
    }
    
    // Check file name
    if (file.originalname.length > 255) {
      return ResponseUtils.badRequest(res, 'File name too long');
    }
    
    // Sanitize file name
    file.originalname = InputSanitizer.sanitizePath(file.originalname);
    
    next();
  };
};

// Export convenience functions
export const validate = {
  userRegistration: () => [...ValidationRules.userRegistration(), handleValidationErrors],
  userLogin: () => [...ValidationRules.userLogin(), handleValidationErrors],
  creditCard: () => [...ValidationRules.creditCard(), handleValidationErrors],
  transaction: () => [...ValidationRules.transaction(), handleValidationErrors],
  idParam: () => [...ValidationRules.idParam(), handleValidationErrors],
  pagination: () => [...ValidationRules.pagination(), handleValidationErrors],
  search: () => [...ValidationRules.search(), handleValidationErrors],
  userPreferences: () => [...ValidationRules.userPreferences(), handleValidationErrors]
};

// Export individual validation functions
export const validateUserPreferences = validate.userPreferences();

export default ValidationRules;