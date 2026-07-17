import { ipcMain, dialog } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import type { TemplateExportBundle, TemplateRecord } from '../../shared/types'
import {
  createTemplate,
  createTemplatesBulk,
  deleteTemplate,
  getTemplateById,
  listTemplates,
  updateTemplate
} from '../database/repositories/templates.repository'
import { addHistoryEntry } from '../database/repositories/history.repository'
import { funPayService } from '../services/funpay.service'
import { normalizeError } from '../utils/errors'

function toResult<T>(fn: () => T | Promise<T>) {
  return Promise.resolve()
    .then(fn)
    .then((data) => ({ success: true, data }))
    .catch((error) => ({ success: false, error: normalizeError(error).message }))
}

interface ImportTemplateItem {
  name: string
  description?: string
  sourceLotId?: string
  nodeId?: string
  fields: Record<string, string>
}

function parseImportItems(raw: string): ImportTemplateItem[] {
  const parsed = JSON.parse(raw) as unknown

  const normalize = (item: Partial<TemplateRecord>): ImportTemplateItem => ({
    name: item.name ?? 'Импортированный шаблон',
    description: item.description,
    sourceLotId: item.sourceLotId,
    nodeId: item.nodeId,
    fields: item.fields ?? {}
  })

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) throw new Error('Файл не содержит шаблонов')
    return parsed.map((item) => normalize(item as Partial<TemplateRecord>))
  }

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as { templates?: unknown[]; name?: string; fields?: Record<string, string> }
    if (Array.isArray(obj.templates)) {
      if (obj.templates.length === 0) throw new Error('Файл не содержит шаблонов')
      return obj.templates.map((item) => normalize(item as Partial<TemplateRecord>))
    }
    if (obj.name || obj.fields) {
      return [normalize(obj as Partial<TemplateRecord>)]
    }
  }

  throw new Error('Неверный формат JSON. Ожидается массив шаблонов или объект { templates: [...] }')
}

/**
 * Registers template IPC handlers.
 */
export function registerTemplatesIpc(): void {
  ipcMain.handle('templates:list', () => toResult<TemplateRecord[]>(() => listTemplates()))

  ipcMain.handle('templates:get', (_event, id: string) =>
    toResult<TemplateRecord>(() => {
      const template = getTemplateById(id)
      if (!template) throw new Error('Шаблон не найден')
      return template
    })
  )

  ipcMain.handle(
    'templates:create',
    (_event, data: { name: string; description?: string; fields: Record<string, string>; sourceLotId?: string; nodeId?: string }) =>
      toResult<TemplateRecord>(() => {
        const template = createTemplate(data)
        addHistoryEntry({
          operationType: 'save_template',
          status: 'success',
          details: template.name
        })
        return template
      })
  )

  ipcMain.handle(
    'templates:update',
    (_event, data: { id: string; name?: string; description?: string; fields?: Record<string, string> }) =>
      toResult<TemplateRecord>(() => {
        const updated = updateTemplate(data.id, data)
        if (!updated) throw new Error('Шаблон не найден')
        return updated
      })
  )

  ipcMain.handle('templates:delete', (_event, id: string) =>
    toResult<void>(() => {
      if (!deleteTemplate(id)) throw new Error('Шаблон не найден')
    })
  )

  ipcMain.handle('templates:apply', (_event, payload) =>
    toResult(() => funPayService.applyTemplates(payload))
  )

  ipcMain.handle('templates:export', async (_event, id: string) =>
    toResult<{ path: string }>(async () => {
      const template = getTemplateById(id)
      if (!template) throw new Error('Шаблон не найден')

      const result = await dialog.showSaveDialog({
        defaultPath: `${template.name}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })

      if (result.canceled || !result.filePath) {
        throw new Error('Экспорт отменён')
      }

      writeFileSync(result.filePath, JSON.stringify(template, null, 2), 'utf-8')
      addHistoryEntry({
        operationType: 'export_template',
        status: 'success',
        details: template.name
      })
      return { path: result.filePath }
    })
  )

  ipcMain.handle('templates:exportBulk', async (_event, ids: string[]) =>
    toResult<{ path: string; count: number }>(async () => {
      const templates = ids
        .map((id) => getTemplateById(id))
        .filter((item): item is TemplateRecord => !!item)

      if (templates.length === 0) throw new Error('Нет шаблонов для экспорта')

      const bundle: TemplateExportBundle = {
        version: 1,
        exportedAt: new Date().toISOString(),
        templates: templates.map(({ name, description, sourceLotId, nodeId, fields }) => ({
          name,
          description,
          sourceLotId,
          nodeId,
          fields
        }))
      }

      const result = await dialog.showSaveDialog({
        defaultPath: `amnesia-templates-${templates.length}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })

      if (result.canceled || !result.filePath) {
        throw new Error('Экспорт отменён')
      }

      writeFileSync(result.filePath, JSON.stringify(bundle, null, 2), 'utf-8')
      addHistoryEntry({
        operationType: 'export_template',
        status: 'success',
        details: `Экспорт ${templates.length} шаблонов`
      })
      return { path: result.filePath, count: templates.length }
    })
  )

  ipcMain.handle('templates:import', async () =>
    toResult<{ imported: number; templates: TemplateRecord[] }>(async () => {
      const result = await dialog.showOpenDialog({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile']
      })

      if (result.canceled || !result.filePaths[0]) {
        throw new Error('Импорт отменён')
      }

      const raw = readFileSync(result.filePaths[0], 'utf-8')
      const items = parseImportItems(raw)
      const templates = createTemplatesBulk(items)

      addHistoryEntry({
        operationType: 'import_template',
        status: 'success',
        details: `Импорт ${templates.length} шаблонов`
      })

      return { imported: templates.length, templates }
    })
  )
}
