import { prisma, resolveTierListId, tierListRepository } from "./tierList.utils.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { createLogger } from "../../lib/logger.js";
import { sanitize } from "../../lib/sanitizer.js";
import { createAuthorService, type AuthorResult } from "../authors/authors.service.js";
import { createBookWithSlug, isPrismaP2002 } from "../../lib/slug.js";
import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Лёгкая нормализация названия/автора для SQL-матчинга:
 * lower, trim, ё→е, схлопывание пробелов. Семантически совпадает
 * с SQL-выражением lower(trim(regexp_replace(translate(x, 'Ёё', 'Ее'), '\s+', ' ', 'g'))).
 */
export function normTitleForSql(text: string): string {
  return text.toLowerCase().trim().replace(/ё/g, "е").replace(/\s+/g, " ");
}

const logger = createLogger("TierListsBooks", { color: "cyan" });
const authorService = createAuthorService(prisma);

// Лимит отключён до введения подписок Pro

export async function updatePlacements(
  tierListId: string,
  placements: { bookId: number; tierId: number | null; rank: number }[],
) {
  const startTime = Date.now();

  if (placements.length === 0) return [];

  const realTierListId = await resolveTierListId(tierListId);

  const tierIds = Array.from(
    new Set(
      placements
        .filter((p) => p.tierId !== null)
        .map((p) => p.tierId as number),
    ),
  );

  if (tierIds.length > 0) {
    const tierCount = await prisma.tier.count({
      where: {
        id: { in: tierIds },
        tierListId: realTierListId,
      },
    });

    if (tierCount !== tierIds.length) {
      throw new ValidationError("One or more tiers do not belong to this tier list");
    }
  }

  // ⚠️ Фаза 2.4 (seobook.md): update/upsert вместо delete/recreate.
  // delete/recreate уничтожал бы личные данные вхождений (thoughts, coverImageUrl)
  // при каждом reorder — поля появятся в BookPlacement после миграции (Фаза 1).
  await prisma.$transaction(async (tx) => {
    const existing = await tx.bookPlacement.findMany({
      where: { tierListId: realTierListId },
      select: { bookId: true },
    });

    const existingBookIds = new Set(existing.map((p) => p.bookId));
    const incomingBookIds = new Set(placements.map((p) => p.bookId));

    // Существующие placements — обновляем позицию, не пересоздаём
    for (const p of placements) {
      if (!existingBookIds.has(p.bookId)) continue;
      await tx.bookPlacement.update({
        where: {
          tierListId_bookId: { tierListId: realTierListId, bookId: p.bookId },
        },
        data: { tierId: p.tierId, rank: p.rank },
      });
    }

    // Новые книги — создаём
    const toCreate = placements.filter((p) => !existingBookIds.has(p.bookId));
    if (toCreate.length > 0) {
      await tx.bookPlacement.createMany({
        data: toCreate.map((p) => ({
          tierListId: realTierListId,
          bookId: p.bookId,
          tierId: p.tierId,
          rank: p.rank,
        })),
      });
    }

    // Исчезнувшие из итогового состояния — удаляем (только реально ушедшие)
    const toDelete = existing
      .filter((p) => !incomingBookIds.has(p.bookId))
      .map((p) => p.bookId);
    if (toDelete.length > 0) {
      await tx.bookPlacement.deleteMany({
        where: { tierListId: realTierListId, bookId: { in: toDelete } },
      });
    }
  });

  const totalTime = Date.now() - startTime;
  logger.debug("updatePlacements завершено", {
    placementsCount: placements.length,
    totalTimeMs: totalTime,
  });
}

/**
 * Поиск СВОЕЙ книги пользователя для link-or-create (модель «личные книги», 18.08).
 * Каталог (published) и чужие книги в матчинге НЕ участвуют.
 *   - внешние (source + externalId): матч по (userId, source, externalId);
 *   - локальные (без внешнего ID): матч по (userId, normTitle, authorId) —
 *     повторное добавление своей книги не дублирует запись.
 */
