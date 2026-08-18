/**
 * Дедупликация каталога книг (Фаза 1.3, seobook.md).
 *
 * Правило: Book = Издание → склеиваются ТОЛЬКО полные дубли:
 *   - совпадение (source, externalId), либо
 *   - точное (lower(trim(title)), authorId) при отсутствии externalId (нормализация ё→е).
 * Разные вариации названий, обложки, переводы НЕ склеиваются.
 *
 * Выбор канона — детерминированный (воспроизводимый на тех же данных):
 *   score = placements * 3 + (cover ? 2 : 0) + (description ? 1 : 0) + (publishedAt ? 2 : 0) + updatedAtMs * 0.01
 *   при равенстве: published > draft, затем самый старый createdAt.
 *
 * Перенос: BookPlacement (P2002-конфликты пропускаются), BookRating (остаётся новейший),
 * BookStatus (конфликты пропускаются), CollectionBook/CelebrityBook (конфликты пропускаются).
 * Неканон удаляется, если после переноса не имеет ни одной привязки
 * (placements/ratings/statuses/связи коллекций/комментарии/лайки).
 *
 * Чистые функции (normalizeTitle, pickCanon) покрыты unit-тестами (bookDedupe.service.spec.ts);
 * скрипт scripts/dedupe-books.ts — тонкий раннер поверх сервиса.
 */
import { prisma } from "../../lib/prisma.js";
import { deleteIfOrphaned } from "../../lib/storage/file-cleanup.js";

export function normalizeTitle(title: string): string {
  return title.toLowerCase().trim().replace(/ё/g, "е").replace(/\s+/g, " ");
}

export interface DedupeBook {
  id: number;
  title: string;
  authorId: number | null;
  slug: string | null;
  coverImageUrl: string;
  description: string | null;
  publishedAt: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  placementsCount: number;
  ratingsCount: number;
  statusesCount: number;
  collectionBooksCount: number;
  celebrityBooksCount: number;
  commentsCount: number;
  likesCount: number;
}

export interface DuplicateGroup {
  key: string;
  books: DedupeBook[];
}

/** Ошибка склейки (например, поглощение published-книги черновиком). */
export class MergeError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "MergeError";
  }
}

