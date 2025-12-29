import { app, BrowserWindow, Menu, dialog } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

const createMenu = () => {
  const template = [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', accelerator: 'CmdOrCtrl+Z' },
        { role: 'redo', accelerator: 'Shift+CmdOrCtrl+Z' },
        { type: 'separator' },
        { role: 'cut', accelerator: 'CmdOrCtrl+X' },
        { role: 'copy', accelerator: 'CmdOrCtrl+C' },
        { role: 'paste', accelerator: 'CmdOrCtrl+V' },
        { role: 'pasteAndMatchStyle', accelerator: 'Shift+CmdOrCtrl+V' },
        { role: 'delete' },
        { role: 'selectAll', accelerator: 'CmdOrCtrl+A' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ]

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    } as any)
  }

  const menu = Menu.buildFromTemplate(template as any)
  Menu.setApplicationMenu(menu)
}

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, isDev ? '../build/icon.png' : '../build/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
    },
    ...(process.platform === 'darwin' ? {
      titleBarStyle: 'hiddenInset',
      vibrancy: 'under-window',
    } : {}),
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  return mainWindow
}

// Single instance lock - only allow one instance of the app
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // If another instance is already running, quit this one
  app.quit()
} else {
  // When someone tries to run a second instance, focus the existing window
  app.on('second-instance', () => {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      const mainWindow = windows[0]
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.focus()
    }
  })
}

app.whenReady().then(() => {
  createMenu()
  createWindow()

  // Set dock icon for macOS
  if (process.platform === 'darwin') {
    const iconPath = path.join(__dirname, '../build/icon.png')
    if (require('fs').existsSync(iconPath)) {
      app.dock.setIcon(iconPath)
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

import { ipcMain } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData')
})

ipcMain.handle('terminal:execute', async (_event, command: string) => {
  try {
    const { stdout, stderr } = await execAsync(command, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024, // 1MB buffer
      timeout: 30000, // 30 second timeout
    })
    

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      error: null,
    }
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      error: error.message,
    }
  }
})




// --- Bookmark Management ---
interface Bookmark {
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

interface BookmarkFolder {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
  bookmarkIds: string[];
}

interface BookmarkData {
  bookmarks: Bookmark[];
  folders: BookmarkFolder[];
  settings: {
    autoCaptureThumbnail: boolean;
    defaultFolder: string;
  };
}

const getBookmarksPath = () => path.join(app.getPath('userData'), 'browser', 'bookmarks.json');
const getThumbnailsPath = () => path.join(app.getPath('userData'), 'browser', 'thumbnails');
const getFaviconsPath = () => path.join(app.getPath('userData'), 'browser', 'favicons');

const ensureBookmarkDirectories = () => {
  const browserDir = path.join(app.getPath('userData'), 'browser');
  const thumbnailsDir = getThumbnailsPath();
  const faviconsDir = getFaviconsPath();

  [browserDir, thumbnailsDir, faviconsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const loadBookmarks = async (): Promise<BookmarkData> => {
  try {
    ensureBookmarkDirectories();
    const bookmarksPath = getBookmarksPath();

    if (fs.existsSync(bookmarksPath)) {
      const content = fs.readFileSync(bookmarksPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error loading bookmarks:', error);
  }

  return {
    bookmarks: [],
    folders: [
      {
        id: 'default',
        name: '默认收藏夹',
        createdAt: new Date().toISOString(),
        bookmarkIds: []
      }
    ],
    settings: {
      autoCaptureThumbnail: true,
      defaultFolder: 'default'
    }
  };
};

const saveBookmarks = async (data: BookmarkData): Promise<void> => {
  ensureBookmarkDirectories();
  const bookmarksPath = getBookmarksPath();
  fs.writeFileSync(bookmarksPath, JSON.stringify(data, null, 2));
};

// Bookmark IPC Handlers
ipcMain.handle('bookmarks:add', async (_event, bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'visitCount'>) => {
  try {
    const data = await loadBookmarks();
    const newBookmark: Bookmark = {
      ...bookmark,
      id: generateId(),
      createdAt: new Date().toISOString(),
      visitCount: 0
    };

    data.bookmarks.push(newBookmark);
    await saveBookmarks(data);
    return { success: true, bookmark: newBookmark };
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('bookmarks:remove', async (_event, id: string) => {
  try {
    const data = await loadBookmarks();
    data.bookmarks = data.bookmarks.filter(b => b.id !== id);

    // Remove from folders
    data.folders.forEach(folder => {
      folder.bookmarkIds = folder.bookmarkIds.filter(bookmarkId => bookmarkId !== id);
    });

    await saveBookmarks(data);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('bookmarks:getAll', async () => {
  try {
    const data = await loadBookmarks();
    return { success: true, bookmarks: data.bookmarks, folders: data.folders };
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('bookmarks:search', async (_event, query: string) => {
  try {
    const data = await loadBookmarks();
    const lowerQuery = query.toLowerCase();

    const filteredBookmarks = data.bookmarks.filter(bookmark =>
      bookmark.title.toLowerCase().includes(lowerQuery) ||
      bookmark.url.toLowerCase().includes(lowerQuery) ||
      bookmark.description?.toLowerCase().includes(lowerQuery) ||
      bookmark.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );

    return { success: true, bookmarks: filteredBookmarks };
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('bookmarks:createFolder', async (_event, name: string, color?: string) => {
  try {
    const data = await loadBookmarks();
    const folder: BookmarkFolder = {
      id: generateId(),
      name,
      color,
      createdAt: new Date().toISOString(),
      bookmarkIds: []
    };

    data.folders.push(folder);
    await saveBookmarks(data);
    return { success: true, folder };
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('bookmarks:addToFolder', async (_event, bookmarkId: string, folderId: string) => {
  try {
    const data = await loadBookmarks();
    const folder = data.folders.find(f => f.id === folderId);

    if (folder && !folder.bookmarkIds.includes(bookmarkId)) {
      folder.bookmarkIds.push(bookmarkId);
      await saveBookmarks(data);
    }

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('bookmarks:checkExists', async (_event, url: string) => {
  try {
    const data = await loadBookmarks();
    const exists = data.bookmarks.some(b => b.url === url);
    return { success: true, exists };
  } catch (error: any) {
    return { error: error.message };
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
