import { describe, it, expect, vi, beforeEach } from "vitest";

const completeBook = {
  id: 1,
  title: "Война и мир",
  author: "Лев Толстой",
  authorId: 10,
  coverImageUrl: "/cover.jpg",
  description: "Роман-эпопея",
  genre: "Классика",
  tags: ["роман"],
  status: "draft",
  publishedAt: null,
  publishedYear: 1869,
};

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    $transaction: vi.fn((fn: (tx: any) => Promise<unknown>) => fn({ book: mockBookTx })),
    book: {},
  },
}));

const mockBookTx = {
  findUnique: vi.fn(),
  update: vi.fn(),
};

import { publishBook, unpublishBook, IncompleteBookError } from "./bookPublish.service.js";

describe("publishBook", () => {
  beforeEach(() => vi.clearAllMocks());

  it("публикует полную книгу и проставляет publishedAt", async () => {
    mockBookTx.findUnique.mockResolvedValue(completeBook);
    mockBookTx.update.mockResolvedValue({ ...completeBook, status: "published", publishedAt: new Date() });

    await publishBook(1);

    expect(mockBookTx.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ status: "published" }),
    });
    // publishedAt проставлен только если не было
    const data = mockBookTx.update.mock.calls[0][0].data;
    expect(data.publishedAt).toBeInstanceOf(Date);
  });

  it("НЕ перезаписывает publishedAt при повторной публикации", async () => {
    const firstPublishedAt = new Date("2026-08-01T10:00:00Z");
    mockBookTx.findUnique.mockResolvedValue({ ...completeBook, status: "draft", publishedAt: firstPublishedAt });

    await publishBook(1);

    const data = mockBookTx.update.mock.calls[0][0].data;
    expect(data.publishedAt).toBe(firstPublishedAt);
  });

  it("бросает IncompleteBookError с недостающими полями для неполной книги", async () => {
    mockBookTx.findUnique.mockResolvedValue({
      ...completeBook,
      description: null,
      publishedYear: null,
      tags: [],
    });

    await expect(publishBook(1)).rejects.toThrow(IncompleteBookError);
    try {
      await publishBook(1);
    } catch (e) {
      expect((e as IncompleteBookError).missingFields).toEqual(["tags", "description", "publishedYear"]);
    }
    expect(mockBookTx.update).not.toHaveBeenCalled();
  });

  it("бросает ошибку, если книга не найдена", async () => {
    mockBookTx.findUnique.mockResolvedValue(null);
    await expect(publishBook(999)).rejects.toThrow("book_not_found");
  });
});

describe("unpublishBook", () => {
  beforeEach(() => vi.clearAllMocks());

  it("переводит в draft и сохраняет publishedAt", async () => {
    const publishedAt = new Date("2026-08-01T10:00:00Z");
    mockBookTx.findUnique.mockResolvedValue({ ...completeBook, status: "published", publishedAt });

    await unpublishBook(1);

    expect(mockBookTx.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: "draft" },
    });
  });
});