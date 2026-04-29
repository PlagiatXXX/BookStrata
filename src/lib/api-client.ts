import { getAuthHeader, handleResponse } from "./authApi";
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

async function request<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
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

  try {
    return await handleResponse<T>(response);
  } catch (error) {
    // Если токен был обновлён, повторяем запрос один раз
    if (
      error instanceof Error &&
      error.message === "TOKEN_REFRESHED" &&
      retryCount === 0
    ) {
      return request<T>(method, path, data, retryCount + 1);
    }
    throw error;
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, data?: unknown) => request<T>("POST", path, data),
  put: <T>(path: string, data?: unknown) => request<T>("PUT", path, data),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

export const api = apiClient;
