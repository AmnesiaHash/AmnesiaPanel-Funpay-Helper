import { safeStorage } from 'electron'

/**
 * Encrypts a UTF-8 string for local license storage.
 * Falls back to base64 when OS encryption is unavailable.
 */
export function encryptLocalSecret(plain: string): { payload: string; encrypted: boolean } {
  if (safeStorage.isEncryptionAvailable()) {
    return {
      payload: safeStorage.encryptString(plain).toString('base64'),
      encrypted: true
    }
  }

  return {
    payload: Buffer.from(plain, 'utf-8').toString('base64'),
    encrypted: false
  }
}

/**
 * Decrypts a payload produced by encryptLocalSecret.
 */
export function decryptLocalSecret(payload: string, encrypted: boolean): string {
  const buffer = Buffer.from(payload, 'base64')

  if (encrypted && safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(buffer)
  }

  return buffer.toString('utf-8')
}
