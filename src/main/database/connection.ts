import { DatabaseSync } from 'node:sqlite'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

let db: DatabaseSync | null = null

const MIGRATIONS = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  source_lot_id TEXT,
  node_id TEXT,
  fields_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  lot_id TEXT,
  category TEXT,
  status TEXT NOT NULL,
  error TEXT,
  details TEXT
);

CREATE TABLE IF NOT EXISTS category_cache (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data_json TEXT NOT NULL,
  cached_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS encrypted_keys (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  encrypted_key BLOB,
  is_encrypted INTEGER NOT NULL DEFAULT 0
);
`

/**
 * Opens or returns the singleton SQLite database connection.
 */
export function getDatabase(): DatabaseSync {
  if (db) return db

  const userDataPath = app.getPath('userData')
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true })
  }

  const dbPath = join(userDataPath, 'amnesia-panel.db')
  db = new DatabaseSync(dbPath)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec(MIGRATIONS)
  return db
}

/**
 * Closes the database connection.
 */
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

/**
 * Wipes all local data tables.
 */
export function clearAllData(): void {
  const database = getDatabase()
  database.exec(`
    DELETE FROM settings;
    DELETE FROM templates;
    DELETE FROM history;
    DELETE FROM category_cache;
    DELETE FROM encrypted_keys;
  `)
}
