
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { TextField, Button, Container, Typography, Box, Alert, Link, FormControlLabel, Checkbox } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { registerUser } from '../api/authApi';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

const schema = yup.object().shape({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  email: yup.string().email('Please enter a valid email address').required('Email is required'),
  password: yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .required('Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password')], 'Password confirmation does not match')
    .required('Please confirm your password'),
  agreeToTerms: yup.boolean()
    .oneOf([true], 'You must agree to the Terms of Service and Privacy Policy')
    .required('You must agree to the Terms of Service and Privacy Policy'),
});

const RegisterPage = () => {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: yupResolver(schema)
  });

  const mutation = useMutation({
    mutationFn: registerUser,
    onSuccess: () => {
      setErrorMessage('');
      setSuccessMessage('Registration successful! Redirecting to login page...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    },
    onError: (error: any) => {
      console.error('Registration failed:', error);
      const message = error?.response?.data?.message || 
                     error?.response?.data?.error || 
                     error?.message || 
                     'Registration failed, please try again later';
      setErrorMessage(message);
      setSuccessMessage('');
    }
  });

  const onSubmit = (data: RegisterFormData) => {
    setErrorMessage('');
    setSuccessMessage('');
    // Don't send confirmPassword and agreeToTerms to backend
    const { confirmPassword, agreeToTerms, ...submitData } = data;
    mutation.mutate(submitData);
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">
          Register
        </Typography>
        {errorMessage && (
          <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
            {errorMessage}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" sx={{ mt: 2, width: '100%' }}>
            {successMessage}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 3 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="firstName"
            label="First Name"
            {...register('firstName')}
            error={!!errors.firstName}
            helperText={errors.firstName?.message}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="lastName"
            label="Last Name"
            {...register('lastName')}
            error={!!errors.lastName}
            helperText={errors.lastName?.message}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Password"
            type="password"
            id="password"
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Confirm Password"
            type="password"
            id="confirmPassword"
            {...register('confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
          />
          <FormControlLabel
            control={
              <Checkbox
                {...register('agreeToTerms')}
                color="primary"
              />
            }
            label={
              <Typography variant="body2">
                I agree to the
                <Link component={RouterLink} to="/terms" sx={{ mx: 0.5 }}>
                  Terms of Service
                </Link>
                and
                <Link component={RouterLink} to="/privacy" sx={{ mx: 0.5 }}>
                  Privacy Policy
                </Link>
              </Typography>
            }
            sx={{ mt: 1, alignItems: 'flex-start' }}
          />
          {errors.agreeToTerms && (
            <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
              {errors.agreeToTerms.message}
            </Typography>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Registering...' : 'Register'}
          </Button>
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Link component={RouterLink} to="/login" variant="body2">
              Already have an account? Log in
            </Link>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default RegisterPage;
