/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import { redis } from "../lib/redis.js";
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

      logger.debug("Пользователь аутентифицирован", {
        userId: payload.userId,
        role: payload.role,
      });

      // Роль читаем из JWT-payload, а не из БД.
      // JWT-токен выдаётся/обновляется при логине и refresh, роль в нём актуальна на момент выдачи.
      // При смене роли админом пользователь получит новую роль после перелогина или refresh.
      // Для более быстрой смены роли без перелогина можно кэшировать role в Redis.
      (request as any).user = {
        userId: payload.userId,
        username: payload.username,
        role: payload.role || "user",
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
