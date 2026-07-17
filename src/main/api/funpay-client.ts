import type {
  AccountInfo,
  CategoryNode,
  FieldSchema,
  LotSummary,
  OfferForm,
  SaveResult
} from '../../shared/types'
import {
  parseAccountInfo,
  parseAvatarFromPage,
  parseCategoryTree,
  parseNodeSchema,
  parseOfferForm,
  parseSaveResponse,
  parseUserLots
} from './html-parser'
import { AuthError, NetworkError } from '../utils/errors'

const BASE_URL = process.env.FUNPAY_BASE_URL ?? 'https://funpay.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'

/**
 * HTTP client for FunPay internal web endpoints.
 * Uses Golden Key cookie auth — no browser emulation.
 */
export class FunPayClient {
  private goldenKey = ''
  private cookieJar = new Map<string, string>()
  private accountInfo: AccountInfo | null = null

  /**
   * Sets the Golden Key for authentication.
   */
  setGoldenKey(key: string): void {
    this.goldenKey = key.trim()
    this.cookieJar.clear()
    this.cookieJar.set('golden_key', this.goldenKey)
    this.accountInfo = null
  }

  /**
   * Returns whether a Golden Key is configured.
   */
  hasKey(): boolean {
    return this.goldenKey.length > 0
  }

  /**
   * Validates connection and returns account info.
   */
  async validateConnection(): Promise<AccountInfo> {
    await this.ensureSession()
    const html = await this.get('')
    let info = parseAccountInfo(html)

    if (!info.avatarUrl && info.userId) {
      const profileHtml = await this.get(`users/${info.userId}/`)
      const profileAvatar = parseAvatarFromPage(profileHtml)
      if (profileAvatar) {
        info = { ...info, avatarUrl: profileAvatar }
      }
    }

    if (info.avatarUrl && !info.avatarUrl.startsWith('data:')) {
      const dataUrl = await this.fetchImageAsDataUrl(info.avatarUrl)
      if (dataUrl) {
        info = { ...info, avatarUrl: dataUrl }
      }
    }

    this.accountInfo = info
    return this.accountInfo
  }

  /**
   * Returns cached or fresh account info.
   */
  getAccountInfo(): AccountInfo | null {
    return this.accountInfo
  }

  /**
   * Fetches all lots belonging to the authenticated user.
   */
  async getUserLots(userId: number): Promise<LotSummary[]> {
    if (!this.accountInfo) {
      await this.validateConnection()
    }
    const html = await this.get(`users/${userId}/`)
    return parseUserLots(html, userId)
  }

  /**
   * Fetches offer edit form for existing or new lot.
   */
  async getLotForm(nodeId: string, offerId?: string): Promise<OfferForm> {
    const route =
      offerId && offerId !== '0'
        ? `lots/offerEdit?node=${nodeId}&offer=${offerId}`
        : `lots/offerEdit?node=${nodeId}`

    const referer = `${BASE_URL}/users/`
    let raw = await this.get(route, { referer })
    let html = extractHtmlFromResponse(raw)

    if (!html.includes('form-offer-editor')) {
      raw = await this.get(route, { xhr: true, referer })
      html = extractHtmlFromResponse(raw)
    }

    return parseOfferForm(html, nodeId, offerId ?? '0')
  }

  /**
   * Fetches category tree from main page.
   */
  async getCategoryTree(): Promise<CategoryNode[]> {
    const html = await this.get('')
    return parseCategoryTree(html)
  }

  /**
   * Returns schema for category-specific fields.
   */
  async getNodeSchema(nodeId: string): Promise<FieldSchema[]> {
    const form = await this.getLotForm(nodeId)
    return parseNodeSchema(form)
  }

