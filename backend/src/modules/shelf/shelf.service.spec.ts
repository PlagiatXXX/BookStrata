import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/prisma.js", () => {
  const tx = {
    book: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    bookStatus: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
  return { prisma: tx };
});

import { NotFoundError } from "../../lib/errors.js";
import {
  getShelf,
  setShelfStatus,
  removeShelfStatus,
  removeShelfBooks,
  importShelf,
} from "./shelf.service.js";

describe("Shelf Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getShelf", () => {
    it("должен вернуть пустую полку", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      vi.mocked(prisma.bookStatus.findMany).mockResolvedValue([]);

      const shelf = await getShelf(1);
      expect(shelf).toEqual([]);
      expect(prisma.bookStatus.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 1 } }),
      );
    });

    it("должен маппить статусы в ShelfEntry", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      vi.mocked(prisma.bookStatus.findMany).mockResolvedValue([
        { bookId: 10, status: "read" },
        { bookId: 11, status: "want_to_read" },
      ] as any);

      const shelf = await getShelf(1);
      expect(shelf).toEqual([
        { bookId: 10, status: "read" },
        { bookId: 11, status: "want_to_read" },
      ]);
    });
  });

  describe("setShelfStatus", () => {
    it("должен кинуть NotFoundError если книга не найдена (числовой ключ)", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      vi.mocked(prisma.book.findUnique).mockResolvedValue(null);

      await expect(setShelfStatus(1, "999", "read")).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(prisma.bookStatus.upsert).not.toHaveBeenCalled();
    });

    it("должен кинуть NotFoundError для строкового ключа без данных", async () => {
      const { prisma } = await import("../../lib/prisma.js");

      await expect(setShelfStatus(1, "curated_x", "read")).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(prisma.bookStatus.upsert).not.toHaveBeenCalled();
    });

    it("должен создать запись через upsert", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      vi.mocked(prisma.book.findUnique).mockResolvedValue({ id: 10 } as any);
      vi.mocked(prisma.bookStatus.upsert).mockResolvedValue({
        bookId: 10,
        status: "want_to_read",
      } as any);

      const entry = await setShelfStatus(1, "10", "want_to_read");
      expect(entry).toEqual({ bookId: 10, status: "want_to_read" });
      expect(prisma.bookStatus.upsert).toHaveBeenCalledWith({
        where: { bookId_userId: { bookId: 10, userId: 1 } },
        create: { bookId: 10, userId: 1, status: "want_to_read" },
        update: { status: "want_to_read" },
        select: { bookId: true, status: true },
      });
    });

    it("должен создать книгу для строкового ключа с данными (find-or-create)", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      vi.mocked(prisma.book.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.book.create).mockResolvedValue({ id: 42 } as any);
      vi.mocked(prisma.bookStatus.upsert).mockResolvedValue({
        bookId: 42,
        status: "read",
      } as any);

      const entry = await setShelfStatus(1, "curated_1_1782461891402", "read", {
        title: "Цирцея",
        author: "Мадлен Миллер",
      });

      expect(entry).toEqual({ bookId: 42, status: "read" });
      expect(prisma.book.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ title: "Цирцея", author: "Мадлен Миллер" }),
        select: { id: true },
      });
      expect(prisma.bookStatus.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { bookId_userId: { bookId: 42, userId: 1 } },
        }),
      );
    });

    it("должен переиспользовать существующую книгу (findFirst → upsert)", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      vi.mocked(prisma.book.findFirst).mockResolvedValue({ id: 7 } as any);
      vi.mocked(prisma.bookStatus.upsert).mockResolvedValue({
        bookId: 7,
        status: "read",
      } as any);

      const entry = await setShelfStatus(1, "curated_x", "read", {
        title: "Цирцея",
        author: "Мадлен Миллер",
      });

      expect(entry).toEqual({ bookId: 7, status: "read" });
      expect(prisma.book.create).not.toHaveBeenCalled();
      expect(prisma.book.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ title: "Цирцея" }),
        }),
      );
    });

    it("должен обновить статус при повторной установке (upsert update)", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      vi.mocked(prisma.book.findUnique).mockResolvedValue({ id: 10 } as any);
      vi.mocked(prisma.bookStatus.upsert).mockResolvedValue({
        bookId: 10,
        status: "read",
      } as any);

      const entry = await setShelfStatus(1, "10", "read");
      expect(entry.status).toBe("read");
      expect(prisma.bookStatus.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { status: "read" },
          create: { bookId: 10, userId: 1, status: "read" },
        }),
      );
    });
  });

  describe("removeShelfStatus", () => {
    it("должен удалить отметку", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      vi.mocked(prisma.bookStatus.deleteMany).mockResolvedValue({ count: 1 } as any);

      await removeShelfStatus(1, 10);
      expect(prisma.bookStatus.deleteMany).toHaveBeenCalledWith({
        where: { bookId: 10, userId: 1 },
      });
    });
  });

  describe("removeShelfBooks", () => {
    it("должен удалить отметки по числовым ключам", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      vi.mocked(prisma.bookStatus.deleteMany).mockResolvedValue({ count: 2 } as any);

      const result = await removeShelfBooks(1, ["10", "11"]);
      expect(result).toEqual({ removed: 2 });
      expect(prisma.bookStatus.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1, bookId: { in: [10, 11] } },
      });
    });

    it("должен пропустить строковые ключи", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      const result = await removeShelfBooks(1, ["curated_x", "yl_2"]);

      expect(result).toEqual({ removed: 0 });
      expect(prisma.bookStatus.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe("importShelf", () => {
    it("должен вернуть 0 при пустом списке без запросов в БД", async () => {
      const result = await importShelf(1, []);

      expect(result).toEqual({ imported: 0 });
    });

    it("должен импортировать по числовым ключам", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      vi.mocked(prisma.bookStatus.upsert).mockResolvedValue({} as any);

      const result = await importShelf(1, [
        { bookKey: "1", status: "read" },
        { bookKey: "2", status: "want_to_read" },
      ]);

      expect(result).toEqual({ imported: 2 });
      expect(prisma.bookStatus.upsert).toHaveBeenCalledTimes(2);
    });

    it("должен создать книги для строковых ключей с данными", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      vi.mocked(prisma.book.findFirst).mockResolvedValue({ id: 100 } as any);
      vi.mocked(prisma.bookStatus.upsert).mockResolvedValue({} as any);

      const result = await importShelf(1, [
        {
          bookKey: "curated_1_1782461891402",
          status: "read",
          book: { title: "Цирцея", author: "Мадлен Миллер" },
        },
      ]);

      expect(result).toEqual({ imported: 1 });
      expect(prisma.book.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ title: "Цирцея" }),
        }),
      );
      expect(prisma.book.create).not.toHaveBeenCalled();
    });

    it("должен пропустить строковые ключи без данных книги", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      vi.mocked(prisma.bookStatus.upsert).mockResolvedValue({} as any);

      const result = await importShelf(1, [
        { bookKey: "1", status: "read" },
        { bookKey: "curated_x", status: "read" },
      ]);

      expect(result).toEqual({ imported: 1 });
      expect(prisma.bookStatus.upsert).toHaveBeenCalledTimes(1);
    });
  });
});