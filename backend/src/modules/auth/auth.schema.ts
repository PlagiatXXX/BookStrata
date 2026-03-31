// backend/src/modules/auth/auth.schema.ts
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export const jwtPayloadSchema = z.object({
  userId: z.number(),
  username: z.string(),
  role: z.string().optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

export type AuthTokenPayload = z.infer<typeof jwtPayloadSchema>;

// Схема для регистрации
export const registerBodySchema = z.object({
  username: z
    .string()
    .min(2, "Имя должно содержать минимум 2 символа")
    .max(30, "Имя не может быть длиннее 30 символов"),
  email: z
    .string()
    .email("Некорректный формат email")
    .max(255, "Email не может быть длиннее 255 символов"),
  password: z
    .string()
    .min(8, "Пароль должен содержать минимум 8 символов")
    .max(100, "Пароль не может быть длиннее 100 символов"),
});

// Схема для логина
const loginBodySchema = z.object({
  username: z.string().min(1).max(30),
  password: z.string().min(1).max(100),
});

// Схема для валидации токена
const validateBodySchema = z.object({
  token: z
    .string()
    .max(2048, "Токен слишком длинный")
    .regex(/^[\w-]+\.[\w-]+\.[\w-]+$/, "Некорректный формат JWT токена"),
});

// Экспортируем JSON схемы для Fastify
export const registerSchema = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: zodToJsonSchema(registerBodySchema as any),
};

export const loginSchema = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: zodToJsonSchema(loginBodySchema as any),
};

export const validateSchema = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: zodToJsonSchema(validateBodySchema as any),
};

export type RegisterInput = z.infer<typeof registerBodySchema>;
export type LoginInput = z.infer<typeof loginBodySchema>;
export type ValidateInput = z.infer<typeof validateBodySchema>;
