import { apiClient } from "./api-client";

export const RATING_CATEGORIES = [
  { key: "style", label: "Слог автора" },
  { key: "plot", label: "Сюжет" },
  { key: "design", label: "Дизайн книги" },
  { key: "atmosphere", label: "Атмосфера" },
  { key: "characters", label: "Персонажи" },
] as const;

export interface BookRatingsResult {
  count: number;
  averages: Record<string, number>;
  overall: number;
}

export async function rateBook(bookId: number, ratings: Record<string, number>) {
  return apiClient.post("/ratings", { bookId, ratings });
}

export async function getBookRatings(bookId: number) {
  return apiClient.get<BookRatingsResult>(`/ratings/${bookId}`);
}

export async function getUserBookRating(bookId: number) {
  return apiClient.get<{ ratings: Record<string, number> } | null>(`/ratings/${bookId}/mine`);
}
