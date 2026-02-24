// backend/src/modules/auth/auth.schema.ts
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export interface AuthTokenPayload {
  userId: number; // или string
  username: string;
  iat: number;
  exp: number;
}

// Схема для регистрации
export const registerBodySchema = z.object({
  username: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
  email: z.string().email('Некорректный формат email'),
  password: z.string().min(4, 'Пароль должен содержать минимум 4 символа'),
});

// Схема для логина
const loginBodySchema = z.object({
  username: z.string().min(1), 
  password: z.string().min(1),
});

// Схема для валидации токена
const validateBodySchema = z.object({
  token: z.string().regex(/^[\w-]+\.[\w-]+\.[\w-]+$/, 'Некорректный формат JWT токена'),
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