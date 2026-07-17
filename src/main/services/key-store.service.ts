import { safeStorage } from 'electron'
import { getDatabase } from '../database/connection'

/**
 * Securely stores the Golden Key using OS-level encryption.
 */
export function saveGoldenKey(key: string): void {
  const db = getDatabase()
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(key)
    db.prepare(
      'INSERT OR REPLACE INTO encrypted_keys (id, encrypted_key, is_encrypted) VALUES (1, ?, 1)'
    ).run(encrypted)
  } else {
    db.prepare(
      'INSERT OR REPLACE INTO encrypted_keys (id, encrypted_key, is_encrypted) VALUES (1, ?, 0)'
    ).run(Buffer.from(key, 'utf-8'))
  }
}

/**
 * Retrieves the stored Golden Key.
 */
export function loadGoldenKey(): string | null {
  const row = getDatabase()
    .prepare('SELECT encrypted_key, is_encrypted FROM encrypted_keys WHERE id = 1')
    .get() as { encrypted_key: Buffer | null; is_encrypted: number } | undefined

  if (!row?.encrypted_key) return null

  const keyData = Buffer.isBuffer(row.encrypted_key)
    ? row.encrypted_key
    : Buffer.from(row.encrypted_key as Uint8Array)

  if (row.is_encrypted && safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(keyData)
  }

  return keyData.toString('utf-8')
}

/**
 * Removes the stored Golden Key.
 */
export function clearGoldenKey(): void {
  getDatabase().prepare('DELETE FROM encrypted_keys WHERE id = 1').run()
}

/**
 * Checks whether a Golden Key is stored.
 */
export function hasGoldenKey(): boolean {
  const row = getDatabase()
    .prepare('SELECT 1 FROM encrypted_keys WHERE id = 1 AND encrypted_key IS NOT NULL')
    .get()
  return !!row
}
