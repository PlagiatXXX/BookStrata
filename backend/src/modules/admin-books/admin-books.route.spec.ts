// backend/src/modules/admin-books/admin-books.route.spec.ts
// Админка каталога книг (Фаза 7, seobook.md): доступ только admin,
// листинг с фильтрами, правка полей + slug с историей (BookSlugHistory),
// публикация через publishBook(), merge дублей, enrich из Google Books,
// топ по просмотрам, модерация комментариев.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import Fastify from "fastify";

const mocks = vi.hoisted(() => ({
  prisma: {
    book: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    bookSlugHistory: { create: vi.fn() },
    analyticsEvent: { groupBy: vi.fn() },
    bookComment: { findMany: vi.fn(), count: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
  publishBook: vi.fn(),
  unpublishBook: vi.fn(),
  searchBooks: vi.fn(),
  mergeGroup: vi.fn(),
  findOrCreate: vi.fn(),
  validateRemoteImageDimensions: vi.fn().mockResolvedValue(null),
  deleteIfOrphaned: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../lib/prisma.js", () => ({ prisma: mocks.prisma }));
vi.mock("../../lib/storage/file-cleanup.js", () => ({
  deleteIfOrphaned: mocks.deleteIfOrphaned,
}));
vi.mock("../books/bookPublish.service.js", () => ({
  publishBook: mocks.publishBook,
  unpublishBook: mocks.unpublishBook,
}));
vi.mock("../books/books.service.js", () => ({ searchBooks: mocks.searchBooks }));
vi.mock("../books/bookDedupe.service.js", () => ({
  mergeGroup: mocks.mergeGroup,
}));
vi.mock("../authors/authors.service.js", () => ({
  createAuthorService: () => ({ findOrCreate: mocks.findOrCreate }),
}));
vi.mock("../../lib/validators.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/validators.js")>()),
  validateRemoteImageDimensions: mocks.validateRemoteImageDimensions,
}));
vi.mock("../auth/auth.middleware.js", () => ({
  authMiddleware: vi.fn((request: any, _reply: any, done: any) => {
    const authHeader = request.headers.authorization;
    if (authHeader === "Bearer admin-token") {
      request.user = { userId: 1, username: "admin", role: "admin" };
    } else if (authHeader === "Bearer user-token") {
      request.user = { userId: 2, username: "user", role: "user" };
    }
    done();
  }),
}));
vi.mock("../../middleware/requireRole.js", () => ({
  requireRole: (...roles: string[]) => {
    return (request: any, reply: any, done: any) => {
      if (!request.user) reply.code(401).send({ error: { code: "unauthorized", message: "Требуется авторизация" } });
      else if (roles.includes(request.user?.role)) done();
      else reply.code(403).send({ error: { code: "forbidden", message: "Нет прав доступа" } });
    };
  },
}));

import { adminBooksRoutes } from "./admin-books.route.js";

const bookRow = {
  id: 10,
  title: "Анна Каренина",
  author: "Лев Толстой",
  slug: "anna-karenina-lev-tolstoj",
  status: "published",
  genre: "Роман",
  tags: ["классика"],
  coverImageUrl: "/cover.jpg",
  rating: 9.1,
  likesCount: 5,
  publishedAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-02"),
  mergedIntoId: null,
  source: "local",
  externalId: null,
  _count: { comments: 2 },
};

describe("Admin Books Routes", () => {
  let app: ReturnType<typeof Fastify>;

  async function createApp() {
    const instance = Fastify({ logger: false });
    await instance.register(adminBooksRoutes, { prefix: "/api/admin/books" });
    await instance.ready();
    return instance;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    // Сбрасываем очереди mockResolvedValueOnce между тестами
    mocks.prisma.book.findUnique.mockReset();
    mocks.prisma.book.findUniqueOrThrow.mockReset();
    mocks.prisma.book.findMany.mockReset();
    mocks.prisma.book.update.mockReset();
    mocks.prisma.book.count.mockReset();
    mocks.prisma.bookComment.findMany.mockReset();
    mocks.prisma.bookComment.update.mockReset();
    mocks.prisma.bookComment.delete.mockReset();
    mocks.prisma.bookComment.count.mockReset();
    mocks.prisma.analyticsEvent.groupBy.mockReset();
    mocks.prisma.bookSlugHistory.create.mockReset();
    mocks.searchBooks.mockReset();
    mocks.mergeGroup.mockReset();
    mocks.publishBook.mockReset();
    mocks.unpublishBook.mockReset();
    mocks.findOrCreate.mockReset();
    mocks.publishBook.mockImplementation(() => Promise.resolve({ id: 10, status: "published" }));
    mocks.unpublishBook.mockImplementation(() => Promise.resolve({ id: 10, status: "draft" }));
    mocks.findOrCreate.mockImplementation((name: string) => Promise.resolve({ id: 99, name }));
    // По умолчанию просмотров нет; top-views тесты переопределяют ниже
    mocks.prisma.analyticsEvent.groupBy.mockResolvedValue([]);
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
    vi.resetAllMocks();
  });

  describe("доступ", () => {
    it("без токена → 401", async () => {
      const res = await request(app.server).get("/api/admin/books");
      expect(res.status).toBe(401);
    });

    it("обычный пользователь → 403", async () => {
      const res = await request(app.server)
        .get("/api/admin/books")
        .set("Authorization", "Bearer user-token");
      expect(res.status).toBe(403);
    });

    it("admin → 200", async () => {
      mocks.prisma.book.findMany.mockResolvedValue([bookRow]);
      mocks.prisma.book.count.mockResolvedValue(1);
      const res = await request(app.server)
        .get("/api/admin/books")
        .set("Authorization", "Bearer admin-token");
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
    });
  });

  describe("листинг и фильтры", () => {
    it("q → поиск по title/author (case-insensitive)", async () => {
      mocks.prisma.book.findMany.mockResolvedValue([]);
      mocks.prisma.book.count.mockResolvedValue(0);

      await request(app.server)
        .get("/api/admin/books?q=толстой&status=published")
        .set("Authorization", "Bearer admin-token");

      expect(mocks.prisma.book.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { title: { contains: "толстой", mode: "insensitive" } },
              { author: { contains: "толстой", mode: "insensitive" } },
            ],
            status: "published",
          },
        }),
      );
    });

    it("duplicatesOnly=true → только поглощённые книги", async () => {
      mocks.prisma.book.findMany.mockResolvedValue([]);
      mocks.prisma.book.count.mockResolvedValue(0);

      await request(app.server)
        .get("/api/admin/books?duplicatesOnly=true")
        .set("Authorization", "Bearer admin-token");

      expect(mocks.prisma.book.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { mergedIntoId: { not: null } } }),
      );
    });

    it("origin=tier-list → личные книги (userId) + книги с вхождениями в тир-листы", async () => {
      mocks.prisma.book.findMany.mockResolvedValue([]);
      mocks.prisma.book.count.mockResolvedValue(0);

      await request(app.server)
        .get("/api/admin/books?origin=tier-list")
        .set("Authorization", "Bearer admin-token");

      expect(mocks.prisma.book.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { userId: { not: null } },
              { placements: { some: {} } },
            ],
          },
        }),
      );
    });

    it("origin=catalog → каталоговые книги без userId и вхождений", async () => {
      mocks.prisma.book.findMany.mockResolvedValue([]);
      mocks.prisma.book.count.mockResolvedValue(0);

      await request(app.server)
        .get("/api/admin/books?origin=catalog")
        .set("Authorization", "Bearer admin-token");

      expect(mocks.prisma.book.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { placements: { none: {} }, userId: null },
        }),
      );
    });

    it("неизвестный origin игнорируется (все книги)", async () => {
      mocks.prisma.book.findMany.mockResolvedValue([]);
      mocks.prisma.book.count.mockResolvedValue(0);

      await request(app.server)
        .get("/api/admin/books?origin=foo")
        .set("Authorization", "Bearer admin-token");

      expect(mocks.prisma.book.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it("views — просмотры из AnalyticsEvent, привязанные по slug", async () => {
      mocks.prisma.book.findMany.mockResolvedValue([bookRow]);
      mocks.prisma.book.count.mockResolvedValue(1);
      mocks.prisma.analyticsEvent.groupBy.mockResolvedValue([
        { url: "https://bookstrata.ru/books/anna-karenina-lev-tolstoj", _count: { url: 9 } },
        { url: "/books/anna-karenina-lev-tolstoj", _count: { url: 3 } },
      ]);

      const res = await request(app.server)
        .get("/api/admin/books")
        .set("Authorization", "Bearer admin-token");

      expect(res.status).toBe(200);
      expect(res.body.data.items[0].views).toBe(12);
      expect(mocks.prisma.analyticsEvent.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { event: "page_view", url: { contains: "/books/" } },
        }),
      );
    });
  });

  describe("PATCH /:id — правка полей и slug", () => {
    it("смена slug у published → oldSlug пишется в BookSlugHistory", async () => {
      mocks.prisma.book.findUnique
        .mockResolvedValueOnce({ ...bookRow, id: 10 }) // текущая книга
        .mockResolvedValueOnce(null); // slug свободен
      mocks.prisma.book.update.mockResolvedValue({ ...bookRow, slug: "anna-karenina-2" });

      const res = await request(app.server)
        .patch("/api/admin/books/10")
        .set("Authorization", "Bearer admin-token")
        .send({ slug: "anna-karenina-2" });

      expect(res.status).toBe(200);
      expect(mocks.prisma.bookSlugHistory.create).toHaveBeenCalledWith({
        data: { oldSlug: "anna-karenina-lev-tolstoj", bookId: 10 },
      });
    });

    it("у draft-книги смена slug НЕ пишет историю", async () => {
      mocks.prisma.book.findUnique
        .mockResolvedValueOnce({ ...bookRow, id: 10, status: "draft" })
        .mockResolvedValueOnce(null);
      mocks.prisma.book.update.mockResolvedValue({ ...bookRow, slug: "anna-draft" });

      await request(app.server)
        .patch("/api/admin/books/10")
        .set("Authorization", "Bearer admin-token")
        .send({ slug: "anna-draft" });

      expect(mocks.prisma.bookSlugHistory.create).not.toHaveBeenCalled();
    });

    it("занятый slug → 409", async () => {
      mocks.prisma.book.findUnique
        .mockResolvedValueOnce({ ...bookRow, id: 10 })
        .mockResolvedValueOnce({ id: 77, slug: "drugoj-zanyat" });

      const res = await request(app.server)
        .patch("/api/admin/books/10")
        .set("Authorization", "Bearer admin-token")
        .send({ slug: "drugoj-zanyat" });

      expect(res.status).toBe(409);
    });

    it("невалидный slug (кириллица/пробелы) → 400", async () => {
      mocks.prisma.book.findUnique.mockResolvedValueOnce({ ...bookRow, id: 10 });

      const res = await request(app.server)
        .patch("/api/admin/books/10")
        .set("Authorization", "Bearer admin-token")
        .send({ slug: "анна каренина" });

      expect(res.status).toBe(400);
    });

    it("contextChain сохраняется как JSON", async () => {
      mocks.prisma.book.findUnique.mockResolvedValueOnce({ ...bookRow, id: 10 });
      mocks.prisma.book.update.mockResolvedValue({ ...bookRow });

      await request(app.server)
        .patch("/api/admin/books/10")
        .set("Authorization", "Bearer admin-token")
        .send({ contextChain: [{ icon: "menu_book", title: "Экранизации", text: "Текст" }] });

      expect(mocks.prisma.book.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contextChain: [{ icon: "menu_book", title: "Экранизации", text: "Текст" }],
          }),
        }),
      );
    });

    it("мелкая обложка (< 390×590) → 400 с текстом ошибки", async () => {
      mocks.prisma.book.findUnique.mockResolvedValueOnce({ ...bookRow, id: 10 });
      mocks.validateRemoteImageDimensions.mockResolvedValueOnce(
        "Картинка слишком маленькая (182×277). Минимум 390×590",
      );

      const res = await request(app.server)
        .patch("/api/admin/books/10")
        .set("Authorization", "Bearer admin-token")
        .send({ coverImageUrl: "https://example.com/small.jpg" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Картинка слишком маленькая");
      expect(mocks.prisma.book.update).not.toHaveBeenCalled();
    });

    it("пустой coverImageUrl (удаление обложки) не блокируется", async () => {
      mocks.prisma.book.findUnique.mockResolvedValueOnce({ ...bookRow, id: 10 });
      mocks.prisma.book.update.mockResolvedValue({ ...bookRow, coverImageUrl: "" });

      const res = await request(app.server)
        .patch("/api/admin/books/10")
        .set("Authorization", "Bearer admin-token")
        .send({ coverImageUrl: "" });

      expect(res.status).toBe(200);
      expect(mocks.validateRemoteImageDimensions).toHaveBeenCalledWith("");
    });

    it("та же обложка → проверка не вызывается (вариант Б)", async () => {
      mocks.prisma.book.findUnique.mockResolvedValueOnce({ ...bookRow, id: 10 });
      mocks.prisma.book.update.mockResolvedValue({ ...bookRow });

      const res = await request(app.server)
        .patch("/api/admin/books/10")
        .set("Authorization", "Bearer admin-token")
        .send({ title: "Новое название", coverImageUrl: "/cover.jpg" });

      expect(res.status).toBe(200);
      expect(mocks.validateRemoteImageDimensions).not.toHaveBeenCalled();
      // Обложка не менялась — старый файл не чистим
      expect(mocks.deleteIfOrphaned).not.toHaveBeenCalled();
    });

    it("смена обложки → старый файл чистится как осиротевший", async () => {
      mocks.prisma.book.findUnique.mockResolvedValueOnce({ ...bookRow, id: 10 });
      mocks.prisma.book.update.mockResolvedValue({
        ...bookRow,
        coverImageUrl: "/new-cover.jpg",
      });

      const res = await request(app.server)
        .patch("/api/admin/books/10")
        .set("Authorization", "Bearer admin-token")
        .send({ coverImageUrl: "/new-cover.jpg" });

      expect(res.status).toBe(200);
      expect(mocks.deleteIfOrphaned).toHaveBeenCalledWith("/cover.jpg");
    });
  });

  describe("публикация", () => {
    it("POST /:id/publish → вызывает publishBook()", async () => {
      mocks.prisma.book.findUnique.mockResolvedValueOnce({
        userId: null,
        _count: { placements: 0 },
      });

      const res = await request(app.server)
        .post("/api/admin/books/10/publish")
        .set("Authorization", "Bearer admin-token");

      expect(mocks.publishBook).toHaveBeenCalledWith(10);
      expect(res.status).toBe(200);
    });

    it("неполная книга → 422 (инвариант publishBook)", async () => {
      mocks.prisma.book.findUnique.mockResolvedValueOnce({
        userId: null,
        _count: { placements: 0 },
      });
      const err = new Error("Книга неполная для публикации: publishedYear, description");
      err.name = "IncompleteBookError";
      mocks.publishBook.mockRejectedValue(err);

      const res = await request(app.server)
        .post("/api/admin/books/10/publish")
        .set("Authorization", "Bearer admin-token");

      expect(res.status).toBe(422);
      expect(res.body.error.message).toContain("publishedYear");
    });

    it("личная книга из тир-листа (userId) → 409, publishBook не вызывается", async () => {
      mocks.prisma.book.findUnique.mockResolvedValueOnce({
        userId: 5,
        _count: { placements: 3 },
      });

      const res = await request(app.server)
        .post("/api/admin/books/10/publish")
        .set("Authorization", "Bearer admin-token");

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain("тир-листа");
      expect(mocks.publishBook).not.toHaveBeenCalled();
    });

    it("книга с вхождениями, но без userId (легаси) → 409", async () => {
      mocks.prisma.book.findUnique.mockResolvedValueOnce({
        userId: null,
        _count: { placements: 2 },
      });

      const res = await request(app.server)
        .post("/api/admin/books/10/publish")
        .set("Authorization", "Bearer admin-token");

      expect(res.status).toBe(409);
      expect(mocks.publishBook).not.toHaveBeenCalled();
    });

    it("книга не найдена → 404", async () => {
      mocks.prisma.book.findUnique.mockResolvedValueOnce(null);

      const res = await request(app.server)
        .post("/api/admin/books/999/publish")
        .set("Authorization", "Bearer admin-token");

      expect(res.status).toBe(404);
      expect(mocks.publishBook).not.toHaveBeenCalled();
    });
  });

  describe("merge дублей", () => {
    it("POST /:id/merge { targetId } → mergeGroup с группой из двух книг", async () => {
      mocks.prisma.book.findUnique
        .mockResolvedValueOnce({ ...bookRow, id: 20 }) // дубль
        .mockResolvedValueOnce({ ...bookRow, id: 10 }); // канон
      mocks.prisma.book.findUniqueOrThrow.mockResolvedValue({
        id: 20,
        title: "Анна Каренина",
        authorId: 1,
        coverImageUrl: "",
        description: null,
        publishedAt: null,
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { placements: 0, ratings: 0, statuses: 0, collectionBooks: 0, celebrityBooks: 0, comments: 0, likes: 0 },
      });
      mocks.mergeGroup.mockResolvedValue(undefined);
      mocks.prisma.book.findUnique.mockResolvedValueOnce({ ...bookRow, id: 10 });

      const res = await request(app.server)
        .post("/api/admin/books/20/merge")
        .set("Authorization", "Bearer admin-token")
        .send({ targetId: 10 });

      expect(res.status).toBe(200);
      expect(mocks.mergeGroup).toHaveBeenCalledWith(
        expect.objectContaining({ key: "manual:20->10", books: expect.any(Array) }),
        { forceCanonId: 10 },
      );
    });

    it("published-дубль в draft-канон → 409, mergeGroup не вызывается", async () => {
      mocks.prisma.book.findUnique
        .mockResolvedValueOnce({ ...bookRow, id: 20, status: "published" }) // дубль
        .mockResolvedValueOnce({ ...bookRow, id: 10, status: "draft" }); // канон

      const res = await request(app.server)
        .post("/api/admin/books/20/merge")
        .set("Authorization", "Bearer admin-token")
        .send({ targetId: 10 });

      expect(res.status).toBe(409);
      expect(mocks.mergeGroup).not.toHaveBeenCalled();
    });

    it("уже поглощённая книга → 409", async () => {
      mocks.prisma.book.findUnique
        .mockResolvedValueOnce({ ...bookRow, id: 20, mergedIntoId: 10 })
        .mockResolvedValueOnce({ ...bookRow, id: 10 });

      const res = await request(app.server)
        .post("/api/admin/books/20/merge")
        .set("Authorization", "Bearer admin-token")
        .send({ targetId: 10 });

      expect(res.status).toBe(409);
    });
  });

  describe("enrich из Google Books", () => {
    it("заполняет поля из первого результата", async () => {
      mocks.prisma.book.findUnique.mockResolvedValueOnce({
        id: 10,
        title: "Анна Каренина",
        author: "Лев Толстой",
        coverImageUrl: "",
        publishedYear: null,
        genre: null,
      });
      mocks.searchBooks.mockResolvedValue([
        {
          openLibraryKey: "abc",
          source: "google_books",
          externalId: "abc",
          title: "Anna Karenina",
          author: "Leo Tolstoy",
          coverUrl: "https://x/thumb.jpg",
          coverUrlLarge: "https://x/large.jpg",
          publishYear: 1877,
          subjects: ["Fiction"],
        },
      ]);
      mocks.prisma.book.update.mockResolvedValue({});

      const res = await request(app.server)
        .post("/api/admin/books/10/enrich")
        .set("Authorization", "Bearer admin-token");

      expect(res.status).toBe(200);
      expect(mocks.findOrCreate).toHaveBeenCalledWith("Leo Tolstoy");
      expect(mocks.prisma.book.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "Anna Karenina",
            coverImageUrl: "https://x/large.jpg",
            publishedYear: 1877,
            genre: "Fiction",
          }),
        }),
      );
    });

    it("пустой результат → 404", async () => {
      mocks.prisma.book.findUnique.mockResolvedValueOnce({ id: 10, title: "X", author: null, coverImageUrl: "", publishedYear: null, genre: null });
      mocks.searchBooks.mockResolvedValue([]);

      const res = await request(app.server)
        .post("/api/admin/books/10/enrich")
        .set("Authorization", "Bearer admin-token");

      expect(res.status).toBe(404);
    });
  });

  describe("топ по просмотрам", () => {
    it("groupBy page_view → книги по slug из url", async () => {
      mocks.prisma.analyticsEvent.groupBy.mockResolvedValue([
        { url: "/books/anna-karenina-lev-tolstoj", _count: { url: 42 } },
      ]);
      mocks.prisma.book.findMany.mockResolvedValue([bookRow]);

      const res = await request(app.server)
        .get("/api/admin/books/top-views")
        .set("Authorization", "Bearer admin-token");

      expect(res.status).toBe(200);
      expect(res.body.data.items[0].views).toBe(42);
      expect(mocks.prisma.analyticsEvent.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { event: "page_view", url: { contains: "/books/" } },
        }),
      );
    });

    it("извлекает slug и из полного href (старые события)", async () => {
      mocks.prisma.analyticsEvent.groupBy.mockResolvedValue([
        { url: "https://bookstrata.ru/books/anna-karenina-lev-tolstoj", _count: { url: 7 } },
      ]);
      mocks.prisma.book.findMany.mockResolvedValue([bookRow]);

      const res = await request(app.server)
        .get("/api/admin/books/top-views")
        .set("Authorization", "Bearer admin-token");

      expect(res.status).toBe(200);
      expect(res.body.data.items[0].views).toBe(7);
    });

    it("сливает href и путь одной книги в одну строку топа", async () => {
      mocks.prisma.analyticsEvent.groupBy.mockResolvedValue([
        { url: "https://bookstrata.ru/books/anna-karenina-lev-tolstoj", _count: { url: 14 } },
        { url: "/books/anna-karenina-lev-tolstoj", _count: { url: 2 } },
      ]);
      mocks.prisma.book.findMany.mockResolvedValue([bookRow]);

      const res = await request(app.server)
        .get("/api/admin/books/top-views")
        .set("Authorization", "Bearer admin-token");

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].views).toBe(16);
    });
  });

  describe("модерация комментариев", () => {
    it("GET /comments — листинг с фильтром по книге", async () => {
      mocks.prisma.bookComment.findMany.mockResolvedValue([]);
      mocks.prisma.bookComment.count.mockResolvedValue(0);

      const res = await request(app.server)
        .get("/api/admin/books/comments?bookId=10")
        .set("Authorization", "Bearer admin-token");

      expect(res.status).toBe(200);
      expect(mocks.prisma.bookComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { bookId: 10 } }),
      );
    });

    it("PATCH /comments/:id — правка контента (max 2000)", async () => {
      mocks.prisma.bookComment.update.mockResolvedValue({ id: 5, content: "новый текст" });

      const res = await request(app.server)
        .patch("/api/admin/books/comments/5")
        .set("Authorization", "Bearer admin-token")
        .send({ content: "новый текст" });

      expect(res.status).toBe(200);
      expect(mocks.prisma.bookComment.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { content: "новый текст", editedAt: expect.any(Date) },
      });
    });

    it("пустой контент → 400", async () => {
      const res = await request(app.server)
        .patch("/api/admin/books/comments/5")
        .set("Authorization", "Bearer admin-token")
        .send({ content: "   " });

      expect(res.status).toBe(400);
    });

    it("DELETE /comments/:id", async () => {
      mocks.prisma.bookComment.delete.mockResolvedValue({ id: 5 });

      const res = await request(app.server)
        .delete("/api/admin/books/comments/5")
        .set("Authorization", "Bearer admin-token");

      expect(res.status).toBe(200);
      expect(mocks.prisma.bookComment.delete).toHaveBeenCalledWith({ where: { id: 5 } });
    });
  });
});