/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FastifyInstance } from "fastify";
import {
  register,
  login,
  validateToken,
  validateRefreshToken,
  generateTokenPair,
} from "./auth.service.js";
import {
  registerSchema,
  loginSchema,
  validateSchema,
  RegisterInput,
  LoginInput,
  ValidateInput,
  AuthTokenPayload,
} from "./auth.schema.js";

function isAuthTokenPayload(payload: any): payload is AuthTokenPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "userId" in payload &&
    "username" in payload
  );
}

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/register
  fastify.post<{ Body: RegisterInput }>(
    "/register",
    { schema: registerSchema },
    async (request, reply) => {
      try {
        const result = await register(request.body);

        // Устанавливаем refresh токен в cookie
        reply.setCookie("refreshToken", result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60, // 7 дней в секундах
          path: "/",
        });

        // Возвращаем только access токен
        return reply.code(201).send({
          accessToken: result.accessToken,
          userId: result.userId,
          username: result.username,
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("уже зарегистрирован")
        ) {
          fastify.log.warn(
            { username: request.body.username, email: request.body.email },
            error.message,
          );
          return reply.code(409).send({ error: error.message });
        }
        fastify.log.error(error, "Unexpected error during registration");
        throw error; // Для других ошибок Fastify вернет 500
      }
    },
  );

  // POST /api/auth/login
  fastify.post<{ Body: LoginInput }>(
    "/login",
    { schema: loginSchema },
    async (request, reply) => {
      try {
        const result = await login(request.body);

        // Устанавливаем refresh токен в cookie
        reply.setCookie("refreshToken", result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60, // 7 дней в секундах
          path: "/",
        });

        // Возвращаем только access токен
        return reply.code(200).send({
          accessToken: result.accessToken,
          userId: result.userId,
          username: result.username,
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("Неверное имя пользователя или пароль")
        ) {
          fastify.log.warn(
            { username: request.body.username },
            "Failed login attempt",
          );
          return reply.code(401).send({ error: error.message });
        }
        fastify.log.error(error, "Unexpected error during login");
        throw error;
      }
    },
  );

  // POST /api/auth/validate
  fastify.post<{ Body: ValidateInput }>(
    "/validate",
    { schema: validateSchema }, // <-- Схема для валидации токена
    async (request, reply) => {
      try {
        const payload = validateToken(request.body.token);

        // <-- ШАГ 2: Проверяем структуру payload
        if (isAuthTokenPayload(payload)) {
          return reply.code(200).send({
            valid: true,
            userId: payload.userId,
            username: payload.username,
            role: payload.role || undefined,
          });
        } else {
          throw new Error("Invalid token payload structure");
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        return reply
          .code(401)
          .send({ error: "Invalid or expired token", valid: false });
      }
    },
  );

  // POST /api/auth/refresh
  fastify.post("/refresh", async (request, reply) => {
    try {
      // Получаем refresh токен из cookie
      const refreshToken = request.cookies.refreshToken;

      if (!refreshToken) {
        return reply.code(401).send({ error: "Refresh token not found" });
      }

      // Валидируем refresh токен
      const payload = validateRefreshToken(refreshToken);

      // Генерируем новую пару токенов
      const tokens = generateTokenPair({
        userId: payload.userId,
        username: payload.username,
        role: payload.role || "user",
      });

      // Устанавливаем новый refresh токен в cookie
      reply.setCookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60, // 7 дней в секундах
        path: "/",
      });

      return reply.code(200).send({
        accessToken: tokens.accessToken,
      });
    } catch (error) {
      fastify.log.error(error, "Refresh token validation failed");
      return reply
        .code(401)
        .send({ error: "Invalid or expired refresh token" });
    }
  });
}
