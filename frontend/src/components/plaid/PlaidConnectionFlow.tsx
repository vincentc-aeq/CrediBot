import React, { useState, useCallback } from 'react';
import { Box, Stepper, Step, StepLabel, Typography, Paper, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { PlaidLinkComponent } from './PlaidLinkComponent';
import { AccountConnectionSuccess } from './AccountConnectionSuccess';
import { PlaidAccount } from '../../api/plaidApi';

interface PlaidConnectionFlowProps {
  onComplete?: (accounts: PlaidAccount[]) => void;
  onCancel?: () => void;
}

type ConnectionStep = 'consent' | 'linking' | 'success';

const steps = [
  {
    key: 'consent' as ConnectionStep,
    label: '同意條款',
    description: '了解資料使用方式'
  },
  {
    key: 'linking' as ConnectionStep,
    label: '連結帳戶',
    description: '安全連結您的銀行帳戶'
  },
  {
    key: 'success' as ConnectionStep,
    label: '連結成功',
    description: '開始享受個人化服務'
  }
];

export const PlaidConnectionFlow: React.FC<PlaidConnectionFlowProps> = ({
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState<ConnectionStep>('consent');
  const [connectedAccounts, setConnectedAccounts] = useState<PlaidAccount[]>([]);
  const [institutionName, setInstitutionName] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState(false);
  const navigate = useNavigate();

  const handleLinkSuccess = useCallback((accounts: PlaidAccount[]) => {
    setConnectedAccounts(accounts);
    setCurrentStep('success');
    setIsCompleted(true);
  }, []);

  const handleLinkError = useCallback((error: Error) => {
    console.error('Plaid connection error:', error);
    // 錯誤處理已在 PlaidLinkComponent 中處理
  }, []);

  const handleContinue = useCallback(() => {
    onComplete?.(connectedAccounts);
    navigate('/dashboard');
  }, [connectedAccounts, onComplete, navigate]);

  const handleViewAccounts = useCallback(() => {
    navigate('/settings', { state: { activeTab: 'accounts' } });
  }, [navigate]);

  const handleStartOver = useCallback(() => {
    setCurrentStep('consent');
    setConnectedAccounts([]);
    setInstitutionName('');
    setIsCompleted(false);
  }, []);

  const getCurrentStepIndex = () => {
    return steps.findIndex(step => step.key === currentStep);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'consent':
      case 'linking':
        return (
          <PlaidLinkComponent
            onSuccess={handleLinkSuccess}
            onError={handleLinkError}
          />
        );
      case 'success':
        return (
          <AccountConnectionSuccess
            accounts={connectedAccounts}
            institutionName={institutionName || '您的金融機構'}
            onContinue={handleContinue}
            onViewAccounts={handleViewAccounts}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ textAlign: 'center' }}>
          連結您的銀行帳戶
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
          安全地連結您的銀行帳戶，獲得個人化的信用卡推薦
        </Typography>

        <Stepper activeStep={getCurrentStepIndex()} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((step) => (
            <Step key={step.key} completed={isCompleted && step.key !== 'success'}>
              <StepLabel>
                <Typography variant="subtitle2">{step.label}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {step.description}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {renderStepContent()}

      {currentStep === 'consent' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={onCancel}
            sx={{ mr: 2 }}
          >
            稍後再說
          </Button>
        </Box>
      )}

      {currentStep === 'success' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button
            variant="text"
            onClick={handleStartOver}
            sx={{ mr: 2 }}
          >
            連結其他帳戶
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default PlaidConnectionFlow;