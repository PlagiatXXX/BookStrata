import type { FastifyInstance } from "fastify";
import * as service from "./collection.service.js";
import { createApiError, ErrorCodes } from "../../lib/api-response.js";

export async function topicRoutes(fastify: FastifyInstance) {
  // GET / — список категорий с количеством коллекций
  fastify.get("/", async (_request, reply) => {
    const stats = await service.getCategoryStats();
    return reply.code(200).send({ data: stats });
  });

  // GET /:categoryId — коллекции по категории
  fastify.get("/:categoryId", async (request, reply) => {
    const { categoryId } = request.params as { categoryId: string };
    const result = await service.getCollections({
      categoryId,
      isPublished: true,
      pageSize: 100,
    });

    if (result.data.length === 0) {
      return reply
        .code(404)
        .send(createApiError(ErrorCodes.NOT_FOUND, "Категория не найдена или в ней нет подборок"));
    }

    return reply.code(200).send(result);
  });
}

export default topicRoutes;
