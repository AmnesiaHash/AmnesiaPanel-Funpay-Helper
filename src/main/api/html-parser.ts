import * as cheerio from 'cheerio'
import type {
  AccountInfo,
  CategoryNode,
  FieldSchema,
  LotStatus,
  LotSummary,
  OfferForm,
  OfferFormField
} from '../../shared/types'
import { AccessDeniedError, AuthError, ParseError } from '../utils/errors'

interface AppData {
  userId?: number
  userName?: string
  username?: string
  user_name?: string
  userBalance?: number
  locale?: string
  'csrf-token'?: string
}

/**
 * Parses account info from FunPay homepage HTML.
 */
export function parseAccountInfo(html: string): AccountInfo {
  const $ = cheerio.load(html)
  const rawAttr = $('body').attr('data-app-data')

  if (!rawAttr) {
    throw new AuthError('Не удалось получить данные аккаунта. Проверьте Golden Key.')
  }

  const raw = decodeHtmlEntities(rawAttr)

  let data: AppData
  try {
    data = JSON.parse(raw) as AppData
  } catch {
    throw new ParseError('Некорректный формат data-app-data')
  }

  if (!data.userId) {
    throw new AuthError('Golden Key недействителен или сессия не авторизована')
  }

  const username =
    parseUsernameFromHtml($) ??
    data.userName ??
    data.username ??
    data.user_name ??
    `User #${data.userId}`

  const balance = parseBalanceFromHtml($) ?? data.userBalance
  const avatarUrl = parseAvatarFromHtml($)

  return {
    userId: data.userId,
    username,
    balance,
    locale: data.locale,
    csrfToken: data['csrf-token'] ?? '',
    avatarUrl
  }
}

function parseUsernameFromHtml($: cheerio.CheerioAPI): string | undefined {
  const fromMr4 = $('.user-link-name .mr4').first().text().trim()
  if (fromMr4) return fromMr4

  const fromUserLink = $('.user-link-name').first().text().trim()
  if (fromUserLink) return fromUserLink

  const fromMenu = $('.user-menu-link, .account-link').first().text().trim()
  return fromMenu || undefined
}

function parseAvatarFromHtml($: cheerio.CheerioAPI): string | undefined {
  const imgSrc =
    $('img.avatar-photo').first().attr('src') ??
    $('.user-link-photo img').first().attr('src') ??
    $('.avatar img').first().attr('src') ??
    $('a.user-link img').first().attr('src')

  if (imgSrc) return normalizeFunPayUrl(imgSrc)

  const styleSelectors = ['.avatar-photo', '.user-link-photo', '[class*="avatar-photo"]']
  for (const selector of styleSelectors) {
    const style = $(selector).first().attr('style') ?? ''
    const match = style.match(/url\(['"]?([^'")]+)['"]?\)/i)
    if (match?.[1]) return normalizeFunPayUrl(match[1])
  }

  return undefined
}

function normalizeFunPayUrl(url: string): string {
  const trimmed = url.trim()
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  if (trimmed.startsWith('/')) return `https://funpay.com${trimmed}`
  return trimmed
}

/** Parses avatar URL from any FunPay page HTML. */
export function parseAvatarFromPage(html: string): string | undefined {
  const $ = cheerio.load(html)
  return parseAvatarFromHtml($)
}

function parseBalanceFromHtml($: cheerio.CheerioAPI): number | undefined {
  const badge = $('.badge-balance, .badge.badge-balance').first().text().trim()
  if (!badge) return undefined

  const normalized = badge.replace(/\s/g, '').replace(',', '.')
  const value = Number.parseFloat(normalized)
  return Number.isFinite(value) ? value : undefined
}

/**
 * Parses user's own lots from profile page HTML.
 */
