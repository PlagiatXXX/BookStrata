/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import compress from "@fastify/compress";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import rateLimit from "@fastify/rate-limit";
import staticFiles from "@fastify/static";
import { redis, RedisRateLimitStore } from "./lib/redis.js";
import LocalStore from "@fastify/rate-limit/store/LocalStore.js";
import { prisma, waitForDatabase } from "./lib/prisma.js";
import { ErrorCodes, createApiError } from "./lib/api-response.js";
import { achievementRoutes } from "../src/modules/achievements/achievements.route.js";
import { battleRoutes } from "../src/modules/battles/battles.route.js";
import { forumRoutes } from "../src/modules/forum/forum.route.js";
import { externalNewsRoutes } from "../src/modules/external-news/external-news.route.js";
import { donorRoutes } from "../src/modules/donors/donors.route.js";
import { discussionRoutes } from "../src/modules/discussions/discussions.route.js";
import { feedbackRoutes } from "../src/modules/feedback/feedback.route.js";
import { ratingsRoutes } from "../src/modules/ratings/ratings.route.js";
import { adminStatsRoutes } from "../src/modules/admin-stats/admin-stats.route.js";
import { tierListRoutes } from "../src/modules/tier-lists/tierList.route.js";
import { authRoutes } from "../src/modules/auth/auth.route.js";
import { userRoutes } from "../src/modules/users/users.route.js";
import { avatarRoutes } from "../src/modules/avatars/avatar.route.js";
import { booksRoutes } from "../src/modules/books/books.route.js";
import { livelibRoutes } from "../src/modules/livelib/livelib.route.js";
import { newsRoutes } from "../src/modules/news/news.route.js";
import { rolesRoutes } from "../src/modules/roles/roles.route.js";
import { subscriptionsRoutes } from "../src/modules/subscriptions/subscriptions.routes.js";
import { aiLibrarianRoutes } from "../src/modules/ai-librarian/ai-librarian.route.js";
import { proxyRoutes } from "../src/modules/proxy/proxy.route.js";
import { collectionRoutes } from "../src/modules/collections/collection.route.js";
import { moderationRoutes } from "../src/modules/moderation/moderation.route.js";
import templatesPlugin from "../src/modules/templates/templates.plugin.js";
import logFromFrontend from "../src/plugins/logFromFrontend.js";
import requestContext from "../src/plugins/requestContext.js";
import authPlugin from "../src/plugins/auth.js";
import * as Sentry from "@sentry/node";
import { errorNotifier } from "./lib/errorNotifier.js";
import { initSentry } from "./lib/sentry.js";
import { registerAchievementSubscriptions } from "./lib/event-subscriptions.js";
import { registerAnalyticsSubscriptions } from "./lib/analytics-subscriptions.js";
import { SubscriptionsService } from "./modules/subscriptions/subscriptions.service.js";


const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET", "CLIENT_URL"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`FATAL: ${envVar} is not defined in your .env file`);
    process.exit(1);
  }
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is not defined in your .env file");
  process.exit(1);
}

const CLIENT_URL = process.env.CLIENT_URL;
if (!CLIENT_URL) {
  console.error("FATAL: CLIENT_URL is not defined in your .env file");
  process.exit(1);
}

// Инициализация Telegram уведомлений об ошибках
errorNotifier.initialize();

// Инициализация Sentry
initSentry();

// Определяем, режим разработки или нет
const isDev = process.env.NODE_ENV !== "production";

// 2. ЗАМЕНЯЕМ КОНФИГУРАЦИЮ ЛОГГЕРА НА БОЛЕЕ ПРОДВИНУТУЮ
const fastify = Fastify({
  ajv: {
    customOptions: {
      allowUnionTypes: true,
    },
  },
  logger: {
    level: isDev ? "debug" : "info",
    ...(isDev && {
      transport: {
        target: "pino-pretty",
      },
    }),
  },
  bodyLimit: 30 * 1024 * 1024, // 30MB лимит для save-all с base64 изображениями
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

// Компрессия ответов (gzip/deflate) — регистрируем до CORS,
// чтобы сжимать все ответы, включая CORS-заголовки
await fastify.register(compress, {
  global: true,
  threshold: 1024, // Не сжимать ответы меньше 1 KB
});

fastify.register(cors, {
  origin: CLIENT_URL,
  methods: ["GET", "HEAD", "PUT", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Разрешаем отправку cookie
});

const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: [
    "'self'",
    "https://smartcaptcha.yandexcloud.net",
    "https://mc.yandex.ru",
    "https://yastatic.net",
  ],
  styleSrc: [
    "'self'",
    "'unsafe-inline'",
    "https://fonts.googleapis.com",
    "https://smartcaptcha.yandexcloud.net",
  ],
  fontSrc: ["'self'", "https://fonts.gstatic.com"],
  imgSrc: ["'self'", "data:", "https:", "blob:"],
  frameSrc: [
    "https://smartcaptcha.yandexcloud.net",
    "https://mc.yandex.ru",
  ],
  connectSrc: [
    "'self'",
    "https://smartcaptcha.yandexcloud.net",
    "https://api.telegram.org",
    "https://mc.yandex.ru",
    "wss://mc.yandex.ru",
    "https://*.ingest.sentry.io",
    "https://*.ingest.de.sentry.io",
  ],
  workerSrc: ["'self'", "blob:"],
};

await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: cspDirectives,
  },
  strictTransportSecurity: {
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true,
  },
  xFrameOptions: { action: "sameorigin" },
  xContentTypeOptions: true,
  referrerPolicy: { policy: "origin-when-cross-origin" },
  xDnsPrefetchControl: { allow: true },
});

