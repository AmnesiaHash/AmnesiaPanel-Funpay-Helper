import type { CategoryNode } from './types'

/** Returns all selectable subcategory nodes (leaf nodes used for lot creation). */
export function flattenSubcategories(categories: CategoryNode[]): CategoryNode[] {
  const result: CategoryNode[] = []

  for (const node of categories) {
    if (node.children?.length) {
      result.push(...node.children)
    } else if (node.type !== 'game') {
      result.push(node)
    }
  }

  return result
}

/** Finds a subcategory or game node by lot node id. */
export function findCategoryById(
  categories: CategoryNode[],
  id: string
): CategoryNode | undefined {
  for (const game of categories) {
    if (game.id === id) return game
    const child = game.children?.find((item) => item.id === id)
    if (child) return child
  }
  return undefined
}

/** Returns display names for selected subcategory ids. */
export function getSelectedCategoryNames(
  categories: CategoryNode[],
  selected: Set<string>
): string[] {
  return flattenSubcategories(categories)
    .filter((item) => selected.has(item.id))
    .map((item) => item.fullName ?? item.name)
}

/** Whether cached tree has hierarchical game → subcategory shape. */
export function isHierarchicalCategoryTree(categories: CategoryNode[]): boolean {
  return categories.some((item) => item.type === 'game' && (item.children?.length ?? 0) > 0)
}
