import type { FastifyInstance } from "fastify";
import { createLogger } from "../../lib/logger.js";
import { isAllowedUrl, getWebP } from "./image-proxy.service.js";

const logger = createLogger("ImageProxy", { color: "cyan" });

export async function imageProxyRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: {
      url: string;
      width?: string;
      quality?: string;
    };
  }>(
    "/proxy",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["url"],
          properties: {
            url: { type: "string", minLength: 1, maxLength: 2000 },
            width: { type: "string", pattern: "^[0-9]+$" },
            quality: { type: "string", pattern: "^[0-9]+$" },
          },
        },
      },
    },
    async (request, reply) => {
      const { url, width: widthStr, quality: qualityStr } = request.query;

      // ── Валидация URL ──
      if (!url || typeof url !== "string") {
        return reply.code(400).send({ error: "Missing 'url' parameter" });
      }

      if (!isAllowedUrl(url)) {
        logger.warn(`Blocked URL: ${url}`);
        return reply.code(403).send({ error: "URL not allowed" });
      }

      const width = widthStr ? Math.min(Math.max(parseInt(widthStr, 10) || 300, 50), 1200) : 300;
      const quality = qualityStr ? Math.min(Math.max(parseInt(qualityStr, 10) || 80, 1), 100) : 80;

      try {
        const { buffer, s3Url } = await getWebP(url, width, quality);

        // ── Если есть S3 URL — редирект (кэш на CDN) ──
        if (s3Url) {
          return reply
            .code(302)
            .header("Location", s3Url)
            .header("Cache-Control", "public, max-age=31536000, immutable")
            .header("Vary", "Accept")
            .send();
        }

        // ── Первый запрос — отдаём сконвертированный buffer ──
        if (!buffer) {
          return reply.code(502).send({ error: "Failed to process image" });
        }

        const bufferSize = buffer.length;

        return reply
          .code(200)
          .header("Content-Type", "image/webp")
          .header("Content-Length", bufferSize)
          .header("Cache-Control", "public, max-age=31536000, immutable")
          .header("Vary", "Accept")
          .header("X-Proxy-Source", "live-convert")
          .send(buffer);
      } catch (error: any) {
        logger.error(error, { action: "proxyImage", url });

        // Если ошибка конвертации — можно попробовать вернуть оригинал через существующий proxy
        return reply.code(502).send({
          error: "Failed to process image",
          message: error.message,
        });
      }
    },
  );
}
