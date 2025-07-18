import React, { useState, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  AccountBalance,
  Security,
  Speed,
  CheckCircle,
  Link as LinkIcon
} from '@mui/icons-material';
import { plaidApi, PlaidExchangeTokenRequest } from '../../api/plaidApi';

interface PlaidLinkComponentProps {
  onSuccess?: (accounts: any[]) => void;
  onError?: (error: Error) => void;
  className?: string;
}

interface PlaidLinkError {
  error_type: string;
  error_code: string;
  error_message: string;
  display_message?: string;
}

export const PlaidLinkComponent: React.FC<PlaidLinkComponentProps> = ({
  onSuccess,
  onError,
  className
}) => {
  const [isConsentDialogOpen, setIsConsentDialogOpen] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // 獲取 Link Token
  const { data: linkTokenData, isLoading: isLoadingLinkToken } = useQuery({
    queryKey: ['plaid-link-token'],
    queryFn: plaidApi.createLinkToken,
    staleTime: 5 * 60 * 1000, // 5分鐘
    enabled: false // 手動觸發
  });

  // 交換 Public Token
  const exchangeTokenMutation = useMutation({
    mutationFn: plaidApi.exchangePublicToken,
    onSuccess: (data) => {
      setIsLinking(false);
      setLinkError(null);
      queryClient.invalidateQueries({ queryKey: ['plaid-accounts'] });
      onSuccess?.(data.accounts);
    },
    onError: (error: Error) => {
      setIsLinking(false);
      setLinkError(error.message || '帳戶連結失敗');
      onError?.(error);
    }
  });

  // Plaid Link 成功回調
  const handleOnSuccess = useCallback((public_token: string, metadata: any) => {
    setIsLinking(true);
    setLinkError(null);

    const exchangeData: PlaidExchangeTokenRequest = {
      publicToken: public_token,
      metadata: {
        institution: {
          name: metadata.institution.name,
          institution_id: metadata.institution.institution_id
        },
        accounts: metadata.accounts.map((account: any) => ({
          id: account.id,
          name: account.name,
          type: account.type,
          subtype: account.subtype
        }))
      }
    };

    exchangeTokenMutation.mutate(exchangeData);
  }, [exchangeTokenMutation]);

  // Plaid Link 錯誤回調
  const handleOnError = useCallback((error: PlaidLinkError) => {
    const errorMessage = error.display_message || error.error_message || '連結過程中發生錯誤';
    setLinkError(errorMessage);
    onError?.(new Error(errorMessage));
  }, [onError]);

  // Plaid Link 退出回調
  const handleOnExit = useCallback((error: PlaidLinkError | null, metadata: any) => {
    if (error) {
      handleOnError(error);
    }
  }, [handleOnError]);

  // 初始化 Plaid Link
  const { open, ready } = usePlaidLink({
    token: linkTokenData?.linkToken || null,
    onSuccess: handleOnSuccess,
    onError: handleOnError,
    onExit: handleOnExit,
    env: process.env.REACT_APP_PLAID_ENV as any || 'sandbox'
  });

  const handleStartLinking = async () => {
    try {
      await queryClient.fetchQuery({
        queryKey: ['plaid-link-token'],
        queryFn: plaidApi.createLinkToken
      });
      setIsConsentDialogOpen(true);
    } catch (error) {
      setLinkError('無法初始化連結流程');
    }
  };

  const handleConsentConfirm = () => {
    setIsConsentDialogOpen(false);
    if (ready) {
      open();
    }
  };

  const benefits = [
    {
      icon: <AccountBalance />,
      title: '自動分析交易',
      description: '即時分析您的消費模式，找出最佳信用卡推薦'
    },
    {
      icon: <Security />,
      title: '安全連結',
      description: '使用銀行級別的安全標準保護您的財務資訊'
    },
    {
      icon: <Speed />,
      title: '智能建議',
      description: '根據您的消費習慣提供個人化的信用卡優化建議'
    }
  ];

  return (
    <Box className={className}>
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <LinkIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            連結您的銀行帳戶
          </Typography>
          <Typography variant="body1" color="text.secondary">
            安全地連結您的銀行帳戶，讓我們為您提供個人化的信用卡推薦
          </Typography>
        </Box>

        <List>
          {benefits.map((benefit, index) => (
            <React.Fragment key={index}>
              <ListItem>
                <ListItemIcon>
                  {benefit.icon}
                </ListItemIcon>
                <ListItemText
                  primary={benefit.title}
                  secondary={benefit.description}
                />
              </ListItem>
              {index < benefits.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>

        {linkError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {linkError}
          </Alert>
        )}

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleStartLinking}
            disabled={isLoadingLinkToken || isLinking}
            startIcon={isLoadingLinkToken || isLinking ? <CircularProgress size={20} /> : <LinkIcon />}
            sx={{ minWidth: 200 }}
          >
            {isLinking ? '連結中...' : '連結銀行帳戶'}
          </Button>
        </Box>
      </Paper>

      {/* 同意對話框 */}
      <Dialog
        open={isConsentDialogOpen}
        onClose={() => setIsConsentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Security color="primary" />
            資料隱私與同意
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            連結您的銀行帳戶前，請仔細閱讀以下資訊：
          </Typography>
          
          <Typography variant="h6" gutterBottom>
            我們會存取什麼資料？
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="success" />
              </ListItemIcon>
              <ListItemText primary="帳戶餘額和基本資訊" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="success" />
              </ListItemIcon>
              <ListItemText primary="交易記錄（用於分析消費模式）" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="success" />
              </ListItemIcon>
              <ListItemText primary="帳戶識別資訊" />
            </ListItem>
          </List>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            資料安全保證
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="success" />
              </ListItemIcon>
              <ListItemText primary="所有資料都經過加密存儲" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="success" />
              </ListItemIcon>
              <ListItemText primary="不會儲存您的銀行登入資訊" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="success" />
              </ListItemIcon>
              <ListItemText primary="您可以隨時取消連結" />
            </ListItem>
          </List>

          <Alert severity="info" sx={{ mt: 2 }}>
            我們使用 Plaid 進行安全的銀行連結，這是業界標準的金融資料聚合服務。
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsConsentDialogOpen(false)}>
            取消
          </Button>
          <Button
            onClick={handleConsentConfirm}
            variant="contained"
            disabled={!ready}
          >
            同意並繼續
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlaidLinkComponent;