import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

// Plaid 環境映射
const PLAID_ENV_MAP = {
  sandbox: PlaidEnvironments.sandbox,
  development: PlaidEnvironments.development,
  production: PlaidEnvironments.production,
};

// 檢查 Plaid 配置是否存在
const plaidClientId = process.env.PLAID_CLIENT_ID;
const plaidSecret = process.env.PLAID_SECRET;
const plaidEnvStr = process.env.PLAID_ENV;

// 如果 Plaid 配置不完整，設定為 disabled 模式
if (!plaidClientId || !plaidSecret || !plaidEnvStr) {
  console.warn('Plaid configuration is incomplete. Plaid features will be disabled.');
}

// 驗證 Plaid 環境設定（如果存在）
const plaidEnv = plaidEnvStr as keyof typeof PLAID_ENV_MAP;
if (plaidEnvStr && !PLAID_ENV_MAP[plaidEnv]) {
  console.warn(`Invalid PLAID_ENV: ${plaidEnvStr}. Must be one of: ${Object.keys(PLAID_ENV_MAP).join(', ')}. Defaulting to sandbox.`);
}

// 建立 Plaid 配置（如果配置完整）
const isPlaidConfigured = plaidClientId && plaidSecret && plaidEnvStr && PLAID_ENV_MAP[plaidEnv];

let plaidClient: PlaidApi | null = null;
let PLAID_CONFIG: any = null;

if (isPlaidConfigured) {
  const configuration = new Configuration({
    basePath: PLAID_ENV_MAP[plaidEnv],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': plaidClientId,
        'PLAID-SECRET': plaidSecret,
      },
    },
  });

  plaidClient = new PlaidApi(configuration);

  PLAID_CONFIG = {
    clientId: plaidClientId,
    secret: plaidSecret,
    env: plaidEnv,
    envUrl: PLAID_ENV_MAP[plaidEnv],
    enabled: true,
  } as const;
} else {
  PLAID_CONFIG = {
    enabled: false,
  } as const;
}

// 導出配置
export { plaidClient, PLAID_CONFIG };

// 支援的國家代碼
export const SUPPORTED_COUNTRIES = ['US', 'CA'] as const;

// 支援的產品
export const SUPPORTED_PRODUCTS = ['transactions', 'auth', 'identity'] as const;

// 支援的帳戶類型
export const SUPPORTED_ACCOUNT_TYPES = {
  depository: ['checking', 'savings'],
  credit: ['credit card'],
  investment: ['investment'],
  loan: ['mortgage', 'student', 'auto'],
} as const;

export type SupportedCountry = typeof SUPPORTED_COUNTRIES[number];
export type SupportedProduct = typeof SUPPORTED_PRODUCTS[number];