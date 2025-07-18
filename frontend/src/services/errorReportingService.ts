interface ErrorReport {
  eventId: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  errorInfo?: {
    componentStack?: string;
  };
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string | null;
  additionalData?: Record<string, any>;
}

interface ErrorReportingConfig {
  apiEndpoint?: string;
  apiKey?: string;
  environment: 'development' | 'production' | 'staging';
  enableConsoleLogging: boolean;
  enableLocalStorage: boolean;
  maxStoredErrors: number;
}

class ErrorReportingService {
  private config: ErrorReportingConfig;
  private isInitialized = false;

  constructor() {
    this.config = {
      apiEndpoint: process.env.REACT_APP_ERROR_REPORTING_ENDPOINT || '/api/errors',
      apiKey: process.env.REACT_APP_ERROR_REPORTING_API_KEY,
      environment: (process.env.NODE_ENV as any) || 'development',
      enableConsoleLogging: process.env.NODE_ENV === 'development',
      enableLocalStorage: true,
      maxStoredErrors: 50
    };
  }

  initialize(config?: Partial<ErrorReportingConfig>) {
    this.config = { ...this.config, ...config };
    this.isInitialized = true;
    
    // 設置全局錯誤處理
    this.setupGlobalErrorHandlers();
    
    console.log('Error Reporting Service initialized');
  }

  private setupGlobalErrorHandlers() {
    // 處理 JavaScript 錯誤
    window.addEventListener('error', (event) => {
      this.reportError(event.error, {
        type: 'javascript',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // 處理 Promise 拒絕
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError(new Error(event.reason), {
        type: 'unhandled_promise_rejection',
        reason: event.reason
      });
    });

    // 處理資源載入錯誤
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.reportError(new Error('Resource loading failed'), {
          type: 'resource_error',
          element: event.target,
          source: (event.target as any)?.src || (event.target as any)?.href
        });
      }
    }, true);
  }

  reportError(error: Error, additionalData?: Record<string, any>): string {
    if (!this.isInitialized) {
      console.warn('Error Reporting Service not initialized');
      return '';
    }

    const eventId = this.generateEventId();
    const errorReport: ErrorReport = {
      eventId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getUserId(),
      additionalData
    };

    // 記錄到控制台
    if (this.config.enableConsoleLogging) {
      console.group(`🚨 Error Report: ${eventId}`);
      console.error('Error:', error);
      console.info('Report:', errorReport);
      console.groupEnd();
    }

    // 儲存到本地存儲
    if (this.config.enableLocalStorage) {
      this.saveToLocalStorage(errorReport);
    }

    // 發送到服務器
    this.sendToServer(errorReport);

    return eventId;
  }

  private generateEventId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getUserId(): string | null {
    try {
      const authData = localStorage.getItem('auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.userId || parsed.user?.id || null;
      }
    } catch (e) {
      // 忽略解析錯誤
    }
    return null;
  }

  private saveToLocalStorage(errorReport: ErrorReport) {
    try {
      const key = 'error_reports';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(errorReport);
      
      // 只保留最新的錯誤
      const trimmed = existing.slice(-this.config.maxStoredErrors);
      localStorage.setItem(key, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Failed to save error report to localStorage:', e);
    }
  }

  private async sendToServer(errorReport: ErrorReport) {
    if (!this.config.apiEndpoint) {
      return;
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(errorReport)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (this.config.enableConsoleLogging) {
        console.log(`✅ Error report sent successfully: ${errorReport.eventId}`);
      }
    } catch (e) {
      console.error('Failed to send error report to server:', e);
      
      // 如果發送失敗，嘗試重新發送（最多重試 3 次）
      this.retryErrorReport(errorReport, 1);
    }
  }

  private retryErrorReport(errorReport: ErrorReport, attempt: number) {
    if (attempt > 3) {
      console.error(`❌ Failed to send error report after 3 attempts: ${errorReport.eventId}`);
      return;
    }

    const delay = Math.pow(2, attempt) * 1000; // 指數退避
    setTimeout(() => {
      this.sendToServer(errorReport).catch(() => {
        this.retryErrorReport(errorReport, attempt + 1);
      });
    }, delay);
  }

  // 獲取本地存儲的錯誤報告
  getStoredErrorReports(): ErrorReport[] {
    try {
      const stored = localStorage.getItem('error_reports');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to retrieve stored error reports:', e);
      return [];
    }
  }

  // 清除本地存儲的錯誤報告
  clearStoredErrorReports() {
    try {
      localStorage.removeItem('error_reports');
    } catch (e) {
      console.error('Failed to clear stored error reports:', e);
    }
  }

  // 手動報告錯誤
  captureException(error: Error, additionalData?: Record<string, any>) {
    return this.reportError(error, additionalData);
  }

  // 報告訊息（不是錯誤）
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', additionalData?: Record<string, any>) {
    const error = new Error(message);
    error.name = `${level.toUpperCase()}_MESSAGE`;
    return this.reportError(error, { level, ...additionalData });
  }

  // 設置用戶上下文
  setUserContext(userId: string, email?: string, username?: string) {
    // 在實際應用中，這會設置到錯誤報告服務的用戶上下文
    const userContext = { userId, email, username };
    
    // 暫時儲存到 sessionStorage
    try {
      sessionStorage.setItem('error_user_context', JSON.stringify(userContext));
    } catch (e) {
      console.error('Failed to set user context:', e);
    }
  }

  // 添加麵包屑
  addBreadcrumb(message: string, category: string = 'navigation', level: 'info' | 'warning' | 'error' = 'info') {
    // 在實際應用中，這會添加到錯誤報告服務的麵包屑
    const breadcrumb = {
      timestamp: new Date().toISOString(),
      message,
      category,
      level
    };

    try {
      const breadcrumbs = JSON.parse(sessionStorage.getItem('error_breadcrumbs') || '[]');
      breadcrumbs.push(breadcrumb);
      
      // 只保留最近的 50 個麵包屑
      const trimmed = breadcrumbs.slice(-50);
      sessionStorage.setItem('error_breadcrumbs', JSON.stringify(trimmed));
    } catch (e) {
      console.error('Failed to add breadcrumb:', e);
    }
  }
}

// 創建全局實例
export const errorReportingService = new ErrorReportingService();

// 導出類型
export type { ErrorReport, ErrorReportingConfig };

export default errorReportingService;