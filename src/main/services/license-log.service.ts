import { app } from 'electron'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { LicenseLogEntry, LicenseType } from '../../shared/types'

/**
 * Append-only license audit log stored in userData.
 */
export class LicenseLogService {
  private getFilePath(): string {
    const dir = join(app.getPath('userData'), 'license')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    return join(dir, 'license.log.jsonl')
  }

  /**
   * Writes a structured log entry.
   */
  write(entry: Omit<LicenseLogEntry, 'timestamp'> & { timestamp?: string }): void {
    const full: LicenseLogEntry = {
      timestamp: entry.timestamp ?? new Date().toISOString(),
      action: entry.action,
      result: entry.result,
      licenseType: entry.licenseType,
      error: entry.error,
      details: entry.details
    }

    appendFileSync(this.getFilePath(), `${JSON.stringify(full)}\n`, 'utf-8')
  }

  /**
   * Reads recent log entries (newest last).
   */
  read(limit = 100): LicenseLogEntry[] {
    const path = this.getFilePath()
    if (!existsSync(path)) return []

    const lines = readFileSync(path, 'utf-8')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const entries: LicenseLogEntry[] = []
    for (const line of lines.slice(-limit)) {
      try {
        entries.push(JSON.parse(line) as LicenseLogEntry)
      } catch {
        // skip malformed lines
      }
    }
    return entries
  }

  /**
   * Clears the license log file.
   */
  clear(): void {
    writeFileSync(this.getFilePath(), '', 'utf-8')
  }
}

export const licenseLogService = new LicenseLogService()

/** Convenience helper for typed license logging. */
export function logLicenseEvent(
  action: string,
  result: LicenseLogEntry['result'],
  options?: { licenseType?: LicenseType; error?: string; details?: string }
): void {
  licenseLogService.write({
    action,
    result,
    licenseType: options?.licenseType,
    error: options?.error,
    details: options?.details
  })
}
