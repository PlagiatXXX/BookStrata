/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import { redis } from "../lib/redis.js";
import { RolesService } from "../modules/roles/roles.service.js";
import { createLogger } from "../lib/logger.js";

const logger = createLogger("AuthPlugin", {
  color: "blue",
  level: process.env.NODE_ENV === "development" ? "warn" : "info",
});

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  logger.error("FATAL: JWT_SECRET is not defined in your .env file");
  process.exit(1);
}

interface JwtPayload {
  userId: number;
  username: string;
  role?: string;
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Добавляем хук для автоматической проверки токена
  fastify.addHook("onRequest", async (request) => {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // Токена нет, оставляем request.user = undefined
      return;
    }

    const token = authHeader.substring(7);

    try {
      const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;

      // Получаем роль из БД для актуальности
      const rolesService = new RolesService((fastify as any).prisma);
      const userRole = await rolesService.getUserRole(payload.userId);

      logger.debug("Пользователь аутентифицирован", {
        userId: payload.userId,
        role: userRole?.name || payload.role,
      });

      (request as any).user = {
        userId: payload.userId,
        username: payload.username,
        role: userRole?.name || payload.role,
      };

      // Throttled обновление lastActivityAt (не чаще раза в 60с на пользователя)
      // fire-and-forget, не блокируем ответ
      const lastSeenKey = `last_seen:${payload.userId}`;
      redis.set(lastSeenKey, Date.now(), "PX", 60000, "NX")
        .then((reply) => {
          if (reply === "OK") {
            const prisma = (fastify as any).prisma;
            if (prisma) {
              prisma.$executeRaw`UPDATE "User" SET "last_activity_at" = NOW() WHERE "id" = ${payload.userId}`
                .catch((err: unknown) => {
                  logger.error("Ошибка обновления lastActivityAt", {
                    error: err instanceof Error ? err.message : String(err),
                  });
                });
            }
          }
        })
        .catch(() => {
          // Redis может быть недоступен — не критично
        });
    } catch (error) {
      // Токен невалидный, оставляем request.user = undefined
      // Проверка будет в middleware requireRole
      logger.error("Невалидный токен", {
        error,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
};

export default fp(authPlugin, {
  name: "auth-plugin",
});
