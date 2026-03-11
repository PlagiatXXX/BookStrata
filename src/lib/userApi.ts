import { getAuthHeader, handleResponse } from './authApi';
import { API_BASE_URL } from './config';
import { createLogger } from './logger';

// Логгер для модуля пользователей
const userLogger = createLogger('UserApi', { color: 'green' });

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
  userLogger.info('Получение профиля текущего пользователя');

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
  userLogger.info('Обновление аватара пользователя');

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
  userLogger.info('Удаление аватара пользователя');

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
  userLogger.info('Получение пользователя по ID', { userId: id });

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
  userLogger.info('Получение статистики пользователя');

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
  userLogger.info('Загрузка аватара на Cloudinary');

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
