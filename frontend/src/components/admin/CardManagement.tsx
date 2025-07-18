import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  InputAdornment,
  Menu,
  MenuItem,
  Tooltip,
  Card,
  CardContent,
  Grid,
  Switch,
  FormControlLabel,
  Pagination,
  TablePagination,
  Fab
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  FilterList,
  MoreVert,
  Visibility,
  ContentCopy,
  Download,
  Upload,
  Refresh
} from '@mui/icons-material';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { adminApi, CreditCardData } from '../../api/adminApi';

interface CardManagementProps {
  onEditCard?: (card: CreditCardData) => void;
  onCreateCard?: () => void;
}

export const CardManagement: React.FC<CardManagementProps> = ({
  onEditCard,
  onCreateCard
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterIssuer, setFilterIssuer] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedCard, setSelectedCard] = useState<CreditCardData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuCard, setMenuCard] = useState<CreditCardData | null>(null);

  const queryClient = useQueryClient();

  // 獲取所有信用卡
  const { data: cardsData, isLoading, error } = useQuery({
    queryKey: ['admin-cards'],
    queryFn: adminApi.getAllCards,
    refetchInterval: 30000,
  });

  // 獲取卡片統計
  const { data: cardStats } = useQuery({
    queryKey: ['card-statistics'],
    queryFn: adminApi.getCardStatistics,
    refetchInterval: 60000,
  });

  // 刪除卡片
  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cards'] });
      queryClient.invalidateQueries({ queryKey: ['card-statistics'] });
      setDeleteDialogOpen(false);
      setSelectedCard(null);
    },
  });

  // 更新卡片狀態
  const updateStatusMutation = useMutation({
    mutationFn: ({ cardId, isActive }: { cardId: string; isActive: boolean }) =>
      adminApi.updateCard(cardId, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cards'] });
      queryClient.invalidateQueries({ queryKey: ['card-statistics'] });
    },
  });

  const cards = cardsData?.cards || [];

  // 篩選卡片
  const filteredCards = cards.filter(card => {
    const matchesSearch = card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         card.issuer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIssuer = !filterIssuer || card.issuer === filterIssuer;
    const matchesType = !filterType || card.cardType === filterType;
    const matchesStatus = !filterStatus || 
                         (filterStatus === 'active' && card.isActive) ||
                         (filterStatus === 'inactive' && !card.isActive);

    return matchesSearch && matchesIssuer && matchesType && matchesStatus;
  });

  // 分頁後的卡片
  const paginatedCards = filteredCards.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // 獲取唯一的發行商和卡片類型
  const uniqueIssuers = [...new Set(cards.map(card => card.issuer))];
  const uniqueTypes = [...new Set(cards.map(card => card.cardType))];

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, card: CreditCardData) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuCard(card);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuCard(null);
  };

  const handleDeleteClick = (card: CreditCardData) => {
    setSelectedCard(card);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = () => {
    if (selectedCard) {
      deleteMutation.mutate(selectedCard.id!);
    }
  };

  const handleViewDetails = (card: CreditCardData) => {
    setSelectedCard(card);
    setDetailDialogOpen(true);
    handleMenuClose();
  };

  const handleEditClick = (card: CreditCardData) => {
    onEditCard?.(card);
    handleMenuClose();
  };

  const handleStatusToggle = (card: CreditCardData) => {
    updateStatusMutation.mutate({
      cardId: card.id!,
      isActive: !card.isActive
    });
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getCardTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'cashback': return 'success';
      case 'rewards': return 'primary';
      case 'travel': return 'info';
      case 'business': return 'warning';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography>載入中...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        無法載入信用卡資料。請稍後再試。
      </Alert>
    );
  }

  return (
    <Box>
      {/* 統計卡片 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                總卡片數
              </Typography>
              <Typography variant="h4">
                {cardStats?.total || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                活躍卡片
              </Typography>
              <Typography variant="h4">
                {cardStats?.active || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                發行商數量
              </Typography>
              <Typography variant="h4">
                {Object.keys(cardStats?.byIssuer || {}).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                卡片類型
              </Typography>
              <Typography variant="h4">
                {Object.keys(cardStats?.byType || {}).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 搜尋和篩選 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              placeholder="搜尋卡片名稱或發行商..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              select
              fullWidth
              label="發行商"
              value={filterIssuer}
              onChange={(e) => setFilterIssuer(e.target.value)}
            >
              <MenuItem value="">全部</MenuItem>
              {uniqueIssuers.map(issuer => (
                <MenuItem key={issuer} value={issuer}>
                  {issuer}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              select
              fullWidth
              label="卡片類型"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <MenuItem value="">全部</MenuItem>
              {uniqueTypes.map(type => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              select
              fullWidth
              label="狀態"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="">全部</MenuItem>
              <MenuItem value="active">活躍</MenuItem>
              <MenuItem value="inactive">停用</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={onCreateCard}
              >
                新增卡片
              </Button>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-cards'] })}
              >
                刷新
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 卡片表格 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>卡片名稱</TableCell>
              <TableCell>發行商</TableCell>
              <TableCell>類型</TableCell>
              <TableCell>年費</TableCell>
              <TableCell>狀態</TableCell>
              <TableCell>最後更新</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedCards.map((card) => (
              <TableRow key={card.id}>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2">
                      {card.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {card.id}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{card.issuer}</TableCell>
                <TableCell>
                  <Chip
                    label={card.cardType}
                    size="small"
                    color={getCardTypeColor(card.cardType)}
                  />
                </TableCell>
                <TableCell>
                  {card.annualFee === 0 ? '免年費' : `$${card.annualFee}`}
                </TableCell>
                <TableCell>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={card.isActive}
                        onChange={() => handleStatusToggle(card)}
                        size="small"
                      />
                    }
                    label={card.isActive ? '活躍' : '停用'}
                  />
                </TableCell>
                <TableCell>
                  {card.updatedAt && format(new Date(card.updatedAt), 'yyyy/MM/dd HH:mm', { locale: zhTW })}
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={(e) => handleMenuOpen(e, card)}
                    size="small"
                  >
                    <MoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredCards.length}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          labelRowsPerPage="每頁行數："
        />
      </TableContainer>

      {/* 操作選單 */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => menuCard && handleViewDetails(menuCard)}>
          <Visibility sx={{ mr: 1 }} />
          查看詳情
        </MenuItem>
        <MenuItem onClick={() => menuCard && handleEditClick(menuCard)}>
          <Edit sx={{ mr: 1 }} />
          編輯
        </MenuItem>
        <MenuItem onClick={() => menuCard && navigator.clipboard.writeText(menuCard.id!)}>
          <ContentCopy sx={{ mr: 1 }} />
          複製 ID
        </MenuItem>
        <MenuItem onClick={() => menuCard && handleDeleteClick(menuCard)}>
          <Delete sx={{ mr: 1 }} color="error" />
          刪除
        </MenuItem>
      </Menu>

      {/* 刪除確認對話框 */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>確認刪除</DialogTitle>
        <DialogContent>
          <Typography>
            您確定要刪除信用卡「{selectedCard?.name}」嗎？此操作無法復原。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            取消
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? '刪除中...' : '確定刪除'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 詳情對話框 */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>信用卡詳情</DialogTitle>
        <DialogContent>
          {selectedCard && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    基本資訊
                  </Typography>
                  <Typography variant="body2">
                    <strong>名稱：</strong> {selectedCard.name}
                  </Typography>
                  <Typography variant="body2">
                    <strong>發行商：</strong> {selectedCard.issuer}
                  </Typography>
                  <Typography variant="body2">
                    <strong>類型：</strong> {selectedCard.cardType}
                  </Typography>
                  <Typography variant="body2">
                    <strong>年費：</strong> {selectedCard.annualFee === 0 ? '免年費' : `$${selectedCard.annualFee}`}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    獎勵結構
                  </Typography>
                  {Object.entries(selectedCard.rewardStructure).map(([category, rate]) => (
                    <Typography key={category} variant="body2">
                      <strong>{category}：</strong> {rate}% 回饋
                    </Typography>
                  ))}
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    特色功能
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedCard.features.map((feature, index) => (
                      <Chip key={index} label={feature} size="small" />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            關閉
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CardManagement;