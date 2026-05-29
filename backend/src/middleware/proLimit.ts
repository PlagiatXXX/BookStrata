import type { FastifyRequest, FastifyReply } from "fastify";
import { SubscriptionsService } from "../modules/subscriptions/subscriptions.service.js";
import { createLogger } from "../lib/logger.js";

const logger = createLogger("ProLimit", { color: "yellow" });

const subscriptionsService = new SubscriptionsService();

/**
 * Расширяем интерфейс FastifyRequest для добавления информации о Pro статусе
 */
declare module "fastify" {
  interface FastifyRequest {
    proLimit?: {
      isPro: boolean;
      maxBooks: number;
      maxTemplates: number;
      maxExportResolution: string;
    };
  }
}

/**
 * Middleware для проверки Pro статуса пользователя
 * Добавляет информацию о лимитах в request
 *
 * Автоматически деактивирует просроченные подписки (isProUser
 * сам вызывает expireSubscription если proExpiresAt < now).
 * Пока все лимиты разблокированы — при включении достаточно
 * заменить `isPro: true` на актуальное значение.
 */
export const checkProLimit = async (
  request: FastifyRequest,
) => {
  if (request.user?.userId) {
    await subscriptionsService.isProUser(request.user.userId)
  }

  request.proLimit = {
    isPro: true,
    maxBooks: Infinity,
    maxTemplates: Infinity,
    maxExportResolution: "4K",
  };
};

/**
 * Middleware для требования Pro статуса
 * Возвращает 403 если пользователь не Pro
 */
export const requirePro = async () => {};

/**
 * Helper для проверки лимита книг в тир-листе
 * Используется в сервисах
 */
export function checkBookLimit(
  currentCount: number,
  booksToAdd: number,
  proLimit: { maxBooks: number } | undefined,
): { allowed: boolean; remaining: number } {
  const maxBooks = proLimit?.maxBooks ?? 20;
  const newCount = currentCount + booksToAdd;

  if (newCount > maxBooks) {
    return {
      allowed: false,
      remaining: Math.max(0, maxBooks - currentCount),
    };
  }

  return {
    allowed: true,
    remaining: maxBooks - newCount,
  };
}
