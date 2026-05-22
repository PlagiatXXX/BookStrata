import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import jwt from "jsonwebtoken";
import type { PrismaClient } from "@prisma/client";

// Для тестов используем моки вместо реальной БД
const mockPrisma = {
  user: {
    upsert: async () => ({}),
    create: async () => ({}),
    findUnique: async () => null,
    findMany: async () => [],
    update: async () => ({}),
    delete: async () => ({}),
    count: async () => 0,
  },
  tierList: {
    create: async () => ({}),
    findUnique: async () => null,
    findMany: async () => [],
    update: async () => ({}),
    delete: async () => ({}),
    count: async () => 0,
  },
  tier: {
    create: async () => ({}),
    createMany: async () => ({}),
    findMany: async () => [],
    update: async () => ({}),
    delete: async () => ({}),
    deleteMany: async () => ({}),
  },
  book: {
    create: async () => ({}),
    createMany: async () => ({}),
    findMany: async () => [],
    update: async () => ({}),
    delete: async () => ({}),
  },
  bookPlacement: {
    create: async () => ({}),
    upsert: async () => ({}),
    findMany: async () => [],
    update: async () => ({}),
    delete: async () => ({}),
    count: async () => 0,
  },
  template: {
    create: async () => ({}),
    findUnique: async () => null,
    findMany: async () => [],
    update: async () => ({}),
    delete: async () => ({}),
    count: async () => 0,
  },
  tierListLike: {
    create: async () => ({}),
    findMany: async () => [],
    deleteMany: async () => ({}),
    count: async () => 0,
  },
  templateLike: {
    create: async () => ({}),
    findMany: async () => [],
    deleteMany: async () => ({}),
    count: async () => 0,
  },
  battle: {
    create: async () => ({}),
    findUnique: async () => null,
    findMany: async () => [],
    update: async () => ({}),
    count: async () => 0,
  },
  battleParticipant: {
    create: async () => ({}),
    findUnique: async () => null,
    findMany: async () => [],
    update: async () => ({}),
    count: async () => 0,
    delete: async () => ({}),
  },
  battleVote: {
    create: async () => ({}),
    findUnique: async () => null,
    findMany: async () => [],
  },
  battleApplication: {
    create: async () => ({}),
    findUnique: async () => null,
    findFirst: async () => null,
    findMany: async () => [],
    update: async () => ({}),
    count: async () => 0,
  },
  newsArticle: {
    create: async () => ({}),
    findUnique: async () => null,
    findFirst: async () => null,
    findMany: async () => [],
    update: async () => ({}),
    delete: async () => ({}),
    count: async () => 0,
  },
  role: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async () => ({}),
  },
  $transaction: async (fn: any) => {
    if (typeof fn === "function") {
      return fn(mockPrisma);
    }
    return [];
  },
};

const JWT_SECRET = process.env.JWT_SECRET || "test-secret";

// Функция для создания тестового сервера
export async function createTestServer() {
  const fastify = Fastify({
    logger: false, // Отключаем логирование в тестах
    bodyLimit: 10 * 1024 * 1024,
  });

  // Регистрируем CORS
  await fastify.register(cors, {
    origin: true,
    methods: ["GET", "HEAD", "PUT", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Регистрируем rate limit (увеличенный для тестов)
  await fastify.register(rateLimit, {
    max: 1000,
    timeWindow: "1 minute",
  });

  // Мокируем prisma для всех модулей
  fastify.decorate("prisma", mockPrisma as unknown as PrismaClient);

  // Регистрируем роуты с моками
  // Для простоты тестов возвращаем заглушки
  fastify.get("/health", async () => ({ status: "ok" }));

  // Глобальный обработчик ошибок
  fastify.setErrorHandler((error, request, reply) => {
    const statusCode = (error as any).statusCode || 500;
    return reply.code(statusCode).send({
      message: (error as any).message || "Internal Server Error",
    });
  });

  return fastify;
}

// Функция для создания тестового JWT токена
export function createTestToken(userId: number, username: string) {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: "1h" });
}

// Функция для очистки БД между тестами (для моков - noop)
export async function cleanupDatabase() {
  // Для моков не нужно очищать
  return Promise.resolve();
}
