/**
 * Централизованная конфигурация окружения.
 * Все переменные валидируются через Zod один раз при старте.
 *
 * ✅ Типизированный доступ вместо process.env.X
 * ✅ Единая точка отказа — ошибка при старте, а не в рантайме
 * ✅ Дефолты и парсинг типов
 * ✅ Легко тестировать через vi.mock
 */

import { z } from "zod";

const envSchema = z.object({
  // --- Runtime ---
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(8080),

  // --- Database ---
  DATABASE_URL: z.string(),

  // --- Auth ---
  JWT_SECRET: z.string(),
  CLIENT_URL: z.string(),
  RATE_LIMIT_MAX: z.coerce.number().optional(),
  RATE_LIMIT_REGISTER_MAX: z.coerce.number().default(300),
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().default(20),
  ADMIN_ROLE_CHANGE_SECRET: z.string().optional(),

  // --- Books API ---
  GOOGLE_BOOKS_API_KEY: z.string().optional(),

  // --- Avatars (Pollinations) ---
  POLLINATIONS_API_KEY: z.string().optional(),
  POLLINATIONS_MODEL: z.string().default("zimage"),

  // --- AI Librarian ---
  CUSTOM_AI_BASE_URL: z
    .string()
    .default("https://api.neuraldeep.ru/v1"),
  CUSTOM_AI_API_KEY: z.string().default(""),
  CUSTOM_AI_MODEL: z.string().default("gpt-oss-120b"),
  OPENROUTER_API_KEY: z.string().default(""),
  OPENROUTER_MODEL: z
    .string()
    .default("meta-llama/llama-3.1-8b-instruct"),

  // --- Redis ---
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // --- SMTP / Email ---
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(2525),
  SMTP_SECURE: z.enum(["true", "false"]).default("false"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z
    .string()
    .default('"BookStrata Pro" <noreply@bookstrata.pro>'),
  ERROR_NOTIFY_EMAIL: z.string().optional(),

  // --- OAuth ---
  VK_CLIENT_ID: z.string().default(""),
  VK_CLIENT_SECRET: z.string().default(""),
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),

  // --- Captcha ---
  SMARTCAPTCHA_SECRET_KEY: z.string().default(""),

  // --- Image Storage ---
  STORAGE_PROVIDER: z
    .enum(["cloudinary", "s3", "yandex", "local"])
    .default("cloudinary"),
  UPLOADS_DIR: z.string().optional(),
  UPLOADS_BASE_URL: z.string().default("/uploads"),

  // --- Cloudinary ---
  CLOUDINARY_URL: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // --- S3 ---
  S3_BUCKET: z.string().optional(),
  S3_ENDPOINT: z
    .string()
    .default("https://storage.yandexcloud.net"),
  S3_REGION: z.string().default("ru-central1"),
  S3_ACCESS_KEY_ID: z.string().default(""),
  S3_SECRET_ACCESS_KEY: z.string().default(""),
  S3_PUBLIC_HOST: z.string().default("storage.yandexcloud.net"),

  // --- Monitoring ---
  SENTRY_DSN: z.string().optional(),

  // --- Logging ---
  LOG_DIR: z.string().default("/var/log/tiermaker"),

  // --- Prisma ---
  PRISMA_SLOW_QUERY_THRESHOLD_MS: z.coerce.number().optional(),
});

export type Config = z.infer<typeof envSchema>;

// Единственный instance — валидируется при первом импорте
let parsed: Config | null = null;

/**
 * Явная валидация окружения.
 * Вызвать один раз при старте приложения (в server.ts).
 * При ошибке показывает все проблемы и завершает процесс.
 */
export function validateEnv(): Config {
  if (parsed) return parsed;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Ошибка валидации переменных окружения:");
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      console.error(`   ${path}: ${issue.message}`);
      if (issue.path.length === 0) {
        console.error(`     (получено: ${JSON.stringify(process.env[issue.path[0] as string])})`);
      }
    }
    process.exit(1);
  }

  parsed = result.data;
  console.log(`✅ Конфигурация загружена (${Object.keys(result.data).length} переменных)`);
  return parsed;
}

/**
 * Геттер для ленивой валидации.
 * Модули могут импортировать config напрямую — валидация
 * произойдёт при первом обращении (lazy singleton).
 */
export function getConfig(): Config {
  if (!parsed) {
    validateEnv();
  }
  return parsed!;
}

// Экспортируем объект config для удобного импорта в модулях.
// Валидация произойдёт при первом импорте этого файла.
// ВАЖНО: если process.env ещё не настроен (тесты), используйте vi.mock.
export const config = getConfig();

/**
 * Для тестов: переопределяет отдельные поля config.
 * Не affects остальные поля — они остаются из валидации.
 */
export function setConfig(partial: Partial<Config>): void {
  if (!parsed) {
    validateEnv();
  }
  Object.assign(parsed!, partial);
}
