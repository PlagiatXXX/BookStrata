import { prisma, tierListRepository } from "./tierList.utils.js";
import { AuthorizationError } from "../../lib/errors.js";
import { createLogger } from "../../lib/logger.js";
import { generateUniqueSlug } from "../../utils/slugify.js";
import { findExistingUserBook } from "./tierList.books.service.js";

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

        // Модель «личные книги» (18.08): форк = отдельное имущество —
        // копия книги принадлежит новому владельцу, удаление/правка
        // оригинала не влияет на форк (и наоборот).
        // Но если у пользователя УЖЕ есть своя книга (тот же внешний ID или
        // то же название) — линкуемся на неё: прямой create упал бы с P2002
        // (unique userId+source+externalId) при повторном форке / форке своего листа.
        const own = await findExistingUserBook(tx, userId, {
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
