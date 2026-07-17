import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { loadAppEnv } from './env-bootstrap'
import { getDatabase } from './database/connection'
import { funPayService } from './services/funpay.service'
import { registerAuthIpc } from './ipc/auth.ipc'
import { registerLotsIpc } from './ipc/lots.ipc'
import { registerTemplatesIpc } from './ipc/templates.ipc'
import { registerHistoryIpc } from './ipc/history.ipc'
import { registerSettingsIpc } from './ipc/settings.ipc'
import { registerLicenseIpc } from './ipc/license.ipc'

loadAppEnv()

let mainWindow: BrowserWindow | null = null

/**
 * Resolves preload script path for both CJS (.js) and ESM (.mjs) builds.
 */
function getPreloadPath(): string {
  const base = join(__dirname, '../preload/index')
  if (existsSync(`${base}.cjs`)) return `${base}.cjs`
  if (existsSync(`${base}.js`)) return `${base}.js`
  if (existsSync(`${base}.mjs`)) return `${base}.mjs`
  return `${base}.cjs`
}

/**
 * Creates the main application window.
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: 'AmnesiaPanel',
    backgroundColor: '#0f0a1a',
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error('[main] Preload error:', preloadPath, error)
  })

  funPayService.setMainWindow(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://funpay.com') || url.startsWith('https://t.me/')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/**
 * Registers all IPC handlers.
 */
function registerIpcHandlers(): void {
  registerAuthIpc()
  registerLotsIpc()
  registerTemplatesIpc()
  registerHistoryIpc()
  registerSettingsIpc()
  registerLicenseIpc()
}

app.whenReady().then(async () => {
  getDatabase()
  registerIpcHandlers()
  createWindow()
  await funPayService.restoreSession()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
