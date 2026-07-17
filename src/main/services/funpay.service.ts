import type { BrowserWindow } from 'electron'
import type {
  AccountInfo,
  ApplyTemplatesPayload,
  BulkUpdatePayload,
  CategoryNode,
  CloneLotPayload,
  FieldSchema,
  JobProgress,
  LotSummary,
  OfferForm,
  TemplateRecord
} from '../../shared/types'
import { funPayClient } from '../api/funpay-client'
import {
  getCachedCategories,
  setCachedCategories
} from '../database/repositories/category-cache.repository'
import { addHistoryEntry } from '../database/repositories/history.repository'
import { getTemplateById } from '../database/repositories/templates.repository'
import {
  clearGoldenKey,
  hasGoldenKey,
  loadGoldenKey,
  saveGoldenKey
} from './key-store.service'
import { mergeFormData, validateCategoryFields } from '../../shared/field-mapper'
import { normalizeError, ValidationError } from '../utils/errors'
import { delay } from '../utils/retry'

/**
 * High-level FunPay service orchestrating client, storage, and history.
 */
export class FunPayService {
  private mainWindow: BrowserWindow | null = null

  /** Sets reference to main window for progress events. */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  /** Connects with Golden Key and validates session. */
  async connect(goldenKey: string): Promise<AccountInfo> {
    funPayClient.setGoldenKey(goldenKey)
    const account = await funPayClient.validateConnection()
    saveGoldenKey(goldenKey)
    addHistoryEntry({
      operationType: 'connect',
      status: 'success',
      details: `Подключён аккаунт ${account.username}`
    })
    return account
  }

  /** Restores session from stored key on app start. */
  async restoreSession(): Promise<AccountInfo | null> {
    const key = loadGoldenKey()
    if (!key) return null
    funPayClient.setGoldenKey(key)
    try {
      return await funPayClient.validateConnection()
    } catch {
      return null
    }
  }

  /** Returns auth status. */
  getAuthStatus(): { connected: boolean; account?: AccountInfo } {
    const account = funPayClient.getAccountInfo()
    return {
      connected: hasGoldenKey() && !!account,
      account: account ?? undefined
    }
  }

  /** Disconnects and clears stored key. */
  disconnect(): void {
    clearGoldenKey()
    funPayClient.setGoldenKey('')
  }

  /** Returns current account info, validating if needed. */
  async getAccount(): Promise<AccountInfo> {
    await this.ensureConnected()
    await funPayClient.refreshHomeCsrf()
    return funPayClient.getAccountInfo()!
  }

  /** Fetches all user lots. */
  async fetchLots(): Promise<LotSummary[]> {
    await this.ensureConnected()
    await funPayClient.refreshHomeCsrf()
    const account = funPayClient.getAccountInfo()!
    const lots = await funPayClient.getUserLots(account.userId)
    addHistoryEntry({
      operationType: 'fetch_lots',
      status: 'success',
      details: `Загружено ${lots.length} лотов`
    })
    return lots
  }

  /** Gets full lot form data. */
  async getLotForm(nodeId: string, offerId: string): Promise<OfferForm> {
    await this.ensureConnected()
    return funPayClient.getLotForm(nodeId, offerId)
  }

  /** Returns category tree with caching. */
  async getCategoryTree(): Promise<CategoryNode[]> {
    await this.ensureConnected()
    const cached = getCachedCategories()
    if (cached) return cached
    const tree = await funPayClient.getCategoryTree()
    setCachedCategories(tree)
    return tree
  }

  /** Returns schema for category-specific fields. */
  async getNodeSchema(nodeId: string): Promise<FieldSchema[]> {
    await this.ensureConnected()
    return funPayClient.getNodeSchema(nodeId)
  }

