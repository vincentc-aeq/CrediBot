import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  LinearProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Card,
  CardContent,
  Grid,
  Divider,
  Collapse,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Sync,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info,
  Timeline,
  Schedule,
  TrendingUp,
  TrendingDown,
  Add,
  Edit,
  Delete,
  ExpandMore,
  ExpandLess,
  PlayArrow,
  Pause,
  Refresh
} from '@mui/icons-material';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { plaidApi, PlaidSyncTransactionsResponse } from '../../api/plaidApi';

interface TransactionSyncStatus {
  isRunning: boolean;
  progress: number;
  currentStep: string;
  startTime: Date;
  endTime?: Date;
  totalAccounts: number;
  completedAccounts: number;
  results?: PlaidSyncTransactionsResponse;
  error?: string;
}

interface TransactionImportStatusProps {
  accountId?: string;
  onSyncComplete?: (results: PlaidSyncTransactionsResponse) => void;
}

const syncSteps = [
  { key: 'initializing', label: '初始化同步' },
  { key: 'fetching', label: '獲取交易資料' },
  { key: 'processing', label: '處理交易資料' },
  { key: 'categorizing', label: '分類交易' },
  { key: 'saving', label: '儲存到資料庫' },
  { key: 'analyzing', label: '分析消費模式' },
  { key: 'completed', label: '同步完成' }
];

