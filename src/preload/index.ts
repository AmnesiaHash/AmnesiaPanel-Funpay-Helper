import { contextBridge, ipcRenderer } from 'electron'
import type {
  AmnesiaApi,
  BulkUpdatePayload,
  CloneLotPayload,
  JobProgress,
  ThemeMode
} from '../shared/types'

/**
 * Exposes typed IPC API to renderer via contextBridge.
 */
const api: AmnesiaApi = {
  connect: (goldenKey) => ipcRenderer.invoke('auth:connect', goldenKey),
  disconnect: () => ipcRenderer.invoke('auth:disconnect'),
  getAuthStatus: () => ipcRenderer.invoke('auth:getStatus'),
  getAccount: () => ipcRenderer.invoke('auth:getAccount'),
  fetchLots: () => ipcRenderer.invoke('lots:fetchAll'),
  getLotForm: (nodeId, offerId) => ipcRenderer.invoke('lots:getForm', nodeId, offerId),
  cloneLot: (payload: CloneLotPayload) => ipcRenderer.invoke('lots:clone', payload),
  bulkUpdate: (payload: BulkUpdatePayload) => ipcRenderer.invoke('lots:bulkUpdate', payload),
  getCategoryTree: () => ipcRenderer.invoke('categories:getTree'),
  getNodeSchema: (nodeId) => ipcRenderer.invoke('categories:getSchema', nodeId),
  listTemplates: () => ipcRenderer.invoke('templates:list'),
  getTemplate: (id) => ipcRenderer.invoke('templates:get', id),
  createTemplate: (data) => ipcRenderer.invoke('templates:create', data),
  updateTemplate: (data) => ipcRenderer.invoke('templates:update', data),
  deleteTemplate: (id) => ipcRenderer.invoke('templates:delete', id),
  exportTemplate: (id) => ipcRenderer.invoke('templates:export', id),
  exportTemplatesBulk: (ids) => ipcRenderer.invoke('templates:exportBulk', ids),
  importTemplate: () => ipcRenderer.invoke('templates:import'),
  applyTemplates: (payload) => ipcRenderer.invoke('templates:apply', payload),
  getHistory: (limit, offset) => ipcRenderer.invoke('history:get', limit, offset),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setTheme: (theme: ThemeMode) => ipcRenderer.invoke('settings:setTheme', theme),
  clearData: () => ipcRenderer.invoke('settings:clearData'),
  getVersion: () => ipcRenderer.invoke('settings:getVersion'),
  getLicenseInfo: () => ipcRenderer.invoke('license:getInfo'),
  activateLicense: (licenseKey) => ipcRenderer.invoke('license:activate', licenseKey),
  validateLicense: () => ipcRenderer.invoke('license:validate'),
  refreshLicense: () => ipcRenderer.invoke('license:refresh'),
  removeLicense: () => ipcRenderer.invoke('license:remove'),
  getLicenseLogs: (limit) => ipcRenderer.invoke('license:getLogs', limit),
  checkForUpdates: () => ipcRenderer.invoke('updates:check'),
  onJobProgress: (callback: (progress: JobProgress) => void) => {
    const handler = (_event: unknown, progress: JobProgress) => callback(progress)
    ipcRenderer.on('job:progress', handler)
    return () => ipcRenderer.removeListener('job:progress', handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('amnesia', api)
  } catch (error) {
    console.error('[preload] Failed to expose amnesia API:', error)
  }
} else {
  // Fallback when context isolation is disabled
  ;(globalThis as typeof globalThis & { amnesia: AmnesiaApi }).amnesia = api
}
