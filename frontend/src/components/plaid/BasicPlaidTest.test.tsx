import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 基本的 Plaid 元件匯出測試
describe('Plaid 元件匯出測試', () => {
  let queryClient: QueryClient;

  const renderWithQuery = (component: React.ReactElement) => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  test('所有 Plaid 元件都能正常匯出', () => {
    // 測試元件能否正常匯入
    const plaidComponents = require('./index');
    
    expect(plaidComponents.PlaidLinkComponent).toBeDefined();
    expect(plaidComponents.AccountConnectionSuccess).toBeDefined();
    expect(plaidComponents.PlaidConnectionFlow).toBeDefined();
    expect(plaidComponents.PlaidErrorHandler).toBeDefined();
    expect(plaidComponents.AccountManagement).toBeDefined();
    expect(plaidComponents.TransactionImportStatus).toBeDefined();
    expect(plaidComponents.PrivacyConsentManagement).toBeDefined();
  });

  test('PlaidErrorHandler 能正常渲染', () => {
    const { PlaidErrorHandler } = require('./PlaidErrorHandler');
    
    render(<PlaidErrorHandler error="測試錯誤訊息" />);
    
    expect(screen.getByText('連結錯誤')).toBeInTheDocument();
    expect(screen.getByText('測試錯誤訊息')).toBeInTheDocument();
  });

  test('AccountConnectionSuccess 能正常渲染', () => {
    const { AccountConnectionSuccess } = require('./AccountConnectionSuccess');
    
    const mockAccounts = [
      {
        id: 'test-account',
        itemId: 'test-item',
        name: 'Test Account',
        type: 'depository',
        subtype: 'checking',
        mask: '1234',
        isActive: true,
        lastUpdated: new Date().toISOString()
      }
    ];

    render(
      <AccountConnectionSuccess
        accounts={mockAccounts}
        institutionName="Test Bank"
        onContinue={jest.fn()}
        onViewAccounts={jest.fn()}
      />
    );
    
    expect(screen.getByText('連結成功！')).toBeInTheDocument();
    expect(screen.getByText('Test Account')).toBeInTheDocument();
  });

  test('PrivacyConsentManagement 能正常渲染', () => {
    const { PrivacyConsentManagement } = require('./PrivacyConsentManagement');
    
    renderWithQuery(<PrivacyConsentManagement />);
    
    expect(screen.getByText('隱私與同意管理')).toBeInTheDocument();
    expect(screen.getByText('隱私設定')).toBeInTheDocument();
  });
});