export function parseUserLots(html: string, userId: number): LotSummary[] {
  const $ = cheerio.load(html)
  const lots: LotSummary[] = []
  const seen = new Set<string>()

  $('.offer-list-title-container').each((_, containerEl) => {
    const container = $(containerEl)
    const categoryLink = container.find('h3 a').first()
    const category = categoryLink.text().trim()
    const nodeId = extractNodeIdFromCategoryHref(categoryLink.attr('href') ?? '')
    const parent = container.parent()

    parent.find('a.tc-item').each((_, itemEl) => {
      appendLotFromItem($(itemEl), nodeId, category, lots, seen)
    })
  })

  if (lots.length === 0) {
    $('.mb20 .offer').each((_, groupEl) => {
      const group = $(groupEl)
      const categoryLink = group.find('.offer-list-title h3 a').first()
      const category = categoryLink.text().trim()
      const nodeId = extractNodeIdFromCategoryHref(categoryLink.attr('href') ?? '')

      group.find('a.tc-item, .tc-item').each((_, itemEl) => {
        appendLotFromItem($(itemEl), nodeId, category, lots, seen)
      })
    })
  }

  if (lots.length === 0) {
    $('a.tc-item').each((_, itemEl) => {
      appendLotFromItem($(itemEl), extractNodeFromHref($(itemEl).attr('href') ?? '') ?? '', 'Неизвестно', lots, seen)
    })
  }

  void userId
  return lots
}

/**
 * Parses hierarchical category tree (games → subcategories) from FunPay homepage.
 */
export function parseCategoryTree(html: string): CategoryNode[] {
  const $ = cheerio.load(html)
  const games: CategoryNode[] = []

  const gameLists = $('.promo-game-list')
  const gameList = gameLists.length > 1 ? gameLists.eq(1) : gameLists.first()

  gameList.find('.promo-game-item').each((_, gameEl) => {
    const game = $(gameEl)
    const titleEl = game.find('.game-title').first()
    const gameId = titleEl.attr('data-id')?.trim() ?? ''
    const gameName = game.find('a').first().text().trim() || titleEl.text().trim()

    if (!gameId || !gameName) return

    const children: CategoryNode[] = []

    game.find('li').each((_, liEl) => {
      const link = $(liEl).find('a').first()
      const href = link.attr('href') ?? ''
      const name = link.text().trim()
      if (!name) return

      const lotsMatch = href.match(/\/lots\/(\d+)/)
      const chipsMatch = href.match(/\/chips\/(\d+)/)
      const subId = lotsMatch?.[1] ?? chipsMatch?.[1]
      if (!subId) return

      children.push({
        id: subId,
        name,
        fullName: `${gameName} → ${name}`,
        parentId: gameId,
        type: chipsMatch ? 'subcategory' : 'subcategory'
      })
    })

    if (children.length === 0) return

    games.push({
      id: gameId,
      name: gameName,
      fullName: gameName,
      type: 'game',
      children: children.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    })
  })

  if (games.length > 0) {
    return games.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  }

  return parseCategoryTreeFallback($)
}

function parseCategoryTreeFallback($: cheerio.CheerioAPI): CategoryNode[] {
  const subcategories: CategoryNode[] = []
  const seen = new Set<string>()

  $('a[href*="/lots/"], a[href*="/chips/"]').each((_, el) => {
    const link = $(el)
    const href = link.attr('href') ?? ''
    const lotsMatch = href.match(/\/lots\/(\d+)/)
    const chipsMatch = href.match(/\/chips\/(\d+)/)
    const id = lotsMatch?.[1] ?? chipsMatch?.[1]
    if (!id || seen.has(id)) return
    seen.add(id)

    const name = link.text().trim()
    if (!name) return

    subcategories.push({
      id,
      name,
      fullName: name,
      type: 'subcategory'
    })
  })

  if (subcategories.length === 0) return []

  return [
    {
      id: 'all',
      name: 'Все категории',
      type: 'game',
      children: subcategories.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    }
  ]
}

/**
 * Parses offer edit form from HTML.
 */
