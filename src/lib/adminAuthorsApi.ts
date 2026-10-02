// src/lib/adminAuthorsApi.ts
// Админ-API ручного контента страницы автора (спека 2026-09-29)
import { apiClient } from "./api-client"

export interface AdminAuthorListItem {
  id: number
  name: string
  slug: string | null
  statsCount: number
  showcaseCount: number
  adaptationsCount: number
  pressQuotesCount: number
}

export interface AuthorContentInput {
  heroImageUrl: string | null
  badge: string | null
  motto: string | null
  manifestoQuote: string | null
  manifestoAuthor: string | null
  manifestoRole: string | null
  aboutText: string | null
  stats: { value: string; label: string }[]
  showcase: { bookId: number; pullQuote: string | null }[]
  adaptations: {
    kind: "film" | "theatre" | "tv"
    title: string
    meta: string | null
    description: string | null
    url: string | null
  }[]
  pressQuotes: { quote: string; source: string; sourceRole: string | null }[]
}

export interface AdminAuthorShowcaseItem {
  bookId: number
  title: string
  pullQuote: string | null
}

export type AdminAuthorContent = Omit<AuthorContentInput, "showcase"> & {
  showcase: AdminAuthorShowcaseItem[]
}

/** Список авторов для админки (с флагами наличия контента). */
export async function listAdminAuthors(q?: string): Promise<AdminAuthorListItem[]> {
  const res = await apiClient.get<{ authors: AdminAuthorListItem[] }>(
    "/admin/authors",
    q ? { q } : undefined,
  )
  return res.authors
}

/** Текущий контент автора для редактора. */
export function getAdminAuthorContent(id: number): Promise<AdminAuthorContent> {
  return apiClient.get<AdminAuthorContent>(`/admin/authors/${id}/content`)
}

/** Атомарное сохранение всего контента. */
export function saveAdminAuthorContent(
  id: number,
  content: AuthorContentInput,
): Promise<{ ok: true }> {
  return apiClient.put(`/admin/authors/${id}/content`, content)
}

/** Загрузить портрет автора (base64 → storage, сервер сам: WebP ≤1600px). */
export async function uploadAuthorHero(
  file: File,
): Promise<{ heroImageUrl: string }> {
  const base64 = await fileToBase64(file)
  return apiClient.post<{ heroImageUrl: string }>(
    "/admin/authors/upload-hero",
    { heroImageUrl: base64 },
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
