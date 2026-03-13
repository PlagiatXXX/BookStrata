/* eslint-disable @typescript-eslint/no-explicit-any */
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import rateLimit from '@fastify/rate-limit';
import { prisma } from './lib/prisma.js';
import { tierListRoutes } from '../src/modules/tier-lists/tierList.route.js';
import { authRoutes } from '../src/modules/auth/auth.route.js';
import { userRoutes } from '../src/modules/users/users.route.js';
import { avatarRoutes } from '../src/modules/avatars/avatar.route.js';
import { booksRoutes } from '../src/modules/books/books.route.js';
import templatesPlugin from '../src/modules/templates/templates.plugin.js';
import logFromFrontend from '../src/plugins/logFromFrontend.js';
import requestContext from '../src/plugins/requestContext.js';
import { errorNotifier } from './lib/errorNotifier.js';

const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'CLIENT_URL'];
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

// Определяем, режим разработки или нет
const isDev = process.env.NODE_ENV !== 'production';

// 2. ЗАМЕНЯЕМ КОНФИГУРАЦИЮ ЛОГГЕРА НА БОЛЕЕ ПРОДВИНУТУЮ
const fastify = Fastify({
  logger: {
    level: isDev ? 'debug' : 'info',
    ...(isDev && {
      transport: {
        target: 'pino-pretty'
      }
    })
  },
  bodyLimit: 10 * 1024 * 1024, // 10MB лимит для base64 изображений
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;


fastify.register(cors, {
  origin: CLIENT_URL, // <-- Fastify отлично работает с одной строкой
  methods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

// <-- ШАГ 4: Добавляем глобальный обработчик ошибок
fastify.setErrorHandler((error: any, request, reply) => {
  fastify.log.error(error, `Необработанная ошибка запроса: ${request.method} ${request.url}`);
  
  // Отправка уведомления в Telegram
  errorNotifier.notify({
    message: error.message ?? 'Неизвестная ошибка',
    stack: error.stack,
    url: request.url,
    method: request.method,
    userId: request.headers.authorization ? 'authenticated' : 'anonymous',
    timestamp: new Date().toISOString(),
  }).catch(console.error);
  
  if (error.statusCode === 429) {
    return reply.code(429).send({ message: 'Слишком много запросов, попробуйте позже.' });
  }
  if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
    return reply.code(409).send({ message: 'Пользователь с таким именем уже существует.' });
  }
  return reply.code(500).send({ message: 'Сервер не был подготовлен для этой цели.' });
});

await fastify.register(swagger, {
  swagger: {
    info: {
      title: 'BookStrata Pro API',
      description: 'API Documentation for the BookStrata Pro application.',
      version: '1.0.0'
    },
    // Указываем, что API защищено JWT токенами
    securityDefinitions: {
      bearerAuth: {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header',
        description: "Enter your bearer token in the format 'Bearer <token>'"
      }
    },
  }
});

await fastify.register(swaggerUi, {
  routePrefix: '/documentation',
  uiConfig: {
    docExpansion: 'list', // 'full', 'none'
    deepLinking: true
  },
});

// Регистрируем все роуты из модулей
fastify.register(requestContext);
fastify.register(logFromFrontend);
fastify.register(authRoutes, { prefix: '/api/auth' });
fastify.register(userRoutes, { prefix: '/api/users' });
fastify.register(avatarRoutes, { prefix: '/api/avatars' });
fastify.register(booksRoutes, { prefix: '/api/books' });
fastify.register(tierListRoutes, { prefix: '/api/tier-lists' });

// Регистрируем контроллер шаблонов с префиксом /api
fastify.register(templatesPlugin, { prisma, prefix: '/api' });

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`Server listening on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
