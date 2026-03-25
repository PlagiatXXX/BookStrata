import type { AuthResponse, ValidateTokenResponse } from "@/types/auth";
import { API_BASE_URL } from "./config";
import { createLogger } from "./logger";
import { StorageService } from "./storage";

// Логгер для модуля аутентификации
const authLogger = createLogger("AuthApi", { color: "cyan" });

/**
 * Базовый URL API
 *
 * ⚠️ SECURITY NOTE:
 * VITE_API_URL встраивается в клиентский бандл на этапе сборки и виден пользователям.
 * Это допустимо для публичных API, но не подходит для секретных ключей.
 *
 * Риски:
 * - URL бэкенда виден в DevTools
 * - Может быть изменён при модификации бандла
 *
 * Митигация:
 * - Валидация токена на сервере
 * - CORS ограничения
 * - Rate limiting
 * - HTTPS в продакшене
 */
interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

interface LoginPayload {
  username: string;
  password: string;
}

// ========== AUTHENTICATION ==========

/**
 * Регистрация нового пользователя
 */
export async function apiRegister(
  payload: RegisterPayload,
): Promise<AuthResponse> {
  authLogger.info("Регистрация нового пользователя", {
    username: payload.username,
    email: payload.email,
  });

  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // Получаем cookie с refresh токеном
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    authLogger.error(new Error(error.error || "Регистрация не удалась"), {
      username: payload.username,
    });
    throw new Error(error.error || "Регистрация не удалась");
  }

  const result = await response.json();

  // Сохраняем access токен
  if (result.accessToken) {
    setAuthToken(result.accessToken);
  }

  authLogger.info("Регистрация пользователя успешна", {
    username: payload.username,
  });
  return result;
}

/**
 * Вход пользователя
 */
export async function apiLogin(payload: LoginPayload): Promise<AuthResponse> {
  authLogger.info("Попытка входа пользователя", { username: payload.username });

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // Получаем cookie с refresh токеном
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    authLogger.warn("Вход не удался", {
      username: payload.username,
      reason: error.error,
    });
    throw new Error(error.error || "Вход не удался");
  }

  const result = await response.json();

  // Сохраняем access токен
  if (result.accessToken) {
    setAuthToken(result.accessToken);
  }

  authLogger.info("Вход пользователя успешен", { username: payload.username });
  return result;
}

/**
 * Проверка, является ли ошибка сетевой (можно retry)
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    // ERR_CONNECTION_REFUSED, ERR_TIMED_OUT, network unreachable
    return error.message.includes("fetch") || error.message.includes("network");
  }
  return false;
}

/**
 * Sleep utility для задержек
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Валидация токена с retry-логикой
 *
 * Стратегия:
 * - 3 попытки с экспоненциальной задержкой (500ms → 1000ms → 2000ms)
 * - Retry только при сетевых ошибках (бэкенд недоступен)
 * - При 401/403 — сразу ошибка (не retry)
 */
export async function apiValidateToken(
  token: string,
): Promise<ValidateTokenResponse> {
  authLogger.info("Валидация токена аутентификации");

  const maxRetries = 3;
  const baseDelay = 500; // 500ms

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      // При 401/403 не делаем retry — сразу возвращаем ошибку
      if (response.status === 401 || response.status === 403) {
        authLogger.warn("Валидация токена не удалась", {
          status: response.status,
        });
        return { valid: false, userId: undefined, username: undefined };
      }

      const result = await response.json();

      if (!result.valid) {
        authLogger.warn("Валидация токена не удалась");
      } else {
        authLogger.info("Валидация токена успешна", { userId: result.userId });
      }

      return result;
    } catch (error) {
      // Если это сетевая ошибка — пробуем снова
      if (isNetworkError(error) && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // 500, 1000, 2000
        authLogger.debug(
          `Попытка ${attempt} не удалась, следующая через ${delay}ms`,
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
        await sleep(delay);
        continue;
      }

      // Последняя попытка или не сетевая ошибка — пробрасываем дальше
      authLogger.error(
        error instanceof Error ? error : new Error(String(error)),
        {
          action: "token validation",
          attempt,
          maxRetries,
        },
      );
      throw error;
    }
  }

  // Должны были выйти выше, но на всякий случай
  throw new Error("Валидация токена не удалась после всех попыток");
}

