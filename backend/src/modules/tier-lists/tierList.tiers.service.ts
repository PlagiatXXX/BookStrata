import { prisma, resolveTierListId } from "./tierList.utils.js";
import { createLogger } from "../../lib/logger.js";

const logger = createLogger("TierListsTiers", { color: "cyan" });

export async function addTier(tierListId: string, title: string, rank: number) {
  return prisma.tier.create({
    data: {
      tierListId,
      title,
      rank,
      color: "#808080",
    },
  });
}

export async function removeTier(tierListId: string, tierId: number) {
  const realTierListId = await resolveTierListId(tierListId);

  await prisma.bookPlacement.updateMany({
    where: { tierListId: realTierListId, tierId },
    data: { tierId: null },
  });

  return prisma.tier.delete({
    where: { id: tierId },
  });
}

export async function updateTier(
  tierListId: string,
  tierId: number,
  data: { title?: string; color?: string; rank?: number },
) {
  const realTierListId = await resolveTierListId(tierListId);

  const tier = await prisma.tier.findUnique({
    where: { id: tierId },
    select: { tierListId: true },
  });

  if (!tier || tier.tierListId !== realTierListId) {
    const error = new Error("Forbidden");
    (error as any).statusCode = 403;
    throw error;
  }

  return prisma.tier.update({
    where: { id: tierId },
    data,
  });
}

export async function updateTiers(
  tierListId: string,
  tiers: { id: number; title?: string; color?: string; rank?: number }[],
) {
  const realTierListId = await resolveTierListId(tierListId);

  const transactions = tiers.map((t) =>
    prisma.tier.updateMany({
      where: { id: t.id, tierListId: realTierListId },
      data: {
        ...(t.title !== undefined ? { title: t.title } : {}),
        ...(t.color !== undefined ? { color: t.color } : {}),
        ...(t.rank !== undefined ? { rank: t.rank } : {}),
      },
    }),
  );

  return prisma.$transaction(transactions);
}

export async function saveTiers(
  tierListId: string,
  tiers:
    | {
        added?: Array<{ title: string; color: string; rank: number }>;
        updated?: Array<{
          id: number;
          title: string;
          color: string;
          rank: number;
        }>;
        deletedIds?: number[];
      }
    | Array<{ id?: number; title: string; color: string; rank: number }>,
) {
  const startTime = Date.now();
  const realTierListId = await resolveTierListId(tierListId);

  const isDiff = "added" in (tiers as any);

  let added: Array<{ title: string; color: string; rank: number }> = [];
  let updated: Array<{
    id: number;
    title: string;
    color: string;
    rank: number;
  }> = [];
  let deletedIds: number[] = [];

  if (isDiff) {
    added = (tiers as any).added || [];
    updated = (tiers as any).updated || [];
    deletedIds = (tiers as any).deletedIds || [];
  } else {
    const tiersArray = tiers as Array<{
      id?: number;
      title: string;
      color: string;
      rank: number;
    }>;
    added = tiersArray
      .filter((t) => !t.id)
      .map((t) => ({ title: t.title, color: t.color, rank: t.rank }));
    updated = tiersArray
      .filter((t) => t.id)
      .map((t) => ({
        id: t.id!,
        title: t.title,
        color: t.color,
        rank: t.rank,
      }));
  }

  const results = await prisma.$transaction(async (tx) => {
    if (deletedIds.length > 0) {
      await tx.tier.deleteMany({
        where: { id: { in: deletedIds }, tierListId: realTierListId },
      });
    }

    if (added.length > 0) {
      await tx.tier.createMany({
        data: added.map((tier) => ({
          tierListId: realTierListId,
          title: tier.title,
          color: tier.color,
          rank: tier.rank,
        })),
      });
    }

    if (updated.length > 0) {
      await Promise.all(
        updated.map((tier) =>
          tx.tier.updateMany({
            where: { id: tier.id, tierListId: realTierListId },
            data: { title: tier.title, color: tier.color, rank: tier.rank },
          }),
        ),
      );
    }

    const allTiers = await tx.tier.findMany({
      where: { tierListId: realTierListId },
      orderBy: { rank: "asc" },
    });

    return allTiers;
  });

  const totalTime = Date.now() - startTime;
  logger.debug("saveTiers завершено", {
    added: added.length,
    updated: updated.length,
    deleted: deletedIds.length,
    totalTimeMs: totalTime,
  });

  if (!results || results.length === 0) {
    return [];
  }

  const createdTiers = results.filter(
    (t: any) => !updated.some((u: any) => u.id === t.id),
  );
  const updatedTierList = results.filter((t: any) =>
    updated.some((u: any) => u.id === t.id),
  );

  return [
    ...createdTiers.map((t: any) => ({ ...t, isNew: true })),
    ...updatedTierList.map((t: any) => ({ ...t, isNew: false })),
  ];
}
