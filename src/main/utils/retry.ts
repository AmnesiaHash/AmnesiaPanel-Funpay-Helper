/**
 * Retries an async operation with exponential backoff.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 500
): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < maxAttempts) {
        await delay(baseDelayMs * attempt)
      }
    }
  }
  throw lastError
}

/** Resolves after the given number of milliseconds. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Formats milliseconds into a human-readable ETA string. */
export function formatEta(ms: number): string {
  if (ms <= 0 || !Number.isFinite(ms)) return '—'
  const seconds = Math.ceil(ms / 1000)
  if (seconds < 60) return `${seconds} сек.`
  const minutes = Math.floor(seconds / 60)
  const rem = seconds % 60
  return `${minutes} мин. ${rem} сек.`
}
