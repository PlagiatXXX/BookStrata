import { apiClient, ApiRequestError } from "./api-client";

export interface SeriesAuthor {
  id: number;
  name: string;
  slug: string | null;
}

export interface SeriesSummary {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  authorId: number | null;
  author: SeriesAuthor | null;
  _count?: { books: number };
  createdAt: string;
  updatedAt: string;
}

export interface SeriesBookItem {
  id: number;
  slug: string | null;
  title: string;
  author: string | null;
  coverImageUrl: string;
  genre: string | null;
  rating: number | null;
  publishedYear: number | null;
  ageRating: string | null;
  seriesOrder: number | null;
}

export interface SeriesDetail extends SeriesSummary {
  books: SeriesBookItem[];
}

export interface SeriesListResult {
  items: SeriesSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateSeriesPayload {
  name: string;
  description?: string | null;
  coverImageUrl?: string | null;
  authorId?: number | null;
  findOrCreate?: boolean;
}

export interface UpdateSeriesPayload {
  name?: string;
  description?: string | null;
  coverImageUrl?: string | null;
  authorId?: number | null;
}

/** Хаб цикла книг. null — 404 (цикл не найден). */
export async function getSeries(slug: string): Promise<SeriesDetail | null> {
  try {
    return await apiClient.get<SeriesDetail>(`/series/${slug}`);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/** Публичный список циклов (с поиском и пагинацией). */
export async function listSeries(params?: {
  q?: string;
  page?: number;
  limit?: number;
  authorId?: number;
}): Promise<SeriesListResult> {
  const query = new URLSearchParams();
  if (params?.q?.trim()) query.set("q", params.q.trim());
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.authorId != null) query.set("authorId", String(params.authorId));
  const qs = query.toString();
  return apiClient.get<SeriesListResult>(qs ? `/series?${qs}` : "/series");
}

/** Список циклов в админке. */
export async function listAdminSeries(params?: {
  q?: string;
  page?: number;
  limit?: number;
}): Promise<SeriesListResult> {
  const query = new URLSearchParams();
  if (params?.q?.trim()) query.set("q", params.q.trim());
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return apiClient.get<SeriesListResult>(
    qs ? `/admin/series?${qs}` : "/admin/series",
  );
}

/** Создать цикл (или найти существующий при findOrCreate: true). */
export async function createAdminSeries(
  payload: CreateSeriesPayload,
): Promise<SeriesSummary> {
  return apiClient.post<SeriesSummary>("/admin/series", payload);
}

/** Обновить цикл (slug не меняется). */
export async function updateAdminSeries(
  id: number,
  payload: UpdateSeriesPayload,
): Promise<SeriesSummary> {
  return apiClient.patch<SeriesSummary>(`/admin/series/${id}`, payload);
}

/** Удалить цикл (вернёт 409, если есть привязанные книги). */
export async function deleteAdminSeries(
  id: number,
): Promise<{ success: boolean }> {
  return apiClient.delete<{ success: boolean }>(`/admin/series/${id}`);
}
