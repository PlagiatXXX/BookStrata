import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Схема для генерации аватара - защищает от слишком длинных промптов, которые могут перегрузить сервис генерации.
export const generateAvatarBodySchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(2, "Промпт должен содержать минимум 2 символа")
    .max(500, "Промпт не может быть длиннее 500 символов"),
});

// Схема для загрузки аватара - предотвращает DoS-атаки через огромные полезные нагрузки (лимит 10МБ для base64 данных).
export const uploadAvatarBodySchema = z.object({
  avatar: z
    .string()
    .min(1, "Аватар обязателен")
    .max(10 * 1024 * 1024, "Размер аватара превышает лимит 10МБ"),
});

// JSON схемы для интеграции с Fastify
export const generateAvatarSchema = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: zodToJsonSchema(generateAvatarBodySchema as any),
};

export const uploadAvatarSchema = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: zodToJsonSchema(uploadAvatarBodySchema as any),
};

export type GenerateAvatarInput = z.infer<typeof generateAvatarBodySchema>;
export type UploadAvatarInput = z.infer<typeof uploadAvatarBodySchema>;
