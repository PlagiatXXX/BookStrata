// backend/src/modules/collections/collection.service.spec.ts
// Автозаполнение карточки подборки из каталога: matchCatalogBook
// использует каскад matchBook (как синк) и дочитывает полные данные книги.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    author: { findFirst: vi.fn() },
    book: { findUnique: vi.fn() },
    collection: { findMany: vi.fn(), count: vi.fn() },
  },
}));

vi.mock("../books/bookMatching.service.js", () => ({
  matchBook: vi.fn(),
}));

import { prisma } from "../../lib/prisma.js";
import { matchBook } from "../books/bookMatching.service.js";
import { matchCatalogBook, getCollections, COLLECTION_SUMMARY_SELECT } from "./collection.service.js";

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
      { statusFilter: "published" },
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
      { statusFilter: "published" },
    );
  });
});

describe("getCollections (легковесная проекция для публичных списков)", () => {
  it("в режиме summary: true использует COLLECTION_SUMMARY_SELECT и облегчает объект books", async () => {
    const mockedFindMany = vi.mocked(prisma.collection.findMany);
    const mockedCount = vi.mocked(prisma.collection.count);

    mockedFindMany.mockResolvedValueOnce([
      {
        id: 1,
        slug: "horror-books",
        title: "Ужасы",
        books: {
          "book-1": { title: "Оно", author: "Кинг", description: "Длинное описание...", notes: "Заметка" },
          "book-2": { title: "Сияние", author: "Кинг", description: "Ещё описание..." },
        },
      } as never,
    ]);
    mockedCount.mockResolvedValueOnce(1);

    const result = await getCollections({ summary: true, isFeatured: true });

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isFeatured: true }),
        select: COLLECTION_SUMMARY_SELECT,
      }),
    );
    expect(result.data).toHaveLength(1);
    // Количество ключей книг сохранено для подсчёта (Object.keys(books).length)
    expect(Object.keys(result.data[0].books as object)).toEqual(["book-1", "book-2"]);
    // Но тяжёлые поля описания и заметок отброшены
    expect(result.data[0].books).toEqual({
      "book-1": { id: "book-1" },
      "book-2": { id: "book-2" },
    });
  });

  it("без summary возвращает полные данные без select", async () => {
    const mockedFindMany = vi.mocked(prisma.collection.findMany);
    const mockedCount = vi.mocked(prisma.collection.count);

    mockedFindMany.mockResolvedValueOnce([
      {
        id: 2,
        slug: "full-col",
        title: "Полная подборка",
        content: "<p>Статья</p>",
      } as never,
    ]);
    mockedCount.mockResolvedValueOnce(1);

    const result = await getCollections({ isFeatured: false });

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.not.objectContaining({
        select: expect.anything(),
      }),
    );
    expect(result.data[0]).toHaveProperty("content", "<p>Статья</p>");
  });
});
