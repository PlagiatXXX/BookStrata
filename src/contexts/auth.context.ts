import { createContext } from "react";
import type { User } from "@/types/auth";

// Расширенный тип пользователя для контекста
export interface AuthUser extends User {
  avatarUrl?: string | null;
}

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  refreshUser: () => Promise<void>;
  /** Мгновенно установить пользователя из данных ответа API (регистрация/вход)
   *  без лишнего запроса /users/me — обходит гонку с ProtectedRoute. */
  loginWithData: (data: { userId: number; username: string; role?: string }) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
