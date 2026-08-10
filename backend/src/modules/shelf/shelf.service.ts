import { prisma } from "../../lib/prisma.js";
import { NotFoundError } from "../../lib/errors.js";
import type { ShelfStatus } from "./shelf.schema.js";

export interface ShelfEntry {
  bookId: number;
  status: ShelfStatus;
}

/** Данные книги для find-or-create (когда bookId не число) */
export interface ShelfBookData {
  title: string;
  author?: string;
  coverImageUrl?: string;
  genre?: string;
  description?: string;
}

/**
 * Превращает ключ книги в числовой id.
 * Числовые ключи (тир-листы, поиск) — валидные id таблицы Book.
 * Строковые ключи (книги коллекций вида "curated_1_...") — null,
 * для них нужен find-or-create по данным.
 */
function resolveBookId(bookKey: string): number | null {
  const parsed = Number(bookKey);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

/** Экспорт для route: числовой key → Book.id, иначе null */
export { resolveBookId };

/**
 * Найти книгу по данным (title + author) или создать новую.
 * Нужно для книг коллекций: они хранятся в виде JSON внутри Collection
 * и не имеют записи в таблице Book, а полка ссылается на Book.id.
 */
async function findOrCreateBook(data: ShelfBookData): Promise<number> {
  const existing = await prisma.book.findFirst({
    where: {
      title: data.title,
      ...(data.author ? { author: data.author } : {}),
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing.id;

  const created = await prisma.book.create({
    data: {
      title: data.title,
      author: data.author ?? null,
      coverImageUrl: data.coverImageUrl ?? "",
      genre: data.genre ?? null,
      description: data.description ?? null,
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * Получить всю полку пользователя: [{ bookId, status }]
 */
export async function getShelf(userId: number): Promise<ShelfEntry[]> {
  const rows = await prisma.bookStatus.findMany({
    where: { userId },
    select: { bookId: true, status: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => ({
    bookId: row.bookId,
    status: row.status as ShelfStatus,
  }));
}

/** Снимок книги для страницы полки */
export interface ShelfBookEntry {
  bookId: number;
  status: ShelfStatus;
  book: {
    id: number;
    title: string;
    author: string | null;
    coverImageUrl: string;
    genre: string | null;
    description: string | null;
  };
}

/**
 * Полка с данными книг — для страницы «Полка».
 * Книги, созданные find-or-create из коллекций, имеют те же поля.
 */
export async function getShelfBooks(userId: number): Promise<ShelfBookEntry[]> {
  const rows = await prisma.bookStatus.findMany({
    where: { userId },
    include: {
      book: {
        select: {
          id: true,
          title: true,
          author: true,
          coverImageUrl: true,
          genre: true,
          description: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => ({
    bookId: row.bookId,
    status: row.status as ShelfStatus,
    book: row.book,
  }));
}

/**
 * Установить/переключить статус книги (upsert).
 * Принимает ключ книги как строку: числовой ключ использует существующую
 * запись Book, строковый (книги коллекций) — находит/создаёт книгу по данным.
 * Один статус на книгу (unique [bookId, userId]).
 */
export async function setShelfStatus(
  userId: number,
  bookKey: string,
  status: ShelfStatus,
  bookData?: ShelfBookData,
): Promise<ShelfEntry> {
  const existingId = resolveBookId(bookKey);
  let bookId = existingId;

  if (bookId === null) {
    if (!bookData?.title) {
      throw new NotFoundError("Книга не найдена: нет данных для создания");
    }
    bookId = await findOrCreateBook(bookData);
  } else {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true },
    });
    if (!book) {
      throw new NotFoundError("Книга не найдена");
    }
  }

  const row = await prisma.bookStatus.upsert({
    where: { bookId_userId: { bookId, userId } },
    create: { bookId, userId, status },
    update: { status },
    select: { bookId: true, status: true },
  });

  return { bookId: row.bookId, status: row.status as ShelfStatus };
}

/**
 * Снять отметку с книги. Не ошибка, если отметки не было.
 */
export async function removeShelfStatus(userId: number, bookId: number): Promise<void> {
  await prisma.bookStatus.deleteMany({ where: { bookId, userId } });
}

/**
 * Снять отметки с набора книг одним запросом.
 * Принимает ключи книг строками: числовые используются как Book.id,
 * нечисловые (книги коллекций) пропускаются — статусы на них всегда
 * хранятся под числовым id, созданным при отметке.
 * Используется при создании тир-листа из секции полки (или всей полки).
 */
export async function removeShelfBooks(
  userId: number,
  bookKeys: string[],
): Promise<{ removed: number }> {
  const bookIds = bookKeys
    .map(resolveBookId)
    .filter((id): id is number => id !== null);
  if (bookIds.length === 0) return { removed: 0 };
  const result = await prisma.bookStatus.deleteMany({
    where: { userId, bookId: { in: bookIds } },
  });
  return { removed: result.count };
}

/**
 * Импорт гостевой полки в аккаунт после входа.
 * Merge: гость дополняет серверную полку, статусы гостя побеждают.
 * Числовые ключи — существующие книги; строковые ключи (книги коллекций)
 * находят/создают запись Book по переданным данным. Записи без данных
 * пропускаются (гостевая полка могла сохраниться до введения meta).
 */
export async function importShelf(
  userId: number,
  items: Array<{ bookKey: string; status: ShelfStatus; book?: ShelfBookData }>,
): Promise<{ imported: number }> {
  if (items.length === 0) return { imported: 0 };

  let imported = 0;
  for (const item of items) {
    const existingId = resolveBookId(item.bookKey);
    let bookId: number | null = existingId;

    if (bookId === null) {
      if (!item.book?.title) continue; // нет данных для создания — пропускаем
      bookId = await findOrCreateBook(item.book);
    }

    await prisma.bookStatus.upsert({
      where: { bookId_userId: { bookId, userId } },
      create: { bookId, userId, status: item.status },
      update: { status: item.status },
    });
    imported += 1;
  }

  return { imported };
}