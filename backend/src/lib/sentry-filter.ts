/**
 * Классификация ошибок для отчётности.
 *
 * В Sentry должны попадать только серверные поломки: 4xx — это нормальный
 * ответ API (истёк токен, не найдено, мало прав, превышен лимит), и раньше
 * такие ответы уходили в Sentry как «ошибки», топя настоящие сбои в шуме.
 */
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

/**
 * HTTP-статус, с которым ошибка уйдёт клиенту.
 * Повторяет приоритеты errorHandler: Zod и коды Prisma проверяются раньше
 * общего statusCode, потому что у этих ошибок своего статуса нет.
 */
export function errorStatusCode(error: unknown): number {
  if (error instanceof ZodError) {
    return 400;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return 409; // нарушение уникальности
    if (error.code === "P2025") return 404; // запись не найдена
  }

  const candidate = error as { statusCode?: unknown; status?: unknown } | null;
  const status = candidate?.statusCode ?? candidate?.status;

  return typeof status === "number" ? status : 500;
}

/** Отправлять ли ошибку в Sentry: клиентские 4xx — нет, серверные 5xx — да */
export function shouldReportToSentry(error: unknown): boolean {
  return errorStatusCode(error) >= 500;
}
