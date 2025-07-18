
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { TextField, Button, Container, Typography, Box, Alert, FormGroup, FormControlLabel, Checkbox, Slider } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserPreferences, updateUserPreferences } from '../api/authApi';

const schema = yup.object().shape({
  cardTypes: yup.array().of(yup.string()),
  maxAnnualFee: yup.number().min(0),
});

const cardTypeOptions = ['cashback', 'travel', 'business', 'rewards'];

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const { data: preferences, isLoading } = useQuery({ 
    queryKey: ['preferences'], 
    queryFn: getUserPreferences 
  });

  const { control, handleSubmit, reset } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      cardTypes: [],
      maxAnnualFee: 250,
    }
  });

  useEffect(() => {
    if (preferences) {
      reset(preferences);
    }
  }, [preferences, reset]);

  const mutation = useMutation({
    mutationFn: updateUserPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
    }
  });

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  if (isLoading) {
    return <Typography>Loading settings...</Typography>;
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4 }}>
        <Typography component="h1" variant="h4" gutterBottom>
          Preferences
        </Typography>
        {mutation.isSuccess && <Alert severity="success">Preferences updated successfully!</Alert>}
        {mutation.isError && <Alert severity="error">Failed to update preferences.</Alert>}
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 3 }}>
          <Typography variant="h6">Preferred Card Types</Typography>
          <FormGroup>
            <Controller
              name="cardTypes"
              control={control}
              render={({ field }) => (
                <>
                  {cardTypeOptions.map(option => (
                    <FormControlLabel
                      key={option}
                      control={<Checkbox checked={field.value.includes(option)} onChange={(e) => {
                        const newValue = e.target.checked
                          ? [...field.value, option]
                          : field.value.filter((v: string) => v !== option);
                        field.onChange(newValue);
                      }} />}
                      label={option.charAt(0).toUpperCase() + option.slice(1)}
                    />
                  ))}
                </>
              )}
            />
          </FormGroup>

          <Typography variant="h6" sx={{ mt: 4 }}>
            Maximum Annual Fee
          </Typography>
          <Controller
            name="maxAnnualFee"
            control={control}
            render={({ field }) => (
              <Slider
                {...field}
                aria-label="Maximum Annual Fee"
                defaultValue={250}
                valueLabelDisplay="auto"
                step={10}
                marks
                min={0}
                max={1000}
              />
            )}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Saving...' : 'Save Preferences'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default SettingsPage;
