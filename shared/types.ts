/**
 * Shared types for BookStrata Pro
 */

export interface User {
  id: string;
  slug?: string | null;
  username: string;
  avatarUrl?: string | null;
  role?: string;
  isPro?: boolean;
  proExpiresAt?: string | null;
  isDonor?: boolean;
}

export interface Book {
  id: string;
  slug?: string | null;
  title: string;
  author: string | null;
  coverImageUrl: string;
  description: string | null;
  thoughts?: string | null;
  createdAt?: string;
  genre?: string | null;
  tags?: string[];
}

export interface Tier {
  id: string;
  slug?: string | null;
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
  id: string;
  slug?: string | null;
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
  slug?: string | null;
  name: string;
  description: string;
  icon?: string | null;
  xpValue: number;
}

export interface TierListShort {
  id: string;
  slug?: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  user: {
    id: string;
    slug?: string | null;
    username: string;
    avatarUrl?: string | null;
  };
  likesCount: number;
  booksCount?: number;
  previewCovers?: string[];
}

export interface AdminDashboardStats {
  totalUsers: number
  proUsers: number
  activeNews: number
  tierLists: number
  violators: number
  feedbackCount: number
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
