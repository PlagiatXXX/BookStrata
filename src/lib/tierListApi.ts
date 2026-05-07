import { handleAchievementResponse } from "./achievementApi";
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TierListData } from '@/types';
import type { ApiTierListResponse, ApiBookPlacement } from '@/types/api';
import { apiClient, buildUrl } from './api-client';
import { getAuthHeader } from './authApi';
import { API_BASE_URL } from './config';
import { createLogger } from './logger';

// Логгер для модуля тир-листов
const tierListLogger = createLogger('TierListApi', { color: 'magenta' });

// ========== TYPES ==========

export interface TierListShort {
  id: string;
  slug?: string | null;
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
  booksCount?: number;
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
  slug?: string | null;
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
  const result = await handleAchievementResponse<ApiTierListResponse>(response);
  tierListLogger.info('Успешно создан рейтинговый список', { tierListId: result.id, title });
  return result;
}

export async function getUserTierLists(page = 1, pageSize = 10): Promise<PaginatedTierListsResponse> {
  tierListLogger.info(`Получение списка тир-листов пользователя на странице ${page}`);
  const url = buildUrl('/tier-lists', { page, pageSize });
  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: getAuthHeader(),
  });
  const result = await handleAchievementResponse<PaginatedTierListsResponse>(response);
  tierListLogger.info('Списки тир-листов успешно получены', { count: result.data.length, page: result.meta.currentPage });
  return result;
}

export async function fetchTierList(id: string): Promise<ApiTierListResponse> {
  tierListLogger.info('Получение рейтингового списка', { tierListId: id });
  const response = await fetch(`${API_BASE_URL}/tier-lists/${id}`, {
    headers: getAuthHeader(),
  });
  const result = await handleAchievementResponse<ApiTierListResponse>(response);

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
  const result = await handleAchievementResponse(response);
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
  const result = await handleAchievementResponse<PaginatedTierListsResponse>(response);
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
  const result = await handleAchievementResponse(response);
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
  const result = await handleAchievementResponse(response);
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
  const result = await handleAchievementResponse<any[]>(response);
  tierListLogger.info('Книги успешно добавлены в рейтинговый список', { tierListId: id, booksCount: books.length, addedCount: result.length });
  return result;
}

export async function removeBookFromTierList(id: string, bookId: string) {
  tierListLogger.info('Удаление книги из рейтингового списка', { tierListId: id, bookId });
  const response = await fetch(`${API_BASE_URL}/tier-lists/${id}/books/${bookId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  const result = await handleAchievementResponse(response);
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
  const result = await handleAchievementResponse(response);
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
  const result = await handleAchievementResponse(response);
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

  const result = await handleAchievementResponse<{ coverImageUrl: string }>(response);
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

// ========== ATOMIC SAVE ==========

export async function saveTierListAtomic(
  id: string,
  payload: any
): Promise<{
  bookReplacements?: { tempId: string; realId: string }[];
  tierReplacements?: { tempId: string; realId: string }[];
}> {
  tierListLogger.info("Атомарное сохранение тир-листа", { tierListId: id });
  const result = await apiClient.put<any>(`/tier-lists/${id}/save-all`, payload);
  return result;
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
    deletedTierIds: [],
  };
}

export function transformStateToApi(listData: TierListData) {
  const placements: { bookId: number; tierId: number | null; rank: number }[] = [];

  const toNumericId = (id: string): number | null => {
    if (!/^\d+$/.test(id)) return null;

    const parsed = Number.parseInt(id, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  listData.tierOrder.forEach(tierId => {
    const numericTierId = toNumericId(tierId);
    if (numericTierId === null) return;

    listData.tiers[tierId].bookIds.forEach((bookId, index) => {
      const numericBookId = toNumericId(bookId);
      if (numericBookId === null) return;

      placements.push({
        bookId: numericBookId,
        tierId: numericTierId,
        rank: index,
      });
    });
  });

  listData.unrankedBookIds.forEach((bookId, index) => {
    const numericBookId = toNumericId(bookId);
    if (numericBookId === null) return;

    placements.push({
      bookId: numericBookId,
      tierId: null,
      rank: index,
    });
  });

  return placements;
}

// ========== FORK TIER LIST ==========

/**
 * Создать копию (форк) существующего тир-листа
 */
export async function forkTierList(id: string): Promise<ApiTierListResponse> {
  tierListLogger.info('Создание копии тир-листа', { tierListId: id });
  const response = await fetch(`${API_BASE_URL}/tier-lists/${id}/fork`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  const result = await handleAchievementResponse<ApiTierListResponse>(response);
  tierListLogger.info('Копия тир-листа успешно создана', { originalId: id, newId: result.id });
  return result;
}
