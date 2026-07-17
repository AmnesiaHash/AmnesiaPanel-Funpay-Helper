import { ipcMain } from 'electron'
import type {
  BulkUpdatePayload,
  CloneLotPayload,
  FieldSchema,
  LotSummary,
  OfferForm
} from '../../shared/types'
import { funPayService } from '../services/funpay.service'
import { normalizeError } from '../utils/errors'

function toResult<T>(fn: () => T | Promise<T>) {
  return Promise.resolve()
    .then(fn)
    .then((data) => ({ success: true, data }))
    .catch((error) => ({ success: false, error: normalizeError(error).message }))
}

/**
 * Registers lots and categories IPC handlers.
 */
export function registerLotsIpc(): void {
  ipcMain.handle('lots:fetchAll', () =>
    toResult<LotSummary[]>(() => funPayService.fetchLots())
  )

  ipcMain.handle('lots:getForm', (_event, nodeId: string, offerId: string) =>
    toResult<OfferForm>(() => funPayService.getLotForm(nodeId, offerId))
  )

  ipcMain.handle('lots:clone', (_event, payload: CloneLotPayload) =>
    toResult(() => funPayService.cloneLot(payload))
  )

  ipcMain.handle('lots:bulkUpdate', (_event, payload: BulkUpdatePayload) =>
    toResult(() => funPayService.bulkUpdate(payload))
  )

  ipcMain.handle('categories:getTree', () =>
    toResult(() => funPayService.getCategoryTree())
  )

  ipcMain.handle('categories:getSchema', (_event, nodeId: string) =>
    toResult<FieldSchema[]>(() => funPayService.getNodeSchema(nodeId))
  )

  ipcMain.handle('lots:validate', () =>
    toResult(() => funPayService.validateBeforeOperation())
  )
}
