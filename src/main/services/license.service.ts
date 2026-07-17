import type {
  ActivateLicenseResult,
  License,
  LicenseCheckResult,
  LicenseInfo,
  LicenseLogEntry
} from '../../shared/types'
import { hardwareService } from './hardware.service'
import { licenseLogService } from './license-log.service'
import { licenseStorage } from '../storage/license.storage'

/**
 * Free open-source build: no paid subscription / remote license API.
 * Kept as a thin stub so existing IPC/preload keep working.
 */
export class LicenseService {
  async activateLicense(_licenseKey: string): Promise<ActivateLicenseResult> {
    const license = this.createFreeLicense()
    return { license, message: 'Подписка не требуется — приложение бесплатное' }
  }

  async validateLicense(): Promise<LicenseCheckResult> {
    const license = this.createFreeLicense()
    return {
      valid: true,
      license,
      message: 'Бесплатная open-source версия'
    }
  }

  async checkSubscription(): Promise<LicenseCheckResult> {
    return this.validateLicense()
  }

  async refreshLicense(): Promise<LicenseCheckResult> {
    return this.validateLicense()
  }

  saveLicense(license: License): void {
    licenseStorage.save(license)
  }

  loadLicense(): License | null {
    return licenseStorage.load()
  }

  async removeLicense(): Promise<void> {
    licenseStorage.remove()
  }

  async getLicenseInfo(): Promise<LicenseInfo> {
    const license = this.createFreeLicense()
    return {
      licensed: true,
      isDevelopmentMode: false,
      license,
      message: 'Бесплатная open-source версия'
    }
  }

  getLogs(limit = 100): LicenseLogEntry[] {
    return licenseLogService.read(limit)
  }

  private createFreeLicense(): License {
    const now = new Date().toISOString()
    return {
      licenseKey: 'FREE-OPEN-SOURCE',
      licenseType: 'Lifetime',
      status: 'active',
      expiresAt: null,
      createdAt: now,
      activatedAt: now,
      lastCheck: now,
      hwid: hardwareService.getHwid(),
      owner: 'community'
    }
  }
}

export const licenseService = new LicenseService()
