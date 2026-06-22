import type { FastifyInstance } from "fastify";
import { createLogger } from "../../lib/logger.js";

import { isIP } from "node:net";
import { promises as dns } from "node:dns";

const logger = createLogger("Proxy", { color: "yellow" });

const ALLOWED_HOSTS = [
  "books.google.com",
  "covers.openlibrary.org",
  "i.gr-assets.com",
  "res.cloudinary.com",
  "lh3.googleusercontent.com",
  "googleapis.com",
  "googleusercontent.com",
  "s3.twcstorage.ru",
  "cdn.twcstorage.ru",
];

/** RFC 1918 + loopback + link-local + AWS metadata (169.254.0.0/16) */
function isPrivateIP(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4) return false;
  const o1 = parts[0]!;
  const o2 = parts[1]!;
  const o3 = parts[2]!;
  const o4 = parts[3]!;
  if (Number.isNaN(o1) || Number.isNaN(o2) || Number.isNaN(o3) || Number.isNaN(o4)) return false;

  // 10.0.0.0/8
  if (o1 === 10) return true;
  // 172.16.0.0/12
  if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
  // 192.168.0.0/16
  if (o1 === 192 && o2 === 168) return true;
  // 127.0.0.0/8 (loopback)
  if (o1 === 127) return true;
  // 169.254.0.0/16 (link-local, AWS metadata)
  if (o1 === 169 && o2 === 254) return true;

  return false;
}

async function isAllowedUrl(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);

    // Только http/https
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;

    const hostname = parsed.hostname.toLowerCase();

    // 1. Белый список доменов
    const isAllowed = ALLOWED_HOSTS.some(
      (allowed) => hostname === allowed || hostname.endsWith("." + allowed),
    );
    if (!isAllowed) return false;

    // 2. Если hostname — IP-адрес, проверить что не private
    if (isIP(hostname)) {
      if (isPrivateIP(hostname)) return false;
      return true;
    }

    // 3. DNS resolve — defence-in-depth: проверяем, куда ведёт домен
    const addresses = await dns.resolve4(hostname).catch(() => []);
    for (const addr of addresses) {
      if (isPrivateIP(addr)) return false;
    }

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

      if (!url || !(await isAllowedUrl(url))) {
        return reply.code(400).send({ error: "Invalid or missing URL parameter" });
      }

      try {
        const response = await fetch(url, {
          // Не следовать редиректам: иначе allowlist/IP-фильтр обходится через 3xx
          // на allowlist-ресурсе, ведущий на private IP (AWS metadata и т.п.)
          redirect: "error",
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
        // Сужаем origin до фронта вместо "*"
        reply.header("Access-Control-Allow-Origin", process.env.CLIENT_URL || "http://localhost:5173");
        reply.header("Vary", "Origin");
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
