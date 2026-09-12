import type { AuthResponse, ValidateTokenResponse } from "@/types/auth";
import { API_BASE_URL } from "./config";
import { createLogger } from "./logger";

// Логгер для модуля аутентификации
const authLogger = createLogger("AuthApi", { color: "cyan" });

/**
 * In-memory хранилище access-токена.
 * Токен НЕ сохраняется в localStorage — это исключает XSS-кражу токена.
 * При перезагрузке страницы сессия восстанавливается через refresh-токен
 * (HttpOnly cookie), который отправляется автоматически.
 *
 * Флаг SESSION_ACTIVE_KEY в localStorage указывает, что у пользователя
 * ранее была сессия. Это позволяет избежать лишнего 401 на /auth/refresh
 * для новых посетителей при загрузке страницы.
 */
const SESSION_ACTIVE_KEY = "bookstrata_session_active";
let inMemoryToken: string | null = null;

/**
 * Флаг: попытка refresh-токена уже failed при текущей сессии.
 * Предотвращает ретрей-цикл: api-client → 401 → refresh → 401 → handleUnauthorized → fetchUser → 401 → ...
 * Сбрасывается при логине (setAuthToken) и при успешном refresh.
 * Автоматически сбрасывается при перезагрузке страницы (in-memory).
 */
let _refreshFailed = false;

/** Проверить, падал ли refresh в этой сессии */
export function isRefreshFailed(): boolean {
  return _refreshFailed;
}

/** Установить флаг «refresh не удался» */
export function markRefreshFailed(): void {
  _refreshFailed = true;
}

/** Сбросить флаг (при логине или успешном refresh) */
export function resetRefreshFailed(): void {
  _refreshFailed = false;
}

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
  accessToken: string;
  userId: number;
  username: string;
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

/**
 * Refresh token rejected by server (401/403).
 * Отдельный класс чтобы catch мог отличить network error от auth rejection.
 */
class RefreshRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RefreshRejectedError";
  }
}

// ========== TOKEN MANAGEMENT (in-memory) ==========

/**
 * Сохранить access-токен в памяти.
 * Токен больше не пишется в localStorage — это безопаснее от XSS.
 * @see https://owasp.org/www-community/vulnerabilities/Storing_Access_Tokens_in_Local_Storage
 */
export function setAuthToken(token: string) {
  inMemoryToken = token;
  resetRefreshFailed(); // новый токен — новая сессия, сбрасываем флаг
  localStorage.setItem(SESSION_ACTIVE_KEY, "true");
  // Планируем proактивное обновление токена до истечения
  scheduleProactiveRefresh(token);
  // НЕ диспатчим 'auth-token-changed' — AuthProvider уже установил пользователя
  // через loginWithData() после логина/регистрации, или через restoreSession().
  // Диспатч здесь вызывал лишний fetchUser() → apiGetMe(), который при 401
  // запускал каскад: handleUnauthorized → markRefreshFailed → ломал все запросы.
}

/**
 * Получить access-токен из памяти.
 */
export function getAuthToken(): string | null {
  return inMemoryToken;
}

/**
 * Удалить access-токен из памяти.
 */
export function removeAuthToken() {
  inMemoryToken = null;
  cancelProactiveRefresh();
  localStorage.removeItem(SESSION_ACTIVE_KEY);
  window.dispatchEvent(new Event("auth-token-changed"));
}

/**
 * Был ли у пользователя ранее активная сессия (для этого устройства/браузера).
 * Позволяет не делать лишний запрос /auth/refresh для новых посетителей.
 */
export function hasSession(): boolean {
  return localStorage.getItem(SESSION_ACTIVE_KEY) === "true";
}

/**
 * Получить Authorization header
 */
