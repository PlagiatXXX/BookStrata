/**
 * Sentry — инициализация серверной части (Fastify).
 */
import * as Sentry from "@sentry/node";
import { config } from "../config/env.js";

const SENTRY_DSN = config.SENTRY_DSN;
const IS_DEV = config.NODE_ENV !== "production";

export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn("[Sentry] SENTRY_DSN не задан, Sentry отключён");
    return false;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: IS_DEV ? "development" : "production",
    tracesSampleRate: IS_DEV ? 0 : 0.1,
    // Не логируем повторяющиеся healthcheck-запросы
    integrations: [
      Sentry.extraErrorDataIntegration({ depth: 5 }),
    ],
  });

  console.log("[Sentry] Инициализирован");
  return true;
}
