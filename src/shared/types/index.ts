/** Shared domain types for AmnesiaPanel. */

import type {
  ActivateLicenseResult,
  LicenseInfo,
  LicenseCheckResult,
  LicenseLogEntry,
  UpdateCheckResult
} from './license'

export type {
  ActivateLicenseResult,
  License,
  LicenseCheckResult,
  LicenseInfo,
  LicenseLogEntry,
  LicenseStatus,
  LicenseType,
  UpdateCheckResult
} from './license'

export interface AccountInfo {
  userId: number
  username: string
  balance?: number
  locale?: string
  csrfToken: string
  avatarUrl?: string
}

export interface LotSummary {
  id: string
  nodeId: string
  title: string
  price: string
  category: string
  status: LotStatus
  imageUrl?: string
  lastModified?: string
}

export type LotStatus = 'active' | 'inactive' | 'unknown'

export interface OfferFormField {
  name: string
  value: string
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'hidden' | 'file' | 'number'
  label?: string
  required?: boolean
  options?: Array<{ value: string; label: string }>
}

export interface OfferForm {
  nodeId: string
  offerId: string
  fields: Record<string, OfferFormField>
  rawFormData: Record<string, string>
}

export interface CategoryNode {
  id: string
  name: string
  fullName?: string
  parentId?: string
  children?: CategoryNode[]
  type?: 'game' | 'subcategory'
}

export interface FieldSchema {
  name: string
  label: string
  type: string
  required: boolean
  options: Array<{ value: string; label: string }>
  /** Default value from the target category form. */
  currentValue?: string
}

export interface SaveResult {
  success: boolean
  offerId?: string
  message?: string
  error?: string
}

export interface TemplateRecord {
  id: string
  name: string
  description?: string
  sourceLotId?: string
  nodeId?: string
  fields: Record<string, string>
  createdAt: string
  updatedAt: string
}

export type OperationType =
  | 'connect'
  | 'fetch_lots'
  | 'clone_lot'
  | 'bulk_update'
  | 'save_template'
  | 'apply_template'
  | 'import_template'
  | 'export_template'

export type OperationStatus = 'success' | 'error' | 'partial'

export interface HistoryEntry {
  id: number
  timestamp: string
  operationType: OperationType
  lotId?: string
  category?: string
  status: OperationStatus
  error?: string
  details?: string
}

export interface JobProgress {
  done: number
  total: number
  currentLotId?: string
  etaMs?: number
  message?: string
}

export interface BulkUpdatePayload {
  lotIds: Array<{ id: string; nodeId: string }>
  changes: {
    price?: string
    title?: string
    description?: string
    active?: boolean
  }
}

export interface CloneLotPayload {
  sourceLotId: string
  sourceNodeId: string
  targetNodeIds: string[]
  fieldOverrides?: Record<string, Record<string, string>>
}

export interface ApplyTemplatesPayload {
  templateIds: string[]
  /** Used when useOwnCategories is false — every template goes to every selected category. */
  targetNodeIds: string[]
  fieldOverrides?: Record<string, Record<string, string>>
  copiesPerTemplate?: number
  /** Each template is posted only to its saved nodeId (from export/source lot). */
  useOwnCategories?: boolean
}

export interface TemplateExportBundle {
  version: 1
  exportedAt: string
  templates: Array<{
    name: string
    description?: string
    sourceLotId?: string
    nodeId?: string
    fields: Record<string, string>
  }>
}

export interface ApplyTemplatesResult {
  created: number
  errors: string[]
}

export interface ApiResult<T> {
  success: boolean
  data?: T
  error?: string
}

export type ThemeMode = 'dark' | 'light' | 'system'

export interface AppSettings {
  theme: ThemeMode
}

