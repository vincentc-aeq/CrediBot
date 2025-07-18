import React, { useState, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  IconButton,
  Chip,
  Divider,
  Alert,
  InputAdornment,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add,
  Delete,
  Save,
  Cancel,
  Info,
  AttachMoney,
  Percent,
  Star,
  CreditCard,
  Business
} from '@mui/icons-material';
import { adminApi, CreditCardData } from '../../api/adminApi';

const cardSchema = yup.object().shape({
  name: yup.string().required('卡片名稱為必填項目'),
  issuer: yup.string().required('發行商為必填項目'),
  cardType: yup.string().required('卡片類型為必填項目'),
  annualFee: yup.number().min(0, '年費不能為負數').required('年費為必填項目'),
  rewardStructure: yup.object().test(
    'not-empty',
    '至少需要一個獎勵類別',
    (value) => value && Object.keys(value).length > 0
  ),
  signupBonus: yup.object().shape({
    requirement: yup.number().min(0, '簽帳要求不能為負數').required('簽帳要求為必填項目'),
    points: yup.number().min(0, '獎勵點數不能為負數').required('獎勵點數為必填項目'),
    timeframe: yup.number().min(1, '時限至少為1個月').required('時限為必填項目'),
  }),
  apr: yup.object().shape({
    regular: yup.number().min(0, 'APR不能為負數').max(100, 'APR不能超過100%').required('一般APR為必填項目'),
    promotional: yup.number().min(0, '促銷APR不能為負數').max(100, '促銷APR不能超過100%').nullable(),
    promotionalEndDate: yup.string().nullable(),
  }),
  features: yup.array().of(yup.string()).min(1, '至少需要一個特色功能'),
  pros: yup.array().of(yup.string()).min(1, '至少需要一個優點'),
  cons: yup.array().of(yup.string()).min(1, '至少需要一個缺點'),
  bestFor: yup.array().of(yup.string()).min(1, '至少需要一個適用人群'),
  isActive: yup.boolean(),
});

