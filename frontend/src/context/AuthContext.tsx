import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import apiClient from '../api/apiClient';
import { UserProfile, LoginResponse } from '../api/authApi';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenExpiryTimeout, setTokenExpiryTimeout] = useState<NodeJS.Timeout | null>(null);

  const parseJWT = useCallback((token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to parse JWT', error);
      return null;
    }
  }, []);
  
  const handleTokenExpiry = useCallback(() => {
    localStorage.removeItem('authToken');
    delete apiClient.defaults.headers.common['Authorization'];
    setUser(null);
    setTokenExpiryTimeout(prevTimeout => {
      if (prevTimeout) {
        clearTimeout(prevTimeout);
      }
      return null;
    });
  }, []);
  
  const setupTokenExpiry = useCallback((expiryTime: number) => {
    setTokenExpiryTimeout(prevTimeout => {
      if (prevTimeout) {
        clearTimeout(prevTimeout);
      }
      
      const timeUntilExpiry = expiryTime - Date.now();
      if (timeUntilExpiry > 0) {
        return setTimeout(() => {
          handleTokenExpiry();
        }, Math.max(timeUntilExpiry - 60000, 0)); // Logout 1 minute before expiry
      }
      return null;
    });
  }, [handleTokenExpiry]);

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        // Check if token is expired
        const tokenData = parseJWT(token);
        if (tokenData && tokenData.exp * 1000 > Date.now()) {
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          try {
            const response = await apiClient.get('/auth/profile');
            setUser(response.data.user || response.data);
            setupTokenExpiry(tokenData.exp * 1000);
          } catch (error) {
            console.error('Failed to fetch user profile', error);
            handleTokenExpiry();
          }
        } else {
          handleTokenExpiry();
        }
      }
      setIsLoading(false);
    };
    checkUser();
    
    return () => {
      setTokenExpiryTimeout(prevTimeout => {
        if (prevTimeout) {
          clearTimeout(prevTimeout);
        }
        return null;
      });
    };
  }, [parseJWT, setupTokenExpiry, handleTokenExpiry]);

  const login = async (token: string) => {
    localStorage.setItem('authToken', token);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Setup token expiry
    const tokenData = parseJWT(token);
    if (tokenData) {
      setupTokenExpiry(tokenData.exp * 1000);
    }
    
    try {
      const response = await apiClient.get('/auth/profile');
      setUser(response.data.user || response.data);
    } catch (error) {
      console.error('Failed to fetch user profile after login', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    delete apiClient.defaults.headers.common['Authorization'];
    setUser(null);
    if (tokenExpiryTimeout) {
      clearTimeout(tokenExpiryTimeout);
      setTokenExpiryTimeout(null);
    }
  };
  
  const refreshUser = async () => {
    try {
      const response = await apiClient.get('/auth/profile');
      setUser(response.data.user || response.data);
    } catch (error) {
      console.error('Failed to refresh user profile', error);
      handleTokenExpiry();
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};