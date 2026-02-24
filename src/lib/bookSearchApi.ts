import { getAuthHeader, handleResponse } from './authApi';
import { API_BASE_URL } from './config';
import { logger } from './logger';

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
    logger.info('Searching books via backend API', { query, startIndex });

    const response = await fetch(
      `${API_BASE_URL}/books/search?q=${encodeURIComponent(query)}&startIndex=${startIndex}`,
      {
        headers: getAuthHeader(),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to search books');
    }

    const result = await handleResponse<{ books: OpenLibraryBook[] }>(response);
    logger.info('Books search completed', { count: result.books.length });
    return result.books;
  } catch (err) {
    if (err instanceof Error) {
      logger.error(err, { action: 'searchGoogleBooks', query });
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
    logger.info('Adding book from search to tier list', { tierListId, title: book.title });

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
      throw new Error(error.error || 'Failed to add book');
    }

    const result = await handleResponse<{ book: { id: number; title: string; author: string | null; coverImageUrl: string } }>(response);
    logger.info('Book added from search', { tierListId, bookId: result.book.id });
    return result.book;
  } catch (err) {
    if (err instanceof Error) {
      logger.error(err, { action: 'addBookFromGoogleBooks', tierListId, title: book.title });
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
    logger.info('Searching books in Open Library', { query });
    const response = await fetch(`${API_BASE_URL}/books/search?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to search books');
    }

    const result = await handleResponse<{ books: OpenLibraryBook[] }>(response);
    logger.info('Open Library search completed', { count: result.books.length });
    return result.books;
  } catch (err) {
    if (err instanceof Error) {
      logger.error(err, { action: 'searchOpenLibraryBooks', query });
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
    logger.info('Adding book from Open Library', { tierListId, title: book.title });
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
      throw new Error('Failed to add book');
    }

    const result = await handleResponse<{ book: { id: number; title: string; author: string | null; coverImageUrl: string } }>(response);
    logger.info('Book added from Open Library', { tierListId, bookId: result.book.id });
    return result.book;
  } catch (err) {
    if (err instanceof Error) {
      logger.error(err, { action: 'addBookFromOpenLibrary', tierListId, title: book.title });
    }
    throw err;
  }
}
