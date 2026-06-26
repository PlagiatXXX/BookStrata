/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TierListData, Tier } from '@/types';
import type { ApiTierListResponse, ApiBookPlacement } from '@/types/api';
import { apiClient } from './api-client';
import { createLogger } from './logger';

const tierListLogger = createLogger('TierListApi', { color: 'magenta' });

export type TierListTheme = 'default' | 'midnight' | 'sunset' | 'forest' | 'ocean' | 'cyberpunk' | 'candlelight' | 'frost' | 'burgundy' | 'lunar' | 'sapphire' | 'moss'

export const PRO_THEMES: TierListTheme[] = ['midnight', 'sunset', 'forest', 'ocean', 'cyberpunk', 'candlelight', 'frost', 'burgundy', 'lunar', 'sapphire', 'moss']
export const FREE_THEMES: TierListTheme[] = ['default']

export const THEME_LABELS: Record<TierListTheme, string> = {
  default: 'Классическая',
  midnight: 'Полночь',
  sunset: 'Закат',
  forest: 'Лес',
  ocean: 'Океан',
  cyberpunk: 'Киберпанк',
  candlelight: 'Свеча',
  frost: 'Иней',
  burgundy: 'Бордо',
  lunar: 'Луна',
  sapphire: 'Сапфир',
  moss: 'Мох',
}

export const THEME_COLORS: Record<TierListTheme, { bg: string; tier: string; text: string }> = {
  default: { bg: '#0e0e0e', tier: '#c1fffe', text: '#ffffff' },
  midnight: { bg: '#0f172a', tier: '#818cf8', text: '#e2e8f0' },
  sunset: { bg: '#1c0f0a', tier: '#fb923c', text: '#ffedd5' },
  forest: { bg: '#0a1f0f', tier: '#4ade80', text: '#dcfce7' },
  ocean: { bg: '#0a1628', tier: '#38bdf8', text: '#e0f2fe' },
  cyberpunk: { bg: '#0a0a1a', tier: '#ff51fa', text: '#f0f0ff' },
  candlelight: { bg: '#2a1a08', tier: '#FFF4DD', text: '#fef3c7' },
  frost: { bg: '#0f1a24', tier: '#c1dcec', text: '#e0f2fe' },
  burgundy: { bg: '#1a0a0a', tier: '#7B1113', text: '#fef3c7' },
  lunar: { bg: '#121212', tier: '#a3a3a3', text: '#fafafa' },
  sapphire: { bg: '#0c1222', tier: '#082567', text: '#eff6ff' },
  moss: { bg: '#141a0e', tier: '#a3e635', text: '#f7fee7' },
}

