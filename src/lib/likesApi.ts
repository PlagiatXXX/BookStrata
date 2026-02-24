import { getAuthHeader, handleResponse } from './authApi';
import { API_BASE_URL } from './config';

// ========== TYPES ==========

export interface LikesResponse {
  likesCount: number;
  isLiked: boolean;
}

// ========== TIER LIST LIKES ==========

/**
 * Получить лайки тир-листа
 */
export async function apiGetTierListLikes(tierListId: number): Promise<LikesResponse> {
  const response = await fetch(`${API_BASE_URL}/tier-lists/${tierListId}/likes`, {
    method: 'GET',
    headers: {
      ...getAuthHeader(),
    },
  });

  return handleResponse<LikesResponse>(response);
}

/**
 * Поставить лайк на тир-лист
 */
export async function apiLikeTierList(tierListId: number): Promise<LikesResponse> {
  const response = await fetch(`${API_BASE_URL}/tier-lists/${tierListId}/like`, {
    method: 'POST',
    headers: {
      ...getAuthHeader(),
    },
    body: JSON.stringify({}),
  });

  return handleResponse<LikesResponse>(response);
}

/**
 * Убрать лайк с тир-листа
 */
export async function apiUnlikeTierList(tierListId: number): Promise<LikesResponse> {
  const response = await fetch(`${API_BASE_URL}/tier-lists/${tierListId}/like`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeader(),
    },
  });

  return handleResponse<LikesResponse>(response);
}

/**
 * Получить все лайкнутые тир-листы пользователя
 */
export async function apiGetLikedTierListIds(): Promise<{ likedIds: number[] }> {
  const response = await fetch(`${API_BASE_URL}/tier-lists/liked`, {
    method: 'GET',
    headers: {
      ...getAuthHeader(),
    },
  });

  return handleResponse<{ likedIds: number[] }>(response);
}

// ========== TEMPLATE LIKES ==========

/**
 * Получить лайки шаблона
 */
export async function apiGetTemplateLikes(templateId: string): Promise<LikesResponse> {
  const response = await fetch(`${API_BASE_URL}/templates/${templateId}/likes`, {
    method: 'GET',
    headers: {
      ...getAuthHeader(),
    },
  });

  return handleResponse<LikesResponse>(response);
}

/**
 * Поставить лайк на шаблон
 */
export async function apiLikeTemplate(templateId: string): Promise<LikesResponse> {
  const response = await fetch(`${API_BASE_URL}/templates/${templateId}/like`, {
    method: 'POST',
    headers: {
      ...getAuthHeader(),
    },
    body: JSON.stringify({}),
  });

  return handleResponse<LikesResponse>(response);
}

/**
 * Убрать лайк с шаблона
 */
export async function apiUnlikeTemplate(templateId: string): Promise<LikesResponse> {
  const response = await fetch(`${API_BASE_URL}/templates/${templateId}/like`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeader(),
    },
  });

  return handleResponse<LikesResponse>(response);
}
