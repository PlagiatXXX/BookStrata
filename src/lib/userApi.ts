import { getAuthHeader, handleResponse } from './authApi';
import { API_BASE_URL } from './config';
import { logger } from './logger';

// ========== TYPES ==========

export interface User {
  id: number;
  email: string;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface UserStats {
  tierListsCount: number;
  templatesCount: number;
  likesCount: number;
  likesTodayCount: number;
}

// ========== USER PROFILE ==========

/**
 * Получить текущего пользователя
 */
export async function apiGetMe(): Promise<User> {
  logger.info('Fetching current user profile');

  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
  });

  return handleResponse<User>(response);
}

/**
 * Обновить аватар
 */
export async function apiUpdateAvatar(avatarUrl: string): Promise<User> {
  logger.info('Updating user avatar');

  const response = await fetch(`${API_BASE_URL}/users/me/avatar`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ avatarUrl }),
  });

  return handleResponse<User>(response);
}

/**
 * Удалить аватар
 */
export async function apiDeleteAvatar(): Promise<User> {
  logger.info('Deleting user avatar');

  const response = await fetch(`${API_BASE_URL}/users/me/avatar`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
  });

  return handleResponse<User>(response);
}

/**
 * Получить пользователя по ID
 */
export async function apiGetUserById(id: string): Promise<User> {
  logger.info('Fetching user by id', { userId: id });

  const response = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return handleResponse<User>(response);
}

/**
 * Получить статистику пользователя
 */
export async function apiGetUserStats(): Promise<UserStats> {
  logger.info('Fetching user stats');

  const response = await fetch(`${API_BASE_URL}/users/me/stats`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
  });

  return handleResponse<UserStats>(response);
}

/**
 * Загрузить аватар на Cloudinary
 */
export async function apiUploadAvatar(base64Image: string): Promise<{ success: boolean; avatarUrl: string; user: User }> {
  logger.info('Uploading avatar to Cloudinary');

  const response = await fetch(`${API_BASE_URL}/avatars/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ avatar: base64Image }),
  });

  return handleResponse(response);
}
