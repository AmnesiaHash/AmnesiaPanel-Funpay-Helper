import type { FieldSchema } from '../../../shared/types'

interface DynamicCategoryFieldsProps {
  schemas: FieldSchema[]
  values: Record<string, string>
  onChange: (name: string, value: string) => void
  nodeId: string
  categoryName?: string
}

/** Dynamic form for category-specific select fields. */
export function DynamicCategoryFields({
  schemas,
  values,
  onChange,
  nodeId,
  categoryName
}: DynamicCategoryFieldsProps) {
  if (schemas.length === 0) return null

  return (
    <div className="mt-4 rounded-xl border border-[var(--glass-border)] p-4">
      <h4 className="mb-3 text-sm font-medium">
        {categoryName ?? `Категория #${nodeId}`}
      </h4>
      <div className="space-y-3">
        {schemas.map((field) => (
          <div key={field.name}>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">
              {field.label}
              {field.required && ' *'}
            </label>
            {field.options.length > 0 ? (
              <select
                className="glass-input py-2 text-sm"
                value={values[field.name] ?? ''}
                onChange={(e) => onChange(field.name, e.target.value)}
              >
                <option value="">Выберите...</option>
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="glass-input py-2 text-sm"
                value={values[field.name] ?? ''}
                onChange={(e) => onChange(field.name, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
