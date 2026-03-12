/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TierListData } from '@/types';
import type { ApiTierListResponse, ApiBookPlacement } from '@/types/api';
import { apiClient, buildUrl } from './api-client';
import { getAuthHeader, handleResponse } from './authApi';
import { API_BASE_URL } from './config';
import { createLogger } from './logger';

// Логгер для модуля тир-листов
const tierListLogger = createLogger('TierListApi', { color: 'magenta' });

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
  tierListLogger.info('Создание нового рейтингового списка', { title });
  const response = await fetch(`${API_BASE_URL}/tier-lists`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ title }),
  });
  const result = await handleResponse<ApiTierListResponse>(response);
  tierListLogger.info('Успешно создан рейтинговый список', { tierListId: result.id, title });
  return result;
}

export async function getUserTierLists(page = 1, pageSize = 10): Promise<PaginatedTierListsResponse> {
  tierListLogger.info(`Получение списка тир-листов пользователя на странице ${page}`);
  const url = buildUrl('/tier-lists', { page, pageSize });
  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: getAuthHeader(),
  });
  const result = await handleResponse<PaginatedTierListsResponse>(response);
  tierListLogger.info('Списки тир-листов успешно получены', { count: result.data.length, page: result.meta.currentPage });
  return result;
}

export async function fetchTierList(id: string): Promise<ApiTierListResponse> {
  tierListLogger.info('Получение рейтингового списка', { tierListId: id });
  const response = await fetch(`${API_BASE_URL}/tier-lists/${id}`, {
    headers: getAuthHeader(),
  });
  const result = await handleResponse<ApiTierListResponse>(response);

  // Считаем общее количество книг (в тирах + unranked)
  const totalBooksCount =
    (result.tiers?.reduce((sum, tier) => sum + (tier.items?.length || 0), 0) || 0) +
    (result.unrankedBooks?.length || 0);

  tierListLogger.info('Успешно получен рейтинговый список', {
    tierListId: id,
    title: result.title,
    totalBooksCount,
    unrankedCount: result.unrankedBooks?.length || 0,
    tiersCount: result.tiers?.length || 0
  });
  return result;
}