export interface IpcChannels {
  'auth:connect': { goldenKey: string }
  'auth:disconnect': void
  'auth:getStatus': void
  'auth:getAccount': void
  'lots:fetchAll': void
  'lots:getForm': { nodeId: string; offerId: string }
  'lots:clone': CloneLotPayload
  'lots:bulkUpdate': BulkUpdatePayload
  'categories:getTree': void
  'categories:getSchema': { nodeId: string }
  'templates:list': void
  'templates:get': { id: string }
  'templates:create': { name: string; description?: string; fields: Record<string, string>; sourceLotId?: string; nodeId?: string }
  'templates:update': { id: string; name?: string; description?: string; fields?: Record<string, string> }
  'templates:delete': { id: string }
  'templates:export': { id: string }
  'templates:exportBulk': { ids: string[] }
  'templates:import': void
  'templates:apply': ApplyTemplatesPayload
  'history:get': { limit?: number; offset?: number }
  'history:clear': void
  'settings:get': void
  'settings:setTheme': { theme: ThemeMode }
  'settings:clearData': void
  'settings:getVersion': void
  'license:getInfo': void
  'license:activate': { licenseKey: string }
  'license:validate': void
  'license:refresh': void
  'license:remove': void
  'license:getLogs': { limit?: number }
  'updates:check': void
  'dialog:openFile': { filters?: Array<{ name: string; extensions: string[] }> }
  'dialog:saveFile': { defaultPath?: string; filters?: Array<{ name: string; extensions: string[] }> }
}

export interface AmnesiaApi {
  connect(goldenKey: string): Promise<ApiResult<AccountInfo>>
  disconnect(): Promise<ApiResult<void>>
  getAuthStatus(): Promise<ApiResult<{ connected: boolean; account?: AccountInfo }>>
  getAccount(): Promise<ApiResult<AccountInfo>>
  fetchLots(): Promise<ApiResult<LotSummary[]>>
  getLotForm(nodeId: string, offerId: string): Promise<ApiResult<OfferForm>>
  cloneLot(payload: CloneLotPayload): Promise<ApiResult<{ created: number; errors: string[] }>>
  bulkUpdate(payload: BulkUpdatePayload): Promise<ApiResult<{ updated: number; errors: string[] }>>
  getCategoryTree(): Promise<ApiResult<CategoryNode[]>>
  getNodeSchema(nodeId: string): Promise<ApiResult<FieldSchema[]>>
  listTemplates(): Promise<ApiResult<TemplateRecord[]>>
  getTemplate(id: string): Promise<ApiResult<TemplateRecord>>
  createTemplate(data: IpcChannels['templates:create']): Promise<ApiResult<TemplateRecord>>
  updateTemplate(data: IpcChannels['templates:update']): Promise<ApiResult<TemplateRecord>>
  deleteTemplate(id: string): Promise<ApiResult<void>>
  exportTemplate(id: string): Promise<ApiResult<{ path: string }>>
  exportTemplatesBulk(ids: string[]): Promise<ApiResult<{ path: string; count: number }>>
  importTemplate(): Promise<ApiResult<{ imported: number; templates: TemplateRecord[] }>>
  applyTemplates(payload: ApplyTemplatesPayload): Promise<ApiResult<ApplyTemplatesResult>>
  getHistory(limit?: number, offset?: number): Promise<ApiResult<HistoryEntry[]>>
  clearHistory(): Promise<ApiResult<void>>
  getSettings(): Promise<ApiResult<AppSettings>>
  setTheme(theme: ThemeMode): Promise<ApiResult<void>>
  clearData(): Promise<ApiResult<void>>
  getVersion(): Promise<ApiResult<string>>
  getLicenseInfo(): Promise<ApiResult<LicenseInfo>>
  activateLicense(licenseKey: string): Promise<ApiResult<ActivateLicenseResult>>
  validateLicense(): Promise<ApiResult<LicenseCheckResult>>
  refreshLicense(): Promise<ApiResult<LicenseCheckResult>>
  removeLicense(): Promise<ApiResult<void>>
  getLicenseLogs(limit?: number): Promise<ApiResult<LicenseLogEntry[]>>
  checkForUpdates(): Promise<ApiResult<UpdateCheckResult>>
  onJobProgress(callback: (progress: JobProgress) => void): () => void
}

declare global {
  interface Window {
    amnesia: AmnesiaApi
  }
}

export {}
