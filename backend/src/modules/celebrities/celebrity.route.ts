import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requireRole } from "../../middleware/requireRole.js";
import { uploadBase64 } from "../../lib/cloudinary.js";
import { validateImageSize } from "../../lib/validators.js";
import { createApiError, ErrorCodes } from "../../lib/api-response.js";
import { prisma } from "../../lib/prisma.js";
import * as service from "./celebrity.service.js";
import {
  type CreateCelebrityInput,
  type UpdateCelebrityInput,
} from "./celebrity.schema.js";

export async function celebrityRoutes(fastify: FastifyInstance) {
  // GET / — получить всех опубликованных знаменитостей
  fastify.get("/", async (request, reply) => {
    const query = request.query as { category?: string; page?: string; pageSize?: string };
    const result = await service.getCelebrities({
      category: query.category,
      isPublished: true,
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 50,
    });
    return reply.code(200).send(result);
  });

  // GET /admin — получить всех знаменитостей (для админки)
  fastify.get(
    "/admin",
    { preHandler: [authMiddleware, requireRole("admin", "moderator")] },
    async (request, reply) => {
      const query = request.query as { id?: string; category?: string; page?: string; pageSize?: string };

      if (query.id) {
        const celebrity = await service.getCelebrityById(Number(query.id));
        if (!celebrity) {
          return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Celebrity not found"));
        }
        return reply.code(200).send({ data: celebrity });
      }

      const result = await service.getCelebrities({
        category: query.category,
        page: query.page ? Number(query.page) : 1,
        pageSize: query.pageSize ? Number(query.pageSize) : 200,
      });
      return reply.code(200).send(result);
    },
  );

  // GET /categories — список категорий с количеством
  fastify.get("/categories", async (_request, reply) => {
    const result = await prisma.celebrity.groupBy({
      by: ["category"],
      where: {
        isPublished: true,
        category: { not: "" },
      },
      _count: { category: true },
      orderBy: { _count: { category: "desc" } },
    });
    return reply.code(200).send({
      data: result
        .filter((r: { category: string | null }) => r.category)
        .map((r: { category: string; _count: { category: number } }) => ({
          category: r.category,
          count: r._count.category,
        })),
    });
  });

  // GET /:slug — получить знаменитость по slug
  fastify.get(
    "/:slug",
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const celebrity = await service.getCelebrityBySlug(slug);
      if (!celebrity || !celebrity.isPublished) {
        return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Celebrity not found"));
      }
      return reply.code(200).send({ data: celebrity });
    },
  );

  // POST / — создать знаменитость
  fastify.post<{ Body: CreateCelebrityInput }>(
    "/",
    { preHandler: [authMiddleware, requireRole("admin")] },
    async (request, reply) => {
      const input = await service.validateCreateInput(request.body);
      const celebrity = await service.createCelebrity(input);
      return reply.code(201).send({ data: celebrity });
    },
  );

  // PUT /:id — обновить знаменитость
  fastify.put<{ Params: { id: string }; Body: UpdateCelebrityInput }>(
    "/:id",
    { preHandler: [authMiddleware, requireRole("admin")] },
    async (request, reply) => {
      const id = Number(request.params.id);
      const input = await service.validateUpdateInput(request.body);
      const celebrity = await service.updateCelebrity(id, input);
      return reply.code(200).send({ data: celebrity });
    },
  );

  // DELETE /:id — удалить знаменитость
  fastify.delete(
    "/:id",
    { preHandler: [authMiddleware, requireRole("admin")] },
    async (request, reply) => {
      const id = Number((request.params as { id: string }).id);
      await service.deleteCelebrity(id);
      return reply.code(204).send();
    },
  );

  // PATCH /:id/toggle-publish — переключить публикацию
  fastify.patch(
    "/:id/toggle-publish",
    { preHandler: [authMiddleware, requireRole("admin")] },
    async (request, reply) => {
      const id = Number((request.params as { id: string }).id);
      const celebrity = await service.togglePublish(id);
      return reply.code(200).send({ data: celebrity });
    },
  );

  // POST /upload-photo — загрузить фото знаменитости
  fastify.post<{ Body: { photoUrl: string } }>(
    "/upload-photo",
    { preHandler: [authMiddleware, requireRole("admin")] },
    async (request, reply) => {
      const { photoUrl } = request.body;

      if (!photoUrl || !photoUrl.startsWith("data:")) {
        return reply.code(400).send(createApiError(ErrorCodes.INVALID_FORMAT, "Invalid image format"));
      }

      const sizeError = validateImageSize(photoUrl);
      if (sizeError) {
        return reply.code(400).send(createApiError(ErrorCodes.VALIDATION_ERROR, sizeError));
      }

      try {
        const uploadResult = await uploadBase64(
          photoUrl,
          "tiermaker-pro/celebrity-photos",
        );
        return reply.code(200).send({ data: { photoUrl: uploadResult.url } });
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
          const err = error as { statusCode: number; message: string };
          return reply.code(err.statusCode).send(createApiError(ErrorCodes.INTERNAL_ERROR, err.message));
        }
        fastify.log.error({ error: String(error) }, "Failed to upload celebrity photo");
        return reply.code(500).send(createApiError(ErrorCodes.UPLOAD_FAILED, "Failed to upload image"));
      }
    },
  );
}

export default celebrityRoutes;
