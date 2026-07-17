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
  title: string;
  author: string;
  coverUrl: string | null;
  coverUrlLarge: string | null;
  publishYear?: number;
  numberOfPages?: number;
  subjects?: string[];
}

/**
 * Поиск книг в Google Books API
 */
export async function searchBooks(
  query: string,
  startIndex = 0,
): Promise<BookSearchResult[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery || normalizedQuery.length < 2) {
    return [];
  }

  if (!GOOGLE_BOOKS_API_KEY) {
    throw new Error("Google Books API key not configured");
  }

  const cacheKey = `gbooks:search:${normalizedQuery.toLowerCase()}:${startIndex}`;
  const cached = await getFromCache<BookSearchResult[]>(cacheKey);
  if (cached) {
    logger.info(`Cache HIT for "${normalizedQuery}" (offset ${startIndex}): ${cached.length} books`);
    return cached;
  }

  try {
    const url = new URL(GOOGLE_BOOKS_API_URL);
    url.searchParams.append("q", `intitle:${normalizedQuery}`);
    url.searchParams.append("key", GOOGLE_BOOKS_API_KEY);
    url.searchParams.append("maxResults", "20");
    url.searchParams.append("startIndex", startIndex.toString());

    
    const response = await fetchWithRetry(url.toString(), 3);
    if (!response.ok) {
      // Пытаемся прочитать тело ошибки от Google для диагностики
      let errorBody = "";
      try {
        errorBody = await response.text();
      } catch {
        // ignore
      }
      // Финальный фейл после ретраев. Логируем как warn, не как error,
      // потому что это проблема стороннего API, а не нашей.
      logger.warn(
        `Google Books API недоступен после ретраев: ${response.status} ${response.statusText}`,
        errorBody ? { responseBody: errorBody.slice(0, 500) } : undefined,
      );
      // Не кешируем фейл и возвращаем пустой массив — фронт сам покажет "ничего не найдено"
      throw new Error(
        `Google Books API error: ${response.status} ${response.statusText}`,
      );
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
      `Cache MISS — fetched ${uniqueBooks.length} unique books from Google Books (from ${books.length} total)`,
    );

    const ttl = uniqueBooks.length > 0 ? SEARCH_CACHE_TTL : SEARCH_CACHE_TTL_EMPTY;
    await setToCache(cacheKey, uniqueBooks, ttl);

    return uniqueBooks;
  } catch (error) {
    logger.error(error as Error, { function: "searchGoogleBooks" });
    throw error;
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
