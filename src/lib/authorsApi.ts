// src/lib/authorsApi.ts
import { apiClient, ApiRequestError } from './api-client'

export interface AuthorResult {
  id: number
  name: string
  slug: string | null
  bookCount: number
}

export interface AuthorSearchResponse {
  authors: AuthorResult[]
}

export interface AuthorBookCard {
  id: number
  title: string
  slug: string | null
  coverImageUrl: string
  publishedYear: number | null
  genre: string | null
  rating: number | null
  ratingsCount: number
}

export interface AuthorPageData {
  author: {
    id: number
    name: string
    slug: string
    seoDescription: string
    bookCount: number
    avgRating: number | null
  }
  books: AuthorBookCard[]
  topBooks: AuthorBookCard[]
  bottomBooks: AuthorBookCard[]
  tierLists: { id: string; slug: string | null; title: string }[]
}

/**
 * Данные страницы автора /authors/:slug (SEO-лендинг).
 * 404 пробрасывается как ApiRequestError — страница рендерит NotFound.
 */
export function getAuthorBySlug(slug: string): Promise<AuthorPageData> {
  return apiClient.get<AuthorPageData>(`/authors/${encodeURIComponent(slug)}`)
}

/**
 * Поиск авторов по подстроке (для автодополнения)
 */
export async function searchAuthors(q: string, limit = 10): Promise<AuthorResult[]> {
  try {
    const response = await apiClient.get<AuthorSearchResponse>('/authors/search', { q, limit })
    return response.authors
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return [];
    }
    throw error;
  }
}
