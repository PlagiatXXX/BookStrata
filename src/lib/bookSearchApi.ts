import { apiClient } from './api-client';
import { createLogger } from './logger';

const bookSearchLogger = createLogger('BookSearch', { color: 'yellow' });

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
        openLibraryKey: book.openLibraryKey,
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
}

export async function importFromLiveLib(
  username: string,
): Promise<LiveLibBook[]> {
  bookSearchLogger.info("Импорт книг из LiveLib", { username });
  try {
    const result = await apiClient.post<{ books: LiveLibBook[]; username: string }>(
      "/books/livelib-import",
      { username },
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
        openLibraryKey: book.openLibraryKey,
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
