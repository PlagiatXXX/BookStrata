// backend/src/modules/books/books.service.ts
import { createLogger } from "../../lib/logger.js";
import { getFromCache, setToCache } from "../../lib/cache.js";

// Логгер для сервиса книг
const logger = createLogger("Books", { color: "green" });

const SEARCH_CACHE_TTL = 60 * 60 * 24;
const SEARCH_CACHE_TTL_EMPTY = 60 * 5;

import { config } from "../../config/env.js";

const GOOGLE_BOOKS_API_KEY = config.GOOGLE_BOOKS_API_KEY;
const GOOGLE_BOOKS_API_URL = "https://www.googleapis.com/books/v1/volumes";
const OPEN_LIBRARY_API_URL = "https://openlibrary.org/search.json";

/** Таймаут на один fetch-запрос к Google Books API (10 секунд) */
const FETCH_TIMEOUT_MS = 10_000;

async function fetchWithRetry(
  url: string,
  maxAttempts = 3,
): Promise<Response> {
  let lastResponse: Response | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    // Успех — возвращаем сразу
    if (response.ok) {
      return response;
    }
    // Google Books возвращает 403 при превышении дневной квоты (quota exceeded)
    // и 429 при rate limiting — оба временные, ретраим
    const isRetryable =
      response.status === 429 ||
      response.status === 403 ||
      response.status >= 500;

    if (!isRetryable) {
      return response;
    }
    lastResponse = response;
    // Если ещё есть попытки — ждём с экспоненциальным бэкоффом: 300 → 900 → 2700 ms
    if (attempt < maxAttempts) {
      const delay = 300 * Math.pow(3, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return lastResponse!;
}

export interface BookSearchResult {
  openLibraryKey: string;
  /** Источник внешнего идентификатора (Фаза 2.1): google_books | open_library | livelib */
  source?: "google_books" | "open_library" | "livelib";
  /** ID книги в источнике (volumeId / OpenLibrary key / LiveLib id) */
  externalId?: string;
  title: string;
  author: string;
  coverUrl: string | null;
  coverUrlLarge: string | null;
  publishYear?: number;
  numberOfPages?: number;
  subjects?: string[];
}

/**
 * Поиск книг: сначала Google Books API, при квоте/рейт-лимите — fallback на OpenLibrary
 */
export async function searchBooks(
  query: string,
  startIndex = 0,
): Promise<BookSearchResult[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery || normalizedQuery.length < 2) {
    return [];
  }

  // ——— Попытка 1: Google Books API ———
  const googleCacheKey = `gbooks:search:${normalizedQuery.toLowerCase()}:${startIndex}`;
  const googleCached = await getFromCache<BookSearchResult[]>(googleCacheKey);
  if (googleCached) {
    logger.info(`Google Books CACHE HIT for "${normalizedQuery}" (offset ${startIndex}): ${googleCached.length} books`);
    return googleCached;
  }

  if (GOOGLE_BOOKS_API_KEY) {
    try {
      const url = new URL(GOOGLE_BOOKS_API_URL);
      url.searchParams.append("q", `intitle:${normalizedQuery}`);
      url.searchParams.append("key", GOOGLE_BOOKS_API_KEY);
      url.searchParams.append("maxResults", "20");
      url.searchParams.append("startIndex", startIndex.toString());

      const response = await fetchWithRetry(url.toString(), 3);
      if (!response.ok) {
        let errorBody = "";
        try {
          errorBody = await response.text();
        } catch {
          // ignore
        }

        const isQuotaError = response.status === 429 || response.status === 403;

        logger.warn(
          `Google Books API недоступен после ретраев: ${response.status} ${response.statusText}`,
          errorBody ? { responseBody: errorBody.slice(0, 500) } : undefined,
        );

        if (isQuotaError || response.status >= 500) {
          // Проблемы на стороне Google (квота, рейт-лимит, серверная ошибка) — fallback на OpenLibrary
          logger.info(`Google Books недоступен (${response.status}), falling back to OpenLibrary for "${normalizedQuery}"`);
          return searchOpenLibrary(normalizedQuery, startIndex);
        }

        // Клиентская ошибка (400, 404 и т.п.) — возвращаем пустой массив
        logger.warn(`Google Books вернул ${response.status}, возвращаем пустой результат`);
        return [];
      }

      const data = (await response.json()) as {
        items?: GoogleBookResponse[];
        totalItems?: number;
      };

      const books: BookSearchResult[] = (data.items || [])
        .filter((book): book is GoogleBookResponse => !!book?.volumeInfo)
        .map((book) => {
          const result: BookSearchResult = {
            openLibraryKey: book.id,
            source: "google_books",
            externalId: book.id,
            title: book.volumeInfo.title,
            author: book.volumeInfo.authors?.[0] || "Неизвестен",
            coverUrl:
              book.volumeInfo.imageLinks?.thumbnail?.replace("http:", "https:") ||
              null,
            coverUrlLarge:
              book.volumeInfo.imageLinks?.large?.replace("http:", "https:") ||
              book.volumeInfo.imageLinks?.medium?.replace("http:", "https:") ||
              book.volumeInfo.imageLinks?.thumbnail?.replace("http:", "https:") ||
              null,
          };

          if (book.volumeInfo.publishedDate) {
            result.publishYear = parseInt(
              book.volumeInfo.publishedDate.substring(0, 4),
            );
          }
          if (book.volumeInfo.pageCount) {
            result.numberOfPages = book.volumeInfo.pageCount;
          }
          if (book.volumeInfo.categories) {
            result.subjects = book.volumeInfo.categories;
          }

          return result;
        })
        // Фильтруем только книги с обложками
        .filter((book) => book.coverUrl || book.coverUrlLarge);

      // Дедупликация по openLibraryKey (Google Books может возвращать дубликаты)
      const uniqueBooks = Array.from(
        new Map(books.map((book) => [book.openLibraryKey, book])).values(),
      );

      logger.info(
        `Google Books — fetched ${uniqueBooks.length} unique books (from ${books.length} total)`,
      );

      const ttl = uniqueBooks.length > 0 ? SEARCH_CACHE_TTL : SEARCH_CACHE_TTL_EMPTY;
      await setToCache(googleCacheKey, uniqueBooks, ttl);

      return uniqueBooks;
    } catch (error) {
      // Сетевая ошибка или другая неожиданность — fallback на OpenLibrary
      logger.warn("Google Books search failed, trying OpenLibrary", error instanceof Error ? { function: "searchBooks", message: error.message } : undefined);
      return searchOpenLibrary(normalizedQuery, startIndex);
    }
  }

  // ——— Попытка 2: OpenLibrary (если нет Google API key или Google упал) ———
  return searchOpenLibrary(normalizedQuery, startIndex);
}

/**
 * Поиск книг через OpenLibrary API.
 * Используется как fallback при недоступности Google Books API.
 */
async function searchOpenLibrary(
  query: string,
  _startIndex = 0,
): Promise<BookSearchResult[]> {
  const cacheKey = `openlib:search:${query.toLowerCase()}`;
  const cached = await getFromCache<BookSearchResult[]>(cacheKey);
  if (cached) {
    logger.info(`OpenLibrary CACHE HIT for "${query}": ${cached.length} books`);
    return cached;
  }

  try {
    const url = new URL(OPEN_LIBRARY_API_URL);
    url.searchParams.append("q", query);
    url.searchParams.append("limit", "20");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url.toString(), { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      logger.warn(
        `OpenLibrary API error: ${response.status} ${response.statusText}`,
      );
      return [];
    }

    const data = (await response.json()) as {
      docs?: Array<{
        key: string;
        title?: string;
        author_name?: string[];
        first_publish_year?: number;
        number_of_pages_median?: number;
        cover_i?: number;
        subject?: string[];
        isbn?: string[];
      }>;
    };

    const books: BookSearchResult[] = (data.docs || [])
      .filter((doc) => doc.title)
      .map((doc) => {
        const coverId = doc.cover_i;
        const result: BookSearchResult = {
          openLibraryKey: doc.key.replace("/works/", ""),
          source: "open_library",
          externalId: doc.key.replace("/works/", ""),
          title: doc.title || "Без названия",
          author: doc.author_name?.[0] || "Неизвестен",
          coverUrl: coverId
            ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
            : null,
          coverUrlLarge: coverId
            ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
            : null,
        };

        if (doc.first_publish_year) {
          result.publishYear = doc.first_publish_year;
        }
        if (doc.number_of_pages_median) {
          result.numberOfPages = doc.number_of_pages_median;
        }
        if (doc.subject?.length) {
          result.subjects = doc.subject.slice(0, 10);
        }

        return result;
      })
      .filter((book) => book.coverUrl || book.coverUrlLarge);

    // OpenLibrary не возвращает дубликаты с одинаковым key, но на всякий случай
    const uniqueBooks = Array.from(
      new Map(books.map((book) => [book.openLibraryKey, book])).values(),
    );

    logger.info(
      `OpenLibrary — fetched ${uniqueBooks.length} books for "${query}"`,
    );

    const ttl = uniqueBooks.length > 0 ? SEARCH_CACHE_TTL : SEARCH_CACHE_TTL_EMPTY;
    await setToCache(cacheKey, uniqueBooks, ttl);

    return uniqueBooks;
  } catch (error) {
    logger.error(error as Error, { function: "searchOpenLibrary" });
    return [];
  }
}

export interface GoogleBookResponse {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      large?: string;
      medium?: string;
      small?: string;
    };
  };
}
