import { api } from "./api-client";

export interface NewsArticle {
  id: string;
  title: string;
  content?: string;
  excerpt: string;
  imageUrl: string | null;
  tags: string[];
  authorId: number | null;
  authorName?: string | null;
  publishedAt: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNewsInput {
  title: string;
  content?: string;
  excerpt: string;
  imageUrl?: string;
  tags?: string[];
  isPublished?: boolean;
}

export interface UpdateNewsInput {
  title?: string;
  content?: string;
  excerpt?: string;
  imageUrl?: string;
  tags?: string[];
  isPublished?: boolean;
}

export interface NewsListResponse {
  data: NewsArticle[];
  meta: {
    total: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
  };
  links: {
    self: string;
    next?: string;
    prev?: string;
    last: string;
  };
}

/**
 * Получить все новости (с пагинацией)
 */
export const getNews = async (
  page = 1,
  limit = 10,
  publishedOnly = false,
): Promise<NewsListResponse> => {
  return api.get<NewsListResponse>(
    `/news?page=${page}&limit=${limit}&publishedOnly=${publishedOnly}`,
  );
};

/**
 * Получить опубликованные новости
 */
export const getPublishedNews = async (limit = 6): Promise<NewsArticle[]> => {
  return api.get<NewsArticle[]>(`/news/published?limit=${limit}`);
};

/**
 * Получить новость по ID
 */
export const getNewsById = async (id: string): Promise<NewsArticle | null> => {
  try {
    return api.get<NewsArticle>(`/news/${id}`);
  } catch {
    return null;
  }
};

/**
 * Создать новость (требуется авторизация)
 */
export const createNews = async (
  input: CreateNewsInput,
): Promise<{ message: string }> => {
  return api.post<{ message: string }>("/news", input);
};

/**
 * Обновить новость (требуется авторизация)
 */
export const updateNews = async (
  id: string,
  input: UpdateNewsInput,
): Promise<{ message: string; article: NewsArticle }> => {
  return api.put<{ message: string; article: NewsArticle }>(
    `/news/${id}`,
    input,
  );
};

/**
 * Удалить новость (требуется авторизация)
 */
export const deleteNews = async (id: string): Promise<{ message: string }> => {
  return api.delete<{ message: string }>(`/news/${id}`);
};

/**
 * Опубликовать/снять с публикации новость (требуется авторизация)
 */
export const togglePublish = async (
  id: string,
  isPublished: boolean,
): Promise<{ message: string; article: NewsArticle }> => {
  return api.post<{ message: string; article: NewsArticle }>(
    `/news/${id}/publish`,
    { isPublished },
  );
};
