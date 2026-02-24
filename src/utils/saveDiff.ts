import type { TierListData } from '@/types';

interface PlacementDiff {
  bookId: number;
  tierId: number | null;
  rank: number;
}

interface TierAddDiff {
  title: string;
  color: string;
  rank: number;
}

interface TierUpdateDiff {
  id: number;
  title: string;
  color: string;
  rank: number;
}

interface TiersDiff {
  added: TierAddDiff[];
  updated: TierUpdateDiff[];
  deletedIds: number[];
}

interface NewBookDiff {
  id: string;
  title: string;
  author?: string;
  coverImageUrl: string;
  description?: string;
  thoughts?: string;
}

function isTempBookId(id: string): boolean {
  return id.startsWith('book-');
}

function isTempTierId(id: string): boolean {
  return id.startsWith('tier-');
}

function toNumericId(id: string): number | null {
  const parsed = Number.parseInt(id, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function getPlacementsDiff(listData: TierListData): PlacementDiff[] {
  const placements: PlacementDiff[] = [];

  listData.tierOrder.forEach((tierId) => {
    const numericTierId = toNumericId(tierId);
    if (numericTierId === null) return;

    const tier = listData.tiers[tierId];
    if (!tier) return;

    tier.bookIds.forEach((bookId, rank) => {
      if (isTempBookId(bookId)) return;
      const numericBookId = toNumericId(bookId);
      if (numericBookId === null) return;

      placements.push({
        bookId: numericBookId,
        tierId: numericTierId,
        rank,
      });
    });
  });

  listData.unrankedBookIds.forEach((bookId, rank) => {
    if (isTempBookId(bookId)) return;
    const numericBookId = toNumericId(bookId);
    if (numericBookId === null) return;

    placements.push({
      bookId: numericBookId,
      tierId: null,
      rank,
    });
  });

  return placements;
}

export function getTiersDiff(listData: TierListData): TiersDiff {
  const added: TierAddDiff[] = [];
  const updated: TierUpdateDiff[] = [];

  listData.tierOrder.forEach((tierId, rank) => {
    const tier = listData.tiers[tierId];
    if (!tier) return;

    if (isTempTierId(tierId)) {
      added.push({
        title: tier.title,
        color: tier.color,
        rank,
      });
      return;
    }

    const numericTierId = toNumericId(tierId);
    if (numericTierId === null) return;

    updated.push({
      id: numericTierId,
      title: tier.title,
      color: tier.color,
      rank,
    });
  });

  return {
    added,
    updated,
    deletedIds: [],
  };
}

export function getNewBooks(listData: TierListData): NewBookDiff[] {
  return Object.values(listData.books)
    .filter((book) => isTempBookId(book.id))
    .map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      coverImageUrl: book.coverImageUrl,
      description: book.description,
      thoughts: book.thoughts,
    }));
}

export function hasChangesToSave(listData: TierListData): boolean {
  const placements = getPlacementsDiff(listData);
  const tiers = getTiersDiff(listData);
  const newBooks = getNewBooks(listData);

  return (
    placements.length > 0 ||
    tiers.added.length > 0 ||
    tiers.updated.length > 0 ||
    tiers.deletedIds.length > 0 ||
    newBooks.length > 0
  );
}