  /**
   * Creates or updates a lot via offerSave endpoint.
   */
  async saveOffer(formData: Record<string, string>): Promise<SaveResult> {
    if (!this.getPhpSessId()) {
      await this.ensureSession()
    }

    const data = normalizeFormForSave(formData)
    data.location = data.location || 'trade'

    if (data.offer_id === '0') {
      data.offer_id = ''
    }

    if (!data.csrf_token || !data.form_created_at) {
      return {
        success: false,
        error: 'Не удалось получить CSRF-токен формы. Перезагрузите лот и попробуйте снова.'
      }
    }

    if (!this.getPhpSessId()) {
      return {
        success: false,
        error: 'Сессия FunPay (PHPSESSID) не установлена. Переподключите Golden Key.'
      }
    }

    if (!this.accountInfo?.csrfToken) {
      await this.refreshHomeCsrf()
    }

    if (!this.accountInfo?.csrfToken) {
      return {
        success: false,
        error: 'Не удалось получить CSRF-токен аккаунта. Переподключите Golden Key.'
      }
    }

    const nodeId = data.node_id ?? ''
    const { status, body, location } = await this.postRaw('lots/offerSave', data, {
      referer: `${BASE_URL}/lots/offerEdit?node=${nodeId}`,
      origin: BASE_URL,
      xhrCsrf: this.accountInfo.csrfToken
    })
    const parsed = parseSaveResponse(body, { status, location })

    return {
      success: parsed.success,
      offerId: parsed.offerId,
      error: parsed.error,
      message: parsed.success ? 'Лот сохранён' : undefined
    }
  }

  /** Ensures FunPay session cookie exists (required for POST requests). */
  async ensureSession(): Promise<void> {
    this.cookieJar.set('golden_key', this.goldenKey)

    if (this.getPhpSessId()) return

    for (const method of ['POST', 'GET'] as const) {
      const response = await this.fetchRaw('', { method })
      this.updateCookies(response)
      if (this.getPhpSessId()) return
    }
  }

  /** Refreshes homepage CSRF used in x-csrf-token header. */
  async refreshHomeCsrf(): Promise<void> {
    const html = await this.get('')
    const info = parseAccountInfo(html)
    let avatarUrl = info.avatarUrl ?? this.accountInfo?.avatarUrl

    if (!avatarUrl && info.userId) {
      const profileHtml = await this.get(`users/${info.userId}/`)
      avatarUrl = parseAvatarFromPage(profileHtml)
    }

    if (avatarUrl && !avatarUrl.startsWith('data:')) {
      avatarUrl = (await this.fetchImageAsDataUrl(avatarUrl)) ?? avatarUrl
    }

    this.accountInfo = this.accountInfo
      ? {
          ...this.accountInfo,
          csrfToken: info.csrfToken,
          username: info.username,
          balance: info.balance ?? this.accountInfo.balance,
          avatarUrl: avatarUrl ?? this.accountInfo.avatarUrl
        }
      : { ...info, avatarUrl }
  }

  /** Downloads image with session cookies and returns a data URL for renderer display. */
  async fetchImageAsDataUrl(url: string): Promise<string | undefined> {
    try {
      const response = await this.fetchRaw(url, {
        method: 'GET',
        referer: `${BASE_URL}/`
      })

      if (!response.ok) return undefined

      const contentType = response.headers.get('content-type') ?? 'image/jpeg'
      if (!contentType.startsWith('image/')) return undefined

      const buffer = Buffer.from(await response.arrayBuffer())
      if (buffer.length === 0) return undefined

      return `data:${contentType.split(';')[0]};base64,${buffer.toString('base64')}`
    } catch {
      return undefined
    }
  }

  /**
   * Performs GET request to FunPay.
   */
  async get(route: string, options?: { xhr?: boolean; referer?: string }): Promise<string> {
    const response = await this.fetchRaw(route, {
      method: 'GET',
      referer: options?.referer,
      xhr: options?.xhr
    })

    if (response.status === 401 || response.status === 403) {
      throw new AuthError()
    }

    return await response.text()
  }

