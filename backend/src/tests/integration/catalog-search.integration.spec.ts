import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import request from "supertest";
import { booksRoutes } from "../../modules/books/books.route.js";

describe("GET /api/books/catalog-search — интеграционный", () => {
  let app: Awaited<ReturnType<typeof Fastify>>;

  beforeAll(async () => {
    app = Fastify();
    await app.register(booksRoutes, { prefix: "/api/books" });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("возвращает 200 и массив books", async () => {
    const res = await request(app.server)
      .get("/api/books/catalog-search")
      .query({ q: "test" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.books)).toBe(true);
  });

  it("возвращает 400 при коротком запросе", async () => {
    const res = await request(app.server)
      .get("/api/books/catalog-search")
      .query({ q: "a" });

    expect(res.status).toBe(400);
  });

  it("возвращает 400 без параметра q", async () => {
    const res = await request(app.server)
      .get("/api/books/catalog-search");

    expect(res.status).toBe(400);
  });

  it("уважает параметр limit", async () => {
    const res = await request(app.server)
      .get("/api/books/catalog-search")
      .query({ q: "test", limit: 3 });

    expect(res.status).toBe(200);
    expect(res.body.data.books.length).toBeLessThanOrEqual(3);
  });

  it("каждая книга имеет обязательные поля", async () => {
    const res = await request(app.server)
      .get("/api/books/catalog-search")
      .query({ q: "test", limit: 5 });

    expect(res.status).toBe(200);
    for (const book of res.body.data.books) {
      expect(book).toHaveProperty("id");
      expect(book).toHaveProperty("title");
      expect(book).toHaveProperty("coverImageUrl");
    }
  });
});
