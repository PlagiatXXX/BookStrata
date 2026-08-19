// src/lib/bookApi.ts
// Сервис данных страницы книги (GET /api/books/:slug и связанные эндпоинты).
// Паттерн: api-client.ts (HTTP) → bookApi.ts (DAO/типы) → хуки TanStack Query → компоненты.
import { apiClient, ApiRequestError } from "./api-client";

/** Элемент редакторского блока «Погружение в контекст» (Book.contextChain) */
export interface BookContextChainItem {
  icon: string;
  title: string;
  text: string;
}

/** Компактная карточка книги (similarBooks / otherBooksByAuthor) */
export interface BookCard {
  id: number;
  slug: string | null;
  title: string;
  author: string | null;
  coverImageUrl: string;
  genre: string | null;
  tags: string[];
  rating: number | null;
  publishedYear: number | null;
}

export interface BookCommentAuthor {
  id: number;
  username: string;
  avatarUrl: string | null;
}

export interface BookComment {
  id: number;
  content: string;
  likesCount: number;
  editedAt: string | null;
  createdAt: string;
  user: BookCommentAuthor;
}

export interface BookPageCommentList {
  items: BookComment[];
  total: number;
}

/** Полный ответ GET /api/books/:slug */
export interface BookPageData {
  book: {
    id: number;
    slug: string | null;
    title: string;
    author: string | null;
    coverImageUrl: string;
    description: string | null;
    genre: string | null;
    tags: string[];
    status: string;
    rating: number | null;
    likesCount: number;
    publishedYear: number | null;
    isbn: string | null;
    contextChain: BookContextChainItem[] | null;
  };
  author: { id: number; name: string; slug: string | null } | null;
  tierLists: { id: string; slug: string | null; title: string; isPublic: boolean }[];
  collections: { id: number; slug: string; title: string; type: string }[];
  celebrities: { id: number; slug: string; name: string }[];
  similarBooks: BookCard[];
  otherBooksByAuthor: BookCard[];
  comments: BookPageCommentList;
  userLike: boolean;
}

export interface LikeToggleResult {
  liked: boolean;
  likesCount: number;
}

export interface BookPlacementResult {
  placement: { bookId: string; tierId: string | null; rank: number };
}

/** Страница книги. null — 404 (draft или не существует). */
export async function getBook(slug: string): Promise<BookPageData | null> {
  try {
    return await apiClient.get<BookPageData>(`/books/${slug}`);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/** Комментарии книги (пагинация offset/limit, newest first). */
export async function getBookComments(
  slug: string,
  offset: number,
  limit = 10,
): Promise<BookPageCommentList> {
  return apiClient.get<BookPageCommentList>(`/books/${slug}/comments`, { offset, limit });
}

/** Создать комментарий (auth). parentId — для ответов на комментарии. */
export async function createBookComment(
  slug: string,
  content: string,
  parentId?: number,
): Promise<{ comment: BookComment }> {
  return apiClient.post<{ comment: BookComment }>(`/books/${slug}/comments`, {
    content,
    ...(parentId !== undefined ? { parentId } : {}),
  });
}

/** Редактировать свой комментарий (или админ). */
export async function updateBookComment(
  slug: string,
  commentId: number,
  content: string,
): Promise<{ comment: BookComment }> {
  return apiClient.patch<{ comment: BookComment }>(`/books/${slug}/comments/${commentId}`, { content });
}

/** Удалить комментарий (свой или admin/moderator). */
export async function deleteBookComment(slug: string, commentId: number): Promise<{ success: boolean }> {
  return apiClient.delete(`/books/${slug}/comments/${commentId}`);
}

/** Лайк/анлайк комментария (auth). Нельзя лайкнуть свой. */
export async function toggleBookCommentLike(
  slug: string,
  commentId: number,
): Promise<LikeToggleResult> {
  return apiClient.post<LikeToggleResult>(`/books/${slug}/comments/${commentId}/like`);
}

/** Лайк/анлайк книги (auth). */
export async function toggleBookLike(slug: string): Promise<LikeToggleResult> {
  return apiClient.post<LikeToggleResult>(`/books/${slug}/like`);
}

/** Добавить книгу в тир-лист пользователя (auth). */
export async function addBookToTierList(
  slug: string,
  tierListId: string,
): Promise<BookPlacementResult> {
  return apiClient.post<BookPlacementResult>(`/books/${slug}/tier-lists`, { tierListId });
}
