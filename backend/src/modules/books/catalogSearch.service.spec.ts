import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/prisma.js", () => ({
  prisma: { $queryRaw: vi.fn() },
}));

describe("searchCatalogBooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("возвращает книги по запросу", async () => {
    const { prisma } = await import("../../lib/prisma.js");
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { id: 1, title: "Дюна", author: "Герберт", slug: "dune", cover_image_url: "/c/dune.jpg", rating: 9.0 },
    ]);

    const { searchCatalogBooks } = await import("./catalogSearch.service.js");
    const books = await searchCatalogBooks("Дюна");

    expect(books).toHaveLength(1);
    expect(books[0].title).toBe("Дюна");
    expect(books[0].author).toBe("Герберт");
    expect(books[0].slug).toBe("dune");
  });

  it("возвращает пустой массив при коротком запросе", async () => {
    const { searchCatalogBooks } = await import("./catalogSearch.service.js");
    const books = await searchCatalogBooks("a");
    expect(books).toEqual([]);
  });

  it("возвращает пустой массив при пустом запросе", async () => {
    const { searchCatalogBooks } = await import("./catalogSearch.service.js");
    const books = await searchCatalogBooks("");
    expect(books).toEqual([]);
  });

  it("нормализует ё→е в запросе", async () => {
    const { prisma } = await import("../../lib/prisma.js");
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

    const { searchCatalogBooks } = await import("./catalogSearch.service.js");
    await searchCatalogBooks("Четвёртое крыло");

    // SQL должен содержать замену ё→е
    expect(prisma.$queryRaw).toHaveBeenCalled();
    const sqlCall = vi.mocked(prisma.$queryRaw).mock.calls[0][0];
    expect(sqlCall.values).toContain("четвертое крыло");
  });

  it("строго по порядку букв: regex-паттерн ^д.*к для запроса 'дк'", async () => {
    const { prisma } = await import("../../lib/prisma.js");
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

    const { searchCatalogBooks } = await import("./catalogSearch.service.js");
    await searchCatalogBooks("дк");

    expect(prisma.$queryRaw).toHaveBeenCalled();
    const sqlCall = vi.mocked(prisma.$queryRaw).mock.calls[0][0];
    // Паттерн должен содержать regex ^d.*k (якорь начала строки)
    expect(sqlCall.values).toContain("^д.*к");
  });

  it("ограничивает лимит максимальным значением 20", async () => {
    const { prisma } = await import("../../lib/prisma.js");
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

    const { searchCatalogBooks } = await import("./catalogSearch.service.js");
    await searchCatalogBooks("test", 100);

    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it("возвращает пустой массив при ошибке БД", async () => {
    const { prisma } = await import("../../lib/prisma.js");
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("DB connection lost"));

    const { searchCatalogBooks } = await import("./catalogSearch.service.js");
    const books = await searchCatalogBooks("test");
    expect(books).toEqual([]);
  });

  it("маппит cover_image_url → coverImageUrl", async () => {
    const { prisma } = await import("../../lib/prisma.js");
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { id: 2, title: "Книга", author: null, slug: "kniga", cover_image_url: "/cover.jpg", rating: null },
    ]);

    const { searchCatalogBooks } = await import("./catalogSearch.service.js");
    const books = await searchCatalogBooks("Книга");

    expect(books[0]).toHaveProperty("coverImageUrl", "/cover.jpg");
    expect(books[0]).not.toHaveProperty("cover_image_url");
  });
});
