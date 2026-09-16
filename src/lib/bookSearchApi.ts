import { apiClient } from './api-client';
import { createLogger } from './logger';

const bookSearchLogger = createLogger('BookSearch', { color: 'yellow' });

export interface OpenLibraryBook {
  openLibraryKey: string;
  /** Источник внешнего ID книги (Фаза 2.1): google_books | open_library | livelib | bookstrata */
  source?: 'google_books' | 'open_library' | 'livelib' | 'bookstrata';
  /** ID книги в источнике (volumeId / OpenLibrary key / LiveLib id / BookStrata book id) */
  externalId?: string;
  title: string;
  author: string;
  coverUrl: string | null;
  coverUrlLarge: string | null;
  publishYear?: number;
  numberOfPages?: number;
  subjects?: string[];
}

export async function searchGoogleBooks(query: string, startIndex = 0): Promise<OpenLibraryBook[]> {
  if (!query || query.length < 2) return [];

  try {
    bookSearchLogger.info('Поиск книг через backend API', { query, startIndex });
    const result = await apiClient.get<{ books: OpenLibraryBook[] }>('/books/search', { q: query, startIndex });
    bookSearchLogger.info('Поиск книг завершён', { count: result.books.length });
    return result.books;
  } catch (err) {
    if (err instanceof Error) {
      bookSearchLogger.error(err, { action: 'searchGoogleBooks', query });
    }
    throw err;
  }
}

export async function addBookFromGoogleBooks(
  tierListId: string,
  book: OpenLibraryBook
): Promise<{ id: number; title: string; author: string | null; coverImageUrl: string }> {
  try {
    bookSearchLogger.info('Добавление книги из поиска в тир-лист', { tierListId, title: book.title });
    const result = await apiClient.post<{ book: { id: number; title: string; author: string | null; coverImageUrl: string } }>(
      `/tier-lists/${tierListId}/books/search`,
      {
        externalId: book.openLibraryKey,
        source: 'google_books',
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrlLarge || book.coverUrl,
      }
    );
    if (!result.book) throw new Error("Book was not returned from server");
    bookSearchLogger.info('Книга добавлена из поиска', { tierListId, bookId: result.book.id });
    return result.book;
  } catch (err) {
    if (err instanceof Error) {
      bookSearchLogger.error(err, { action: 'addBookFromGoogleBooks', tierListId, title: book.title });
    }
    throw err;
  }
}

export async function batchAddBooksFromSearch(
  tierListId: string,
  books: OpenLibraryBook[]
): Promise<Array<{ id: number; title: string; author: string | null; coverImageUrl: string }>> {
  bookSearchLogger.info('Пакетное добавление книг в тир-лист', { tierListId, count: books.length });
  const result = await apiClient.post<{ results: Array<{ book: { id: number; title: string; author: string | null; coverImageUrl: string } }> }>(
    `/tier-lists/${tierListId}/books`,
    {
      books: books.map((b) => ({
        externalId: b.externalId ?? b.openLibraryKey,
        source: b.source,
        title: b.title,
        author: b.author,
        coverImageUrl: b.coverUrlLarge || b.coverUrl || '',
      })),
    }
  );
  const addedBooks = result.results?.map((r) => r.book) ?? [];
  bookSearchLogger.info('Книги успешно добавлены', { tierListId, count: addedBooks.length });
  return addedBooks;
}

export async function searchOpenLibraryBooks(query: string): Promise<OpenLibraryBook[]> {
  if (!query || query.length < 2) return [];

  try {
    bookSearchLogger.info('Поиск книг в Open Library', { query });
    const result = await apiClient.get<{ books: OpenLibraryBook[] }>('/books/search', { q: query });
    bookSearchLogger.info('Поиск в Open Library завершён', { count: result.books.length });
    return result.books;
  } catch (err) {
    if (err instanceof Error) {
      bookSearchLogger.error(err, { action: 'searchOpenLibraryBooks', query });
    }
    throw err;
  }
}

export interface LiveLibBook {
  openLibraryKey: string;
  title: string;
  author: string;
  coverUrl: string | null;
  coverUrlLarge: string | null;
  source?: 'livelib';
  externalId?: string;
}

export async function importFromLiveLib(
  username: string,
  forceRefresh?: boolean,
): Promise<LiveLibBook[]> {
  bookSearchLogger.info("Импорт книг из LiveLib", { username, forceRefresh });
  try {
    const result = await apiClient.post<{ books: LiveLibBook[]; username: string }>(
      "/books/livelib-import",
      { username, forceRefresh },
    );
    bookSearchLogger.info("Импорт из LiveLib завершён", {
      username,
      count: result.books.length,
    });
    return result.books;
  } catch (err) {
    if (err instanceof Error) {
      bookSearchLogger.error(err, { action: "importFromLiveLib", username });
    }
    throw err;
  }
}

export async function addBookFromOpenLibrary(
  tierListId: string,
  book: OpenLibraryBook
): Promise<{ id: number; title: string; author: string | null; coverImageUrl: string }> {
  try {
    bookSearchLogger.info('Добавление книги из Open Library', { tierListId, title: book.title });
    const result = await apiClient.post<{ book: { id: number; title: string; author: string | null; coverImageUrl: string } }>(
      `/tier-lists/${tierListId}/books/search`,
      {
        externalId: book.openLibraryKey,
        source: 'open_library',
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrlLarge || book.coverUrl,
      }
    );
    bookSearchLogger.info('Книга добавлена из Open Library', { tierListId, bookId: result.book.id });
    return result.book;
  } catch (err) {
    if (err instanceof Error) {
      bookSearchLogger.error(err, { action: 'addBookFromOpenLibrary', tierListId, title: book.title });
    }
    throw err;
  }
}

/**
 * Поиск книг по каталогу BookStrata (site-search).
 * Возвращает книги в формате OpenLibraryBook с source='bookstrata'.
 */
export async function searchSiteBooks(query: string, limit = 10): Promise<OpenLibraryBook[]> {
  if (!query || query.length < 2) return [];

  try {
    bookSearchLogger.info('Поиск книг на сайте', { query, limit });
    const result = await apiClient.get<{ books: OpenLibraryBook[] }>('/books/site-search', { q: query, limit });
    bookSearchLogger.info('Поиск на сайте завершён', { count: result.books.length });
    return result.books;
  } catch (err) {
    if (err instanceof Error) {
      bookSearchLogger.error(err, { action: 'searchSiteBooks', query });
    }
    throw err;
  }
}

/**
 * Линковка существующих каталоговых книг к тир-листу по bookId.
 * Используется для книг с source='bookstrata' — книга уже в каталоге,
 * создаём только BookPlacement.
 */
export async function linkSiteBooksToTierList(
  tierListId: string,
  bookIds: number[]
): Promise<Array<{ id: number; title: string; author: string | null; coverImageUrl: string }>> {
  if (bookIds.length === 0) return [];

  try {
    bookSearchLogger.info('Линковка site-книг к тир-листу', { tierListId, bookIds });
    const result = await apiClient.post<{ results: Array<{ book: { id: number; title: string; author: string | null; coverImageUrl: string } }> }>(
      `/tier-lists/${tierListId}/link-books`,
      { bookIds }
    );
    const linkedBooks = result.results?.map((r) => r.book) ?? [];
    bookSearchLogger.info('Site-книги привязаны', { tierListId, count: linkedBooks.length });
    return linkedBooks;
  } catch (err) {
    if (err instanceof Error) {
      bookSearchLogger.error(err, { action: 'linkSiteBooksToTierList', tierListId, bookIds });
    }
    throw err;
  }
}
