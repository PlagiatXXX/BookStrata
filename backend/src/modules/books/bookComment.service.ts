// backend/src/modules/books/bookComment.service.ts
import { prisma } from "../../lib/prisma.js";

const MAX_COMMENT_LENGTH = 2000;
const COMMENT_DEFAULT_LIMIT = 10;
const COMMENT_MAX_LIMIT = 50;

export class CommentNotFoundError extends Error {
  constructor() {
    super("comment_not_found");
    this.name = "CommentNotFoundError";
  }
}

export class CommentForbiddenError extends Error {
  constructor() {
    super("comment_forbidden");
    this.name = "CommentForbiddenError";
  }
}

export class CannotLikeOwnCommentError extends Error {
  constructor() {
    super("cannot_like_own_comment");
    this.name = "CannotLikeOwnCommentError";
  }
}

/** Проверка: книга существует и опубликована (иначе комментарии не публикуются) */
async function assertPublishedBook(slug: string): Promise<number> {
  const book = await prisma.book.findUnique({
    where: { slug },
    select: { id: true, status: true },
  });
  if (!book || book.status !== "published") {
    throw new Error("book_not_found");
  }
  return book.id;
}

/** GET — список комментариев книги (пагинация, newest first). Публичный. */
export async function getBookComments(
  slug: string,
  offset = 0,
  limit = COMMENT_DEFAULT_LIMIT,
) {
  const bookId = await assertPublishedBook(slug);

  const safeLimit = Math.min(Math.max(limit, 1), COMMENT_MAX_LIMIT);
  const safeOffset = Math.max(offset, 0);

  const [items, total] = await Promise.all([
    prisma.bookComment.findMany({
      where: { bookId },
      orderBy: { createdAt: "desc" },
      skip: safeOffset,
      take: safeLimit,
      select: {
        id: true,
        content: true,
        likesCount: true,
        editedAt: true,
        createdAt: true,
        parentId: true,
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    }),
    prisma.bookComment.count({ where: { bookId } }),
  ]);

  return { items, total };
}

/** POST — создание комментария (auth). content 1..2000, parentId — ответ на комментарий. */
export async function createBookComment(
  slug: string,
  userId: number,
  content: string,
  parentId?: number,
) {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > MAX_COMMENT_LENGTH) {
    throw new Error("invalid_comment_content");
  }

  const bookId = await assertPublishedBook(slug);

  if (parentId !== undefined) {
    const parent = await prisma.bookComment.findUnique({
      where: { id: parentId },
      select: { id: true, bookId: true },
    });
    if (!parent || parent.bookId !== bookId) {
      throw new Error("parent_comment_not_found");
    }
  }

  return prisma.bookComment.create({
    data: {
      bookId,
      userId,
      content: trimmed,
      ...(parentId !== undefined ? { parentId } : {}),
    },
    select: {
      id: true,
      content: true,
      likesCount: true,
      editedAt: true,
      createdAt: true,
      parentId: true,
      user: { select: { id: true, username: true, avatarUrl: true } },
    },
  });
}

/** PATCH — редактирование (только свой или admin). Помечает editedAt. */
export async function updateBookComment(
  commentId: number,
  userId: number,
  role: string,
  content: string,
) {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > MAX_COMMENT_LENGTH) {
    throw new Error("invalid_comment_content");
  }

  const comment = await prisma.bookComment.findUnique({
    where: { id: commentId },
    select: { userId: true },
  });
  if (!comment) {
    throw new CommentNotFoundError();
  }
  if (comment.userId !== userId && role !== "admin") {
    throw new CommentForbiddenError();
  }

  return prisma.bookComment.update({
    where: { id: commentId },
    data: { content: trimmed, editedAt: new Date() },
    select: {
      id: true,
      content: true,
      likesCount: true,
      editedAt: true,
      createdAt: true,
      parentId: true,
      user: { select: { id: true, username: true, avatarUrl: true } },
    },
  });
}

/** DELETE — удаление (только свой или admin/moderator). Cascade на replies. */
export async function deleteBookComment(
  commentId: number,
  userId: number,
  role: string,
) {
  const comment = await prisma.bookComment.findUnique({
    where: { id: commentId },
    select: { userId: true },
  });
  if (!comment) {
    throw new CommentNotFoundError();
  }
  if (comment.userId !== userId && !["admin", "moderator"].includes(role)) {
    throw new CommentForbiddenError();
  }

  await prisma.bookComment.delete({ where: { id: commentId } });
  return { success: true };
}

/** POST /:commentId/like — лайк/анлайк комментария. Нельзя лайкнуть свой. */
export async function toggleBookCommentLike(commentId: number, userId: number) {
  const comment = await prisma.bookComment.findUnique({
    where: { id: commentId },
    select: { id: true, userId: true },
  });
  if (!comment) {
    throw new CommentNotFoundError();
  }
  if (comment.userId === userId) {
    throw new CannotLikeOwnCommentError();
  }

  const existing = await prisma.bookCommentLike.findUnique({
    where: { commentId_userId: { commentId, userId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.bookCommentLike.delete({ where: { id: existing.id } }),
      prisma.$executeRaw`
        UPDATE "BookComment" SET "likesCount" = GREATEST("likesCount" - 1, 0) WHERE "id" = ${commentId}
      `,
    ]);
  } else {
    await prisma.$transaction([
      prisma.bookCommentLike.create({ data: { commentId, userId } }),
      prisma.$executeRaw`
        UPDATE "BookComment" SET "likesCount" = "likesCount" + 1 WHERE "id" = ${commentId}
      `,
    ]);
  }

  const updated = await prisma.bookComment.findUnique({
    where: { id: commentId },
    select: { likesCount: true },
  });

  return { liked: !existing, likesCount: updated?.likesCount ?? 0 };
}