export async function findExistingUserBook(
  db: PrismaClient | Prisma.TransactionClient,
  userId: number,
  bookData: {
    title: string;
    author?: string | null;
    authorId?: number | null;
    externalId?: string | null;
    source?: string | null;
  },
): Promise<{ id: number } | null> {
  // Внешние книги: один внешний ID = одна книга пользователя
  if (bookData.source && bookData.externalId) {
    const byExternalId = await db.book.findFirst({
      where: {
        userId,
        source: bookData.source as never,
        externalId: bookData.externalId,
        status: "draft",
      },
      select: { id: true },
    });
    if (byExternalId) return byExternalId;
    return null;
  }

  // Локальные книги: свои, по нормализованным (title, authorId)
  const normTitle = normTitleForSql(bookData.title);
  if (!normTitle) return null;
  const locals = await db.book.findMany({
    where: {
      userId,
      status: "draft",
      source: null,
      ...(bookData.authorId != null ? { authorId: bookData.authorId } : {}),
    },
    select: { id: true, title: true },
    orderBy: { id: "asc" },
  });
  const exact = locals.filter((b) => normTitleForSql(b.title) === normTitle);
  return exact.length > 0 ? exact[0]! : null;
}

export async function addBooksToTierList(
  tierListId: string,
  books: {
    title: string;
    author?: string | null;
    coverImageUrl: string;
    description?: string | null;
    thoughts?: string | null;
    genre?: string | null;
    tags?: string[];
    /** Внешний ID книги (Фаза 2.1): google volumeId / OpenLibrary key / LiveLib id */
    externalId?: string | null;
    /** Значение enum BookSource (google_books | open_library | livelib) */
    source?: "google_books" | "open_library" | "livelib" | null;
  }[],
) {
  if (books.length === 0) return [];

  const realTierListId = await resolveTierListId(tierListId);
  const tierList = await prisma.tierList.findUnique({
    where: { id: realTierListId },
    select: { userId: true },
  });
  if (!tierList) throw new NotFoundError("Tier list not found");
  const ownerId = tierList.userId;

  // Batch: находим или создаём всех авторов за один проход
  const authorNames = books.map((b) => b.author).filter(Boolean) as string[];
  const authorMap = authorNames.length > 0
    ? await authorService.findOrCreateMany(authorNames)
    : new Map<string, AuthorResult>();
  const booksWithAuthors = books.map((bookData) => ({
    ...bookData,
    authorId: bookData.author ? (authorMap.get(bookData.author)?.id ?? null) : null,
  }));

  // Пре-фаза ВНЕ транзакции: матчим ТОЛЬКО свои книги (модель «личные книги»).
  // Каталог (published) и чужие книги не участвуют — тир-листы не склеиваются.
  const matched = await Promise.all(
    booksWithAuthors.map(async (bookData) => ({
      bookData,
      existing: await findExistingUserBook(prisma, ownerId, bookData),
    })),
  );

  // Существующие placements листа: чтобы при повторном добавлении книги
  // не пересоздавать вхождение, а обновлять позицию (правило Фазы 2.4)
  const existingPlacements = await prisma.bookPlacement.findMany({
    where: { tierListId: realTierListId },
    select: { bookId: true, rank: true },
  });
  const existingBookIds = new Set(existingPlacements.map((p) => p.bookId));
  const startRank = Math.max(0, ...existingPlacements.map((p) => p.rank + 1), existingPlacements.length);

  const results = await prisma.$transaction(async (tx) => {
    const placements: Array<{
      tierListId: string;
      bookId: number;
      tierId: number | null;
      rank: number;
      book: { id: number };
    }> = [];

    for (let i = 0; i < matched.length; i++) {
      const { bookData, existing } = matched[i]!;
      const rank = startRank + i;

      if (existing) {
        // Найдена пользовательская книга → link: личные данные вхождения
        // (мысли/обложка) — в placement, глобальная Book НЕ трогается
        const personal = {
          thoughts: bookData.thoughts ? sanitize(bookData.thoughts) : null,
          coverImageUrl: bookData.coverImageUrl || null,
        };
        const placement = existingBookIds.has(existing.id)
          ? await tx.bookPlacement.update({
              where: {
                tierListId_bookId: { tierListId: realTierListId, bookId: existing.id },
              },
              data: { rank, ...personal },
              include: { book: true },
            })
          : await tx.bookPlacement.create({
              data: { tierListId: realTierListId, bookId: existing.id, rank, ...personal },
              include: { book: true },
            });
        placements.push(placement);
        continue;
      }

      // Пользовательской книги нет → create draft (личная, с владельцем) + авто-slug;
      // P2002 (гонка) → retry → link к своей книге (не к каталогу)
      placements.push(await linkOrCreate(tx, realTierListId, ownerId, bookData, rank));
    }

    return placements;
  });

  return results;
}

