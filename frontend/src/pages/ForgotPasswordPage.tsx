import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { TextField, Button, Container, Typography, Box, Link, Alert } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { requestPasswordReset } from '../api/authApi';
import { Link as RouterLink } from 'react-router-dom';

interface ForgotPasswordFormData {
  email: string;
}

const schema = yup.object().shape({
  email: yup.string().email('Please enter a valid email address').required('Email is required'),
});

const ForgotPasswordPage = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const { register, handleSubmit, formState: { errors }, getValues } = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(schema)
  });

  const mutation = useMutation({
    mutationFn: requestPasswordReset,
    onSuccess: () => {
      setErrorMessage('');
      setIsSubmitted(true);
    },
    onError: (error: any) => {
      console.error('Password reset request failed:', error);
      const message = error?.response?.data?.message || 
                     error?.response?.data?.error || 
                     error?.message || 
                     'Request failed, please try again later';
      setErrorMessage(message);
    }
  });

  const onSubmit = (data: ForgotPasswordFormData) => {
    setErrorMessage('');
    mutation.mutate(data.email);
  };

  if (isSubmitted) {
    return (
      <Container maxWidth="xs">
        <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography component="h1" variant="h5">
            Password Reset Email Sent
          </Typography>
          <Alert severity="success" sx={{ mt: 3, width: '100%' }}>
            We have sent a password reset link to <strong>{getValues('email')}</strong>.
            Please check your email and click the link to reset your password.
          </Alert>
          <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
            Didn't receive the email? Please check your spam folder, or
            <Link 
              component="button" 
              onClick={() => setIsSubmitted(false)}
              sx={{ ml: 0.5 }}
            >
              Resend
            </Link>
          </Typography>
          <Box sx={{ mt: 3 }}>
            <Link component={RouterLink} to="/login" variant="body2">
              Back to Login
            </Link>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">
          Forgot Password
        </Typography>
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
          Please enter your email address and we will send you a password reset link.
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
            id="email"
            label="Email Address"
            autoComplete="email"
            autoFocus
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Sending...' : 'Send Reset Link'}
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

export default ForgotPasswordPage;