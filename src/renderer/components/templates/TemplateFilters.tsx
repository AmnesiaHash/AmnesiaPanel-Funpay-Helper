import { useState } from 'react'
import { Button } from '../ui/Button'

interface TemplateFiltersProps {
  search: string
  onSearchChange: (v: string) => void
  sortBy: string
  onSortChange: (v: string) => void
  onSelectAll: () => void
  onSelectCount: (count: number) => void
  totalCount: number
  selectedCount: number
}

/** Search, sort and selection controls for templates. */
export function TemplateFilters({
  search,
  onSearchChange,
  sortBy,
  onSortChange,
  onSelectAll,
  onSelectCount,
  totalCount,
  selectedCount
}: TemplateFiltersProps) {
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
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
      >
        <option value="name">По названию</option>
        <option value="date-desc">Новые первые</option>
        <option value="date-asc">Старые первые</option>
        <option value="price-asc">Цена ↑</option>
        <option value="price-desc">Цена ↓</option>
      </select>
      <button onClick={onSelectAll} className="btn-ghost text-xs">
        {selectedCount === totalCount && totalCount > 0 ? 'Снять все' : 'Выбрать все'}
      </button>
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
    </div>
  )
}

interface TemplateBulkActionsProps {
  selectedCount: number
  onPublish: () => void
  onPublishOwnCategories: () => void
  onExportBulk: () => void
  onDeleteBulk: () => void
  onClearSelection: () => void
}

/** Bulk actions for selected templates. */
export function TemplateBulkActions({
  selectedCount,
  onPublish,
  onPublishOwnCategories,
  onExportBulk,
  onDeleteBulk,
  onClearSelection
}: TemplateBulkActionsProps) {
  if (selectedCount === 0) return null

  return (
    <div className="glass-card flex flex-wrap items-center gap-3 p-4 animate-slide-up">
      <span className="text-sm font-medium">Выбрано: {selectedCount}</span>
      <Button variant="ghost" onClick={onPublish} className="text-xs">
        Выставить на FunPay
      </Button>
      <Button variant="ghost" onClick={onPublishOwnCategories} className="text-xs">
        В свои категории
      </Button>
      <Button variant="ghost" onClick={onExportBulk} className="text-xs">
        Экспорт в JSON
      </Button>
      <Button variant="ghost" onClick={onDeleteBulk} className="text-xs">
        Удалить
      </Button>
      <Button variant="ghost" onClick={onClearSelection} className="text-xs">
        Снять выделение
      </Button>
    </div>
  )
}
