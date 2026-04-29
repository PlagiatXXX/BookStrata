import type { FastifyRequest, FastifyReply } from "fastify";
import { createLogger } from "../lib/logger.js";

const logger = createLogger("RequireRole", { color: "yellow" });

export type RoleName = "admin" | "moderator" | "user";

/**
 * Middleware для проверки роли пользователя
 * @param allowedRoles - Массив разрешённых ролей
 */
export function requireRole(...allowedRoles: RoleName[]) {
  return async function (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    // Проверка авторизации
    const user = request.user;

    if (!user) {
      logger.warn("Попытка доступа без авторизации", {
        url: request.url,
        method: request.method,
      });
      return reply.code(401).send({ error: "Требуется авторизация" });
    }

    const userRole = user.role;

    if (!userRole || !allowedRoles.includes(userRole as RoleName)) {
      logger.warn("Попытка доступа без достаточных прав", {
        userId: user.userId,
        username: user.username,
        userRole,
        requiredRoles: allowedRoles,
        url: request.url,
        method: request.method,
      });
      return reply
        .code(403)
        .send({ error: "Недостаточно прав для выполнения этой операции" });
    }

    logger.debug("Доступ разрешён", {
      userId: user.userId,
      username: user.username,
      userRole,
      requiredRoles: allowedRoles,
    });
  };
}

/**
 * Упрощённый middleware для проверки одной роли
 */
export function requireSingleRole(role: RoleName) {
  return requireRole(role);
}

/**
 * Middleware для проверки прав администратора или модератора
 */
export async function requireAdminOrModerator(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = request.user;

  if (!user) {
    return reply.code(401).send({ error: "Требуется авторизация" });
  }

  const userRole = user.role;

  if (!userRole || !["admin", "moderator"].includes(userRole)) {
    logger.warn("Попытка доступа без прав администратора/модератора", {
      userId: user.userId,
      username: user.username,
      userRole,
      url: request.url,
      method: request.method,
    });
    return reply
      .code(403)
      .send({ error: "Требуется роль администратора или модератора" });
  }
}
