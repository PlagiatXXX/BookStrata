import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    book: { findUnique: vi.fn() },
    bookComment: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    bookCommentLike: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
    $executeRaw: vi.fn(),
  },
}));

import { prisma } from "../../lib/prisma.js";
import {
  getBookComments,
  createBookComment,
  updateBookComment,
  deleteBookComment,
  toggleBookCommentLike,
  CommentNotFoundError,
  CommentForbiddenError,
  CannotLikeOwnCommentError,
} from "./bookComment.service.js";

const publishedBook = { id: 1, status: "published" };
const commentRow = {
  id: 10,
  content: "Отлично",
  likesCount: 0,
  editedAt: null,
  createdAt: new Date(),
  parentId: null,
  userId: 3,
};

describe("getBookComments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("возвращает items + total для published-книги", async () => {
    (prisma.book.findUnique as any).mockResolvedValue(publishedBook);
    (prisma.bookComment.findMany as any).mockResolvedValue([commentRow]);
    (prisma.bookComment.count as any).mockResolvedValue(1);

    const result = await getBookComments("voyna-i-mir", 0, 10);

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    // newest first
    expect((prisma.bookComment.findMany as any).mock.calls[0][0].orderBy.createdAt).toBe("desc");
    expect((prisma.bookComment.findMany as any).mock.calls[0][0].take).toBe(10);
  });

  it("бросает book_not_found для draft/несуществующей книги", async () => {
    (prisma.book.findUnique as any).mockResolvedValue({ id: 2, status: "draft" });
    await expect(getBookComments("draft", 0, 10)).rejects.toThrow("book_not_found");
  });

  it("ограничивает limit и не даёт отрицательный offset", async () => {
    (prisma.book.findUnique as any).mockResolvedValue(publishedBook);
    (prisma.bookComment.findMany as any).mockResolvedValue([]);
    (prisma.bookComment.count as any).mockResolvedValue(0);

    await getBookComments("voyna-i-mir", -5, 999);

    const args = (prisma.bookComment.findMany as any).mock.calls[0][0];
    expect(args.skip).toBe(0);
    expect(args.take).toBe(50);
  });
});

describe("createBookComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("создаёт комментарий с автором", async () => {
    (prisma.book.findUnique as any).mockResolvedValue(publishedBook);
    (prisma.bookComment.create as any).mockImplementation(async ({ data }: any) => ({
      ...commentRow,
      content: data.content,
      user: { id: 3, username: "vasya" },
    }));

    const result = await createBookComment("voyna-i-mir", 3, "  Хорошая книга  ");

    expect(result.content).toBe("Хорошая книга");
    expect(prisma.bookComment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bookId: 1, userId: 3, content: "Хорошая книга" }),
      }),
    );
  });

  it("отвечает на комментарий: parentId валидируется по той же книге", async () => {
    (prisma.book.findUnique as any).mockResolvedValue(publishedBook);
    (prisma.bookComment.findUnique as any).mockResolvedValue({ id: 10, bookId: 1 });
    (prisma.bookComment.create as any).mockResolvedValue({ ...commentRow, parentId: 10 });

    await createBookComment("voyna-i-mir", 3, "Ответ", 10);

    expect(prisma.bookComment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ parentId: 10 }) }),
    );
  });

  it("отклоняет parent из другой книги", async () => {
    (prisma.book.findUnique as any).mockResolvedValue(publishedBook);
    (prisma.bookComment.findUnique as any).mockResolvedValue({ id: 10, bookId: 999 });

    await expect(createBookComment("voyna-i-mir", 3, "Ответ", 10)).rejects.toThrow("parent_comment_not_found");
  });

  it("отклоняет пустой и слишком длинный текст", async () => {
    (prisma.book.findUnique as any).mockResolvedValue(publishedBook);
    await expect(createBookComment("voyna-i-mir", 3, "   ")).rejects.toThrow("invalid_comment_content");
    await expect(createBookComment("voyna-i-mir", 3, "x".repeat(2001))).rejects.toThrow("invalid_comment_content");
    expect(prisma.bookComment.create).not.toHaveBeenCalled();
  });
});

