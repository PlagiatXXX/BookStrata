// backend/src/modules/books/bookPublish.service.ts
import { prisma } from "../../lib/prisma.js";

/** Поля, обязательные для перехода книги в published */
export const PUBLISH_REQUIRED_FIELDS = [
  "title",
  "author",
  "genre",
  "tags",
  "description",
  "coverImageUrl",
  "publishedYear",
] as const;

export type PublishRequiredField = (typeof PUBLISH_REQUIRED_FIELDS)[number];

/** Ошибка: книга неполная для публикации (список недостающих полей в details) */
export class IncompleteBookError extends Error {
  constructor(public missingFields: PublishRequiredField[]) {
    super(`Книга неполная для публикации: ${missingFields.join(", ")}`);
    this.name = "IncompleteBookError";
  }
}

/**
 * Процедурный инвариант публикации: status = published присваивается ТОЛЬКО через эту команду.
 * Внутри транзакции проверяет полноту обязательных полей, проставляет status и publishedAt.
 * publishedAt — дата ПЕРВОГО перехода в published, не перезаписывается при повторной публикации.
 */
export async function publishBook(bookId: number) {
  return prisma.$transaction(async (tx) => {
    const book = await tx.book.findUnique({ where: { id: bookId } });
    if (!book) {
      throw new Error("book_not_found");
    }

    const missing = PUBLISH_REQUIRED_FIELDS.filter((field) => {
      const value = book[field];
      if (Array.isArray(value)) return value.length === 0;
      return !value;
    });
    if (missing.length > 0) {
      throw new IncompleteBookError(missing as PublishRequiredField[]);
    }

    return tx.book.update({
      where: { id: bookId },
      data: {
        status: "published",
        publishedAt: book.publishedAt ?? new Date(),
      },
    });
  });
}

/**
 * Возврат в черновик: publishedAt сохраняется (это дата первого перехода в published,
 * она же вернётся при повторной публикации).
 */
export async function unpublishBook(bookId: number) {
  return prisma.$transaction(async (tx) => {
    const book = await tx.book.findUnique({ where: { id: bookId } });
    if (!book) {
      throw new Error("book_not_found");
    }
    return tx.book.update({
      where: { id: bookId },
      data: { status: "draft" },
    });
  });
}