export async function deleteTierList(id: string) {
  tierListLogger.info('Удаление рейтингового списка', { tierListId: id });
  const response = await fetch(`${API_BASE_URL}/tier-lists/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  const result = await handleResponse(response);
  tierListLogger.info('Рейтинговый список успешно удален', { tierListId: id });
  return result;
}

export async function getPublicTierLists(
  page = 1,
  pageSize = 10,
  sortBy: 'updated_at' | 'likes' | 'created' = 'updated_at'
): Promise<PaginatedTierListsResponse> {
  tierListLogger.info('Получение публичных тир-листов', { page });
  const url = buildUrl('/tier-lists/public', { page, pageSize, sortBy });
  const response = await fetch(`${API_BASE_URL}${url}`);
  const result = await handleResponse<PaginatedTierListsResponse>(response);
  tierListLogger.info('Публичные тир-листы успешно получены', { count: result.data.length });
  return result;
}

// ========== TIER LIST OPERATIONS ==========

export async function saveTierListPlacements(
  id: string,
  placements: { bookId: number; tierId: number | null; rank: number }[]
) {
  tierListLogger.info('Сохранение позиций', { tierListId: id, count: placements.length });
  const response = await fetch(`${API_BASE_URL}/tier-lists/${id}/placements`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ placements }),
  });
  const result = await handleResponse(response);
  tierListLogger.info('Позиции сохранены', { tierListId: id, count: placements.length });
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
    tierListLogger.info('Сохранение тиров (diff)', {
      tierListId: id,
      added: (tiers as any).added?.length,
      updated: (tiers as any).updated?.length,
      deleted: deletedTierIds?.length || 0
    });
  } else {
    tierListLogger.info('Сохранение тиров (полный массив)', { tierListId: id, count: (tiers as Array<any>).length });
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
  tierListLogger.info('Тиры сохранены', { tierListId: id });
  return result;
}

export async function addBooksToTierList(
  id: string,
  books: { title: string; author?: string; coverImageUrl: string; description?: string | null; thoughts?: string | null }[]
): Promise<any[]> {
  tierListLogger.info('Добавление книг в рейтинговый список', { tierListId: id, booksCount: books.length });
  const response = await fetch(`${API_BASE_URL}/tier-lists/${id}/books`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ books }),
  });
  const result = await handleResponse<any[]>(response);
  tierListLogger.info('Книги успешно добавлены в рейтинговый список', { tierListId: id, booksCount: books.length, addedCount: result.length });
  return result;
}

export async function removeBookFromTierList(id: string, bookId: string) {
  tierListLogger.info('Удаление книги из рейтингового списка', { tierListId: id, bookId });
  const response = await fetch(`${API_BASE_URL}/tier-lists/${id}/books/${bookId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  const result = await handleResponse(response);
  tierListLogger.info('Книга успешно удалена из рейтингового списка', { tierListId: id, bookId });
  return result;
}

export async function updateTierListTitle(id: string, title: string) {
  tierListLogger.info('Обновление названия рейтингового списка', { tierListId: id, newTitle: title });
  const response = await fetch(`${API_BASE_URL}/tier-lists/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ title }),
  });
  const result = await handleResponse(response);
  tierListLogger.info('Название рейтингового списка успешно обновлено', { tierListId: id, newTitle: title });
  return result;
}

export async function toggleTierListPublic(id: string, isPublic: boolean) {
  tierListLogger.info('Переключение статуса публичности', { tierListId: id, isPublic });
  const response = await fetch(`${API_BASE_URL}/tier-lists/${id}/public`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ isPublic }),
  });
  const result = await handleResponse(response);
  tierListLogger.info('Статус публичности успешно изменён', { tierListId: id, isPublic });
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
  tierListLogger.info('Загрузка обложки книги', { tierListId, bookId, fileName: file.name });

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
  tierListLogger.info('Обложка успешно загружена', { tierListId, bookId });
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

export async function saveTierListOptimized(
  id: string,
  payload: SaveTierListPayload,
  listData?: TierListData
): Promise<{ bookReplacements?: { tempId: string; realId: string }[] }> {
  const bookReplacements: { tempId: string; realId: string }[] = [];

  // 1. Сначала сохраняем tiers (если есть)
  if (payload.tiers) {
    const isDiff = 'added' in payload.tiers;
    if (isDiff) {
      const tiersDiff = payload.tiers as { added: Array<{ title: string; color: string; rank: number }>; updated: Array<{ id: number; title: string; color: string; rank: number }>; deletedIds?: number[] };
      if (tiersDiff.added.length > 0 || tiersDiff.updated.length > 0 || (tiersDiff.deletedIds && tiersDiff.deletedIds.length > 0)) {
        tierListLogger.info('Сохранение tiers (diff)', {
          tierListId: id,
          added: tiersDiff.added.length,
          updated: tiersDiff.updated.length,
          deleted: tiersDiff.deletedIds?.length || 0,
          payload: JSON.stringify(tiersDiff)
        });
        await apiClient.put(`/tier-lists/${id}/tiers`, tiersDiff);
      }
    } else {
      const tiersArray = payload.tiers as Array<{ id?: number; title: string; color: string; rank: number }>;
      if (tiersArray.length > 0) {
        tierListLogger.info('Сохранение tiers (full)', { tierListId: id, count: tiersArray.length });
        await apiClient.put(`/tier-lists/${id}/tiers`, tiersArray);
      }
    }
  }

  // 2. Затем сохраняем новые книги (если есть)
  let results: Array<{ book: { id: number } }> = [];
  if (payload.newBooks && payload.newBooks.length > 0) {
    tierListLogger.info('Сохранение новых книг', { tierListId: id, count: payload.newBooks.length });

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

  // 3. Формируем placements для отправки
  const placementsToSend = payload.placements || [];

  if (payload.newBooks && payload.newBooks.length > 0 && listData) {
    // Добавляем placements для новых книг
    payload.newBooks.forEach((book, index) => {
      const result = results[index];
      const realBookId = result?.book?.id;

      if (!realBookId) {
        tierListLogger.warn('saveTierListOptimized: не удалось получить ID книги', { tierListId: id, index });
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

  // 4. Сохраняем placements (если есть что сохранять)
  if (placementsToSend.length > 0) {
    tierListLogger.info('Сохранение placements', { tierListId: id, count: placementsToSend.length });
    await apiClient.put(`/tier-lists/${id}/placements`, { placements: placementsToSend });
  }

  tierListLogger.info('Оптимизированное сохранение завершено', { tierListId: id });
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