export const TransactionImportStatus: React.FC<TransactionImportStatusProps> = ({
  accountId,
  onSyncComplete
}) => {
  const [syncStatus, setSyncStatus] = useState<TransactionSyncStatus>({
    isRunning: false,
    progress: 0,
    currentStep: '',
    startTime: new Date(),
    totalAccounts: 0,
    completedAccounts: 0
  });

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const queryClient = useQueryClient();

  // 模擬同步進度
  const simulateSyncProgress = (totalDuration: number = 30000) => {
    const stepDuration = totalDuration / syncSteps.length;
    let currentStepIndex = 0;
    
    const interval = setInterval(() => {
      if (currentStepIndex < syncSteps.length) {
        setSyncStatus(prev => ({
          ...prev,
          progress: ((currentStepIndex + 1) / syncSteps.length) * 100,
          currentStep: syncSteps[currentStepIndex].label,
          completedAccounts: Math.min(currentStepIndex + 1, prev.totalAccounts)
        }));
        currentStepIndex++;
      } else {
        clearInterval(interval);
        setSyncStatus(prev => ({
          ...prev,
          isRunning: false,
          endTime: new Date(),
          currentStep: '同步完成'
        }));
      }
    }, stepDuration);

    return interval;
  };

  // 同步交易
  const syncMutation = useMutation({
    mutationFn: () => plaidApi.syncTransactions(accountId ? { accountIds: [accountId] } : {}),
    onMutate: () => {
      setSyncStatus(prev => ({
        ...prev,
        isRunning: true,
        progress: 0,
        currentStep: '開始同步...',
        startTime: new Date(),
        totalAccounts: accountId ? 1 : 3, // 假設值
        completedAccounts: 0,
        error: undefined
      }));
    },
    onSuccess: (data) => {
      setSyncStatus(prev => ({
        ...prev,
        results: data,
        progress: 100,
        endTime: new Date()
      }));
      
      // 開始進度模擬
      simulateSyncProgress();
      
      queryClient.invalidateQueries({ queryKey: ['plaid-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      onSyncComplete?.(data);
    },
    onError: (error: Error) => {
      setSyncStatus(prev => ({
        ...prev,
        isRunning: false,
        error: error.message,
        endTime: new Date()
      }));
    }
  });

  const getSyncStatusColor = () => {
    if (syncStatus.error) return 'error';
    if (syncStatus.isRunning) return 'info';
    if (syncStatus.progress === 100) return 'success';
    return 'warning';
  };

  const getSyncStatusIcon = () => {
    if (syncStatus.error) return <ErrorIcon />;
    if (syncStatus.isRunning) return <Sync className="rotating" />;
    if (syncStatus.progress === 100) return <CheckCircle />;
    return <Warning />;
  };

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date();
    const duration = endTime.getTime() - start.getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}分 ${seconds % 60}秒`;
    }
    return `${seconds}秒`;
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            交易同步狀態
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setHistoryOpen(true)}
              startIcon={<Timeline />}
            >
              同步歷史
            </Button>
            <Button
              variant="contained"
              onClick={() => syncMutation.mutate()}
              disabled={syncStatus.isRunning}
              startIcon={syncStatus.isRunning ? <Pause /> : <PlayArrow />}
            >
              {syncStatus.isRunning ? '同步中...' : '開始同步'}
            </Button>
          </Box>
        </Box>

        {/* 同步狀態卡片 */}
        <Alert
          severity={getSyncStatusColor()}
          icon={getSyncStatusIcon()}
          sx={{ mb: 2 }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Box>
              <Typography variant="body1" fontWeight="medium">
                {syncStatus.currentStep || '準備同步'}
              </Typography>
              <Typography variant="body2">
                {syncStatus.isRunning && `進度: ${syncStatus.completedAccounts}/${syncStatus.totalAccounts} 帳戶`}
                {syncStatus.endTime && !syncStatus.isRunning && 
                  `同步完成 - 耗時: ${formatDuration(syncStatus.startTime, syncStatus.endTime)}`}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => setDetailsOpen(!detailsOpen)}
            >
              {detailsOpen ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        </Alert>

        {/* 進度條 */}
        {syncStatus.isRunning && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={syncStatus.progress}
              sx={{ height: 8, borderRadius: 1 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {syncStatus.progress.toFixed(0)}% 完成
            </Typography>
          </Box>
        )}

        {/* 詳細資訊 */}
        <Collapse in={detailsOpen}>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      同步統計
                    </Typography>
                    {syncStatus.results && (
                      <List dense>
                        <ListItem>
                          <ListItemIcon>
                            <Add color="success" />
                          </ListItemIcon>
                          <ListItemText primary={`新增: ${syncStatus.results.added} 筆`} />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <Edit color="warning" />
                          </ListItemIcon>
                          <ListItemText primary={`更新: ${syncStatus.results.modified} 筆`} />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <Delete color="error" />
                          </ListItemIcon>
                          <ListItemText primary={`刪除: ${syncStatus.results.removed} 筆`} />
                        </ListItem>
                      </List>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      同步資訊
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon>
                          <Schedule />
                        </ListItemIcon>
                        <ListItemText 
                          primary="開始時間" 
                          secondary={format(syncStatus.startTime, 'yyyy/MM/dd HH:mm:ss', { locale: zhTW })}
                        />
                      </ListItem>
                      {syncStatus.endTime && (
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircle />
                          </ListItemIcon>
                          <ListItemText 
                            primary="完成時間" 
                            secondary={format(syncStatus.endTime, 'yyyy/MM/dd HH:mm:ss', { locale: zhTW })}
                          />
                        </ListItem>
                      )}
                      <ListItem>
                        <ListItemIcon>
                          <Info />
                        </ListItemIcon>
                        <ListItemText 
                          primary="同步範圍" 
                          secondary={accountId ? '單一帳戶' : '所有帳戶'}
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Collapse>

        {/* 錯誤訊息 */}
        {syncStatus.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="body2">
              同步失敗: {syncStatus.error}
            </Typography>
          </Alert>
        )}
      </Paper>

      {/* 同步歷史對話框 */}
      <Dialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>同步歷史記錄</DialogTitle>
        <DialogContent>
          <List>
            {[
              {
                id: 1,
                timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
                status: 'success',
                added: 15,
                modified: 3,
                removed: 0,
                duration: '25秒'
              },
              {
                id: 2,
                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                status: 'success',
                added: 8,
                modified: 1,
                removed: 0,
                duration: '18秒'
              },
              {
                id: 3,
                timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                status: 'error',
                error: '網路連線錯誤'
              }
            ].map((record, index) => (
              <React.Fragment key={record.id}>
                <ListItem>
                  <ListItemIcon>
                    {record.status === 'success' ? (
                      <CheckCircle color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1">
                          {format(record.timestamp, 'yyyy/MM/dd HH:mm', { locale: zhTW })}
                        </Typography>
                        <Chip
                          label={record.status === 'success' ? '成功' : '失敗'}
                          size="small"
                          color={record.status === 'success' ? 'success' : 'error'}
                        />
                      </Box>
                    }
                    secondary={
                      record.status === 'success' ? (
                        <Typography variant="body2">
                          新增 {record.added} 筆，更新 {record.modified} 筆，刪除 {record.removed} 筆
                          {record.duration && ` - 耗時: ${record.duration}`}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="error">
                          {record.error}
                        </Typography>
                      )
                    }
                  />
                </ListItem>
                {index < 2 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>
            關閉
          </Button>
        </DialogActions>
      </Dialog>

      {/* 全域樣式 */}
      <style jsx>{`
        .rotating {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
};

export default TransactionImportStatus;