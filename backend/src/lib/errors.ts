/**
 * Типизированные ошибки приложения.
 *
 * Позволяют:
 * - Проверять тип ошибки через instanceof вместо парсинга текста
 * - Автоматически устанавливать HTTP statusCode
 * - Передавать machine-readable code для API-клиента
 *
 * @example
 * throw new AuthenticationError('Сессия истекла');
 * throw new ValidationError('Неверный email', { field: 'email' });
 */

import { ErrorCodes } from "./api-response.js";

// ─── Базовый класс ───────────────────────────────────────────────

export class AppError extends Error {
  /** HTTP status code */
  public readonly statusCode: number;
  /** Machine-readable error code (см. ErrorCodes) */
  public readonly code: string;
  /** Дополнительная информация (валидация, метаданные) */
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// ─── 400 — Validation ───────────────────────────────────────────

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, ErrorCodes.VALIDATION_ERROR, message, details);
  }
}

// ─── 401 — Authentication ───────────────────────────────────────

export class AuthenticationError extends AppError {
  constructor(message = "Требуется авторизация") {
    super(401, ErrorCodes.UNAUTHORIZED, message);
  }
}

// ─── 403 — Authorization / Forbidden ────────────────────────────

export class AuthorizationError extends AppError {
  constructor(message = "Доступ запрещён") {
    super(403, ErrorCodes.FORBIDDEN, message);
  }
}

// ─── 404 — Not Found ────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(message = "Ресурс не найден") {
    super(404, ErrorCodes.NOT_FOUND, message);
  }
}

// ─── 409 — Conflict ─────────────────────────────────────────────

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(409, ErrorCodes.CONFLICT, message, details);
  }
}

// ─── 429 — Rate Limit ───────────────────────────────────────────

export class RateLimitError extends AppError {
  constructor(message = "Слишком много запросов, попробуйте позже") {
    super(429, ErrorCodes.RATE_LIMIT_EXCEEDED, message);
  }
}

// ─── Хелпер для проверки типа ───────────────────────────────────

/** Проверяет, является ли ошибка типизированной ошибкой приложения */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
