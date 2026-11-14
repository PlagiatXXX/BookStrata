import type { FastifyRequest } from "fastify";
import { config } from "../config/env.js";

/**
 * Проверяет, является ли запрос внутренним запросом от пререндера.
 * Пререндер передаёт специальный секрет в заголовке x-prerender-secret,
 * чтобы обходить глобальный rate-limit при генерации статических страниц.
 */
export function isPrerenderRequest(req: FastifyRequest): boolean {
  const secret = req.headers["x-prerender-secret"];
  return Boolean(
    config.PRERENDER_SECRET &&
    secret &&
    secret === config.PRERENDER_SECRET,
  );
}
