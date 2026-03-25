// Типы данных для системы шаблонов

export type TemplateType = "starter" | "curated" | "community";

export interface TierTemplate {
  id: string;
  name: string;
  color: string;
  order: number;
}

/**
 * Книга для шаблона (defaultBooks)
 * Используется как предустановленная книга при создании тир-листа из шаблона
 */
export interface BookTemplate {
  id?: string;
  title: string;
  author?: string;
  coverImageUrl?: string; // исправлено с cover_image_url для консистивности
  description?: string;
  thoughts?: string; // заметки о книге
  defaultTierId: string; // обязательное поле для привязки к уровню шаблона
  tierId?: string; // для совместимости со старым кодом
  rank?: number;
  googleBooksId?: string; // ID книги в Google Books API
}

export interface Template {
  id: string;
  title: string;
  description?: string;
  previewImageUrl?: string;
  category?: string;
  type?: TemplateType; // тип шаблона
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
  coverImageUrl?: string;
  type?: TemplateType; // тип шаблона
  tiers: TierTemplate[];
  defaultBooks?: BookTemplate[];
  isPublic?: boolean;
}

export interface UpdateTemplateData {
  title?: string;
  description?: string;
  coverImageUrl?: string;
  type?: TemplateType;
  tiers?: TierTemplate[];
  defaultBooks?: BookTemplate[];
  isPublic?: boolean;
}
