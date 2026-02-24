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
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
