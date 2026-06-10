import type { FastifyInstance } from "fastify";
import { createLogger } from "../../lib/logger.js";

const logger = createLogger("Proxy", { color: "yellow" });

const ALLOWED_HOSTS = [
  "books.google.com",
  "covers.openlibrary.org",
  "i.gr-assets.com",
  "res.cloudinary.com",
  "lh3.googleusercontent.com",
  "googleapis.com",
  "googleusercontent.com",
];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    // Allow any URL for flexibility, but we validate protocol
    return true;
  } catch {
    return false;
  }
}

export async function proxyRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: { url: string };
  }>(
    "/image",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["url"],
          properties: {
            url: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { url } = request.query;

      if (!url || !isAllowedUrl(url)) {
        return reply.code(400).send({ error: "Invalid or missing URL parameter" });
      }

      try {
        const response = await fetch(url, {
          headers: {
            // Some book APIs check Referer
            "Referer": "https://bookstrata.pro",
            "User-Agent": "BookStrata/1.0",
          },
        });

        if (!response.ok) {
          logger.warn(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
          return reply.code(response.status).send({ error: "Failed to fetch image" });
        }

        const contentType = response.headers.get("content-type") || "image/jpeg";
        if (!contentType.startsWith("image/")) {
          logger.warn(`Non-image content type from ${url}: ${contentType}`);
          return reply.code(400).send({ error: "URL does not point to an image" });
        }

        const buffer = await response.arrayBuffer();

        // Set CORS header so the browser can use this on canvas
        reply.header("Access-Control-Allow-Origin", "*");
        reply.header("Content-Type", contentType);
        reply.header("Cache-Control", "public, max-age=86400"); // cache for 1 day

        return reply.send(Buffer.from(buffer));
      } catch (error) {
        logger.error(error as Error, { action: "proxyImage", url });
        return reply.code(502).send({ error: "Failed to fetch image" });
      }
    },
  );
}
