import { useState } from 'react'
import type { LotSummary } from '../../../shared/types'
import { Button } from '../ui/Button'

interface BulkActionsProps {
  selectedCount: number
  onBulkPrice: () => void
  onBulkTitle: () => void
  onBulkDescription: () => void
  onBulkStatus: () => void
  onBulkToTemplates: () => void
  onClearSelection: () => void
  bulkTemplatesLoading?: boolean
}

/** Bulk operation controls for selected lots. */
export function BulkActions({
  selectedCount,
  onBulkPrice,
  onBulkTitle,
  onBulkDescription,
  onBulkStatus,
  onBulkToTemplates,
  onClearSelection,
  bulkTemplatesLoading
}: BulkActionsProps) {
  if (selectedCount === 0) return null

  return (
    <div className="glass-card flex flex-wrap items-center gap-3 p-4 animate-slide-up">
      <span className="text-sm font-medium">Выбрано: {selectedCount}</span>
      <Button
        variant="ghost"
        onClick={onBulkToTemplates}
        className="text-xs"
        disabled={bulkTemplatesLoading}
      >
        {bulkTemplatesLoading ? 'Сохранение...' : 'В шаблоны'}
      </Button>
      <Button variant="ghost" onClick={onBulkPrice} className="text-xs">
        Изменить цену
      </Button>
      <Button variant="ghost" onClick={onBulkTitle} className="text-xs">
        Изменить название
      </Button>
      <Button variant="ghost" onClick={onBulkDescription} className="text-xs">
        Изменить описание
      </Button>
      <Button variant="ghost" onClick={onBulkStatus} className="text-xs">
        Изменить статус
      </Button>
      <Button variant="ghost" onClick={onClearSelection} className="text-xs">
        Снять выделение
      </Button>
    </div>
  )
}

interface LotFiltersProps {
  search: string
  onSearchChange: (v: string) => void
  categoryFilter: string
  onCategoryChange: (v: string) => void
  statusFilter: string
  onStatusChange: (v: string) => void
  sortBy: string
  onSortChange: (v: string) => void
  categories: string[]
  onSelectAll: () => void
  onSelectCount?: (count: number) => void
  totalCount: number
  selectedCount: number
}

/** Search, filter and sort controls for lots list. */
export function LotFilters({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  statusFilter,
  onStatusChange,
  sortBy,
  onSortChange,
  categories,
  onSelectAll,
  onSelectCount,
  totalCount,
  selectedCount
}: LotFiltersProps) {
  const [selectCount, setSelectCount] = useState(1)

  return (
    <div className="glass-card flex flex-wrap items-center gap-3 p-4">
      <input
        className="glass-input max-w-xs flex-1 py-2 text-sm"
        placeholder="Поиск по названию..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <select
        className="glass-input w-auto py-2 text-sm"
        value={categoryFilter}
        onChange={(e) => onCategoryChange(e.target.value)}
      >
        <option value="">Все категории</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        className="glass-input w-auto py-2 text-sm"
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
      >
        <option value="">Все статусы</option>
        <option value="active">Активные</option>
        <option value="inactive">Неактивные</option>
      </select>
      <select
        className="glass-input w-auto py-2 text-sm"
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
      >
        <option value="title">По названию</option>
        <option value="price-asc">Цена ↑</option>
        <option value="price-desc">Цена ↓</option>
        <option value="category">По категории</option>
      </select>
      <button onClick={onSelectAll} className="btn-ghost text-xs">
        {selectedCount === totalCount && totalCount > 0 ? 'Снять все' : 'Выбрать все'}
      </button>
      {onSelectCount && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={Math.max(1, totalCount)}
            value={selectCount}
            onChange={(e) => setSelectCount(Math.max(1, Number(e.target.value) || 1))}
            className="glass-input w-16 py-2 text-center text-sm"
          />
          <button
            onClick={() => onSelectCount(Math.min(selectCount, totalCount))}
            className="btn-ghost text-xs"
            disabled={totalCount === 0}
          >
            Выбрать N
          </button>
        </div>
      )}
    </div>
  )
}

/** Parses price string to number for sorting. */
export function parsePrice(price: string): number {
  const num = parseFloat(price.replace(/[^\d.,]/g, '').replace(',', '.'))
  return isNaN(num) ? 0 : num
}

/** Filters and sorts lots based on criteria. */
export function filterLots(
  lots: LotSummary[],
  search: string,
  category: string,
  status: string,
  sortBy: string
): LotSummary[] {
  let result = [...lots]

  if (search) {
    const q = search.toLowerCase()
    result = result.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q) ||
        l.id.includes(q)
    )
  }

  if (category) result = result.filter((l) => l.category === category)
  if (status) result = result.filter((l) => l.status === status)

  result.sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':
        return parsePrice(a.price) - parsePrice(b.price)
      case 'price-desc':
        return parsePrice(b.price) - parsePrice(a.price)
      case 'category':
        return a.category.localeCompare(b.category, 'ru')
      default:
        return a.title.localeCompare(b.title, 'ru')
    }
  })

  return result
}
