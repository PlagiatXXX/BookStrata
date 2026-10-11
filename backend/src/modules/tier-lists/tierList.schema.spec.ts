// backend/src/modules/tier-lists/tierList.schema.spec.ts
// Регрессия 11.10.2026: схемы tier-lists висели спредом на верхнем уровне опций роута
// ({ ...schema.getXSchema }), а Fastify принимает их только внутри schema: {...}.
// Валидация/сериализация молча не применялись. При «простом включении» вложенности
// сломались бы реальные ответы: getTierListsSchema объявлял не ту форму,
// createTierListSchema[201] = {type:'object'} вырезал бы всё до {} (как register в auth).
//
// Тесты фиксируют: реальные ответы роутов должны проходить насквозь, без обрезки полей.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import Fastify from "fastify";

vi.mock("./tierList.service.js", () => ({
  getFullTierList: vi.fn(),
  getPublicTierLists: vi.fn(),
  getUserTierLists: vi.fn(),
  getLikedTierLists: vi.fn(),
  getTierListWhereClause: vi.fn(),
  isUuid: vi.fn(() => false),
  addBooksToTierList: vi.fn(),
  createTierList: vi.fn(),
  assertOwner: vi.fn(),
  togglePublic: vi.fn(),
  updatePlacements: vi.fn(),
  deleteTierList: vi.fn(),
  updateBookPlacement: vi.fn(),
  updateBookCatalogIfPlaced: vi.fn(),
  removeBookFromTierList: vi.fn(),
  updateTierListCover: vi.fn(),
  saveAll: vi.fn(),
  prisma: { tierList: { update: vi.fn(), findUnique: vi.fn() } },
}));

vi.mock("./likes/likes.service.js", () => ({
  like: vi.fn(),
  unlike: vi.fn(),
  getLikesWithStatus: vi.fn(),
}));

vi.mock("../../lib/upload.js", () => ({
  uploadBase64: vi.fn(),
  uploadFromUrl: vi.fn(),
  uploadBase64WithOg: vi.fn(),
  uploadFromUrlWithOg: vi.fn(),
}));

vi.mock("../../lib/nsfw-check.js", () => ({
  assertImageAllowed: vi.fn(),
}));

vi.mock("../../lib/event-emitter.js", () => ({
  eventBus: {
    emit: vi.fn().mockResolvedValue([]),
    on: vi.fn(),
  },
}));

import * as service from "./tierList.service.js";
import { eventBus } from "../../lib/event-emitter.js";