interface CardFormProps {
  card?: CreditCardData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const cardTypes = [
  'cashback',
  'rewards',
  'travel',
  'business',
  'student',
  'secured',
  'premium'
];

const rewardCategories = [
  'dining',
  'groceries',
  'gas',
  'travel',
  'entertainment',
  'shopping',
  'online',
  'utilities',
  'general'
];

const issuers = [
  'Chase',
  'American Express',
  'Citibank',
  'Bank of America',
  'Capital One',
  'Discover',
  'Wells Fargo',
  'US Bank',
  'Barclays',
  'HSBC'
];

export const CardForm: React.FC<CardFormProps> = ({
  card,
  onSuccess,
  onCancel
}) => {
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [newRewardCategory, setNewRewardCategory] = useState('');
  const [newRewardRate, setNewRewardRate] = useState('');
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [currentListType, setCurrentListType] = useState<'features' | 'pros' | 'cons' | 'bestFor'>('features');
  const [newListItem, setNewListItem] = useState('');

  const queryClient = useQueryClient();
  const isEditing = Boolean(card);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<CreditCardData>({
    resolver: yupResolver(cardSchema) as any,
    defaultValues: card || {
      name: '',
      issuer: '',
      cardType: '',
      annualFee: 0,
      rewardStructure: {},
      signupBonus: {
        requirement: 0,
        points: 0,
        timeframe: 3
      },
      apr: {
        regular: 0,
        promotional: undefined,
        promotionalEndDate: undefined
      },
      features: [],
      pros: [],
      cons: [],
      bestFor: [],
      isActive: true
    }
  });

  const watchedRewardStructure = watch('rewardStructure');
  const watchedFeatures = watch('features');
  const watchedPros = watch('pros');
  const watchedCons = watch('cons');
  const watchedBestFor = watch('bestFor');

  // 創建/更新卡片
  const createMutation = useMutation({
    mutationFn: adminApi.createCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cards'] });
      queryClient.invalidateQueries({ queryKey: ['card-statistics'] });
      onSuccess?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ cardId, data }: { cardId: string; data: Partial<CreditCardData> }) =>
      adminApi.updateCard(cardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cards'] });
      queryClient.invalidateQueries({ queryKey: ['card-statistics'] });
      onSuccess?.();
    },
  });

  const onSubmit = (data: CreditCardData) => {
    if (isEditing && card?.id) {
      updateMutation.mutate({ cardId: card.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleAddReward = () => {
    if (newRewardCategory && newRewardRate) {
      const currentRewards = watchedRewardStructure || {};
      setValue('rewardStructure', {
        ...currentRewards,
        [newRewardCategory]: parseFloat(newRewardRate)
      });
      setNewRewardCategory('');
      setNewRewardRate('');
      setRewardDialogOpen(false);
    }
  };

  const handleRemoveReward = (category: string) => {
    const currentRewards = watchedRewardStructure || {};
    const newRewards = { ...currentRewards };
    delete newRewards[category];
    setValue('rewardStructure', newRewards);
  };

  const handleAddListItem = () => {
    if (newListItem.trim()) {
      const currentList = watch(currentListType) || [];
      setValue(currentListType, [...currentList, newListItem.trim()]);
      setNewListItem('');
      setListDialogOpen(false);
    }
  };

  const handleRemoveListItem = (listType: 'features' | 'pros' | 'cons' | 'bestFor', index: number) => {
    const currentList = watch(listType) || [];
    const newList = currentList.filter((_, i) => i !== index);
    setValue(listType, newList);
  };

  const openListDialog = (listType: 'features' | 'pros' | 'cons' | 'bestFor') => {
    setCurrentListType(listType);
    setListDialogOpen(true);
  };

  const getListTitle = (listType: 'features' | 'pros' | 'cons' | 'bestFor') => {
    switch (listType) {
      case 'features': return '特色功能';
      case 'pros': return '優點';
      case 'cons': return '缺點';
      case 'bestFor': return '適用人群';
      default: return '';
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit as any)}>
      <Typography variant="h5" gutterBottom>
        {isEditing ? '編輯信用卡' : '新增信用卡'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error.message || '操作失敗，請稍後再試'}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* 基本資訊 */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="基本資訊" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="卡片名稱"
                        fullWidth
                        error={!!errors.name}
                        helperText={errors.name?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <CreditCard />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="issuer"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.issuer}>
                        <InputLabel>發行商</InputLabel>
                        <Select
                          {...field}
                          label="發行商"
                          startAdornment={
                            <InputAdornment position="start">
                              <Business />
                            </InputAdornment>
                          }
                        >
                          {issuers.map(issuer => (
                            <MenuItem key={issuer} value={issuer}>
                              {issuer}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.issuer && (
                          <Typography variant="caption" color="error">
                            {errors.issuer.message}
                          </Typography>
                        )}
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="cardType"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.cardType}>
                        <InputLabel>卡片類型</InputLabel>
                        <Select {...field} label="卡片類型">
                          {cardTypes.map(type => (
                            <MenuItem key={type} value={type}>
                              {type}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.cardType && (
                          <Typography variant="caption" color="error">
                            {errors.cardType.message}
                          </Typography>
                        )}
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="annualFee"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="年費"
                        type="number"
                        fullWidth
                        error={!!errors.annualFee}
                        helperText={errors.annualFee?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <AttachMoney />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label="啟用卡片"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 獎勵結構 */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="獎勵結構"
              action={
                <Button
                  startIcon={<Add />}
                  onClick={() => setRewardDialogOpen(true)}
                >
                  新增獎勵
                </Button>
              }
            />
            <CardContent>
              {Object.entries(watchedRewardStructure || {}).length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  尚未設定獎勵結構
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(watchedRewardStructure || {}).map(([category, rate]) => (
                    <Chip
                      key={category}
                      label={`${category}: ${rate}%`}
                      onDelete={() => handleRemoveReward(category)}
                      color="primary"
                    />
                  ))}
                </Box>
              )}
              {errors.rewardStructure && (
                <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                  {errors.rewardStructure.message}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 簽帳獎勵 */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="簽帳獎勵" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="signupBonus.requirement"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="簽帳要求"
                        type="number"
                        fullWidth
                        error={!!errors.signupBonus?.requirement}
                        helperText={errors.signupBonus?.requirement?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <AttachMoney />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="signupBonus.points"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="獎勵點數"
                        type="number"
                        fullWidth
                        error={!!errors.signupBonus?.points}
                        helperText={errors.signupBonus?.points?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Star />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="signupBonus.timeframe"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="時限 (月)"
                        type="number"
                        fullWidth
                        error={!!errors.signupBonus?.timeframe}
                        helperText={errors.signupBonus?.timeframe?.message}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* APR */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="APR 設定" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="apr.regular"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="一般 APR"
                        type="number"
                        fullWidth
                        error={!!errors.apr?.regular}
                        helperText={errors.apr?.regular?.message}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Percent />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="apr.promotional"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="促銷 APR (選填)"
                        type="number"
                        fullWidth
                        error={!!errors.apr?.promotional}
                        helperText={errors.apr?.promotional?.message}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Percent />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="apr.promotionalEndDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="促銷結束日期"
                        type="date"
                        fullWidth
                        InputLabelProps={{
                          shrink: true,
                        }}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 特色功能、優缺點、適用人群 */}
        {[
          { key: 'features', title: '特色功能', list: watchedFeatures },
          { key: 'pros', title: '優點', list: watchedPros },
          { key: 'cons', title: '缺點', list: watchedCons },
          { key: 'bestFor', title: '適用人群', list: watchedBestFor }
        ].map(({ key, title, list }) => (
          <Grid item xs={12} md={6} key={key}>
            <Card>
              <CardHeader
                title={title}
                action={
                  <Button
                    startIcon={<Add />}
                    onClick={() => openListDialog(key as 'features' | 'pros' | 'cons' | 'bestFor')}
                  >
                    新增
                  </Button>
                }
              />
              <CardContent>
                {list?.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    尚未設定{title}
                  </Typography>
                ) : (
                  <List dense>
                    {list?.map((item, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={item} />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => handleRemoveListItem(key as 'features' | 'pros' | 'cons' | 'bestFor', index)}
                          >
                            <Delete />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
                {errors[key as keyof typeof errors] && (
                  <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                    {errors[key as keyof typeof errors]?.message}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* 操作按鈕 */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={onCancel}
              disabled={isLoading}
              startIcon={<Cancel />}
            >
              取消
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
              startIcon={<Save />}
            >
              {isLoading ? '儲存中...' : '儲存'}
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* 獎勵新增對話框 */}
      <Dialog open={rewardDialogOpen} onClose={() => setRewardDialogOpen(false)}>
        <DialogTitle>新增獎勵</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>獎勵類別</InputLabel>
                <Select
                  value={newRewardCategory}
                  onChange={(e) => setNewRewardCategory(e.target.value)}
                  label="獎勵類別"
                >
                  {rewardCategories.map(category => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="回饋率"
                type="number"
                fullWidth
                value={newRewardRate}
                onChange={(e) => setNewRewardRate(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Percent />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRewardDialogOpen(false)}>取消</Button>
          <Button onClick={handleAddReward}>新增</Button>
        </DialogActions>
      </Dialog>

      {/* 列表項目新增對話框 */}
      <Dialog open={listDialogOpen} onClose={() => setListDialogOpen(false)}>
        <DialogTitle>新增{getListTitle(currentListType)}</DialogTitle>
        <DialogContent>
          <TextField
            label={getListTitle(currentListType)}
            fullWidth
            multiline
            rows={3}
            value={newListItem}
            onChange={(e) => setNewListItem(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setListDialogOpen(false)}>取消</Button>
          <Button onClick={handleAddListItem}>新增</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CardForm;