// Раздача статических файлов (для локального хранения изображений)
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const __dirname = dirname(fileURLToPath(import.meta.url))
const uploadsDir = join(__dirname, '..', 'uploads')
fastify.register(staticFiles, {
  root: uploadsDir,
  prefix: '/uploads/',
  decorateReply: false,
})

// Регистрируем Prisma как декоратор (доступен через fastify.prisma)
fastify.decorate("prisma", prisma);

// Регистрируем плагин cookie
await fastify.register(cookie, {
  secret: JWT_SECRET, // Для подписи cookie
});

// Health check endpoint for deployment
fastify.get("/health", async () => {
  const { checkDatabaseConnection } = await import("./lib/prisma.js");
  const isDbConnected = await checkDatabaseConnection();

  return {
    status: isDbConnected ? "ok" : "degraded",
    database: isDbConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  };
});

// Аутентификация ДО rate limit чтобы request.user был доступен
fastify.register(authPlugin);
fastify.register(requestContext);
fastify.register(logFromFrontend);


let StoreClass: typeof RedisRateLimitStore | typeof LocalStore = RedisRateLimitStore;
try {
  await redis.ping();
  console.log('✅ Redis rate limit store ready');
} catch {
  console.warn('⚠️ Redis unavailable, using in-memory rate limit store');
  StoreClass = LocalStore;

  // Уведомление в Telegram о падении Redis
  errorNotifier.notify({
    message: "Redis недоступен — сервер работает на in-memory rate limit",
    stack: undefined,
    url: "/health",
    method: "STARTUP",
    userId: "system",
    userAgent: undefined,
    query: undefined,
    origin: undefined,
    timestamp: new Date().toISOString(),
  }).catch(console.error);
}

const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX || "", 10);

await fastify.register(rateLimit, {
  global: true,
  max: rateLimitMax
    ? rateLimitMax
    : (req) => {
        return (req as any).user?.userId ? 200 : 30;
      },
  timeWindow: "1 minute",
  store: StoreClass as any,
  keyGenerator: (req) => {
    const userId = (req as any).user?.userId;
    return userId ? `user:${userId}` : `ip:${req.ip}`;
  },
  addHeadersOnExceeding: {
    "x-ratelimit-limit": true,
    "x-ratelimit-remaining": true,
    "x-ratelimit-reset": true,
  },
  addHeaders: {
    "x-ratelimit-limit": true,
    "x-ratelimit-remaining": true,
    "x-ratelimit-reset": true,
    "retry-after": true,
  },
});

