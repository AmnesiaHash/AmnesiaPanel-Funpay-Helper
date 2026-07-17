import { getDatabase } from '../connection'
import type { CategoryNode } from '../../../shared/types'
import { isHierarchicalCategoryTree } from '../../../shared/category-utils'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

/**
 * Returns cached category tree if still valid.
 */
export function getCachedCategories(): CategoryNode[] | null {
  const row = getDatabase()
    .prepare('SELECT data_json, cached_at FROM category_cache WHERE id = 1')
    .get() as { data_json: string; cached_at: string } | undefined

  if (!row) return null

  const cachedAt = new Date(row.cached_at).getTime()
  if (Date.now() - cachedAt > CACHE_TTL_MS) return null

  const data = JSON.parse(row.data_json) as CategoryNode[]
  if (!isHierarchicalCategoryTree(data)) return null

  return data
}

/**
 * Stores category tree in cache.
 */
export function setCachedCategories(categories: CategoryNode[]): void {
  getDatabase()
    .prepare(
      `INSERT OR REPLACE INTO category_cache (id, data_json, cached_at) VALUES (1, ?, ?)`
    )
    .run(JSON.stringify(categories), new Date().toISOString())
}

/**
 * Clears category cache.
 */
export function clearCategoryCache(): void {
  getDatabase().prepare('DELETE FROM category_cache').run()
}
