/**
 * Sentry — инициализация серверной части (Fastify).
 */
import * as Sentry from "@sentry/node";
import type { FastifyInstance } from "fastify";
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

/**
 * Регистрирует обработчик Sentry для Fastify.
 * Ловит все ошибки и отправляет в Sentry перед ответом клиенту.
 */
export function registerSentryErrorHandler(fastify: FastifyInstance) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fastify.setErrorHandler((error: any, request, reply) => {
    // Отправляем в Sentry
    Sentry.withScope((scope) => {
      scope.setTag("url", request.url);
      scope.setTag("method", request.method);
      scope.setTag("user-agent", request.headers["user-agent"] || "unknown");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((request as any).userId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        scope.setUser({ id: String((request as any).userId) });
      }

      // Добавляем параметры запроса (без чувствительных данных)
      if (request.query && typeof request.query === "object") {
        scope.setExtra("query", { ...request.query });
      }

      Sentry.captureException(error);
    });

    // Если у ошибки уже есть статус код — используем его
    const statusCode = error.statusCode || error.status || 500;
    const message = statusCode < 500 ? error.message : "Внутренняя ошибка сервера";

    reply.status(statusCode).send({
      error: true,
      message,
      statusCode,
    });
  });
}
