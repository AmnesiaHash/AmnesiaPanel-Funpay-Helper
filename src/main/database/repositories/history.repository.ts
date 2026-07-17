import { getDatabase } from '../connection'
import type { HistoryEntry, OperationStatus, OperationType } from '../../../shared/types'

interface HistoryRow {
  id: number
  timestamp: string
  operation_type: string
  lot_id: string | null
  category: string | null
  status: string
  error: string | null
  details: string | null
}

/**
 * Inserts a new history log entry.
 */
export function addHistoryEntry(entry: {
  operationType: OperationType
  lotId?: string
  category?: string
  status: OperationStatus
  error?: string
  details?: string
}): HistoryEntry {
  const timestamp = new Date().toISOString()
  const result = getDatabase()
    .prepare(
      `INSERT INTO history (timestamp, operation_type, lot_id, category, status, error, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      timestamp,
      entry.operationType,
      entry.lotId ?? null,
      entry.category ?? null,
      entry.status,
      entry.error ?? null,
      entry.details ?? null
    )

  return {
    id: Number(result.lastInsertRowid),
    timestamp,
    operationType: entry.operationType,
    lotId: entry.lotId,
    category: entry.category,
    status: entry.status,
    error: entry.error,
    details: entry.details
  }
}

/**
 * Returns paginated history entries.
 */
export function getHistoryEntries(limit = 100, offset = 0): HistoryEntry[] {
  const rows = getDatabase()
    .prepare(
      `SELECT * FROM history ORDER BY id DESC LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as HistoryRow[]

  return rows.map(mapRow)
}

/**
 * Clears all history entries.
 */
export function clearHistoryEntries(): void {
  getDatabase().prepare('DELETE FROM history').run()
}

function mapRow(row: HistoryRow): HistoryEntry {
  return {
    id: row.id,
    timestamp: row.timestamp,
    operationType: row.operation_type as OperationType,
    lotId: row.lot_id ?? undefined,
    category: row.category ?? undefined,
    status: row.status as OperationStatus,
    error: row.error ?? undefined,
    details: row.details ?? undefined
  }
}
