/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TierListData } from '@/types';
import type { ApiTierListResponse, ApiBookPlacement } from '@/types/api';
import { getAuthHeader, handleResponse } from './authApi';
import { logger } from './logger';

const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api`; // URL вашего бэкенда

// ========== 0. API CLIENT (единый клиент для всех запросов) ==========

interface ApiClient {
  get: <T>(url: string) => Promise<T>;
  post: <T>(url: string, data: unknown) => Promise<T>;
  put: <T>(url: string, data: unknown) => Promise<T>;
  delete: <T>(url: string) => Promise<T>;
}

const apiClient: ApiClient = {
  get: <T>(url: string) =>
    fetch(`${API_BASE_URL}${url}`, { headers: getAuthHeader() }).then(handleResponse<T>),

  post: <T>(url: string, data: unknown) =>
    fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    }).then(handleResponse<T>),

  put: <T>(url: string, data: unknown) =>
    fetch(`${API_BASE_URL}${url}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    }).then(handleResponse<T>),

  delete: <T>(url: string) =>
    fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    }).then(handleResponse<T>),
};

// ========== 1. ФУНКЦИИ ДЛЯ ЗАПРОСОВ ==========

export async function createTierList(title: string): Promise<ApiTierListResponse> {
  try {
    logger.info('Создание нового рейтингового списка', { title });
    const response = await fetch(`${API_BASE_URL}/tier-lists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ title }),
    });
    const result = await handleResponse<ApiTierListResponse>(response);
    logger.info('Успешно создан рейтинговый список', { id: result.id, title });
    return result;
  } catch (err) {
    if (err instanceof Error) {
      logger.error(err, { action: 'createTierList', title });
    }
    throw err;
  }
}

export interface TierListShort {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  user?: {
    id: number;
    username: string;
    avatarUrl?: string;
  };
  likesCount?: number;
}

export interface PaginationMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface PaginatedTierListsResponse {
  data: TierListShort[];
  meta: PaginationMeta;
}

export async function getUserTierLists(page = 1, pageSize = 10): Promise<PaginatedTierListsResponse> {
  try {
    logger.info(`Получение списка тир-листов пользователя на странице ${page}`);
    const response = await fetch(`${API_BASE_URL}/tier-lists?page=${page}&pageSize=${pageSize}`, {
      headers: getAuthHeader(),
    });
    const result = await handleResponse<PaginatedTierListsResponse>(response);
    logger.info('Списки тир-листов успешно получены', { count: result.data.length, page: result.meta.currentPage });
    return result;
  } catch (err) {
    if (err instanceof Error) {
      logger.error(err, { action: 'getUserTierLists', page });
    }
    throw err;
  }
}

export async function fetchTierList(id: string): Promise<ApiTierListResponse> {
  try {
    logger.info('Получение рейтингового списка', { id });
    const response = await fetch(`${API_BASE_URL}/tier-lists/${id}`, {
      headers: getAuthHeader(),
    });
    const result = await handleResponse<ApiTierListResponse>(response);
    logger.info('Успешно получен рейтинговый список', { id, title: result.title, booksCount: result.unrankedBooks.length });
    return result;
  } catch (err) {
    if (err instanceof Error) {
      logger.error(err, { action: 'fetchTierList', id });
    }
    throw err;
  }
}

export async function saveTierListPlacements(
  id: string,
  placements: { bookId: number; tierId: number | null; rank: number }[]
) {
  try {
    logger.info('Сохранение позиций', { id, count: placements.length });

    const response = await fetch(`${API_BASE_URL}/tier-lists/${id}/placements`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ placements }),
    });
    const result = await handleResponse(response);
    logger.info('Позиции сохранены', { id });
    return result;
  } catch (err) {
    if (err instanceof Error) {
      logger.error(err, { action: 'saveTierListPlacements', id });
    }
    throw err;
  }
}

export async function saveTierListTiers(
  id: string,
  tiers:
    | { added: Array<{ title: string; color: string; rank: number }>; updated: Array<{ id: number; title: string; color: string; rank: number }>; deletedIds: number[] }
    | Array<{ id?: string | number | undefined; title: string; color: string; rank: number }>,
  deletedTierIds?: number[]
) {
  try {
    // Определяем формат
    const isDiff = 'added' in (tiers as any);

    if (isDiff) {
      logger.info('Сохранение тиров (diff)', { 
        id, 
        added: (tiers as any).added?.length, 
        updated: (tiers as any).updated?.length, 
        deleted: deletedTierIds?.length || 0 
      });
    } else {
      logger.info('Сохранение тиров (полный массив)', { id, count: (tiers as Array<any>).length });
    }

    const response = await fetch(`${API_BASE_URL}/tier-lists/${id}/tiers`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(tiers),
    });
    const result = await handleResponse(response);
    logger.info('Тиры сохранены', { id });
    return result;
  } catch (err) {
    if (err instanceof Error) {
      logger.error(err, { action: 'saveTierListTiers', id });
    }
    throw err;
  }
}

export async function saveTierListWithNewBooks(
  id: string,
  placements: { bookId: number; tierId: number | null; rank: number }[],
  newBooks: Array<{ id: string; title: string; author?: string; coverImageUrl: string; description?: string; thoughts?: string }>,
  listData: TierListData
): Promise<Array<{ book: { id: number } }>> {
  logger.info('saveTierListWithNewBooks: начало', { id, newBooksCount: newBooks.length, placementsLength: placements.length });

  // Сначала сохраняем новые книги, если они есть
  let results: Array<{ book: { id: number } }> = [];
  if (newBooks.length > 0) {
    const bookDataToSend = newBooks.map(book => ({
      title: book.title,
      author: book.author || 'Неизвестен',
      coverImageUrl: book.coverImageUrl,
      description: book.description || null,
      thoughts: book.thoughts || null,
    }));

    logger.info('saveTierListWithNewBooks: отправка книг на сервер', { count: bookDataToSend.length });

    try {
      results = await addBooksToTierList(id, bookDataToSend);
      logger.info('saveTierListWithNewBooks: книги добавлены', { resultsLength: results.length, firstResult: JSON.stringify(results[0] ?? null) });
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error(String(err)), { action: 'saveTierListWithNewBooks', message: 'ошибка добавления книг' });
      return [];
    }
  }

  const tempIdsSet = new Set(newBooks.map(b => b.id));

  // Добавляем placements для новых книг с реальными ID
  const placementsToSave = placements.filter((p) => !tempIdsSet.has(String(p.bookId)));
  newBooks.forEach((book, index) => {
    const result = results[index];
    let realBookId: number | undefined;

    if (result?.book?.id) {
      realBookId = result.book.id;
    }

    if (!realBookId) {
       logger.warn('saveTierListWithNewBooks: не удалось получить ID книги', { index });
       return;
    }

    // Ищем позицию книги в listData
    let found = false;
    for (const tierId in listData.tiers) {
      const tier = listData.tiers[tierId];
      const idx = tier.bookIds.indexOf(book.id);
      if (idx !== -1) {
        placementsToSave.push({ bookId: realBookId, tierId: parseInt(tierId), rank: idx });
        found = true;
        break;
      }
    }
    if (!found) {
      const idx = listData.unrankedBookIds.indexOf(book.id);
      if (idx !== -1) {
        placementsToSave.push({ bookId: realBookId, tierId: null, rank: idx });
      } 
    }
  });

  // Затем сохраняем размещения
  if (placementsToSave.length > 0) {
    logger.info('saveTierListWithNewBooks: сохранение placements', { count: placementsToSave.length });
    await saveTierListPlacements(id, placementsToSave);
  } else {
    logger.info('saveTierListWithNewBooks: нет placements для сохранения');
  }

  logger.info('saveTierListWithNewBooks: завершено', { returningResults: results.length });
  return results;
}

/**
 * Оптимизированное сохранение — отправляет только изменения (diff)
 * Используется с useAutoSaveOptimized
 */
export interface SaveTierListPayload {
  placements?: { bookId: number; tierId: number | null; rank: number }[];
  tiers?: Array<{ id?: number; title: string; color: string; rank: number }> | {
    added: Array<{ title: string; color: string; rank: number }>;
    updated: Array<{ id: number; title: string; color: string; rank: number }>;
    deletedIds: number[];
  };
  newBooks?: Array<{
    id: string;
    title: string;
    author?: string;
    coverImageUrl: string;
    description?: string;
    thoughts?: string;
  }>;
}

export async function saveTierListOptimized(
  id: string,
  payload: SaveTierListPayload
): Promise<void> {
  const promises: Promise<any>[] = [];

  // Сохраняем placements, если есть
  if (payload.placements && payload.placements.length > 0) {
    logger.info('Сохранение placements (diff)', { id, count: payload.placements.length });
    promises.push(
      apiClient.put(`/tier-lists/${id}/placements`, { placements: payload.placements })
    );
  }

  // Сохраняем tiers, если есть
  if (payload.tiers) {
    const isDiff = 'added' in payload.tiers;
    if (isDiff) {
      const tiersDiff = payload.tiers as { added: Array<{ title: string; color: string; rank: number }>; updated: Array<{ id: number; title: string; color: string; rank: number }>; deletedIds?: number[] };
      if (tiersDiff.added.length > 0 || tiersDiff.updated.length > 0 || (tiersDiff.deletedIds && tiersDiff.deletedIds.length > 0)) {
        logger.info('Сохранение tiers (diff)', {
          id,
          added: tiersDiff.added.length,
          updated: tiersDiff.updated.length,
          deleted: tiersDiff.deletedIds?.length || 0
        });
        promises.push(
          apiClient.put(`/tier-lists/${id}/tiers`, payload.tiers)
        );
      }
    } else {
      const tiersArray = payload.tiers as Array<{ id?: number; title: string; color: string; rank: number }>;
      if (tiersArray.length > 0) {
        logger.info('Сохранение tiers (full)', { id, count: tiersArray.length });
        promises.push(
          apiClient.put(`/tier-lists/${id}/tiers`, tiersArray)
        );
      }
    }
  }

  // Сохраняем новые книги, если есть
  if (payload.newBooks && payload.newBooks.length > 0) {
    logger.info('Сохранение новых книг', { id, count: payload.newBooks.length });
    promises.push(
      addBooksToTierList(id, payload.newBooks.map(book => ({
        title: book.title,
        author: book.author || 'Неизвестен',
        coverImageUrl: book.coverImageUrl,
        description: book.description || null,
        thoughts: book.thoughts || null,
      })))
    );
  }

  // Ждём завершения всех операций
  if (promises.length > 0) {
    try {
      await Promise.all(promises);
      logger.info('Оптимизированное сохранение завершено', { id, operations: promises.length });
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), { 
        action: 'saveTierListOptimized', 
        id 
      });
      throw error;
    }
  } else {
    logger.info('Нет данных для сохранения', { id });
  }
}

export async function addBooksToTierList(
  id: string,
  books: { title: string; author?: string; coverImageUrl: string; description?: string | null; thoughts?: string | null }[]
): Promise<any[]> {
  try {
    logger.info('Добавление книг в рейтинговый список', { id, booksCount: books.length });
    const response = await fetch(`${API_BASE_URL}/tier-lists/${id}/books`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ books }),
    });
    const result = await handleResponse<any[]>(response);
    logger.info('Книги успешно добавлены в рейтинговый список', { id, booksCount: books.length, addedCount: result.length });
    return result;
  } catch (err) {
    if (err instanceof Error) {
      logger.error(err, { action: 'addBooksToTierList', id, booksCount: books.length });
    }
    throw err;
  }
}

export async function removeBookFromTierList(id: string, bookId: string) {
  try {
    logger.info('Удаление книги из рейтингового списка', { id, bookId });
    const response = await fetch(`${API_BASE_URL}/tier-lists/${id}/books/${bookId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    const result = await handleResponse(response);
    logger.info('Книга успешно удалена из рейтингового списка', { id, bookId });
    return result;
  } catch (err) {
    if (err instanceof Error) {
      logger.error(err, { action: 'removeBookFromTierList', id, bookId });
    }
    throw err;
  }
}

export async function updateTierListTitle(id: string, title: string) {
  try {
    logger.info('Обновление названия рейтингового списка', { id, newTitle: title });
    const response = await fetch(`${API_BASE_URL}/tier-lists/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ title }),
    });
    const result = await handleResponse(response);
    logger.info('Название рейтингового списка успешно обновлено', { id, newTitle: title });
    return result;
  } catch (err) {
    if (err instanceof Error) {
      logger.error(err, { action: 'updateTierListTitle', id, title });
    }
    throw err;
  }
}

export async function toggleTierListPublic(id: string, isPublic: boolean) {
  try {
    logger.info('Переключение статуса публичности', { id, isPublic });
    const response = await fetch(`${API_BASE_URL}/tier-lists/${id}/public`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ isPublic }),
    });
    const result = await handleResponse(response);
    logger.info('Статус публичности успешно изменён', { id, isPublic });
    return result;
  } catch (err) {
    if (err instanceof Error) {
      logger.error(err, { action: 'toggleTierListPublic', id, isPublic });
    }
    throw err;
  }
}

export async function getPublicTierLists(page = 1, pageSize = 10, sortBy: 'updated_at' | 'likes' | 'created' = 'updated_at'): Promise<PaginatedTierListsResponse> {
  try {
    logger.info('Получение публичных тир-листов', { page });
    const response = await fetch(`${API_BASE_URL}/tier-lists/public?page=${page}&pageSize=${pageSize}&sortBy=${sortBy}`);
    const result = await handleResponse<PaginatedTierListsResponse>(response);
    logger.info('Публичные тир-листы успешно получены', { count: result.data.length });
    return result;
  } catch (err) {
    if (err instanceof Error) {
      logger.error(err, { action: 'getPublicTierLists', page });
    }
    throw err;
  }
}

// ========== 2. ФУНКЦИИ-ТРАНСФОРМЕРЫ ==========

export function transformApiToState(apiData: ApiTierListResponse): TierListData {
  const books: TierListData['books'] = {};
  const tiers: TierListData['tiers'] = {};

  const processPlacement = (placement: ApiBookPlacement) => {
    const bookId = String(placement.book.id);
    if (!books[bookId]) {
      books[bookId] = {
        id: bookId,
        title: placement.book.title,
        author: placement.book.author || 'Неизвестен',
        coverImageUrl: placement.book.coverImageUrl,
        description: placement.book.description || undefined,
        thoughts: placement.book.thoughts || undefined,
      };
    }
    return bookId;
  };

  const tierOrder = (apiData.tiers ?? []).map(apiTier => {
    const tierId = String(apiTier.id);
    tiers[tierId] = {
      id: tierId,
      title: apiTier.title,
      color: apiTier.color,
      bookIds: (apiTier.items ?? []).map(processPlacement),
    };
    return tierId;
  });

  const unrankedBookIds = (apiData.unrankedBooks ?? []).map(processPlacement);

  return {
    id: String(apiData.id),
    title: apiData.title,
    books,
    tiers,
    tierOrder,
    unrankedBookIds,
    tierIdToTempIdMap: {},
  };
}

export function transformStateToApi(listData: TierListData) {
  const placements: { bookId: number; tierId: number | null; rank: number }[] = [];

  listData.tierOrder.forEach(tierId => {
    listData.tiers[tierId].bookIds.forEach((bookId, index) => {
      // Пропускаем новые книги (ID которые начинаются с "book-")
      if (bookId.startsWith('book-')) return;
      
      placements.push({
        bookId: parseInt(bookId),
        tierId: parseInt(tierId),
        rank: index,
      });
    });
  });

  listData.unrankedBookIds.forEach((bookId, index) => {
    // Пропускаем новые книги (ID которые начинаются с "book-")
    if (bookId.startsWith('book-')) return;
    
    placements.push({
      bookId: parseInt(bookId),
      tierId: null,
      rank: index,
    });
  });

  return placements;
}

export async function deleteTierList(id: string) {
  try {
    logger.info('Удаление рейтингового списка', { id });
    const response = await fetch(`${API_BASE_URL}/tier-lists/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    const result = await handleResponse(response);
    logger.info('Рейтинговый список успешно удален', { id });
    return result;
  } catch (err) {
    if (err instanceof Error) {
      logger.error(err, { action: 'deleteTierList', id });
    }
    throw err;
  }
}

// ========== 3. API OBJECT ==========

/**
 * Объект API для использования в хуках и компонентах
 */
export const api = {
  get: async <T>(url: string): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: getAuthHeader(),
    });
    return handleResponse<T>(response);
  },

  post: async <T>(url: string, data?: unknown): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return handleResponse<T>(response);
  },

  put: async <T>(url: string, data?: unknown): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return handleResponse<T>(response);
  },

  delete: async <T = any>(url: string): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return handleResponse<T>(response);
  },
};

// ========== 4. BOOKS SEARCH API (Google Books через бэкенд) ==========

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

// Поиск книг через бэкенд (Google Books API)
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

// Добавить книгу из поиска в тир-лист
export async function addBookFromGoogleBooks(
  tierListId: string,
  book: OpenLibraryBook
): Promise<any> {
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

// ========== 5. ПОИСК КНИГ ЧЕРЕЗ OPEN LIBRARY ==========

// Поиск книг в Open Library (использует тот же интерфейс OpenLibraryBook)
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

// Добавить книгу из Open Library в тир-лист
export async function addBookFromOpenLibrary(
  tierListId: string,
  book: OpenLibraryBook
): Promise<any> {
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
