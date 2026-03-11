import { getAuthHeader, handleResponse } from './authApi';
import { API_BASE_URL } from './config';
import { createLogger } from './logger';

// Логгер для модуля поиска книг
const bookSearchLogger = createLogger('BookSearch', { color: 'yellow' });

// ========== TYPES ==========

export interface OpenLibraryBook {
  openLibraryKey: string;
  title: string;
  author: string;
  coverUrl: string | null;
  coverUrlLarge: string | null;
  publishYear?: number;
  numberOfPages?: number;
  subjects?: string[];
}

// ========== GOOGLE BOOKS SEARCH ==========

/**
 * Поиск книг через бэкенд (Google Books API)
 */
export async function searchGoogleBooks(query: string, startIndex = 0): Promise<OpenLibraryBook[]> {
  if (!query || query.length < 2) return [];

  try {
    bookSearchLogger.info('Поиск книг через backend API', { query, startIndex });

    const response = await fetch(
      `${API_BASE_URL}/books/search?q=${encodeURIComponent(query)}&startIndex=${startIndex}`,
      {
        headers: getAuthHeader(),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Не удалось выполнить поиск книг');
    }

    const result = await handleResponse<{ books: OpenLibraryBook[] }>(response);
    bookSearchLogger.info('Поиск книг завершён', { count: result.books.length });
    return result.books;
  } catch (err) {
    if (err instanceof Error) {
      bookSearchLogger.error(err, { action: 'searchGoogleBooks', query });
    }
    throw err;
  }
}

/**
 * Добавить книгу из поиска в тир-лист
 */
export async function addBookFromGoogleBooks(
  tierListId: string,
  book: OpenLibraryBook
): Promise<{ id: number; title: string; author: string | null; coverImageUrl: string }> {
  try {
    bookSearchLogger.info('Добавление книги из поиска в тир-лист', { tierListId, title: book.title });

    const response = await fetch(`${API_BASE_URL}/tier-lists/${tierListId}/books/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        openLibraryKey: book.openLibraryKey,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrlLarge || book.coverUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Не удалось добавить книгу');
    }

    const result = await handleResponse<{ book: { id: number; title: string; author: string | null; coverImageUrl: string } }>(response);
    bookSearchLogger.info('Книга добавлена из поиска', { tierListId, bookId: result.book.id });
    return result.book;
  } catch (err) {
    if (err instanceof Error) {
      bookSearchLogger.error(err, { action: 'addBookFromGoogleBooks', tierListId, title: book.title });
    }
    throw err;
  }
}

// ========== OPEN LIBRARY SEARCH ==========

/**
 * Поиск книг в Open Library
 */
export async function searchOpenLibraryBooks(query: string): Promise<OpenLibraryBook[]> {
  if (!query || query.length < 2) return [];

  try {
    bookSearchLogger.info('Поиск книг в Open Library', { query });
    const response = await fetch(`${API_BASE_URL}/books/search?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Не удалось выполнить поиск книг');
    }

    const result = await handleResponse<{ books: OpenLibraryBook[] }>(response);
    bookSearchLogger.info('Поиск в Open Library завершён', { count: result.books.length });
    return result.books;
  } catch (err) {
    if (err instanceof Error) {
      bookSearchLogger.error(err, { action: 'searchOpenLibraryBooks', query });
    }
    throw err;
  }
}

/**
 * Добавить книгу из Open Library в тир-лист
 */
export async function addBookFromOpenLibrary(
  tierListId: string,
  book: OpenLibraryBook
): Promise<{ id: number; title: string; author: string | null; coverImageUrl: string }> {
  try {
    bookSearchLogger.info('Добавление книги из Open Library', { tierListId, title: book.title });
    const response = await fetch(`${API_BASE_URL}/tier-lists/${tierListId}/books/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        openLibraryKey: book.openLibraryKey,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrlLarge || book.coverUrl,
      }),
    });

    if (!response.ok) {
      throw new Error('Не удалось добавить книгу');
    }

    const result = await handleResponse<{ book: { id: number; title: string; author: string | null; coverImageUrl: string } }>(response);
    bookSearchLogger.info('Книга добавлена из Open Library', { tierListId, bookId: result.book.id });
    return result.book;
  } catch (err) {
    if (err instanceof Error) {
      bookSearchLogger.error(err, { action: 'addBookFromOpenLibrary', tierListId, title: book.title });
    }
    throw err;
  }
}
