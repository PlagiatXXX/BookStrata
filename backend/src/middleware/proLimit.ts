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
  let isPro = false
  if (request.user?.userId) {
    isPro = await subscriptionsService.isProUser(request.user.userId)
  }

  request.proLimit = {
    isPro,
    maxBooks: isPro ? Infinity : 30,
    maxTemplates: isPro ? Infinity : 5,
    maxExportResolution: isPro ? "4K" : "HD",
  };
};

/**
 * Middleware для требования Pro статуса
 * Возвращает 403 если пользователь не Pro
 */
export const requirePro = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  if (!request.proLimit?.isPro) {
    return reply.code(403).send({
      error: {
        code: "pro_required",
        message: "Для доступа к этой функции требуется Pro подписка",
      },
    });
  }
};

/**
 * Helper для проверки лимита книг в тир-листе
 * Используется в сервисах
 */
export function checkBookLimit(
  currentCount: number,
  booksToAdd: number,
  proLimit: { maxBooks: number } | undefined,
): { allowed: boolean; remaining: number } {
  const maxBooks = proLimit?.maxBooks ?? 30;
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