describe("updateBookComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("владелец редактирует свой комментарий, ставится editedAt", async () => {
    (prisma.bookComment.findUnique as any).mockResolvedValue({ id: 10, userId: 3 });
    (prisma.bookComment.update as any).mockResolvedValue({ ...commentRow, content: "Новое", editedAt: new Date() });

    const result = await updateBookComment(10, 3, "user", "Новое");

    expect(result.content).toBe("Новое");
    const data = (prisma.bookComment.update as any).mock.calls[0][0].data;
    expect(data.editedAt).toBeInstanceOf(Date);
  });

  it("admin редактирует чужой комментарий", async () => {
    (prisma.bookComment.findUnique as any).mockResolvedValue({ id: 10, userId: 3 });
    (prisma.bookComment.update as any).mockResolvedValue({ ...commentRow, content: "Новое" });

    await expect(updateBookComment(10, 99, "admin", "Новое")).resolves.toBeTruthy();
  });

  it("чужой пользователь не может редактировать", async () => {
    (prisma.bookComment.findUnique as any).mockResolvedValue({ id: 10, userId: 3 });
    await expect(updateBookComment(10, 99, "user", "Новое")).rejects.toThrow(CommentForbiddenError);
    expect(prisma.bookComment.update).not.toHaveBeenCalled();
  });

  it("несуществующий комментарий → CommentNotFoundError", async () => {
    (prisma.bookComment.findUnique as any).mockResolvedValue(null);
    await expect(updateBookComment(404, 3, "user", "Новое")).rejects.toThrow(CommentNotFoundError);
  });
});

describe("deleteBookComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("владелец удаляет свой комментарий", async () => {
    (prisma.bookComment.findUnique as any).mockResolvedValue({ id: 10, userId: 3 });
    (prisma.bookComment.delete as any).mockResolvedValue({ id: 10 });

    await expect(deleteBookComment(10, 3, "user")).resolves.toEqual({ success: true });
    expect(prisma.bookComment.delete).toHaveBeenCalledWith({ where: { id: 10 } });
  });

  it("moderator удаляет чужой", async () => {
    (prisma.bookComment.findUnique as any).mockResolvedValue({ id: 10, userId: 3 });
    (prisma.bookComment.delete as any).mockResolvedValue({ id: 10 });

    await expect(deleteBookComment(10, 99, "moderator")).resolves.toEqual({ success: true });
  });

  it("обычный пользователь не может удалить чужой", async () => {
    (prisma.bookComment.findUnique as any).mockResolvedValue({ id: 10, userId: 3 });
    await expect(deleteBookComment(10, 99, "user")).rejects.toThrow(CommentForbiddenError);
    expect(prisma.bookComment.delete).not.toHaveBeenCalled();
  });
});

describe("toggleBookCommentLike", () => {
  beforeEach(() => vi.clearAllMocks());

  it("нельзя лайкнуть свой комментарий", async () => {
    (prisma.bookComment.findUnique as any).mockResolvedValue({ id: 10, userId: 3 });
    await expect(toggleBookCommentLike(10, 3)).rejects.toThrow(CannotLikeOwnCommentError);
  });

  it("лайк: создаёт BookCommentLike и инкрементирует", async () => {
    (prisma.bookComment.findUnique as any)
      .mockResolvedValueOnce({ id: 10, userId: 3 }) // проверка владельца
      .mockResolvedValueOnce({ likesCount: 4 }); // чтение после
    (prisma.bookCommentLike.findUnique as any).mockResolvedValue(null);
    (prisma.bookCommentLike.create as any).mockResolvedValue({ id: 1 });

    const result = await toggleBookCommentLike(10, 5);

    expect(result).toEqual({ liked: true, likesCount: 4 });
    expect(prisma.bookCommentLike.create).toHaveBeenCalledWith({ data: { commentId: 10, userId: 5 } });
    expect(String((prisma.$executeRaw as any).mock.calls[0][0])).toContain("likesCount");
  });

  it("анлайк: удаляет и декрементирует", async () => {
    (prisma.bookComment.findUnique as any)
      .mockResolvedValueOnce({ id: 10, userId: 3 })
      .mockResolvedValueOnce({ likesCount: 3 });
    (prisma.bookCommentLike.findUnique as any).mockResolvedValue({ id: 99 });
    (prisma.bookCommentLike.delete as any).mockResolvedValue({ id: 99 });

    const result = await toggleBookCommentLike(10, 5);

    expect(result).toEqual({ liked: false, likesCount: 3 });
    expect(prisma.bookCommentLike.delete).toHaveBeenCalledWith({ where: { id: 99 } });
    expect(String((prisma.$executeRaw as any).mock.calls[0][0])).toContain("GREATEST");
  });

  it("несуществующий комментарий → CommentNotFoundError", async () => {
    (prisma.bookComment.findUnique as any).mockResolvedValue(null);
    await expect(toggleBookCommentLike(404, 5)).rejects.toThrow(CommentNotFoundError);
  });
});