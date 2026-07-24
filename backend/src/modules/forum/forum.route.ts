import type { FastifyInstance } from "fastify";
import { getForumStats } from "./forum.service.js";

export async function forumRoutes(fastify: FastifyInstance) {
  fastify.get("/stats", async (_request, reply) => {
    reply.header("Cache-Control", "public, max-age=30, s-maxage=120");
    const stats = await getForumStats();
    return reply.send({ data: stats });
  });
}
