import type { FieldSchema, OfferForm, OfferFormField } from './types'

/** Fields copied as-is between any categories (title, description, price, etc.). */
export const UNIVERSAL_COPY_FIELDS = [
  'fields[summary][ru]',
  'fields[summary][en]',
  'fields[desc][ru]',
  'fields[desc][en]',
  // Сообщение после оплаты (что покупатель увидит после оплаты).
  'fields[payment_msg][ru]',
  'fields[payment_msg][en]',
  'fields[images]',
  'price',
  'amount',
  'active',
  'auto_delivery',
  'deactivate_after_sale',
  'deactivate_after_sale[]',
  'secrets'
] as const

const CONTENT_FIELD_MARKERS = ['[summary]', '[desc]', '[images]', '[payment_msg]']

function isCategorySelectField(name: string): boolean {
  return (
    name.startsWith('fields[') &&
    !CONTENT_FIELD_MARKERS.some((marker) => name.includes(marker))
  )
}

/** Whether a value is allowed for a select field. */
export function isValidSelectValue(field: OfferFormField | FieldSchema, value: string): boolean {
  if (!value) return false
  const options = field.options ?? []
  if (options.length === 0) return true
  return options.some((option) => option.value === value)
}

/** Finds the best matching option value for a hint string (label, title, etc.). */
export function findBestOptionMatch(
  options: Array<{ value: string; label: string }>,
  hint: string
): string | undefined {
  const normalized = hint.toLowerCase().trim()
  if (!normalized || options.length === 0) return undefined

  const exact = options.find((option) => option.label.toLowerCase() === normalized)
  if (exact?.value) return exact.value

  const partial = options.find(
    (option) =>
      option.label.toLowerCase().includes(normalized) ||
      normalized.includes(option.label.toLowerCase())
  )
  if (partial?.value) return partial.value

  const hintWords = normalized.split(/[\s,/|–—-]+/).filter((word) => word.length > 2)
  let best: { value: string; score: number } | undefined

  for (const option of options) {
    const label = option.label.toLowerCase()
    let score = 0
    for (const word of hintWords) {
      if (label.includes(word)) score++
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { value: option.value, score }
    }
  }

  return best?.value
}

function getSourceSelectLabel(sourceForm: OfferForm, fieldName: string, value: string): string {
  const field = sourceForm.fields[fieldName]
  const option = field?.options?.find((item) => item.value === value)
  return option?.label ?? value
}

/** Suggests a target category select value based on the source lot form. */
export function suggestSelectValue(sourceForm: OfferForm, targetField: FieldSchema): string | undefined {
  const targetOptions = targetField.options ?? []
  if (targetOptions.length === 0) return undefined

  const sameNameValue = sourceForm.rawFormData[targetField.name]
  if (sameNameValue && isValidSelectValue(targetField, sameNameValue)) {
    return sameNameValue
  }

  if (sameNameValue) {
    const label = getSourceSelectLabel(sourceForm, targetField.name, sameNameValue)
    const byLabel = findBestOptionMatch(targetOptions, label)
    if (byLabel) return byLabel
  }

  for (const sourceField of Object.values(sourceForm.fields)) {
    if (sourceField.type !== 'select' || !sourceField.value) continue
    if (!isCategorySelectField(sourceField.name)) continue

    const label = getSourceSelectLabel(sourceForm, sourceField.name, sourceField.value)
    const match = findBestOptionMatch(targetOptions, label)
    if (match) return match
  }

  const title = sourceForm.rawFormData['fields[summary][ru]'] ?? ''
  const titleMatch = findBestOptionMatch(targetOptions, title)
  if (titleMatch) return titleMatch

  if (targetField.currentValue && isValidSelectValue(targetField, targetField.currentValue)) {
    return targetField.currentValue
  }

  return undefined
}

/** Builds suggested values for all category selects in a target node. */
export function suggestCategoryFields(
  sourceForm: OfferForm,
  targetSchema: FieldSchema[]
): Record<string, string> {
  const result: Record<string, string> = {}

  for (const field of targetSchema) {
    const suggested = suggestSelectValue(sourceForm, field)
    if (suggested) {
      result[field.name] = suggested
    }
  }

  return result
}

/**
 * Merges source lot content into a target category form.
 * Category-specific selects are mapped only when compatible with the target.
 */
export function mergeFormData(
  sourceForm: OfferForm,
  targetForm: OfferForm,
  overrides?: Record<string, string>
): Record<string, string> {
  const source = sourceForm.rawFormData
  const result = { ...targetForm.rawFormData }

  for (const key of UNIVERSAL_COPY_FIELDS) {
    if (source[key]) {
      result[key] = source[key]
    }
  }

  if (source.active === 'on' || source.active === '1') {
    result.active = 'on'
  }

  for (const field of Object.values(targetForm.fields)) {
    if (field.type !== 'select' || !isCategorySelectField(field.name)) continue

    const schema: FieldSchema = {
      name: field.name,
      label: field.label ?? field.name,
      type: field.type,
      required: field.required ?? false,
      options: field.options ?? [],
      currentValue: field.value
    }

    const mapped = overrides?.[field.name] ?? suggestSelectValue(sourceForm, schema)
    if (mapped && isValidSelectValue(field, mapped)) {
      result[field.name] = mapped
    } else if (field.value && isValidSelectValue(field, field.value)) {
      result[field.name] = field.value
    } else {
      delete result[field.name]
    }
  }

  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      if (!value) continue
      const field = targetForm.fields[key]
      if (field?.type === 'select' && !isValidSelectValue(field, value)) continue
      result[key] = value
    }
  }

  return result
}

function pickRandomOption(field: FieldSchema): string | undefined {
  const options = (field.options ?? []).filter((option) => option.value !== '')
  if (options.length === 0) return undefined
  return options[Math.floor(Math.random() * options.length)]!.value
}

/** Fills empty or invalid select fields with random valid options. */
export function fillRandomCategoryFields(
  schema: FieldSchema[],
  current: Record<string, string>,
  onlyEmpty = true
): Record<string, string> {
  const result = { ...current }

  for (const field of schema) {
    const value = result[field.name] ?? ''
    const needsFill = onlyEmpty ? !value || !isValidSelectValue(field, value) : field.options.length > 0

    if (!needsFill) continue

    const random = pickRandomOption(field)
    if (random) {
      result[field.name] = random
    }
  }

  return result
}

/** Fills random values for all target categories at once. */
export function fillAllRandomCategoryFields(
  schemas: Record<string, FieldSchema[]>,
  current: Record<string, Record<string, string>>,
  onlyEmpty = true
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {}

  for (const [nodeId, fields] of Object.entries(schemas)) {
    result[nodeId] = fillRandomCategoryFields(fields, current[nodeId] ?? {}, onlyEmpty)
  }

  return result
}

/** Validates that all required category selects have valid values before save. */
export function validateCategoryFields(form: OfferForm, data: Record<string, string>): string[] {
  const missing: string[] = []

  for (const field of Object.values(form.fields)) {
    if (field.type !== 'select' || !isCategorySelectField(field.name)) continue

    const value = data[field.name] ?? ''
    if (!value || !isValidSelectValue(field, value)) {
      missing.push(field.label ?? field.name)
    }
  }

  return missing
}
