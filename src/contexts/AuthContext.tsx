import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import type { User } from "@/types/auth";
import { AuthContext, type AuthContextType } from "./auth.context";
import { getAuthToken, removeAuthToken, apiValidateToken } from "@/lib/authApi";
import { apiGetMe } from "@/lib/userApi";
import { logger } from "@/lib/logger";

export { AuthContext, type AuthContextType };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshUserDataRef = useRef<(() => void) | null>(null);

  // Функция для проверки токена и получения полных данных пользователя
  const checkToken = useCallback(async () => {
    const token = getAuthToken();
    if (token) {
      try {
        logger.info("Validating stored auth token");
        const response = await apiValidateToken(token);
        if (response.valid && response.userId && response.username) {
          // Получаем полные данные пользователя с сервера
          try {
            const fullUserData = await apiGetMe();
            setUser({
              userId: fullUserData.id,
              username: fullUserData.username,
              avatarUrl: fullUserData.avatarUrl,
            });
            logger.info("User data fetched successfully", {
              userId: fullUserData.id,
              username: fullUserData.username,
              hasAvatar: !!fullUserData.avatarUrl,
            });
          } catch {
            // Если не удалось получить данные, используем минимальные из токена
            setUser({ userId: response.userId, username: response.username });
          }
        } else {
          logger.warn("Auth token validation failed - token is invalid");
          removeAuthToken();
          setUser(null);
        }
      } catch (err) {
        if (err instanceof Error) {
          logger.error(err, { action: "token validation" });
        }
        removeAuthToken();
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  // Функция для принудительного обновления данных пользователя
  const refreshUser = useCallback(async () => {
    await checkToken();
  }, [checkToken]);

  // Сохраняем ссылку на refreshUser для доступа извне
  useEffect(() => {
    refreshUserDataRef.current = refreshUser;
  }, [refreshUser]);

  // Проверяем токен при загрузке и слушаем события авторизации
  useEffect(() => {
    let isMounted = true;

    const performCheck = async () => {
      if (isMounted) {
        await checkToken();
      }
    };

    const handleAuthTokenChanged = () => {
      checkToken();
    };

    // Выполняем первоначальную проверку
    performCheck();

    // Подписываемся на события
    window.addEventListener("auth-token-changed", handleAuthTokenChanged);
    window.addEventListener("storage", handleAuthTokenChanged);

    // Cleanup
    return () => {
      isMounted = false;
      window.removeEventListener("auth-token-changed", handleAuthTokenChanged);
      window.removeEventListener("storage", handleAuthTokenChanged);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function logout() {
    logger.info("User logout");
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
