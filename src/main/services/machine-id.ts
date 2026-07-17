import { createHash, randomBytes } from 'crypto'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { hostname, platform, arch } from 'os'

/**
 * Local machine id helper without external deps.
 * Persists a random id in userData so HWID stays stable across runs.
 */
export function machineIdSync(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const filePath = join(dir, '.machine-id')
  if (existsSync(filePath)) {
    const existing = readFileSync(filePath, 'utf-8').trim()
    if (existing.length >= 16) return existing
  }

  const seed = [randomBytes(16).toString('hex'), hostname(), platform(), arch()].join(':')
  const id = createHash('sha256').update(seed).digest('hex')
  writeFileSync(filePath, id, 'utf-8')
  return id
}
