import React from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Paper,
  Stack
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh,
  Home
} from '@mui/icons-material';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  title?: string;
  message?: string;
  showRetry?: boolean;
  showHome?: boolean;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  title = '發生錯誤',
  message = '很抱歉，應用程式遇到了問題。',
  showRetry = true,
  showHome = true
}) => {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      minHeight: '400px',
      p: 3
    }}>
      <Paper elevation={2} sx={{ p: 4, textAlign: 'center', maxWidth: '500px' }}>
        <ErrorIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
        
        <Typography variant="h5" gutterBottom>
          {title}
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {message}
        </Typography>

        {error && process.env.NODE_ENV === 'development' && (
          <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
            <AlertTitle>錯誤詳情 (開發模式)</AlertTitle>
            <Typography variant="body2" component="pre" sx={{ 
              whiteSpace: 'pre-wrap',
              fontSize: '0.75rem',
              maxHeight: '150px',
              overflow: 'auto'
            }}>
              {error.message}
            </Typography>
          </Alert>
        )}

        <Stack direction="row" spacing={2} justifyContent="center">
          {showRetry && resetError && (
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={resetError}
            >
              重新嘗試
            </Button>
          )}
          {showHome && (
            <Button
              variant="outlined"
              startIcon={<Home />}
              onClick={handleGoHome}
            >
              回到首頁
            </Button>
          )}
        </Stack>
      </Paper>
    </Box>
  );
};

// 專門的載入錯誤回退元件
export const LoadingErrorFallback: React.FC<ErrorFallbackProps> = (props) => (
  <ErrorFallback
    {...props}
    title="載入失敗"
    message="無法載入此內容，請檢查網路連線後重試。"
  />
);

// 專門的路由錯誤回退元件
export const RouteErrorFallback: React.FC<ErrorFallbackProps> = (props) => (
  <ErrorFallback
    {...props}
    title="頁面不存在"
    message="您要訪問的頁面不存在或已被移除。"
    showRetry={false}
  />
);

// 專門的 API 錯誤回退元件
export const ApiErrorFallback: React.FC<ErrorFallbackProps> = (props) => (
  <ErrorFallback
    {...props}
    title="服務暫時不可用"
    message="服務器正在維護中，請稍後再試。"
  />
);

export default ErrorFallback;