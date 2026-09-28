// src/lib/matchApi.ts
// DAO рекомендаций Book Match (GET /api/books/match).
// Паттерн: api-client.ts (HTTP) → matchApi.ts (DAO/типы) → хук TanStack Query → компоненты.
import { apiClient } from "./api-client";
import type { CategoryId } from "@/data/genre-taxonomy";

/** Настроение пользователя — структурно совместимо с UserMood из фичи book-match. */
export type MoodParams = {
  storyFocus?: number;
  emotionalWeight?: number;
  pace?: number;
  darkness?: number;
};

/** Карточка рекомендации (ответ GET /api/books/match). */
export interface MatchedBook {
  id: number;
  slug: string;
  title: string;
  author: string | null;
  coverImageUrl: string;
  /** Match Score 0–100. */
  score: number;
}

/**
 * Канонический query key. Позиционный tuple — хэш не зависит
 * от порядка ключей объекта mood (UserMood собирается спредом).
 * genres сортируются: порядок выбора не должен дробить кэш.
 */
export function matchedBooksKey(
  mood: MoodParams,
  limit: number,
  excludeSlug?: string,
  genres?: CategoryId[],
) {
  const genresKey = genres && genres.length > 0 ? [...genres].sort().join(",") : null;
  return [
    "book-match",
    mood.storyFocus ?? null,
    mood.emotionalWeight ?? null,
    mood.pace ?? null,
    mood.darkness ?? null,
    limit,
    excludeSlug ?? null,
    genresKey,
  ] as const;
}

/** Топ-N книг под настроение. Неактивные оси не отправляются. */
export async function getMatchedBooks(
  mood: MoodParams,
  limit = 3,
  excludeSlug?: string,
  genres?: CategoryId[],
): Promise<MatchedBook[]> {
  const params: Record<string, string | number> = { limit };
  if (mood.storyFocus !== undefined) params.storyFocus = mood.storyFocus;
  if (mood.emotionalWeight !== undefined) params.emotionalWeight = mood.emotionalWeight;
  if (mood.pace !== undefined) params.pace = mood.pace;
  if (mood.darkness !== undefined) params.darkness = mood.darkness;
  if (excludeSlug) params.exclude = excludeSlug;
  if (genres && genres.length > 0) params.genres = genres.join(",");

  const { books } = await apiClient.get<{ books: MatchedBook[] }>("/books/match", params);
  return books;
}
