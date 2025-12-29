// src/components/tools/WebBrowser.tsx

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  Tooltip,
  Chip
} from '@mui/material';
import {
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Bookmarks as BookmarksIcon
} from '@mui/icons-material';
import { bookmarkManager, Bookmark } from '../../utils/bookmarkManager';
import BookmarkSidebar from './BookmarkSidebar';

const WebBrowser: React.FC = () => {
  const [currentUrl] = useState('https://www.xiaohongshu.com');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [pageTitle, setPageTitle] = useState('小红书');
  const [showBookmarks, setShowBookmarks] = useState(false);
  const webviewRef = useRef<any>(null);

  // 检查当前页面是否已收藏
  const checkBookmarkStatus = async (url: string) => {
    const exists = await bookmarkManager.checkExists(url);
    setIsBookmarked(exists);
  };

  // 收藏/取消收藏当前页面
  const handleBookmark = async () => {
    // 获取当前页面URL
    const webview = webviewRef.current;
    if (!webview) return;

    const currentPageUrl = webview.src || webview.getAttribute('src');

    // 只允许收藏小红书页面
    if (!currentPageUrl || !currentPageUrl.includes('xiaohongshu.com')) {
      return;
    }

    if (isBookmarked) {
      // 删除收藏
      const { bookmarks } = await bookmarkManager.getBookmarks();
      const existingBookmark = bookmarks.find(b => b.url === currentPageUrl);
      if (existingBookmark) {
        await bookmarkManager.removeBookmark(existingBookmark.id);
        setIsBookmarked(false);
      }
    } else {
      // 添加收藏
      const bookmark = {
        title: pageTitle || '小红书页面',
        url: currentPageUrl,
        tags: ['小红书'],
        description: ''
      };
      await bookmarkManager.addBookmark(bookmark);
      setIsBookmarked(true);
    }
  };

  // 导航到指定URL（仅限小红书域名）
  const navigateToUrl = (url: string) => {
    // 只允许跳转到小红书相关的页面
    if (webviewRef.current && url.includes('xiaohongshu.com')) {
      webviewRef.current.src = url;
    }
  };

  // 处理WebView事件
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleDidNavigate = (event: any) => {
      checkBookmarkStatus(event.url);
    };

    const handlePageTitleUpdated = (event: any) => {
      setPageTitle(event.title);
    };

    webview.addEventListener('did-navigate', handleDidNavigate);
    webview.addEventListener('did-navigate-in-page', handleDidNavigate);
    webview.addEventListener('page-title-updated', handlePageTitleUpdated);

    return () => {
      webview.removeEventListener('did-navigate', handleDidNavigate);
      webview.removeEventListener('did-navigate-in-page', handleDidNavigate);
      webview.removeEventListener('page-title-updated', handlePageTitleUpdated);
    };
  }, []);

  // 初始化时检查收藏状态
  useEffect(() => {
    checkBookmarkStatus(currentUrl);
  }, [currentUrl]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 简化的工具栏 - 只有收藏功能 */}
      <Paper sx={{
        p: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: 0,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        {/* 页面标题 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary" noWrap>
            {pageTitle || '小红书'}
          </Typography>
          {isBookmarked && (
            <Chip label="已收藏" size="small" color="primary" variant="outlined" />
          )}
        </Box>

        {/* 收藏功能按钮 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={isBookmarked ? "取消收藏" : "收藏此页"}>
            <IconButton
              onClick={handleBookmark}
              color={isBookmarked ? 'primary' : 'default'}
              size="small"
            >
              {isBookmarked ? <BookmarkIcon /> : <BookmarkBorderIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title="收藏夹">
            <IconButton
              onClick={() => setShowBookmarks(!showBookmarks)}
              color={showBookmarks ? 'primary' : 'default'}
              size="small"
            >
              <BookmarksIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      <Box sx={{ flex: 1, display: 'flex' }}>
        {/* WebView 容器 - 专用小红书界面 */}
        <Box sx={{ flex: showBookmarks ? 0.7 : 1 }}>
          <webview
            ref={webviewRef}
            src="https://www.xiaohongshu.com"
            partition="persist:xiaohongshu-session"
            style={{
              height: '100%',
              width: '100%',
              border: 'none',
              display: 'flex'
            }}
            nodeintegration="false"
            webSecurity="true"
            allowpopups="true"
            useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          />
        </Box>

        {/* 收藏侧边栏 */}
        {showBookmarks && (
          <Paper sx={{ width: '30%', ml: 1, display: 'flex', flexDirection: 'column' }}>
            <BookmarkSidebar
              onBookmarkClick={(bookmark) => {
                navigateToUrl(bookmark.url);
              }}
              onClose={() => setShowBookmarks(false)}
            />
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default WebBrowser;