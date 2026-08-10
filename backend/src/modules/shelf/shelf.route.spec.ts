import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import Fastify from "fastify";

vi.mock("../../lib/prisma.js", () => {
  const tx = {
    book: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    bookStatus: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
  return { prisma: tx };
});

vi.mock("../auth/auth.middleware.js", () => ({
  authMiddleware: vi.fn((request: any, reply: any, done: any) => {
    const authHeader = request.headers.authorization;
    if (authHeader === "Bearer user-token") {
      request.user = { userId: 1, username: "test", role: "user" };
      done();
    } else {
      reply
        .code(401)
        .send({ error: { code: "unauthorized", message: "Требуется авторизация" } });
    }
  }),
}));

import { shelfRoutes } from "./shelf.route.js";

describe("Shelf Routes", () => {
  let app: ReturnType<typeof Fastify>;

  async function createApp() {
    const instance = Fastify({ logger: false });
    const { prisma } = await import("../../lib/prisma.js");
    instance.decorate("prisma", prisma);
    await instance.register(shelfRoutes, { prefix: "/api/shelf" });
    await instance.ready();
    return instance;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
    vi.resetAllMocks();
  });

  describe("GET /api/shelf", () => {
    it("должен вернуть полку пользователя", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      vi.mocked(prisma.bookStatus.findMany).mockResolvedValue([
        { bookId: 10, status: "read", createdAt: new Date() },
        { bookId: 11, status: "want_to_read", createdAt: new Date() },
      ] as any);

      const res = await request(app.server)
        .get("/api/shelf")
        .set("Authorization", "Bearer user-token")
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toEqual({ bookId: 10, status: "read" });
    });

    it("должен вернуть 401 без авторизации", async () => {
      await request(app.server).get("/api/shelf").expect(401);
    });
  });

  describe("GET /api/shelf/books", () => {
    it("должен вернуть полку с данными книг", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      vi.mocked(prisma.bookStatus.findMany).mockResolvedValue([
        {
          bookId: 10,
          status: "read",
          book: { id: 10, title: "Цирцея", author: "Мадлен Миллер" },
        },
      ] as any);

      const res = await request(app.server)
        .get("/api/shelf/books")
        .set("Authorization", "Bearer user-token")
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].book.title).toBe("Цирцея");
      expect(res.body.data[0].status).toBe("read");
    });
  });

  describe("PUT /api/shelf/books/:bookKey", () => {
    it("должен установить статус книги по числовому ключу", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      vi.mocked(prisma.book.findUnique).mockResolvedValue({ id: 10 } as any);
      vi.mocked(prisma.bookStatus.upsert).mockResolvedValue({
        bookId: 10,
        status: "read",
      } as any);

      const res = await request(app.server)
        .put("/api/shelf/books/10")
        .set("Authorization", "Bearer user-token")
        .send({ status: "read" })
        .expect(200);

      expect(res.body.data).toEqual({ bookId: 10, status: "read" });
      expect(prisma.bookStatus.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { bookId_userId: { bookId: 10, userId: 1 } },
          create: { bookId: 10, userId: 1, status: "read" },
        }),
      );
    });

    it("должен создать книгу для строкового ключа (книга коллекции)", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      vi.mocked(prisma.book.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.book.create).mockResolvedValue({ id: 42 } as any);
      vi.mocked(prisma.bookStatus.upsert).mockResolvedValue({
        bookId: 42,
        status: "read",
      } as any);

      const res = await request(app.server)
        .put("/api/shelf/books/curated_1_1782461891402")
        .set("Authorization", "Bearer user-token")
        .send({
          status: "read",
          book: {
            title: "Астральная библиотека",
            author: "Кейт Куинн",
            coverImageUrl: "/images/collections/test.webp",
          },
        })
        .expect(200);

      expect(res.body.data).toEqual({ bookId: 42, status: "read" });
      expect(prisma.book.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ title: "Астральная библиотека" }),
        select: { id: true },
      });
      expect(prisma.bookStatus.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { bookId_userId: { bookId: 42, userId: 1 } },
        }),
      );
    });

    it("должен вернуть 404 если книга не существует", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      vi.mocked(prisma.book.findUnique).mockResolvedValue(null);

      const res = await request(app.server)
        .put("/api/shelf/books/999")
        .set("Authorization", "Bearer user-token")
        .send({ status: "want_to_read" })
        .expect(404);

      expect(res.status).toBe(404);
    });

    it("должен вернуть 400 на невалидный статус", async () => {
      await request(app.server)
        .put("/api/shelf/books/10")
        .set("Authorization", "Bearer user-token")
        .send({ status: "reading" })
        .expect(400);
    });
  });

  describe("DELETE /api/shelf/books/:bookKey", () => {
    it("должен снять отметку и вернуть 204", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      vi.mocked(prisma.bookStatus.deleteMany).mockResolvedValue({ count: 1 } as any);

      const res = await request(app.server)
        .delete("/api/shelf/books/10")
        .set("Authorization", "Bearer user-token")
        .expect(204);

      expect(prisma.bookStatus.deleteMany).toHaveBeenCalledWith({
        where: { bookId: 10, userId: 1 },
      });
      expect(res.text).toBe("");
    });

    it("должен вернуть 204 для строкового ключа без удаления", async () => {
      const { prisma } = await import("../../lib/prisma.js");

      await request(app.server)
        .delete("/api/shelf/books/curated_1_1782461891402")
        .set("Authorization", "Bearer user-token")
        .expect(204);

      expect(prisma.bookStatus.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/shelf/remove", () => {
    it("должен снять отметки с набора книг", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      vi.mocked(prisma.bookStatus.deleteMany).mockResolvedValue({ count: 2 } as any);

      const res = await request(app.server)
        .post("/api/shelf/remove")
        .set("Authorization", "Bearer user-token")
        .send({ bookKeys: ["10", "11"] })
        .expect(200);

      expect(res.body.data).toEqual({ removed: 2 });
      expect(prisma.bookStatus.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1, bookId: { in: [10, 11] } },
      });
    });

    it("должен пропустить строковые ключи при удалении", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      vi.mocked(prisma.bookStatus.deleteMany).mockResolvedValue({ count: 1 } as any);

      const res = await request(app.server)
        .post("/api/shelf/remove")
        .set("Authorization", "Bearer user-token")
        .send({ bookKeys: ["10", "curated_x"] })
        .expect(200);

      expect(res.body.data).toEqual({ removed: 1 });
      expect(prisma.bookStatus.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1, bookId: { in: [10] } },
      });
    });

    it("должен вернуть removed: 0 на пустой список", async () => {
      const res = await request(app.server)
        .post("/api/shelf/remove")
        .set("Authorization", "Bearer user-token")
        .send({ bookKeys: [] })
        .expect(200);

      expect(res.body.data).toEqual({ removed: 0 });
    });
  });

  describe("POST /api/shelf/import", () => {
    it("должен импортировать полку с merge по числовым ключам", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      vi.mocked(prisma.bookStatus.upsert).mockResolvedValue({} as any);

      const res = await request(app.server)
        .post("/api/shelf/import")
        .set("Authorization", "Bearer user-token")
        .send({
          items: [
            { bookKey: "1", status: "read" },
            { bookKey: "2", status: "want_to_read" },
          ],
        })
        .expect(200);

      expect(res.body.data).toEqual({ imported: 2 });
      expect(prisma.bookStatus.upsert).toHaveBeenCalledTimes(2);
    });

    it("должен создать книги для строковых ключей с данными", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      vi.mocked(prisma.book.findFirst).mockResolvedValue({ id: 100 } as any);
      vi.mocked(prisma.bookStatus.upsert).mockResolvedValue({} as any);

      const res = await request(app.server)
        .post("/api/shelf/import")
        .set("Authorization", "Bearer user-token")
        .send({
          items: [
            {
              bookKey: "curated_1_1782461891402",
              status: "read",
              book: { title: "Цирцея", author: "Мадлен Миллер" },
            },
          ],
        })
        .expect(200);

      expect(res.body.data).toEqual({ imported: 1 });
      expect(prisma.book.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ title: "Цирцея" }),
        }),
      );
    });

    it("должен пропустить строковые ключи без данных книги", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      vi.mocked(prisma.bookStatus.upsert).mockResolvedValue({} as any);

      const res = await request(app.server)
        .post("/api/shelf/import")
        .set("Authorization", "Bearer user-token")
        .send({
          items: [
            { bookKey: "1", status: "read" },
            { bookKey: "curated_x", status: "read" }, // нет данных — пропускается
          ],
        })
        .expect(200);

      expect(res.body.data).toEqual({ imported: 1 });
      expect(prisma.bookStatus.upsert).toHaveBeenCalledTimes(1);
    });

    it("должен пропустить импорт при пустом списке", async () => {
      const res = await request(app.server)
        .post("/api/shelf/import")
        .set("Authorization", "Bearer user-token")
        .send({ items: [] })
        .expect(200);

      expect(res.body.data).toEqual({ imported: 0 });
    });

    it("должен вернуть 401 без авторизации", async () => {
      await request(app.server)
        .post("/api/shelf/import")
        .send({ items: [{ bookKey: "1", status: "read" }] })
        .expect(401);
    });
  });
});