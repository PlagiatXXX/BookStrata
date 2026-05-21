import { prisma } from "../../lib/prisma.js";
import { tierListRepository } from "../../repositories/index.js";

export { prisma, tierListRepository };

export const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value,
  );

export const getTierListWhereClause = (tierListId: string) => {
  if (isUuid(tierListId)) return { id: tierListId };
  if (/^\d+$/.test(tierListId)) return { id: tierListId };
  return { slug: tierListId };
};

export async function resolveTierListId(tierListId: string): Promise<string> {
  return tierListRepository.resolveId(tierListId);
}

export async function assertOwner(tierListId: string, userId: number) {
  return tierListRepository.assertOwner(tierListId, userId);
}
