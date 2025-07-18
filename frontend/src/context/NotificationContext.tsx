import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TransactionNotificationData } from '../components/notifications/TransactionNotification';

interface NotificationContextType {
  notifications: TransactionNotificationData[];
  unreadCount: number;
  isEnabled: boolean;
  addNotification: (notification: Omit<TransactionNotificationData, 'id' | 'timestamp' | 'isRead' | 'isDismissed'>) => void;
  dismissNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAllNotifications: () => void;
  toggleNotifications: () => void;
  getNotificationHistory: () => TransactionNotificationData[];
  updateNotificationPreferences: (preferences: NotificationPreferences) => void;
}

export interface NotificationPreferences {
  enabled: boolean;
  autoHide: boolean;
  autoHideDuration: number;
  enabledTypes: string[];
  minSeverity: 'low' | 'medium' | 'high' | 'urgent';
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxVisible: number;
}

const defaultPreferences: NotificationPreferences = {
  enabled: true,
  autoHide: true,
  autoHideDuration: 8000,
  enabledTypes: ['better_reward', 'missed_opportunity', 'category_optimization', 'spending_threshold'],
  minSeverity: 'low',
  position: 'top-right',
  maxVisible: 3,
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<TransactionNotificationData[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);

  // 從 localStorage 載入偏好設定
  useEffect(() => {
    const savedPreferences = localStorage.getItem('notificationPreferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setPreferences({ ...defaultPreferences, ...parsed });
      } catch (error) {
        console.error('Error parsing notification preferences:', error);
      }
    }
  }, []);

  // 儲存偏好設定到 localStorage
  useEffect(() => {
    localStorage.setItem('notificationPreferences', JSON.stringify(preferences));
  }, [preferences]);

  const addNotification = (notificationData: Omit<TransactionNotificationData, 'id' | 'timestamp' | 'isRead' | 'isDismissed'>) => {
    if (!preferences.enabled) return;
    
    // 檢查通知類型是否啟用
    if (!preferences.enabledTypes.includes(notificationData.type)) return;
    
    // 檢查嚴重程度是否符合最低要求
    const severityOrder = { low: 1, medium: 2, high: 3, urgent: 4 };
    if (severityOrder[notificationData.severity] < severityOrder[preferences.minSeverity]) return;

    const newNotification: TransactionNotificationData = {
      ...notificationData,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      isRead: false,
      isDismissed: false,
    };

    setNotifications(prev => [newNotification, ...prev]);

    // 自動標記為已讀（如果是低嚴重程度）
    if (notificationData.severity === 'low') {
      setTimeout(() => {
        markAsRead(newNotification.id);
      }, 2000);
    }
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, isDismissed: true }
          : notification
      )
    );
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const toggleNotifications = () => {
    setPreferences(prev => ({ ...prev, enabled: !prev.enabled }));
  };

  const getNotificationHistory = () => {
    return notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const updateNotificationPreferences = (newPreferences: NotificationPreferences) => {
    setPreferences(newPreferences);
  };

  const unreadCount = notifications.filter(n => !n.isRead && !n.isDismissed).length;

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isEnabled: preferences.enabled,
    addNotification,
    dismissNotification,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    toggleNotifications,
    getNotificationHistory,
    updateNotificationPreferences,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;