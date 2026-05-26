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
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
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

  const isDiff = "added" in tiers;

  let added: Array<{ title: string; color: string; rank: number }> = [];
  let updated: Array<{
    id: number;
    title: string;
    color: string;
    rank: number;
  }> = [];
  let deletedIds: number[] = [];

  if (isDiff) {
    const diff = tiers as {
      added?: Array<{ title: string; color: string; rank: number }>;
      updated?: Array<{ id: number; title: string; color: string; rank: number }>;
      deletedIds?: number[];
    };
    added = diff.added || [];
    updated = diff.updated || [];
    deletedIds = diff.deletedIds || [];
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

  const createdTiers: Array<{ id: number; title: string; color: string; rank: number }> = [];
  const updatedTiers: Array<{ id: number; title: string; color: string; rank: number }> = [];

  await prisma.$transaction(async (tx) => {
    if (deletedIds.length > 0) {
      await tx.tier.deleteMany({
        where: { id: { in: deletedIds }, tierListId: realTierListId },
      });
    }

    if (added.length > 0) {
      const created = await Promise.all(
        added.map((tier) =>
          tx.tier.create({
            data: {
              tierListId: realTierListId,
              title: tier.title,
              color: tier.color,
              rank: tier.rank,
            },
          }),
        ),
      );
      createdTiers.push(...created);
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
      updatedTiers.push(...updated);
    }
  });

  const totalTime = Date.now() - startTime;
  logger.debug("saveTiers завершено", {
    added: added.length,
    updated: updated.length,
    deleted: deletedIds.length,
    totalTimeMs: totalTime,
  });

  return [
    ...createdTiers.map((t) => ({ ...t, isNew: true })),
    ...updatedTiers.map((t) => ({ ...t, isNew: false })),
  ];
}
