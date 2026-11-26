// backend/src/modules/sitemap/sitemap.service.spec.ts
// Sitemap: страницы авторов /authors и /authors/:slug — все авторы со slug
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    newsArticle: { findMany: vi.fn() },
    tierList: { findMany: vi.fn() },
    collection: { findMany: vi.fn() },
    celebrity: { findMany: vi.fn() },
    book: { findMany: vi.fn() },
    author: { findMany: vi.fn() },
  },
}));

vi.mock("../../lib/prisma.js", () => ({ prisma: mocks.prisma }));
vi.mock("../../config/env.js", () => ({
  config: { CLIENT_URL: "https://bookstrata.ru" },
}));

import { generateSitemap } from "./sitemap.service.js";

describe("generateSitemap — страницы авторов", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.newsArticle.findMany.mockResolvedValue([]);
    mocks.prisma.tierList.findMany.mockResolvedValue([]);
    mocks.prisma.collection.findMany.mockResolvedValue([]);
    mocks.prisma.celebrity.findMany.mockResolvedValue([]);
    mocks.prisma.book.findMany.mockResolvedValue([]);
    mocks.prisma.author.findMany.mockResolvedValue([
      { slug: "lev-tolstoy", updatedAt: new Date("2026-09-01") },
    ]);
  });

  it("включает /authors/{slug} для автора со slug", async () => {
    const xml = await generateSitemap();
    expect(xml).toContain("https://bookstrata.ru/authors/lev-tolstoy");
  });

  it("включает страницу списка /authors", async () => {
    const xml = await generateSitemap();
    expect(xml).toContain("<loc>https://bookstrata.ru/authors</loc>");
  });

  it("включает хаб-страницу /collections", async () => {
    const xml = await generateSitemap();
    expect(xml).toContain("<loc>https://bookstrata.ru/collections</loc>");
  });

  it("включает страницу /copyright в sitemap", async () => {
    const xml = await generateSitemap();
    expect(xml).toContain("<loc>https://bookstrata.ru/copyright</loc>");
  });

  it("фильтрует по slug != null и наличию хотя бы одной опубликованной каталоговой книги", async () => {
    await generateSitemap();
    expect(mocks.prisma.author.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: { not: null },
          books: { some: { status: "published", userId: null } },
        },
        select: { slug: true, updatedAt: true },
      }),
    );
  });

  it("без авторов — /authors/ в sitemap нет", async () => {
    mocks.prisma.author.findMany.mockResolvedValue([]);
    const xml = await generateSitemap();
    expect(xml).not.toContain("/authors/");
  });

  it("авторский URL имеет priority и changefreq", async () => {
    const xml = await generateSitemap();
    const block = xml
      .split("<url>")
      .find((s) => s.includes("/authors/lev-tolstoy"));
    expect(block).toBeDefined();
    expect(block).toContain("<priority>0.7</priority>");
    expect(block).toContain("<changefreq>weekly</changefreq>");
    expect(block).toContain(
      "<lastmod>2026-09-01</lastmod>",
    );
  });
});

describe("generateSitemap — книги каталога", () => {
  const makeBooks = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      slug: `book-${i}`,
      updatedAt: new Date("2026-09-01"),
    }));

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.newsArticle.findMany.mockResolvedValue([]);
    mocks.prisma.tierList.findMany.mockResolvedValue([]);
    mocks.prisma.collection.findMany.mockResolvedValue([]);
    mocks.prisma.celebrity.findMany.mockResolvedValue([]);
    mocks.prisma.author.findMany.mockResolvedValue([]);
    mocks.prisma.book.findMany.mockResolvedValue([]);
  });

  it("включает все published-книги, а не только первые 1000", async () => {
    mocks.prisma.book.findMany.mockResolvedValue(makeBooks(1151));

    const xml = await generateSitemap();
    const bookLocs = xml.match(/<loc>https:\/\/bookstrata\.ru\/books\//g) ?? [];

    expect(bookLocs).toHaveLength(1151);
    expect(xml).toContain("<loc>https://bookstrata.ru/books/book-1150</loc>");
  });

  it("запрашивает книги без лимита в 1000 и без mergedIntoId", async () => {
    mocks.prisma.book.findMany.mockResolvedValue([]);

    await generateSitemap();

    const args = mocks.prisma.book.findMany.mock.calls[0]?.[0] as
      | { take?: number; where?: unknown }
      | undefined;
    expect(args?.take === undefined || args.take > 1000).toBe(true);
    expect(args?.where).toEqual({
      status: "published",
      slug: { not: null },
      mergedIntoId: null,
    });
  });
});

