/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TierListData } from '@/types';
import type { ApiTierListResponse, ApiBookPlacement } from '@/types/api';
import { apiClient, buildUrl } from './api-client';
import { getAuthHeader, handleResponse } from './authApi';
import { API_BASE_URL } from './config';
import { logger } from './logger';

// ========== TYPES ==========

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

// ========== TIER LIST CRUD ==========

export async function createTierList(title: string): Promise<ApiTierListResponse> {
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
}

export async function getUserTierLists(page = 1, pageSize = 10): Promise<PaginatedTierListsResponse> {
  logger.info(`Получение списка тир-листов пользователя на странице ${page}`);
  const url = buildUrl('/tier-lists', { page, pageSize });
  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: getAuthHeader(),
  });
  const result = await handleResponse<PaginatedTierListsResponse>(response);
  logger.info('Списки тир-листов успешно получены', { count: result.data.length, page: result.meta.currentPage });
  return result;
}

export async function fetchTierList(id: string): Promise<ApiTierListResponse> {
  logger.info('Получение рейтингового списка', { id });
  const response = await fetch(`${API_BASE_URL}/tier-lists/${id}`, {
    headers: getAuthHeader(),
  });
  const result = await handleResponse<ApiTierListResponse>(response);
  logger.info('Успешно получен рейтинговый список', { id, title: result.title, booksCount: result.unrankedBooks.length });
  return result;
}

export async function deleteTierList(id: string) {
  logger.info('Удаление рейтингового списка', { id });
  const response = await fetch(`${API_BASE_URL}/tier-lists/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  const result = await handleResponse(response);
  logger.info('Рейтинговый список успешно удален', { id });
  return result;
}

export async function getPublicTierLists(
  page = 1,
  pageSize = 10,
  sortBy: 'updated_at' | 'likes' | 'created' = 'updated_at'
): Promise<PaginatedTierListsResponse> {
  logger.info('Получение публичных тир-листов', { page });
  const url = buildUrl('/tier-lists/public', { page, pageSize, sortBy });
  const response = await fetch(`${API_BASE_URL}${url}`);
  const result = await handleResponse<PaginatedTierListsResponse>(response);
  logger.info('Публичные тир-листы успешно получены', { count: result.data.length });
  return result;
}

// ========== TIER LIST OPERATIONS ==========

export async function saveTierListPlacements(
  id: string,
  placements: { bookId: number; tierId: number | null; rank: number }[]
) {
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
}

export async function saveTierListTiers(
  id: string,
  tiers:
    | { added: Array<{ title: string; color: string; rank: number }>; updated: Array<{ id: number; title: string; color: string; rank: number }>; deletedIds: number[] }
    | Array<{ id?: string | number | undefined; title: string; color: string; rank: number }>,
  deletedTierIds?: number[]
) {
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
}

export async function addBooksToTierList(
  id: string,
  books: { title: string; author?: string; coverImageUrl: string; description?: string | null; thoughts?: string | null }[]
): Promise<any[]> {
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
}

export async function removeBookFromTierList(id: string, bookId: string) {
  logger.info('Удаление книги из рейтингового списка', { id, bookId });
  const response = await fetch(`${API_BASE_URL}/tier-lists/${id}/books/${bookId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  const result = await handleResponse(response);
  logger.info('Книга успешно удалена из рейтингового списка', { id, bookId });
  return result;
}

export async function updateTierListTitle(id: string, title: string) {
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
}

export async function toggleTierListPublic(id: string, isPublic: boolean) {
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
}

// ========== BOOK COVER UPLOAD ==========

/**
 * Загрузить обложку книги на сервер (конвертирует в base64 и отправляет)
 */
export async function uploadBookCover(
  tierListId: string,
  bookId: string,
  file: File
): Promise<{ coverImageUrl: string }> {
  logger.info('Загрузка обложки книги', { tierListId, bookId, fileName: file.name });

  // Конвертируем файл в base64
  const base64 = await fileToBase64(file);

  const response = await fetch(`${API_BASE_URL}/tier-lists/${tierListId}/books/${bookId}/cover`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ coverImageUrl: base64 }),
  });

  const result = await handleResponse<{ coverImageUrl: string }>(response);
  logger.info('Обложка успешно загружена', { tierListId, bookId });
  return result;
}

