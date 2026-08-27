/**
 * Sentry — инициализация клиентской части.
 * Используем @sentry/browser (без React-специфичных обёрток,
 * чтобы избежать конфликтов с React Compiler).
 *
 * Lazy-loaded: @sentry/browser грузится асинхронно, чтобы не раздувать
 * основной бандл (~60 KB). Инициализация откладывается до requestIdleCallback.
 */
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const IS_DEV = import.meta.env.DEV;

/** Ленивый импорт Sentry — модуль загружается только при вызове */
async function loadSentry() {
  return import("@sentry/browser");
}

export function initSentry() {
  if (!SENTRY_DSN) {
    if (IS_DEV) {
      console.warn("[Sentry] VITE_SENTRY_DSN не задан, Sentry отключён");
    }
    return;
  }

  // Откладываем загрузку до idle — не блокируем first paint
  const run = async () => {
    try {
      const Sentry = await loadSentry();
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: IS_DEV ? "development" : "production",
        tracesSampleRate: IS_DEV ? 0 : 0.1,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        ignoreErrors: [
          "ResizeObserver loop limit exceeded",
          "Network request failed",
          "Failed to fetch",
          "Load failed",
          "ym",
        ],
      });

      if (IS_DEV) {
        console.log("[Sentry] Инициализирован (development)");
      }
    } catch (err) {
      // Sentry не должен ломать приложение
      if (IS_DEV) console.warn("[Sentry] Ошибка инициализации:", err);
    }
  };

  if ("requestIdleCallback" in window) {
    requestIdleCallback(run, { timeout: 5000 });
  } else {
    setTimeout(run, 0);
  }
}

/**
 * Ленивый экспорт Sentry для ручного логирования.
 * Возвращает промис — используйте `const { Sentry } = await getSentry()`.
 */
export async function getSentry() {
  return loadSentry();
}
