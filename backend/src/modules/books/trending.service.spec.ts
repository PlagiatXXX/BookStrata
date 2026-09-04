import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindMany = vi.fn();
const mockQueryRaw = vi.fn();

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    book: { findMany: mockFindMany },
    $queryRaw: mockQueryRaw,
  },
}));

describe("getTrendingBooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("сначала возвращает книги с isTrending, потом по просмотрам", async () => {
    // Ручные книги (isTrending: true)
    mockFindMany
      .mockResolvedValueOnce([
        { id: 1, slug: "manual-book", title: "Ручная книга", author: "Автор", coverImageUrl: "/c/manual.jpg" },
      ])
      // Книги по просмотрам
      .mockResolvedValueOnce([
        { id: 2, slug: "popular-book", title: "Популярная", author: "Автор", coverImageUrl: "/c/popular.jpg" },
      ]);

    // Уникальные просмотры
    mockQueryRaw.mockResolvedValue([
      { slug: "popular-book", views: 100n },
    ]);

    const { getTrendingBooks } = await import("./trending.service.js");
    const books = await getTrendingBooks();

    expect(books).toHaveLength(2);
    expect(books[0].slug).toBe("manual-book");
    expect(books[1].slug).toBe("popular-book");
  });

  it("книги без просмотров и без isTrending не попадают", async () => {
    // Ручные книги — пусто
    mockFindMany.mockResolvedValueOnce([]);
    // Книги по просмотрам — пусто (нет просмотров)
    mockQueryRaw.mockResolvedValue([]);

    const { getTrendingBooks } = await import("./trending.service.js");
    const books = await getTrendingBooks();

    expect(books).toHaveLength(0);
  });

  it("уважает кастомный limit", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockQueryRaw.mockResolvedValue([]);

    const { getTrendingBooks } = await import("./trending.service.js");
    await getTrendingBooks(5);

    // Первый вызов — ручные книги с limit 5
    expect(mockFindMany).toHaveBeenNthCalledWith(1, expect.objectContaining({ take: 5 }));
  });

  it("не превышает limit суммарно", async () => {
    // 5 ручных книг
    const manualBooks = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      slug: `manual-${i}`,
      title: `Ручная ${i}`,
      author: "Автор",
      coverImageUrl: `/c/manual-${i}.jpg`,
    }));
    mockFindMany.mockResolvedValueOnce(manualBooks);

    // SQL вернёт только 3 книги (remaining = 8 - 5 = 3), хотя их на самом деле больше
    const viewBooks = [
      { slug: "view-0", views: 100n },
      { slug: "view-1", views: 90n },
      { slug: "view-2", views: 80n },
    ];
    mockQueryRaw.mockResolvedValue(viewBooks);

    // Второй вызов — книги по slug (только 3)
    const fullBooks = viewBooks.map((b, i) => ({
      id: 100 + i,
      slug: b.slug,
      title: `Просмотры ${i}`,
      author: "Автор",
      coverImageUrl: `/c/view-${i}.jpg`,
    }));
    mockFindMany.mockResolvedValueOnce(fullBooks);

    const { getTrendingBooks } = await import("./trending.service.js");
    const books = await getTrendingBooks(8);

    expect(books).toHaveLength(8);
  });

  it("фильтрует книги без обложки", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockQueryRaw.mockResolvedValue([]);

    const { getTrendingBooks } = await import("./trending.service.js");
    await getTrendingBooks();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ coverImageUrl: { not: "" } }),
      }),
    );
  });
});
