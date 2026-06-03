import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { generateSitemap } from "./sitemap.service.js";

export async function sitemapRoutes(fastify: FastifyInstance) {
  fastify.get("/sitemap.xml", async (_request: FastifyRequest, reply: FastifyReply) => {
    const xml = await generateSitemap();
    reply.header("Content-Type", "application/xml; charset=utf-8");
    reply.header("Cache-Control", "public, max-age=3600");
    return reply.send(xml);
  });
}
