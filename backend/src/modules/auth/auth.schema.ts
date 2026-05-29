import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const makeErrorSchema = (description: string): Record<string, unknown> => ({
  description,
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['code', 'message'],
    },
  },
  required: ['error'],
});

export const jwtPayloadSchema = z.object({
  userId: z.number(),
  username: z.string(),
  role: z.string().optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

export type AuthTokenPayload = z.infer<typeof jwtPayloadSchema>;

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
  acceptedTerms: z
    .boolean()
    .refine((v) => v === true, "Необходимо принять условия использования"),
  turnstileToken: z
    .string()
    .optional(),
});

const loginBodySchema = z.object({
  username: z.string().min(1).max(30),
  password: z.string().min(1).max(100),
});

const validateBodySchema = z.object({
  token: z
    .string()
    .max(2048, "Токен слишком длинный")
    .regex(/^[\w-]+\.[\w-]+\.[\w-]+$/, "Некорректный формат JWT токена"),
});

const verifyEmailBodySchema = z.object({
  token: z
    .string()
    .min(1, "Токен обязателен")
    .max(512, "Токен слишком длинный"),
});

const resendVerificationBodySchema = z.object({
  email: z
    .string()
    .email("Некорректный формат email"),
});

const forgotPasswordBodySchema = z.object({
  email: z.string().email().max(255),
});

const resetPasswordBodySchema = z.object({
  token: z.string().max(1000),
  password: z.string().min(8).max(100),
});

export const registerSchema = {
  description: 'Register a new user account',
  tags: ['Auth'],
  body: zodToJsonSchema(registerBodySchema as any),
  response: {
    201: {
      description: 'User registered successfully, verification email sent',
      type: 'object',
      properties: {
        userId: { type: 'number', description: 'Created user ID' },
        username: { type: 'string', description: 'Username' },
        email: { type: 'string', description: 'User email' },
        emailVerified: { type: 'boolean', description: 'Whether email is verified' },
      },
    },
    409: makeErrorSchema('Username or email already exists'),
  },
};

export const loginSchema = {
  description: 'Login with username and password',
  tags: ['Auth'],
  body: zodToJsonSchema(loginBodySchema as any),
  response: {
    401: makeErrorSchema('Invalid credentials'),
  },
};

export const validateSchema = {
  description: 'Validate JWT token',
  tags: ['Auth'],
  body: zodToJsonSchema(validateBodySchema as any),
  response: {
    200: {
      description: 'Token is valid',
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        userId: { type: 'number' },
        username: { type: 'string' },
        role: { type: 'string' },
      },
    },
    401: makeErrorSchema('Token is invalid or expired'),
  },
};

export const verifyEmailSchema = {
  description: 'Verify email address with token',
  tags: ['Auth'],
  body: zodToJsonSchema(verifyEmailBodySchema as any),
};

export const resendVerificationSchema = {
  description: 'Resend email verification link',
  tags: ['Auth'],
  body: zodToJsonSchema(resendVerificationBodySchema as any),
};

export const forgotPasswordSchema = {
  description: 'Request password reset',
  tags: ['Auth'],
  body: zodToJsonSchema(forgotPasswordBodySchema as any),
};

export const resetPasswordSchema = {
  description: 'Reset password with token',
  tags: ['Auth'],
  body: zodToJsonSchema(resetPasswordBodySchema as any),
};

export type RegisterInput = z.infer<typeof registerBodySchema>;
export type LoginInput = z.infer<typeof loginBodySchema>;
export type ValidateInput = z.infer<typeof validateBodySchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailBodySchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationBodySchema>;