/**
 * Создание ЛИЧНОЙ книги (draft + userId + авто-slug) и её вхождения.
 * Конкурентная защита: два одновременных запроса могут оба создать внешнюю
 * книгу → INSERT падает с P2002 (unique [userId, source, externalId] / slug) →
 * перезапрос канона → link. Чужая книга или каталог не линкуются (см. ниже).
 */
async function linkOrCreate(
  tx: Prisma.TransactionClient,
  tierListId: string,
  userId: number,
  bookData: {
    title: string;
    author?: string | null;
    authorId?: number | null;
    coverImageUrl: string;
    description?: string | null;
    thoughts?: string | null;
    genre?: string | null;
    tags?: string[];
    externalId?: string | null;
    source?: "google_books" | "open_library" | "livelib" | null;
  },
  rank: number,
) {
  const personal = {
    thoughts: bookData.thoughts ? sanitize(bookData.thoughts) : null,
    coverImageUrl: bookData.coverImageUrl || null,
  };
  const createPlacement = (bookId: number) =>
    tx.bookPlacement.create({
      data: { tierListId, bookId, rank, ...personal },
      include: { book: true },
    });

  try {
    const book = await createBookWithSlug(tx, {
      title: bookData.title,
      author: bookData.author ?? null,
      authorId: bookData.authorId ?? null,
      coverImageUrl: bookData.coverImageUrl,
      description: bookData.description ? sanitize(bookData.description) : null,
      genre: bookData.genre ? sanitize(bookData.genre) : null,
      tags: bookData.tags ?? [],
      externalId: bookData.externalId ?? null,
      source: bookData.source ?? null,
      userId,
      status: "draft",
    });
    return createPlacement(book.id);
  } catch (error) {
    if (!isPrismaP2002(error)) throw error;
    // Гонка: книга создана параллельным запросом → перезапрос → link вместо дубля
    const canon = await findRaceCanon(tx, userId, bookData);
    if (!canon) throw error;
    if (canon.status === "draft" && canon.userId === userId) {
      return createPlacement(canon.id);
    }
    // Канон — каталог (published) или ЧУЖАЯ книга: не линкуемся — создаём
    // свою локальную копию без внешнего ID (чтобы не нарушить unique),
    // личная (userId) — как и положено в модели «каждому своё»
    const local = await createBookWithSlug(tx, {
      title: bookData.title,
      author: bookData.author ?? null,
      authorId: bookData.authorId ?? null,
      coverImageUrl: bookData.coverImageUrl,
      description: bookData.description ? sanitize(bookData.description) : null,
      genre: bookData.genre ? sanitize(bookData.genre) : null,
      tags: bookData.tags ?? [],
      externalId: null,
      source: null,
      userId,
      status: "draft",
    });
    return createPlacement(local.id);
  }
}

/** Перезапрос канона после P2002 (гонка): только для СВОИХ внешних книг
 *  по unique (userId, source, externalId). Чужой канон не линкуется. */
async function findRaceCanon(
  tx: Prisma.TransactionClient,
  userId: number,
  bookData: {
    title: string;
    authorId?: number | null;
    externalId?: string | null;
    source?: string | null;
  },
) {
  if (!bookData.source || !bookData.externalId) return null;
  return tx.book.findFirst({
    where: {
      userId,
      source: bookData.source as never,
      externalId: bookData.externalId,
    },
  });
}