// Глобальный обработчик ошибок
fastify.setErrorHandler(async (error: any, request, reply) => {
  fastify.log.error(
    error,
    `Необработанная ошибка запроса: ${request.method} ${request.url}`,
  );

  // Отправка уведомлений об ошибке
  const queryParams = request.url.includes("?") ? request.url.split("?")[1] : undefined;

  errorNotifier
    .notify({
      message: error.message ?? "Неизвестная ошибка",
      stack: error.stack,
      url: request.url.split("?")[0],
      method: request.method,
      query: queryParams,
      userId: (request as any).user?.userId?.toString() ?? "anonymous",
      userAgent: request.headers["user-agent"],
      origin: request.headers.origin || request.headers.referer,
      timestamp: new Date().toISOString(),
    })
    .catch(console.error);

  // Отправка в Sentry
  Sentry.withScope((scope) => {
    scope.setTag("url", request.url);
    scope.setTag("method", request.method);
    scope.setTag("user-agent", request.headers["user-agent"] || "unknown");
    if ((request as any).userId) {
      scope.setUser({ id: String((request as any).userId) });
    }
    if (queryParams) {
      scope.setExtra("query", queryParams);
    }
    Sentry.captureException(error);
  });

  if (error.statusCode === 429) {
    return reply
      .code(429)
      .send(createApiError(ErrorCodes.RATE_LIMIT_EXCEEDED, "Слишком много запросов, попробуйте позже."));
  }

  if (
    error.message === "Невалидный токен" ||
    error.message === "Unauthorized" ||
    error.statusCode === 401
  ) {
    return reply.code(401).send(createApiError(ErrorCodes.UNAUTHORIZED, error.message || "Unauthorized"));
  }

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2002"
  ) {
    const target = (error.meta as { target?: string[] })?.target ?? [];
    if (target.includes("username")) {
      return reply
        .code(409)
        .send(createApiError(ErrorCodes.USERNAME_TAKEN, "Пользователь с таким именем уже существует."));
    }
    return reply
      .code(409)
      .send(createApiError(ErrorCodes.CONFLICT, "Конфликт данных."));
  }

  // Для отладки в режиме разработки возвращаем сообщение ошибки
  const isDev = process.env.NODE_ENV !== "production";
  return reply.code(error.statusCode || 500).send(
    createApiError(
      ErrorCodes.INTERNAL_ERROR,
      isDev ? error.message : "Сервер не был подготовлен для этой цели.",
      isDev ? { stack: error.stack } : undefined,
    ),
  );
});

await fastify.register(swagger, {
  swagger: {
    info: {
      title: "BookStrata Pro API",
      description: `
## API Documentation for BookStrata Pro

### Error Response Format
All errors follow a standardized format:
\`\`\`json
{
  "error": {
    "code": "error_code",
    "message": "Human readable message",
    "details": {} // optional
  }
}
\`\`\`

### Error Codes
| Code | Description |
|------|-------------|
| validation_error | Request validation failed |
| unauthorized | Authentication required |
| token_invalid | JWT token is invalid |
| refresh_token_expired | Refresh token expired |
| forbidden | Insufficient permissions |
| not_found | Resource not found |
| conflict | Resource already exists |
| rate_limit_exceeded | Too many requests |
| internal_error | Server error |

### Pagination
List endpoints return pagination metadata and links:
\`\`\`json
{
  "data": [...],
  "meta": { "totalItems": 100, "totalPages": 10, "currentPage": 1 },
  "links": { "self": "...", "next": "...", "prev": "...", "last": "..." }
}
\`\`\`

### Authentication
All protected endpoints require Bearer token in Authorization header.
      `.trim(),
      version: "1.1.0",
    },
    schemes: ["http", "https"],
    produces: ["application/json"],
    consumes: ["application/json"],
    securityDefinitions: {
      bearerAuth: {
        type: "apiKey",
        name: "Authorization",
        in: "header",
        description: "Enter your bearer token in the format 'Bearer <token>'",
      },
    },
    tags: [
      { name: "Auth", description: "Authentication endpoints" },
      { name: "Users", description: "User management" },
      { name: "Tier Lists", description: "Tier list CRUD operations" },
      { name: "News", description: "News articles" },
      { name: "Battles", description: "Battles and voting" },
      { name: "Achievements", description: "User achievements" },
      { name: "Avatars", description: "Avatar generation" },
      { name: "Books", description: "Book search" },
      { name: "Subscriptions", description: "Subscription management" },
    ],
  },
});

await fastify.register(swaggerUi, {
  routePrefix: "/documentation",
  uiConfig: {
    docExpansion: "list", // 'full', 'none'
    deepLinking: true,
  },
});

// Регистрируем все роуты из модулей
fastify.register(adminStatsRoutes, { prefix: "/api/admin" });
fastify.register(authRoutes, { prefix: "/api/auth" });
fastify.register(userRoutes, { prefix: "/api/users" });
fastify.register(avatarRoutes, { prefix: "/api/avatars" });
fastify.register(booksRoutes, { prefix: "/api/books" });
fastify.register(livelibRoutes, { prefix: "/api/books" });
fastify.register(tierListRoutes, { prefix: "/api/tier-lists" });
fastify.register(newsRoutes, { prefix: "/api/news" });
fastify.register(rolesRoutes, { prefix: "/api" });
fastify.register(subscriptionsRoutes, { prefix: "/api/subscriptions" });
fastify.register(achievementRoutes, { prefix: "/api/achievements" });
fastify.register(battleRoutes, { prefix: "/api/battles" });
fastify.register(forumRoutes, { prefix: "/api/forum" });
fastify.register(externalNewsRoutes, { prefix: "/api/external-news" });

