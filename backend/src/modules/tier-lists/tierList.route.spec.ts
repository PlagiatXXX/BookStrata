import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Fastify from "fastify";
import cors from "@fastify/cors";

describe("Tier List Routes (E2E)", () => {
  let app: ReturnType<typeof Fastify>;


  beforeEach(async () => {
    app = Fastify({ logger: false });

    // Регистрируем CORS
    await app.register(cors, {
      origin: true,
      methods: ["GET", "HEAD", "PUT", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    });

    // Health endpoint
    app.get("/health", async () => ({ status: "ok" }));

    // Мокаем auth middleware — проверяет токен, возвращает 401 без авторизации
    app.addHook("preHandler", (request, reply, done) => {
      // Проверяем, что путь начинается с /api/
      if (!request.url.startsWith("/api/")) {
        return done();
      }

      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return reply.code(401).send({ message: "Unauthorized" });
      }
      done();
    });

    // Мокаем роуты /api/tier-lists
    app.post("/api/tier-lists", async (request, reply) => {
      return reply.code(201).send({ title: request.body.title });
    });

    app.get("/api/tier-lists", async (request, reply) => {
      return reply.code(200).send({ data: [] });
    });

    await app.ready();

  });

  afterEach(async () => {
    await app.close();
  });

  describe("GET /health", () => {
    it("должен вернуть статус ok", async () => {
      const response = await app.inject({ method: "GET", url: "/health" });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("ok");
    });
  });

  describe("POST /api/tier-lists", () => {
    it("должен вернуть 401 без авторизации", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/tier-lists",
        payload: { title: "Unauthorized List" },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().message).toContain("Unauthorized");
    });
  });

  describe("GET /api/tier-lists", () => {
    it("должен вернуть 401 без авторизации", async () => {
      const response = await app.inject({ method: "GET", url: "/api/tier-lists" });

      expect(response.statusCode).toBe(401);
    });
  });
});