/**
 * Фаза 2.3 (seobook.md): разделение API «каталог vs вхождение».
 *
 * updateBookPlacement — личные данные вхождения (владелец тир-листа):
 * мысли, личная обложка, позиция. Глобальная Book (каталог) НЕ трогается.
 * coverImageUrl = null → сброс на обложку каталога.
 */
export async function updateBookPlacement(
  tierListId: string,
  bookId: number,
  data: {
    thoughts?: string | null;
    coverImageUrl?: string | null;
    tierId?: number | null;
    rank?: number;
  },
) {
  const tierList = await tierListRepository.findById(tierListId, {
    select: { id: true },
  });

  if (!tierList) {
    throw new NotFoundError("Tier list not found");
  }

  const bookPlacement = await prisma.bookPlacement.findUnique({
    where: { tierListId_bookId: { tierListId: tierList.id, bookId } },
  });

  if (!bookPlacement) {
    throw new NotFoundError("Book does not belong to this tier list");
  }

  const updateData: Prisma.BookPlacementUncheckedUpdateInput = {};
  if (data.thoughts !== undefined) {
    updateData.thoughts = data.thoughts ? sanitize(data.thoughts) : null;
  }
  if (data.coverImageUrl !== undefined) {
    // null → сброс на обложку каталога
    updateData.coverImageUrl = data.coverImageUrl || null;
  }
  if (data.tierId !== undefined) updateData.tierId = data.tierId;
  if (data.rank !== undefined) updateData.rank = data.rank;

  return prisma.bookPlacement.update({
    where: { tierListId_bookId: { tierListId: tierList.id, bookId } },
    data: updateData,
    include: { book: true },
  });
}

/**
 * Фаза 2.3: обновление КАТАЛОГА (эталона). Только админка (проверка на роуте).
 * Пользовательский редактор работает с updateBookPlacement и не имеет права
 * менять эталон: обложка/описание/жанр «своей» книги не должны меняться у всех.
 */
export async function updateBookCatalog(
  bookId: number,
  data: {
    title?: string;
    author?: string | null;
    description?: string | null;
    genre?: string | null;
    tags?: string[];
    coverImageUrl?: string;
    publishedYear?: number | null;
  },
) {
  const sanitizedData: Record<string, unknown> = { ...data };
  if (sanitizedData.description !== undefined) {
    sanitizedData.description = sanitizedData.description ? sanitize(sanitizedData.description as string) : null;
  }
  if (sanitizedData.genre !== undefined) {
    sanitizedData.genre = sanitizedData.genre ? sanitize(sanitizedData.genre as string) : null;
  }
  if (sanitizedData.title === undefined) delete sanitizedData.title;
  if (sanitizedData.tags === undefined) delete sanitizedData.tags;
  if (sanitizedData.coverImageUrl === undefined) delete sanitizedData.coverImageUrl;
  if (sanitizedData.publishedYear === undefined) delete sanitizedData.publishedYear;

  // Если автор передан — находим или создаём в реестре
  if (sanitizedData.author !== undefined) {
    if (sanitizedData.author) {
      const author = await authorService.findOrCreate(sanitizedData.author as string);
      sanitizedData.authorId = author.id;
    } else {
      sanitizedData.authorId = null;
    }
  } else {
    delete sanitizedData.author;
    delete sanitizedData.authorId;
  }

  return prisma.book.update({
    where: { id: bookId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: sanitizedData as any,
  });
}

export async function removeBookFromTierList(
  tierListId: string,
  bookId: number,
) {
  const tierList = await tierListRepository.findById(tierListId, {
    select: { id: true },
  });

  if (!tierList) return;

  // ⚠️ Фаза 2.2 (seobook.md): удаляем ТОЛЬКО вхождение. Каскадный book.delete
  // уничтожал книгу из всего каталога (placements/рейтинги/комментарии всех листов).
  // Осиротевшие записи чистит отдельный сборщик мусора (0 placements, 0 связей).
  await prisma.bookPlacement.deleteMany({
    where: { tierListId: tierList.id, bookId },
  });
}
