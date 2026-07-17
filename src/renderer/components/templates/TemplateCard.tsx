import type { TemplateRecord } from '../../../shared/types'

interface TemplateCardProps {
  template: TemplateRecord
  selected: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onExport: (id: string) => void
}

function getTemplatePrice(fields: Record<string, string>): string {
  const price = fields.price?.trim()
  return price ? `${price} ₽` : '—'
}

function getTemplateTitle(fields: Record<string, string>, fallback: string): string {
  return fields['fields[summary][ru]']?.trim() || fallback
}

/** Card displaying a saved lot template. */
export function TemplateCard({
  template,
  selected,
  onSelect,
  onDelete,
  onExport
}: TemplateCardProps) {
  const title = getTemplateTitle(template.fields, template.name)
  const price = getTemplatePrice(template.fields)

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
          onChange={() => onSelect(template.id)}
          className="mt-1 h-4 w-4 rounded accent-accent"
        />
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/20 text-2xl">
          📋
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium">{template.name}</h3>
          <p className="truncate text-sm text-[var(--text-secondary)]">{title}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-accent-light">{price}</span>
        {template.nodeId && (
          <span className="text-xs text-[var(--text-secondary)]">Категория: {template.nodeId}</span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>{new Date(template.createdAt).toLocaleDateString('ru-RU')}</span>
        {template.sourceLotId && <span>Лот #{template.sourceLotId}</span>}
      </div>

      <div className="flex gap-2">
        <button onClick={() => onExport(template.id)} className="btn-ghost flex-1 py-1.5 text-xs">
          Экспорт
        </button>
        <button onClick={() => onDelete(template.id)} className="btn-ghost flex-1 py-1.5 text-xs">
          Удалить
        </button>
      </div>
    </div>
  )
}

/** Filters and sorts templates list. */
export function filterTemplates(
  templates: TemplateRecord[],
  search: string,
  sortBy: string
): TemplateRecord[] {
  let result = [...templates]

  if (search) {
    const q = search.toLowerCase()
    result = result.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.fields['fields[summary][ru]'] ?? '').toLowerCase().includes(q) ||
        (t.nodeId ?? '').includes(q) ||
        (t.sourceLotId ?? '').includes(q)
    )
  }

  result.sort((a, b) => {
    switch (sortBy) {
      case 'date-asc':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case 'date-desc':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'price-asc':
        return parseFloat(a.fields.price ?? '0') - parseFloat(b.fields.price ?? '0')
      case 'price-desc':
        return parseFloat(b.fields.price ?? '0') - parseFloat(a.fields.price ?? '0')
      default:
        return a.name.localeCompare(b.name, 'ru')
    }
  })

  return result
}