  /** Clones a lot into multiple target categories. */
  async cloneLot(payload: CloneLotPayload): Promise<{ created: number; errors: string[] }> {
    await this.ensureConnected()
    await funPayClient.validateConnection()

    const sourceForm = await funPayClient.getLotForm(payload.sourceNodeId, payload.sourceLotId)
    const errors: string[] = []
    let created = 0
    const total = payload.targetNodeIds.length
    const startTime = Date.now()

    for (let i = 0; i < payload.targetNodeIds.length; i++) {
      const targetNodeId = payload.targetNodeIds[i]
      this.emitProgress({
        done: i,
        total,
        message: `Создание копии в категории ${targetNodeId}...`,
        etaMs: estimateEta(startTime, i, total)
      })

      try {
        let targetForm = await funPayClient.getLotForm(targetNodeId)
        let merged = mergeFormData(
          sourceForm,
          targetForm,
          payload.fieldOverrides?.[targetNodeId]
        )
        const missing = validateCategoryFields(targetForm, merged)
        if (missing.length > 0) {
          throw new ValidationError(
            `Заполните поля категории: ${missing.join(', ')}`,
            missing
          )
        }
        merged.offer_id = ''
        merged.node_id = targetNodeId

        let result = await funPayClient.saveOffer(merged)

        if (!result.success && result.error?.includes('428')) {
          await funPayClient.ensureSession()
          targetForm = await funPayClient.getLotForm(targetNodeId)
          merged = mergeFormData(
            sourceForm,
            targetForm,
            payload.fieldOverrides?.[targetNodeId]
          )
          merged.offer_id = ''
          merged.node_id = targetNodeId
          result = await funPayClient.saveOffer(merged)
        }

        if (result.success) {
          created++
          addHistoryEntry({
            operationType: 'clone_lot',
            lotId: payload.sourceLotId,
            category: targetNodeId,
            status: 'success',
            details: `Создана копия в категории ${targetNodeId}`
          })
        } else {
          const errMsg = result.error ?? 'Неизвестная ошибка'
          errors.push(`Категория ${targetNodeId}: ${errMsg}`)
          addHistoryEntry({
            operationType: 'clone_lot',
            lotId: payload.sourceLotId,
            category: targetNodeId,
            status: 'error',
            error: errMsg
          })
        }
      } catch (error) {
        const err = normalizeError(error)
        errors.push(`Категория ${targetNodeId}: ${err.message}`)
        addHistoryEntry({
          operationType: 'clone_lot',
          lotId: payload.sourceLotId,
          category: targetNodeId,
          status: 'error',
          error: err.message
        })
      }

      await delay(400)
    }

    this.emitProgress({ done: total, total, message: 'Готово' })
    return { created, errors }
  }

  /** Creates FunPay lots from saved templates. */
  async applyTemplates(
    payload: ApplyTemplatesPayload
  ): Promise<{ created: number; errors: string[] }> {
    await this.ensureConnected()
    await funPayClient.validateConnection()

    const copies = Math.max(1, payload.copiesPerTemplate ?? 1)
    const errors: string[] = []
    let created = 0

    const jobs: Array<{ template: TemplateRecord; targetNodeId: string }> = []
    for (const templateId of payload.templateIds) {
      const template = getTemplateById(templateId)
      if (!template) {
        errors.push(`Шаблон ${templateId}: не найден`)
        continue
      }

      if (payload.useOwnCategories) {
        if (!template.nodeId) {
          errors.push(`«${template.name}»: нет сохранённой категории (nodeId)`)
          continue
        }
        for (let copy = 0; copy < copies; copy++) {
          jobs.push({ template, targetNodeId: template.nodeId })
        }
        continue
      }

      for (const targetNodeId of payload.targetNodeIds) {
        for (let copy = 0; copy < copies; copy++) {
          jobs.push({ template, targetNodeId })
        }
      }
    }

    const total = jobs.length
    const startTime = Date.now()

    for (let i = 0; i < jobs.length; i++) {
      const { template, targetNodeId } = jobs[i]!
      this.emitProgress({
        done: i,
        total,
        message: `Шаблон «${template.name}» → категория ${targetNodeId}...`,
        etaMs: estimateEta(startTime, i, total)
      })

      try {
        const sourceForm = templateToOfferForm(template)
        let targetForm = await funPayClient.getLotForm(targetNodeId)
        let merged = mergeFormData(
          sourceForm,
          targetForm,
          payload.fieldOverrides?.[targetNodeId]
        )
        const missing = validateCategoryFields(targetForm, merged)
        if (missing.length > 0) {
          throw new ValidationError(
            `Заполните поля категории: ${missing.join(', ')}`,
            missing
          )
        }
        merged.offer_id = ''
        merged.node_id = targetNodeId

        let result = await funPayClient.saveOffer(merged)

        if (!result.success && result.error?.includes('428')) {
          await funPayClient.ensureSession()
          targetForm = await funPayClient.getLotForm(targetNodeId)
          merged = mergeFormData(
            sourceForm,
            targetForm,
            payload.fieldOverrides?.[targetNodeId]
          )
          merged.offer_id = ''
          merged.node_id = targetNodeId
          result = await funPayClient.saveOffer(merged)
        }

        if (result.success) {
          created++
          addHistoryEntry({
            operationType: 'apply_template',
            lotId: template.sourceLotId,
            category: targetNodeId,
            status: 'success',
            details: template.name
          })
        } else {
          const errMsg = result.error ?? 'Неизвестная ошибка'
          errors.push(`«${template.name}» / ${targetNodeId}: ${errMsg}`)
          addHistoryEntry({
            operationType: 'apply_template',
            lotId: template.sourceLotId,
            category: targetNodeId,
            status: 'error',
            error: errMsg,
            details: template.name
          })
        }
      } catch (error) {
        const err = normalizeError(error)
        errors.push(`«${template.name}» / ${targetNodeId}: ${err.message}`)
        addHistoryEntry({
          operationType: 'apply_template',
          lotId: template.sourceLotId,
          category: targetNodeId,
          status: 'error',
          error: err.message,
          details: template.name
        })
      }

      await delay(400)
    }

    this.emitProgress({ done: total, total, message: 'Готово' })
    return { created, errors }
  }

