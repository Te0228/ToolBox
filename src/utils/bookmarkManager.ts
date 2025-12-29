// src/utils/bookmarkManager.ts

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  thumbnail?: string;
  description?: string;
  tags: string[];
  createdAt: string;
  lastVisited?: string;
  visitCount: number;
}

export interface BookmarkFolder {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
  bookmarkIds: string[];
}

class BookmarkManager {
  // 添加收藏
  async addBookmark(bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'visitCount'>): Promise<Bookmark | null> {
    try {
      // @ts-ignore
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('bookmarks:add', bookmark);
      if (result.success) {
        return result.bookmark;
      } else {
        console.error('Failed to add bookmark:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error adding bookmark:', error);
      return null;
    }
  }

  // 删除收藏
  async removeBookmark(id: string): Promise<boolean> {
    try {
      // @ts-ignore
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('bookmarks:remove', id);
      return result.success;
    } catch (error) {
      console.error('Error removing bookmark:', error);
      return false;
    }
  }

  // 获取所有收藏
  async getBookmarks(): Promise<{ bookmarks: Bookmark[], folders: BookmarkFolder[] }> {
    try {
      // @ts-ignore
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('bookmarks:getAll');
      if (result.success) {
        return { bookmarks: result.bookmarks, folders: result.folders };
      } else {
        console.error('Failed to get bookmarks:', result.error);
        return { bookmarks: [], folders: [] };
      }
    } catch (error) {
      console.error('Error getting bookmarks:', error);
      return { bookmarks: [], folders: [] };
    }
  }

  // 搜索收藏
  async searchBookmarks(query: string): Promise<Bookmark[]> {
    try {
      // @ts-ignore
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('bookmarks:search', query);
      if (result.success) {
        return result.bookmarks;
      } else {
        console.error('Failed to search bookmarks:', result.error);
        return [];
      }
    } catch (error) {
      console.error('Error searching bookmarks:', error);
      return [];
    }
  }

  // 创建文件夹
  async createFolder(name: string, color?: string): Promise<BookmarkFolder | null> {
    try {
      // @ts-ignore
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('bookmarks:createFolder', name, color);
      if (result.success) {
        return result.folder;
      } else {
        console.error('Failed to create folder:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      return null;
    }
  }

  // 将收藏添加到文件夹
  async addToFolder(bookmarkId: string, folderId: string): Promise<boolean> {
    try {
      // @ts-ignore
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('bookmarks:addToFolder', bookmarkId, folderId);
      return result.success;
    } catch (error) {
      console.error('Error adding to folder:', error);
      return false;
    }
  }

  // 检查URL是否已收藏
  async checkExists(url: string): Promise<boolean> {
    try {
      // @ts-ignore
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('bookmarks:checkExists', url);
      if (result.success) {
        return result.exists;
      } else {
        console.error('Failed to check bookmark exists:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error checking bookmark exists:', error);
      return false;
    }
  }

  // 按文件夹获取收藏
  async getBookmarksByFolder(folderId: string): Promise<Bookmark[]> {
    const { bookmarks, folders } = await this.getBookmarks();
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return [];

    return bookmarks.filter(b => folder.bookmarkIds.includes(b.id));
  }
}

// 导出单例实例
export const bookmarkManager = new BookmarkManager();