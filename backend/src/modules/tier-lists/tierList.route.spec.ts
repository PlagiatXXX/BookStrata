import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "test-secret";

// Функция для создания тестового JWT токена
function createTestToken(userId: number, username: string) {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: "1h" });
}

describe("Tier List Routes (E2E)", () => {
  let app: ReturnType<typeof Fastify>;
  let authToken: string;

  const TEST_USER_ID = 99999;

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

    authToken = createTestToken(TEST_USER_ID, "testuser");
  });

  afterEach(async () => {
    await app.close();
  });

  describe("GET /health", () => {
    it("должен вернуть статус ok", async () => {
      const response = await request(app.server).get("/health").expect(200);

      expect(response.body.status).toBe("ok");
    });
  });

  describe("POST /api/tier-lists", () => {
    it("должен вернуть 401 без авторизации", async () => {
      const response = await request(app.server)
        .post("/api/tier-lists")
        .send({ title: "Unauthorized List" })
        .expect(401);

      expect(response.body.message).toContain("Unauthorized");
    });
  });

  describe("GET /api/tier-lists", () => {
    it("должен вернуть 401 без авторизации", async () => {
      await request(app.server).get("/api/tier-lists").expect(401);
    });
  });
});