describe("generateSitemap — тир-листы", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.newsArticle.findMany.mockResolvedValue([]);
    mocks.prisma.tierList.findMany.mockResolvedValue([]);
    mocks.prisma.collection.findMany.mockResolvedValue([]);
    mocks.prisma.celebrity.findMany.mockResolvedValue([]);
    mocks.prisma.author.findMany.mockResolvedValue([]);
    mocks.prisma.book.findMany.mockResolvedValue([]);
  });

  it("запрашивает только публичные тир-листы с книгами в тирах (tierId != null)", async () => {
    mocks.prisma.tierList.findMany.mockResolvedValue([
      {
        id: "tl-1",
        slug: "top-books",
        title: "Лучшие книги года",
        description: null,
        updatedAt: new Date("2026-09-01"),
        placements: Array.from({ length: 5 }, () => ({ tierId: 1, thoughts: null })),
      },
    ]);

    const xml = await generateSitemap();

    expect(mocks.prisma.tierList.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isPublic: true,
          placements: { some: { tierId: { not: null } } },
        },
      }),
    );
    expect(xml).toContain("<loc>https://bookstrata.ru/tier-lists/top-books</loc>");
  });

  it("исключает из sitemap тир-листы, где менее 5 расставленных книг (thin content)", async () => {
    mocks.prisma.tierList.findMany.mockResolvedValue([
      {
        id: "tl-thin",
        slug: "one-book",
        title: "Одна книга в топе",
        description: null,
        updatedAt: new Date("2026-09-01"),
        placements: [{ tierId: 1, thoughts: null }],
      },
      {
        id: "tl-unranked",
        slug: "only-unranked",
        title: "Длинный список без рейтинга",
        description: null,
        updatedAt: new Date("2026-09-01"),
        placements: Array.from({ length: 10 }, () => ({ tierId: null, thoughts: null })),
      },
      {
        id: "tl-good",
        slug: "ten-books",
        title: "Десять отличных книг",
        description: null,
        updatedAt: new Date("2026-09-01"),
        placements: Array.from({ length: 10 }, () => ({ tierId: 1, thoughts: null })),
      },
    ]);

    const xml = await generateSitemap();

    expect(xml).not.toContain("/tier-lists/one-book");
    expect(xml).not.toContain("/tier-lists/only-unranked");
    expect(xml).toContain("/tier-lists/ten-books");
  });

  it("исключает из sitemap тир-листы с коротким или шаблонным названием без описания и мыслей", async () => {
    mocks.prisma.tierList.findMany.mockResolvedValue([
      {
        id: "tl-short",
        slug: "da-fbe89u",
        title: "да",
        description: null,
        updatedAt: new Date("2026-09-01"),
        placements: Array.from({ length: 8 }, () => ({ tierId: 1, thoughts: null })),
      },
      {
        id: "tl-generic",
        slug: "tir-list-6q2uc6",
        title: "Тир-лист",
        description: null,
        updatedAt: new Date("2026-09-01"),
        placements: Array.from({ length: 12 }, () => ({ tierId: 1, thoughts: null })),
      },
      {
        id: "tl-regular",
        slug: "prochitano-regular",
        title: "Прочитано",
        description: null,
        updatedAt: new Date("2026-09-01"),
        placements: Array.from({ length: 6 }, () => ({ tierId: 1, thoughts: null })),
      },
    ]);

    const xml = await generateSitemap();

    expect(xml).not.toContain("/tier-lists/da-fbe89u");
    expect(xml).not.toContain("/tier-lists/tir-list-6q2uc6");
    expect(xml).toContain("/tier-lists/prochitano-regular");
  });

  it("исключает из sitemap тир-листы, где < 5 книг с нормальными названиями (одни хэши и image (N))", async () => {
    mocks.prisma.tierList.findMany.mockResolvedValue([
      {
        id: "tl-hashes",
        slug: "knigi-kotorye-my-zasluzhili-etjrcn",
        title: "Книги которые мы заслужили",
        description: null,
        updatedAt: new Date("2026-09-01"),
        placements: [
          { tierId: 1, thoughts: null, book: { title: "f7b21e2b0a472bece4e63b3e5d4fcf8e", author: null, slug: null, status: "draft" } },
          { tierId: 1, thoughts: null, book: { title: "image (347)", author: null, slug: null, status: "draft" } },
          { tierId: 1, thoughts: null, book: { title: "14055da3182a4fde2f91a5a7053f317d", author: null, slug: null, status: "draft" } },
          { tierId: 1, thoughts: null, book: { title: "IMG_1234", author: null, slug: null, status: "draft" } },
          { tierId: 1, thoughts: null, book: { title: "image (340)", author: null, slug: null, status: "draft" } },
        ],
      },
      {
        id: "tl-real",
        slug: "real-books-list",
        title: "Отличные книги",
        description: null,
        updatedAt: new Date("2026-09-01"),
        placements: [
          { tierId: 1, thoughts: null, book: { title: "1984", author: "Джордж Оруэлл", slug: "1984", status: "published" } },
          { tierId: 1, thoughts: null, book: { title: "Дюна", author: "Фрэнк Герберт", slug: "dyuna", status: "published" } },
          { tierId: 1, thoughts: null, book: { title: "Солярис", author: "Станислав Лем", slug: "solyaris", status: "published" } },
          { tierId: 1, thoughts: null, book: { title: "Мы", author: "Евгений Замятин", slug: "my", status: "published" } },
          { tierId: 1, thoughts: null, book: { title: "Идиот", author: "Фёдор Достоевский", slug: "idiot", status: "published" } },
        ],
      },
    ]);

    const xml = await generateSitemap();

    expect(xml).not.toContain("/tier-lists/knigi-kotorye-my-zasluzhili-etjrcn");
    expect(xml).toContain("/tier-lists/real-books-list");
  });
});
