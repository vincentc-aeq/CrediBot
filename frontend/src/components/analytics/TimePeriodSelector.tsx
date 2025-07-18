import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  ButtonGroup,
  TextField,
  Grid,
  Typography,
  Chip,
  Paper,
  IconButton,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  CalendarToday,
  DateRange,
  TrendingUp,
  Close,
  Refresh,
} from '@mui/icons-material';
import { zhTW } from 'date-fns/locale';

export interface TimePeriod {
  type: 'preset' | 'custom';
  preset?: 'last_7_days' | 'last_30_days' | 'last_3_months' | 'last_6_months' | 'last_year' | 'ytd' | 'all_time';
  startDate?: Date;
  endDate?: Date;
}

interface TimePeriodSelectorProps {
  value: TimePeriod;
  onChange: (period: TimePeriod) => void;
  showComparisonPeriod?: boolean;
  comparisonPeriod?: TimePeriod;
  onComparisonChange?: (period: TimePeriod) => void;
  allowCustomRange?: boolean;
  presetOptions?: TimePeriod['preset'][];
  label?: string;
}

const DEFAULT_PRESETS: TimePeriod['preset'][] = [
  'last_7_days',
  'last_30_days',
  'last_3_months',
  'last_6_months',
  'last_year',
  'ytd',
  'all_time',
];

const PRESET_LABELS = {
  last_7_days: '過去 7 天',
  last_30_days: '過去 30 天',
  last_3_months: '過去 3 個月',
  last_6_months: '過去 6 個月',
  last_year: '過去一年',
  ytd: '今年至今',
  all_time: '所有時間',
};

const getPresetDateRange = (preset: TimePeriod['preset']): { startDate: Date; endDate: Date } => {
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  
  switch (preset) {
    case 'last_7_days':
      return {
        startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        endDate,
      };
    case 'last_30_days':
      return {
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate,
      };
    case 'last_3_months':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
        endDate,
      };
    case 'last_6_months':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
        endDate,
      };
    case 'last_year':
      return {
        startDate: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
        endDate,
      };
    case 'ytd':
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate,
      };
    case 'all_time':
      return {
        startDate: new Date(2020, 0, 1),
        endDate,
      };
    default:
      return {
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate,
      };
  }
};

export const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({
  value,
  onChange,
  showComparisonPeriod = false,
  comparisonPeriod,
  onComparisonChange,
  allowCustomRange = true,
  presetOptions = DEFAULT_PRESETS,
  label = '時間範圍',
}) => {
  const theme = useTheme();
  const [showCustomRange, setShowCustomRange] = React.useState(value.type === 'custom');
  const [tempStartDate, setTempStartDate] = React.useState<Date | null>(value.startDate || null);
  const [tempEndDate, setTempEndDate] = React.useState<Date | null>(value.endDate || null);

  const handlePresetChange = (preset: TimePeriod['preset']) => {
    const newPeriod: TimePeriod = {
      type: 'preset',
      preset,
    };
    onChange(newPeriod);
    setShowCustomRange(false);
  };

  const handleCustomRangeApply = () => {
    if (tempStartDate && tempEndDate) {
      const newPeriod: TimePeriod = {
        type: 'custom',
        startDate: tempStartDate,
        endDate: tempEndDate,
      };
      onChange(newPeriod);
    }
  };

  const handleCustomRangeCancel = () => {
    setShowCustomRange(false);
    setTempStartDate(value.startDate || null);
    setTempEndDate(value.endDate || null);
  };

  const getDisplayText = (period: TimePeriod) => {
    if (period.type === 'preset' && period.preset) {
      return PRESET_LABELS[period.preset];
    }
    if (period.type === 'custom' && period.startDate && period.endDate) {
      return `${period.startDate.toLocaleDateString()} - ${period.endDate.toLocaleDateString()}`;
    }
    return '選擇時間範圍';
  };

  const getCurrentDateRange = () => {
    if (value.type === 'preset' && value.preset) {
      return getPresetDateRange(value.preset);
    }
    if (value.type === 'custom' && value.startDate && value.endDate) {
      return { startDate: value.startDate, endDate: value.endDate };
    }
    return getPresetDateRange('last_30_days');
  };

  const dateRange = getCurrentDateRange();

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhTW}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <CalendarToday color="primary" />
          <Typography variant="h6">{label}</Typography>
        </Box>

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <ButtonGroup variant="outlined" size="small" sx={{ mb: 2 }}>
              {presetOptions.map((preset) => (
                <Button
                  key={preset}
                  onClick={() => handlePresetChange(preset)}
                  variant={value.type === 'preset' && value.preset === preset ? 'contained' : 'outlined'}
                  size="small"
                >
                  {PRESET_LABELS[preset]}
                </Button>
              ))}
            </ButtonGroup>
          </Grid>
          
          {allowCustomRange && (
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  variant={showCustomRange ? 'contained' : 'outlined'}
                  onClick={() => setShowCustomRange(!showCustomRange)}
                  startIcon={<DateRange />}
                  size="small"
                >
                  自訂範圍
                </Button>
                <IconButton
                  onClick={() => onChange({ type: 'preset', preset: 'last_30_days' })}
                  size="small"
                  title="重置"
                >
                  <Refresh />
                </IconButton>
              </Box>
            </Grid>
          )}
        </Grid>

        {showCustomRange && (
          <Box sx={{ mt: 2, p: 2, bgcolor: theme.palette.grey[50], borderRadius: 1 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <DatePicker
                  label="開始日期"
                  value={tempStartDate}
                  onChange={(date) => setTempStartDate(date)}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <DatePicker
                  label="結束日期"
                  value={tempEndDate}
                  onChange={(date) => setTempEndDate(date)}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleCustomRangeApply}
                    disabled={!tempStartDate || !tempEndDate}
                    size="small"
                  >
                    套用
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleCustomRangeCancel}
                    size="small"
                  >
                    取消
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* 顯示目前選擇的時間範圍 */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={`已選擇：${getDisplayText(value)}`}
            color="primary"
            icon={<CalendarToday />}
          />
          <Typography variant="body2" color="text.secondary">
            ({dateRange.startDate.toLocaleDateString()} - {dateRange.endDate.toLocaleDateString()})
          </Typography>
        </Box>

        {/* 比較期間選擇器 */}
        {showComparisonPeriod && onComparisonChange && (
          <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <TrendingUp color="secondary" />
              <Typography variant="h6">比較期間</Typography>
              {comparisonPeriod && (
                <IconButton
                  onClick={() => onComparisonChange({ type: 'preset', preset: 'last_30_days' })}
                  size="small"
                  title="清除比較期間"
                >
                  <Close />
                </IconButton>
              )}
            </Box>
            
            <ButtonGroup variant="outlined" size="small">
              {presetOptions.map((preset) => (
                <Button
                  key={preset}
                  onClick={() => onComparisonChange({
                    type: 'preset',
                    preset,
                  })}
                  variant={comparisonPeriod?.type === 'preset' && comparisonPeriod.preset === preset ? 'contained' : 'outlined'}
                  size="small"
                >
                  {PRESET_LABELS[preset]}
                </Button>
              ))}
            </ButtonGroup>

            {comparisonPeriod && (
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={`比較：${getDisplayText(comparisonPeriod)}`}
                  color="secondary"
                  icon={<TrendingUp />}
                  variant="outlined"
                />
              </Box>
            )}
          </Box>
        )}
      </Paper>
    </LocalizationProvider>
  );
};

export default TimePeriodSelector;