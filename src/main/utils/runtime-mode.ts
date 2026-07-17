import { app } from 'electron'

/** Development = unpackaged local run (hot reload). Packaged builds are production. */
export function isDevelopmentMode(): boolean {
  if (app.isPackaged) return false
  if (process.env.ELECTRON_RENDERER_URL) return true
  if (process.env.NODE_ENV === 'development') return true
  return true
}
