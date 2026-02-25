// Типы данных для системы шаблонов

export interface TierTemplate {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface BookTemplate {
  id?: string;
  title: string;
  author?: string;
  cover_image_url?: string;
  description?: string;
  tierId?: string;
  rank?: number;
}

export interface Template {
  id: string;
  title: string;
  description?: string;
  previewImageUrl?: string;
  category?: string;
  isArchived?: boolean;
  isFavorite?: boolean;
  tiers: TierTemplate[];
  defaultBooks?: BookTemplate[];
  isPublic: boolean;
  authorId?: string;
  createdAt: string;
  updatedAt: string;
  likesCount?: number;
}

export interface CreateTemplateData {
  title: string;
  description?: string;
  tiers: TierTemplate[];
  defaultBooks?: BookTemplate[];
  isPublic?: boolean;
}

export interface UpdateTemplateData {
  title?: string;
  description?: string;
  tiers?: TierTemplate[];
  defaultBooks?: BookTemplate[];
  isPublic?: boolean;
}
