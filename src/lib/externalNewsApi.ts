import { api } from "./api-client"

export interface ExternalNewsItem {
  id: string
  title: string
  excerpt: string
  imageUrl: string | null
  url: string
  source: string
  lang: "ru" | "en"
  publishedAt: string
}

export const getExternalNews = async (limit = 6): Promise<ExternalNewsItem[]> => {
  return api.get<ExternalNewsItem[]>(`/external-news?limit=${limit}`)
}