  /**
   * Performs POST request to FunPay.
   */
  async postRaw(
    route: string,
    data: Record<string, string>,
    options?: { referer?: string; origin?: string; xhrCsrf?: string }
  ): Promise<{ status: number; body: string; location?: string }> {
    await this.ensureSession()

    const response = await this.fetchRaw(route, {
      method: 'POST',
      referer: options?.referer,
      origin: options?.origin,
      xhrCsrf: options?.xhrCsrf,
      body: Object.keys(data)
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key] ?? '')}`)
        .join('&'),
      contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
      redirect: 'manual'
    })

    if (response.status === 401 || response.status === 403) {
      throw new AuthError()
    }

    return {
      status: response.status,
      body: await response.text(),
      location: response.headers.get('location') ?? undefined
    }
  }

  private async fetchRaw(
    route: string,
    options: {
      method: 'GET' | 'POST'
      referer?: string
      origin?: string
      xhr?: boolean
      xhrCsrf?: string
      body?: string
      contentType?: string
      redirect?: RequestRedirect
    }
  ): Promise<Response> {
    const url = route.startsWith('http') ? route : `${BASE_URL}/${route.replace(/^\//, '')}`

    try {
      const response = await fetch(url, {
        method: options.method,
        redirect: options.redirect ?? 'follow',
        headers: {
          ...this.buildHeaders(),
          ...(options.referer ? { Referer: options.referer } : {}),
          ...(options.origin ? { Origin: options.origin } : {}),
          ...(options.contentType ? { 'Content-Type': options.contentType } : {}),
          ...(options.xhr || options.xhrCsrf
            ? {
                Accept: 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest'
              }
            : {}),
          ...(options.xhrCsrf ? { 'x-csrf-token': options.xhrCsrf } : {})
        },
        body: options.body
      })

      this.updateCookies(response)
      return response
    } catch {
      throw new NetworkError()
    }
  }

  private getPhpSessId(): string {
    return this.cookieJar.get('PHPSESSID') ?? ''
  }

  private buildHeaders(): Record<string, string> {
    return {
      'User-Agent': USER_AGENT,
      Cookie: this.buildCookieHeader(),
      'Accept-Language': 'ru,en;q=0.9'
    }
  }

  private buildCookieHeader(): string {
    this.cookieJar.set('golden_key', this.goldenKey)
    return [...this.cookieJar.entries()]
      .filter(([, value]) => value.length > 0)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ')
  }

  private updateCookies(response: Response): void {
    const headers = response.headers as Headers & {
      getSetCookie?: () => string[]
      raw?: () => Record<string, string[]>
    }

    const cookieLines: string[] = []

    if (headers.getSetCookie) {
      cookieLines.push(...headers.getSetCookie())
    }

    const raw = headers.raw?.()?.['set-cookie']
    if (raw?.length) {
      cookieLines.push(...raw)
    }

    if (cookieLines.length === 0) {
      const single = response.headers.get('set-cookie')
      if (single) cookieLines.push(single)
    }

    for (const line of cookieLines) {
      for (const part of line.split(/,(?=\s*[^;,]+=)/)) {
        const segment = part.split(';')[0]?.trim()
        if (!segment) continue

        const eq = segment.indexOf('=')
        if (eq <= 0) continue

        const name = segment.slice(0, eq).trim()
        const value = segment.slice(eq + 1).trim()

        if (!value || value.toLowerCase() === 'deleted') {
          this.cookieJar.delete(name)
        } else {
          this.cookieJar.set(name, value)
        }
      }
    }

    this.cookieJar.set('golden_key', this.goldenKey)
  }
}

function extractHtmlFromResponse(response: string): string {
  const trimmed = response.trim()
  if (!trimmed.startsWith('{')) return response

  try {
    const json = JSON.parse(trimmed) as { html?: string }
    if (typeof json.html === 'string') return json.html
  } catch {
    // Fall back to raw HTML/text body.
  }

  return response
}

function normalizeFormForSave(data: Record<string, string>): Record<string, string> {
  const CHECKBOX_KEYS = new Set(['active', 'deleted', 'auto_delivery'])
  const result: Record<string, string> = {}

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue

    const isCheckbox =
      CHECKBOX_KEYS.has(key) || key.startsWith('deactivate') || key.endsWith('[]')

    if (isCheckbox) {
      if (value === '1' || value === 'on') {
        result[key] = 'on'
      }
      continue
    }

    result[key] = value
  }

  return result
}

/** Singleton FunPay client instance. */
export const funPayClient = new FunPayClient()
