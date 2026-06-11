import { prisma, getTierListWhereClause } from "./tierList.utils.js";

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
      throw new Error("Tier list not found");
    }

    const realTierListId = tierList.id;

    const tierReplacements: { tempId: string; realId: string }[] = [];
    const bookReplacements: { tempId: string; realId: string }[] = [];

    if (payload.tiers) {
      if (payload.tiers.deletedIds?.length) {
        await tx.tier.deleteMany({
          where: { id: { in: payload.tiers.deletedIds }, tierListId: realTierListId },
        });
      }
      if (payload.tiers.updated?.length) {
        for (const tier of payload.tiers.updated) {
          await tx.tier.updateMany({
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
          });
        }
      }
      if (payload.tiers.added?.length) {
        const addedTiers = payload.tiers.added;
        for (const tier of addedTiers) {
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
          if (created) {
            tierReplacements.push({
              tempId: tier.tempId,
              realId: String(created.id),
            });
          }
        }
      }
    }

    if (payload.newBooks?.length) {
      const newBooksData = payload.newBooks;
      for (const bookData of newBooksData) {
        const created = await tx.book.create({
          data: {
            title: bookData.title,
            author: bookData.author ?? null,
            coverImageUrl: bookData.coverImageUrl,
            description: bookData.description ?? null,
            thoughts: bookData.thoughts ?? null,
          },
        });
        bookReplacements.push({
          tempId: bookData.tempId,
          realId: String(created.id),
        });
      }
    }

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
            .filter(
              (p) => typeof p.bookId !== "string" || !p.bookId.includes("-"),
            )
            .map((p) =>
              typeof p.bookId === "string" ? parseInt(p.bookId, 10) : p.bookId,
            ),
        ),
      );

      if (existingBookIds.length > 0) {
        const userTierLists = await tx.tierList.findMany({
          where: { userId },
          select: { id: true },
        });
        const userTierListIds = userTierLists.map((tl) => tl.id);

        const count = await tx.bookPlacement.count({
          where: {
            bookId: { in: existingBookIds },
            tierListId: { in: userTierListIds },
          },
        });

        if (count !== existingBookIds.length) {
          throw new Error("One or more books do not belong to this user");
        }
      }

      const existingTierIds = Array.from(
        new Set(
          payload.placements
            .filter(
              (p) =>
                p.tierId !== null &&
                (typeof p.tierId !== "string" || !p.tierId.includes("-")),
            )
            .map((p) =>
              typeof p.tierId === "string" ? parseInt(p.tierId, 10) : p.tierId!,
            ),
        ),
      );

      if (existingTierIds.length > 0) {
        const tierCount = await tx.tier.count({
          where: {
            id: { in: existingTierIds },
            tierListId: realTierListId,
          },
        });

        if (tierCount !== existingTierIds.length) {
          throw new Error("One or more tiers do not belong to this tier list");
        }
      }

      await tx.bookPlacement.deleteMany({
        where: { tierListId: realTierListId },
      });

      const placementData = payload.placements.map((p) => {
        let finalBookId: number;
        if (typeof p.bookId === "string" && p.bookId.includes("-")) {
          const realId = bookReplacementMap.get(p.bookId);
          if (!realId)
            throw new Error(`Real ID not found for temp book ID: ${p.bookId}`);
          finalBookId = parseInt(realId, 10);
        } else {
          finalBookId =
            typeof p.bookId === "string" ? parseInt(p.bookId, 10) : p.bookId;
        }

        let finalTierId: number | null = null;
        if (p.tierId !== null) {
          if (typeof p.tierId === "string" && p.tierId.includes("-")) {
            const realId = tierReplacementMap.get(p.tierId);
            if (!realId)
              throw new Error(
                `Real ID not found for temp tier ID: ${p.tierId}`,
              );
            finalTierId = parseInt(realId, 10);
          } else {
            finalTierId =
              typeof p.tierId === "string" ? parseInt(p.tierId, 10) : p.tierId;
          }
        }

        return {
          tierListId: realTierListId,
          bookId: finalBookId,
          tierId: finalTierId,
          rank: p.rank,
        };
      });

      await tx.bookPlacement.createMany({
        data: placementData,
      });
    }

    if (payload.deletedBookIds?.length) {
      await tx.bookPlacement.deleteMany({
        where: { bookId: { in: payload.deletedBookIds }, tierListId: realTierListId },
      });

      const remainingPlacements = await tx.bookPlacement.count({
        where: { bookId: { in: payload.deletedBookIds } },
      });

      if (remainingPlacements === 0) {
        await tx.book.deleteMany({
          where: { id: { in: payload.deletedBookIds } },
        });
      }
    }

    await tx.tierList.update({
      where: getTierListWhereClause(tierListId),
      data: { updatedAt: new Date() },
    });

    return {
      bookReplacements,
      tierReplacements,
    };
  });
}
