// backend/src/modules/books/bookCatalogSync.service.ts
// Рантайм-синхронизация редакторских карточек коллекций/знаменитостей → каталог Book
// (Фаза 2.2, seobook.md). JSON-снимки Collections.books / Celebrity.books остаются
// источником отображения и редактирования, а relation-таблицы (CollectionBook /
// CelebrityBook) поддерживаются актуальными при каждом сохранении:
//   • link-or-create книги: матчинг через matchBook (каскад уверенности Фазы 2);
//   • эталонные поля карточки (genre/tags/description) перезаписываются в каталоге
//     (Фаза 0), year карточки → Book.publishedYear; title/author/cover НЕ трогаем;
//   • полная карточка (строгий порог Фазы 0) → авто-публикация через publishBookTx;
//   • rating карточки → CollectionBook.rating + Book.rating (last write wins);
//   • исчезнувшие карточки → удаление связи, осиротевшие книги → GC (Фаза 2.2).
import { prisma } from "../../lib/prisma.js";
import { deleteIfOrphaned } from "../../lib/storage/file-cleanup.js";
import { createAuthorService } from "../authors/authors.service.js";
import { matchBook } from "./bookMatching.service.js";
import { publishBookTx, IncompleteBookError } from "./bookPublish.service.js";
import { createBookWithSlug } from "../../lib/slug.js";
import type { Prisma, PrismaClient } from "@prisma/client";

/** Карточка книги в JSON коллекции/знаменитости (CuratedBook) */
export interface CatalogSyncCard {
  title: string;
  author?: string | null;
  coverImageUrl?: string | null;
  description?: string | null;
  genre?: string | null;
  /** Массив тегов; строка (запятая) допускается — нормализуется */
  tags?: string[] | string | null;
  rating?: number | null;
  year?: number | null;
  tierId?: string | null;
}

export type CatalogSyncOwner = "collection" | "celebrity";

export interface CatalogSyncResult {
  created: number;
  linked: number;
  deleted: number;
  published: number;
}

const authorService = createAuthorService(prisma);

/** Строгий порог публикации (решение 13.08): год обязателен. */
export function isCatalogCardComplete(card: CatalogSyncCard): boolean {
  return Boolean(
    card.title &&
      card.author &&
      card.genre &&
      toTags(card.tags).length > 0 &&
      card.description &&
      card.coverImageUrl &&
      card.year,
  );
}

function toTags(tags: string[] | string | null | undefined): string[] {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string") {
    return tags.split(",").map((t) => t.trim()).filter(Boolean);
  }
  return [];
}

function normalizeCards(
  cards: Record<string, CatalogSyncCard> | CatalogSyncCard[],
): CatalogSyncCard[] {
  const entries = Array.isArray(cards) ? cards : Object.values(cards);
  return entries.filter(
    (c): c is CatalogSyncCard =>
      Boolean(c) && typeof c === "object" && typeof c.title === "string" && c.title.trim().length > 0,
  );
}

/** Перезапуск транзакции при гонке (P2002/aborted): P2002 abort'ит interactive-транзакцию Prisma 4 */
function isRetryableTxError(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  if (e?.code === "P2002" || e?.code === "P2034") return true;
  return typeof e?.message === "string" && e.message.includes("current transaction is aborted");
}

/** Книга больше нигде не используется (Фаза 2.2): 0 placements/связей/комментариев/лайков/статусов */
async function isOrphanBook(
  db: PrismaClient | Prisma.TransactionClient,
  bookId: number,
): Promise<boolean> {
  const [placements, collections, celebrities, comments, likes, statuses] = await Promise.all([
    db.bookPlacement.count({ where: { bookId } }),
    db.collectionBook.count({ where: { bookId } }),
    db.celebrityBook.count({ where: { bookId } }),
    db.bookComment.count({ where: { bookId } }),
    db.bookLike.count({ where: { bookId } }),
    db.bookStatus.count({ where: { bookId } }),
  ]);
  return placements + collections + celebrities + comments + likes + statuses === 0;
}

