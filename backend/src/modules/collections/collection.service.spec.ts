// backend/src/modules/collections/collection.service.spec.ts
// Автозаполнение карточки подборки из каталога: matchCatalogBook
// использует каскад matchBook (как синк) и дочитывает полные данные книги.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    author: { findFirst: vi.fn() },
    book: { findUnique: vi.fn() },
  },
}));

vi.mock("../books/bookMatching.service.js", () => ({
  matchBook: vi.fn(),
}));

import { prisma } from "../../lib/prisma.js";
import { matchBook } from "../books/bookMatching.service.js";
import { matchCatalogBook } from "./collection.service.js";

const mockedMatch = vi.mocked(matchBook);
const mockedFindUnique = vi.mocked(prisma.book.findUnique);

function bookRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "Правда о деле Гарри Квеберта",
    author: "Жоэль Диккер",
    coverImageUrl: "https://cdn.example.com/cover.webp",
    publishedYear: 2012,
    genre: "Триллер",
    tags: ["Тайны прошлого", "Писатель и литература"],
    description: "Молодой писатель расследует старое убийство.",
    slug: "pravda-o-dele-garri-kveberta",
    status: "published",
    rating: 8.5,
    ...overrides,
  };
}

describe("matchCatalogBook (автозаполнение карточки подборки)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFindUnique.mockResolvedValue(bookRow() as never);
  });

  it("точное совпадение (канон) → полные данные книги", async () => {
    mockedMatch.mockResolvedValue({
      book: { id: 1 } as never,
      confidence: "HIGH",
      candidates: [],
    });

    const result = await matchCatalogBook({
      title: "Правда о деле Гарри Квеберта",
      author: "Жоэль Диккер",
    });

    expect(mockedMatch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ title: "Правда о деле Гарри Квеберта" }),
    );
    expect(mockedFindUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: expect.objectContaining({ genre: true, tags: true, description: true }),
    });
    expect(result.book).toEqual(expect.objectContaining({ title: "Правда о деле Гарри Квеберта" }));
    expect(result.candidates).toEqual([]);
  });

  it("похожие (MEDIUM) → кандидаты на выбор, канона нет", async () => {
    mockedMatch.mockResolvedValue({
      book: null,
      confidence: "MEDIUM",
      candidates: [{ id: 2 } as never, { id: 3 } as never],
    });

    const result = await matchCatalogBook({ title: "Дориан Грей", author: "Уайльд" });

    expect(result.book).toBeNull();
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates[0]).toEqual(expect.objectContaining({ id: 1 }));
  });

  it("не найдено → null, кандидатов нет", async () => {
    mockedMatch.mockResolvedValue({ book: null, confidence: null, candidates: [] });

    const result = await matchCatalogBook({ title: "Несуществующая книга" });

    expect(result.book).toBeNull();
    expect(result.candidates).toEqual([]);
    expect(mockedFindUnique).not.toHaveBeenCalled();
  });

  it("пустой author допустим (поиск только по названию)", async () => {
    mockedMatch.mockResolvedValue({ book: null, confidence: null, candidates: [] });

    await matchCatalogBook({ title: "Дом, в котором…" });

    expect(mockedMatch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ author: null, authorId: null }),
    );
  });
});
