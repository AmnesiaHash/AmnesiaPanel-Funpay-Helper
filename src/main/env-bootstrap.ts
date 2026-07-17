import { app } from 'electron'
import { config } from 'dotenv'
import { existsSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

/** Loads optional `.env` (FunPay base URL overrides). */
export function loadAppEnv(): void {
  if (app.isPackaged) {
    const nearExe = join(dirname(process.execPath), '.env')
    if (existsSync(nearExe)) config({ path: nearExe })
    config()
    return
  }

  const here = dirname(fileURLToPath(import.meta.url))
  config({ path: resolve(here, '../../../.env') })
  config({ path: resolve(process.cwd(), '.env') })
  config()
}
