import type { FastifyInstance } from "fastify";
import { register, login } from "./auth.service.js";
import { validateToken, validateRefreshToken, generateTokenPair, logout } from "./token.service.js";
import { requestPasswordReset, confirmPasswordReset } from "./password-reset.service.js";
import { oauthVk, oauthGoogle } from "./oauth.service.js";
import { authMiddleware } from "./auth.middleware.js";
import {
  registerSchema,
  loginSchema,
  validateSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type RegisterInput,
  type LoginInput,
  type ValidateInput,
} from "./auth.schema.js";
import { ErrorCodes, createApiError, createSuccessResponse } from "../../lib/api-response.js";
import { config } from "../../config/env.js";

export async function authRoutes(fastify: FastifyInstance) {
  // Fastify 5 не принимает пустое JSON тело (FST_ERR_CTP_EMPTY_JSON_BODY).
  // Браузер может сам добавить Content-Type: application/json даже для POST без тела.
  // Переопределяем парсер для application/json — пустое тело парсится как {}.
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body: string | Buffer, done) => {
    try {
      const str = typeof body === 'string' ? body : body.toString();
      done(null, str ? JSON.parse(str) : {});
    } catch (err: any) {
      err.statusCode = 400;
      done(err, undefined);
    }
  });

  // POST /api/auth/register
  fastify.post<{ Body: RegisterInput }>(
    "/register",
    {
      schema: registerSchema,
      config: {
        rateLimit: {
          max: config.RATE_LIMIT_REGISTER_MAX,
          timeWindow: "1 hour",
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await register(request.body);

        reply.setCookie("refreshToken", result.refreshToken, {
          httpOnly: true,
          secure: config.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 14 * 24 * 60 * 60,
          path: "/",
        });

        return reply.code(201).header("Location", `/api/users/${result.userId}`).send(createSuccessResponse({
          accessToken: result.accessToken,
          userId: result.userId,
          username: result.username,
        }));
      } catch (error) {
        if (error instanceof Error) {
          const msg = error.message;

          if (msg.includes("уже зарегистрирован")) {
            fastify.log.warn(
              { username: request.body.username, email: request.body.email },
              msg,
            );
            return reply.code(409).send(createApiError(ErrorCodes.CONFLICT, msg));
          }

          if (msg.includes("временных почтовых")) {
            return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, msg));
          }

          if (msg.includes("робот")) {
            return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, msg));
          }

          if (msg.includes("условия использования")) {
            return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, msg));
          }

          if (msg.includes("зарезервировано")) {
            return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, msg));
          }
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
          max: config.RATE_LIMIT_LOGIN_MAX,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await login(request.body);

        reply.setCookie("refreshToken", result.refreshToken, {
          httpOnly: true,
          secure: config.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 14 * 24 * 60 * 60,
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
    { schema: validateSchema },
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
  fastify.post("/refresh", {
    // Fastify 5 требует тело для POST с Content-Type: application/json.
    // Браузер может сам добавить этот заголовок даже без тела.
    // bodyLimit: 1 отключает парсинг тела для пустых запросов — refresh работает только по куке.
    bodyLimit: 1,
  }, async (request, reply) => {
    try {
      const refreshToken = request.cookies.refreshToken;

      if (!refreshToken) {
        return reply.code(401).send(createApiError(ErrorCodes.AUTHENTICATION_REQUIRED, "Refresh token not found"));
      }

      const payload = await validateRefreshToken(refreshToken);

      const tokens = await generateTokenPair({
        userId: payload.userId,
        username: payload.username,
        role: payload.role || "user",
      });

      reply.setCookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: config.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 14 * 24 * 60 * 60,
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

  // POST /api/auth/logout
  fastify.post("/logout", { preHandler: [authMiddleware] }, async (request, reply) => {
    try {
      await logout(request.user!.userId);
      reply.clearCookie("refreshToken", { path: "/" });
      return reply.code(200).send(createSuccessResponse({ message: "Logged out successfully" }));
    } catch (error) {
      fastify.log.error(error, "Logout error");
      return reply.code(500).send(createApiError(ErrorCodes.INTERNAL_ERROR, "Failed to logout"));
    }
  });

  // POST /api/auth/forgot-password
  fastify.post<{ Body: { email: string } }>(
    "/forgot-password",
    {
      schema: forgotPasswordSchema,
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
      schema: resetPasswordSchema,
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

  // OAuth: VK
  fastify.get("/oauth/vk", async (request, reply) => {
    const state = Math.random().toString(36).substring(2, 15);
    const { getVkAuthUrl } = await import("../../lib/oauth.js");
    return reply.redirect(getVkAuthUrl(state), 301);
  });

  fastify.get("/oauth/vk/callback", async (request, reply) => {
    const { code } = request.query as { code?: string };
    if (!code) {
      return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "Missing authorization code"));
    }

    try {
      const result = await oauthVk(code);

      reply.setCookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: config.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 14 * 24 * 60 * 60,
        path: "/",
      });

      const frontendUrl = config.CLIENT_URL;
      return reply.redirect(`${frontendUrl}/oauth/callback?token=${result.accessToken}`, 301);
    } catch (error) {
      fastify.log.error(error, "VK OAuth error");
      const frontendUrl = config.CLIENT_URL;
      return reply.redirect(`${frontendUrl}/oauth/error`, 301);
    }
  });

  // OAuth: Google
  fastify.get("/oauth/google", async (request, reply) => {
    const state = Math.random().toString(36).substring(2, 15);
    const { getGoogleAuthUrl } = await import("../../lib/oauth.js");
    return reply.redirect(getGoogleAuthUrl(state), 301);
  });

  fastify.get("/oauth/google/callback", async (request, reply) => {
    const { code } = request.query as { code?: string };
    if (!code) {
      return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, "Missing authorization code"));
    }

    try {
      const result = await oauthGoogle(code);

      reply.setCookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: config.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 14 * 24 * 60 * 60,
        path: "/",
      });

      const frontendUrl = config.CLIENT_URL;
      return reply.redirect(`${frontendUrl}/oauth/callback?token=${result.accessToken}`, 301);
    } catch (error) {
      fastify.log.error(error, "Google OAuth error");
      const frontendUrl = config.CLIENT_URL;
      return reply.redirect(`${frontendUrl}/oauth/error`, 301);
    }
  });
}


