/** Typed application errors for FunPay operations. */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/** Thrown when Golden Key is invalid or session expired. */
export class AuthError extends AppError {
  constructor(message = 'Неверный Golden Key или сессия истекла') {
    super(message, 'AUTH_ERROR')
    this.name = 'AuthError'
  }
}

/** Thrown when FunPay denies access to a category. */
export class AccessDeniedError extends AppError {
  constructor(message = 'Доступ к категории запрещён') {
    super(message, 'ACCESS_DENIED')
    this.name = 'AccessDeniedError'
  }
}

/** Thrown when required form fields are missing. */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly fields?: string[]
  ) {
    super(message, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

/** Thrown on network or HTTP failures. */
export class NetworkError extends AppError {
  constructor(message = 'Ошибка сети или API недоступен') {
    super(message, 'NETWORK_ERROR')
    this.name = 'NetworkError'
  }
}

/** Thrown when HTML parsing fails. */
export class ParseError extends AppError {
  constructor(message = 'Ошибка парсинга ответа FunPay') {
    super(message, 'PARSE_ERROR')
    this.name = 'ParseError'
  }
}

/**
 * Wraps unknown errors into AppError for consistent IPC responses.
 */
export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error
  if (error instanceof Error) return new AppError(error.message, 'UNKNOWN')
  return new AppError(String(error), 'UNKNOWN')
}
