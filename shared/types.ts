/**
 * Shared types for BookStrata Pro
 *
 * Эти типы используются как на frontend, так и на backend
 * для обеспечения консистентности данных.
 */

// ============================================
// BASE TYPES (из Prisma Schema)
// ============================================

export interface User {
  id: number;
  email: string;
  username: string | null;
  avatarUrl: string | null;
  aiAvatarsGenerated: number;
  lastAvatarResetAt: Date;
  roleId: number | null;
  createdAt: Date;
}

export interface Book {
  id: number | string;
  title: string;
  author: string | null;
  coverImageUrl: string;
  description: string | null;
  thoughts: string | null;
  createdAt: Date;
}

export interface TierList {
  id: number;
  userId: number;
  title: string;
  year: number | null;
  isTemplate: boolean;
  isPublic: boolean;
  likesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tier {
  id: number | string;
  tierListId: number | string;
  title: string;
  color: string;
  rank: number;
  // Frontend-specific fields
  height?: number;
  labelSize?: "xs" | "sm" | "md";
  bookIds?: (number | string)[];
}

export interface BookPlacement {
  tierListId: number;
  bookId: number;
  tierId: number | null;
  rank: number;
}

export interface Template {
  id: string;
  title: string;
  description: string | null;
  type: string | null;
  tiers: unknown;
  defaultBooks: unknown | null;
  isPublic: boolean;
  authorId: number | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  // Frontend-specific fields
  previewImageUrl?: string;
  category?: string;
  isArchived?: boolean;
  isFavorite?: boolean;
  likesCount?: number;
}

export interface TierListLike {
  id: number;
  userId: number;
  tierListId: number;
  createdAt: Date;
}

export interface TemplateLike {
  id: number;
  userId: number;
  templateId: string;
  createdAt: Date;
}

export interface NewsArticle {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  imageUrl: string | null;
  tags: string[];
  authorId: number | null;
  publishedAt: Date;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface ApiError {
  message: string;
  error?: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// AUTH TYPES
// ============================================

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

// ============================================
// TIER LIST TYPES (Frontend-friendly)
// ============================================

export interface TierListBook {
  id: number | string;
  title: string;
  author: string;
  coverImageUrl: string;
  description?: string;
  thoughts?: string;
  googleBooksId?: string;
}

export interface TierListTier {
  id: number | string;
  title: string;
  color: string;
  rank: number;
  bookIds: (number | string)[];
}

export interface TierListEditorData {
  id: string;
  title: string;
  tiers: TierListTier[];
  books: Record<string, TierListBook>;
  unrankedBookIds: (number | string)[];
  isPublic: boolean;
}

export interface CreateTierListRequest {
  title: string;
  year?: number;
  isPublic?: boolean;
  tiers?: Array<{
    title: string;
    color: string;
    rank: number;
  }>;
}

export interface UpdateTierListRequest {
  title?: string;
  year?: number | null;
  isPublic?: boolean;
  tiers?: Array<{
    id?: number;
    title: string;
    color: string;
    rank: number;
  }>;
  books?: Array<{
    id: number;
    tierId: number | null;
    rank: number;
  }>;
}

// ============================================
// TEMPLATE TYPES (Frontend-friendly)
// ============================================

export interface TierTemplate {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface BookTemplate {
  id?: string | number;
  title: string;
  author?: string;
  coverImageUrl?: string;
  description?: string;
  thoughts?: string;
  defaultTierId: string;
  tierId?: string;
  rank?: number;
  googleBooksId?: string;
}

export interface CreateTemplateData {
  title: string;
  description?: string | null;
  type?: string | null;
  isPublic: boolean;
  tiers: TierTemplate[];
  defaultBooks?: BookTemplate[];
}

export type UpdateTemplateData = Partial<CreateTemplateData>;

// ============================================
// AVATAR TYPES
// ============================================

export interface GenerateAvatarRequest {
  prompt: string;
}

export interface GenerateAvatarResponse {
  avatarUrl: string;
  remainingFreeGenerations: number;
}

export interface AvatarPreset {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
}

// ============================================
// NEWS TYPES
// ============================================

export interface NewsItem {
  id: number;
  title: string;
  excerpt: string;
  tag: string;
  readTime: string;
}

export interface CollectionItem {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  coverImageUrl: string;
  bookCovers: string[];
  tags: string[];
  isPublished: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// UTILITY TYPES
// ============================================

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export type Nullable<T> = T | null;

export type AsyncFunction<T = void> = () => Promise<T>;
