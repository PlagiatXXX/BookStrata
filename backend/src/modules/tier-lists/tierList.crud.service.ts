import {
  tierListRepository,
  resolveTierListId,
} from "./tierList.utils.js";
import { prisma } from "./tierList.utils.js";
import { generateUniqueSlug } from "../../utils/slugify.js";
import type { GetTierListsQuery } from "./tierList.schema.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface TierListWithCount { _count?: any; [key: string]: unknown }

function safePageParam(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function getUserTierLists(
  userId: number,
  query: GetTierListsQuery,
) {
  const page = safePageParam(query.page, 1);
  const pageSize = safePageParam(query.pageSize, 10);

  const [tierLists, totalItems] = await tierListRepository.findByUser(userId, {
    page,
    pageSize,
  });
  const totalPages = Math.ceil(totalItems / pageSize);

  const data = tierLists.map((tl: TierListWithCount) => ({
    ...tl,
    authorName: (tl.user as Record<string, unknown>)?.username || "Anonymous",
    authorAvatar: (tl.user as Record<string, unknown>)?.avatarUrl,
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
  if (totalPages > 0) {
    links.last = `${baseUrl}?page=${totalPages}&pageSize=${pageSize}`;
  }

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
  const page = safePageParam(query.page, 1);
  const pageSize = safePageParam(query.pageSize, 10);

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
  if (totalPages > 0) {
    links.last = `${baseUrl}?page=${totalPages}&pageSize=${pageSize}&sortBy=${query.sortBy || "updated_at"}`;
  }

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
      itemCount: tierLists.length,
      itemsPerPage: pageSize,
      totalPages,
      currentPage: page,
    },
    links,
  };
}

export async function getLikedTierLists(
  userId: number,
  query: GetTierListsQuery,
) {
  const page = safePageParam(query.page, 1);
  const pageSize = safePageParam(query.pageSize, 10);

  const [data, totalItems] = await tierListRepository.findLikedByUser(userId, {
    page,
    pageSize,
  });
  const totalPages = Math.ceil(totalItems / pageSize);

  const baseUrl = "/api/tier-lists/liked";
  const links: Record<string, string> = {
    self: `${baseUrl}?page=${page}&pageSize=${pageSize}`,
  };
  if (page < totalPages) {
    links.next = `${baseUrl}?page=${page + 1}&pageSize=${pageSize}`;
  }
  if (page > 1) {
    links.prev = `${baseUrl}?page=${page - 1}&pageSize=${pageSize}`;
  }
  if (totalPages > 0) {
    links.last = `${baseUrl}?page=${totalPages}&pageSize=${pageSize}`;
  }

  return {
    data: data.map((tl: Record<string, unknown>) => ({
      ...tl,
      authorName: (tl.user as Record<string, unknown>)?.username || "Anonymous",
      authorAvatar: (tl.user as Record<string, unknown>)?.avatarUrl,
      _count: undefined,
    })),
    meta: {
      totalItems,
      itemCount: data.length,
      itemsPerPage: pageSize,
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
  data: { title?: string; isPublic?: boolean; year?: number; theme?: string },
) {
  return tierListRepository.update(id, data);
}

export async function updateTierListCover(id: string, coverImageUrl: string) {
  return tierListRepository.update(id, { coverImageUrl });
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

// GET /api/tier-lists/:id/taste-match — сравнение вкуса с автором просматриваемого тир-листа
// Нормализация ключа книги для сравнения (автор + название)
function normalizeBookKey(title: string, author: string | null): string {
  return `${title.toLowerCase().trim()}|${(author ?? "").toLowerCase().trim()}`;
}

export async function getTierListTasteMatch(
  tierListIdOrSlug: string,
  currentUserId?: number,
) {
  const realId = await resolveTierListId(tierListIdOrSlug);

  // Получаем тир-лист с его тирами и размещениями (с bookId для JOIN)
  const tierList = await prisma.tierList.findUnique({
    where: { id: realId },
    include: {
      tiers: { orderBy: { rank: "asc" } },
      placements: {
        include: {
          book: { select: { id: true, title: true, author: true, coverImageUrl: true } },
          tier: { select: { id: true, title: true, rank: true } },
        },
      },
    },
  });

  if (!tierList) {
    return { matchPercent: 0, commonBooks: 0, totalBooks: 0, matches: [] };
  }

  // Количество уникальных книг в просматриваемом тир-листе (по автору+названию)
  const listBookKeys = new Set<string>();
  for (const p of tierList.placements) {
    listBookKeys.add(normalizeBookKey(p.book.title, p.book.author));
  }
  const totalBooks = listBookKeys.size;

  // Если пользователь не авторизован — возвращаем только количество книг
  if (!currentUserId) {
    return { matchPercent: 0, commonBooks: 0, totalBooks, matches: [] };
  }

  // Получаем все ID тир-листов пользователя
  const userListIds = await tierListRepository.findUserTierListIds(currentUserId);
  if (userListIds.length === 0) {
    return { matchPercent: 0, commonBooks: 0, totalBooks, matches: [] };
  }

  // Берём только bookId из просматриваемого тир-листа — вместо всех книг пользователя
  const listBookIds = [...new Set(tierList.placements.map((p: { bookId: number }) => p.bookId))];

  const userPlacements = await prisma.bookPlacement.findMany({
    where: {
      tierListId: { in: userListIds },
      bookId: { in: listBookIds },
    },
    include: {
      book: { select: { title: true, author: true, coverImageUrl: true } },
      tier: { select: { id: true, title: true, rank: true } },
    },
  });

  // Строим map книг пользователя по автору+названию (первое вхождение — приоритет)
  const userBookMap = new Map<
    string,
    { tierId: number | null; tierTitle: string | null; tierRank: number | null }
  >();
  const userBookKeys = new Set<string>();
  for (const p of userPlacements) {
    const key = normalizeBookKey(p.book.title, p.book.author);
    userBookKeys.add(key);
    if (!userBookMap.has(key)) {
      userBookMap.set(key, {
        tierId: p.tier?.id ?? null,
        tierTitle: p.tier?.title ?? null,
        tierRank: p.tier?.rank ?? null,
      });
    }
  }

  // Собираем совпадения по автору+названию
  const matches: Array<{
    book: { title: string; author: string | null; coverImageUrl: string };
    tierInList: string | null;
    tierInListId: number | null;
    tierInListRank: number | null;
    tierInMine: string | null;
    tierInMineId: number | null;
    tierInMineRank: number | null;
  }> = [];

  for (const p of tierList.placements) {
    const key = normalizeBookKey(p.book.title, p.book.author);
    const userMatch = userBookMap.get(key);
    if (userMatch) {
      matches.push({
        book: {
          title: p.book.title,
          author: p.book.author,
          coverImageUrl: p.book.coverImageUrl,
        },
        tierInList: p.tier?.title ?? null,
        tierInListId: p.tier?.id ?? null,
        tierInListRank: p.tier?.rank ?? null,
        tierInMine: userMatch.tierTitle,
        tierInMineId: userMatch.tierId,
        tierInMineRank: userMatch.tierRank,
      });
    }
  }

  const commonBooks = matches.length;
  const totalUnique = totalBooks + userBookKeys.size - commonBooks;

  return {
    matchPercent: totalUnique > 0 ? Math.round((commonBooks / totalUnique) * 100) : 0,
    commonBooks,
    totalBooks,
    matches,
  };
}
