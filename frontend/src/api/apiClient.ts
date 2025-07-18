
import axios, { AxiosResponse, AxiosError } from 'axios';
import { handleApiError, UserFriendlyError, getRetryDelay, isRetryableError } from '../utils/errorHandling';
import { errorReportingService } from '../services/errorReportingService';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  withCredentials: true,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 重試配置
const MAX_RETRIES = 3;

// 為每個請求添加重試計數
interface RetryConfig {
  retryCount?: number;
  retryDelay?: number;
}

// Request interceptor to add auth token and logging
apiClient.interceptors.request.use(
  (config) => {
    // 添加認證令牌
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 添加請求 ID 用於追蹤
    config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    // 添加麵包屑
    errorReportingService.addBreadcrumb(
      `API Request: ${config.method?.toUpperCase()} ${config.url}`,
      'http',
      'info'
    );

    return config;
  },
  (error) => {
    errorReportingService.captureException(error, {
      type: 'request_interceptor_error'
    });
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and retries
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // 記錄成功的響應
    errorReportingService.addBreadcrumb(
      `API Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`,
      'http',
      'info'
    );
    
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as any;
    
    // 處理用戶友善的錯誤
    const userFriendlyError = handleApiError(error);
    
    // 記錄錯誤麵包屑
    errorReportingService.addBreadcrumb(
      `API Error: ${error.response?.status} ${config?.method?.toUpperCase()} ${config?.url}`,
      'http',
      'error'
    );

    // 處理認證錯誤
    if (userFriendlyError.statusCode === 401) {
      // 清除認證資訊
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('auth');
      
      // 發送認證失敗事件
      window.dispatchEvent(new CustomEvent('auth:logout', { 
        detail: { reason: 'token_expired' } 
      }));
      
      // 如果不是在登入頁面，跳轉到登入
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      
      return Promise.reject(userFriendlyError);
    }

    // 處理權限錯誤
    if (userFriendlyError.statusCode === 403) {
      // 發送權限不足事件
      window.dispatchEvent(new CustomEvent('auth:insufficient_permissions', { 
        detail: { error: userFriendlyError } 
      }));
      
      return Promise.reject(userFriendlyError);
    }

    // 重試邏輯
    if (config && isRetryableError(userFriendlyError)) {
      const retryCount = (config.retryCount || 0) + 1;
      
      if (retryCount <= MAX_RETRIES) {
        config.retryCount = retryCount;
        
        const delay = getRetryDelay(retryCount);
        
        errorReportingService.addBreadcrumb(
          `Retrying request (${retryCount}/${MAX_RETRIES}) after ${delay}ms`,
          'http',
          'info'
        );
        
        // 等待指定時間後重試
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return apiClient(config);
      } else {
        // 超過最大重試次數
        errorReportingService.captureException(new Error('Max retries exceeded'), {
          originalError: error,
          userFriendlyError,
          retryCount
        });
      }
    }

    return Promise.reject(userFriendlyError);
  }
);

// 添加請求和響應的性能監控
if (process.env.NODE_ENV === 'development') {
  apiClient.interceptors.request.use(
    (config) => {
      (config as any).metadata = { startTime: Date.now() };
      return config;
    }
  );

  apiClient.interceptors.response.use(
    (response) => {
      const endTime = Date.now();
      const duration = endTime - (response.config as any).metadata?.startTime;
      
      if (duration > 2000) { // 超過 2 秒的請求
        console.warn(`Slow API request: ${response.config.method?.toUpperCase()} ${response.config.url} took ${duration}ms`);
      }
      
      return response;
    },
    (error) => {
      const endTime = Date.now();
      const duration = endTime - (error.config as any)?.metadata?.startTime;
      
      console.error(`API request failed: ${error.config?.method?.toUpperCase()} ${error.config?.url} took ${duration}ms`);
      
      return Promise.reject(error);
    }
  );
}

export { apiClient };
export default apiClient;
