import { useState, useCallback, useEffect, useRef } from 'react';
import { searchGoogleBooks, type OpenLibraryBook } from '@/lib/bookSearchApi';
import { logger } from '@/lib/logger';
import { StorageService } from '@/lib/storage';

// Ключ для localStorage
const SEARCH_CACHE_KEY = 'book_search_cache';
const CACHE_DURATION = 1000 * 60 * 60; // 1 час

interface CachedResult {
  query: string;
  results: OpenLibraryBook[];
  timestamp: number;
}

function getCache(): Record<string, CachedResult> {
  return StorageService.getJson<Record<string, CachedResult>>(SEARCH_CACHE_KEY) ?? {};
}

function setCache(query: string, results: OpenLibraryBook[]) {
  try {
    const cache = getCache();
    cache[query.toLowerCase()] = {
      query,
      results,
      timestamp: Date.now(),
    };
    StorageService.setJson(SEARCH_CACHE_KEY, cache);
  } catch {
    // localStorage может быть недоступен
  }
}

function getCachedResult(query: string): OpenLibraryBook[] | null {
  const cache = getCache();
  const key = query.toLowerCase();
  const cached = cache[key];
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.results;
  }
  return null;
}

interface UseBookSearchOptions {
  cacheEnabled?: boolean;
}

interface UseBookSearchReturn {
  search: (query: string) => Promise<void>;
  loadMore: () => Promise<void>;
  results: OpenLibraryBook[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  totalResults: number;
  clearResults: () => void;
}

export function useBookSearch(options: UseBookSearchOptions = {}): UseBookSearchReturn {
  const { cacheEnabled = true } = options;
  
  const [results, setResults] = useState<OpenLibraryBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const [currentQuery, setCurrentQuery] = useState('');
  const [startIndex, setStartIndex] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearResults = useCallback(() => {
    setResults([]);
    setCurrentQuery('');
    setStartIndex(0);
    setHasMore(true);
    setTotalResults(0);
  }, []);

  const search = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) return;

    // Отменяем предыдущий запрос
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    // Проверяем кэш
    if (cacheEnabled) {
      const cached = getCachedResult(query);
      if (cached && cached.length > 0) {
        logger.info('Using cached search results', { query });
        // Фильтруем только книги с обложками
        const filtered = cached.filter(book => book.coverUrl || book.coverUrlLarge);
        setResults(filtered);
        setTotalResults(filtered.length);
        setHasMore(false);
        setCurrentQuery(query);
        setStartIndex(filtered.length);
        return;
      }
    }

    setIsLoading(true);
    setCurrentQuery(query);
    setStartIndex(0);

    try {
      const books = await searchGoogleBooks(query.trim(), 0);
      // Фильтруем только книги с обложками
      const filteredBooks = books.filter(book => book.coverUrl || book.coverUrlLarge);
      setResults(filteredBooks);
      setTotalResults(filteredBooks.length);
      setHasMore(filteredBooks.length >= 20);
      
      // Кэшируем результат
      if (cacheEnabled && filteredBooks.length > 0) {
        setCache(query, filteredBooks);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      logger.error(err instanceof Error ? err : new Error(String(err)), { action: 'bookSearch' });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [cacheEnabled]);

  const loadMore = useCallback(async () => {
    if (!currentQuery || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const nextStartIndex = startIndex + 20;

    try {
      const newBooks = await searchGoogleBooks(currentQuery, nextStartIndex);
      // Фильтруем только книги с обложками
      const filteredBooks = newBooks.filter(book => book.coverUrl || book.coverUrlLarge);
      
      if (filteredBooks.length === 0) {
        setHasMore(false);
      } else {
        setResults(prev => [...prev, ...filteredBooks]);
        setStartIndex(nextStartIndex + filteredBooks.length);
        setHasMore(filteredBooks.length >= 20);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      logger.error(err instanceof Error ? err : new Error(String(err)), { action: 'bookSearchLoadMore' });
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentQuery, isLoadingMore, hasMore, startIndex]);

  // Intersection Observer для автоматической загрузки при скролле
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.5 }
    );

    const sentinel = document.getElementById('book-search-sentinel');
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, isLoadingMore, loadMore]);

  // Cleanup
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    search,
    loadMore,
    results,
    isLoading,
    isLoadingMore,
    hasMore,
    totalResults,
    clearResults,
  };
}
