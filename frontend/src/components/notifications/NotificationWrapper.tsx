import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import useWebSocket from '../../hooks/useWebSocket';
import NotificationContainer from './NotificationContainer';
import NotificationHistory from './NotificationHistory';
import CardDetailsModal from '../recommendations/CardDetailsModal';
import { TransactionNotificationData } from './TransactionNotification';
import { RecommendationItem } from '../../api/recommendationApi';

const NotificationWrapper: React.FC = () => {
  const { user } = useAuth();
  const { notifications, dismissNotification, markAsRead, toggleNotifications, isEnabled } = useNotification();
  const [showHistory, setShowHistory] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<TransactionNotificationData | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);

  // Re-enable WebSocket connection
  const { connectionStats, acknowledgeNotification, updateNotificationPreferences } = useWebSocket({
    autoConnect: !!user,  // Only auto-connect when user is logged in
    enableReconnection: true,
    maxReconnectionAttempts: 5,
    reconnectionDelay: 3000,
  });

  // Handle notification dismissal
  const handleDismissNotification = (id: string) => {
    dismissNotification(id);
    acknowledgeNotification(id, 'dismissed');
  };

  // Handle mark as read
  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
    acknowledgeNotification(id, 'read');
  };

  // Handle 'learn more'
  const handleLearnMore = (notification: TransactionNotificationData) => {
    setSelectedNotification(notification);
    setShowCardModal(true);
    handleMarkAsRead(notification.id);
    acknowledgeNotification(notification.id, 'learn_more');
  };

  // Handle card application
  const handleApplyCard = (cardId: string) => {
    console.log('Apply for card:', cardId);
    // Here you can implement card application logic
    // For example: navigate to application page or show application form
    
    if (selectedNotification) {
      acknowledgeNotification(selectedNotification.id, 'apply_card');
    }
    
    setShowCardModal(false);
  };

  // Handle notification toggle
  const handleToggleNotifications = () => {
    toggleNotifications();
    updateNotificationPreferences({
      enabled: !isEnabled,
      enabledTypes: ['transaction_notification', 'recommendation_update'],
      minPriority: 'low',
    });
  };

  // Create recommendation item from notification data
  const createRecommendationFromNotification = (notification: TransactionNotificationData): RecommendationItem => {
    return {
      cardId: notification.recommendation.cardId,
      cardName: notification.recommendation.cardName,
      score: 0.8, // Assumed score
      reasoning: notification.message,
      estimatedBenefit: notification.recommendation.estimatedBenefit,
      confidence: 0.8,
      priority: notification.severity as 'high' | 'medium' | 'low',
      ctaText: notification.ctaText,
      messageTitle: notification.title,
      messageDescription: notification.message,
      tags: ['notification', notification.type],
    };
  };

  // Only show notifications when user is logged in
  if (!user) {
    return null;
  }

  return (
    <>
      {/* Notification container */}
      <NotificationContainer
        notifications={notifications}
        onDismiss={handleDismissNotification}
        onMarkAsRead={handleMarkAsRead}
        onLearnMore={handleLearnMore}
        onApplyCard={handleApplyCard}
        onToggleNotifications={handleToggleNotifications}
        isEnabled={isEnabled}
        position="top-right"
        maxVisible={3}
        showToggle={true}
      />

      {/* Notification history dialog */}
      <NotificationHistory
        open={showHistory}
        onClose={() => setShowHistory(false)}
        onLearnMore={handleLearnMore}
        onApplyCard={handleApplyCard}
      />

      {/* Card details modal */}
      {selectedNotification && (
        <CardDetailsModal
          open={showCardModal}
          onClose={() => setShowCardModal(false)}
          recommendation={createRecommendationFromNotification(selectedNotification)}
          onApplyCard={handleApplyCard}
        />
      )}

      {/* Connection status indicator (development mode) */}
      {process.env.NODE_ENV === 'development' && (
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            left: 16,
            padding: '8px 12px',
            borderRadius: 4,
            backgroundColor: connectionStats.isConnected ? '#4caf50' : '#f44336',
            color: 'white',
            fontSize: 12,
            zIndex: 9999,
          }}
        >
          WS: {connectionStats.isConnected ? 'Connected' : 'Disconnected'}
          {connectionStats.reconnectionAttempts > 0 && (
            <span> (Attempts: {connectionStats.reconnectionAttempts})</span>
          )}
        </div>
      )}
    </>
  );
};

export default NotificationWrapper;