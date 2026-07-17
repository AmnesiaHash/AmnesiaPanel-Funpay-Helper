import { ipcMain } from 'electron'
import type {
  ActivateLicenseResult,
  ApiResult,
  LicenseCheckResult,
  LicenseInfo,
  LicenseLogEntry,
  UpdateCheckResult
} from '../../shared/types'
import { licenseService } from '../services/license.service'
import { updateService } from '../services/update.service'
import { normalizeError } from '../utils/errors'

function toResult<T>(fn: () => T | Promise<T>): Promise<ApiResult<T>> {
  return Promise.resolve()
    .then(fn)
    .then((data) => ({ success: true, data }))
    .catch((error) => ({ success: false, error: normalizeError(error).message }))
}

/**
 * Registers license and update IPC handlers.
 */
export function registerLicenseIpc(): void {
  ipcMain.handle('license:getInfo', () =>
    toResult<LicenseInfo>(() => licenseService.getLicenseInfo())
  )

  ipcMain.handle('license:activate', (_event, licenseKey: string) =>
    toResult<ActivateLicenseResult>(() => licenseService.activateLicense(licenseKey))
  )

  ipcMain.handle('license:validate', () =>
    toResult<LicenseCheckResult>(() => licenseService.validateLicense())
  )

  ipcMain.handle('license:refresh', () =>
    toResult<LicenseCheckResult>(() => licenseService.refreshLicense())
  )

  ipcMain.handle('license:remove', () =>
    toResult<void>(() => licenseService.removeLicense())
  )

  ipcMain.handle('license:getLogs', (_event, limit?: number) =>
    toResult<LicenseLogEntry[]>(() => licenseService.getLogs(limit ?? 100))
  )

  ipcMain.handle('updates:check', () =>
    toResult<UpdateCheckResult>(() => updateService.checkForUpdates())
  )
}
