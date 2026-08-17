import { prisma, getTierListWhereClause } from "./tierList.utils.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { sanitize } from "../../lib/sanitizer.js";
import { createAuthorService, type AuthorResult } from "../authors/authors.service.js";
import { findExistingUserBook } from "./tierList.books.service.js";
import { Prisma } from "@prisma/client";

const authorService = createAuthorService(prisma);

// Лимит отключён до введения подписок Pro

export async function saveAll(
  tierListId: string,
  userId: number,
  payload: {
    tiers?: {
      added?: Array<{
        tempId: string;
        title: string;
        color: string;
        rank: number;
        labelSize?: string;
        labelWeight?: string;
        labelStyle?: string;
        labelColor?: string;
      }>;
      updated?: Array<{
        id: number;
        title: string;
        color: string;
        rank: number;
        labelSize?: string;
        labelWeight?: string;
        labelStyle?: string;
        labelColor?: string;
      }>;
      deletedIds?: number[];
    };
    newBooks?: Array<{
      tempId: string;
      title: string;
      author?: string | null;
      coverImageUrl: string;
      description?: string | null;
      thoughts?: string | null;
      genre?: string | null;
      tags?: string[];
    }>;
    placements?: Array<{
      bookId: string | number;
      tierId: string | number | null;
      rank: number;
    }>;
    deletedBookIds?: number[];
  },
) {
  return await prisma.$transaction(async (tx) => {
    const tierList = await tx.tierList.findUnique({
      where: getTierListWhereClause(tierListId),
      select: { id: true },
    });

    if (!tierList) {
      throw new NotFoundError("Tier list not found");
    }

    const realTierListId = tierList.id;

    const tierReplacements: { tempId: string; realId: string }[] = [];
    const bookReplacements: { tempId: string; realId: string }[] = [];

    // --- 1. ОБРАБОТКА ТИРОВ ---
    if (payload.tiers) {
      if (payload.tiers.deletedIds?.length) {
        await tx.tier.deleteMany({
          where: { id: { in: payload.tiers.deletedIds }, tierListId: realTierListId },
        });
      }

      // Оптимизация: Параллельное обновление тиров
      if (payload.tiers.updated?.length) {
        await Promise.all(
          payload.tiers.updated.map((tier) =>
            tx.tier.updateMany({
              where: { id: tier.id, tierListId: realTierListId },
              data: {
                title: tier.title,
                color: tier.color,
                rank: tier.rank,
                ...(tier.labelSize != null && { labelSize: tier.labelSize }),
                ...(tier.labelWeight != null && { labelWeight: tier.labelWeight }),
                ...(tier.labelStyle != null && { labelStyle: tier.labelStyle }),
                ...(tier.labelColor != null && { labelColor: tier.labelColor }),
              },
            })
          )
        );
      }

      // Оптимизация: Параллельное создание тиров
      if (payload.tiers.added?.length) {
        const addedResults = await Promise.all(
          payload.tiers.added.map(async (tier) => {
            const created = await tx.tier.create({
              data: {
                tierListId: realTierListId,
                title: tier.title,
                color: tier.color,
                rank: tier.rank,
                labelSize: tier.labelSize ?? "sm",
                labelWeight: tier.labelWeight ?? "black",
                labelStyle: tier.labelStyle ?? "normal",
                labelColor: tier.labelColor,
              },
            });
            return { tempId: tier.tempId, realId: String(created.id) };
          })
        );
        tierReplacements.push(...addedResults);
      }
    }

    // --- 2. ОБРАБОТКА НОВЫХ КНИГ ---
    if (payload.newBooks?.length) {
      const newBooksData = payload.newBooks;
      const authorNames = newBooksData.map((b) => b.author).filter(Boolean) as string[];
      const authorMap = authorNames.length > 0
        ? await authorService.findOrCreateMany(authorNames)
        : new Map<string, AuthorResult>();

      const booksWithAuthors = newBooksData.map((bookData) => ({
        ...bookData,
        authorId: bookData.author ? (authorMap.get(bookData.author)?.id ?? null) : null,
      }));

      // Оптимизация: Параллельный поиск/создание книг.
      // Модель «личные книги» (18.08): ищем ТОЛЬКО свои (userId), каталог
      // и чужие книги не трогаем — при отсутствии своей всегда создаём draft.
      const bookResults = await Promise.all(
        booksWithAuthors.map(async (bookData) => {
          const existing = await findExistingUserBook(tx, userId, bookData);

          if (existing) {
            return { tempId: bookData.tempId, realId: String(existing.id) };
          }

          const created = await tx.book.create({
            data: {
              title: bookData.title,
              author: bookData.author ?? null,
              authorId: bookData.authorId,
              coverImageUrl: bookData.coverImageUrl,
              description: bookData.description ? sanitize(bookData.description) : null,
              genre: bookData.genre ? sanitize(bookData.genre) : null,
              tags: bookData.tags ?? [],
              userId,
            },
          });
          return { tempId: bookData.tempId, realId: String(created.id) };
        })
      );
      bookReplacements.push(...bookResults);
    }

    // --- 3. ОБРАБОТКА РАЗМЕЩЕНИЙ (PLACEMENTS) ---
    if (payload.placements?.length) {
      const bookReplacementMap = new Map(
        bookReplacements.map((r) => [r.tempId, r.realId]),
      );
      const tierReplacementMap = new Map(
        tierReplacements.map((r) => [r.tempId, r.realId]),
      );

      const existingBookIds = Array.from(
        new Set(
          payload.placements
            .filter((p) => typeof p.bookId !== "string" || !p.bookId.includes("-"))
            .map((p) => (typeof p.bookId === "string" ? parseInt(p.bookId, 10) : p.bookId)),
        ),
      );

      // Исправление: Проверяем физическое существование книг в глобальной базе
      if (existingBookIds.length > 0) {
        const existingBooksCount = await tx.book.count({
          where: { id: { in: existingBookIds } },
        });

        if (existingBooksCount !== existingBookIds.length) {
          throw new ValidationError("One or more books do not exist in the database");
        }
      }

      const existingTierIds = Array.from(
        new Set(
          payload.placements
            .filter((p) => p.tierId !== null && (typeof p.tierId !== "string" || !p.tierId.includes("-")))
            .map((p) => (typeof p.tierId === "string" ? parseInt(p.tierId, 10) : p.tierId!)),
        ),
      );

      if (existingTierIds.length > 0) {
        const tierCount = await tx.tier.count({
          where: { id: { in: existingTierIds }, tierListId: realTierListId },
        });

        if (tierCount !== existingTierIds.length) {
          throw new ValidationError("One or more tiers do not belong to this tier list");
        }
      }

      // Фаза 2.4: update/upsert вместо delete/recreate — reorder не должен
      // уничтожать личные данные вхождений (thoughts, coverImageUrl)
      const existingPlacements = await tx.bookPlacement.findMany({
        where: { tierListId: realTierListId },
        select: { bookId: true, thoughts: true, coverImageUrl: true },
      });
      const existingPlacementMap = new Map(
        existingPlacements.map((p) => [p.bookId, p]),
      );

      // Thoughts новых книг (из newBooks) — личные данные вхождения
      const thoughtsByTempId = new Map(
        (payload.newBooks ?? [])
          .filter((b) => b.thoughts)
          .map((b) => [b.tempId, sanitize(b.thoughts as string)]),
      );

      const finalPlacements: Array<{
        tierListId: string;
        bookId: number;
        tierId: number | null;
        rank: number;
        thoughts?: string | null;
        coverImageUrl?: string | null;
      }> = payload.placements.map((p) => {
        let finalBookId: number;
        let isTempBook = false;
        if (typeof p.bookId === "string" && p.bookId.includes("-")) {
          const realId = bookReplacementMap.get(p.bookId);
          if (!realId) throw new Error(`Real ID not found for temp book ID: ${p.bookId}`);
          finalBookId = parseInt(realId, 10);
          isTempBook = true;
        } else {
          finalBookId = typeof p.bookId === "string" ? parseInt(p.bookId, 10) : p.bookId;
        }

        let finalTierId: number | null = null;
        if (p.tierId !== null) {
          if (typeof p.tierId === "string" && p.tierId.includes("-")) {
            const realId = tierReplacementMap.get(p.tierId);
            if (!realId) throw new Error(`Real ID not found for temp tier ID: ${p.tierId}`);
            finalTierId = parseInt(realId, 10);
          } else {
            finalTierId = typeof p.tierId === "string" ? parseInt(p.tierId, 10) : p.tierId;
          }
        }

        return {
          tierListId: realTierListId,
          bookId: finalBookId,
          tierId: finalTierId,
          rank: p.rank,
          ...(isTempBook && thoughtsByTempId.has(p.bookId as string)
            ? { thoughts: thoughtsByTempId.get(p.bookId as string) }
            : {}),
        };
      });

      // Модель «личные книги» (18.08): все книги листа должны быть СВОИМИ.
      // Легаси-книги (ничьи userId = null или чужие — форки старой модели)
      // детачим: создаём личную копию и перепривязываем вхождение.
      const detachBookIds = Array.from(
        new Set(finalPlacements.map((p) => p.bookId)),
      );
      if (detachBookIds.length > 0) {
        const placementsBooks = await tx.book.findMany({
          where: { id: { in: detachBookIds } },
          select: { id: true, userId: true },
        });
        const foreignIds = placementsBooks
          .filter((b) => b.userId !== userId)
          .map((b) => b.id);
        if (foreignIds.length > 0) {
          const foreignBooks = await tx.book.findMany({
            where: { id: { in: foreignIds } },
          });
          const copyByBookId = new Map<number, number>();
          for (const fb of foreignBooks) {
            const copy = await tx.book.create({
              data: {
                title: fb.title,
                author: fb.author,
                authorId: fb.authorId,
                coverImageUrl: fb.coverImageUrl,
                description: fb.description,
                genre: fb.genre,
                tags: fb.tags,
                publishedYear: fb.publishedYear,
                externalId: fb.externalId,
                source: fb.source,
                mergedIntoId: fb.mergedIntoId,
                rating: fb.rating,
                likesCount: fb.likesCount,
                // Копия — личная: владелец, без slug и контекста (своя история).
                // Статус ВСЕГДА draft: каталоговая (published) книга в тир-листе —
                // легаси, её копия не может быть опубликованной (инвариант:
                // published = каталог, userId = null)
                userId,
                slug: null,
                status: "draft" as const,
                contextChain: (fb.contextChain ?? Prisma.DbNull) as Prisma.InputJsonValue,
              },
            });
            copyByBookId.set(fb.id, copy.id);
          }
          for (const p of finalPlacements) {
            const copyId = copyByBookId.get(p.bookId);
            if (copyId) {
              // Личные данные вхождения (мысли/обложка) переносим с исходного
              // placement'а на новый, иначе они потеряются при детаче
              const old = existingPlacementMap.get(p.bookId);
              p.bookId = copyId;
              if (old) {
                if (old.thoughts != null) p.thoughts = old.thoughts;
                if (old.coverImageUrl != null) p.coverImageUrl = old.coverImageUrl;
              }
            }
          }
        }
      }

      // Существующие — UPDATE (thoughts/coverImageUrl не перезаписываются —
      // личные данные вхождения, в finalPlacements их нет для существующих книг)
      for (const p of finalPlacements) {
        const existing = existingPlacementMap.get(p.bookId);
        if (!existing) continue;
        await tx.bookPlacement.update({
          where: {
            tierListId_bookId: { tierListId: realTierListId, bookId: p.bookId },
          },
          data: { tierId: p.tierId, rank: p.rank },
        });
      }

      // Новые — CREATE
      const newPlacements = finalPlacements.filter(
        (p) => !existingPlacementMap.has(p.bookId),
      );
      if (newPlacements.length > 0) {
        await tx.bookPlacement.createMany({ data: newPlacements });
      }

      // Исчезнувшие из итогового состояния — DELETE
      const finalBookIds = new Set(finalPlacements.map((p) => p.bookId));
      const deletedIds = existingPlacements
        .filter((p) => !finalBookIds.has(p.bookId))
        .map((p) => p.bookId);
      if (deletedIds.length > 0) {
        await tx.bookPlacement.deleteMany({
          where: { tierListId: realTierListId, bookId: { in: deletedIds } },
        });
      }
    }

    // --- 4. УДАЛЕНИЕ КНИГ И СБОРКА МУСОРА ---
    if (payload.deletedBookIds?.length) {
      // Удаляем связи из текущего тир-листа
      await tx.bookPlacement.deleteMany({
        where: { bookId: { in: payload.deletedBookIds }, tierListId: realTierListId },
      });

      // Исправление: Точечно вычисляем книги, у которых глобально осталось 0 размещений
      const remainingPlacements = await tx.bookPlacement.groupBy({
        by: ['bookId'],
        where: { bookId: { in: payload.deletedBookIds } },
        _count: true,
      });

      const booksStillInUse = remainingPlacements.map(p => p.bookId);
      const orphanedBookIds = payload.deletedBookIds.filter(id => !booksStillInUse.includes(id));

      // Удаляем только те книги, которые нигде больше не используются.
      // ВАЖНО (решение 18.08): удаляем ТОЛЬКО свои (userId) — каталоговые
      // (published) и чужие книги никогда не удаляются из тир-листов.
      if (orphanedBookIds.length > 0) {
        await tx.book.deleteMany({
          where: { id: { in: orphanedBookIds }, status: "draft", userId },
        });
      }
    }

    await tx.tierList.update({
      where: getTierListWhereClause(tierListId),
      data: { updatedAt: new Date() },
    });

    return { bookReplacements, tierReplacements };
  });
}
