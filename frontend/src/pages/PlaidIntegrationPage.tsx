import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Container,
  Paper
} from '@mui/material';
import {
  PlaidConnectionFlow,
  AccountManagement,
  TransactionImportStatus,
  PrivacyConsentManagement
} from '../components/plaid';
import { PlaidAccount } from '../api/plaidApi';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`plaid-tabpanel-${index}`}
      aria-labelledby={`plaid-tab-${index}`}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const PlaidIntegrationPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [hasConnectedAccounts, setHasConnectedAccounts] = useState(false);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleConnectionComplete = (accounts: PlaidAccount[]) => {
    setHasConnectedAccounts(true);
    setCurrentTab(1); // Switch to account management page
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Plaid Bank Account Integration
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Securely connect your bank accounts to get personalized credit card recommendations and transaction analysis
      </Typography>

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Connect Accounts" />
          <Tab label="Account Management" disabled={!hasConnectedAccounts} />
          <Tab label="Transaction Sync" disabled={!hasConnectedAccounts} />
          <Tab label="Privacy Settings" />
        </Tabs>

        <TabPanel value={currentTab} index={0}>
          {!hasConnectedAccounts ? (
            <PlaidConnectionFlow
              onComplete={handleConnectionComplete}
              onCancel={() => console.log('User cancelled connection')}
            />
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" gutterBottom>
                You have already connected bank accounts
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You can view and manage your connected accounts on the "Account Management" page
              </Typography>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <AccountManagement />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <TransactionImportStatus
            onSyncComplete={(results) => {
              console.log('Sync completed:', results);
            }}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <PrivacyConsentManagement />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default PlaidIntegrationPage;