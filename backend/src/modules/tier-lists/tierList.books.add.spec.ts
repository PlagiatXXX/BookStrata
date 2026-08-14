import { describe, it, expect, vi, beforeEach } from "vitest";

// Моки Prisma: минимальный набор для addBooksToTierList (Фаза 2.1)
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    tierList: {
      findUnique: vi.fn().mockResolvedValue({ id: "1" }),
    },
    author: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((data: any) =>
        Promise.resolve({ id: 999, ...data }),
      ),
    },
    book: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
    },
    bookPlacement: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
    $transaction: vi.fn(),
  },
}));

import { prisma } from "../../lib/prisma.js";
import { addBooksToTierList } from "./tierList.books.service.js";

const p2002 = (target: unknown) => {
  const err = new Error("Unique constraint failed") as Error & {
    code: string;
    meta: { target: unknown };
  };
  err.code = "P2002";
  err.meta = { target };
  return err;
};

const canonBook = (id: number) => ({
  id,
  title: "1984",
  author: "Orwell",
  authorId: 999,
  coverImageUrl: "/canon.jpg",
  slug: "1984",
  status: "published",
  source: "google_books",
  externalId: "vol-1",
  publishedYear: 1949,
  rating: 8.5,
});

describe("addBooksToTierList: конкурентная защита (P2002 → retry → link)", () => {
  const book = {
    title: "1984",
    author: "Orwell",
    coverImageUrl: "cover.jpg",
    externalId: "vol-1",
    source: "google_books" as const,
  };

  beforeEach(() => {
    // resetAllMocks — обязателен: clearAllMocks НЕ сбрасывает once-очереди
    vi.resetAllMocks();
    (prisma.tierList.findUnique as any).mockResolvedValue({ id: "1" });
    (prisma.author.findFirst as any).mockResolvedValue(null);
    (prisma.author.findUnique as any).mockResolvedValue(null);
    (prisma.author.findMany as any).mockResolvedValue([]);
    (prisma.author.create as any).mockImplementation((data: any) =>
      Promise.resolve({ id: 999, ...data }),
    );
    (prisma.book.findFirst as any).mockResolvedValue(null);
    (prisma.book.findMany as any).mockResolvedValue([]);
    (prisma.book.findUnique as any).mockResolvedValue(null);
    (prisma.bookPlacement.findMany as any).mockResolvedValue([]);
    (prisma.$queryRaw as any).mockResolvedValue([]);
    (prisma.bookPlacement.create as any).mockImplementation(({ data }: any) =>
      Promise.resolve({ tierListId: "1", tierId: null, ...data, book: { id: data.bookId } }),
    );
    (prisma.$transaction as any).mockImplementation((fn: any) => fn(prisma));
  });

  it("гонка на unique (source, externalId): create падает P2002 → перезапрос канона → link вместо дубля", async () => {
    // Параллельный запрос уже создал книгу: create падает (target — не slug)
    (prisma.book.create as any).mockRejectedValueOnce(p2002(["source", "externalId"]));
    // Перезапрос канона по (source, externalId) находит победителя
    (prisma.book.findFirst as any)
      .mockResolvedValueOnce(null) // step 1 матчинга: канон ещё не виден
      .mockResolvedValueOnce(canonBook(7)); // findRaceCanon: нашёл после гонки

    const result = await addBooksToTierList("1", [book]);

    expect(prisma.book.create).toHaveBeenCalledTimes(1);
    expect(prisma.bookPlacement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bookId: 7, tierListId: "1" }),
      }),
    );
    expect(result[0]?.book?.id).toBe(7);
  });

  it("гонка на partial unique index (local): P2002 → перезапрос по lower(title)+authorId → link", async () => {
    // target partial-индекса — не 'slug'
    (prisma.book.create as any).mockRejectedValueOnce(
      p2002(["Book_lower_trim_title_authorId_idx"]),
    );
    // findRaceCanon: raw-запрос вернул id победителя, findUnique отдал канон.
    // Порядок $queryRaw: 3b (точные по строке автора) → fuzzy → findRaceCanon
    (prisma.$queryRaw as any)
      .mockResolvedValueOnce([]) // 3b: точных по строке автора нет
      .mockResolvedValueOnce([]) // fuzzy: кандидатов нет
      .mockResolvedValueOnce([{ id: 9 }]); // findRaceCanon: победитель гонки
    (prisma.book.findUnique as any).mockResolvedValueOnce(canonBook(9));

    const result = await addBooksToTierList("1", [
      { title: "1984", author: "Orwell", coverImageUrl: "cover.jpg" },
    ]);

    expect(prisma.bookPlacement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bookId: 9 }),
      }),
    );
    expect(result[0]?.book?.id).toBe(9);
  });

  it("конфликт именно по slug → retry-цикл с суффиксом (-2), без link", async () => {
    (prisma.book.create as any)
      .mockRejectedValueOnce(p2002(["slug"])) // base-slug занят
      .mockImplementationOnce(({ data }: any) => Promise.resolve({ id: 100, ...data }));

    const result = await addBooksToTierList("1", [book]);

    expect(prisma.book.create).toHaveBeenCalledTimes(2);
    expect(prisma.book.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: expect.stringMatching(/-2$/) }),
      }),
    );
    expect(prisma.bookPlacement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ bookId: 100 }) }),
    );
    expect(result[0]?.book?.id).toBe(100);
  });

  it("канон не найден после P2002 → ошибка пробрасывается (не линкуем вслепую)", async () => {
    (prisma.book.create as any).mockRejectedValueOnce(p2002(["source", "externalId"]));
    // Перезапрос не нашёл канон (победитель уже удалён/откатился) — повторно не создаём дубль
    (prisma.book.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await expect(addBooksToTierList("1", [book])).rejects.toThrow(
      "Unique constraint failed",
    );
    expect(prisma.bookPlacement.create).not.toHaveBeenCalled();
  });
});