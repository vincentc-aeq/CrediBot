import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { ResponseUtils } from '../utils/response';

export interface SecurityConfig {
  trustedOrigins: string[];
  enableCSP: boolean;
  enableHSTS: boolean;
  enableCORS: boolean;
  allowedHeaders: string[];
  allowedMethods: string[];
  maxAge: number;
}

export class SecurityMiddleware {
  private config: SecurityConfig;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      trustedOrigins: config.trustedOrigins || [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        process.env.ADMIN_URL || 'http://localhost:3001',
      ],
      enableCSP: config.enableCSP ?? true,
      enableHSTS: config.enableHSTS ?? (process.env.NODE_ENV === 'production'),
      enableCORS: config.enableCORS ?? true,
      allowedHeaders: config.allowedHeaders || [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Request-ID',
        'Accept',
        'Origin',
        'Cache-Control',
        'Pragma'
      ],
      allowedMethods: config.allowedMethods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      maxAge: config.maxAge || 86400, // 24 hours
    };
  }

  // Main security header configuration
  getHelmetConfig() {
    return helmet({
      // Basic CSP configuration
      contentSecurityPolicy: this.config.enableCSP ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Only allow in development
            "'unsafe-eval'",   // Only allow in development
            "https://cdn.plaid.com",
            "https://production.plaid.com",
            "https://sandbox.plaid.com",
            "https://cdn.jsdelivr.net",
            "https://unpkg.com"
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Required by Material-UI
            "https://fonts.googleapis.com"
          ],
          fontSrc: [
            "'self'",
            "https://fonts.gstatic.com"
          ],
          imgSrc: [
            "'self'",
            "data:",
            "https:",
            "https://logo.clearbit.com" // Credit card brand images
          ],
          connectSrc: [
            "'self'",
            "https://production.plaid.com",
            "https://sandbox.plaid.com",
            "https://api.plaid.com",
            "wss://localhost:*", // WebSocket connections
            "ws://localhost:*"
          ],
          frameSrc: [
            "'self'",
            "https://cdn.plaid.com"
          ],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          workerSrc: ["'self'", "blob:"],
          childSrc: ["'none'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          manifestSrc: ["'self'"]
        },
        reportOnly: process.env.NODE_ENV === 'development'
      } : false,

      // HSTS configuration
      hsts: this.config.enableHSTS ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      } : false,

      // Other security headers
      crossOriginEmbedderPolicy: false, // Avoid Plaid integration issues
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      
      // Prevent XSS
      xssFilter: true,
      
      // Prevent clickjacking
      frameguard: { action: 'deny' },
      
      // Prevent MIME sniffing
      noSniff: true,
      
      // DNS prefetch control
      dnsPrefetchControl: { allow: false },
      
      // Hide X-Powered-By
      hidePoweredBy: true,
      
      // IE compatibility
      ieNoOpen: true,
      
      // Referrer policy
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      
      // Permissions policy
      permissionsPolicy: {
        features: {
          geolocation: ["'none'"],
          microphone: ["'none'"],
          camera: ["'none'"],
          payment: ["'self'"],
          usb: ["'none'"],
          magnetometer: ["'none'"],
          gyroscope: ["'none'"],
          accelerometer: ["'none'"],
          fullscreen: ["'self'"],
          displayCapture: ["'none'"]
        }
      }
    });
  }

  // CORS configuration
  getCorsConfig() {
    return cors({
      origin: (origin, callback) => {
        // Allow requests without origin (e.g., mobile apps)
        if (!origin) {
          return callback(null, true);
        }

        // Check if it's a trusted origin
        const isAllowed = this.config.trustedOrigins.some(allowedOrigin => {
          if (allowedOrigin === '*') {
            return true;
          }
          
          // Support wildcards
          const regex = new RegExp(allowedOrigin.replace(/\*/g, '.*'));
          return regex.test(origin);
        });

        if (isAllowed) {
          callback(null, true);
        } else {
          console.warn(`CORS blocked request from origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: this.config.allowedMethods,
      allowedHeaders: this.config.allowedHeaders,
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Request-ID'
      ],
      maxAge: this.config.maxAge,
      preflightContinue: false,
      optionsSuccessStatus: 204
    });
  }

  // Custom security headers
  customSecurityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Set custom security headers
      res.set({
        // Prevent caching sensitive data
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        
        // Server information
        'Server': 'CrediBot-API',
        'X-API-Version': '1.0',
        
        // Prevent information leakage
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        
        // Strict transport security
        ...(this.config.enableHSTS && process.env.NODE_ENV === 'production' ? {
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
        } : {}),
        
        // Referrer policy
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        
        // Feature policy
        'Feature-Policy': [
          "geolocation 'none'",
          "microphone 'none'",
          "camera 'none'",
          "payment 'self'",
          "usb 'none'"
        ].join('; ')
      });

      next();
    };
  }

  // Security checks middleware
  securityChecks() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Check request size
      const contentLength = req.headers['content-length'];
      if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB
        return ResponseUtils.badRequest(res, 'Request too large');
      }

      // Check user agent
      const userAgent = req.headers['user-agent'];
      if (!userAgent) {
        console.warn('Request without User-Agent header from IP:', req.ip);
      }

      // Check suspicious request headers
      const suspiciousHeaders = [
        'x-forwarded-for',
        'x-real-ip',
        'x-cluster-client-ip',
        'x-forwarded',
        'forwarded-for',
        'forwarded'
      ];

      for (const header of suspiciousHeaders) {
        if (req.headers[header]) {
          console.warn(`Suspicious header ${header} from IP:`, req.ip);
        }
      }

      // Check Host header
      const host = req.headers.host;
      const allowedHosts = [
        'localhost:3001',
        'localhost:3000',
        process.env.ALLOWED_HOST,
        process.env.DOMAIN
      ].filter(Boolean);

      if (host && !allowedHosts.includes(host)) {
        console.warn('Suspicious Host header:', host, 'from IP:', req.ip);
      }

      next();
    };
  }

  // Development mode special configuration
  developmentOverrides() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (process.env.NODE_ENV === 'development') {
        // More relaxed CSP in development mode
        res.set({
          'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' *; img-src 'self' data: *; connect-src 'self' ws: wss: *;"
        });
      }
      next();
    };
  }

  // Get complete security middleware stack
  getSecurityMiddleware() {
    const middleware = [];

    // 1. Basic security headers (helmet)
    middleware.push(this.getHelmetConfig());

    // 2. CORS configuration
    if (this.config.enableCORS) {
      middleware.push(this.getCorsConfig());
    }

    // 3. Custom security headers
    middleware.push(this.customSecurityHeaders());

    // 4. Security checks
    middleware.push(this.securityChecks());

    // 5. Development mode overrides
    if (process.env.NODE_ENV === 'development') {
      middleware.push(this.developmentOverrides());
    }

    return middleware;
  }
}

// Default security configuration
export const securityMiddleware = new SecurityMiddleware();

// Export convenience functions
export const getSecurityMiddleware = () => securityMiddleware.getSecurityMiddleware();
export const getHelmetConfig = () => securityMiddleware.getHelmetConfig();
export const getCorsConfig = () => securityMiddleware.getCorsConfig();

export default SecurityMiddleware;