import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import { CardManagement, UserManagement, SystemAnalytics } from '../components/admin';
import { Box, Container } from '@mui/material';

const AdminPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/cards" element={<CardManagement />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/analytics" element={<SystemAnalytics />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </Container>
  );
};

export default AdminPage;