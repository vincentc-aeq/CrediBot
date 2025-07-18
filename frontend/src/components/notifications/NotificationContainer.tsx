import React, { useState, useEffect } from 'react';
import {
  Box,
  Portal,
  Fade,
  Stack,
  Badge,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
} from '@mui/icons-material';
import TransactionNotification, { TransactionNotificationData } from './TransactionNotification';

interface NotificationContainerProps {
  notifications: TransactionNotificationData[];
  onDismiss: (id: string) => void;
  onMarkAsRead: (id: string) => void;
  onLearnMore: (notification: TransactionNotificationData) => void;
  onApplyCard: (cardId: string) => void;
  onToggleNotifications?: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxVisible?: number;
  showToggle?: boolean;
  isEnabled?: boolean;
}

const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onDismiss,
  onMarkAsRead,
  onLearnMore,
  onApplyCard,
  onToggleNotifications,
  position = 'top-right',
  maxVisible = 3,
  showToggle = true,
  isEnabled = true,
}) => {
  const [visibleNotifications, setVisibleNotifications] = useState<TransactionNotificationData[]>([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Manage displayed notifications
  useEffect(() => {
    const activeNotifications = notifications.filter(n => !n.isDismissed);
    const sortedNotifications = activeNotifications.sort((a, b) => {
      // Sort by severity and time
      const severityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    setVisibleNotifications(sortedNotifications.slice(0, maxVisible));
  }, [notifications, maxVisible]);

  const getPositionStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      zIndex: theme.zIndex.snackbar,
      pointerEvents: 'none' as const,
    };

    if (isMobile) {
      return {
        ...baseStyles,
        top: theme.spacing(2),
        left: theme.spacing(2),
        right: theme.spacing(2),
      };
    }

    switch (position) {
      case 'top-right':
        return {
          ...baseStyles,
          top: theme.spacing(10), // Add top spacing to avoid overlap with navigation bar
          right: theme.spacing(2),
        };
      case 'top-left':
        return {
          ...baseStyles,
          top: theme.spacing(10), // Add top spacing to avoid overlap with navigation bar
          left: theme.spacing(2),
        };
      case 'bottom-right':
        return {
          ...baseStyles,
          bottom: theme.spacing(2),
          right: theme.spacing(2),
        };
      case 'bottom-left':
        return {
          ...baseStyles,
          bottom: theme.spacing(2),
          left: theme.spacing(2),
        };
      default:
        return {
          ...baseStyles,
          top: theme.spacing(2),
          right: theme.spacing(2),
        };
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead && !n.isDismissed).length;
  const isTopPosition = position.includes('top');

  return (
    <>
      {/* Notification toggle button moved to top navigation bar */}

      {/* Notification container */}
      {isEnabled && (
        <Portal>
          <Box sx={getPositionStyles()}>
            <Stack
              spacing={1}
              direction={isTopPosition ? 'column' : 'column-reverse'}
              sx={{ pointerEvents: 'auto' }}
            >
              {visibleNotifications.map((notification) => (
                <Fade key={notification.id} in={true} timeout={300}>
                  <Box>
                    <TransactionNotification
                      notification={notification}
                      onDismiss={onDismiss}
                      onMarkAsRead={onMarkAsRead}
                      onLearnMore={onLearnMore}
                      onApplyCard={onApplyCard}
                      position={isTopPosition ? 'top' : 'bottom'}
                      autoHideDuration={notification.severity === 'urgent' ? 0 : 8000}
                    />
                  </Box>
                </Fade>
              ))}
            </Stack>
          </Box>
        </Portal>
      )}
    </>
  );
};

export default NotificationContainer;