export function getAuthHeader(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Обработка 401 ошибки — очищает токен и триггерит перепроверку AuthProvider
 */
export function handleUnauthorized() {
  authLogger.info(
    "Неавторизованный доступ — очистка сессии",
  );
  markRefreshFailed(); // refresh не удался — больше не пробуем до логина
  removeAuthToken(); // удалит токен и диспатчит 'auth-token-changed'
}

/**
 * Singleton-промис для дедупликации параллельных refresh-запросов.
 *
 * Все одновременные вызовы refreshAccessToken() получают один и тот же промис.
 * При успехе — все ждущие получают токен. При ошибке — все получают reject.
 * Промис обнуляется после завершения (очистка в finally через .then(clean, clean)).
 *
 * Предыдущая реализация использовала isRefreshing + refreshSubscribers,
 * но при ошибке subscriber'ы никогда не реджектились — промисы зависали навечно.
 */
let refreshPromise: Promise<string> | null = null;

// ─── Proactive Refresh ─────────────────────────────────────────────────────
// Обновляем токен за 5 минут до истечения, чтобы пользователь не видел 401.

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 минут до истечения
let proactiveRefreshTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Декодирует JWT (без валидации подписи) и возвращает payload.
 * Нужен только для чтения exp — валидация на сервере.
 */
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const base64 = token.split(".")[1];
    if (!base64) return null;
    const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Планирует обновление токена за 5 минут до истечения */
function scheduleProactiveRefresh(token: string): void {
  cancelProactiveRefresh();

  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return;

  const expiresAt = payload.exp * 1000; // exp в секундах → мс
  const refreshAt = expiresAt - REFRESH_BUFFER_MS;
  const delay = refreshAt - Date.now();

  if (delay <= 0) {
    // Токен уже истекает — обновляем сразу
    authLogger.debug("Токен истекает imminent, обновляем сейчас");
    refreshAccessToken().catch(() => {});
    return;
  }

  authLogger.debug(`Proactive refresh запланирован через ${Math.round(delay / 1000)}с`);
  proactiveRefreshTimer = setTimeout(() => {
    authLogger.info("Proactive refresh — обновляем токен до истечения");
    refreshAccessToken().catch(() => {});
  }, delay);
}

/** Отменяет запланированный proactive refresh */
function cancelProactiveRefresh(): void {
  if (proactiveRefreshTimer) {
    clearTimeout(proactiveRefreshTimer);
    proactiveRefreshTimer = null;
  }
}

/**
 * Refresh access токена с retry при сетевых ошибках.
 *
 * Retry: до 2 попыток с экспоненциальной задержкой (1с, 2с).
 * Ставит _refreshFailed ТОЛЬКО при 401/403 (реальный отказ токена).
 * При сетевых ошибках/5xx — retry, без _refreshFailed.
 */
export async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    // Уже идёт refresh — возвращаем тот же промис всем ожидающим
    return refreshPromise;
  }

  authLogger.debug("Refreshing access token");

  const MAX_RETRIES = 2;
  const BASE_DELAY = 1000; // 1с

  refreshPromise = (async () => {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok) {
          // Сервер明确拒绝 refresh (401/403) — refresh-токен невалиден/отозван.
          // Не retry — это не временная проблема.
          if (response.status === 401 || response.status === 403) {
            throw new RefreshRejectedError("Refresh token rejected by server");
          }
          // Другие HTTP-ошибки (500, 503) — сервер временно недоступен.
          // Retry если есть попытки.
          if (attempt < MAX_RETRIES) {
            const delay = BASE_DELAY * Math.pow(2, attempt);
            authLogger.debug(`RefreshHTTP ${response.status}, retry через ${delay}мс (попытка ${attempt + 1}/${MAX_RETRIES})`);
            await sleep(delay);
            continue;
          }
          throw new Error(`Refresh failed with status ${response.status}`);
        }

        const data = unwrapData<{ accessToken: string }>(await response.json());
        const newAccessToken = data.accessToken;

        // Сохраняем новый access токен
        setAuthToken(newAccessToken);
        // Планируем следующее обновление
        scheduleProactiveRefresh(newAccessToken);

        authLogger.info("Access token refreshed successfully");
        return newAccessToken;
      } catch (error) {
        // RefreshRejectedError — сервер明确 отклонил, не retry
        if (error instanceof RefreshRejectedError) {
          throw error;
        }
        // Сетевая ошибка (TypeError: Failed to fetch) — retry если есть попытки
        if (attempt < MAX_RETRIES) {
          const delay = BASE_DELAY * Math.pow(2, attempt);
          authLogger.debug(`Refresh network error, retry через ${delay}мс (попытка ${attempt + 1}/${MAX_RETRIES})`);
          await sleep(delay);
          continue;
        }
        // Все попытки исчерпаны — пробрасываем
        throw error;
      }
    }
    // Недостижимо, но TS требует
    throw new Error("Refresh failed: all retries exhausted");
  })();

  // Оборачиваем: при RejectRejectedError → handleUnauthorized, иначе — просто markRefreshFailed
  const wrapped = refreshPromise.catch((error) => {
    if (error instanceof RefreshRejectedError) {
      authLogger.warn("Refresh токена отклонён сервером — очистка сессии");
      handleUnauthorized();
    } else {
      authLogger.info("Refresh токена не удался (сетевая ошибка или сервер недоступен)", {
        action: "refresh access token",
        error: error instanceof Error ? error.message : String(error),
      });
      // Не чистим сессию — при network error сессия может быть жива.
      // НЕ ставим _refreshFailed — при следующем запросе попробуем снова.
    }
    throw error;
  });

  // Очищаем refreshPromise после завершения
  const cleanup = () => {
    refreshPromise = null;
  };
  wrapped.then(cleanup, cleanup);

  return wrapped;
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

/**
 * Выход из системы — очищает refresh-токен на сервере
 */
export async function apiLogout(): Promise<void> {
  authLogger.info("Выход из системы");

  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeader(),
    });
  } catch {
    // Ошибка не критична — токен всё равно удалим локально
  }
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