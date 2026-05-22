import type { FastifyInstance } from "fastify";
import { getForumStats } from "./forum.service.js";

export async function forumRoutes(fastify: FastifyInstance) {
  fastify.get("/stats", async (_request, reply) => {
    const stats = await getForumStats();
    return reply.send({ data: stats });
  });
}