  /** Applies bulk updates to multiple lots. */
  async bulkUpdate(payload: BulkUpdatePayload): Promise<{ updated: number; errors: string[] }> {
    await this.ensureConnected()

    const errors: string[] = []
    let updated = 0
    const total = payload.lotIds.length
    const startTime = Date.now()

    for (let i = 0; i < payload.lotIds.length; i++) {
      const lot = payload.lotIds[i]
      this.emitProgress({
        done: i,
        total,
        currentLotId: lot.id,
        message: `Обновление лота #${lot.id}...`,
        etaMs: estimateEta(startTime, i, total)
      })

      try {
        const form = await funPayClient.getLotForm(lot.nodeId, lot.id)
        const data = { ...form.rawFormData }

        if (payload.changes.price !== undefined) data.price = payload.changes.price
        if (payload.changes.title !== undefined) data['fields[summary][ru]'] = payload.changes.title
        if (payload.changes.description !== undefined) data['fields[desc][ru]'] = payload.changes.description
        if (payload.changes.active !== undefined) data.active = payload.changes.active ? 'on' : ''

        const result = await funPayClient.saveOffer(data)
        if (result.success) {
          updated++
          addHistoryEntry({
            operationType: 'bulk_update',
            lotId: lot.id,
            category: lot.nodeId,
            status: 'success'
          })
        } else {
          errors.push(`Лот #${lot.id}: ${result.error}`)
          addHistoryEntry({
            operationType: 'bulk_update',
            lotId: lot.id,
            category: lot.nodeId,
            status: 'error',
            error: result.error
          })
        }
      } catch (error) {
        const err = normalizeError(error)
        errors.push(`Лот #${lot.id}: ${err.message}`)
        addHistoryEntry({
          operationType: 'bulk_update',
          lotId: lot.id,
          category: lot.nodeId,
          status: 'error',
          error: err.message
        })
      }

      await delay(400)
    }

    this.emitProgress({ done: total, total, message: 'Готово' })
    return { updated, errors }
  }

  /** Validates connection before operations. */
  async validateBeforeOperation(): Promise<void> {
    await this.ensureConnected()
    await funPayClient.validateConnection()
  }

  private async ensureConnected(): Promise<void> {
    if (!hasGoldenKey()) {
      throw new ValidationError('Golden Key не настроен. Подключите аккаунт.')
    }
    if (!funPayClient.getAccountInfo()) {
      const key = loadGoldenKey()
      if (key) {
        funPayClient.setGoldenKey(key)
        await funPayClient.validateConnection()
      }
    }
  }

  private emitProgress(progress: JobProgress): void {
    this.mainWindow?.webContents.send('job:progress', progress)
  }
}

function estimateEta(startTime: number, done: number, total: number): number | undefined {
  if (done <= 0) return undefined
  const elapsed = Date.now() - startTime
  const perItem = elapsed / done
  return Math.round(perItem * (total - done))
}

function templateToOfferForm(template: TemplateRecord): OfferForm {
  return {
    nodeId: template.nodeId ?? '',
    offerId: '0',
    fields: {},
    rawFormData: template.fields
  }
}

export const funPayService = new FunPayService()
