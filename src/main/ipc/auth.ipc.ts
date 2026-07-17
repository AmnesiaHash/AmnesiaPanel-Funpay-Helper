import { ipcMain } from 'electron'
import type { AccountInfo, ApiResult } from '../../shared/types'
import { funPayService } from '../services/funpay.service'
import { normalizeError } from '../utils/errors'

/**
 * Wraps handler result into ApiResult format.
 */
function toResult<T>(fn: () => T | Promise<T>): Promise<ApiResult<T>> {
  return Promise.resolve()
    .then(fn)
    .then((data) => ({ success: true, data }))
    .catch((error) => ({ success: false, error: normalizeError(error).message }))
}

/**
 * Registers authentication IPC handlers.
 */
export function registerAuthIpc(): void {
  ipcMain.handle('auth:connect', (_event, goldenKey: string) =>
    toResult<AccountInfo>(() => funPayService.connect(goldenKey))
  )

  ipcMain.handle('auth:disconnect', () =>
    toResult<void>(() => {
      funPayService.disconnect()
    })
  )

  ipcMain.handle('auth:getStatus', () =>
    toResult(() => funPayService.getAuthStatus())
  )

  ipcMain.handle('auth:getAccount', () => toResult(() => funPayService.getAccount()))
}
