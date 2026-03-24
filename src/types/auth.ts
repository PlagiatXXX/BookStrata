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
}

export interface AuthError {
  error: string;
}
