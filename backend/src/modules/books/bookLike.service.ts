// backend/src/modules/books/bookLike.service.ts
import { prisma } from "../../lib/prisma.js";

/**
 * Лайк/анлайк книги. Один пользователь — один лайк (BookLike @@unique([bookId, userId])).
 * Атомарный инкремент/декремент Book.likesCount через $executeRaw — защита от гонки.
 * Возвращает новое состояние: { liked, likesCount }.
 */
export async function toggleBookLike(bookSlug: string, userId: number) {
  const book = await prisma.book.findUnique({
    where: { slug: bookSlug },
    select: { id: true },
  });
  if (!book) {
    throw new Error("book_not_found");
  }

  const existing = await prisma.bookLike.findUnique({
    where: { bookId_userId: { bookId: book.id, userId } },
    select: { id: true },
  });

  if (existing) {
    // Анлайк: удаляем связь и декрементируем счётчик (не ниже 0)
    await prisma.$transaction([
      prisma.bookLike.delete({ where: { id: existing.id } }),
      prisma.$executeRaw`
        UPDATE "Book" SET "likesCount" = GREATEST("likesCount" - 1, 0) WHERE "id" = ${book.id}
      `,
    ]);
  } else {
    // Лайк: создаём связь и инкрементируем
    await prisma.$transaction([
      prisma.bookLike.create({ data: { bookId: book.id, userId } }),
      prisma.$executeRaw`
        UPDATE "Book" SET "likesCount" = "likesCount" + 1 WHERE "id" = ${book.id}
      `,
    ]);
  }

  const updated = await prisma.book.findUnique({
    where: { id: book.id },
    select: { likesCount: true },
  });

  return { liked: !existing, likesCount: updated?.likesCount ?? 0 };
}