// Регистрируем контроллер шаблонов с префиксом /api
fastify.register(templatesPlugin, { prisma, prefix: "/api" });

// Donors (публичный список + админка)
fastify.register(donorRoutes, { prefix: "/api/donors" });

// Discussions (обсуждения на странице битв)
fastify.register(discussionRoutes, { prefix: "/api/discussions" });

// Feedback (обратная связь)
fastify.register(feedbackRoutes, { prefix: "/api/feedback" });

// Ratings (оценки книг)
fastify.register(ratingsRoutes, { prefix: "/api/ratings" });

// AI Librarian
fastify.register(aiLibrarianRoutes, { prefix: "/api/ai" });

// Moderation (админские/модераторские инструменты)
fastify.register(moderationRoutes, { prefix: "/api/moderation" });

fastify.register(proxyRoutes, { prefix: "/api/proxy" });
fastify.register(collectionRoutes, { prefix: "/api/collections" });

// Admin: очистка load test пользователей
import { adminCleanupRoutes } from "../src/modules/admin/admin-cleanup.route.js";
fastify.register(adminCleanupRoutes, { prefix: "/api/admin" });

// Analytics
import { analyticsRoutes } from "../src/modules/analytics/analytics.route.js";
fastify.register(analyticsRoutes, { prefix: "/api/analytics" });

// Admin: аналитика
fastify.register(analyticsRoutes, { prefix: "/api/admin/analytics" });

// Sitemap (без /api префикса, доступен по /sitemap.xml)
import { sitemapRoutes } from "../src/modules/sitemap/sitemap.route.js";
fastify.register(sitemapRoutes);

// RSS-фид (без /api префикса, доступен по /rss.xml)
import { rssRoutes } from "../src/modules/rss/rss.route.js";
fastify.register(rssRoutes);

// Инициализация подписок на события
registerAchievementSubscriptions();
registerAnalyticsSubscriptions();

// Периодическая деактивация просроченных Pro-подписок (раз в час)
const subscriptionsCleanup = new SubscriptionsService();
setInterval(() => {
  subscriptionsCleanup.expireAllOverdue().catch((err) => {
    fastify.log.error(err, "Ошибка при деактивации просроченных подписок");
  });
}, 60 * 60 * 1000);

// Единая инициализация всех модулей при старте
import { seedAllModules } from "./lib/module-loader.js"



// ========== Graceful Shutdown ==========
const shutdownSignals = ["SIGTERM", "SIGINT"] as const;

async function gracefulShutdown(signal: string) {
  fastify.log.info(`Получен сигнал ${signal}. Начинаю корректное завершение...`);

  // Даём серверу 10 секунд на завершение текущих запросов
  try {
    await fastify.close();
    fastify.log.info("HTTP-сервер остановлен.");
  } catch (err) {
    fastify.log.error(err, "Ошибка при остановке HTTP-сервера.");
  }

  // Закрываем соединение с БД
  try {
    await prisma.$disconnect();
    fastify.log.info("Prisma отключена.");
  } catch (err) {
    fastify.log.error(err, "Ошибка при отключении Prisma.");
  }

  // Закрываем Redis
  try {
    redis.disconnect();
    fastify.log.info("Redis отключён.");
  } catch (err) {
    fastify.log.error(err, "Ошибка при отключении Redis.");
  }

  fastify.log.info("Сервер завершил работу.");
  process.exit(0);
}

for (const signal of shutdownSignals) {
  process.on(signal, () => gracefulShutdown(signal));
}

const start = async () => {
  try {
    // Ждём доступности БД перед стартом сервера (макс. 30 секунд)
    const isDbReady = await waitForDatabase(30000);
    if (!isDbReady) {
      fastify.log.error("Не удалось подключиться к БД. Сервер не запущен.");
      process.exit(1);
    }

    // Инициализация всех модулей (achievements и т.д.)
    await seedAllModules()

    await fastify.listen({ port: PORT, host: "0.0.0.0" });
    fastify.log.info(`Server listening on port ${PORT}`);

    // Уведомление о старте (только в production)
    if (process.env.NODE_ENV === "production") {
      errorNotifier.notify({
        message: `Сервер запущен. Порт: ${PORT}, режим: ${process.env.NODE_ENV}`,
        url: "/health",
        method: "STARTUP",
        userId: "system",
        timestamp: new Date().toISOString(),
      }).catch(console.error);
    }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
