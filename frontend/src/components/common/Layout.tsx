
import React, { ReactNode } from 'react';
import { AppBar, Toolbar, Typography, Button, Container, IconButton, Badge, Tooltip, Box } from '@mui/material';
import { Notifications as NotificationsIcon, NotificationsOff as NotificationsOffIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { isAuthenticated, logout } = useAuth();
  const { notifications, toggleNotifications, isEnabled } = useNotification();
  
  const unreadCount = notifications.filter(n => !n.isRead && !n.isDismissed).length;

  return (
    <>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: 'center', px: 0 }}>
          <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              <RouterLink to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                CrediBot
              </RouterLink>
            </Typography>
            {isAuthenticated ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Button color="inherit" component={RouterLink} to="/">
                  Home
                </Button>
                <Button color="inherit" component={RouterLink} to="/dashboard">
                  Dashboard
                </Button>
                <Button color="inherit" component={RouterLink} to="/profile">
                  Profile
                </Button>
                <Button color="inherit" component={RouterLink} to="/settings">
                  Settings
                </Button>
                <Tooltip title={isEnabled ? 'Turn off notifications' : 'Turn on notifications'}>
                  <IconButton color="inherit" onClick={toggleNotifications}>
                    <Badge badgeContent={unreadCount} color="error">
                      {isEnabled ? <NotificationsIcon /> : <NotificationsOffIcon />}
                    </Badge>
                  </IconButton>
                </Tooltip>
                <Button color="inherit" onClick={logout}>
                  Logout
                </Button>
              </Box>
            ) : (
              <Button color="inherit" component={RouterLink} to="/login">
                Login
              </Button>
            )}
          </Container>
        </Toolbar>
      </AppBar>
      <Container component="main" sx={{ mt: 4, mb: 4 }}>
        {children}
      </Container>
    </>
  );
};

export default Layout;
