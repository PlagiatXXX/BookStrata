import { lazy as ReactLazy, type ComponentType } from "react";

/**
 * Защита от stale-бандла после деплоя.
 *
 * Сценарий: пользователь держит вкладку открытой фоновой → происходит
 * деплой → старые чанки удаляются с сервера → при навигации на ещё не
 * открытую страницу React.lazy запрашивает чанк по старому хэшу → 404.
 *
 * Vite использует нативный ESM, поэтому ошибка — НЕ error.name === 'ChunkLoadError'
 * (это Webpack), а TypeError с текстом:
 *   "Failed to fetch dynamically imported module: ..."
 * В некоторых браузерах/версиях:
 *   "Importing a module script failed."
 *   "error loading dynamically imported module"
 * Webpack-фоллбэк оставлен на случай смены бандлера.
 */
const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Loading chunk .* failed/i,
];

export function isChunkLoadError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const text = `${err.name} ${err.message}`;
  if (CHUNK_ERROR_PATTERNS.some((re) => re.test(text))) return true;
  // Webpack fallback (на случай смены бандлера)
  return err.name === "ChunkLoadError";
}

/**
 * Guard от зацикливания: один авто-reload на сессию.
 *
 * sessionStorage — флаг живёт до закрытия вкладки/браузера.
 * Сбрасывать намеренно НЕ нужно: при повторном деплое в той же сессии
 * пользователь увидит FallbackErrorPage (а не бесконечный reload),
 * а из fallback есть кнопка «на главную» с полной перезагрузкой.
 */
const RELOADED_KEY = "bs:chunk-reloaded";

export function hasReloadedThisSession(): boolean {
  try {
    return sessionStorage.getItem(RELOADED_KEY) === "1";
  } catch {
    // sessionStorage недоступен (приватный режим с ограничениями и т.п.) —
    // считаем, что reload не было, чтобы дать шанс восстановиться
    return false;
  }
}

export function markReloaded(): void {
  try {
    sessionStorage.setItem(RELOADED_KEY, "1");
  } catch {
    // игнорируем — guard лишь "best effort"
  }
}

/**
 * Обработка ошибки загрузки чанка.
 * Возвращает true, если был запрошен reload (вызывающий может прерваться).
 */
export function handleChunkLoadError(err: unknown): boolean {
  if (!isChunkLoadError(err)) return false;
  if (hasReloadedThisSession()) return false;
  markReloaded();
  // Небольшая задержка, чтобы успели отработать pending-обработчики
  // (например, Sentry breadcrumb), иначе reload может их оборвать.
  setTimeout(() => window.location.reload(), 0);
  return true;
}

/**
 * Обёртка над React.lazy с сигнатурой 1:1.
 *
 * Ловит ошибку загрузки чанка на уровне промиса — до того, как React
 * увидит ошибку. Если reload ещё не выполнялся в этой сессии — тихо
 * перезагружает страницу; пользователь увидит лишь моргание вкладки,
 * после которого откроется нужная страница на свежем бандле.
 *
 * Если reload уже был (флаг стоит) — прокидывает ошибку дальше,
 * её ловит AppErrorBoundary как запасной слой (показывает FallbackErrorPage).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazy<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return ReactLazy(async () => {
    try {
      return await factory();
    } catch (err) {
      handleChunkLoadError(err);
      throw err; // → ErrorBoundary (запасной слой)
    }
  });
}
