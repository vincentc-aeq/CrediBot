import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Paper,
  Container,
  Stack
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh,
  Home,
  BugReport
} from '@mui/icons-material';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 生成錯誤事件 ID
    const eventId = this.generateEventId();
    
    this.setState({
      error,
      errorInfo,
      eventId
    });

    // 記錄錯誤到控制台
    console.error('Error Boundary caught an error:', error, errorInfo);

    // 回調用戶提供的錯誤處理函數
    this.props.onError?.(error, errorInfo);

    // 發送錯誤報告到監控服務
    this.reportError(error, errorInfo, eventId);
  }

  private generateEventId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private reportError = (error: Error, errorInfo: ErrorInfo, eventId: string) => {
    // 在實際應用中，這裡會發送錯誤報告到 Sentry、LogRocket 等服務
    const errorReport = {
      eventId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getUserId()
    };

    // 模擬發送錯誤報告
    if (process.env.NODE_ENV === 'production') {
      // 實際發送到監控服務
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // }).catch(console.error);
    }

    // 暫時儲存到 localStorage 用於調試
    try {
      const existingErrors = JSON.parse(localStorage.getItem('error_reports') || '[]');
      existingErrors.push(errorReport);
      localStorage.setItem('error_reports', JSON.stringify(existingErrors.slice(-10))); // 只保留最近 10 個錯誤
    } catch (e) {
      console.error('Failed to save error report:', e);
    }
  };

  private getUserId = (): string | null => {
    // 嘗試從各種來源獲取用戶 ID
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
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportBug = () => {
    const { error, errorInfo, eventId } = this.state;
    const subject = encodeURIComponent(`錯誤報告 - ${error?.name || 'Unknown Error'}`);
    const body = encodeURIComponent(`
錯誤 ID: ${eventId}
錯誤類型: ${error?.name}
錯誤訊息: ${error?.message}
發生時間: ${new Date().toLocaleString()}
頁面 URL: ${window.location.href}
用戶代理: ${navigator.userAgent}

請描述您在遇到此錯誤之前執行的操作：
[請在此處描述]

組件堆疊:
${errorInfo?.componentStack || '無'}

錯誤堆疊:
${error?.stack || '無'}
    `);
    
    window.open(`mailto:support@credibot.com?subject=${subject}&body=${body}`);
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定義 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, eventId } = this.state;
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
              <Typography variant="h4" gutterBottom>
                糟糕！出了點問題
              </Typography>
              <Typography variant="body1" color="text.secondary">
                我們遇到了一個意外的錯誤。我們的團隊已經收到通知，正在解決這個問題。
              </Typography>
            </Box>

            <Alert severity="error" sx={{ mb: 3 }}>
              <AlertTitle>錯誤詳情</AlertTitle>
              <Typography variant="body2">
                <strong>錯誤 ID:</strong> {eventId}
              </Typography>
              <Typography variant="body2">
                <strong>錯誤類型:</strong> {error?.name || 'Unknown Error'}
              </Typography>
              {isDevelopment && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>錯誤訊息:</strong> {error?.message}
                </Typography>
              )}
            </Alert>

            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 3 }}>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={this.handleRetry}
              >
                重新嘗試
              </Button>
              <Button
                variant="outlined"
                startIcon={<Home />}
                onClick={this.handleGoHome}
              >
                回到首頁
              </Button>
              <Button
                variant="outlined"
                onClick={this.handleReload}
              >
                重新載入頁面
              </Button>
            </Stack>

            <Box sx={{ textAlign: 'center' }}>
              <Button
                variant="text"
                startIcon={<BugReport />}
                onClick={this.handleReportBug}
                size="small"
              >
                回報問題
              </Button>
            </Box>

            {isDevelopment && error && (
              <Box sx={{ mt: 3 }}>
                <Alert severity="info">
                  <AlertTitle>開發者資訊</AlertTitle>
                  <Typography variant="body2" component="pre" sx={{ 
                    whiteSpace: 'pre-wrap',
                    fontSize: '0.75rem',
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}>
                    {error.stack}
                  </Typography>
                </Alert>
              </Box>
            )}
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}

// 高階元件包裝器
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) => {
  return (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );
};

export default ErrorBoundary;