export function parseOfferForm(html: string, nodeId: string, offerId = '0'): OfferForm {
  if (/access denied|доступ запрещён|недоступн/i.test(html)) {
    throw new AccessDeniedError('FunPay ограничил доступ к этой категории')
  }

  const $ = cheerio.load(html)
  const form = $('.form-offer-editor')
  if (!form.length) {
    throw new ParseError('Форма редактирования лота не найдена')
  }

  const fields: Record<string, OfferFormField> = {}
  const rawFormData: Record<string, string> = {}

  form.find('input, textarea, select').each((_, el) => {
    const input = $(el)
    const name = input.attr('name')
    if (!name) return

    const tag = el.tagName.toLowerCase()
    let value = ''
    let type: OfferFormField['type'] = 'text'

    if (tag === 'select') {
      type = 'select'
      value = input.find('option:selected').attr('value') ?? ''
      const options = input
        .find('option')
        .map((_, opt) => ({
          value: $(opt).attr('value') ?? '',
          label: $(opt).text().trim()
        }))
        .get()
        .filter((o) => o.value !== '')

      fields[name] = {
        name,
        value,
        type,
        label: findLabel($, input),
        required: input.attr('required') !== undefined,
        options
      }
    } else if (input.attr('type') === 'checkbox') {
      type = 'checkbox'
      value = input.is(':checked') ? (input.attr('value') ?? 'on') : ''
      fields[name] = {
        name,
        value,
        type,
        label: findLabel($, input),
        required: input.attr('required') !== undefined
      }
    } else if (input.attr('type') === 'hidden') {
      type = 'hidden'
      value = input.attr('value') ?? ''
      fields[name] = { name, value, type }
    } else if (input.attr('type') === 'file') {
      type = 'file'
      fields[name] = { name, value: '', type, label: findLabel($, input) }
    } else {
      value = input.attr('value') ?? input.text() ?? ''
      if (tag === 'textarea') {
        value = input.text()
        type = 'textarea'
      }
      if (input.attr('type') === 'number') type = 'number'

      fields[name] = {
        name,
        value,
        type,
        label: findLabel($, input),
        required: input.attr('required') !== undefined
      }
    }

    rawFormData[name] = value
  })

  const parsedOfferId = rawFormData['offer_id'] ?? offerId

  return {
    nodeId,
    offerId: parsedOfferId,
    fields,
    rawFormData
  }
}

/**
 * Extracts field schema for category-specific required fields.
 */
export function parseNodeSchema(form: OfferForm): FieldSchema[] {
  return Object.values(form.fields)
    .filter((f) => f.name.startsWith('fields[') && f.type === 'select')
    .filter(
      (f) =>
        !f.name.includes('[summary]') &&
        !f.name.includes('[desc]') &&
        !f.name.includes('[images]')
    )
    .map((f) => ({
      name: f.name,
      label: f.label ?? f.name,
      type: f.type,
      required: f.required || !f.value,
      options: f.options ?? [],
      currentValue: f.value
    }))
}

/**
 * Parses save offer response.
 */
export function parseSaveResponse(
  response: string,
  meta?: { status?: number; location?: string }
): {
  success: boolean
  offerId?: string
  error?: string
} {
  if (meta?.status === 428) {
    return {
      success: false,
      error:
        'FunPay отклонил запрос (HTTP 428): не установлена сессия или CSRF. Переподключите Golden Key и попробуйте снова.'
    }
  }

  if (meta?.location) {
    const idMatch = meta.location.match(/offer=(\d+)|[?&]id=(\d+)/)
    if (idMatch) {
      return { success: true, offerId: idMatch[1] ?? idMatch[2] }
    }
  }

  if (meta?.status && meta.status >= 200 && meta.status < 400 && !response.trim()) {
    return { success: true }
  }

  const trimmed = response.trim()
  const jsonText = trimmed.startsWith('{') ? trimmed : extractJsonObject(trimmed)

  if (jsonText) {
    try {
      const json = JSON.parse(jsonText) as {
        done?: boolean
        url?: string
        error?: string
        msg?: string
        errors?: Record<string, string>
        offer_id?: string | number
      }

      if (json.error) {
        return { success: false, error: json.error }
      }

      if (json.errors && Object.keys(json.errors).length > 0) {
        const message = Object.entries(json.errors)
          .map(([key, value]) => `${key}: ${value}`)
          .join('; ')
        return { success: false, error: message }
      }

      if (json.msg) {
        return { success: false, error: json.msg }
      }

      if (json.done || json.url) {
        let offerId = json.offer_id?.toString()
        if (!offerId && json.url) {
          const idMatch = String(json.url).match(/offer=(\d+)|id=(\d+)/)
          offerId = idMatch?.[1] ?? idMatch?.[2]
        }
        return { success: true, offerId }
      }

      if (json.done === false) {
        return { success: false, error: 'FunPay отклонил сохранение лота' }
      }
    } catch {
      // Fall through to HTML/text heuristics below.
    }
  }

  const htmlError = extractHtmlErrorMessage(trimmed)
  if (htmlError) {
    return { success: false, error: htmlError }
  }

  if (/error|ошибка|denied|запрещ|обновите страницу/i.test(trimmed)) {
    return { success: false, error: trimmed.slice(0, 200) }
  }

  const preview = trimmed.replace(/\s+/g, ' ').slice(0, 120)
  return {
    success: false,
    error: preview
      ? `FunPay: ${preview}${trimmed.length > 120 ? '…' : ''}`
      : `FunPay вернул пустой ответ (HTTP ${meta?.status ?? '?'})`
  }
}

