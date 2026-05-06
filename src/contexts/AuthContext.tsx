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

  const mapApiUserToAuthUser = (fullUserData: any): User => ({
    userId: fullUserData.id,
    username: fullUserData.username,
    avatarUrl: fullUserData.avatarUrl,
    role: fullUserData.role || "user",
    isPro: fullUserData.isPro,
    proExpiresAt: fullUserData.proExpiresAt,
  });

  const fetchUser = useCallback(async (force = false) => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      authLogger.info("Fetching user profile", { force });
      const fullUserData = await apiGetMe(force);
      setUser(mapApiUserToAuthUser(fullUserData));
      authLogger.info("User data fetched successfully", {
        userId: fullUserData.id,
        username: fullUserData.username,
      });
    } catch (err) {
      authLogger.warn("Failed to fetch user profile", {
        error: err instanceof Error ? err.message : String(err),
      });
      setUser(null);
      removeAuthToken();
    }
    setIsLoading(false);
  }, []);

  const refreshUser = useCallback(async () => {
    authLogger.info("Refresh user called");
    setIsLoading(true);
    await fetchUser(true); // Force fresh request
  }, [fetchUser]);

  React.useEffect(() => {
    refreshUserDataRef.current = refreshUser;
  }, [refreshUser]);

  const handleAuthTokenChanged = useCallback(() => {
    fetchUser(true);
  }, [fetchUser]);

  const handleAvatarUpdated = useCallback((event: Event) => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail) {
      authLogger.info("Avatar updated event received with data, updating state immediately");
      setUser(mapApiUserToAuthUser(customEvent.detail));
    } else {
      refreshUser();
    }
  }, [refreshUser]);

  React.useEffect(() => {
    let isMounted = true;

    const performCheck = async () => {
      if (isMounted) {
        await fetchUser();
      }
    };

    performCheck();

    window.addEventListener("auth-token-changed", handleAuthTokenChanged);
    window.addEventListener("storage", handleAuthTokenChanged);
    window.addEventListener("avatar-updated", handleAvatarUpdated as EventListener);

    return () => {
      isMounted = false;
      window.removeEventListener("auth-token-changed", handleAuthTokenChanged);
      window.removeEventListener("storage", handleAuthTokenChanged);
      window.removeEventListener("avatar-updated", handleAvatarUpdated as EventListener);
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
