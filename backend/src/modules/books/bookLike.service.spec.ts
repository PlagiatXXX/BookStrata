import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    book: {
      findUnique: vi.fn(),
    },
    bookLike: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
    $executeRaw: vi.fn(),
  },
}));

import { prisma } from "../../lib/prisma.js";
import { toggleBookLike } from "./bookLike.service.js";

describe("toggleBookLike", () => {
  beforeEach(() => vi.clearAllMocks());

  it("бросает book_not_found, если книги нет", async () => {
    (prisma.book.findUnique as any).mockResolvedValue(null);
    await expect(toggleBookLike("net-takoy", 1)).rejects.toThrow("book_not_found");
  });

  it("лайк: создаёт BookLike и атомарно инкрементирует счётчик", async () => {
    (prisma.book.findUnique as any)
      .mockResolvedValueOnce({ id: 5 }) // поиск книги
      .mockResolvedValueOnce({ likesCount: 7 }); // чтение после
    (prisma.bookLike.findUnique as any).mockResolvedValue(null);
    (prisma.bookLike.create as any).mockResolvedValue({ id: 1 });

    const result = await toggleBookLike("voyna-i-mir", 3);

    expect(result).toEqual({ liked: true, likesCount: 7 });
    expect(prisma.bookLike.create).toHaveBeenCalledWith({ data: { bookId: 5, userId: 3 } });
    // В транзакции два элемента: create + $executeRaw
    const txOps = (prisma.$transaction as any).mock.calls[0][0];
    expect(txOps).toHaveLength(2);
    expect(String((prisma.$executeRaw as any).mock.calls[0][0])).toContain("likesCount");
  });

  it("анлайк: удаляет BookLike и декрементирует счётчик (не ниже 0)", async () => {
    (prisma.book.findUnique as any)
      .mockResolvedValueOnce({ id: 5 })
      .mockResolvedValueOnce({ likesCount: 6 });
    (prisma.bookLike.findUnique as any).mockResolvedValue({ id: 99 });

    const result = await toggleBookLike("voyna-i-mir", 3);

    expect(result).toEqual({ liked: false, likesCount: 6 });
    expect(prisma.bookLike.delete).toHaveBeenCalledWith({ where: { id: 99 } });
    expect(String((prisma.$executeRaw as any).mock.calls[0][0])).toContain("GREATEST");
    expect(prisma.bookLike.create).not.toHaveBeenCalled();
  });
});