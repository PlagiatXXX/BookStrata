import type { FastifyInstance } from "fastify";
import { generateAvatar, getAvatarLimit } from "./avatar.service.js";
import { updateAvatar as updateUserAvatar } from "../users/users.service.js";
import { authMiddleware } from "../auth/auth.middleware.js";
import { uploadBase64, uploadFromUrl } from "../../lib/cloudinary.js";
import {
  generateAvatarSchema,
  uploadAvatarSchema,
  GenerateAvatarInput,
  UploadAvatarInput,
} from "./avatar.schema.js";

export async function avatarRoutes(fastify: FastifyInstance) {
  // Генерация аватара
  // Мы используем строгую валидацию входных данных для защиты от слишком длинных промптов
  // и исчерпания ресурсов сервиса генерации ИИ.
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
  // Валидация входных данных предотвращает DoS-атаки через слишком большие строки base64
  // или полезные нагрузки URL, которые могут раздуть базу данных или вызвать проблемы с памятью.
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

      const uploadResult = avatar.startsWith("data:")
        ? await uploadBase64(avatar, "tiermaker-pro/avatars")
        : await uploadFromUrl(avatar, "tiermaker-pro/avatars");

      const user = await updateUserAvatar(userId, uploadResult.url);

      return reply.send({
        success: true,
        avatarUrl: user.avatarUrl,
        user,
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