// ========== TOKEN MANAGEMENT ==========

/**
 * Сохранить токен в localStorage
 */
export function setAuthToken(token: string) {
  StorageService.setString("authToken", token);
}

/**
 * Получить токен из localStorage
 */
export function getAuthToken(): string | null {
  return StorageService.getString("authToken");
}

/**
 * Удалить токен из localStorage
 */
export function removeAuthToken() {
  StorageService.remove("authToken");
}

/**
 * Получить Authorization header
 */
export function getAuthHeader(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Обработка 401 ошибки
 */
export function handleUnauthorized() {
  authLogger.warn(
    "Неавторизованный доступ — очистка сессии и перенаправление на вход",
  );
  removeAuthToken();
  window.dispatchEvent(new CustomEvent("unauthorized"));
  window.location.href = "/auth";
}

/**
 * Флаг для предотвращения множественных refresh запросов
 */
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

/**
 * Подписаться на новый токен после refresh
 */
function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

/**
 * Уведомить подписчиков о новом токене
 */
function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

/**
 * Refresh access токена
 */
export async function refreshAccessToken(): Promise<string> {
  if (isRefreshing) {
    // Если уже идёт refresh, ждём результата
    return new Promise((resolve) => {
      subscribeTokenRefresh((token) => resolve(token));
    });
  }

  isRefreshing = true;

  try {
    authLogger.info("Refreshing access token");

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include", // Отправляем cookie с refresh токеном
    });

    if (!response.ok) {
      authLogger.warn("Refresh token failed, redirecting to login");
      handleUnauthorized();
      throw new Error("Refresh token failed");
    }

    const data = await response.json();
    const newAccessToken = data.accessToken;

    // Сохраняем новый access токен
    setAuthToken(newAccessToken);

    authLogger.info("Access token refreshed successfully");

    // Уведомляем подписчиков
    onTokenRefreshed(newAccessToken);

    return newAccessToken;
  } catch (error) {
    authLogger.error(
      error instanceof Error ? error : new Error(String(error)),
      {
        action: "refresh access token",
      },
    );
    handleUnauthorized();
    throw error;
  } finally {
    isRefreshing = false;
  }
}

/**
 * Обработка ответа API с авто-обновлением токена
 */
export async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    authLogger.warn("API вернул 401 Unauthorized, пытаемся refresh");

    // Пытаемся refresh-нуть токен
    try {
      const newToken = await refreshAccessToken();

      // Повторяем оригинальный запрос с новым токеном
      // Для этого нужно сохранить информацию о запросе
      // Это будет обработано в api-client.ts
      throw new Error("TOKEN_REFRESHED"); // Специальная ошибка для retry
    } catch (refreshError) {
      if (
        refreshError instanceof Error &&
        refreshError.message === "TOKEN_REFRESHED"
      ) {
        // Токен обновлён, фронтенд должен повторить запрос
        throw refreshError;
      }
      // Refresh не удался — разлогиниваем
      handleUnauthorized();
      throw new Error("Требуется авторизация. Пожалуйста, войдите в систему.");
    }
  }

  if (response.status === 204) {
    return null as T;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || `Ошибка: ${response.statusText}`;
    authLogger.error(new Error(errorMessage), {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
    });
    throw new Error(errorMessage);
  }

  return response.json();
}

// ========== EXPORTS FOR COMPATIBILITY ==========
// Экспортируем типы для обратной совместимости
export type { User } from "./userApi";
export type { LikesResponse } from "./likesApi";