describe("tier-lists — схемы вложены в schema:{} и не обрезают реальные ответы", () => {
  let app: ReturnType<typeof Fastify>;

  async function createApp() {
    const instance = Fastify({ logger: false });

    // Подделка auth: userId из заголовка (как делает глобальный authPlugin)
    instance.addHook("preHandler", (request: any, _reply: any, done: any) => {
      const userIdHeader = request.headers["x-user-id"];
      if (userIdHeader) {
        request.user = { userId: Number(userIdHeader), username: "u", role: "user" };
      }
      done();
    });

    const { tierListRoutes } = await import("./tierList.route.js");
    await instance.register(tierListRoutes, { prefix: "/api/tier-lists" });
    await instance.ready();
    return instance;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(service.isUuid).mockReturnValue(false);
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // Реальный ответ сервиса: { data, meta, links } + authorName/authorAvatar/booksCount.
  // Старая getTierListsSchema объявляла { tierLists, total } — при вложенной валидации
  // ответ превратился бы в {}, и Dashboard перестал бы показывать списки.
  describe("GET /api/tier-lists/ — список моих тир-листов", () => {
    const serviceResponse = {
      data: [
        {
          id: "list-1",
          title: "Мои книги",
          slug: "moi-knigi",
          isPublic: true,
          coverImageUrl: "http://cdn/cover.jpg",
          likesCount: 3,
          theme: "dark",
          createdAt: "2026-10-11T00:00:00.000Z",
          updatedAt: "2026-10-11T00:00:00.000Z",
          authorName: "vlp",
          authorAvatar: null,
          booksCount: 12,
        },
      ],
      meta: { totalItems: 1, itemCount: 1, itemsPerPage: 6, totalPages: 1, currentPage: 1 },
      links: { self: "/api/tier-lists?page=1" },
    };

    it("отдаёт data/meta/links насквозь, без обрезки полей", async () => {
      vi.mocked(service.getUserTierLists).mockResolvedValue(serviceResponse as any);

      const res = await request(app.server)
        .get("/api/tier-lists/")
        .set("x-user-id", "42")
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      const item = res.body.data[0];
      expect(item.id).toBe("list-1");
      expect(item.slug).toBe("moi-knigi");
      expect(item.authorName).toBe("vlp");
      expect(item.booksCount).toBe(12);
      expect(item.theme).toBe("dark");
      expect(res.body.meta.totalItems).toBe(1);
      expect(res.body.links.self).toBeDefined();
    });

    it("без авторизации → 401 (схема валидации активна)", async () => {
      await request(app.server).get("/api/tier-lists/").expect(401);
    });
  });

  // Старая createTierListSchema[201] = {type:'object'} без properties — fast-json-stringify
  // вырезал бы всё до {} (тот же баг, что register в auth 11.10.2026).
  describe("POST /api/tier-lists/ — создание", () => {
    it("отдаёт data.id/data.slug/data.title — не пустой объект", async () => {
      vi.mocked(service.createTierList).mockResolvedValue({
        id: "list-9",
        slug: "novyi-spisok",
        title: "Новый список",
        isPublic: false,
      } as any);

      const res = await request(app.server)
        .post("/api/tier-lists/")
        .set("x-user-id", "42")
        .send({ title: "Новый список" })
        .expect(201);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe("list-9");
      expect(res.body.data.slug).toBe("novyi-spisok");
      expect(res.body.data.title).toBe("Новый список");
      expect(res.body.data.newAchievements).toEqual([]);
    });

    it("без title → 400 (body-валидация активна)", async () => {
      const res = await request(app.server)
        .post("/api/tier-lists/")
        .set("x-user-id", "42")
        .send({})
        .expect(400);

      expect(res.body.error).toBeDefined();
      expect(service.createTierList).not.toHaveBeenCalled();
    });
  });

  // addBooksSchema ограничивала coverImageUrl maxLength 2048, но роут сам принимает
  // base64 data:-обложки (многокилобайтные) — их нельзя резать по длине.
  describe("POST /api/tier-lists/:id/books — base64-обложки", () => {
    it("принимает base64-обложку длиннее 2048 символов", async () => {
      const base64Cover = "data:image/jpeg;base64," + "A".repeat(5000);
      vi.mocked(service.assertOwner).mockResolvedValue(undefined);
      vi.mocked(service.addBooksToTierList).mockResolvedValue([
        { book: { id: 1, title: "Книга" } },
      ] as any);

      const res = await request(app.server)
        .post("/api/tier-lists/list-1/books")
        .set("x-user-id", "42")
        .send({
          books: [
            { title: "Книга с обложкой", coverImageUrl: base64Cover },
          ],
        })
        .expect(201);

      expect(res.body.data.results).toHaveLength(1);
    });

    it("без books → 400 (body-валидация активна)", async () => {
      await request(app.server)
        .post("/api/tier-lists/list-1/books")
        .set("x-user-id", "42")
        .send({})
        .expect(400);
    });
  });

  // Старая togglePublicSchema объявляла в data только id/isPublic — остальные поля
  // Prisma-объекта были бы вырезаны (фронт результат пока не читает, но полезно сохранить).
  describe("PUT /api/tier-lists/:id/public — переключение публичности", () => {
    it("отдаёт обновлённый объект в data без обрезки полей", async () => {
      const updated = {
        id: "list-1",
        title: "Мои книги",
        isPublic: true,
        likesCount: 3,
        updatedAt: "2026-10-11T00:00:00.000Z",
      };
      vi.mocked(service.assertOwner).mockResolvedValue(undefined);
      vi.mocked(service.togglePublic).mockResolvedValue(updated as any);

      const res = await request(app.server)
        .put("/api/tier-lists/list-1/public")
        .set("x-user-id", "42")
        .send({ isPublic: true })
        .expect(200);

      expect(res.body.data.id).toBe("list-1");
      expect(res.body.data.title).toBe("Мои книги");
      expect(res.body.data.likesCount).toBe(3);
    });

    it("без isPublic → 400 (body-валидация активна)", async () => {
      await request(app.server)
        .put("/api/tier-lists/list-1/public")
        .set("x-user-id", "42")
        .send({})
        .expect(400);
    });
  });

  // saveAllSchema уже была вложена правильно — фиксируем, что остаётся таковой.
  describe("PUT /api/tier-lists/:id/save-all — атомарное сохранение", () => {
    it("отдаёт data.message/data.bookReplacements", async () => {
      vi.mocked(service.assertOwner).mockResolvedValue(undefined);
      vi.mocked(service.saveAll).mockResolvedValue({
        bookReplacements: [{ tempId: "t1", realId: "b1" }],
        tierReplacements: [],
      } as any);
      vi.mocked(eventBus.emit).mockResolvedValue([]);

      const res = await request(app.server)
        .put("/api/tier-lists/list-1/save-all")
        .set("x-user-id", "42")
        .send({
          newBooks: [{ tempId: "t1", title: "Книга", coverImageUrl: "http://x/c.jpg" }],
        })
        .expect(200);

      expect(res.body.data.message).toBe("Saved successfully");
      expect(res.body.data.bookReplacements[0].tempId).toBe("t1");
    });
  });

  // Лимиты включённой body-валидации не могут быть строже реальных данных:
  // - shelf-схема принимает title ≤500, author ≤300, genre ≤200, description ≤5000,
  //   а CreateTierListModal пересылает эти поля в POST /:id/books;
  // - BookEditModal (textarea без maxLength) шлёт description/thoughts любой длины
  //   в PUT /:id/books/:bookId, БД-колонки (Prisma String) безлимитны.
  // Ранее схемы были инертны — любые длины проходили. Активация не должна ломать это.
  describe("лимиты body не строже реальности", () => {
    it("POST /:id/books — description длиной 3000 (shelf-лимит 5000) принимается", async () => {
      vi.mocked(service.assertOwner).mockResolvedValue(undefined);
      vi.mocked(service.addBooksToTierList).mockResolvedValue([
        { book: { id: 1, title: "Книга" } },
      ] as any);

      const res = await request(app.server)
        .post("/api/tier-lists/list-1/books")
        .set("x-user-id", "42")
        .send({
          books: [
            {
              title: "Книга",
              coverImageUrl: "http://x/c.jpg",
              description: "О".repeat(3000),
            },
          ],
        })
        .expect(201);

      expect(res.body.data.results).toHaveLength(1);
    });

    it("POST /:id/books — title длиной 300 (shelf-лимит 500) принимается", async () => {
      vi.mocked(service.assertOwner).mockResolvedValue(undefined);
      vi.mocked(service.addBooksToTierList).mockResolvedValue([
        { book: { id: 2, title: "Длинный" } },
      ] as any);

      const res = await request(app.server)
        .post("/api/tier-lists/list-1/books")
        .set("x-user-id", "42")
        .send({
          books: [
            {
              title: "Т".repeat(300),
              coverImageUrl: "http://x/c.jpg",
            },
          ],
        })
        .expect(201);

      expect(res.body.data.results).toHaveLength(1);
    });

    it("PUT /:id/books/:bookId — description 3000 и thoughts 2500 принимаются", async () => {
      vi.mocked(service.assertOwner).mockResolvedValue(undefined);
      vi.mocked(service.updateBookPlacement).mockResolvedValue({
        id: 7,
        thoughts: "Мысли",
      } as any);
      vi.mocked(service.updateBookCatalogIfPlaced).mockResolvedValue(undefined);
      vi.mocked(eventBus.emit).mockResolvedValue([]);

      const res = await request(app.server)
        .put("/api/tier-lists/list-1/books/7")
        .set("x-user-id", "42")
        .send({
          description: "Д".repeat(3000),
          thoughts: "М".repeat(2500),
        })
        .expect(200);

      expect(res.body.data.id).toBe(7);
    });

    it("PUT /:id/books/:bookId — пустой title (фронт шлёт title.trim()) отклоняется", async () => {
      vi.mocked(service.assertOwner).mockResolvedValue(undefined);

      await request(app.server)
        .put("/api/tier-lists/list-1/books/7")
        .set("x-user-id", "42")
        .send({ title: "" })
        .expect(400);

      expect(service.updateBookCatalogIfPlaced).not.toHaveBeenCalled();
    });
  });

  // GET /liked использует ту же схему, что и GET / — та же фиксация envelope.
  describe("GET /api/tier-lists/liked — лайкнутые", () => {
    it("отдаёт data/meta/links насквозь", async () => {
      vi.mocked(service.getLikedTierLists).mockResolvedValue({
        data: [{ id: "l2", title: "Чужой", authorName: "a", booksCount: 1 }],
        meta: { totalItems: 1, itemCount: 1, itemsPerPage: 6, totalPages: 1, currentPage: 1 },
        links: {},
      } as any);

      const res = await request(app.server)
        .get("/api/tier-lists/liked")
        .set("x-user-id", "42")
        .expect(200);

      expect(res.body.data[0].authorName).toBe("a");
      expect(res.body.meta.totalItems).toBe(1);
    });
  });
});
