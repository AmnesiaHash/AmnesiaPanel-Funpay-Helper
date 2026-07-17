import { ipcMain } from 'electron'
import type { HistoryEntry } from '../../shared/types'
import {
  clearHistoryEntries,
  getHistoryEntries
} from '../database/repositories/history.repository'
import { normalizeError } from '../utils/errors'

function toResult<T>(fn: () => T | Promise<T>) {
  return Promise.resolve()
    .then(fn)
    .then((data) => ({ success: true, data }))
    .catch((error) => ({ success: false, error: normalizeError(error).message }))
}

/**
 * Registers history IPC handlers.
 */
export function registerHistoryIpc(): void {
  ipcMain.handle('history:get', (_event, limit = 100, offset = 0) =>
    toResult<HistoryEntry[]>(() => getHistoryEntries(limit, offset))
  )

  ipcMain.handle('history:clear', () =>
    toResult<void>(() => {
      clearHistoryEntries()
    })
  )
}
