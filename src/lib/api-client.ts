import { getAuthHeader, refreshAccessToken, handleUnauthorized } from "./authApi";
import { checkResponseForAchievements } from "./achievementApi";
import { API_BASE_URL } from "./config";

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
  retryCount = 0,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(data !== undefined ? { "Content-Type": "application/json" } : {}),
      ...getAuthHeader(),
    },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  });

  // 401 — пытаемся refresh токен, повторяем запрос один раз
  if (response.status === 401) {
    try {
      await refreshAccessToken();
      if (retryCount === 0) {
        return request<T>(method, path, data, retryCount + 1);
      }
    } catch {
      handleUnauthorized();
    }
    return null as T;
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
      throw new Error(`Ошибка: ${response.statusText}`);
    }
    return json as T;
  }

  // Ошибки в формате { error: { code, message } }
  if (!response.ok) {
    const errObj = json as Record<string, unknown> | null;
    const errorData = errObj?.error as Record<string, unknown> | undefined;
    const message = errorData?.message as string
      ?? errObj?.error as string
      ?? errObj?.message as string
      ?? `Ошибка: ${response.statusText}`;
    throw new Error(message);
  }

  // Разворачиваем { data: ... } → ...
  const result = unwrapResponse<T>(json);

  // Проверяем на новые достижения в ответе
  checkResponseForAchievements(result);

  return result;
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
