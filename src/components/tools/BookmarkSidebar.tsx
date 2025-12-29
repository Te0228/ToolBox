// src/components/tools/BookmarkSidebar.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  TextField,
  Chip,
  Avatar,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Language as LanguageIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { bookmarkManager, Bookmark } from '../../utils/bookmarkManager';

interface BookmarkSidebarProps {
  onBookmarkClick: (bookmark: Bookmark) => void;
  onClose: () => void;
}

const BookmarkSidebar: React.FC<BookmarkSidebarProps> = ({
  onBookmarkClick,
  onClose
}) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBookmarks, setFilteredBookmarks] = useState<Bookmark[]>([]);

  // 加载收藏
  const loadBookmarks = async () => {
    const { bookmarks } = await bookmarkManager.getBookmarks();
    setBookmarks(bookmarks);
    setFilteredBookmarks(bookmarks);
  };

  // 删除收藏
  const handleDeleteBookmark = async (id: string) => {
    await bookmarkManager.removeBookmark(id);
    await loadBookmarks();
  };

  // 搜索过滤
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredBookmarks(bookmarks);
    } else {
      const filtered = bookmarks.filter(bookmark =>
        bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bookmark.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bookmark.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredBookmarks(filtered);
    }
  }, [searchQuery, bookmarks]);

  // 组件挂载时加载数据
  useEffect(() => {
    loadBookmarks();
  }, []);

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 头部 */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">
          收藏夹 ({filteredBookmarks.length})
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* 搜索栏 */}
      <Box sx={{ px: 2, pb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="搜索收藏..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
          }}
        />
      </Box>

      <Divider />

      {/* 收藏列表 */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {filteredBookmarks.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {searchQuery ? '没有找到匹配的收藏' : '还没有收藏任何页面'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {filteredBookmarks.map((bookmark) => (
              <ListItem
                key={bookmark.id}
                sx={{
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    '& .bookmark-actions': {
                      opacity: 1
                    }
                  }
                }}
              >
                {/* 主要内容 */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    width: '100%',
                    cursor: 'pointer'
                  }}
                  onClick={() => onBookmarkClick(bookmark)}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Avatar sx={{ width: 24, height: 24 }}>
                      <LanguageIcon sx={{ fontSize: 16 }} />
                    </Avatar>
                  </ListItemIcon>

                  <ListItemText
                    primary={
                      <Typography variant="body2" noWrap>
                        {bookmark.title}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {getDomain(bookmark.url)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {formatDate(bookmark.createdAt)}
                        </Typography>
                      </Box>
                    }
                  />

                  {/* 操作按钮 */}
                  <Box
                    className="bookmark-actions"
                    sx={{
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      display: 'flex',
                      gap: 0.5
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Tooltip title="在新窗口打开">
                      <IconButton
                        size="small"
                        onClick={() => window.open(bookmark.url, '_blank')}
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除收藏">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteBookmark(bookmark.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* 标签 */}
                {bookmark.tags.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {bookmark.tags.slice(0, 3).map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    ))}
                    {bookmark.tags.length > 3 && (
                      <Chip
                        label={`+${bookmark.tags.length - 3}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    )}
                  </Box>
                )}

                {/* 描述 */}
                {bookmark.description && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: 'block' }}
                  >
                    {bookmark.description}
                  </Typography>
                )}
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default BookmarkSidebar;