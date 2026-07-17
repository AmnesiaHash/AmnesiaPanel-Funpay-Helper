import { useEffect, useMemo, useState } from 'react'
import type { CategoryNode, FieldSchema, OfferForm, TemplateRecord } from '../../../shared/types'
import {
  suggestCategoryFields,
  validateCategoryFields,
  fillAllRandomCategoryFields
} from '../../../shared/field-mapper'
import { findCategoryById } from '../../../shared/category-utils'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { CategoryTree, getSelectedCategoryNames } from '../copy/CategoryTree'
import { DynamicCategoryFields } from '../forms/DynamicCategoryFields'

export type ApplyTemplatesMode = 'pick' | 'own'

interface ApplyTemplatesModalProps {
  templates: TemplateRecord[]
  open: boolean
  mode: ApplyTemplatesMode
  onClose: () => void
  onSuccess: () => void
}

function templateToOfferForm(template: TemplateRecord): OfferForm {
  return {
    nodeId: template.nodeId ?? '',
    offerId: '0',
    fields: {},
    rawFormData: template.fields
  }
}

/** Modal for publishing selected templates to FunPay categories. */
export function ApplyTemplatesModal({
  templates,
  open,
  mode,
  onClose,
  onSuccess
}: ApplyTemplatesModalProps) {
  const [categories, setCategories] = useState<CategoryNode[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'select' | 'fields' | 'preview'>('select')
  const [schemas, setSchemas] = useState<Record<string, FieldSchema[]>>({})
  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, string>>>({})
  const [copiesPerTemplate, setCopiesPerTemplate] = useState(1)

  const useOwnCategories = mode === 'own'

  const templatesWithCategory = useMemo(
    () => templates.filter((t) => !!t.nodeId),
    [templates]
  )
  const templatesWithoutCategory = useMemo(
    () => templates.filter((t) => !t.nodeId),
    [templates]
  )

  const ownNodeIds = useMemo(() => {
    const ids = new Set<string>()
    for (const template of templatesWithCategory) {
      if (template.nodeId) ids.add(template.nodeId)
    }
    return ids
  }, [templatesWithCategory])

  const primaryTemplate = templatesWithCategory[0] ?? templates[0]
  const sourceForm = useMemo(
    () => (primaryTemplate ? templateToOfferForm(primaryTemplate) : null),
    [primaryTemplate]
  )

  useEffect(() => {
    if (!open) return

    window.amnesia.getCategoryTree().then((result) => {
      if (result.success && result.data) setCategories(result.data)
    })

    if (useOwnCategories) {
      setSelected(new Set(ownNodeIds))
      setStep(templatesWithCategory.length > 0 ? 'fields' : 'select')
    } else {
      const defaultSelected = new Set<string>()
      for (const template of templates) {
        if (template.nodeId) defaultSelected.add(template.nodeId)
      }
      setSelected(defaultSelected)
      setStep('select')
    }

    setError(
      useOwnCategories && templatesWithoutCategory.length > 0
        ? `Без категории (будут пропущены): ${templatesWithoutCategory.map((t) => t.name).join(', ')}`
        : null
    )
    setSchemas({})
    setFieldValues({})
    setCopiesPerTemplate(1)
  }, [open, templates, useOwnCategories, ownNodeIds, templatesWithCategory.length, templatesWithoutCategory])

  useEffect(() => {
    if (!open || !useOwnCategories || templatesWithCategory.length === 0) return

    let cancelled = false

    const loadOwnFields = async () => {
      setLoading(true)
      const newSchemas: Record<string, FieldSchema[]> = {}
      const newValues: Record<string, Record<string, string>> = {}

      for (const nodeId of ownNodeIds) {
        const templateForNode =
          templatesWithCategory.find((t) => t.nodeId === nodeId) ?? templatesWithCategory[0]
        const form = templateToOfferForm(templateForNode!)
        const result = await window.amnesia.getNodeSchema(nodeId)
        if (!result.success || !result.data || result.data.length === 0) continue
        newSchemas[nodeId] = result.data
        newValues[nodeId] = suggestCategoryFields(form, result.data)
      }

      if (cancelled) return
      setSchemas(newSchemas)
      setFieldValues(newValues)
      setStep(Object.keys(newSchemas).length > 0 ? 'fields' : 'preview')
      setLoading(false)
    }

    loadOwnFields()
    return () => {
      cancelled = true
    }
  }, [open, useOwnCategories, templatesWithCategory, ownNodeIds])

  const getCategoryLabel = (nodeId: string): string => {
    const node = findCategoryById(categories, nodeId)
    return node?.fullName ?? node?.name ?? nodeId
  }

  const selectedNames = getSelectedCategoryNames(categories, selected)

  const loadCategoryFields = async (): Promise<boolean> => {
    if (!sourceForm) return false

    const newSchemas: Record<string, FieldSchema[]> = {}
    const newValues: Record<string, Record<string, string>> = {}
    let needsFields = false

    for (const nodeId of selected) {
      const result = await window.amnesia.getNodeSchema(nodeId)
      if (!result.success || !result.data) continue

      const fields = result.data
      if (fields.length === 0) continue

      newSchemas[nodeId] = fields
      newValues[nodeId] = suggestCategoryFields(sourceForm, fields)
      needsFields = true
    }

    setSchemas(newSchemas)
    setFieldValues(newValues)
    return needsFields
  }

  const handleNext = async () => {
    if (selected.size === 0) {
      setError('Выберите хотя бы одну категорию')
      return
    }

    setLoading(true)
    setError(null)
    const needsFields = await loadCategoryFields()
    setLoading(false)
    setStep(needsFields ? 'fields' : 'preview')
  }

  const handleToPreview = () => {
    const missingByCategory: string[] = []

    for (const [nodeId, fields] of Object.entries(schemas)) {
      const values = fieldValues[nodeId] ?? {}
      const pseudoForm: OfferForm = {
        nodeId,
        offerId: '0',
        fields: Object.fromEntries(
          fields.map((field) => [
            field.name,
            {
              name: field.name,
              value: values[field.name] ?? field.currentValue ?? '',
              type: 'select' as const,
              label: field.label,
              required: field.required,
              options: field.options
            }
          ])
        ),
        rawFormData: values
      }

      const missing = validateCategoryFields(pseudoForm, values)
      if (missing.length > 0) {
        missingByCategory.push(`${getCategoryLabel(nodeId)}: ${missing.join(', ')}`)
      }
    }

    if (missingByCategory.length > 0) {
      setError(`Выберите тип товара для категории:\n${missingByCategory.join('\n')}`)
      return
    }

    setError(null)
    setStep('preview')
  }

  const handleFillRandom = () => {
    setFieldValues((prev) => fillAllRandomCategoryFields(schemas, prev, true))
    setError(null)
  }

  const handleConfirm = async () => {
    const publishTemplates = useOwnCategories ? templatesWithCategory : templates
    if (publishTemplates.length === 0) {
      setError('Нет шаблонов с сохранённой категорией')
      return
    }

    setLoading(true)
    setError(null)

    const result = await window.amnesia.applyTemplates({
      templateIds: publishTemplates.map((t) => t.id),
      targetNodeIds: useOwnCategories ? [] : Array.from(selected),
      fieldOverrides: fieldValues,
      copiesPerTemplate,
      useOwnCategories
    })

    setLoading(false)

    if (result.success && result.data) {
      const totalExpected = useOwnCategories
        ? publishTemplates.length * copiesPerTemplate
        : publishTemplates.length * selected.size * copiesPerTemplate
      if (result.data.errors.length > 0) {
        setError(
          `Создано ${result.data.created} из ${totalExpected}. Ошибки: ${result.data.errors.join('; ')}`
        )
      }
      if (result.data.created > 0) {
        onSuccess()
        onClose()
      }
    } else {
      setError(result.error ?? 'Ошибка выставления шаблонов')
    }
  }

  if (templates.length === 0) return null

  const publishCount = useOwnCategories ? templatesWithCategory.length : templates.length
  const totalLots = useOwnCategories
    ? publishCount * copiesPerTemplate
    : publishCount * selected.size * copiesPerTemplate

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={useOwnCategories ? 'Выставить в свои категории' : 'Выставить шаблоны на FunPay'}
      wide
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-medium text-[var(--text-secondary)]">
            Выбранные шаблоны ({templates.length})
          </h3>
          <div className="glass-card max-h-80 space-y-2 overflow-auto p-4">
            {templates.map((template) => (
              <div key={template.id} className="border-b border-[var(--glass-border)] pb-2 last:border-0">
                <p className="font-medium">{template.name}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {template.fields['fields[summary][ru]'] ?? '—'}
                  {template.fields.price ? ` · ${template.fields.price} ₽` : ''}
                </p>
                {useOwnCategories && (
                  <p className="mt-1 text-xs text-accent-light">
                    {template.nodeId
                      ? `Категория: ${getCategoryLabel(template.nodeId)}`
                      : 'Категория не сохранена — будет пропущен'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          {step === 'select' && !useOwnCategories && (
            <>
              <h3 className="mb-3 text-sm font-medium text-[var(--text-secondary)]">
                Категории на FunPay
              </h3>
              <div className="h-80">
                <CategoryTree
                  categories={categories}
                  selected={selected}
                  onSelectionChange={setSelected}
                />
              </div>
            </>
          )}

          {step === 'select' && useOwnCategories && (
            <div className="glass-card p-4 text-sm text-[var(--text-secondary)]">
              {loading
                ? 'Загрузка полей категорий...'
                : 'У выбранных шаблонов нет сохранённых категорий.'}
            </div>
          )}

          {step === 'fields' && (
            <div className="max-h-64 overflow-auto">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-medium">Поля категории</h3>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {useOwnCategories
                      ? 'Каждый шаблон уйдёт в свою категорию из экспорта.'
                      : 'Заполните тип товара для каждой категории.'}
                  </p>
                </div>
                <Button variant="ghost" onClick={handleFillRandom}>
                  Заполнить случайно
                </Button>
              </div>

              {Object.entries(schemas).map(([nodeId, fields]) => (
                <DynamicCategoryFields
                  key={nodeId}
                  nodeId={nodeId}
                  categoryName={getCategoryLabel(nodeId)}
                  schemas={fields}
                  values={fieldValues[nodeId] ?? {}}
                  onChange={(name, value) =>
                    setFieldValues((prev) => ({
                      ...prev,
                      [nodeId]: { ...prev[nodeId], [name]: value }
                    }))
                  }
                />
              ))}
            </div>
          )}

          {step === 'preview' && (
            <div>
              <h3 className="mb-3 text-sm font-medium">Предпросмотр</h3>
              <div className="glass-card space-y-3 p-4">
                {useOwnCategories ? (
                  <div>
                    <p className="mb-2 text-sm text-[var(--text-secondary)]">
                      Каждый шаблон → своя категория:
                    </p>
                    <ul className="max-h-40 space-y-1 overflow-auto">
                      {templatesWithCategory.map((template) => (
                        <li key={template.id} className="text-sm">
                          • {template.name} → {getCategoryLabel(template.nodeId!)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div>
                    <p className="mb-2 text-sm text-[var(--text-secondary)]">Категории:</p>
                    <ul className="space-y-1">
                      {selectedNames.map((name) => (
                        <li key={name} className="text-sm">
                          • {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <label className="text-sm text-[var(--text-secondary)]">
                    Копий каждого шаблона
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={copiesPerTemplate}
                    onChange={(e) =>
                      setCopiesPerTemplate(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="glass-input mt-2 w-24"
                  />
                </div>
                <p className="font-semibold">Всего будет создано: {totalLots} лотов</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <p className="whitespace-pre-line">{error}</p>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        {step !== 'select' && !(useOwnCategories && step === 'fields') && (
          <Button
            variant="ghost"
            onClick={() => {
              if (useOwnCategories) {
                setStep('fields')
              } else {
                setStep(step === 'preview' ? 'fields' : 'select')
              }
            }}
          >
            Назад
          </Button>
        )}
        {step === 'select' && !useOwnCategories && (
          <Button onClick={handleNext} disabled={loading}>
            {loading ? 'Загрузка...' : 'Далее'}
          </Button>
        )}
        {step === 'fields' && <Button onClick={handleToPreview}>К предпросмотру</Button>}
        {step === 'preview' && (
          <Button onClick={handleConfirm} disabled={loading || publishCount === 0}>
            {loading ? 'Создание...' : useOwnCategories ? 'Выставить в свои' : 'Выставить на FunPay'}
          </Button>
        )}
      </div>
    </Modal>
  )
}
