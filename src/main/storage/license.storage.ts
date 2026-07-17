import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import type { License } from '../../shared/types'
import { decryptLocalSecret, encryptLocalSecret } from '../security/license-crypto'

interface StoredLicenseFile {
  version: 1
  encrypted: boolean
  payload: string
}

/**
 * Persists license data under Electron userData (never next to the exe).
 */
export class LicenseStorage {
  private getFilePath(): string {
    const dir = join(app.getPath('userData'), 'license')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    return join(dir, 'license.dat')
  }

  /**
   * Saves license locally with OS-level encryption when available.
   */
  save(license: License): void {
    const { payload, encrypted } = encryptLocalSecret(JSON.stringify(license))
    const file: StoredLicenseFile = { version: 1, encrypted, payload }
    writeFileSync(this.getFilePath(), JSON.stringify(file), 'utf-8')
  }

  /**
   * Loads the stored license or returns null.
   */
  load(): License | null {
    const path = this.getFilePath()
    if (!existsSync(path)) return null

    try {
      const raw = JSON.parse(readFileSync(path, 'utf-8')) as StoredLicenseFile
      if (!raw?.payload) return null
      const json = decryptLocalSecret(raw.payload, !!raw.encrypted)
      return JSON.parse(json) as License
    } catch {
      return null
    }
  }

  /**
   * Removes the stored license file.
   */
  remove(): void {
    const path = this.getFilePath()
    if (existsSync(path)) unlinkSync(path)
  }
}

export const licenseStorage = new LicenseStorage()
