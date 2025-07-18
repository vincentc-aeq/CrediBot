import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
  Card,
  CardContent,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  Security,
  ExpandMore,
  CheckCircle,
  Info,
  Lock,
  Visibility,
  VisibilityOff,
  Share,
  Analytics,
  Notifications,
  Storage,
  Shield,
  Settings,
  Delete,
  Download
} from '@mui/icons-material';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface PrivacySettings {
  dataCollection: boolean;
  transactionAnalysis: boolean;
  personalizedRecommendations: boolean;
  marketingEmails: boolean;
  usageAnalytics: boolean;
  dataSharing: boolean;
  notificationPreferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

interface ConsentRecord {
  id: string;
  type: 'privacy_policy' | 'terms_of_service' | 'data_processing' | 'marketing';
  title: string;
  description: string;
  consentDate: Date;
  version: string;
  required: boolean;
  status: 'accepted' | 'declined' | 'pending';
}

const defaultPrivacySettings: PrivacySettings = {
  dataCollection: true,
  transactionAnalysis: true,
  personalizedRecommendations: true,
  marketingEmails: false,
  usageAnalytics: true,
  dataSharing: false,
  notificationPreferences: {
    email: true,
    push: true,
    sms: false
  }
};

const mockConsentRecords: ConsentRecord[] = [
  {
    id: '1',
    type: 'privacy_policy',
    title: '隱私政策',
    description: '我們如何收集、使用和保護您的個人資料',
    consentDate: new Date('2024-01-15'),
    version: '2.1',
    required: true,
    status: 'accepted'
  },
  {
    id: '2',
    type: 'terms_of_service',
    title: '服務條款',
    description: '使用我們服務的條款和條件',
    consentDate: new Date('2024-01-15'),
    version: '1.8',
    required: true,
    status: 'accepted'
  },
  {
    id: '3',
    type: 'data_processing',
    title: '資料處理同意',
    description: '同意我們處理您的金融資料用於信用卡推薦',
    consentDate: new Date('2024-01-15'),
    version: '1.2',
    required: true,
    status: 'accepted'
  },
  {
    id: '4',
    type: 'marketing',
    title: '行銷同意',
    description: '接收產品更新和優惠資訊',
    consentDate: new Date('2024-02-01'),
    version: '1.0',
    required: false,
    status: 'declined'
  }
];

export const PrivacyConsentManagement: React.FC = () => {
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(defaultPrivacySettings);
  const [consentRecords] = useState<ConsentRecord[]>(mockConsentRecords);
  const [dataExportDialogOpen, setDataExportDialogOpen] = useState(false);
  const [dataDeleteDialogOpen, setDataDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState<ConsentRecord | null>(null);

  const handlePrivacySettingChange = (setting: keyof PrivacySettings, value: boolean) => {
    setPrivacySettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleNotificationSettingChange = (
    type: keyof PrivacySettings['notificationPreferences'],
    value: boolean
  ) => {
    setPrivacySettings(prev => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [type]: value
      }
    }));
  };

  const handleConsentDetail = (consent: ConsentRecord) => {
    setSelectedConsent(consent);
    setDetailDialogOpen(true);
  };

  const getConsentStatusColor = (status: ConsentRecord['status']) => {
    switch (status) {
      case 'accepted': return 'success';
      case 'declined': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getConsentStatusLabel = (status: ConsentRecord['status']) => {
    switch (status) {
      case 'accepted': return '已同意';
      case 'declined': return '已拒絕';
      case 'pending': return '待處理';
      default: return '未知';
    }
  };

  const privacySettingsConfig = [
    {
      key: 'dataCollection' as keyof PrivacySettings,
      icon: <Storage />,
      title: '資料收集',
      description: '允許我們收集您的基本資料和使用情況',
      required: true
    },
    {
      key: 'transactionAnalysis' as keyof PrivacySettings,
      icon: <Analytics />,
      title: '交易分析',
      description: '分析您的交易記錄以提供更好的服務',
      required: true
    },
    {
      key: 'personalizedRecommendations' as keyof PrivacySettings,
      icon: <Share />,
      title: '個人化推薦',
      description: '根據您的資料提供個人化的信用卡推薦',
      required: false
    },
    {
      key: 'marketingEmails' as keyof PrivacySettings,
      icon: <Notifications />,
      title: '行銷郵件',
      description: '接收產品更新和優惠資訊',
      required: false
    },
    {
      key: 'usageAnalytics' as keyof PrivacySettings,
      icon: <Analytics />,
      title: '使用統計',
      description: '幫助我們改善服務品質',
      required: false
    },
    {
      key: 'dataSharing' as keyof PrivacySettings,
      icon: <Share />,
      title: '資料共享',
      description: '與合作夥伴共享匿名化的資料',
      required: false
    }
  ];

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        隱私與同意管理
      </Typography>

      {/* 隱私設定 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Settings />
          隱私設定
        </Typography>
        
        <List>
          {privacySettingsConfig.map((setting, index) => (
            <React.Fragment key={setting.key}>
              <ListItem>
                <ListItemIcon>
                  {setting.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {setting.title}
                      {setting.required && (
                        <Chip label="必需" size="small" color="error" />
                      )}
                    </Box>
                  }
                  secondary={setting.description}
                />
                <Switch
                  checked={privacySettings[setting.key] as boolean}
                  onChange={(e) => handlePrivacySettingChange(setting.key, e.target.checked)}
                  disabled={setting.required}
                />
              </ListItem>
              {index < privacySettingsConfig.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Paper>

      {/* 通知偏好設定 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Notifications />
          通知偏好設定
        </Typography>
        
        <List>
          <ListItem>
            <ListItemIcon>
              <Notifications />
            </ListItemIcon>
            <ListItemText
              primary="電子郵件通知"
              secondary="接收重要更新和推薦"
            />
            <Switch
              checked={privacySettings.notificationPreferences.email}
              onChange={(e) => handleNotificationSettingChange('email', e.target.checked)}
            />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemIcon>
              <Notifications />
            </ListItemIcon>
            <ListItemText
              primary="推送通知"
              secondary="即時交易通知和推薦"
            />
            <Switch
              checked={privacySettings.notificationPreferences.push}
              onChange={(e) => handleNotificationSettingChange('push', e.target.checked)}
            />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemIcon>
              <Notifications />
            </ListItemIcon>
            <ListItemText
              primary="簡訊通知"
              secondary="緊急通知和安全警告"
            />
            <Switch
              checked={privacySettings.notificationPreferences.sms}
              onChange={(e) => handleNotificationSettingChange('sms', e.target.checked)}
            />
          </ListItem>
        </List>
      </Paper>

      {/* 同意記錄 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Security />
          同意記錄
        </Typography>
        
        <List>
          {consentRecords.map((consent, index) => (
            <React.Fragment key={consent.id}>
              <ListItem>
                <ListItemIcon>
                  {consent.status === 'accepted' ? (
                    <CheckCircle color="success" />
                  ) : consent.status === 'declined' ? (
                    <VisibilityOff color="error" />
                  ) : (
                    <Visibility color="warning" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {consent.title}
                      <Chip
                        label={getConsentStatusLabel(consent.status)}
                        size="small"
                        color={getConsentStatusColor(consent.status)}
                      />
                      {consent.required && (
                        <Chip label="必需" size="small" color="error" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {consent.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        版本 {consent.version} • 同意日期: {format(consent.consentDate, 'yyyy/MM/dd', { locale: zhTW })}
                      </Typography>
                    </Box>
                  }
                />
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleConsentDetail(consent)}
                >
                  詳細資訊
                </Button>
              </ListItem>
              {index < consentRecords.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Paper>

      {/* 資料控制 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Shield />
          資料控制
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  匯出資料
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  下載您的所有個人資料和交易記錄
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() => setDataExportDialogOpen(true)}
                >
                  匯出資料
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  刪除帳戶
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  永久刪除您的帳戶和所有相關資料
                </Typography>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={() => setDataDeleteDialogOpen(true)}
                >
                  刪除帳戶
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* 資料安全資訊 */}
      <Alert severity="info" icon={<Security />}>
        <Typography variant="body2">
          <strong>我們如何保護您的資料：</strong>
        </Typography>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>所有資料都經過 AES-256 加密</li>
          <li>使用 TLS 1.3 保護資料傳輸</li>
          <li>定期進行安全審計</li>
          <li>遵循 GDPR 和 CCPA 等隱私法規</li>
          <li>不會在未經同意的情況下共享個人資料</li>
        </ul>
      </Alert>

      {/* 資料匯出對話框 */}
      <Dialog open={dataExportDialogOpen} onClose={() => setDataExportDialogOpen(false)}>
        <DialogTitle>匯出資料</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            您可以選擇要匯出的資料類型：
          </Typography>
          <List>
            <ListItem>
              <FormControlLabel
                control={<Checkbox defaultChecked />}
                label="帳戶資訊"
              />
            </ListItem>
            <ListItem>
              <FormControlLabel
                control={<Checkbox defaultChecked />}
                label="交易記錄"
              />
            </ListItem>
            <ListItem>
              <FormControlLabel
                control={<Checkbox defaultChecked />}
                label="推薦記錄"
              />
            </ListItem>
            <ListItem>
              <FormControlLabel
                control={<Checkbox defaultChecked />}
                label="隱私設定"
              />
            </ListItem>
          </List>
          <Alert severity="info" sx={{ mt: 2 }}>
            資料匯出可能需要 24-48 小時處理，完成後我們會發送電子郵件通知您。
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDataExportDialogOpen(false)}>
            取消
          </Button>
          <Button variant="contained" onClick={() => setDataExportDialogOpen(false)}>
            確認匯出
          </Button>
        </DialogActions>
      </Dialog>

      {/* 刪除帳戶對話框 */}
      <Dialog open={dataDeleteDialogOpen} onClose={() => setDataDeleteDialogOpen(false)}>
        <DialogTitle>刪除帳戶</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>警告：</strong>此操作無法撤銷！
            </Typography>
          </Alert>
          <Typography gutterBottom>
            刪除帳戶將會：
          </Typography>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>永久刪除您的個人資料</li>
            <li>移除所有交易記錄</li>
            <li>取消所有訂閱和通知</li>
            <li>停用所有連結的帳戶</li>
          </ul>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            請輸入 "DELETE" 來確認您要刪除帳戶：
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDataDeleteDialogOpen(false)}>
            取消
          </Button>
          <Button color="error" variant="contained" onClick={() => setDataDeleteDialogOpen(false)}>
            確認刪除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 同意詳細資訊對話框 */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedConsent?.title}
        </DialogTitle>
        <DialogContent>
          {selectedConsent && (
            <Box>
              <Typography variant="body1" gutterBottom>
                {selectedConsent.description}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                版本: {selectedConsent.version} | 
                同意日期: {format(selectedConsent.consentDate, 'yyyy/MM/dd HH:mm', { locale: zhTW })}
              </Typography>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography>完整條款內容</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2">
                    這裡會顯示完整的條款內容...
                    {selectedConsent.type === 'privacy_policy' && (
                      <>
                        <br /><br />
                        1. 資料收集：我們收集您的基本資料、交易記錄和使用情況。
                        <br />
                        2. 資料使用：用於提供服務、改善體驗和安全防護。
                        <br />
                        3. 資料保護：採用業界標準的加密和安全措施。
                        <br />
                        4. 資料共享：僅在必要時與合作夥伴共享匿名化資料。
                        <br />
                        5. 您的權利：可以隨時查看、修改或刪除您的資料。
                      </>
                    )}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            關閉
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PrivacyConsentManagement;