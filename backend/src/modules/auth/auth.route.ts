import type { FastifyInstance } from "fastify";
import {
  register,
  login,
  validateToken,
  validateRefreshToken,
  generateTokenPair,
  requestPasswordReset,
  confirmPasswordReset,
} from "./auth.service.js";
import {
  registerSchema,
  loginSchema,
  validateSchema,
  RegisterInput,
  LoginInput,
  ValidateInput,
} from "./auth.schema.js";
import { ErrorCodes, createApiError, createSuccessResponse } from "../../lib/api-response.js";

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/register
  fastify.post<{ Body: RegisterInput }>(
    "/register",
    {
      schema: registerSchema,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 hour",
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await register(request.body);

        reply.setCookie("refreshToken", result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60,
          path: "/",
        });

        return reply.code(201).header("Location", `/api/users/${result.userId}`).send(createSuccessResponse({
          accessToken: result.accessToken,
          userId: result.userId,
          username: result.username,
        }));
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("уже зарегистрирован")
        ) {
          fastify.log.warn(
            { username: request.body.username, email: request.body.email },
            error.message,
          );
          return reply.code(409).send(createApiError(ErrorCodes.CONFLICT, error.message));
        }
        fastify.log.error(error, "Unexpected error during registration");
        throw error;
      }
    },
  );

  // POST /api/auth/login
  fastify.post<{ Body: LoginInput }>(
    "/login",
    {
      schema: loginSchema,
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await login(request.body);

        reply.setCookie("refreshToken", result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60,
          path: "/",
        });

        return reply.code(200).send(createSuccessResponse({
          accessToken: result.accessToken,
          userId: result.userId,
          username: result.username,
        }));
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("Неверное имя пользователя или пароль")
        ) {
          fastify.log.warn(
            { username: request.body.username },
            "Failed login attempt",
          );
          return reply.code(401).send(createApiError(ErrorCodes.UNAUTHORIZED, error.message));
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

        return reply.code(200).send(createSuccessResponse({
          valid: true,
          userId: payload.userId,
          username: payload.username,
          role: payload.role || undefined,
        }));
      } catch {
        return reply
          .code(401)
          .send(createApiError(ErrorCodes.TOKEN_INVALID, "Invalid or expired token", { valid: false }));
      }
    },
  );

  // POST /api/auth/refresh
  fastify.post("/refresh", async (request, reply) => {
    try {
      const refreshToken = request.cookies.refreshToken;

      if (!refreshToken) {
        return reply.code(401).send(createApiError(ErrorCodes.AUTHENTICATION_REQUIRED, "Refresh token not found"));
      }

      const payload = validateRefreshToken(refreshToken);

      const tokens = generateTokenPair({
        userId: payload.userId,
        username: payload.username,
        role: payload.role || "user",
      });

      reply.setCookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });

      return reply.code(200).send(createSuccessResponse({
        accessToken: tokens.accessToken,
      }));
    } catch (error) {
      fastify.log.error(error, "Refresh token validation failed");
      return reply
        .code(401)
        .send(createApiError(ErrorCodes.REFRESH_TOKEN_EXPIRED, "Invalid or expired refresh token"));
    }
  });

  // POST /api/auth/forgot-password
  fastify.post<{ Body: { email: string } }>(
    "/forgot-password",
    {
      schema: {
        body: {
          type: "object",
          required: ["email"],
          properties: {
            email: { type: "string", format: "email", maxLength: 255 },
          },
        },
      },
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 hour",
        },
      },
    },
    async (request, reply) => {
      const { email } = request.body;
      try {
        await requestPasswordReset(email);
        return reply.code(200).send(createSuccessResponse({ message: "Если аккаунт с таким email существует, мы отправили ссылку для сброса пароля." }));
      } catch (error) {
        fastify.log.error(error, "Forgot password error");
        return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "Failed to process request"));
      }
    },
  );

  // POST /api/auth/reset-password
  fastify.post<{ Body: { token: string; password: string } }>(
    "/reset-password",
    {
      schema: {
        body: {
          type: "object",
          required: ["token", "password"],
          properties: {
            token: { type: "string", maxLength: 1000 },
            password: { type: "string", minLength: 8, maxLength: 100 },
          },
        },
      },
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 hour",
        },
      },
    },
    async (request, reply) => {
      const { token, password } = request.body;
      try {
        await confirmPasswordReset(token, password);
        return reply.code(200).send(createSuccessResponse({ message: "Password reset successful" }));
      } catch (error) {
        fastify.log.error(error, "Reset password error");
        return reply.code(400).send(createApiError(ErrorCodes.INVALID_INPUT, "Invalid token or password"));
      }
    },
  );
}
