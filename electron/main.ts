import { app, BrowserWindow, Menu } from 'electron'
import * as path from 'path'

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
}

app.whenReady().then(() => {
  createMenu()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

import { ipcMain } from 'electron'
ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData')
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
