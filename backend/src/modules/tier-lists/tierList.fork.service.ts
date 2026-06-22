import { prisma, tierListRepository } from "./tierList.utils.js";
import { createLogger } from "../../lib/logger.js";
import { generateUniqueSlug } from "../../utils/slugify.js";

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
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }

  return prisma.$transaction(async (tx) => {
    const newTitle = `${original.title} (копия)`;
    const slug = generateUniqueSlug(newTitle, crypto.randomUUID());
    const newTierList = await tx.tierList.create({
      data: {
        userId,
        title: newTitle,
        slug,
        isPublic: false,
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

    const placementCreates = original.placements.map((placement) => {
      const mappedTierId =
        placement.tierId === null ? null : tierMap.get(placement.tierId);

      if (placement.tierId !== null && mappedTierId === undefined) {
        throw new Error(
          `Mapped tier ID not found for source tier ID: ${placement.tierId}`,
        );
      }

      return {
        rank: placement.rank,
        ...(mappedTierId !== null && mappedTierId !== undefined
          ? {
              tier: {
                connect: { id: mappedTierId },
              },
            }
          : {}),
        book: {
          create: {
            title: placement.book.title,
            author: placement.book.author,
            coverImageUrl: placement.book.coverImageUrl,
            description: placement.book.description,
            thoughts: placement.book.thoughts,
          },
        },
      };
    });

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
