/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import { redis } from "../lib/redis.js";
import { createLogger } from "../lib/logger.js";
import { requestContextAls } from "./requestContext.js";
import { config } from "../config/env.js";

const logger = createLogger("AuthPlugin", {
  color: "blue",
  level: config.NODE_ENV === "development" ? "warn" : "info",
});

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
      const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

      logger.debug("Пользователь аутентифицирован", {
        userId: payload.userId,
        role: payload.role,
      });

      // Сначала пытаемся получить актуальную роль из Redis-кэша, затем из БД.
      // Это гарантирует, что при смене роли админом права обновятся в течение ~60 секунд,
      // а не ждут перелогина (7-14 дней с текущими сроками жизни JWT).
      let role = payload.role || "user";
      try {
        const cacheKey = `user:role:${payload.userId}`;
        const cachedRole = await redis.get(cacheKey);

        if (cachedRole) {
          role = cachedRole;
        } else {
          const prisma = (fastify as any).prisma;
          if (prisma) {
            const dbUser = await prisma.user.findUnique({
              where: { id: payload.userId },
              select: { role: { select: { name: true } } },
            });
            if (dbUser?.role?.name) {
              role = dbUser.role.name;
            }
          }
          // Кэшируем на 60 секунд — баланс между производительностью и актуальностью
          redis.set(cacheKey, role, "EX", 60).catch(() => {});
        }
      } catch {
        // Redis или БД недоступны — используем роль из JWT (не меняется до релогина)
      }

      (request as any).user = {
        userId: payload.userId,
        username: payload.username,
        role,
      };

      // Прокидываем userId в AsyncLocalStorage для логирования
      const alsStore = requestContextAls.getStore();
      if (alsStore) {
        alsStore.userId = payload.userId;
      }

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
