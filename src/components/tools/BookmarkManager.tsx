// src/components/tools/BookmarkManager.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Button,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Bookmark as BookmarkIcon,
  Folder as FolderIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  OpenInNew as OpenInNewIcon,
  Language as LanguageIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { bookmarkManager, Bookmark, BookmarkFolder } from '../../utils/bookmarkManager';

const BookmarkManager: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBookmarks, setFilteredBookmarks] = useState<Bookmark[]>([]);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // 加载数据
  const loadData = async () => {
    const { bookmarks, folders } = await bookmarkManager.getBookmarks();
    setBookmarks(bookmarks);
    setFolders(folders);
  };

  // 过滤收藏
  const filterBookmarks = () => {
    let filtered = bookmarks;

    // 按文件夹过滤
    if (selectedFolder !== 'all') {
      const folder = folders.find(f => f.id === selectedFolder);
      if (folder) {
        filtered = bookmarks.filter(b => folder.bookmarkIds.includes(b.id));
      }
    }

    // 按搜索词过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(bookmark =>
        bookmark.title.toLowerCase().includes(query) ||
        bookmark.url.toLowerCase().includes(query) ||
        bookmark.description?.toLowerCase().includes(query) ||
        bookmark.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredBookmarks(filtered);
  };

  // 删除收藏
  const handleDeleteBookmark = async (id: string) => {
    await bookmarkManager.removeBookmark(id);
    await loadData();
  };

  // 创建文件夹
  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await bookmarkManager.createFolder(newFolderName.trim());
      setNewFolderName('');
      setShowAddFolder(false);
      await loadData();
    }
  };

  // 打开书签
  const handleOpenBookmark = (bookmark: Bookmark) => {
    // 这里可以触发父组件的导航事件，或者直接在新窗口打开
    window.open(bookmark.url, '_blank');
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // 获取域名
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  // 效果钩子
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterBookmarks();
  }, [bookmarks, folders, selectedFolder, searchQuery]);

  return (
    <Box sx={{ height: '100%', display: 'flex' }}>
      {/* 左侧文件夹列表 */}
      <Paper sx={{ width: 250, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            收藏夹
          </Typography>

          <List sx={{ p: 0 }}>
            <ListItem
              button
              selected={selectedFolder === 'all'}
              onClick={() => setSelectedFolder('all')}
            >
              <ListItemIcon>
                <BookmarkIcon />
              </ListItemIcon>
              <ListItemText primary="全部收藏" />
              <Chip label={bookmarks.length} size="small" />
            </ListItem>

            {folders.map(folder => (
              <ListItem
                key={folder.id}
                button
                selected={selectedFolder === folder.id}
                onClick={() => setSelectedFolder(folder.id)}
              >
                <ListItemIcon>
                  <FolderIcon style={{ color: folder.color || '#1976d2' }} />
                </ListItemIcon>
                <ListItemText primary={folder.name} />
                <Chip label={folder.bookmarkIds.length} size="small" />
              </ListItem>
            ))}
          </List>

          <Button
            fullWidth
            startIcon={<AddIcon />}
            onClick={() => setShowAddFolder(true)}
            sx={{ mt: 2 }}
          >
            新建文件夹
          </Button>
        </Box>
      </Paper>

      {/* 右侧主内容区 */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', ml: 1 }}>
        {/* 搜索和工具栏 */}
        <Paper sx={{ p: 2, mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              fullWidth
              placeholder="搜索收藏..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
              }}
            />
            <Tooltip title="筛选">
              <IconButton>
                <FilterListIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>

        {/* 收藏网格 */}
        <Paper sx={{ flex: 1, p: 2, overflow: 'auto' }}>
          {filteredBookmarks.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <LanguageIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {searchQuery ? '没有找到匹配的收藏' : '还没有收藏任何页面'}
              </Typography>
              <Typography color="text.secondary">
                {searchQuery ? '尝试使用其他关键词搜索' : '在浏览器中点击收藏按钮开始收藏页面'}
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {filteredBookmarks.map(bookmark => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={bookmark.id}>
                  <BookmarkCard
                    bookmark={bookmark}
                    onDelete={() => handleDeleteBookmark(bookmark.id)}
                    onOpen={() => handleOpenBookmark(bookmark)}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      </Box>

      {/* 新建文件夹对话框 */}
      <Dialog open={showAddFolder} onClose={() => setShowAddFolder(false)}>
        <DialogTitle>新建收藏夹</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="文件夹名称"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateFolder();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddFolder(false)}>取消</Button>
          <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
            创建
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// 单个收藏卡片组件
const BookmarkCard: React.FC<{
  bookmark: Bookmark;
  onDelete: () => void;
  onOpen: () => void;
}> = ({ bookmark, onDelete, onOpen }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <Card
      sx={{
        height: 200,
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          boxShadow: 3,
          '& .card-actions': {
            opacity: 1
          }
        }
      }}
    >
      {/* 缩略图区域 */}
      <Box
        sx={{
          height: 100,
          bgcolor: 'grey.100',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          backgroundImage: bookmark.thumbnail ? `url(${bookmark.thumbnail})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {!bookmark.thumbnail && (
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <LanguageIcon />
          </Avatar>
        )}

        {/* 悬停时显示的操作按钮 */}
        <Box
          className="card-actions"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            opacity: 0,
            transition: 'opacity 0.2s',
            display: 'flex',
            gap: 0.5
          }}
        >
          <IconButton size="small" onClick={onOpen} sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}>
            <OpenInNewIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={onDelete}
            color="error"
            sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <CardContent sx={{ flex: 1, p: 1.5, pb: 1 }}>
        <Typography variant="subtitle2" noWrap title={bookmark.title} gutterBottom>
          {bookmark.title}
        </Typography>

        <Typography variant="caption" color="text.secondary" noWrap gutterBottom>
          {getDomain(bookmark.url)}
        </Typography>

        <Typography variant="caption" color="text.secondary" display="block">
          {formatDate(bookmark.createdAt)}
        </Typography>

        {/* 标签 */}
        {bookmark.tags.length > 0 && (
          <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {bookmark.tags.slice(0, 2).map(tag => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 18 }}
              />
            ))}
            {bookmark.tags.length > 2 && (
              <Chip
                label={`+${bookmark.tags.length - 2}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 18 }}
              />
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default BookmarkManager;