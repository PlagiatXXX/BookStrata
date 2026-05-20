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
  const result = await api.get<{ data: NewsArticle[] }>(`/news/published?limit=${limit}`);
  return result.data;
};

/**
 * Получить новость по ID
 */
export const getNewsById = async (id: string): Promise<NewsArticle | null> => {
  try {
    const result = await api.get<{ data: NewsArticle }>(`/news/${id}`);
    return result.data;
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
  const result = await api.post<{ data: { message: string } }>("/news", input);
  return { message: result.data.message };
};

/**
 * Обновить новость (требуется авторизация)
 */
export const updateNews = async (
  id: string,
  input: UpdateNewsInput,
): Promise<{ message: string; article: NewsArticle }> => {
  const result = await api.put<{ data: { message: string; article: NewsArticle } }>(
    `/news/${id}`,
    input,
  );
  return result.data;
};

/**
 * Удалить новость (требуется авторизация)
 */
export const deleteNews = async (id: string): Promise<{ message: string }> => {
  const result = await api.delete<{ data: { message: string } }>(`/news/${id}`);
  return { message: result.data.message };
};

/**
 * Опубликовать/снять с публикации новость (требуется авторизация)
 */
export const togglePublish = async (
  id: string,
  isPublished: boolean,
): Promise<{ message: string; article: NewsArticle }> => {
  const result = await api.post<{ data: { message: string; article: NewsArticle } }>(
    `/news/${id}/publish`,
    { isPublished },
  );
  return result.data;
};
