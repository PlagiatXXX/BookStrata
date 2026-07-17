import type { Book, Tier } from "@/types";

export type CollectionItem = {
  id: number;
  slug: string;
  title: string;
  type: "curated" | "literary"; // curated = тир-лист, literary = HTML-статья
  categoryId?: string | null;
  // Для curated (тир-лист):
  tiers?: Record<string, Tier>;
  tierOrder?: string[];
  books?: Record<string, Book>;
  unrankedBookIds?: string[];
  // Для literary (статья):
  content?: string; // HTML-контент
  // Общие:
  excerpt?: string;
  isFeatured: boolean;
  editorialNote?: string | null; // Редакционная заметка (содержит текст "Почему именно эти книги?")
  coverImageUrl: string;
  bookCovers?: string[]; // Массив обложек книг (3-4 шт), для превью
  tags: string[];
  isPublished: boolean;
  order: number;
  accentColor?: string; // Цветовая акцентная подсветка карточки (hex)
  createdAt: string;
  updatedAt: string;
};
