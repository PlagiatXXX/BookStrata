import { lazy as ReactLazy, type ComponentType } from "react";

/**
 * Защита от stale-бандла после деплоя и битого кеша.
 *
 * # Stale-бандл (деплой при открытой вкладке)
 * Vite использует нативный ESM, поэтому ошибка — НЕ error.name === 'ChunkLoadError'
 * (это Webpack), а TypeError с текстом:
 *   "Failed to fetch dynamically imported module: ..."
 * В некоторых браузерах/версиях:
 *   "Importing a module script failed."
 *   "error loading dynamically imported module"
 *
 * # Битый кеш (повреждённый файл в браузерном кеше)
 * Файл возвращается с HTTP 200, но содержимое повреждено (частичная загрузка,
 * ошибка диска, сбой при записи кеша). При попытке выполнить модуль возникает
 * SyntaxError или TypeError. Это редкий сценарий, но SRI (Subresource Integrity)
 * в сборке решает его на уровне браузера. Здесь — запасной слой для старых
 * сборок и для случаев, когда SRI по какой-то причине не сработал.
 *
 * Webpack-фоллбэк оставлен на случай смены бандлера.
 */
const CHUNK_ERROR_PATTERNS = [
  // Stale-бандл (404/network error)
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Loading chunk .* failed/i,
  // Битый кеш (HTTP 200, но модуль не выполняется)
  /Failed to resolve module specifier/i,
  /SyntaxError.*evaluating/i,
  /SyntaxError.*module/i,
  /imported module/i,
];

export function isChunkLoadError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const text = `${err.name} ${err.message}`;
  if (CHUNK_ERROR_PATTERNS.some((re) => re.test(text))) return true;
  // Webpack fallback (на случай смены бандлера)
  return err.name === "ChunkLoadError";
}

/**
 * Guard от зацикливания: два авто-reload на сессию.
 *
 * Первый — обычный reload (window.location.reload()).
 * Второй — cache-busting reload (добавляет ?__bust=timestamp),
 * чтобы браузер не использовал битый кеш.
 *
 * Если и второй не помог — ошибка уходит в ErrorBoundary,
 * который показывает FallbackErrorPage с кнопкой «на главную».
 */
const RELOAD_COUNT_KEY = "bs:chunk-reloaded";

export function getReloadCount(): number {
  try {
    return Number(sessionStorage.getItem(RELOAD_COUNT_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function incrementReloadCount(): void {
  try {
    sessionStorage.setItem(RELOAD_COUNT_KEY, String(getReloadCount() + 1));
  } catch {
    // игнорируем — guard лишь "best effort"
  }
}

export function hasReloadedThisSession(): boolean {
  return getReloadCount() > 0;
}

/**
 * Обработка ошибки загрузки чанка.
 * Возвращает true, если был запрошен reload (вызывающий может прерваться).
 */
export function handleChunkLoadError(err: unknown): boolean {
  if (!isChunkLoadError(err)) return false;

  const attempt = getReloadCount();
  if (attempt >= 2) return false; // две попытки — предел

  incrementReloadCount();
  // Небольшая задержка, чтобы успели отработать pending-обработчики
  // (например, Sentry breadcrumb), иначе reload может их оборвать.
  setTimeout(() => {
    if (attempt === 1) {
      // Вторая попытка — cache-busting: добавляем timestamp,
      // чтобы браузер не отдал тот же битый файл из кеша
      const cacheBust = `__bust=${Date.now()}`;
      const url = window.location.href;
      window.location.href = url.includes("?")
        ? `${url}&${cacheBust}`
        : `${url}?${cacheBust}`;
    } else {
      // Первая попытка — обычный reload
      window.location.reload();
    }
  }, 0);
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
