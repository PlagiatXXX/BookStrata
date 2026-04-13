import React, { useState, useCallback, useRef, type ReactNode } from "react";
import type { User } from "@/types/auth";
import { AuthContext, type AuthContextType } from "./auth.context";
import { getAuthToken, removeAuthToken } from "@/lib/authApi";
import { apiGetMe } from "@/lib/userApi";
import { createLogger } from "@/lib/logger";

export { AuthContext, type AuthContextType };

// Контекстный логгер для Auth
const authLogger = createLogger("Auth", { color: "blue" });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshUserDataRef = useRef<(() => void) | null>(null);

  // Функция для получения данных пользователя по токену
  // Оптимизация: сразу вызываем getMe вместо validate + getMe (2 запроса → 1)
  const fetchUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      authLogger.info("Fetching user profile");
      const fullUserData = await apiGetMe();
      setUser({
        userId: fullUserData.id,
        username: fullUserData.username,
        avatarUrl: fullUserData.avatarUrl,
        role: fullUserData.role || "user",
        isPro: fullUserData.isPro,
        proExpiresAt: fullUserData.proExpiresAt,
      });
      authLogger.info("User data fetched successfully", {
        userId: fullUserData.id,
        username: fullUserData.username,
        hasAvatar: !!fullUserData.avatarUrl,
        role: fullUserData.role,
        isPro: fullUserData.isPro,
      });
    } catch (err) {
      // Если getMe вернул 401, handleResponse уже вызвал refreshAccessToken
      // Если refresh тоже не удался — значит пользователь не авторизован
      authLogger.warn("Failed to fetch user profile", {
        error: err instanceof Error ? err.message : String(err),
      });
      setUser(null);
      removeAuthToken();
    }
    setIsLoading(false);
  }, []);

  // Функция для принудительного обновления данных пользователя
  const refreshUser = useCallback(async () => {
    authLogger.info("Refresh user called");
    setIsLoading(true);
    await fetchUser();
  }, [fetchUser]);

  // Сохраняем ссылку на refreshUser для доступа извне
  React.useEffect(() => {
    refreshUserDataRef.current = refreshUser;
  }, [refreshUser]);

  // Обработчик изменения токена
  const handleAuthTokenChanged = useCallback(() => {
    fetchUser();
  }, [fetchUser]);

  // Обработчик обновления аватара
  const handleAvatarUpdated = useCallback(() => {
    refreshUser();
  }, [refreshUser]);

  // Проверяем токен при загрузке и слушаем события авторизации
  React.useEffect(() => {
    let isMounted = true;

    const performCheck = async () => {
      if (isMounted) {
        await fetchUser();
      }
    };

    // Выполняем первоначальную проверку
    performCheck();

    // Подписываемся на события
    window.addEventListener("auth-token-changed", handleAuthTokenChanged);
    window.addEventListener("storage", handleAuthTokenChanged);
    window.addEventListener("avatar-updated", handleAvatarUpdated);

    // Cleanup
    return () => {
      isMounted = false;
      window.removeEventListener("auth-token-changed", handleAuthTokenChanged);
      window.removeEventListener("storage", handleAuthTokenChanged);
      window.removeEventListener("avatar-updated", handleAvatarUpdated);
    };
  }, [fetchUser, handleAuthTokenChanged, handleAvatarUpdated]);

  function logout() {
    authLogger.info("User logout");
    setUser(null);
    removeAuthToken();
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
