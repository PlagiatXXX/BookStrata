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
  isbn: string | null
  description: string | null
}

export interface AuthorStatItem {
  value: string
  label: string
}

export interface AuthorShowcaseItem {
  book: AuthorBookCard
  pullQuote: string | null
}

export interface AuthorAdaptationItem {
  kind: "film" | "theatre" | "tv"
  title: string
  meta: string | null
  description: string | null
  url: string | null
}

export interface AuthorPressQuoteItem {
  quote: string
  source: string
  sourceRole: string | null
}

export interface AuthorPageData {
  author: {
    id: number
    name: string
    slug: string
    seoDescription: string
    bookCount: number
    avgRating: number | null
    heroImageUrl: string | null
    badge: string | null
    motto: string | null
    manifestoQuote: string | null
    manifestoAuthor: string | null
    manifestoRole: string | null
    aboutText: string | null
  }
  books: AuthorBookCard[]
  topBooks: AuthorBookCard[]
  bottomBooks: AuthorBookCard[]
  tierLists: { id: string; slug: string | null; title: string }[]
  stats: AuthorStatItem[]
  showcase: AuthorShowcaseItem[]
  adaptations: AuthorAdaptationItem[]
  pressQuotes: AuthorPressQuoteItem[]
}

/**
 * Данные страницы автора /authors/:slug (SEO-лендинг).
 * 404 пробрасывается как ApiRequestError — страница рендерит NotFound.
 */
export function getAuthorBySlug(slug: string): Promise<AuthorPageData> {
  return apiClient.get<AuthorPageData>(`/authors/${encodeURIComponent(slug)}`)
}

/**
 * Список всех авторов каталога (страница «Все авторы» /authors).
 * Только авторы с опубликованными книгами, по алфавиту.
 */
export async function getAllAuthors(): Promise<AuthorResult[]> {
  const response = await apiClient.get<{ authors: AuthorResult[] }>('/authors')
  return response.authors
}

/**
 * Популярные авторы (по числу опубликованных книг) — блок
 * «Другие авторы» на странице автора.
 */
export async function getPopularAuthors(limit = 6): Promise<AuthorResult[]> {
  const response = await apiClient.get<{ authors: AuthorResult[] }>('/authors', {
    sort: 'popular',
    limit,
  })
  return response.authors
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
