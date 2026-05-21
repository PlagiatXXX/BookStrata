import type { TierListData } from '@/types';

export interface AtomicPlacement {
  bookId: string | number;
  tierId: string | number | null;
  rank: number;
}

export interface AtomicTierAdd {
  tempId: string;
  title: string;
  color: string;
  rank: number;
}

export interface AtomicTierUpdate {
  id: number;
  title: string;
  color: string;
  rank: number;
}

export interface AtomicTiersDiff {
  added: AtomicTierAdd[];
  updated: AtomicTierUpdate[];
  deletedIds: number[];
}

export interface AtomicNewBook {
  tempId: string;
  title: string;
  author?: string;
  coverImageUrl: string;
  description?: string;
  thoughts?: string;
}

export interface AtomicSavePayload {
  tiers: AtomicTiersDiff;
  newBooks: AtomicNewBook[];
  placements: AtomicPlacement[];
  deletedBookIds: number[];
}

function toNumericId(id: string): number | null {
  if (!/^\d+$/.test(id)) return null;
  const parsed = Number.parseInt(id, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function getAtomicSavePayload(listData: TierListData): AtomicSavePayload {
  const addedTiers: AtomicTierAdd[] = [];
  const updatedTiers: AtomicTierUpdate[] = [];
  const placements: AtomicPlacement[] = [];

  // Собираем тиры и их позиции
  listData.tierOrder.forEach((tierId, rank) => {
    const tier = listData.tiers[tierId];
    if (!tier) return;

    const numericTierId = toNumericId(tierId);
    if (numericTierId === null) {
      addedTiers.push({
        tempId: tierId,
        title: tier.title,
        color: tier.color,
        rank,
      });
    } else {
      updatedTiers.push({
        id: numericTierId,
        title: tier.title,
        color: tier.color,
        rank,
      });
    }

    // Собираем позиции книг в этом тире
    tier.bookIds.forEach((bookId, bookRank) => {
      const numericBookId = toNumericId(bookId);
      placements.push({
        bookId: numericBookId ?? bookId,
        tierId: numericTierId ?? tierId,
        rank: bookRank,
      });
    });
  });

  // Собираем позиции unranked книг
  listData.unrankedBookIds.forEach((bookId, rank) => {
    const numericBookId = toNumericId(bookId);
    placements.push({
      bookId: numericBookId ?? bookId,
      tierId: null,
      rank,
    });
  });

  // Собираем новые книги
  const newBooks = Object.values(listData.books)
    .filter((book) => toNumericId(book.id) === null)
    .map((book) => ({
      tempId: book.id,
      title: book.title,
      author: book.author,
      coverImageUrl: book.coverImageUrl,
      description: book.description,
      thoughts: book.thoughts,
    }));

  return {
    tiers: {
      added: addedTiers,
      updated: updatedTiers,
      deletedIds: listData.deletedTierIds || [],
    },
    newBooks,
    placements,
    deletedBookIds: listData.deletedBookIds || [],
  };
}


