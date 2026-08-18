import { describe, it, expect, vi, beforeEach } from "vitest";

// Моки Prisma: минимальный набор для addBooksToTierList (решение 17.08:
// локальные книги не матчатся — каждому пользователю свой оригинал;
// матчинг только по внешнему ID (source + externalId) среди draft)
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

const userBook = (id: number, overrides: Record<string, unknown> = {}) => ({
  id,
  title: "1984",
  author: "Orwell",
  authorId: 999,
  coverImageUrl: "/cover.jpg",
  slug: null,
  status: "draft",
  source: null,
  externalId: null,
  publishedYear: null,
  rating: null,
  ...overrides,
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

  it("гонка на unique (source, externalId): канон-draft → link вместо дубля", async () => {
    // Параллельный запрос уже создал книгу: create падает (target — не slug)
    (prisma.book.create as any).mockRejectedValueOnce(p2002(["source", "externalId"]));
    // findRaceCanon находит победителя — пользовательскую (draft) книгу
    (prisma.book.findFirst as any)
      .mockResolvedValueOnce(null) // дедуп по (source, externalId) среди draft: ещё не видна
      .mockResolvedValueOnce(userBook(7)); // findRaceCanon: нашёл после гонки

    const result = await addBooksToTierList("1", [book]);

    expect(prisma.book.create).toHaveBeenCalledTimes(1);
    expect(prisma.bookPlacement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bookId: 7, tierListId: "1" }),
      }),
    );
    expect(result[0]?.book?.id).toBe(7);
  });

  it("гонка: канон оказался КАТАЛОГОВЫМ (published) → не линкуемся, создаём локальную копию без externalId", async () => {
    (prisma.book.create as any)
      .mockRejectedValueOnce(p2002(["source", "externalId"]))
      .mockResolvedValueOnce({ id: 100 }); // локальная копия
    (prisma.book.findFirst as any)
      .mockResolvedValueOnce(null) // дедуп среди draft
      .mockResolvedValueOnce(userBook(7, { status: "published", slug: "1984" })); // каталог!

    const result = await addBooksToTierList("1", [book]);

    // Копия создана повторно, но без внешнего ID (unique (source, externalId) не нарушен)
    expect(prisma.book.create).toHaveBeenCalledTimes(2);
    expect(prisma.book.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ externalId: null, source: null, status: "draft" }),
      }),
    );
    expect(result[0]?.book?.id).toBe(100);
  });

  it("конфликт именно по slug → retry-цикл с суффиксом (-2), без link", async () => {
    // Slug занят существующей книгой — pre-check (findUnique до create)
    // находит её, createBookWithSlug сразу переходит на суффикс -2
    // (без P2002, который abort'ил бы транзакцию)
    (prisma.book.findUnique as any).mockResolvedValueOnce(userBook(50));
    (prisma.book.create as any).mockImplementationOnce(({ data }: any) =>
      Promise.resolve({ id: 100, ...data }),
    );

    const result = await addBooksToTierList("1", [book]);

    expect(prisma.book.create).toHaveBeenCalledTimes(1);
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
    // Дедуп и перезапрос не нашли канон (победитель уже удалён/откатился)
    (prisma.book.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await expect(addBooksToTierList("1", [book])).rejects.toThrow(
      "Unique constraint failed",
    );
    expect(prisma.bookPlacement.create).not.toHaveBeenCalled();
  });

  it("локальная книга не матчится по (title, author) — создаётся свой оригинал", async () => {
    // В базе есть draft с тем же названием (queryRaw нашёл бы её), но локальные
    // книги не матчатся: каждому пользователю — свой оригинал (решение 17.08)
    (prisma.$queryRaw as any).mockResolvedValue([{ id: 7 }]);
    (prisma.book.create as any).mockResolvedValue({ id: 100, status: "draft" });

    const result = await addBooksToTierList("1", [
      { title: "1984", author: "Orwell", coverImageUrl: "cover.jpg" },
    ]);

    expect(prisma.book.create).toHaveBeenCalledTimes(1);
    expect(prisma.bookPlacement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ bookId: 100 }) }),
    );
    expect(result[0]?.book?.id).toBe(100);
  });
});