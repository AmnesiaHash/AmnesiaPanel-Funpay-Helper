import { getDatabase } from '../connection'
import type { AppSettings, ThemeMode } from '../../shared/types'

const DEFAULT_SETTINGS: AppSettings = { theme: 'dark' }

/**
 * Reads a setting value by key.
 */
export function getSetting<T>(key: string, fallback: T): T {
  const row = getDatabase()
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get(key) as { value: string } | undefined
  if (!row) return fallback
  try {
    return JSON.parse(row.value) as T
  } catch {
    return fallback
  }
}

/**
 * Persists a setting value.
 */
export function setSetting(key: string, value: unknown): void {
  getDatabase()
    .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    .run(key, JSON.stringify(value))
}

/**
 * Returns application settings.
 */
export function getAppSettings(): AppSettings {
  return getSetting<AppSettings>('app_settings', DEFAULT_SETTINGS)
}

/**
 * Updates theme preference.
 */
export function setTheme(theme: ThemeMode): void {
  const settings = getAppSettings()
  setSetting('app_settings', { ...settings, theme })
}
