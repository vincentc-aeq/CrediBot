import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  TextField,
  Grid,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Menu,
  Switch,
  FormControlLabel,
  Slider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  PlayArrow,
  Pause,
  Stop,
  Visibility,
  ExpandMore,
  Science,
  Timeline,
  Assessment,
  Settings,
  Info,
  Warning,
  CheckCircle,
  MoreVert,
  ContentCopy as Copy,
  Download
} from '@mui/icons-material';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Line, Bar } from 'react-chartjs-2';
import { adminApi, ABTestConfig } from '../../api/adminApi';

interface ABTestFormData {
  name: string;
  description: string;
  variants: Array<{
    name: string;
    percentage: number;
    config: Record<string, any>;
  }>;
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate: string;
  endDate: string;
  targetMetric: string;
}

const targetMetrics = [
  { value: 'click_through_rate', label: 'Click Through Rate' },
  { value: 'conversion_rate', label: 'Conversion Rate' },
  { value: 'user_engagement', label: 'User Engagement' },
  { value: 'retention_rate', label: 'Retention Rate' },
  { value: 'revenue_per_user', label: 'Revenue Per User' },
  { value: 'session_duration', label: 'Session Duration' }
];

export const ABTestingManagement: React.FC = () => {
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<ABTestConfig | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuTest, setMenuTest] = useState<ABTestConfig | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const queryClient = useQueryClient();

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<ABTestFormData>({
    defaultValues: {
      name: '',
      description: '',
      variants: [
        { name: 'Control', percentage: 50, config: {} },
        { name: 'Variant A', percentage: 50, config: {} }
      ],
      status: 'draft',
      startDate: '',
      endDate: '',
      targetMetric: ''
    }
  });

  const { fields: variants, append: appendVariant, remove: removeVariant } = useFieldArray({
    control,
    name: 'variants'
  });

  const watchedVariants = watch('variants');

  // Get A/B testing list
  const { data: testsData, isLoading } = useQuery({
    queryKey: ['ab-tests'],
    queryFn: adminApi.getABTests,
    refetchInterval: 30000,
  });

  // Create A/B test
  const createTestMutation = useMutation({
    mutationFn: adminApi.createABTest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      setTestDialogOpen(false);
      reset();
    },
  });

  // Update A/B test
  const updateTestMutation = useMutation({
    mutationFn: ({ testId, data }: { testId: string; data: Partial<ABTestConfig> }) =>
      adminApi.updateABTest(testId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      setTestDialogOpen(false);
      reset();
    },
  });

  // Delete A/B test
  const deleteTestMutation = useMutation({
    mutationFn: adminApi.deleteABTest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      setDeleteDialogOpen(false);
      setSelectedTest(null);
    },
  });

  const tests = testsData?.tests || [];

  const handleCreateTest = () => {
    setSelectedTest(null);
    setTestDialogOpen(true);
    reset();
  };

  const handleEditTest = (test: ABTestConfig) => {
    setSelectedTest(test);
    setTestDialogOpen(true);
    reset({
      name: test.name,
      description: test.description,
      variants: test.variants,
      status: test.status,
      startDate: test.startDate,
      endDate: test.endDate || '',
      targetMetric: test.targetMetric
    });
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, test: ABTestConfig) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuTest(test);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuTest(null);
  };

  const handleViewTest = (test: ABTestConfig) => {
    setSelectedTest(test);
    setDetailDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteTest = (test: ABTestConfig) => {
    setSelectedTest(test);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleStatusChange = (test: ABTestConfig, newStatus: ABTestConfig['status']) => {
    updateTestMutation.mutate({
      testId: test.id!,
      data: { status: newStatus }
    });
  };

  const onSubmit = (data: ABTestFormData) => {
    if (selectedTest) {
      updateTestMutation.mutate({
        testId: selectedTest.id!,
        data: {
          ...data,
          endDate: data.endDate || undefined
        }
      });
    } else {
      createTestMutation.mutate({
        ...data,
        endDate: data.endDate || undefined
      });
    }
  };

  const getTotalPercentage = () => {
    return watchedVariants.reduce((sum, variant) => sum + variant.percentage, 0);
  };

  const getStatusColor = (status: ABTestConfig['status']) => {
    switch (status) {
      case 'draft': return 'default';
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: ABTestConfig['status']) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'active': return 'Active';
      case 'paused': return 'Paused';
      case 'completed': return 'Completed';
      default: return 'Unknown';
    }
  };

  const getStatusIcon = (status: ABTestConfig['status']) => {
    switch (status) {
      case 'draft': return <Edit />;
      case 'active': return <PlayArrow />;
      case 'paused': return <Pause />;
      case 'completed': return <CheckCircle />;
      default: return <Info />;
    }
  };

  // Mock test result data
  const mockTestResults = {
    labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
    datasets: [
      {
        label: 'Control',
        data: [12, 19, 13, 15, 12, 13, 14],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      },
      {
        label: 'Variant A',
        data: [14, 22, 16, 18, 15, 17, 19],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1
      }
    ]
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          A/B Testing Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateTest}
        >
          Add Test
        </Button>
      </Box>

      {/* Test list */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Test Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Variants</TableCell>
              <TableCell>Target Metric</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tests.map((test) => (
              <TableRow key={test.id}>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2">
                      {test.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {test.description}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    icon={getStatusIcon(test.status)}
                    label={getStatusLabel(test.status)}
                    color={getStatusColor(test.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{test.variants.length}</TableCell>
                <TableCell>{test.targetMetric}</TableCell>
                <TableCell>
                  {format(new Date(test.startDate), 'yyyy/MM/dd', { locale: zhTW })}
                </TableCell>
                <TableCell>
                  {test.endDate ? format(new Date(test.endDate), 'yyyy/MM/dd', { locale: zhTW }) : '-'}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {test.status === 'draft' && (
                      <Tooltip title="Start Test">
                        <IconButton
                          size="small"
                          onClick={() => handleStatusChange(test, 'active')}
                        >
                          <PlayArrow />
                        </IconButton>
                      </Tooltip>
                    )}
                    {test.status === 'active' && (
                      <Tooltip title="Pause Test">
                        <IconButton
                          size="small"
                          onClick={() => handleStatusChange(test, 'paused')}
                        >
                          <Pause />
                        </IconButton>
                      </Tooltip>
                    )}
                    {test.status === 'paused' && (
                      <Tooltip title="Resume Test">
                        <IconButton
                          size="small"
                          onClick={() => handleStatusChange(test, 'active')}
                        >
                          <PlayArrow />
                        </IconButton>
                      </Tooltip>
                    )}
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, test)}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => menuTest && handleViewTest(menuTest)}>
          <Visibility sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={() => menuTest && handleEditTest(menuTest)}>
          <Edit sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => menuTest && navigator.clipboard.writeText(menuTest.id!)}>
          <Copy sx={{ mr: 1 }} />
          Copy ID
        </MenuItem>
        <MenuItem onClick={() => menuTest && handleDeleteTest(menuTest)}>
          <Delete sx={{ mr: 1 }} color="error" />
          Delete
        </MenuItem>
      </Menu>

      {/* Test creation/edit dialog */}
      <Dialog
        open={testDialogOpen}
        onClose={() => setTestDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedTest ? 'Edit A/B Test' : 'Add A/B Test'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              {/* Basic information */}
              <Grid xs={12}>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
              </Grid>
              <Grid xs={12} md={6}>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: 'Test name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Test Name"
                      fullWidth
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  )}
                />
              </Grid>
              <Grid xs={12} md={6}>
                <Controller
                  name="targetMetric"
                  control={control}
                  rules={{ required: 'Target metric is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.targetMetric}>
                      <InputLabel>Target Metric</InputLabel>
                      <Select {...field} label="Target Metric">
                        {targetMetrics.map(metric => (
                          <MenuItem key={metric.value} value={metric.value}>
                            {metric.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid xs={12}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Description"
                      fullWidth
                      multiline
                      rows={3}
                    />
                  )}
                />
              </Grid>
              <Grid xs={12} md={6}>
                <Controller
                  name="startDate"
                  control={control}
                  rules={{ required: 'Start date is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Start Date"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.startDate}
                      helperText={errors.startDate?.message}
                    />
                  )}
                />
              </Grid>
              <Grid xs={12} md={6}>
                <Controller
                  name="endDate"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="End Date (Optional)"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              </Grid>

              {/* Variant configuration */}
              <Grid xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Variant Configuration
                  </Typography>
                  <Button
                    startIcon={<Add />}
                    onClick={() => appendVariant({
                      name: `Variant ${variants.length}`,
                      percentage: 0,
                      config: {}
                    })}
                  >
                    Add Variant
                  </Button>
                </Box>
                
                {/* Traffic allocation reminder */}
                <Alert 
                  severity={getTotalPercentage() === 100 ? 'success' : 'warning'}
                  sx={{ mb: 2 }}
                >
                  Traffic Allocation Total: {getTotalPercentage()}%
                  {getTotalPercentage() !== 100 && ' (Please ensure total is 100%)'}
                </Alert>
              </Grid>

              {variants.map((variant, index) => (
                <Grid xs={12} key={variant.id}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Typography variant="subtitle1">
                          {watchedVariants[index]?.name || `Variant ${index + 1}`}
                        </Typography>
                        <Chip
                          label={`${watchedVariants[index]?.percentage || 0}%`}
                          size="small"
                        />
                        {variants.length > 2 && (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeVariant(index);
                            }}
                          >
                            <Delete />
                          </IconButton>
                        )}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid xs={12} md={6}>
                          <Controller
                            name={`variants.${index}.name`}
                            control={control}
                            rules={{ required: 'Variant name is required' }}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                label="Variant Name"
                                fullWidth
                                error={!!errors.variants?.[index]?.name}
                                helperText={errors.variants?.[index]?.name?.message}
                              />
                            )}
                          />
                        </Grid>
                        <Grid xs={12} md={6}>
                          <Controller
                            name={`variants.${index}.percentage`}
                            control={control}
                            rules={{ 
                              required: 'Traffic allocation is required',
                              min: { value: 0, message: 'Traffic allocation cannot be less than 0' },
                              max: { value: 100, message: 'Traffic allocation cannot exceed 100' }
                            }}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                label="Traffic Allocation (%)"
                                type="number"
                                fullWidth
                                inputProps={{ min: 0, max: 100 }}
                                error={!!errors.variants?.[index]?.percentage}
                                helperText={errors.variants?.[index]?.percentage?.message}
                              />
                            )}
                          />
                        </Grid>
                        <Grid xs={12}>
                          <Typography variant="body2" color="text.secondary">
                            Variant Configuration (JSON format)
                          </Typography>
                          <TextField
                            fullWidth
                            multiline
                            rows={3}
                            placeholder='{"feature": "enabled", "color": "blue"}'
                            sx={{ mt: 1 }}
                          />
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              ))}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            variant="contained"
            disabled={createTestMutation.isPending || updateTestMutation.isPending}
          >
            {createTestMutation.isPending || updateTestMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test details dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Test Details</DialogTitle>
        <DialogContent>
          {selectedTest && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid xs={12} md={6}>
                  <Card>
                    <CardHeader title="Test Information" />
                    <CardContent>
                      <Typography variant="body2">
                        <strong>Name:</strong> {selectedTest.name}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Description:</strong> {selectedTest.description}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Status:</strong> {getStatusLabel(selectedTest.status)}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Target Metric:</strong> {selectedTest.targetMetric}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid xs={12} md={6}>
                  <Card>
                    <CardHeader title="Variant Distribution" />
                    <CardContent>
                      <List dense>
                        {selectedTest.variants.map((variant, index) => (
                          <ListItem key={index}>
                            <ListItemText
                              primary={variant.name}
                              secondary={`${variant.percentage}% traffic`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid xs={12}>
                  <Card>
                    <CardHeader title="Test Results" />
                    <CardContent>
                      <Box sx={{ height: 300 }}>
                        <Line
                          data={mockTestResults}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'top',
                              },
                              title: {
                                display: true,
                                text: 'Test Results Trend',
                              },
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                              },
                            },
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete test "{selectedTest?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => selectedTest && deleteTestMutation.mutate(selectedTest.id!)}
            color="error"
            disabled={deleteTestMutation.isPending}
          >
            {deleteTestMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ABTestingManagement;