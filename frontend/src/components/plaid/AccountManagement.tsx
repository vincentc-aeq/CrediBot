import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Tooltip,
  Menu,
  MenuItem
} from '@mui/material';
import {
  AccountBalance,
  CreditCard,
  Savings,
  TrendingUp,
  Delete,
  Refresh,
  MoreVert,
  Sync,
  Info,
  Security,
  Schedule,
  CheckCircle,
  Warning,
  Error as ErrorIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { plaidApi, PlaidAccount, PlaidAccountStats } from '../../api/plaidApi';
import { PlaidLinkComponent } from './PlaidLinkComponent';

interface AccountMenuProps {
  account: PlaidAccount;
  onUnlink: (account: PlaidAccount) => void;
  onSync: (account: PlaidAccount) => void;
  onRefreshBalance: (account: PlaidAccount) => void;
}

const AccountMenu: React.FC<AccountMenuProps> = ({
  account,
  onUnlink,
  onSync,
  onRefreshBalance
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleUnlink = () => {
    onUnlink(account);
    handleClose();
  };

  const handleSync = () => {
    onSync(account);
    handleClose();
  };

  const handleRefreshBalance = () => {
    onRefreshBalance(account);
    handleClose();
  };

  return (
    <>
      <IconButton onClick={handleClick}>
        <MoreVert />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={handleClose}
      >
        <MenuItem onClick={handleRefreshBalance}>
          <ListItemIcon>
            <Refresh fontSize="small" />
          </ListItemIcon>
          <ListItemText>更新餘額</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleSync}>
          <ListItemIcon>
            <Sync fontSize="small" />
          </ListItemIcon>
          <ListItemText>同步交易</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleUnlink} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>取消連結</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

const getAccountIcon = (type: string, subtype: string) => {
  switch (type) {
    case 'depository':
      return subtype === 'checking' ? <AccountBalance /> : <Savings />;
    case 'credit':
      return <CreditCard />;
    case 'investment':
      return <TrendingUp />;
    default:
      return <AccountBalance />;
  }
};

const getAccountTypeLabel = (type: string, subtype: string) => {
  const typeLabels: { [key: string]: { [key: string]: string } } = {
    depository: {
      checking: '支票帳戶',
      savings: '儲蓄帳戶',
      cd: '定期存款',
      money_market: '貨幣市場帳戶'
    },
    credit: {
      credit_card: '信用卡',
      paypal: 'PayPal'
    },
    investment: {
      '401k': '401(k)',
      brokerage: '證券帳戶',
      ira: 'IRA',
      retirement: '退休帳戶'
    }
  };

  return typeLabels[type]?.[subtype] || `${type} - ${subtype}`;
};

const getAccountStatusColor = (account: PlaidAccount) => {
  if (!account.isActive) return 'error';
  const hoursSinceUpdate = (Date.now() - new Date(account.lastUpdated).getTime()) / (1000 * 60 * 60);
  if (hoursSinceUpdate > 24) return 'warning';
  return 'success';
};

const getAccountStatusLabel = (account: PlaidAccount) => {
  if (!account.isActive) return '已停用';
  const hoursSinceUpdate = (Date.now() - new Date(account.lastUpdated).getTime()) / (1000 * 60 * 60);
  if (hoursSinceUpdate > 24) return '需要更新';
  return '正常';
};

const getAccountStatusIcon = (account: PlaidAccount) => {
  if (!account.isActive) return <ErrorIcon />;
  const hoursSinceUpdate = (Date.now() - new Date(account.lastUpdated).getTime()) / (1000 * 60 * 60);
  if (hoursSinceUpdate > 24) return <Warning />;
  return <CheckCircle />;
};

export const AccountManagement: React.FC = () => {
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<PlaidAccount | null>(null);
  const [addAccountDialogOpen, setAddAccountDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // 獲取帳戶列表
  const { data: accountsData, isLoading, error } = useQuery({
    queryKey: ['plaid-accounts'],
    queryFn: plaidApi.getLinkedAccounts,
    refetchInterval: 5 * 60 * 1000 // 5分鐘刷新
  });

  // 獲取帳戶統計
  const { data: stats } = useQuery({
    queryKey: ['plaid-account-stats'],
    queryFn: plaidApi.getAccountStats,
    refetchInterval: 5 * 60 * 1000
  });

  // 取消連結帳戶
  const unlinkMutation = useMutation({
    mutationFn: plaidApi.unlinkAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plaid-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['plaid-account-stats'] });
      setUnlinkDialogOpen(false);
      setSelectedAccount(null);
    }
  });

  // 同步交易
  const syncMutation = useMutation({
    mutationFn: () => plaidApi.syncTransactions({}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plaid-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['plaid-account-stats'] });
    }
  });

  // 更新餘額
  const refreshBalanceMutation = useMutation({
    mutationFn: (accountId: string) => plaidApi.getAccountBalances(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plaid-accounts'] });
    }
  });

  const handleUnlinkClick = (account: PlaidAccount) => {
    setSelectedAccount(account);
    setUnlinkDialogOpen(true);
  };

  const handleUnlinkConfirm = () => {
    if (selectedAccount) {
      unlinkMutation.mutate(selectedAccount.itemId);
    }
  };

  const handleSync = (account: PlaidAccount) => {
    syncMutation.mutate();
  };

  const handleRefreshBalance = (account: PlaidAccount) => {
    refreshBalanceMutation.mutate(account.id);
  };

  const handleAddAccountSuccess = (accounts: PlaidAccount[]) => {
    setAddAccountDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['plaid-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['plaid-account-stats'] });
  };

  const accounts = accountsData?.accounts || [];

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        無法載入帳戶資訊。請稍後再試。
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        帳戶管理
      </Typography>

      {/* 統計資訊 */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  總帳戶數
                </Typography>
                <Typography variant="h5" component="div">
                  {stats.totalAccounts}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  活躍帳戶
                </Typography>
                <Typography variant="h5" component="div">
                  {stats.activeAccounts}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  總交易數
                </Typography>
                <Typography variant="h5" component="div">
                  {stats.totalTransactions.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  最後同步
                </Typography>
                <Typography variant="h6" component="div">
                  {format(new Date(stats.lastSyncTime), 'MM/dd HH:mm', { locale: zhTW })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              已連結的帳戶 ({accounts.length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                startIcon={syncMutation.isPending ? <CircularProgress size={20} /> : <Sync />}
              >
                同步所有
              </Button>
              <Button
                variant="contained"
                onClick={() => setAddAccountDialogOpen(true)}
              >
                新增帳戶
              </Button>
            </Box>
          </Box>
        </Box>

        {accounts.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              尚未連結任何帳戶
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              連結您的銀行帳戶以獲得個人化的信用卡推薦
            </Typography>
            <Button
              variant="contained"
              onClick={() => setAddAccountDialogOpen(true)}
            >
              連結第一個帳戶
            </Button>
          </Box>
        ) : (
          <List>
            {accounts.map((account, index) => (
              <React.Fragment key={account.id}>
                <ListItem>
                  <ListItemIcon>
                    {getAccountIcon(account.type, account.subtype)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          {account.name}
                        </Typography>
                        <Chip
                          label={getAccountTypeLabel(account.type, account.subtype)}
                          size="small"
                          variant="outlined"
                        />
                        <Tooltip title={getAccountStatusLabel(account)}>
                          <Chip
                            icon={getAccountStatusIcon(account)}
                            label={getAccountStatusLabel(account)}
                            size="small"
                            color={getAccountStatusColor(account)}
                          />
                        </Tooltip>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          帳戶末四位: ****{account.mask}
                        </Typography>
                        {account.balance && (
                          <Typography variant="body2" color="text.secondary">
                            餘額: ${account.balance.current.toLocaleString()}
                            {account.balance.available && account.balance.available !== account.balance.current && (
                              <span> (可用: ${account.balance.available.toLocaleString()})</span>
                            )}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          最後更新: {format(new Date(account.lastUpdated), 'yyyy/MM/dd HH:mm', { locale: zhTW })}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <AccountMenu
                      account={account}
                      onUnlink={handleUnlinkClick}
                      onSync={handleSync}
                      onRefreshBalance={handleRefreshBalance}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                {index < accounts.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>

      <Alert severity="info" icon={<Security />}>
        <Typography variant="body2">
          <strong>安全提醒：</strong>
          我們使用 Plaid 安全連結服務，您的銀行登入資訊不會被儲存。
          您可以隨時取消連結帳戶，已匯入的交易資料將被保留用於分析。
        </Typography>
      </Alert>

      {/* 取消連結確認對話框 */}
      <Dialog open={unlinkDialogOpen} onClose={() => setUnlinkDialogOpen(false)}>
        <DialogTitle>取消連結帳戶</DialogTitle>
        <DialogContent>
          <Typography>
            您確定要取消連結「{selectedAccount?.name}」嗎？
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            取消連結後，該帳戶的新交易將不會同步，但已匯入的交易資料會保留。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnlinkDialogOpen(false)}>
            取消
          </Button>
          <Button
            onClick={handleUnlinkConfirm}
            color="error"
            disabled={unlinkMutation.isPending}
          >
            {unlinkMutation.isPending ? '處理中...' : '確定取消連結'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 新增帳戶對話框 */}
      <Dialog
        open={addAccountDialogOpen}
        onClose={() => setAddAccountDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>新增銀行帳戶</DialogTitle>
        <DialogContent>
          <PlaidLinkComponent
            onSuccess={handleAddAccountSuccess}
            onError={() => {}}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddAccountDialogOpen(false)}>
            取消
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountManagement;