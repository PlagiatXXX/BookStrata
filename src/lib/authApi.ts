import type { AuthResponse, ValidateTokenResponse } from "@/types/auth";
import { API_BASE_URL } from "./config";
import { createLogger } from "./logger";
import { StorageService } from "./storage";

// Логгер для модуля аутентификации
const authLogger = createLogger("AuthApi", { color: "cyan" });

/**
 * Разворачивает { data: ... } из ответа API (безопасно, без циклических импортов)
 */
function unwrapData<T>(json: unknown): T {
  if (json && typeof json === "object" && "data" in (json as Record<string, unknown>)) {
    return (json as Record<string, unknown>).data as T;
  }
  return json as T;
}

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
export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
  captchaToken?: string;
}

export interface RegisterResult {
  userId: number;
  username: string;
  email: string;
  emailVerified: boolean;
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
): Promise<RegisterResult> {
  authLogger.info("Регистрация нового пользователя", {
    username: payload.username,
    email: payload.email,
  });

  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error?.message 
      || errorData?.message 
      || (typeof errorData?.error === 'string' ? errorData.error : `Ошибка: ${response.statusText}`);
    authLogger.error(new Error(errorMessage), {
      username: payload.username,
    });
    throw new Error(errorMessage);
  }

  const result = unwrapData<RegisterResult>(await response.json());

  authLogger.info("Регистрация пользователя успешна, требуется подтверждение email", {
    username: payload.username,
  });
  return result;
}

/**
 * Подтверждение email по токену
 */
export async function apiVerifyEmail(token: string): Promise<{ message: string; userId: number; username: string }> {
  authLogger.info("Подтверждение email");

  const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error?.message || "Ошибка подтверждения email";
    throw new Error(errorMessage);
  }

  return unwrapData(await response.json());
}

/**
 * Повторная отправка письма подтверждения
 */
export async function apiResendVerification(email: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error?.message || "Ошибка отправки письма";
    throw new Error(errorMessage);
  }

  return unwrapData(await response.json());
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
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error?.message 
      || errorData?.message 
      || (typeof errorData?.error === 'string' ? errorData.error : `Ошибка: ${response.statusText}`);
    authLogger.warn("Вход не удался", {
      username: payload.username,
      reason: errorMessage,
    });
    throw new Error(errorMessage);
  }

  const result = unwrapData<AuthResponse>(await response.json());

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

      const result = unwrapData<ValidateTokenResponse>(await response.json());

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
  window.dispatchEvent(new Event("auth-token-changed"));
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

    const data = unwrapData<{ accessToken: string }>(await response.json());
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
      await refreshAccessToken();

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
    const errorMessage = errorData?.error?.message 
      || errorData?.message 
      || (typeof errorData?.error === 'string' ? errorData.error : `Ошибка: ${response.statusText}`);
    authLogger.error(new Error(errorMessage), {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
    });
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function apiForgotPassword(email: string): Promise<{ message: string }> {
  authLogger.info("Запрос на сброс пароля", { email });

  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error?.message 
      || errorData?.message 
      || (typeof errorData?.error === 'string' ? errorData.error : `Ошибка: ${response.statusText}`);
    authLogger.error(new Error(errorMessage), { email });
    throw new Error(errorMessage);
  }

  return unwrapData<{ message: string }>(await response.json());
}

/**
 * Установка нового пароля по токену
 */
export async function apiResetPassword(token: string, password: string): Promise<{ message: string }> {
  authLogger.info("Сброс пароля по токену");

  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error?.message 
      || errorData?.message 
      || (typeof errorData?.error === 'string' ? errorData.error : `Ошибка: ${response.statusText}`);
    authLogger.error(new Error(errorMessage));
    throw new Error(errorMessage);
  }

  return unwrapData<{ message: string }>(await response.json());
}