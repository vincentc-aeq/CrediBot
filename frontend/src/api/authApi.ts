
import apiClient from './apiClient';

// Auth API Types
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  cardTypes: string[];
  maxAnnualFee: number;
  prioritizedCategories: string[];
  riskTolerance: 'low' | 'medium' | 'high';
  notificationPreferences: {
    email: boolean;
    push: boolean;
    transactionAlerts: boolean;
  };
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
}

export const loginUser = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const response = await apiClient.post('/auth/login', credentials);
  
  // Backend returns format: { success: true, data: { user: {...}, tokens: {...} } }
  // We need to convert to frontend expected format
  const { data } = response.data;
  
  return {
    token: data.tokens.accessToken,
    user: data.user
  };
};

export const registerUser = async (userData: RegisterData): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post('/auth/register', userData);
  return response.data;
};

export const getUserProfile = async (): Promise<UserProfile> => {
  const response = await apiClient.get('/auth/profile');
  return response.data;
};

export const updateUserProfile = async (profileData: UpdateProfileData): Promise<UserProfile> => {
  const response = await apiClient.put('/auth/profile', profileData);
  return response.data;
};

export const getUserPreferences = async (): Promise<UserPreferences> => {
  const response = await apiClient.get('/users/preferences');
  return response.data;
};

export const updateUserPreferences = async (preferencesData: Partial<UserPreferences>): Promise<UserPreferences> => {
  const response = await apiClient.put('/users/preferences', preferencesData);
  return response.data;
};

// Password reset functions
export const requestPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (token: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post('/auth/reset-password', { token, newPassword });
  return response.data;
};
