import { app } from 'electron'
import type { UpdateCheckResult } from '../../shared/types'

/**
 * Application update checker.
 * Stub ready for remote release endpoints later.
 */
export class UpdateService {
  /**
   * Checks whether a newer version is available.
   */
  async checkForUpdates(): Promise<UpdateCheckResult> {
    const currentVersion = app.getVersion()

    // Future: GET {UPDATE_API_URL}/updates/latest
    return {
      updateAvailable: false,
      currentVersion,
      latestVersion: currentVersion,
      message: 'Проверка обновлений пока недоступна (заглушка)'
    }
  }
}

export const updateService = new UpdateService()
