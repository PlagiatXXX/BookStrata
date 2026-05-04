import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const DEFAULT_SLOW_QUERY_THRESHOLD_MS = 500;
const IGNORED_DEV_QUERIES = new Set([
  "BEGIN",
  "COMMIT",
  "ROLLBACK",
  "DEALLOCATE ALL",
  "SELECT 1",
]);

function getSlowQueryThresholdMs(): number {
  const rawValue = process.env.PRISMA_SLOW_QUERY_THRESHOLD_MS;
  const parsedValue = Number(rawValue);

  if (!rawValue || Number.isNaN(parsedValue) || parsedValue < 0) {
    return DEFAULT_SLOW_QUERY_THRESHOLD_MS;
  }

  return parsedValue;
}

function shouldLogSlowQuery(query: string, duration: number): boolean {
  if (duration < getSlowQueryThresholdMs()) {
    return false;
  }

  const normalizedQuery = query.trim().toUpperCase();
  return !IGNORED_DEV_QUERIES.has(normalizedQuery);
}

/**
 * Обёртка с retry-логикой для Prisma-клиента.
 * Автоматически повторяет запросы при PrismaClientInitializationError
 * (например, когда Neon "просыпается").
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // PrismaClientInitializationError — ошибка подключения к БД
    if (
      error instanceof Prisma.PrismaClientInitializationError &&
      retries > 0
    ) {
      console.warn(
        `[Prisma Retry] Ошибка подключения к БД. Повторная попытка через ${RETRY_DELAY_MS}мс... (осталось попыток: ${retries - 1})`,
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
}

/**
 * Health check — проверяет доступность БД.
 * Возвращает true, если БД доступна, иначе false.
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Ждёт доступности БД с таймаутом (для старта сервера).
 * @param maxWaitMs — максимальное время ожидания (мс)
 * @returns true, если БД доступна
 */
export async function waitForDatabase(maxWaitMs = 30000): Promise<boolean> {
  const startTime = Date.now();
  const checkInterval = 2000;

  while (Date.now() - startTime < maxWaitMs) {
    const isConnected = await checkDatabaseConnection();
    if (isConnected) {
      console.log("[Prisma] Соединение с БД установлено");
      return true;
    }
    console.log(
      `[Prisma] БД недоступна. Повторная попытка через ${checkInterval}мс...`,
    );
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }

  console.error(`[Prisma] Не удалось подключиться к БД за ${maxWaitMs}мс`);
  return false;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? [
            { emit: "event", level: "query" },
            { emit: "stdout", level: "error" },
            { emit: "stdout", level: "warn" },
          ]
        : [{ emit: "stdout", level: "error" }],
  });
// Логирование медленных запросов в dev (>100мс)
if (process.env.NODE_ENV === "development") {
  // @ts-expect-error — типы Prisma для $on('query') требуют generic-конфига логов
  prisma.$on("query", (e: { duration: number; query: string }) => {
    if (shouldLogSlowQuery(e.query, e.duration)) {
      console.warn(
        `🐌 SLOW QUERY (${e.duration}ms): ${e.query.substring(0, 200)}`,
      );
    }
  });
}
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

type PrismaCallable = (...args: unknown[]) => unknown;

// Экспортируем прокси-объект с автоматическим retry для всех методов
export const prismaWithRetry = new Proxy(prisma, {
  get(target, prop, receiver) {
    const original = Reflect.get(target, prop, receiver) as unknown;

    // Если это функция — оборачиваем с retry
    if (typeof original === "function") {
      return (...args: unknown[]) =>
        withRetry(() =>
          Promise.resolve((original as PrismaCallable).apply(target, args)),
        );
    }

    // Если это модель (user, tierList и т.д.) — оборачиваем все методы модели
    if (original && typeof original === "object") {
      return new Proxy(original, {
        get(modelTarget, modelProp, modelReceiver) {
          const modelMethod = Reflect.get(
            modelTarget,
            modelProp,
            modelReceiver,
          ) as unknown;
          if (typeof modelMethod === "function") {
            return (...args: unknown[]) =>
              withRetry(() =>
                Promise.resolve(
                  (modelMethod as PrismaCallable).apply(modelTarget, args),
                ),
              );
          }
          return modelMethod;
        },
      });
    }

    return original;
  },
});

export default prisma;
