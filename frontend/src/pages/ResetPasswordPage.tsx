import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { TextField, Button, Container, Typography, Box, Link, Alert } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { resetPassword } from '../api/authApi';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';

interface ResetPasswordFormData {
  newPassword: string;
  confirmPassword: string;
}

const schema = yup.object().shape({
  newPassword: yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .required('New password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('newPassword')], 'Password confirmation does not match')
    .required('Please confirm password'),
});

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  
  const token = searchParams.get('token');

  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordFormData>({
    resolver: yupResolver(schema)
  });

  useEffect(() => {
    if (!token) {
      setIsTokenValid(false);
      setErrorMessage('Reset link is invalid or expired');
    } else {
      setIsTokenValid(true);
    }
  }, [token]);

  const mutation = useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) => 
      resetPassword(token, newPassword),
    onSuccess: () => {
      setErrorMessage('');
      // Show success message and redirect to login
      navigate('/login', { 
        state: { 
          message: 'Password reset successful! Please login with your new password.' 
        } 
      });
    },
    onError: (error: any) => {
      console.error('Password reset failed:', error);
      const message = error?.response?.data?.message || 
                     error?.response?.data?.error || 
                     error?.message || 
                     'Password reset failed, please try again later';
      setErrorMessage(message);
    }
  });

  const onSubmit = (data: ResetPasswordFormData) => {
    if (!token) {
      setErrorMessage('Reset link is invalid');
      return;
    }
    
    setErrorMessage('');
    mutation.mutate({ token, newPassword: data.newPassword });
  };

  if (isTokenValid === false) {
    return (
      <Container maxWidth="xs">
        <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography component="h1" variant="h5">
            Invalid Reset Link
          </Typography>
          <Alert severity="error" sx={{ mt: 3, width: '100%' }}>
            This password reset link is invalid or expired. Please request a new password reset.
          </Alert>
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Link component={RouterLink} to="/forgot-password" variant="body2">
              Request New Password Reset
            </Link>
            <Link component={RouterLink} to="/login" variant="body2">
              Back to Login
            </Link>
          </Box>
        </Box>
      </Container>
    );
  }

  if (isTokenValid === null) {
    return (
      <Container maxWidth="xs">
        <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography>Verifying...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">
          Reset Password
        </Typography>
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
          Please enter your new password
        </Typography>
        {errorMessage && (
          <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
            {errorMessage}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 3, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="New Password"
            type="password"
            id="newPassword"
            autoComplete="new-password"
            {...register('newPassword')}
            error={!!errors.newPassword}
            helperText={errors.newPassword?.message}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Confirm New Password"
            type="password"
            id="confirmPassword"
            autoComplete="new-password"
            {...register('confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Resetting...' : 'Reset Password'}
          </Button>
          <Box sx={{ textAlign: 'center' }}>
            <Link component={RouterLink} to="/login" variant="body2">
              Back to Login
            </Link>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default ResetPasswordPage;