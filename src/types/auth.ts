// Типы для auth API ответов
export interface AuthResponse {
  accessToken: string;
  userId: number;
  username: string;
  role?: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  userId?: number;
  username?: string;
  role?: string;
}

export interface User {
  userId: number;
  username: string;
  avatarUrl?: string | null;
  role?: string;
  isPro?: boolean;
  proExpiresAt?: string | null;
}

export interface AuthError {
  error: string;
}

// Тип для админки (все пользователи)
export interface AdminUser {
  userId: number;
  email: string;
  username: string;
  isPro: boolean;
  isDonor: boolean;
  proExpiresAt: string | null;
  role: string;
  createdAt: string;
}

// Тип для Pro подписки
export interface ProSubscription {
  isPro: boolean;
  proExpiresAt: string | null;
}
