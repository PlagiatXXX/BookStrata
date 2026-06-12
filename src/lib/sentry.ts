/**
 * Sentry — инициализация клиентской части.
 * Используем @sentry/browser (без React-специфичных обёрток,
 * чтобы избежать конфликтов с React Compiler).
 */
import * as Sentry from "@sentry/browser";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const IS_DEV = import.meta.env.DEV;

export function initSentry() {
  if (!SENTRY_DSN) {
    if (IS_DEV) {
      console.warn("[Sentry] VITE_SENTRY_DSN не задан, Sentry отключён");
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: IS_DEV ? "development" : "production",
    tracesSampleRate: IS_DEV ? 0 : 0.1,
    // Replays отключены из-за CSP (worker-src blob:)
    // При необходимости включить — добавить worker-src blob: в CSP
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Игнорируем известные неважные ошибки
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Network request failed",
      "Failed to fetch",
      "Load failed",
      // Яндекс.Метрика иногда кидает ошибки
      "ym",
    ],
  });

  if (IS_DEV) {
    console.log("[Sentry] Инициализирован (development)");
  }
}

/** Экспортируем Sentry для ручного логирования */
export { Sentry };
