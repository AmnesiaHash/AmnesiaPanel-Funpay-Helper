import type { LotSummary } from '../../../shared/types'

interface LotCardProps {
  lot: LotSummary
  selected: boolean
  onSelect: (id: string) => void
  onCopy: (lot: LotSummary) => void
  onSaveTemplate: (lot: LotSummary) => void
}

const statusLabels = {
  active: { label: 'Активен', color: 'text-green-400 bg-green-400/10' },
  inactive: { label: 'Неактивен', color: 'text-yellow-400 bg-yellow-400/10' },
  unknown: { label: 'Неизвестно', color: 'text-gray-400 bg-gray-400/10' }
}

/** Card displaying a single lot. */
export function LotCard({ lot, selected, onSelect, onCopy, onSaveTemplate }: LotCardProps) {
  const status = statusLabels[lot.status]

  return (
    <div
      className={`glass-card flex flex-col gap-3 p-4 transition-all duration-200 hover:shadow-glass-lg ${
        selected ? 'ring-2 ring-accent' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(lot.id)}
          className="mt-1 h-4 w-4 rounded accent-accent"
        />
        {lot.imageUrl ? (
          <img
            src={lot.imageUrl}
            alt=""
            className="h-14 w-14 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/20 text-2xl">
            📦
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium">{lot.title}</h3>
          <p className="text-sm text-[var(--text-secondary)]">{lot.category}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-accent-light">{lot.price}</span>
        <span className={`rounded-lg px-2 py-0.5 text-xs ${status.color}`}>{status.label}</span>
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>ID: {lot.id}</span>
        <span title="Дата изменения недоступна через API">
          {lot.lastModified ?? '—'}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onCopy(lot)}
          className="btn-ghost flex-1 py-1.5 text-xs"
        >
          Создать копию
        </button>
        <button
          onClick={() => onSaveTemplate(lot)}
          className="btn-ghost flex-1 py-1.5 text-xs"
        >
          В шаблон
        </button>
      </div>
    </div>
  )
}
