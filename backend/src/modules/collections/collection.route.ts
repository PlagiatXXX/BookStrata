import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requireRole } from "../../middleware/requireRole.js";
import { uploadBase64 } from "../../lib/cloudinary.js";
import { createApiError, ErrorCodes } from "../../lib/api-response.js";
import * as service from "./collection.service.js";
import {
  type CreateCollectionInput,
  type UpdateCollectionInput,
  parseUrlSchema,
} from "./collection.schema.js";

export async function collectionRoutes(fastify: FastifyInstance) {
  // GET / — получить все опубликованные коллекции
  fastify.get("/", async (request, reply) => {
    const query = request.query as { type?: string; categoryId?: string; page?: string; pageSize?: string };
    const result = await service.getCollections({
      type: query.type,
      categoryId: query.categoryId,
      isPublished: true,
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 50,
    });
    return reply.code(200).send(result);
  });

  // GET /admin — получить все коллекции (для админки)
  fastify.get(
    "/admin",
    { preHandler: [authMiddleware, requireRole("admin", "moderator")] },
    async (request, reply) => {
      const query = request.query as { id?: string; type?: string; categoryId?: string; page?: string; pageSize?: string };

      // Если запрошена конкретная коллекция по id
      if (query.id) {
        const collection = await service.getCollectionById(Number(query.id));
        if (!collection) {
          return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Collection not found"));
        }
        return reply.code(200).send({ data: collection });
      }

      const result = await service.getCollections({
        type: query.type,
        categoryId: query.categoryId,
        page: query.page ? Number(query.page) : 1,
        pageSize: query.pageSize ? Number(query.pageSize) : 200,
      });
      return reply.code(200).send(result);
    },
  );

  // GET /admin/preview/:slug — получить коллекцию по slug (включая черновики, только админ)
  fastify.get(
    "/admin/preview/:slug",
    { preHandler: [authMiddleware, requireRole("admin", "moderator")] },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const collection = await service.getCollectionBySlugAdmin(slug);
      if (!collection) {
        return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Collection not found"));
      }
      return reply.code(200).send({ data: collection });
    },
  );

  // GET /:slug — получить коллекцию по slug
  fastify.get(
    "/:slug",
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const collection = await service.getCollectionBySlug(slug);
      if (!collection || !collection.isPublished) {
        return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, "Collection not found"));
      }
      return reply.code(200).send({ data: collection });
    },
  );

  // POST / — создать коллекцию
  fastify.post<{ Body: CreateCollectionInput }>(
    "/",
    { preHandler: [authMiddleware, requireRole("admin")] },
    async (request, reply) => {
      const input = await service.validateCreateInput(request.body);
      const collection = await service.createCollection(input);
      return reply.code(201).send({ data: collection });
    },
  );

  // PUT /:id — обновить коллекцию
  fastify.put<{ Params: { id: string }; Body: UpdateCollectionInput }>(
    "/:id",
    { preHandler: [authMiddleware, requireRole("admin")] },
    async (request, reply) => {
      const id = Number(request.params.id);
      const input = await service.validateUpdateInput(request.body);
      const collection = await service.updateCollection(id, input);
      return reply.code(200).send({ data: collection });
    },
  );

  // DELETE /:id — удалить коллекцию
  fastify.delete(
    "/:id",
    { preHandler: [authMiddleware, requireRole("admin")] },
    async (request, reply) => {
      const id = Number((request.params as { id: string }).id);
      await service.deleteCollection(id);
      return reply.code(204).send();
    },
  );

  // PATCH /:id/toggle-publish — переключить публикацию
  fastify.patch(
    "/:id/toggle-publish",
    { preHandler: [authMiddleware, requireRole("admin")] },
    async (request, reply) => {
      const id = Number((request.params as { id: string }).id);
      const collection = await service.togglePublish(id);
      return reply.code(200).send({ data: collection });
    },
  );

  // POST /admin/parse-url — спарсить книги из статьи по URL
  fastify.post<{ Body: { url: string } }>(
    "/admin/parse-url",
    { preHandler: [authMiddleware, requireRole("admin", "moderator")] },
    async (request, reply) => {
      const { url } = parseUrlSchema.parse(request.body);
      try {
        const books = await service.parseBooksFromUrl(url);
        return reply.code(200).send({ data: books });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Ошибка парсинга страницы";
        fastify.log.error({ error, url }, "Parse URL failed");
        return reply
          .code(422)
          .send(createApiError(ErrorCodes.INTERNAL_ERROR, message));
      }
    },
  );

  // POST /admin/fetch-covers — найти обложки для списка книг
  fastify.post<{ Body: { books: { title: string; author: string }[] } }>(
    "/admin/fetch-covers",
    { preHandler: [authMiddleware, requireRole("admin", "moderator")] },
    async (request, reply) => {
      const { books } = request.body;
      if (!Array.isArray(books) || books.length === 0) {
        return reply.code(400).send(createApiError(ErrorCodes.INVALID_FORMAT, "Передайте массив книг"));
      }
      const result = await service.fetchCoversForBooks(books);
      return reply.code(200).send({ data: result });
    },
  );

  // POST /upload-cover — загрузить обложку коллекции
  fastify.post<{ Body: { coverImageUrl: string } }>(
    "/upload-cover",
    { preHandler: [authMiddleware, requireRole("admin")] },
    async (request, reply) => {
      const { coverImageUrl } = request.body;

      if (!coverImageUrl || !coverImageUrl.startsWith("data:")) {
        return reply.code(400).send(createApiError(ErrorCodes.INVALID_FORMAT, "Invalid image format"));
      }

      try {
        const uploadResult = await uploadBase64(
          coverImageUrl,
          "tiermaker-pro/collection-covers",
        );

        return reply.code(200).send({ data: { coverImageUrl: uploadResult.url } });
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
          const err = error as { statusCode: number; message: string };
          return reply.code(err.statusCode).send(createApiError(ErrorCodes.INTERNAL_ERROR, err.message));
        }
        fastify.log.error({ error: String(error) }, "Failed to upload collection cover");
        return reply.code(500).send(createApiError(ErrorCodes.UPLOAD_FAILED, "Failed to upload image"));
      }
    },
  );
}

export default collectionRoutes;