/**
 * Вспомогательная функция для конвертации File в base64 Data URL
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

// ========== OPTIMIZED SAVE ==========

export async function saveTierListWithNewBooks(
  id: string,
  placements: { bookId: number; tierId: number | null; rank: number }[],
  newBooks: Array<{ id: string; title: string; author?: string; coverImageUrl: string; description?: string; thoughts?: string }>,
  listData: TierListData
): Promise<Array<{ book: { id: number } }>> {
  logger.info('saveTierListWithNewBooks: начало', { id, newBooksCount: newBooks.length, placementsLength: placements.length });

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

  if (placementsToSave.length > 0) {
    logger.info('saveTierListWithNewBooks: сохранение placements', { count: placementsToSave.length });
    await saveTierListPlacements(id, placementsToSave);
  } else {
    logger.info('saveTierListWithNewBooks: нет placements для сохранения');
  }

  logger.info('saveTierListWithNewBooks: завершено', { returningResults: results.length });
  return results;
}

export async function saveTierListOptimized(
  id: string,
  payload: SaveTierListPayload,
  listData?: TierListData
): Promise<{ bookReplacements?: { tempId: string; realId: string }[] }> {
  const promises: Promise<any>[] = [];
  const bookReplacements: { tempId: string; realId: string }[] = [];

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

  // Сначала сохраняем новые книги (если есть)
  let results: Array<{ book: { id: number } }> = [];
  if (payload.newBooks && payload.newBooks.length > 0) {
    logger.info('Сохранение новых книг', { id, count: payload.newBooks.length });

    results = await addBooksToTierList(id, payload.newBooks.map(book => ({
      title: book.title,
      author: book.author || 'Неизвестен',
      coverImageUrl: book.coverImageUrl,
      description: book.description || null,
      thoughts: book.thoughts || null,
    })));

    // Создаём mapping tempId -> realId
    payload.newBooks.forEach((book, index) => {
      if (results[index]?.book?.id) {
        bookReplacements.push({
          tempId: book.id,
          realId: String(results[index].book.id),
        });
      }
    });
  }

  // Формируем placements для отправки
  // Если есть новые книги, нужно добавить их placements с реальными ID
  const placementsToSend = payload.placements || [];

  if (payload.newBooks && payload.newBooks.length > 0 && listData) {
    // Добавляем placements для новых книг
    payload.newBooks.forEach((book, index) => {
      const result = results[index];
      const realBookId = result?.book?.id;

      if (!realBookId) {
        logger.warn('saveTierListOptimized: не удалось получить ID книги', { index });
        return;
      }

      // Ищем книгу в тирах
      let found = false;
      for (const tierId in listData.tiers) {
        const tier = listData.tiers[tierId];
        const idx = tier.bookIds.indexOf(book.id);
        if (idx !== -1) {
          placementsToSend.push({
            bookId: realBookId,
            tierId: parseInt(tierId, 10),
            rank: idx,
          });
          found = true;
          break;
        }
      }

      // Если не нашли в тирах, проверяем unranked
      if (!found) {
        const idx = listData.unrankedBookIds.indexOf(book.id);
        if (idx !== -1) {
          placementsToSend.push({
            bookId: realBookId,
            tierId: null,
            rank: idx,
          });
        }
      }
    });
  }

  // Сохраняем placements (если есть что сохранять)
  if (placementsToSend.length > 0) {
    logger.info('Сохранение placements', { id, count: placementsToSend.length });
    promises.push(
      apiClient.put(`/tier-lists/${id}/placements`, { placements: placementsToSend })
    );
  }

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

  return { bookReplacements: bookReplacements.length > 0 ? bookReplacements : undefined };
}

// ========== TRANSFORM FUNCTIONS ==========

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
      if (bookId.startsWith('book-')) return;

      placements.push({
        bookId: parseInt(bookId),
        tierId: parseInt(tierId),
        rank: index,
      });
    });
  });

  listData.unrankedBookIds.forEach((bookId, index) => {
    if (bookId.startsWith('book-')) return;

    placements.push({
      bookId: parseInt(bookId),
      tierId: null,
      rank: index,
    });
  });

  return placements;
}
