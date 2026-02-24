import type { AuthResponse, ValidateTokenResponse } from '@/types/auth';
import { API_BASE_URL } from './config';
import { logger } from './logger';
import { StorageService } from './storage';

/**
 * Базовый URL API
 * 
 * ⚠️ SECURITY NOTE:
 * VITE_API_URL встраивается в клиентский бандл на этапе сборки и виден пользователям.
 * Это допустимо для публичных API, но не подходит для секретных ключей.
 * 
 * Риски:
 * - URL бэкенда виден в DevTools
 * - Может быть изменён при модификации бандла
 * 
 * Митигация:
 * - Валидация токена на сервере
 * - CORS ограничения
 * - Rate limiting
 * - HTTPS в продакшене
 */
interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

interface LoginPayload {
  username: string;
  password: string;
}

// ========== AUTHENTICATION ==========

/**
 * Регистрация нового пользователя
 */
export async function apiRegister(payload: RegisterPayload): Promise<AuthResponse> {
  logger.info('Starting user registration', { username: payload.username, email: payload.email });

  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    logger.error(new Error(error.error || 'Registration failed'), { username: payload.username });
    throw new Error(error.error || 'Registration failed');
  }

  const result = await response.json();
  logger.info('User registration successful', { username: payload.username });
  return result;
}

/**
 * Вход пользователя
 */
export async function apiLogin(payload: LoginPayload): Promise<AuthResponse> {
  logger.info('User login attempt', { username: payload.username });

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    logger.warn('Login failed', { username: payload.username, reason: error.error });
    throw new Error(error.error || 'Login failed');
  }

  const result = await response.json();
  logger.info('User login successful', { username: payload.username });
  return result;
}

/**
 * Валидация токена
 */
export async function apiValidateToken(token: string): Promise<ValidateTokenResponse> {
  logger.info('Validating authentication token');

  const response = await fetch(`${API_BASE_URL}/auth/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  const result = await response.json();

  if (!result.valid) {
    logger.warn('Token validation failed');
  } else {
    logger.info('Token validation successful', { userId: result.userId });
  }

  return result;
}

// ========== TOKEN MANAGEMENT ==========

/**
 * Сохранить токен в localStorage
 */
export function setAuthToken(token: string) {
  StorageService.setString('authToken', token);
}

/**
 * Получить токен из localStorage
 */
export function getAuthToken(): string | null {
  return StorageService.getString('authToken');
}

/**
 * Удалить токен из localStorage
 */
export function removeAuthToken() {
  StorageService.remove('authToken');
}

/**
 * Получить Authorization header
 */
export function getAuthHeader(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Обработка 401 ошибки
 */
export function handleUnauthorized() {
  logger.warn('Unauthorized access - clearing session and redirecting to login');
  removeAuthToken();
  window.dispatchEvent(new CustomEvent('unauthorized'));
  window.location.href = '/auth';
}

/**
 * Обработка ответа API
 */
export async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    logger.warn('API returned 401 Unauthorized');
    handleUnauthorized();
    throw new Error('Требуется авторизация. Пожалуйста, войдите в систему.');
  }

  if (response.status === 204) {
    return null as T;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || `Ошибка: ${response.statusText}`;
    logger.error(new Error(errorMessage), {
      status: response.status,
      statusText: response.statusText,
      url: response.url
    });
    throw new Error(errorMessage);
  }

  return response.json();
}

// ========== EXPORTS FOR COMPATIBILITY ==========
// Экспортируем типы для обратной совместимости
export type { User } from './userApi';
export type { LikesResponse } from './likesApi';
