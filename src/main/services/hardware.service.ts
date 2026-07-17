import { createHash } from 'crypto'
import { networkInterfaces, platform, arch, cpus, hostname } from 'os'
import { machineIdSync } from './machine-id'

/**
 * Provides a stable hardware fingerprint for license binding.
 */
export class HardwareService {
  private cachedHwid: string | null = null

  /**
   * Returns a stable HWID for the current machine.
   */
  getHwid(): string {
    if (this.cachedHwid) return this.cachedHwid

    const machineId = machineIdSync()
    const cpuModel = cpus()[0]?.model ?? 'unknown-cpu'
    const host = hostname()
    const mac = this.getPrimaryMac()
    const raw = [machineId, platform(), arch(), cpuModel, host, mac].join('|')

    this.cachedHwid = createHash('sha256').update(raw).digest('hex')
    return this.cachedHwid
  }

  private getPrimaryMac(): string {
    const nets = networkInterfaces()
    for (const entries of Object.values(nets)) {
      if (!entries) continue
      for (const entry of entries) {
        if (!entry.internal && entry.mac && entry.mac !== '00:00:00:00:00:00') {
          return entry.mac
        }
      }
    }
    return 'no-mac'
  }
}

export const hardwareService = new HardwareService()
