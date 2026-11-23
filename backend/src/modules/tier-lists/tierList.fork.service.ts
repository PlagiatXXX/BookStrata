import { prisma, tierListRepository } from "./tierList.utils.js";
import type { Prisma, BookSource } from "@prisma/client";
import { AuthorizationError } from "../../lib/errors.js";
import { createLogger } from "../../lib/logger.js";
import { generateUniqueSlug } from "../../utils/slugify.js";
import { findExistingUserBook, normTitleForSql } from "./tierList.books.service.js";
import { matchBook } from "../books/bookMatching.service.js";

const logger = createLogger("TierListsFork", { color: "cyan" });

export async function forkTierList(id: string, userId: number) {
  logger.debug("forkTierList вызван", { id, userId });

  const original = await tierListRepository.getForkSource(id);

  if (!original.isPublic && original.userId !== userId) {
    logger.warn("Security Alert: Attempt to fork private tier list", {
      originalId: id,
      requesterUserId: userId,
      ownerUserId: original.userId,
    });
    throw new AuthorizationError("Forbidden");
  }

  return prisma.$transaction(async (tx) => {
    const newTitle = `${original.title} (копия)`;
    const slug = generateUniqueSlug(newTitle, crypto.randomUUID());
    const newTierList = await tx.tierList.create({
      data: {
        userId,
        title: newTitle,
        slug,
        description: original.description ?? null,
        isPublic: true,
        originalTierListId: original.id,
        tiers: {
          create: original.tiers.map((tier) => ({
            title: tier.title,
            color: tier.color,
            rank: tier.rank,
          })),
        },
      },
      include: {
        tiers: {
          orderBy: { rank: "asc" },
        },
      },
    });

    const tierMap = new Map<number, number>();
    if (newTierList.tiers.length === original.tiers.length) {
      original.tiers.forEach((oldTier, index) => {
        const newTier = newTierList.tiers[index];
        if (!newTier) return;
        tierMap.set(oldTier.id, newTier.id);
      });
    }

    const placementCreates = await Promise.all(
      original.placements.map(async (placement) => {
        const mappedTierId =
          placement.tierId === null ? null : tierMap.get(placement.tierId);

        if (placement.tierId !== null && mappedTierId === undefined) {
          throw new Error(
            `Mapped tier ID not found for source tier ID: ${placement.tierId}`,
          );
        }

        // Объединение с каноном (единый каталог): если книга уже есть в
        // каталоге (published) — линкуемся на неё, placementsCount канона
        // увеличивается на 1, дубль в админке не создаётся. Иначе ищем
        // свою draft-книгу пользователя; только если и её нет — создаём
        // личную копию (draft) для изоляции форка от оригинала.
        const hasAuthor = Boolean(
          placement.book.author?.trim() || placement.book.authorId,
        );
        let catalogId: number | null = null;
        if (hasAuthor) {
          try {
            const match = await matchBook(
              tx,
              {
                title: placement.book.title,
                author: placement.book.author,
                authorId: placement.book.authorId,
                externalId: placement.book.externalId,
                source: placement.book.source,
              },
              { statusFilter: "published", fuzzy: false },
            );
            catalogId = match.book?.id ?? null;
          } catch {
            // Окружение без $queryRaw (например, моки) — деградируем
            // до простого поиска по externalId / authorId
            catalogId = await findPublishedCanonFallback(tx, placement.book);
          }
        }

        const own =
          catalogId != null
            ? { id: catalogId }
            : await findExistingUserBook(tx, userId, {
                title: placement.book.title,
                author: placement.book.author,
                authorId: placement.book.authorId,
                externalId: placement.book.externalId,
                source: placement.book.source,
              });

        return {
          rank: placement.rank,
          ...(mappedTierId !== null && mappedTierId !== undefined
            ? {
                tier: {
                  connect: { id: mappedTierId },
                },
              }
            : {}),
          // Фаза 1.2: мысли — личные данные вхождения (BookPlacement.thoughts),
          // копируем их из оригинального вхождения, а не из каталога
          thoughts: placement.thoughts ?? null,
          book: own
            ? { connect: { id: own.id } }
            : {
                create: {
                  title: placement.book.title,
                  author: placement.book.author,
                  authorId: placement.book.authorId,
                  coverImageUrl: placement.book.coverImageUrl,
                  description: placement.book.description,
                  genre: placement.book.genre,
                  tags: placement.book.tags,
                  publishedYear: placement.book.publishedYear,
                  externalId: placement.book.externalId,
                  source: placement.book.source,
                  userId,
                  status: "draft" as const,
                  // slug не копируем: каталог должен иметь чистый URL, у личной
                  // книги страницы нет — slug ей не нужен
                },
              },
        };
      }),
    );

    await tx.tierList.update({
      where: { id: newTierList.id },
      data: {
        placements: {
          create: placementCreates,
        },
      },
    });

    logger.info("Тир-лист успешно скопирован (forked)", {
      originalId: id,
      newId: newTierList.id,
      userId,
    });

    return newTierList;
  });
}

/** Упрощённый поиск канона (published) без $queryRaw — для окружений,
 *  где полный matchBook недоступен (моки/старые тесты). */
async function findPublishedCanonFallback(
  tx: Prisma.TransactionClient,
  book: {
    title: string;
    author?: string | null;
    authorId?: number | null;
    externalId?: string | null;
    source?: string | null;
  },
): Promise<number | null> {
  if (book.source && book.externalId) {
    const byExt = await tx.book.findFirst({
      where: {
        source: book.source as BookSource,
        externalId: book.externalId,
        status: "published",
      },
      select: { id: true },
    });
    if (byExt) return byExt.id;
  }

  const norm = normTitleForSql(book.title);
  if (book.authorId != null) {
    const rows = await tx.book.findMany({
      where: { authorId: book.authorId, status: "published" },
      select: { id: true, title: true },
    });
    const exact = rows.filter((b: { id: number; title: string }) => normTitleForSql(b.title) === norm);
    if (exact.length === 1 && exact[0]) return exact[0].id;
  }

  if (book.author?.trim()) {
    const normAuthor = normTitleForSql(book.author);
    const rows = await tx.book.findMany({
      where: { status: "published" },
      select: { id: true, title: true, author: true },
    });
    const exact = rows.filter(
      (b: { id: number; title: string; author: string | null }) =>
        normTitleForSql(b.title) === norm &&
        !!b.author &&
        normTitleForSql(b.author) === normAuthor,
    );
    if (exact.length === 1 && exact[0]) return exact[0].id;
  }

  if (!book.author?.trim() && book.authorId == null) {
    const rows = await tx.book.findMany({
      where: { status: "published", authorId: null },
      select: { id: true, title: true },
    });
    const exact = rows.filter((b: { id: number; title: string }) => normTitleForSql(b.title) === norm);
    if (exact.length === 1 && exact[0]) return exact[0].id;
  }

  return null;
}
