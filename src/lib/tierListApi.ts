import type { TierListData, Tier } from '@/types';
import type { ApiTierListResponse, ApiBookPlacement } from '@/types/api';
import { apiClient } from './api-client';
import { createLogger } from './logger';

const tierListLogger = createLogger('TierListApi', { color: 'magenta' });

export type TierListTheme =
  // Цветовые темы
  | 'default'
  | 'sunset'
  | 'forest'
  | 'ocean'
  | 'cyberpunk'
  | 'burgundy'
  // Стили (кардинально меняют оформление)
  | 'dark-academia'
  | 'pixel'
  | 'vintage'
  | 'y2k'
  | 'clay'
  | 'soft'

// Устаревшие темы, удалённые из списка (маппинг на default при чтении из БД)
export const LEGACY_THEMES: string[] = ['midnight', 'candlelight', 'frost', 'lunar', 'sapphire', 'moss']

/** Приводит произвольное значение темы из БД к актуальному списку. */
export function normalizeTheme(theme: string | null | undefined): TierListTheme {
  if (theme && (THEME_LABELS as Record<string, string | undefined>)[theme]) {
    return theme as TierListTheme
  }
  return 'default'
}

// Все темы бесплатны
export const PRO_THEMES: TierListTheme[] = []
export const FREE_THEMES: TierListTheme[] = [
  'default', 'sunset', 'forest', 'ocean', 'cyberpunk', 'burgundy',
  'dark-academia', 'pixel', 'vintage', 'y2k', 'clay', 'soft',
]

export const THEME_LABELS: Record<TierListTheme, string> = {
  default: 'Классическая',
  sunset: 'Закат',
  forest: 'Лес',
  ocean: 'Океан',
  cyberpunk: 'Киберпанк',
  burgundy: 'Бордо',
  'dark-academia': 'Тёмная академия',
  pixel: 'Пиксель',
  vintage: 'Винтаж',
  y2k: 'Y2K',
  clay: 'Пластилин',
  soft: 'Мягкий',
}

/**
 * Theme preview colors (used by ThemePicker swatches).
 * Maps to GTC CSS variables:
 *   bg   → --theme-bg
 *   tier → --theme-accent-primary
 *   text → --theme-on-background
 */
export const THEME_COLORS: Record<TierListTheme, { bg: string; tier: string; text: string }> = {
  default: { bg: '#0e0e0e', tier: '#c1fffe', text: '#ffffff' },
  sunset: { bg: '#1c0f0a', tier: '#fb923c', text: '#ffedd5' },
  forest: { bg: '#0a1f0f', tier: '#4ade80', text: '#dcfce7' },
  ocean: { bg: '#0a1628', tier: '#38bdf8', text: '#e0f2fe' },
  cyberpunk: { bg: '#0a0a1a', tier: '#ff51fa', text: '#f0f0ff' },
  burgundy: { bg: '#1a0a0a', tier: '#d4af37', text: '#fef3c7' },
  'dark-academia': { bg: '#1c1713', tier: '#c9a227', text: '#ece6da' },
  pixel: { bg: '#0d0d34', tier: '#00ff9c', text: '#d9f7e9' },
  vintage: { bg: '#f4ecd8', tier: '#a0522d', text: '#3e2723' },
  y2k: { bg: '#c1e0f5', tier: '#ff5fa2', text: '#0a3d62' },
  clay: { bg: '#cdeee1', tier: '#7c4df7', text: '#3b3226' },
  soft: { bg: '#fdf6ee', tier: '#58cc02', text: '#3c3c3c' },
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
  placements?: { bookId: string | number; tierId: string | number | null; rank: number }[];
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

const ALL_TIER_LISTS_PAGE_SIZE = 50;

/** Все свои тир-листы (для выбора «добавить в существующий») — ходит по страницам */
export async function fetchAllMyTierLists(): Promise<TierListShort[]> {
  const first = await getUserTierLists(1, ALL_TIER_LISTS_PAGE_SIZE);
  let lists = first.data;
  for (let page = 2; page <= first.meta.totalPages; page += 1) {
    const next = await getUserTierLists(page, ALL_TIER_LISTS_PAGE_SIZE);
    lists = lists.concat(next.data);
  }
  return lists;
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
  placements: { bookId: string | number; tierId: string | number | null; rank: number }[]
) {
  tierListLogger.info('Сохранение позиций', { tierListId: id, count: placements.length });
  const result = await apiClient.put(`/tier-lists/${id}/placements`, { placements });
  tierListLogger.info('Позиции сохранены', { tierListId: id, count: placements.length });
  return result;
}

export async function saveTierListTiers(
  id: string,
  tiers: NonNullable<SaveTierListPayload['tiers']>,
) {
  const isDiff = 'added' in tiers;

  if (isDiff) {
    tierListLogger.info('Сохранение тиров (diff)', {
      tierListId: id,
      added: tiers.added?.length,
      updated: tiers.updated?.length,
    });
  } else {
    tierListLogger.info('Сохранение тиров (полный массив)', { tierListId: id, count: tiers.length });
  }

  const result = await apiClient.put(`/tier-lists/${id}/tiers`, tiers);
  tierListLogger.info('Тиры сохранены', { tierListId: id });
  return result;
}

export async function addBooksToTierList(
  id: string,
  books: {
    title: string;
    author?: string;
    coverImageUrl: string;
    description?: string | null;
    thoughts?: string | null;
    /** Внешний ID книги (Фаза 2.1): google volumeId / OpenLibrary key / LiveLib id */
    externalId?: string | null;
    source?: 'google_books' | 'open_library' | 'livelib' | null;
  }[]
): Promise<ApiTierListResponse> {
  tierListLogger.info('Добавление книг в рейтинговый список', { tierListId: id, booksCount: books.length });
  const result = await apiClient.post<ApiTierListResponse>(`/tier-lists/${id}/books`, { books });
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
  payload: SaveTierListPayload
): Promise<{
  bookReplacements?: { tempId: string; realId: string }[];
  tierReplacements?: { tempId: string; realId: string }[];
}> {
  tierListLogger.info("Атомарное сохранение тир-листа", { tierListId: id });
  return apiClient.put<{
    bookReplacements?: { tempId: string; realId: string }[];
    tierReplacements?: { tempId: string; realId: string }[];
  }>(`/tier-lists/${id}/save-all`, payload);
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
        coverImageUrl: placement.coverImageUrl || placement.book.coverImageUrl,
        description: placement.book.description || undefined,
        thoughts: placement.thoughts || undefined,
        slug: placement.book.slug ?? undefined,
        status: placement.book.status ?? undefined,
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
