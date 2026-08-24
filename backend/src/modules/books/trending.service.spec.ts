import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/prisma.js", () => ({
  prisma: { book: { findMany: vi.fn() } },
}));

describe("getTrendingBooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("возвращает published книги с обложкой и isTrending", async () => {
    const { prisma } = await import("../../lib/prisma.js");
    vi.mocked(prisma.book.findMany).mockResolvedValue([
      { id: 1, slug: "dune", title: "Дюна", author: "Герберт", coverImageUrl: "/c/dune.jpg" },
    ] as any);

    const { getTrendingBooks } = await import("./trending.service.js");
    const books = await getTrendingBooks();

    expect(prisma.book.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "published", isTrending: true }),
        take: 8,
      }),
    );
    expect(books[0].title).toBe("Дюна");
  });

  it("уважает кастомный limit", async () => {
    const { prisma } = await import("../../lib/prisma.js");
    vi.mocked(prisma.book.findMany).mockResolvedValue([]);
    const { getTrendingBooks } = await import("./trending.service.js");
    await getTrendingBooks(5);
    expect(prisma.book.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
  });

  it("фильтрует книги без обложки", async () => {
    const { prisma } = await import("../../lib/prisma.js");
    vi.mocked(prisma.book.findMany).mockResolvedValue([]);
    const { getTrendingBooks } = await import("./trending.service.js");
    await getTrendingBooks();
    expect(prisma.book.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ coverImageUrl: { not: "" } }),
      }),
    );
  });
});
