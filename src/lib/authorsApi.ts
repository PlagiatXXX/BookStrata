// src/lib/authorsApi.ts
import { apiClient } from './api-client'

export interface AuthorResult {
  id: number
  name: string
  slug: string | null
  bookCount: number
}

export interface AuthorSearchResponse {
  authors: AuthorResult[]
}

/**
 * Поиск авторов по подстроке (для автодополнения)
 */
export async function searchAuthors(q: string, limit = 10): Promise<AuthorResult[]> {
  try {
    const response = await apiClient.get<AuthorSearchResponse>('/authors/search', { q, limit })
    return response.authors
  } catch {
    return []
  }
}
