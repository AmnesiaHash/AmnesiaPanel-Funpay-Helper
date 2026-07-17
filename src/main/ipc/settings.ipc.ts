import { ipcMain, app } from 'electron'
import type { AppSettings, ThemeMode } from '../../shared/types'
import {
  getAppSettings,
  setTheme
} from '../database/repositories/settings.repository'
import { clearAllData } from '../database/connection'
import { clearGoldenKey } from '../services/key-store.service'
import { funPayService } from '../services/funpay.service'
import { clearCategoryCache } from '../database/repositories/category-cache.repository'
import { licenseService } from '../services/license.service'
import { normalizeError } from '../utils/errors'

function toResult<T>(fn: () => T | Promise<T>) {
  return Promise.resolve()
    .then(fn)
    .then((data) => ({ success: true, data }))
    .catch((error) => ({ success: false, error: normalizeError(error).message }))
}

/**
 * Registers settings IPC handlers.
 */
export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get', () => toResult<AppSettings>(() => getAppSettings()))

  ipcMain.handle('settings:setTheme', (_event, theme: ThemeMode) =>
    toResult<void>(() => {
      setTheme(theme)
    })
  )

  ipcMain.handle('settings:clearData', () =>
    toResult<void>(async () => {
      funPayService.disconnect()
      clearAllData()
      clearCategoryCache()
      clearGoldenKey()
      await licenseService.removeLicense()
    })
  )

  ipcMain.handle('settings:getVersion', () =>
    toResult<string>(() => app.getVersion())
  )

  ipcMain.handle('settings:testConnection', () =>
    toResult(() => funPayService.validateBeforeOperation())
  )
}
