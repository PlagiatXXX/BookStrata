import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../auth/auth.middleware.js";
import { createLogger } from "../../lib/logger.js";
import * as service from "./collection.service.js";
const logger = createLogger("CollectionsRoutes", { color: "green" });

export async function collectionRoutes(fastify: FastifyInstance) {
  // GET /api/collections — получить все коллекции (только опубликованные)
  fastify.get<{
    Querystring: { type?: string; page?: string; pageSize?: string };
  }>(
    "/",
    async (request, reply) => {
      const { type, page, pageSize } = request.query;
      const result = await service.getCollections({
        type,
        isPublished: true,
        page: page ? parseInt(page) : undefined,
        pageSize: pageSize ? parseInt(pageSize) : undefined,
      });
      return reply.send(result);
    },
  );

  // GET /api/collections/admin — получить все коллекции (для админки, включая черновики)
  fastify.get<{
    Querystring: { type?: string; page?: string; pageSize?: string };
  }>(
    "/admin",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      // Только админ
      if (request.user?.role !== "admin") {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const { type, page, pageSize } = request.query;
      const result = await service.getCollections({
        type,
        page: page ? parseInt(page) : undefined,
        pageSize: pageSize ? parseInt(pageSize) : undefined,
      });
      return reply.send(result);
    },
  );

  // GET /api/collections/:slug — получить коллекцию по slug
  fastify.get<{
    Params: { slug: string };
  }>(
    "/:slug",
    async (request, reply) => {
      const collection = await service.getCollectionBySlug(request.params.slug);
      if (!collection) {
        return reply.status(404).send({ error: "Collection not found" });
      }
      return reply.send(collection);
    },
  );

  // POST /api/collections — создать коллекцию (только админ)
  fastify.post(
    "/",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      if (request.user?.role !== "admin") {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const input = await service.validateCreateInput(request.body);
      const collection = await service.createCollection(input);
      logger.info("Коллекция создана", { id: collection.id, slug: collection.slug });
      return reply.status(201).send(collection);
    },
  );

  // PUT /api/collections/:id — обновить коллекцию (только админ)
  fastify.put<{
    Params: { id: string };
  }>(
    "/:id",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      if (request.user?.role !== "admin") {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const id = parseInt(request.params.id);
      if (isNaN(id)) {
        return reply.status(400).send({ error: "Invalid id" });
      }

      const input = await service.validateUpdateInput(request.body);
      const collection = await service.updateCollection(id, input);
      logger.info("Коллекция обновлена", { id });
      return reply.send(collection);
    },
  );

  // DELETE /api/collections/:id — удалить коллекцию (только админ)
  fastify.delete<{
    Params: { id: string };
  }>(
    "/:id",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      if (request.user?.role !== "admin") {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const id = parseInt(request.params.id);
      if (isNaN(id)) {
        return reply.status(400).send({ error: "Invalid id" });
      }

      await service.deleteCollection(id);
      logger.info("Коллекция удалена", { id });
      return reply.status(204).send();
    },
  );

  // PATCH /api/collections/:id/toggle-publish — переключить публикацию (только админ)
  fastify.patch<{
    Params: { id: string };
  }>(
    "/:id/toggle-publish",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      if (request.user?.role !== "admin") {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const id = parseInt(request.params.id);
      if (isNaN(id)) {
        return reply.status(400).send({ error: "Invalid id" });
      }

      const collection = await service.togglePublish(id);
      logger.info("Статус публикации изменён", { id, isPublished: collection.isPublished });
      return reply.send(collection);
    },
  );
}
