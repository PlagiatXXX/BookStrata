import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuthContext";
import { sendFeedback, dismissFeedbackPrompt } from "@/lib/feedbackApi";

export const STORAGE_KEY = "bookstrata_feedback_prompt";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const OLD_USER_TRIGGER_SECONDS = 150; // 2.5 минуты
const NEW_USER_TRIGGER_SECONDS = 300; // 5 минут
const NEW_USER_MIN_PAGES = 5;

const EXCLUDED_PREFIXES = ["/auth", "/forgot-password", "/reset-password", "/editor"];

interface StorageValue {
  status: "dismissed" | "submitted";
  timestamp: number;
}

export function useFeedbackPrompt() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const pagesVisitedRef = useRef<Set<string>>(new Set([pathname]));
  const secondsActiveRef = useRef<number>(0);
  const isHandledRef = useRef<boolean>(false);

  // Проверяет, заблокирован ли показ глобально
  const isGloballyDisabled = useCallback((): boolean => {
    if (isHandledRef.current) return true;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        isHandledRef.current = true;
        return true;
      }
    } catch {
      // Игнорируем ошибки доступа к localStorage
    }

    if (user?.feedbackDismissedAt) {
      isHandledRef.current = true;
      return true;
    }

    return false;
  }, [user?.feedbackDismissedAt]);

  // Проверяет, можно ли открыть окно на текущем роуте
  const isCurrentRouteAllowed = useCallback((): boolean => {
    return !EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  }, [pathname]);

  // Фиксация посещенных страниц
  useEffect(() => {
    pagesVisitedRef.current.add(pathname);
  }, [pathname]);

  // Таймер активности
  useEffect(() => {
    if (isGloballyDisabled()) return;

    const interval = setInterval(() => {
      // Если вкладка не скрыта
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      secondsActiveRef.current += 1;

      if (isGloballyDisabled() || !isCurrentRouteAllowed()) {
        return;
      }

      // Не прерываем пользователя, если он что-то активно пишет
      if (typeof document !== "undefined") {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") {
          return;
        }
      }

      // Проверяем статус пользователя
      const isOldUser = Boolean(
        user?.createdAt &&
          Date.now() - new Date(user.createdAt).getTime() >= THREE_DAYS_MS
      );

      if (isOldUser) {
        if (secondsActiveRef.current >= OLD_USER_TRIGGER_SECONDS) {
          setIsOpen(true);
        }
      } else {
        if (
          secondsActiveRef.current >= NEW_USER_TRIGGER_SECONDS &&
          pagesVisitedRef.current.size >= NEW_USER_MIN_PAGES
        ) {
          setIsOpen(true);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isGloballyDisabled, isCurrentRouteAllowed, user?.createdAt]);

  const handleDismiss = useCallback(() => {
    setIsOpen(false);
    isHandledRef.current = true;

    try {
      const payload: StorageValue = { status: "dismissed", timestamp: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // localStorage fallback
    }

    if (user?.userId) {
      dismissFeedbackPrompt().catch(() => {});
    }
  }, [user?.userId]);

  const handleSubmit = useCallback(
    async (input: { rating: "great" | "neutral" | "bad"; message?: string }) => {
      try {
        await sendFeedback({
          type: "survey",
          rating: input.rating,
          message: input.message,
          pageUrl: pathname,
        });

        isHandledRef.current = true;
        const payload: StorageValue = { status: "submitted", timestamp: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (err) {
        console.warn("[useFeedbackPrompt] Failed to send survey feedback:", err);
        throw err;
      }
    },
    [pathname]
  );

  return {
    isOpen,
    handleDismiss,
    handleSubmit,
    // Вспомогательный триггер для unit-тестов
    openForTesting: () => setIsOpen(true),
  };
}