export interface TierListShort {
  id: string;
  slug?: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  theme?: string;
  coverImageUrl?: string | null;
  user?: {
    id: number;
    username: string;
    avatarUrl?: string;
  };
  authorName?: string;
  authorAvatar?: string;
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

export async function createTierList(title: string): Promise<ApiTierListResponse> {
  tierListLogger.info('Создание нового рейтингового списка', { title });
  const result = await apiClient.post<ApiTierListResponse>('/tier-lists', { title });
  tierListLogger.info('Успешно создан рейтинговый список', { tierListId: result.id, title });
  return result;
}

export async function getUserTierLists(page = 1, pageSize = 10): Promise<PaginatedTierListsResponse> {
  tierListLogger.info(`Получение списка тир-листов пользователя на странице ${page}`);
  const result = await apiClient.get<PaginatedTierListsResponse>('/tier-lists', { page, pageSize });
  tierListLogger.info('Списки тир-листов успешно получены', { count: result.data.length, page: result.meta.currentPage });
  return result;
}

export async function fetchTierList(id: string): Promise<ApiTierListResponse> {
  tierListLogger.info('Получение рейтингового списка', { tierListId: id });
  const result = await apiClient.get<ApiTierListResponse>(`/tier-lists/${id}`);

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
  const result = await apiClient.delete<{ message: string }>(`/tier-lists/${id}`);
  tierListLogger.info('Рейтинговый список успешно удален', { tierListId: id });
  return result;
}

export async function getLikedTierLists(page = 1, pageSize = 10): Promise<PaginatedTierListsResponse> {
  tierListLogger.info(`Получение лайкнутых тир-листов на странице ${page}`);
  const result = await apiClient.get<PaginatedTierListsResponse>('/tier-lists/liked', { page, pageSize });
  tierListLogger.info('Лайкнутые тир-листы успешно получены', { count: result.data.length });
  return result;
}

export async function getPublicTierLists(
  page = 1,
  pageSize = 10,
  sortBy: 'updated_at' | 'likes' | 'created' = 'updated_at'
): Promise<PaginatedTierListsResponse> {
  tierListLogger.info('Получение публичных тир-листов', { page });
  const result = await apiClient.get<PaginatedTierListsResponse>('/tier-lists/public', { page, pageSize, sortBy });
  tierListLogger.info('Публичные тир-листы успешно получены', { count: result.data.length });
  return result;
}

export async function saveTierListPlacements(
  id: string,
  placements: { bookId: number; tierId: number | null; rank: number }[]
) {
  tierListLogger.info('Сохранение позиций', { tierListId: id, count: placements.length });
  const result = await apiClient.put(`/tier-lists/${id}/placements`, { placements });
  tierListLogger.info('Позиции сохранены', { tierListId: id, count: placements.length });
  return result;
}

export async function saveTierListTiers(
  id: string,
  tiers: any,
) {
  const isDiff = 'added' in (tiers as any);

  if (isDiff) {
    tierListLogger.info('Сохранение тиров (diff)', {
      tierListId: id,
      added: (tiers as any).added?.length,
      updated: (tiers as any).updated?.length,
    });
  } else {
    tierListLogger.info('Сохранение тиров (полный массив)', { tierListId: id, count: (tiers as Array<any>).length });
  }

  const result = await apiClient.put(`/tier-lists/${id}/tiers`, tiers);
  tierListLogger.info('Тиры сохранены', { tierListId: id });
  return result;
}

export async function addBooksToTierList(
  id: string,
  books: { title: string; author?: string; coverImageUrl: string; description?: string | null; thoughts?: string | null }[]
): Promise<any> {
  tierListLogger.info('Добавление книг в рейтинговый список', { tierListId: id, booksCount: books.length });
  const result = await apiClient.post(`/tier-lists/${id}/books`, { books });
  tierListLogger.info('Книги успешно добавлены', { tierListId: id, booksCount: books.length });
  return result;
}

export async function removeBookFromTierList(id: string, bookId: string) {
  tierListLogger.info('Удаление книги из рейтингового списка', { tierListId: id, bookId });
  const result = await apiClient.delete(`/tier-lists/${id}/books/${bookId}`);
  tierListLogger.info('Книга успешно удалена', { tierListId: id, bookId });
  return result;
}

export async function updateTierListTitle(id: string, title: string) {
  tierListLogger.info('Обновление названия рейтингового списка', { tierListId: id, newTitle: title });
  const result = await apiClient.put(`/tier-lists/${id}`, { title });
  tierListLogger.info('Название успешно обновлено', { tierListId: id, newTitle: title });
  return result;
}

export async function toggleTierListPublic(id: string, isPublic: boolean) {
  tierListLogger.info('Переключение статуса публичности', { tierListId: id, isPublic });
  const result = await apiClient.put(`/tier-lists/${id}/public`, { isPublic });
  tierListLogger.info('Статус публичности успешно изменён', { tierListId: id, isPublic });
  return result;
}

export async function uploadTierListCover(
  tierListId: string,
  file: File
): Promise<{ coverImageUrl: string }> {
  tierListLogger.info('Загрузка обложки тир-листа', { tierListId, fileName: file.name });

  const base64 = await fileToBase64(file);
  const result = await apiClient.put<{ coverImageUrl: string }>(
    `/tier-lists/${tierListId}/cover`,
    { coverImageUrl: base64 }
  );
  tierListLogger.info('Обложка тир-листа успешно загружена', { tierListId });
  return result;
}

export async function uploadBookCover(
  tierListId: string,
  bookId: string,
  file: File
): Promise<{ coverImageUrl: string }> {
  tierListLogger.info('Загрузка обложки книги', { tierListId, bookId, fileName: file.name });

  const base64 = await fileToBase64(file);
  const result = await apiClient.put<{ coverImageUrl: string }>(
    `/tier-lists/${tierListId}/books/${bookId}/cover`,
    { coverImageUrl: base64 }
  );
  tierListLogger.info('Обложка успешно загружена', { tierListId, bookId });
  return result;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

export async function saveTierListAtomic(
  id: string,
  payload: any
): Promise<{
  bookReplacements?: { tempId: string; realId: string }[];
  tierReplacements?: { tempId: string; realId: string }[];
}> {
  tierListLogger.info("Атомарное сохранение тир-листа", { tierListId: id });
  return apiClient.put<any>(`/tier-lists/${id}/save-all`, payload);
}

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
      labelSize: (apiTier.labelSize as Tier["labelSize"]) || "sm",
      labelWeight: (apiTier.labelWeight as Tier["labelWeight"]) || "black",
      labelStyle: (apiTier.labelStyle as Tier["labelStyle"]) || "normal",
      labelColor: apiTier.labelColor || undefined,
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

export async function forkTierList(id: string): Promise<ApiTierListResponse> {
  tierListLogger.info('Создание копии тир-листа', { tierListId: id });
  const result = await apiClient.post<ApiTierListResponse>(`/tier-lists/${id}/fork`);
  tierListLogger.info('Копия тир-листа успешно создана', { originalId: id, newId: result.id });
  return result;
}

// --- Taste Match ---

export interface TierListTasteMatchResult {
  matchPercent: number;
  commonBooks: number;
  totalBooks: number;
  matches: Array<{
    book: {
      title: string;
      author: string | null;
      coverImageUrl: string;
    };
    tierInList: string | null;
    tierInListId: number | null;
    tierInListRank: number | null;
    tierInMine: string | null;
    tierInMineId: number | null;
    tierInMineRank: number | null;
  }>;
}

export async function apiGetTierListTasteMatch(
  idOrSlug: string,
): Promise<TierListTasteMatchResult> {
  tierListLogger.info("Получение совпадения вкусов для тир-листа", { idOrSlug });
  return apiClient.get<TierListTasteMatchResult>(`/tier-lists/${idOrSlug}/taste-match`);
}
