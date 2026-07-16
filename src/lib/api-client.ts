import { getAuthHeader, refreshAccessToken, handleUnauthorized } from "./authApi";
import { checkResponseForAchievements } from "./achievementApi";
import { API_BASE_URL } from "./config";
import { notifyError } from "./notifyError";

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

export function buildUrl(path: string, params?: QueryParams): string {
  if (!params) return path;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    search.set(key, String(value));
  }

  const queryString = search.toString();
  return queryString ? `${path}?${queryString}` : path;
}

/**
 * Типизированная ошибка API — содержит code и status из ответа сервера.
 * Позволяет обрабатывать ошибки по типу, а не по тексту сообщения.
 *
 * @example
 * try { await api.post(...) } catch (err) {
 *   if (err instanceof ApiRequestError && err.code === 'unauthorized') { ... }
 * }
 */
export class ApiRequestError extends Error {
  /** Machine-readable error code (см. ErrorCodes в backend) */
  public readonly code: string;
  /** HTTP status code */
  public readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Разворачивает ответ API из формата { data: ... }.
 * Пагинированные ответы ({ data, meta, links }) возвращаются целиком.
 */
function unwrapResponse<T>(json: unknown): T {
  if (json && typeof json === "object" && "data" in (json as Record<string, unknown>)) {
    const obj = json as Record<string, unknown>;
    // paginated response — возвращаем как есть
    if ("meta" in obj || "links" in obj) {
      return json as T;
    }
    return obj.data as T;
  }
  return json as T;
}

async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  data?: unknown,
): Promise<T> {
  // Пытаемся выполнить запрос. На 401 — один раз пробуем refresh и повторяем.
  const MAX_ATTEMPTS = 2;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(data !== undefined ? { "Content-Type": "application/json" } : {}),
        ...getAuthHeader(),
      },
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
    });

    // 401 — пытаемся refresh токен и повторяем запрос
    if (response.status === 401) {
      if (attempt === 0) {
        try {
          await refreshAccessToken();
          continue; // повторяем запрос с новым токеном
        } catch {
          // refresh не удался — чистка сессии
        }
      }

      // Первая попытка уже была с refresh'ом, а 401 снова — сессию не восстановить
      handleUnauthorized();

      // Не показываем тост для auth/refresh — при пререндере нет сессии, это штатная ситуация.
      // Также скрываем тост если страница в Prerendering API (Google/Yandex боты)
      // или в Playwright-пререндере (window.__PRERENDER__).
      const isAuthRefresh = path.includes("/auth/refresh");
      const isPrerendering = typeof document !== "undefined"
        && (("prerendering" in document) || window.__PRERENDER__ === true);
      if (!isAuthRefresh && !isPrerendering) {
        notifyError("Сессия истекла", "Пожалуйста, войдите в систему снова");
      }
      throw new ApiRequestError("unauthorized", "Требуется авторизация", 401);
    }

    // 204 No Content
    if (response.status === 204) {
      return null as T;
    }

    // Парсим JSON
    let json: unknown;
    try {
      json = await response.json();
    } catch {
      if (!response.ok) {
        const msg = `Ошибка: ${response.statusText}`;
        notifyError("Ошибка запроса", msg);
        throw new ApiRequestError("parse_error", msg, response.status);
      }
      return json as T;
    }

    // Ошибки в формате { error: { code, message } }
    if (!response.ok) {
      const errObj = json as Record<string, unknown> | null;
      const errorData = errObj?.error as Record<string, unknown> | undefined;
      const code = errorData?.code as string ?? "unknown";
      const message = errorData?.message as string
        ?? errObj?.error as string
        ?? errObj?.message as string
        ?? `Ошибка: ${response.statusText}`;
      notifyError("Ошибка", message);
      throw new ApiRequestError(code, message, response.status);
    }

    // Разворачиваем { data: ... } → ...
    const result = unwrapResponse<T>(json);

    // Проверяем на новые достижения в ответе
    checkResponseForAchievements(result);

    return result;
  }

  // Недостижимо: for возвращает результат или выбрасывает ошибку
  throw new ApiRequestError("unknown", "Unexpected: all attempts exhausted without result", 0);
}

export const apiClient = {
  get: <T>(path: string, params?: QueryParams) =>
    request<T>("GET", buildUrl(path, params)),
  post: <T>(path: string, data?: unknown) => request<T>("POST", path, data),
  put: <T>(path: string, data?: unknown) => request<T>("PUT", path, data),
  patch: <T>(path: string, data?: unknown) => request<T>("PATCH", path, data),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

export const api = apiClient;
