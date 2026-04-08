/**
 * Shared types for BookStrata Pro
 */

export interface User {
  id: number;
  username: string;
  avatarUrl?: string | null;
  role?: string;
  isPro?: boolean;
  proExpiresAt?: string | null;
}

export interface Book {
  id: number;
  title: string;
  author: string | null;
  coverImageUrl: string;
  description: string | null;
  thoughts?: string | null;
  createdAt?: string;
}

export interface Tier {
  id: number;
  title: string;
  color: string;
  rank: number;
}

export interface BookPlacement {
  rank: number;
  book: Book;
  tierId?: number | null;
}

export interface TierList {
  id: number;
  title: string;
  year?: number | null;
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;
  user?: User;
  tiers: Tier[];
  placements: BookPlacement[];
  unrankedBooks?: BookPlacement[];
  likesCount?: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon?: string | null;
  xpValue: number;
}

export interface TierListShort {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  user: {
    id: number;
    username: string;
    avatarUrl?: string | null;
  };
  likesCount: number;
  booksCount?: number;
  previewCovers?: string[];
}

export interface PaginationMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