/**
 * Determines lot status from form active field.
 */
export function getStatusFromForm(form: OfferForm): LotStatus {
  const active = form.rawFormData['active'] ?? form.rawFormData['deactivate']
  if (active === '1' || active === 'on') return 'active'
  if (active === '0') return 'inactive'
  return 'unknown'
}

function findLabel($: cheerio.CheerioAPI, input: cheerio.Cheerio<cheerio.AnyNode>): string | undefined {
  const id = input.attr('id')
  if (id) {
    const label = $(`label[for="${id}"]`).text().trim()
    if (label) return label
  }
  return input.closest('.form-group, .form-field').find('label').first().text().trim() || undefined
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function extractJsonObject(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/)
  return match?.[0] ?? null
}

function extractHtmlErrorMessage(html: string): string | undefined {
  if (!html.includes('<')) return undefined

  const $ = cheerio.load(html)
  const alert = $('.alert-danger, .alert-warning, .form-error, .error-message')
    .first()
    .text()
    .replace(/\s+/g, ' ')
    .trim()
  if (alert) return alert

  const title = $('title').text().trim()
  if (title && !/funpay/i.test(title)) return title

  return undefined
}

function extractNodeFromHref(href: string): string | null {
  const match = href.match(/node=(\d+)/)
  return match?.[1] ?? null
}

function extractNodeIdFromCategoryHref(href: string): string {
  const parts = href.split('/').filter(Boolean)
  const numeric = parts.find((part) => /^\d+$/.test(part))
  if (numeric) return numeric
  if (parts.length >= 2) return parts[parts.length - 2] ?? ''
  return parts[parts.length - 1] ?? ''
}

function extractOfferIdFromHref(href: string): string | null {
  const match = href.match(/[?&]id=(\d+)/)
  return match?.[1] ?? null
}

function appendLotFromItem(
  item: cheerio.Cheerio<cheerio.AnyNode>,
  nodeId: string,
  category: string,
  lots: LotSummary[],
  seen: Set<string>
): void {
  const itemHref = item.attr('href') ?? item.find('a').attr('href') ?? ''
  const offerId = extractOfferIdFromHref(itemHref)
  if (!offerId || seen.has(offerId)) return
  seen.add(offerId)

  const priceEl = item.find('.tc-price')
  const priceFromData = priceEl.attr('data-s')
  const price =
    priceFromData ?? (priceEl.text().replace(/\s+/g, ' ').trim() || '—')

  lots.push({
    id: offerId,
    nodeId,
    title: item.find('.tc-desc-text').text().trim() || 'Без названия',
    price,
    category: category || 'Неизвестно',
    status: item.hasClass('offer-disabled') ? 'inactive' : 'active',
    imageUrl: item.find('.tc-item-image img').attr('src') ?? undefined
  })
}
