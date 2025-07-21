
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { TextField, Button, Container, Typography, Box, Link, Alert, Checkbox, FormControlLabel } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { loginUser } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

const schema = yup.object().shape({
  email: yup.string().email('Please enter a valid email address').required('Email is required'),
  password: yup.string().required('Password is required'),
  rememberMe: yup.boolean().optional(),
});

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: yupResolver(schema)
  });

  const mutation = useMutation({
    mutationFn: loginUser,
    onSuccess: async (data) => {
      setErrorMessage('');
      try {
        await login(data.token);
        navigate('/');
      } catch (error) {
        console.error('Login process failed:', error);
        setErrorMessage('An error occurred during login, please try again.');
      }
    },
    onError: (error: any) => {
      console.error('Login failed:', error);
      // Extract error message from different response structures
      const message = error?.response?.data?.error?.message || 
                     error?.response?.data?.message || 
                     error?.response?.data?.error || 
                     error?.message || 
                     'Login failed, please check your email and password';
      setErrorMessage(message);
    }
  });

  const onSubmit = (data: LoginFormData) => {
    setErrorMessage('');
    mutation.mutate(data);
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">
          Login
        </Typography>
        {errorMessage && (
          <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
            {errorMessage}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 3 }}>
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
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Logging in...' : 'Login'}
          </Button>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <FormControlLabel
              control={<Checkbox {...register('rememberMe')} />}
              label="Remember me"
            />
          </Box>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Link component={RouterLink} to="/register" variant="body2">
              Don't have an account? Register
            </Link>
            <Link component={RouterLink} to="/forgot-password" variant="body2">
              Forgot password?
            </Link>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default LoginPage;
