import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh,
  Support,
  Security,
  Info
} from '@mui/icons-material';

interface PlaidError {
  error_type: string;
  error_code: string;
  error_message: string;
  display_message?: string;
}

interface PlaidErrorHandlerProps {
  error: PlaidError | Error | string;
  onRetry?: () => void;
  onContactSupport?: () => void;
}

const getErrorInfo = (error: PlaidError | Error | string) => {
  if (typeof error === 'string') {
    return {
      title: '連結錯誤',
      message: error,
      severity: 'error' as const,
      isRetryable: true
    };
  }

  if (error instanceof Error) {
    return {
      title: '連結錯誤',
      message: error.message,
      severity: 'error' as const,
      isRetryable: true
    };
  }

  // Plaid 特定錯誤處理
  const plaidError = error as PlaidError;
  
  switch (plaidError.error_type) {
    case 'INVALID_CREDENTIALS':
      return {
        title: '登入資訊錯誤',
        message: '您輸入的登入資訊不正確，請重新嘗試。',
        severity: 'error' as const,
        isRetryable: true,
        suggestions: [
          '確認用戶名和密碼是否正確',
          '檢查是否有大小寫敏感問題',
          '確認帳戶沒有被鎖定'
        ]
      };

    case 'INVALID_MFA':
      return {
        title: '多重驗證錯誤',
        message: '多重驗證失敗，請重新嘗試。',
        severity: 'error' as const,
        isRetryable: true,
        suggestions: [
          '確認驗證碼是否正確',
          '檢查手機是否收到驗證碼',
          '確認驗證碼沒有過期'
        ]
      };

    case 'ITEM_LOGIN_REQUIRED':
      return {
        title: '需要重新登入',
        message: '您的帳戶需要重新驗證，請重新連結。',
        severity: 'warning' as const,
        isRetryable: true,
        suggestions: [
          '密碼可能已更改',
          '帳戶安全設定可能已更新',
          '銀行可能要求重新驗證'
        ]
      };

    case 'INSUFFICIENT_CREDENTIALS':
      return {
        title: '資訊不足',
        message: '需要更多資訊才能完成連結。',
        severity: 'warning' as const,
        isRetryable: true,
        suggestions: [
          '可能需要額外的安全問題回答',
          '帳戶可能需要額外驗證步驟'
        ]
      };

    case 'INVALID_ACCOUNT_NUMBER':
      return {
        title: '帳戶號碼錯誤',
        message: '提供的帳戶號碼不正確。',
        severity: 'error' as const,
        isRetryable: true,
        suggestions: [
          '確認帳戶號碼是否正確',
          '檢查是否選擇了正確的帳戶類型'
        ]
      };

    case 'INSTITUTION_ERROR':
      return {
        title: '銀行系統錯誤',
        message: '銀行系統暫時無法回應，請稍後再試。',
        severity: 'warning' as const,
        isRetryable: true,
        suggestions: [
          '銀行系統可能正在維護',
          '網路連線可能不穩定',
          '請稍後幾分鐘後再試'
        ]
      };

    case 'INSTITUTION_NOT_SUPPORTED':
      return {
        title: '不支援的金融機構',
        message: '抱歉，我們暫時不支援您選擇的金融機構。',
        severity: 'info' as const,
        isRetryable: false,
        suggestions: [
          '選擇其他支援的金融機構',
          '聯繫客服了解支援計劃'
        ]
      };

    case 'INVALID_INSTITUTION':
      return {
        title: '金融機構錯誤',
        message: '選擇的金融機構資訊有誤。',
        severity: 'error' as const,
        isRetryable: true,
        suggestions: [
          '重新選擇正確的金融機構',
          '確認機構名稱是否正確'
        ]
      };

    case 'RATE_LIMIT_EXCEEDED':
      return {
        title: '嘗試次數過多',
        message: '您的嘗試次數過多，請稍後再試。',
        severity: 'warning' as const,
        isRetryable: true,
        suggestions: [
          '請等待 15 分鐘後再試',
          '確認之前的輸入是否正確'
        ]
      };

    default:
      return {
        title: '連結錯誤',
        message: plaidError.display_message || plaidError.error_message || '發生未知錯誤',
        severity: 'error' as const,
        isRetryable: true
      };
  }
};

export const PlaidErrorHandler: React.FC<PlaidErrorHandlerProps> = ({
  error,
  onRetry,
  onContactSupport
}) => {
  const errorInfo = getErrorInfo(error);

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Alert severity={errorInfo.severity} sx={{ mb: 3 }}>
          <AlertTitle>{errorInfo.title}</AlertTitle>
          {errorInfo.message}
        </Alert>

        {errorInfo.suggestions && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              建議解決方案
            </Typography>
            <List dense>
              {errorInfo.suggestions.map((suggestion, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <Info color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={suggestion} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          {errorInfo.isRetryable && onRetry && (
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={onRetry}
            >
              重新嘗試
            </Button>
          )}
          
          {onContactSupport && (
            <Button
              variant="outlined"
              startIcon={<Support />}
              onClick={onContactSupport}
            >
              聯繫客服
            </Button>
          )}
        </Box>

        <Alert severity="info" sx={{ mt: 3 }}>
          <AlertTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Security />
              安全提醒
            </Box>
          </AlertTitle>
          <Typography variant="body2">
            我們使用 Plaid 安全連結服務，您的銀行登入資訊不會被儲存在我們的系統中。
            如果問題持續存在，建議您：
          </Typography>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>確認您的網路連線正常</li>
            <li>清除瀏覽器快取和 Cookie</li>
            <li>嘗試使用不同的瀏覽器</li>
            <li>聯繫您的銀行確認帳戶狀態</li>
          </ul>
        </Alert>
      </Paper>
    </Box>
  );
};

export default PlaidErrorHandler;