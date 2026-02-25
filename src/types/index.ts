export interface Book {
  id: string;
  title: string;
  author: string;
  coverImageUrl: string;
  description?: string;
  thoughts?: string;
}

export interface Tier {
  id: string;
  title: string;
  color: string;
  bookIds: string[];
  height?: number;
  labelSize?: 'xs' | 'sm' | 'md';
}

export interface TierListData {
  tierIdToTempIdMap: Record<string, string>; // Карта соответствия временных ID тиров реальным ID
  id: string;
  title: string;
  books: Record<string, Book>;
  tiers: Record<string, Tier>;
  tierOrder: string[];
  unrankedBookIds: string[];
  isPublic?: boolean;
}

// Экспорт типов из tier.ts
export type { TierItem, TierRow, TierState } from './tier';

// Импортируем и экспортируем типы из templates.ts
import type {
  Template,
  CreateTemplateData,
  UpdateTemplateData,
  TierTemplate,
  BookTemplate,
} from './templates';
export type {
  Template,
  CreateTemplateData,
  UpdateTemplateData,
  TierTemplate,
  BookTemplate,
};
