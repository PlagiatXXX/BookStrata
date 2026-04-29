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
 */
export const checkProLimit = async (
  request: FastifyRequest,
) => {
  const user = request.user;

  if (!user) {
    // Неавторизованный пользователь — стандартные лимиты
    request.proLimit = {
      isPro: false,
      maxBooks: 20,
      maxTemplates: 5,
      maxExportResolution: "720p",
    };
    return;
  }

  try {
    // Администраторы и модераторы имеют Pro функции автоматически
    const userRole = request.user?.role;
    const hasAdminRole = userRole === "admin" || userRole === "moderator";

    const isPro =
      hasAdminRole || (await subscriptionsService.isProUser(user.userId));

    request.proLimit = {
      isPro,
      maxBooks: isPro ? Infinity : 20,
      maxTemplates: isPro ? Infinity : 5,
      maxExportResolution: isPro ? "4K" : "720p",
    };

    logger.debug("Pro лимиты установлены", {
      userId: user.userId,
      userRole,
      isPro,
      maxBooks: request.proLimit.maxBooks,
    });
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), {
      action: "checkProLimit",
      userId: user.userId,
    });

    // В случае ошибки — стандартные лимиты
    request.proLimit = {
      isPro: false,
      maxBooks: 20,
      maxTemplates: 5,
      maxExportResolution: "720p",
    };
  }
};

/**
 * Middleware для требования Pro статуса
 * Возвращает 403 если пользователь не Pro
 */
export const requirePro = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  await checkProLimit(request);

  if (!request.proLimit?.isPro) {
    return reply.code(403).send({
      error: "Требуется Pro подписка",
      required: true,
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
