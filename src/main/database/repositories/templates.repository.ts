import { randomUUID } from 'crypto'
import { getDatabase } from '../connection'
import type { TemplateRecord } from '../../../shared/types'

interface TemplateRow {
  id: string
  name: string
  description: string | null
  source_lot_id: string | null
  node_id: string | null
  fields_json: string
  created_at: string
  updated_at: string
}

/**
 * Lists all saved templates.
 */
export function listTemplates(): TemplateRecord[] {
  const rows = getDatabase()
    .prepare('SELECT * FROM templates ORDER BY updated_at DESC')
    .all() as TemplateRow[]
  return rows.map(mapRow)
}

/**
 * Gets a template by ID.
 */
export function getTemplateById(id: string): TemplateRecord | null {
  const row = getDatabase()
    .prepare('SELECT * FROM templates WHERE id = ?')
    .get(id) as TemplateRow | undefined
  return row ? mapRow(row) : null
}

/**
 * Creates a new template record.
 */
export function createTemplate(data: {
  name: string
  description?: string
  sourceLotId?: string
  nodeId?: string
  fields: Record<string, string>
}): TemplateRecord {
  const id = randomUUID()
  const now = new Date().toISOString()
  getDatabase()
    .prepare(
      `INSERT INTO templates (id, name, description, source_lot_id, node_id, fields_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      data.name,
      data.description ?? null,
      data.sourceLotId ?? null,
      data.nodeId ?? null,
      JSON.stringify(data.fields),
      now,
      now
    )
  return getTemplateById(id)!
}

/**
 * Updates an existing template.
 */
export function updateTemplate(
  id: string,
  data: Partial<{ name: string; description: string; fields: Record<string, string> }>
): TemplateRecord | null {
  const existing = getTemplateById(id)
  if (!existing) return null

  const updated: TemplateRecord = {
    ...existing,
    name: data.name ?? existing.name,
    description: data.description ?? existing.description,
    fields: data.fields ?? existing.fields,
    updatedAt: new Date().toISOString()
  }

  getDatabase()
    .prepare(
      `UPDATE templates SET name = ?, description = ?, fields_json = ?, updated_at = ? WHERE id = ?`
    )
    .run(
      updated.name,
      updated.description ?? null,
      JSON.stringify(updated.fields),
      updated.updatedAt,
      id
    )

  return updated
}

/**
 * Deletes a template by ID.
 */
export function deleteTemplate(id: string): boolean {
  const result = getDatabase().prepare('DELETE FROM templates WHERE id = ?').run(id)
  return result.changes > 0
}

/**
 * Creates multiple template records in one transaction.
 */
export function createTemplatesBulk(
  items: Array<{
    name: string
    description?: string
    sourceLotId?: string
    nodeId?: string
    fields: Record<string, string>
  }>
): TemplateRecord[] {
  return items.map((item) => createTemplate(item))
}

function mapRow(row: TemplateRow): TemplateRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    sourceLotId: row.source_lot_id ?? undefined,
    nodeId: row.node_id ?? undefined,
    fields: JSON.parse(row.fields_json) as Record<string, string>,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