export async function collectDuplicateGroups(): Promise<DuplicateGroup[]> {
  const books = await prisma.book.findMany({
    select: {
      id: true,
      title: true,
      authorId: true,
      slug: true,
      coverImageUrl: true,
      description: true,
      publishedAt: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      source: true,
      externalId: true,
      _count: {
        select: {
          placements: true,
          ratings: true,
          statuses: true,
          collectionBooks: true,
          celebrityBooks: true,
          comments: true,
          likes: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  const groups = new Map<string, DuplicateGroup>();

  for (const b of books) {
    // Группировка по (source, externalId) для внешних книг
    let key: string;
    if (b.externalId && b.source) {
      key = `ext:${b.source}:${b.externalId}`;
    } else {
      key = `local:${normalizeTitle(b.title)}:${b.authorId ?? 0}`;
    }

    const group = groups.get(key) ?? {
      key,
      books: [],
    };
    group.books.push({
      id: b.id,
      title: b.title,
      authorId: b.authorId,
      slug: b.slug,
      coverImageUrl: b.coverImageUrl,
      description: b.description,
      publishedAt: b.publishedAt,
      status: b.status,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      placementsCount: b._count.placements,
      ratingsCount: b._count.ratings,
      statusesCount: b._count.statuses,
      collectionBooksCount: b._count.collectionBooks,
      celebrityBooksCount: b._count.celebrityBooks,
      commentsCount: b._count.comments,
      likesCount: b._count.likes,
    });
    groups.set(key, group);
  }

  return Array.from(groups.values()).filter((g) => g.books.length > 1);
}

/** Детерминированный выбор канона (весовая система из плана Фазы 1.3). */
export function pickCanon(books: DedupeBook[]) {
  const scored = books.map((b) => {
    const score =
      b.placementsCount * 3 +
      (b.coverImageUrl ? 2 : 0) +
      (b.description ? 1 : 0) +
      (b.publishedAt ? 2 : 0) +
      b.updatedAt.getTime() * 0.01;
    return { book: b, score };
  });

  // Сортировка: score desc → published первее draft → самый старый createdAt.
  // Порядок сравнений фиксирован — результат воспроизводим.
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const statusRank = (s: string) => (s === "published" ? 1 : 0);
    if (statusRank(b.book.status) !== statusRank(a.book.status)) {
      return statusRank(b.book.status) - statusRank(a.book.status);
    }
    return a.book.createdAt.getTime() - b.book.createdAt.getTime();
  });

  const top = scored[0];
  if (!top) throw new Error("pickCanon: пустая группа книг");
  return top.book;
}

export interface MergeGroupOptions {
  /** Явный канон (ручной merge из админки). Если задан — pickCanon не вызывается,
   *  каноном становится книга с этим id (выбор администратора имеет приоритет). */
  forceCanonId?: number;
  /** Разрешить поглощение published-книги черновиком (по умолчанию запрещено:
   *  такой дубль пропускается, чтобы не терять опубликованные страницы). */
  allowPublishedIntoDraft?: boolean;
}

export async function mergeGroup(
  group: DuplicateGroup,
  options: MergeGroupOptions = {},
): Promise<void> {
  const canon = options.forceCanonId
    ? (group.books.find((b) => b.id === options.forceCanonId) ??
      (() => {
        throw new MergeError(
          "canon_not_in_group",
          `Канон #${options.forceCanonId} не найден в группе склейки`,
        );
      })())
    : pickCanon(group.books);
  const duplicates = group.books.filter((b) => b.id !== canon.id);

  for (const dup of duplicates) {
    // Защита от потери published-книг: черновик не может поглотить опубликованную
    // страницу (иначе URL книги умирает). При авто-дедупе такой дубль пропускаем,
    // ручной merge проверяет это раньше (mergeBooksByIds) и возвращает ошибку.
    if (!options.allowPublishedIntoDraft && dup.status === "published" && canon.status !== "published") {
      continue;
    }

    // 0. Slug: сохраняем URL поглощаемой книги (301-перенос).
    //    У канона нет slug → забираем slug дубля (старый URL продолжает работать);
    //    у канона slug есть → пишем историю oldSlug → 301 на актуальный URL.
    if (dup.slug && dup.slug !== canon.slug) {
      if (canon.slug) {
        try {
          await prisma.bookSlugHistory.create({
            data: { oldSlug: dup.slug, bookId: canon.id },
          });
        } catch (error) {
          // oldSlug уже в истории (повторная склейка/гонка) — не критично
          const e = error as { code?: string };
          if (e?.code !== "P2002") throw error;
        }
      } else {
        await prisma.book.update({
          where: { id: canon.id },
          data: { slug: dup.slug },
        });
      }
    }

    // 1. BookPlacement: переносим, конфликты (P2002) пропускаем
    const dupPlacements = await prisma.bookPlacement.findMany({
      where: { bookId: dup.id },
    });
    for (const p of dupPlacements) {
      const exists = await prisma.bookPlacement.findUnique({
        where: {
          tierListId_bookId: { tierListId: p.tierListId, bookId: canon.id },
        },
        select: { tierListId: true, bookId: true },
      });
      if (exists) continue; // канон уже в листе — не дублируем
      await prisma.bookPlacement.update({
        where: { tierListId_bookId: { tierListId: p.tierListId, bookId: dup.id } },
        data: { bookId: canon.id },
      });
    }

    // 2. BookRating: переносим; если пользователь оценил и канон, и дубль — оставляем новейший
    const dupRatings = await prisma.bookRating.findMany({
      where: { bookId: dup.id },
    });
    for (const r of dupRatings) {
      const existing = await prisma.bookRating.findUnique({
        where: { bookId_userId: { bookId: canon.id, userId: r.userId } },
      });
      if (existing) {
        if (existing.createdAt < r.createdAt) {
          await prisma.bookRating.delete({ where: { id: existing.id } });
          await prisma.bookRating.update({
            where: { id: r.id },
            data: { bookId: canon.id },
          });
        } else {
          await prisma.bookRating.delete({ where: { id: r.id } });
        }
        continue;
      }
      await prisma.bookRating.update({
        where: { id: r.id },
        data: { bookId: canon.id },
      });
    }

    // 3. BookStatus: переносим, конфликты пропускаем
    const dupStatuses = await prisma.bookStatus.findMany({
      where: { bookId: dup.id },
    });
    for (const s of dupStatuses) {
      const exists = await prisma.bookStatus.findUnique({
        where: { bookId_userId: { bookId: canon.id, userId: s.userId } },
      });
      if (exists) continue;
      await prisma.bookStatus.update({
        where: { id: s.id },
        data: { bookId: canon.id },
      });
    }

    // 4. CollectionBook / CelebrityBook: переносим связи коллекций/знаменитостей
    //    (решение 12.08: реляционные таблицы; конфликты @@unique([collectionId, bookId]) пропускаем)
    const dupCollectionBooks = await prisma.collectionBook.findMany({
      where: { bookId: dup.id },
    });
    for (const cb of dupCollectionBooks) {
      const exists = await prisma.collectionBook.findUnique({
        where: {
          collectionId_bookId: { collectionId: cb.collectionId, bookId: canon.id },
        },
        select: { id: true },
      });
      if (exists) continue;
      await prisma.collectionBook.update({
        where: { id: cb.id },
        data: { bookId: canon.id },
      });
    }

    const dupCelebrityBooks = await prisma.celebrityBook.findMany({
      where: { bookId: dup.id },
    });
    for (const cb of dupCelebrityBooks) {
      const exists = await prisma.celebrityBook.findUnique({
        where: {
          celebrityId_bookId: { celebrityId: cb.celebrityId, bookId: canon.id },
        },
        select: { id: true },
      });
      if (exists) continue;
      await prisma.celebrityBook.update({
        where: { id: cb.id },
        data: { bookId: canon.id },
      });
    }

    // 5. Помечаем неканон (аудит) и удаляем, если больше нигде не встречается
    await prisma.book.update({
      where: { id: dup.id },
      data: { mergedIntoId: canon.id },
    });

    const remaining = await prisma.book.findUnique({
      where: { id: dup.id },
      include: {
        _count: {
          select: {
            placements: true,
            ratings: true,
            statuses: true,
            collectionBooks: true,
            celebrityBooks: true,
            comments: true,
            likes: true,
          },
        },
      },
    });
    if (
      remaining &&
      remaining._count.placements === 0 &&
      remaining._count.ratings === 0 &&
      remaining._count.statuses === 0 &&
      remaining._count.collectionBooks === 0 &&
      remaining._count.celebrityBooks === 0 &&
      remaining._count.comments === 0 &&
      remaining._count.likes === 0
    ) {
      await prisma.book.delete({ where: { id: dup.id } });
      // Обложка удалённого дубля осиротела (если была нашей) — чистим
      await deleteIfOrphaned(dup.coverImageUrl);
    }
  }
}