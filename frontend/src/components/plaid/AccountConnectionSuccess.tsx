import React from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Alert,
  Chip
} from '@mui/material';
import {
  CheckCircle,
  AccountBalance,
  CreditCard,
  Savings,
  TrendingUp
} from '@mui/icons-material';
import { PlaidAccount } from '../../api/plaidApi';

interface AccountConnectionSuccessProps {
  accounts: PlaidAccount[];
  institutionName: string;
  onContinue: () => void;
  onViewAccounts: () => void;
}

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
      '403b': '403(b)',
      '457b': '457(b)',
      '529': '529計劃',
      brokerage: '證券帳戶',
      ira: 'IRA',
      mutual_fund: '共同基金',
      pension: '退休金',
      retirement: '退休帳戶',
      roth: 'Roth IRA',
      sep_ira: 'SEP IRA',
      simple_ira: 'SIMPLE IRA',
      sarsep: 'SARSEP',
      trust: '信託',
      ugma: 'UGMA',
      utma: 'UTMA'
    }
  };

  return typeLabels[type]?.[subtype] || `${type} - ${subtype}`;
};

export const AccountConnectionSuccess: React.FC<AccountConnectionSuccessProps> = ({
  accounts,
  institutionName,
  onContinue,
  onViewAccounts
}) => {
  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            連結成功！
          </Typography>
          <Typography variant="body1" color="text.secondary">
            您已成功連結 {institutionName} 的 {accounts.length} 個帳戶
          </Typography>
        </Box>

        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="body2">
            您的帳戶已安全連結，我們現在可以開始分析您的消費模式並提供個人化的信用卡推薦。
          </Typography>
        </Alert>

        <Typography variant="h6" gutterBottom>
          已連結的帳戶
        </Typography>
        <Paper variant="outlined" sx={{ mb: 3 }}>
          <List>
            {accounts.map((account, index) => (
              <ListItem key={account.id} divider={index < accounts.length - 1}>
                <ListItemIcon>
                  {getAccountIcon(account.type, account.subtype)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {account.name}
                      <Chip
                        label={getAccountTypeLabel(account.type, account.subtype)}
                        size="small"
                        variant="outlined"
                      />
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
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>接下來會發生什麼？</strong>
          </Typography>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>我們將分析您的交易記錄</li>
            <li>根據您的消費模式推薦最適合的信用卡</li>
            <li>提供個人化的獎勵優化建議</li>
            <li>當有更好的交易機會時通知您</li>
          </ul>
        </Alert>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="outlined"
            onClick={onViewAccounts}
            sx={{ minWidth: 120 }}
          >
            管理帳戶
          </Button>
          <Button
            variant="contained"
            onClick={onContinue}
            sx={{ minWidth: 120 }}
          >
            開始使用
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default AccountConnectionSuccess;