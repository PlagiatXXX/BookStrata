import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { generateRssFeed } from "./rss.service.js";

export async function rssRoutes(fastify: FastifyInstance) {
  fastify.get("/rss.xml", async (_request: FastifyRequest, reply: FastifyReply) => {
    const xml = await generateRssFeed();
    reply.header("Content-Type", "application/rss+xml; charset=utf-8");
    reply.header("Cache-Control", "public, max-age=3600");
    return reply.send(xml);
  });
}
