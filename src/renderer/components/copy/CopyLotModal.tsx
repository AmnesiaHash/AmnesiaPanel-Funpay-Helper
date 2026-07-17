import { useEffect, useState } from 'react'

import type { CategoryNode, FieldSchema, LotSummary, OfferForm } from '../../../shared/types'

import { suggestCategoryFields, validateCategoryFields, fillAllRandomCategoryFields } from '../../../shared/field-mapper'

import { Modal } from '../ui/Modal'

import { Button } from '../ui/Button'

import { CategoryTree, getSelectedCategoryNames } from './CategoryTree'
import { findCategoryById } from '../../../shared/category-utils'

import { DynamicCategoryFields } from '../forms/DynamicCategoryFields'



interface CopyLotModalProps {

  lot: LotSummary | null

  open: boolean

  onClose: () => void

  onSuccess: () => void

}



/** Modal for copying a lot to multiple categories. */

export function CopyLotModal({ lot, open, onClose, onSuccess }: CopyLotModalProps) {

  const [categories, setCategories] = useState<CategoryNode[]>([])

  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [loading, setLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [step, setStep] = useState<'select' | 'fields' | 'preview'>('select')

  const [schemas, setSchemas] = useState<Record<string, FieldSchema[]>>({})

  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, string>>>({})

  const [sourceForm, setSourceForm] = useState<OfferForm | null>(null)



  useEffect(() => {

    if (open) {

      window.amnesia.getCategoryTree().then((result) => {

        if (result.success && result.data) setCategories(result.data)

      })

      setSelected(new Set())

      setStep('select')

      setError(null)

      setSchemas({})

      setFieldValues({})

      setSourceForm(null)

    }

  }, [open])



  const getCategoryLabel = (nodeId: string): string => {
    const node = findCategoryById(categories, nodeId)
    return node?.fullName ?? node?.name ?? nodeId
  }

  const selectedNames = getSelectedCategoryNames(categories, selected)



  const loadCategoryFields = async (): Promise<boolean> => {

    if (!lot) return false



    const sourceResult = await window.amnesia.getLotForm(lot.nodeId, lot.id)

    if (!sourceResult.success || !sourceResult.data) {

      setError(sourceResult.error ?? 'Не удалось загрузить исходный лот')

      return false

    }



    const source = sourceResult.data

    setSourceForm(source)



    const newSchemas: Record<string, FieldSchema[]> = {}

    const newValues: Record<string, Record<string, string>> = {}

    let needsFields = false



    for (const nodeId of selected) {

      const result = await window.amnesia.getNodeSchema(nodeId)

      if (!result.success || !result.data) continue



      const fields = result.data

      if (fields.length === 0) continue



      newSchemas[nodeId] = fields

      newValues[nodeId] = suggestCategoryFields(source, fields)

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



    if (needsFields) {

      setStep('fields')

    } else {

      setStep('preview')

    }

  }



  const handleToPreview = () => {

    if (!sourceForm) {

      setStep('preview')

      return

    }



    const missingByCategory: string[] = []



    for (const [nodeId, fields] of Object.entries(schemas)) {

      const values = fieldValues[nodeId] ?? {}

      const pseudoForm = {

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

        const categoryName = getCategoryLabel(nodeId)

        missingByCategory.push(`${categoryName}: ${missing.join(', ')}`)

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

    if (!lot) return



    setLoading(true)

    setError(null)



    const result = await window.amnesia.cloneLot({

      sourceLotId: lot.id,

      sourceNodeId: lot.nodeId,

      targetNodeIds: Array.from(selected),

      fieldOverrides: fieldValues

    })



    setLoading(false)



    if (result.success && result.data) {

      if (result.data.errors.length > 0) {

        setError(`Создано ${result.data.created} из ${selected.size}. Ошибки: ${result.data.errors.join('; ')}`)

      }

      if (result.data.created > 0) {

        onSuccess()

        onClose()

      }

    } else {

      setError(result.error ?? 'Ошибка копирования')

    }

  }



  if (!lot) return null



  return (

    <Modal open={open} onClose={onClose} title="Создать копию лота" wide>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

        <div>

          <h3 className="mb-3 text-sm font-medium text-[var(--text-secondary)]">Исходный лот</h3>

          <div className="glass-card p-4">

            {lot.imageUrl && (

              <img src={lot.imageUrl} alt="" className="mb-3 h-20 w-20 rounded-xl object-cover" />

            )}

            <p className="font-medium">{lot.title}</p>

            <p className="text-sm text-[var(--text-secondary)]">{lot.category}</p>

            <p className="mt-2 font-semibold text-accent-light">{lot.price}</p>

            <p className="mt-1 text-xs text-[var(--text-secondary)]">ID: {lot.id}</p>

          </div>

          <p className="mt-3 text-xs leading-relaxed text-[var(--text-secondary)]">

            Копируются название, описание, цена и изображения. Тип товара (аватарки, гайды и т.д.)

            подбирается автоматически только если совпадает с целевой категорией — иначе выберите

            вручную на следующем шаге.

          </p>

        </div>



        <div>

          {step === 'select' && (

            <>

              <h3 className="mb-3 text-sm font-medium text-[var(--text-secondary)]">

                Выберите категории

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



          {step === 'fields' && (
            <div className="max-h-64 overflow-auto">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-medium">Поля категории</h3>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Если авто-подбор не подошёл — заполните вручную или случайным образом.
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

              <div className="glass-card p-4">

                <p className="mb-2 text-sm text-[var(--text-secondary)]">Будет создано:</p>

                <ul className="mb-3 space-y-1">

                  {selectedNames.map((name) => (

                    <li key={name} className="text-sm">

                      • {name}

                    </li>

                  ))}

                </ul>

                <p className="font-semibold">Всего: {selected.size} новых лотов</p>

              </div>

            </div>

          )}

        </div>

      </div>



      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <p className="whitespace-pre-line">{error}</p>
          {step === 'fields' && error.includes('Выберите тип товара') && (
            <button
              type="button"
              className="mt-3 rounded-lg border border-red-400/30 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10"
              onClick={handleFillRandom}
            >
              Заполнить случайно и повторить
            </button>
          )}
        </div>
      )}



      <div className="mt-6 flex justify-end gap-3">

        {step !== 'select' && (

          <Button variant="ghost" onClick={() => setStep(step === 'preview' ? 'fields' : 'select')}>

            Назад

          </Button>

        )}

        {step === 'select' && (

          <Button onClick={handleNext} disabled={loading}>

            {loading ? 'Загрузка...' : 'Далее'}

          </Button>

        )}

        {step === 'fields' && (

          <Button onClick={handleToPreview}>К предпросмотру</Button>

        )}

        {step === 'preview' && (

          <Button onClick={handleConfirm} disabled={loading}>

            {loading ? 'Создание...' : 'Подтвердить'}

          </Button>

        )}

      </div>

    </Modal>

  )

}


