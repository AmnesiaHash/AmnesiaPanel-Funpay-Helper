/** License domain types shared between main and renderer. */

export type LicenseType =
  | 'Weekly'
  | 'Monthly'
  | 'Month3'
  | 'Month6'
  | 'Month12'
  | 'Lifetime'
  | 'Owner'
  | 'Developer'

export type LicenseStatus = 'active' | 'expired' | 'invalid' | 'revoked' | 'missing' | 'blocked'

export interface License {
  id?: string
  licenseKey: string
  licenseType: LicenseType
  status: LicenseStatus
  expiresAt: string | null
  createdAt: string
  activatedAt: string
  lastCheck: string
  hwid: string
  owner?: string
  userId?: string
  createdById?: string
}

export interface LicenseInfo {
  licensed: boolean
  isDevelopmentMode: boolean
  license: License | null
  message?: string
}

export interface ActivateLicenseResult {
  license: License
  message: string
}

export interface LicenseCheckResult {
  valid: boolean
  license: License | null
  message: string
}

export interface UpdateCheckResult {
  updateAvailable: boolean
  latestVersion?: string
  currentVersion: string
  downloadUrl?: string
  message: string
}

export interface LicenseLogEntry {
  timestamp: string
  action: string
  result: 'success' | 'error' | 'info'
  licenseType?: LicenseType
  error?: string
  details?: string
}
