import type { FastifyInstance } from "fastify";
import { generateAvatar, getAvatarLimit } from "./avatar.service.js";
import { updateAvatar as updateUserAvatar } from "../users/users.service.js";
import { authMiddleware } from "../auth/auth.middleware.js";
import {
  generateAvatarSchema,
  uploadAvatarSchema,
  GenerateAvatarInput,
  UploadAvatarInput,
} from "./avatar.schema.js";

export async function avatarRoutes(fastify: FastifyInstance) {
  // Генерация аватара
  // We use strict input validation here to protect against oversized prompts
  // and resource exhaustion on the AI generation service.
  fastify.post<{ Body: GenerateAvatarInput }>(
    "/generate",
    {
      preHandler: [authMiddleware],
      schema: generateAvatarSchema,
    },
    async (request, reply) => {
      const { prompt } = request.body;

      const userId = (request as any).user?.userId;
      const userRole = (request as any).user?.role;

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const result = await generateAvatar(prompt.trim(), userId, userRole);

      if (!result.success) {
        return reply.code(429).send({
          error: result.error,
          remaining: result.remaining,
        });
      }

      return reply.send({
        success: true,
        imageUrl: result.imageUrl,
        remaining: result.remaining,
      });
    },
  );

  // Загрузка аватара
  // Input validation prevents DoS attacks via oversized base64 strings
  // or URL payloads that could bloat the database or cause memory issues.
  fastify.post<{ Body: UploadAvatarInput }>(
    "/upload",
    {
      preHandler: [authMiddleware],
      schema: uploadAvatarSchema,
    },
    async (request, reply) => {
      const { avatar } = request.body;

      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const user = await updateUserAvatar(userId, avatar);

      return reply.send({
        success: true,
        avatarUrl: user.avatarUrl,
      });
    },
  );

  // Лимиты
  fastify.get(
    "/limit",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const userId = (request as any).user?.userId;
      const userRole = (request as any).user?.role;

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const limitInfo = await getAvatarLimit(userId, userRole);

      if (!limitInfo) {
        return reply.code(404).send({ error: "User not found" });
      }

      return reply.send(limitInfo);
    },
  );
}
