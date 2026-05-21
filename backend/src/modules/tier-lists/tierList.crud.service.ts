import {
  tierListRepository,
  resolveTierListId,
} from "./tierList.utils.js";
import { prisma } from "./tierList.utils.js";
import { generateUniqueSlug } from "../../utils/slugify.js";
import type { GetTierListsQuery } from "./tierList.schema.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface TierListWithCount { _count?: any; [key: string]: unknown }

export async function getUserTierLists(
  userId: number,
  query: GetTierListsQuery,
) {
  const page = parseInt(query.page, 10);
  const pageSize = parseInt(query.pageSize, 10);

  const [tierLists, totalItems] = await tierListRepository.findByUser(userId, {
    page,
    pageSize,
  });
  const totalPages = Math.ceil(totalItems / pageSize);

  const data = tierLists.map((tl: TierListWithCount) => ({
    ...tl,
    booksCount: tl._count?.placements ?? 0,
    _count: undefined,
  }));

  const baseUrl = "/api/tier-lists";
  const links: Record<string, string> = {
    self: `${baseUrl}?page=${page}&pageSize=${pageSize}`,
  };
  if (page < totalPages) {
    links.next = `${baseUrl}?page=${page + 1}&pageSize=${pageSize}`;
  }
  if (page > 1) {
    links.prev = `${baseUrl}?page=${page - 1}&pageSize=${pageSize}`;
  }
  links.last = `${baseUrl}?page=${totalPages}&pageSize=${pageSize}`;

  return {
    data,
    meta: {
      totalItems,
      itemCount: tierLists.length,
      itemsPerPage: pageSize,
      totalPages,
      currentPage: page,
    },
    links,
  };
}

export async function getFullTierList(id: string) {
  return tierListRepository.getFullTierList(id);
}

export async function getPublicTierLists(query: GetTierListsQuery) {
  const page = parseInt(query.page, 10);
  const pageSize = parseInt(query.pageSize, 10);

  const [tierLists, totalItems] = await tierListRepository.findPublic({
    page,
    pageSize,
    sortBy: query.sortBy,
  });
  const totalPages = Math.ceil(totalItems / pageSize);

  const baseUrl = "/api/tier-lists/public";
  const links: Record<string, string> = {
    self: `${baseUrl}?page=${page}&pageSize=${pageSize}&sortBy=${query.sortBy || "updated_at"}`,
  };
  if (page < totalPages) {
    links.next = `${baseUrl}?page=${page + 1}&pageSize=${pageSize}&sortBy=${query.sortBy || "updated_at"}`;
  }
  if (page > 1) {
    links.prev = `${baseUrl}?page=${page - 1}&pageSize=${pageSize}&sortBy=${query.sortBy || "updated_at"}`;
  }
  links.last = `${baseUrl}?page=${totalPages}&pageSize=${pageSize}&sortBy=${query.sortBy || "updated_at"}`;

  return {
    data: tierLists.map((tl) => ({
      ...tl,
      authorName: tl.user?.username || "Anonymous",
      authorAvatar: tl.user?.avatarUrl,
      booksCount: tl._count?.placements ?? 0,
      _count: undefined,
    })),
    meta: {
      totalItems,
      totalPages,
      currentPage: page,
    },
    links,
  };
}

export async function createTierList(userId: number, title: string) {
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const slug = generateUniqueSlug(title, randomSuffix);
  const tierList = await tierListRepository.create(userId, { title, slug });
  const { placements: unrankedBooks, ...rest } = tierList;
  return { ...rest, unrankedBooks };
}

export async function updateTierList(
  id: string,
  data: { title?: string; isPublic?: boolean; year?: number },
) {
  return tierListRepository.update(id, data);
}

export async function deleteTierList(id: string) {
  return tierListRepository.delete(id);
}

export async function togglePublic(tierListId: string, isPublic: boolean) {
  return tierListRepository.togglePublic(tierListId, isPublic);
}

export async function clearAllTiers(tierListId: string) {
  const realTierListId = await resolveTierListId(tierListId);
  return prisma.bookPlacement.updateMany({
    where: { tierListId: realTierListId },
    data: { tierId: null },
  });
}

export async function getTierListBooksCount(
  tierListId: string,
): Promise<number> {
  const realTierListId = await resolveTierListId(tierListId);
  const count = await prisma.bookPlacement.count({
    where: { tierListId: realTierListId },
  });
  return count;
}

export async function getTierListMetadata(id: string) {
  return tierListRepository.getMetadata(id);
}
