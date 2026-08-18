// Интеграционный тест релевантного поиска книг в админке (listBooks с q).
// Прогоняет реальный raw-SQL ($queryRaw) против Postgres: ловит ошибки
// имён колонок (42703), enum-сравнений и кириллицы, которые unit-тесты
// пропускают (там $queryRaw мокается).
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestServer, cleanupDatabase } from "./helpers.js";
import type { TestContext } from "./helpers.js";
import { listBooks } from "../../modules/admin-books/admin-books.service.js";

describe("Релевантный поиск книг в админке (raw SQL)", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestServer();
    await cleanupDatabase(ctx.prisma);

    await ctx.prisma.book.createMany({
      data: [
        { title: "Война и мир", author: "Лев Толстой", coverImageUrl: "/1.jpg", status: "published" },
        { title: "Белые ночи", author: "Фёдор Достоевский", coverImageUrl: "/2.jpg", status: "published" },
        { title: "Белые ночи (сборник)", author: "Фёдор Достоевский", coverImageUrl: "/3.jpg", status: "published" },
        { title: "Черновик какой-то", author: "Кто-то", coverImageUrl: "/4.jpg", status: "draft" },
      ],
    });
  });

  afterAll(async () => {
    await cleanupDatabase(ctx.prisma);
    await ctx.prisma.$disconnect();
    await ctx.fastify.close();
  });

  it("кириллица в нижнем регистре находит подстроку названия", async () => {
    const r = await listBooks({ q: "война", limit: 50 });
    expect(r.total).toBe(1);
    expect(r.items[0]?.title).toBe("Война и мир");
  });

  it("точное совпадение названия идёт раньше «(сборник)»", async () => {
    const r = await listBooks({ q: "белые ночи", limit: 50 });
    expect(r.total).toBe(2);
    expect(r.items[0]?.title).toBe("Белые ночи");
    expect(r.items[1]?.title).toBe("Белые ночи (сборник)");
  });

  it("q + status (enum-колонка через ::text) работает и фильтрует", async () => {
    const r = await listBooks({ q: "белые", status: "published", limit: 50 });
    expect(r.items).toHaveLength(2);
    expect(r.items.every((b) => b.status === "published")).toBe(true);
  });

  it("q по автору находит книги", async () => {
    const r = await listBooks({ q: "достоевский", limit: 50 });
    expect(r.total).toBe(2);
  });

  it("маппит raw-строки в API-форму (с _count и null-автором)", async () => {
    const r = await listBooks({ q: "война", limit: 50 });
    const book = r.items[0]!;
    expect(book).toMatchObject({
      id: expect.any(Number),
      title: "Война и мир",
      coverImageUrl: "/1.jpg",
      status: "published",
      _count: { comments: 0, placements: 0 },
    });
  });
});
