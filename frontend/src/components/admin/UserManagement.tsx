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
  Avatar,
  Card,
  CardContent,
  Grid,
  Switch,
  FormControlLabel,
  Pagination,
  TablePagination,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Divider,
  Badge,
  Tooltip,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import {
  Search,
  MoreVert,
  Edit,
  Delete,
  Block,
  CheckCircle,
  Email,
  Phone,
  Person,
  Settings,
  Support,
  History,
  Visibility,
  Download,
  Refresh,
  AdminPanelSettings,
  PersonAdd,
  FilterList
} from '@mui/icons-material';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { adminApi, User } from '../../api/adminApi';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-tabpanel-${index}`}
      aria-labelledby={`user-tab-${index}`}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

export const UserManagement: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuUser, setMenuUser] = useState<User | null>(null);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);

  const queryClient = useQueryClient();

  // 獲取用戶列表
  const { data: usersData, isLoading, error } = useQuery({
    queryKey: ['admin-users', page, rowsPerPage, searchTerm, roleFilter, statusFilter],
    queryFn: () => adminApi.getAllUsers({
      page: page + 1,
      limit: rowsPerPage,
      search: searchTerm || undefined,
      role: roleFilter || undefined,
      status: statusFilter || undefined
    }),
    refetchInterval: 30000,
  });

  // 更新用戶
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, userData }: { userId: string; userData: Partial<User> }) =>
      adminApi.updateUser(userId, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditUserOpen(false);
    },
  });

  // 刪除用戶
  const deleteUserMutation = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    },
  });

  const users = usersData?.users || [];
  const total = usersData?.total || 0;

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuUser(user);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuUser(null);
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setUserDetailOpen(true);
    handleMenuClose();
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditUserOpen(true);
    handleMenuClose();
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleStatusToggle = (user: User) => {
    updateUserMutation.mutate({
      userId: user.id,
      userData: { isActive: !user.isActive }
    });
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'error';
      case 'moderator': return 'warning';
      case 'user': return 'primary';
      default: return 'default';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return <AdminPanelSettings />;
      case 'moderator': return <Settings />;
      case 'user': return <Person />;
      default: return <Person />;
    }
  };

  // 模擬支援工單數據
  const mockSupportTickets = [
    {
      id: 1,
      userId: '1',
      title: '無法連結銀行帳戶',
      status: 'open',
      priority: 'high',
      createdAt: new Date(),
      lastUpdate: new Date()
    },
    {
      id: 2,
      userId: '2',
      title: '信用卡推薦不準確',
      status: 'in_progress',
      priority: 'medium',
      createdAt: new Date(),
      lastUpdate: new Date()
    },
    {
      id: 3,
      userId: '3',
      title: '帳戶資料更新問題',
      status: 'resolved',
      priority: 'low',
      createdAt: new Date(),
      lastUpdate: new Date()
    }
  ];

  const getTicketStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'error';
      case 'in_progress': return 'warning';
      case 'resolved': return 'success';
      default: return 'default';
    }
  };

  const getTicketStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return '開放';
      case 'in_progress': return '處理中';
      case 'resolved': return '已解決';
      default: return '未知';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
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
        無法載入用戶資料。請稍後再試。
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          用戶管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
        >
          新增用戶
        </Button>
      </Box>

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<Person />} label="用戶列表" />
          <Tab icon={<Support />} label="支援工單" />
          <Tab icon={<History />} label="活動記錄" />
        </Tabs>

        <TabPanel value={currentTab} index={0}>
          {/* 用戶列表 */}
          <Grid container spacing={3}>
            {/* 搜尋和篩選 */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      placeholder="搜尋用戶名稱或郵箱..."
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
                    <FormControl fullWidth>
                      <InputLabel>角色</InputLabel>
                      <Select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        label="角色"
                      >
                        <MenuItem value="">全部</MenuItem>
                        <MenuItem value="admin">管理員</MenuItem>
                        <MenuItem value="moderator">版主</MenuItem>
                        <MenuItem value="user">用戶</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth>
                      <InputLabel>狀態</InputLabel>
                      <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        label="狀態"
                      >
                        <MenuItem value="">全部</MenuItem>
                        <MenuItem value="active">活躍</MenuItem>
                        <MenuItem value="inactive">停用</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })}
                      >
                        刷新
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<Download />}
                      >
                        匯出
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* 用戶表格 */}
            <Grid item xs={12}>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>用戶</TableCell>
                      <TableCell>角色</TableCell>
                      <TableCell>狀態</TableCell>
                      <TableCell>連結帳戶</TableCell>
                      <TableCell>總消費</TableCell>
                      <TableCell>註冊時間</TableCell>
                      <TableCell>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar>
                              {user.username.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2">
                                {user.username}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {user.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getRoleIcon(user.role)}
                            label={user.role}
                            size="small"
                            color={getRoleColor(user.role)}
                          />
                        </TableCell>
                        <TableCell>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={user.isActive}
                                onChange={() => handleStatusToggle(user)}
                                size="small"
                              />
                            }
                            label={user.isActive ? '活躍' : '停用'}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge badgeContent={user.stats.connectedAccounts} color="primary">
                            <CheckCircle color={user.stats.connectedAccounts > 0 ? 'success' : 'disabled'} />
                          </Badge>
                        </TableCell>
                        <TableCell>
                          ${user.stats.totalSpending.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {format(new Date(user.createdAt), 'yyyy/MM/dd', { locale: zhTW })}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            onClick={(e) => handleMenuOpen(e, user)}
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
                  count={total}
                  page={page}
                  onPageChange={handlePageChange}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleRowsPerPageChange}
                  labelRowsPerPage="每頁行數："
                />
              </TableContainer>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          {/* 支援工單 */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                支援工單
              </Typography>
              <List>
                {mockSupportTickets.map((ticket) => (
                  <React.Fragment key={ticket.id}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2">
                              {ticket.title}
                            </Typography>
                            <Chip
                              label={getTicketStatusLabel(ticket.status)}
                              size="small"
                              color={getTicketStatusColor(ticket.status)}
                            />
                            <Chip
                              label={ticket.priority}
                              size="small"
                              color={getPriorityColor(ticket.priority)}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              用戶 ID: {ticket.userId}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                              創建時間: {format(ticket.createdAt, 'yyyy/MM/dd HH:mm', { locale: zhTW })}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton edge="end">
                          <Visibility />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          {/* 活動記錄 */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info">
                活動記錄功能正在開發中，將包含用戶登入、操作記錄等功能。
              </Alert>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* 操作選單 */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => menuUser && handleViewUser(menuUser)}>
          <Visibility sx={{ mr: 1 }} />
          查看詳情
        </MenuItem>
        <MenuItem onClick={() => menuUser && handleEditUser(menuUser)}>
          <Edit sx={{ mr: 1 }} />
          編輯
        </MenuItem>
        <MenuItem onClick={() => menuUser && handleDeleteUser(menuUser)}>
          <Delete sx={{ mr: 1 }} color="error" />
          刪除
        </MenuItem>
      </Menu>

      {/* 用戶詳情對話框 */}
      <Dialog
        open={userDetailOpen}
        onClose={() => setUserDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>用戶詳情</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        基本資訊
                      </Typography>
                      <Typography variant="body2">
                        <strong>用戶名：</strong> {selectedUser.username}
                      </Typography>
                      <Typography variant="body2">
                        <strong>郵箱：</strong> {selectedUser.email}
                      </Typography>
                      <Typography variant="body2">
                        <strong>角色：</strong> {selectedUser.role}
                      </Typography>
                      <Typography variant="body2">
                        <strong>狀態：</strong> {selectedUser.isActive ? '活躍' : '停用'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        使用統計
                      </Typography>
                      <Typography variant="body2">
                        <strong>總交易數：</strong> {selectedUser.stats.totalTransactions}
                      </Typography>
                      <Typography variant="body2">
                        <strong>總消費：</strong> ${selectedUser.stats.totalSpending.toLocaleString()}
                      </Typography>
                      <Typography variant="body2">
                        <strong>連結帳戶：</strong> {selectedUser.stats.connectedAccounts}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDetailOpen(false)}>
            關閉
          </Button>
        </DialogActions>
      </Dialog>

      {/* 刪除確認對話框 */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>確認刪除</DialogTitle>
        <DialogContent>
          <Typography>
            您確定要刪除用戶「{selectedUser?.username}」嗎？此操作無法復原。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            取消
          </Button>
          <Button
            onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
            color="error"
            disabled={deleteUserMutation.isPending}
          >
            {deleteUserMutation.isPending ? '刪除中...' : '確定刪除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;