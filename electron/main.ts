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

// --- Chat Module & node-llama-cpp Integration ---
// --- Chat Module & node-llama-cpp Integration ---
import type { LlamaChatSession, LlamaModel } from "node-llama-cpp";
import { MemoryManager } from './memory-manager';
// node-downloader-helper will be dynamically imported

let llamaSession: LlamaChatSession | null = null;
let llamaModel: LlamaModel | null = null;
let memoryManager = new MemoryManager();

// --- Settings Persistence ---
const getSettingsPath = () => path.join(app.getPath('userData'), 'settings.json');

const saveSettings = (settings: any) => {
    try {
        fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2));
    } catch (e) {
        console.error('Failed to save settings:', e);
    }
};

const getSettings = () => {
    try {
        if (fs.existsSync(getSettingsPath())) {
            return JSON.parse(fs.readFileSync(getSettingsPath(), 'utf-8'));
        }
    } catch (e) {
        console.error('Failed to read settings:', e);
    }
    return {};
};

// --- IPC Handlers ---

ipcMain.handle('chat:init', async () => {
    const settings = getSettings();
    const lastModelPath = settings.lastModelPath;
    
    // Check if default model file exists
    // We need to know where the default model is downloaded to. 
    // In ChatInterface, we typically use 'userData/models/'.
    // The filename for Qwen 0.5B is 'qwen2.5-0.5b-instruct-q4_k_m.gguf' (from URL)
    const defaultModelPath = path.join(app.getPath('userData'), 'models', 'qwen2.5-0.5b-instruct-q4_k_m.gguf');
    const defaultModelExists = fs.existsSync(defaultModelPath);

    return { 
        lastModelPath, 
        isLoaded: !!llamaModel,
        defaultModelExists,
        defaultModelPath: defaultModelExists ? defaultModelPath : null
    };
});

// Default model URL (Qwen 2.5 0.5B - Very small and fast for testing)
const DEFAULT_MODEL_URL = "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf"; 
// Note: Direct download checks might be needed.

ipcMain.handle('chat:send', async (_event, content: string) => {
    // Dynamic import to handle ESM requirement
    // We can't easily check instance of LlamaChatSession without importing it,
    // but if llamaSession is null, we return error anyway.
    if (!llamaSession) {
        return { error: "Model not loaded" };
    }

    try {
        memoryManager.addMessage('user', content);
        
        // Ensure prompt includes history or uses session
        const response = await llamaSession.prompt(content, {
             onToken: (chunk) => {
                 _event.sender.send('chat:token', chunk);
             }
        });
        
        memoryManager.addMessage('assistant', response);
        return { response };
    } catch (e: any) {
        console.error("Chat Error:", e);
        return { error: e.message };
    }
});

ipcMain.handle('chat:load-model', async (_event, modelPath: string) => {
    try {
        // Dynamic import
        const { getLlama, LlamaChatSession } = await (new Function('return import("node-llama-cpp")'))();
        
        const llama = await getLlama();
        
        // Unload previous if exists
        if (llamaModel) {
            // Cleanup logic if needed
        }

        llamaModel = await llama.loadModel({
            modelPath: modelPath,
            gpuLayers: 'max'
        });

        if (!llamaModel) {
            throw new Error("Failed to load model");
        }
        const context = await llamaModel.createContext();
        llamaSession = new LlamaChatSession({
            contextSequence: context.getSequence()
        });
        
        memoryManager.clearHistory();

        // Save to settings
        const settings = getSettings();
        settings.lastModelPath = modelPath;
        saveSettings(settings);

        return { success: true };
    } catch (e: any) {
        console.error("Load Model Error:", e);
        return { error: e.message };
    }
});

// Download Manager
ipcMain.handle('chat:download-model', async (event, targetPath: string) => {
    console.log('[Main] Download requested for:', targetPath);
    return new Promise(async (resolve, _reject) => {
        try {
            // Dynamic import to be safe
            const { DownloaderHelper } = await (new Function('return import("node-downloader-helper")'))();

            if (!fs.existsSync(targetPath)) {
                fs.mkdirSync(targetPath, { recursive: true });
            }

            const dl = new DownloaderHelper(DEFAULT_MODEL_URL, targetPath, {
                override: true,
                retry: { maxRetries: 3, delay: 1000 }
            });

            dl.on('end', () => {
                console.log('[Main] Download complete');
                resolve({ success: true, path: dl.getDownloadPath() });
            });
            
            dl.on('error', (err: any) => {
                console.error('[Main] Download error:', err);
                resolve({ error: `Download error: ${err.message}` });
            });
            
            dl.on('progress', (stats: any) => {
                // Throttle progress updates if needed, but for now raw is fine
                event.sender.send('chat:download-progress', stats.progress);
            });
            
            console.log('[Main] Starting download...');
            dl.start().catch((err: any) => {
                console.error('[Main] Start error:', err);
                resolve({ error: `Start error: ${err.message}` });
            });

        } catch (e: any) {
            console.error('[Main] Setup error:', e);
            resolve({ error: `Setup error: ${e.message}` });
        }
    });
});

ipcMain.handle('chat:pick-model', async () => {
    try {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'GGUF Models', extensions: ['gguf'] }]
        });

        if (result.canceled || result.filePaths.length === 0) {
            return { canceled: true };
        }

        return { path: result.filePaths[0] };
    } catch (error: any) {
        return { error: error.message };
    }
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
