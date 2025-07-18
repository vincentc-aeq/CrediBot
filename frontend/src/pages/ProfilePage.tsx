
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { TextField, Button, Container, Typography, Box, Alert, Paper, Divider } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUserProfile, UpdateProfileData } from '../api/authApi';
import { useAuth } from '../context/AuthContext';

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
}

const schema = yup.object().shape({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  email: yup.string().email('Please enter a valid email address').required('Email is required'),
});

const ProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      email: user?.email || '',
      firstName: user?.firstName || '',
      lastName: (user as any)?.lastName || '',
    }
  });

  useEffect(() => {
    if (user) {
      reset({
        email: user.email,
        firstName: user.firstName,
        lastName: (user as any).lastName || '',
      });
    }
  }, [user, reset]);

  const mutation = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: async () => {
      setErrorMessage('');
      setSuccessMessage('Profile updated successfully!');
      await refreshUser(); // Refresh user data in context
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error: any) => {
      console.error('Update failed:', error);
      const message = error?.response?.data?.message || 
                     error?.response?.data?.error || 
                     error?.message || 
                     'Update failed, please try again later';
      setErrorMessage(message);
      setSuccessMessage('');
    }
  });

  const onSubmit = (data: ProfileFormData) => {
    setErrorMessage('');
    setSuccessMessage('');
    // Only send firstName and lastName to update
    const updateData: UpdateProfileData = {
      firstName: data.firstName,
      lastName: data.lastName
    };
    mutation.mutate(updateData);
  };

  if (!user) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography>Loading profile...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4 }}>
        <Typography component="h1" variant="h4" gutterBottom>
          Profile
        </Typography>
        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        )}
        <Paper elevation={2} sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 3 }}>
          <TextField
            margin="normal"
            fullWidth
            id="email"
            label="Email Address"
            {...register('email')}
            disabled
            helperText="Email address cannot be modified"
          />
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
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Updating...' : 'Update Profile'}
          </Button>
        </Box>
        </Paper>
        
        <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Security Settings
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Button 
            variant="outlined" 
            color="secondary"
            onClick={() => window.location.href = '/change-password'}
          >
            Change Password
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default ProfilePage;