/**
 * GC осиротевших книг вне транзакции (deleteCollection / deleteCelebrity:
 * каскад удаляет связи, осиротевшие книги чистим здесь).
 */
export async function gcOrphanBooks(bookIds: number[]): Promise<number> {
  let deleted = 0;
  for (const bookId of bookIds) {
    if (await isOrphanBook(prisma, bookId)) {
      const doomed = await prisma.book.findUnique({
        where: { id: bookId },
        select: { coverImageUrl: true },
      });
      await prisma.book.delete({ where: { id: bookId } });
      // Обложка удалённой книги осиротела (если была нашей) — чистим
      await deleteIfOrphaned(doomed?.coverImageUrl);
      deleted++;
    }
  }
  return deleted;
}

/**
 * Синхронизация карточек owner (коллекция/знаменитость) с каталогом.
 * Вызывается после каждого сохранения JSON-снимка books.
 */
export async function syncCatalogCards(
  owner: CatalogSyncOwner,
  ownerId: number,
  cards: Record<string, CatalogSyncCard> | CatalogSyncCard[],
): Promise<CatalogSyncResult> {
  const entries = normalizeCards(cards);

  const result: CatalogSyncResult = { created: 0, linked: 0, deleted: 0, published: 0 };
  let orphanCovers: string[] = [];

  // Retry всей транзакции при гонке: P2002 abort'ит interactive-транзакцию Prisma 4,
  // поэтому link-or-create с retry внутри tx невозможен — повторяем транзакцию целиком.
  // Матчинг канонов выполняется ВНУТРИ цикла попыток: после гонки параллельный запрос
  // мог создать/опубликовать книгу — при перезапуске она должна стать каноном,
  // иначе P2002 будет воспроизводиться вечно (500 вместо сохранения).
  const MAX_TX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_TX_ATTEMPTS; attempt++) {
    try {
      orphanCovers = [];

      // Авторы карточек — в реестр (find-or-create), как при сохранении коллекции
      const authorNames = Array.from(
        new Set(entries.map((c) => c.author).filter((a): a is string => Boolean(a && a.trim()))),
      );
      const authorMap =
        authorNames.length > 0 ? await authorService.findOrCreateMany(authorNames) : new Map();

      // Пре-фаза матчинга ВНЕ транзакции (каскад уверенности, Фаза 2.1).
      // Каталог матчит ТОЛЬКО published-книги: пользовательские draft из тир-листов
      // не участвуют в склейке (решение 17.08) — каталог и тир-листы не пересекаются.
      const matched = await Promise.all(
        entries.map(async (card) => {
          const authorId = card.author ? (authorMap.get(card.author)?.id ?? null) : null;
          const result = await matchBook(
            prisma,
            {
              title: card.title,
              author: card.author ?? null,
              authorId,
            },
            { statusFilter: "published" },
          );
          return {
            card,
            authorId,
            // Страховка: даже если матчинг вернул draft — не линкуемся (см. выше)
            canon: result.book?.status === "published" ? result.book : null,
          };
        }),
      );

      await prisma.$transaction(async (tx) => {
        const newBookIds: number[] = [];

    for (const [index, { card, authorId, canon }] of matched.entries()) {
      let bookId: number;

      if (canon) {
        // Канон найден → link + эталонное обновление (Фаза 0):
        // карточка перезаписывает genre/tags/description, year → publishedYear.
        // title/author/coverImageUrl каталога НЕ трогаем.
        bookId = canon.id;
        const patch: Prisma.BookUpdateInput = {};
        if (card.genre) patch.genre = card.genre;
        const tags = toTags(card.tags);
        if (tags.length > 0) patch.tags = tags;
        if (card.description) patch.description = card.description;
        if (card.year) patch.publishedYear = card.year;
        if (Object.keys(patch).length > 0) {
          await tx.book.update({ where: { id: bookId }, data: patch });
        }
        result.linked++;
      } else {
        // Канона нет → создаём Book (draft + авто-slug); полная карточка → публикация ниже.
        // P2002 (гонка: канон создан параллельным запросом) abort'ит транзакцию —
        // не обрабатываем внутри, вся транзакция перезапускается (retry ниже).
        // Каталог забирает чистый slug: draft-книга с таким slug переименовывается.
        const createdBook = await createBookWithSlug(tx, {
          title: card.title,
          author: card.author ?? null,
          authorId,
          coverImageUrl: card.coverImageUrl ?? "",
          description: card.description ?? null,
          genre: card.genre ?? null,
          tags: toTags(card.tags),
          publishedYear: card.year ?? null,
          status: "draft",
        }, undefined, { reclaimFromDraft: true });
        bookId = createdBook.id;
        result.created++;
      }

      // Связь owner ↔ книга (upsert: rank/tierId/rating синхронизируем с карточкой)
      if (owner === "collection") {
        await tx.collectionBook.upsert({
          where: { collectionId_bookId: { collectionId: ownerId, bookId } },
          create: {
            collectionId: ownerId,
            bookId,
            tierId: card.tierId ?? null,
            rank: index,
            rating: card.rating ?? null,
          },
          update: {
            tierId: card.tierId ?? null,
            rank: index,
            rating: card.rating ?? null,
          },
        });
      } else {
        await tx.celebrityBook.upsert({
          where: { celebrityId_bookId: { celebrityId: ownerId, bookId } },
          create: {
            celebrityId: ownerId,
            bookId,
            tierId: card.tierId ?? null,
            rank: index,
            rating: card.rating ?? null,
          },
          update: {
            tierId: card.tierId ?? null,
            rank: index,
            rating: card.rating ?? null,
          },
        });
      }

      // Book.rating — last write wins: синхронизируем, только если карточка несёт rating
      if (typeof card.rating === "number") {
        await tx.book.update({ where: { id: bookId }, data: { rating: card.rating } });
      }

      // Полная карточка → авто-публикация (инвариант: только через publishBookTx)
      if (isCatalogCardComplete(card) && (!canon || canon.status !== "published")) {
        try {
          await publishBookTx(tx, bookId);
          result.published++;
        } catch (error) {
          // Канон может быть неполон по полям, которые карточка не трогает
          // (например, обложка) — книга остаётся в draft.
          if (!(error instanceof IncompleteBookError)) throw error;
        }
      }

      newBookIds.push(bookId);
    }

    // Исчезнувшие карточки → удаление связи + GC осиротевших книг (Фаза 2.2)
    const existingLinks =
      owner === "collection"
        ? await tx.collectionBook.findMany({
            where: { collectionId: ownerId },
            select: { bookId: true },
          })
        : await tx.celebrityBook.findMany({
            where: { celebrityId: ownerId },
            select: { bookId: true },
          });
    const newBookSet = new Set(newBookIds);
    const removedBookIds = existingLinks
      .filter((l) => !newBookSet.has(l.bookId))
      .map((l) => l.bookId);

    if (removedBookIds.length > 0) {
      if (owner === "collection") {
        await tx.collectionBook.deleteMany({
          where: { collectionId: ownerId, bookId: { in: removedBookIds } },
        });
      } else {
        await tx.celebrityBook.deleteMany({
          where: { celebrityId: ownerId, bookId: { in: removedBookIds } },
        });
      }
      for (const bookId of removedBookIds) {
        if (await isOrphanBook(tx, bookId)) {
          const doomed = await tx.book.findUnique({
            where: { id: bookId },
            select: { coverImageUrl: true },
          });
          await tx.book.delete({ where: { id: bookId } });
          if (doomed?.coverImageUrl) orphanCovers.push(doomed.coverImageUrl);
          result.deleted++;
        }
      }
    }
      });
      break;
    } catch (error) {
      if (attempt === MAX_TX_ATTEMPTS || !isRetryableTxError(error)) throw error;
      // Гонка (P2002/E25P02) — перезапускаем транзакцию целиком
      result.created = 0;
      result.linked = 0;
      result.deleted = 0;
      result.published = 0;
    }
  }

  // Обложки удалённых в транзакции книг осиротели (если были нашими) — чистим
  if (orphanCovers.length > 0) {
    await Promise.all(orphanCovers.map((url) => deleteIfOrphaned(url)));
  }

  return result;
}
