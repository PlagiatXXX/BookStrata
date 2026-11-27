import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuthContext";
import { sendFeedback, dismissFeedbackPrompt } from "@/lib/feedbackApi";
import { apiTrackEvent } from "@/lib/analyticsApi";

export const STORAGE_KEY = "bookstrata_feedback_prompt";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const OLD_USER_TRIGGER_SECONDS = 60; // 1 минута для пользователей со стажем > 3 дней
const NEW_USER_TRIGGER_SECONDS = 75; // 1 минута 15 секунд для остальных
const NEW_USER_MIN_PAGES = 2; // минимум 2 страницы
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

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
  const hasTrackedShownRef = useRef<boolean>(false);

  // Проверяет, заблокирован ли показ глобально (с учетом 30/60-дневного кулдауна)
  const isGloballyDisabled = useCallback((): boolean => {
    if (isHandledRef.current) return true;

    try {
      const storedRaw = localStorage.getItem(STORAGE_KEY);
      if (storedRaw) {
        const stored = JSON.parse(storedRaw) as StorageValue;
        const cooldown = stored.status === "submitted" ? SIXTY_DAYS_MS : THIRTY_DAYS_MS;
        const elapsed = Date.now() - (stored.timestamp || 0);
        if (elapsed < cooldown) {
          isHandledRef.current = true;
          return true;
        }
      }
    } catch {
      // Игнорируем ошибки парсинга или доступа к localStorage
    }

    if (user?.feedbackDismissedAt) {
      const dismissedTime = new Date(user.feedbackDismissedAt).getTime();
      if (!isNaN(dismissedTime) && Date.now() - dismissedTime < THIRTY_DAYS_MS) {
        isHandledRef.current = true;
        return true;
      }
    }

    return false;
  }, [user]);

  // Проверяет, можно ли открыть окно на текущем роуте
  const isCurrentRouteAllowed = useCallback((): boolean => {
    return !EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  }, [pathname]);

  // Фиксация посещенных страниц
  useEffect(() => {
    pagesVisitedRef.current.add(pathname);
  }, [pathname]);

  const openPrompt = useCallback((isOldUser: boolean) => {
    setIsOpen(true);
    if (!hasTrackedShownRef.current) {
      hasTrackedShownRef.current = true;
      apiTrackEvent("feedback.prompt_shown", {
        secondsActive: secondsActiveRef.current,
        pagesVisited: pagesVisitedRef.current.size,
        isOldUser,
      });
    }
  }, []);

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
          openPrompt(true);
        }
      } else {
        if (
          secondsActiveRef.current >= NEW_USER_TRIGGER_SECONDS &&
          pagesVisitedRef.current.size >= NEW_USER_MIN_PAGES
        ) {
          openPrompt(false);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isGloballyDisabled, isCurrentRouteAllowed, user?.createdAt, openPrompt]);

  const handleDismiss = useCallback(() => {
    setIsOpen(false);
    isHandledRef.current = true;

    apiTrackEvent("feedback.prompt_dismissed", {
      secondsActive: secondsActiveRef.current,
    });

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
    async (input: { rating: number; message?: string }) => {
      try {
        await sendFeedback({
          type: "survey",
          rating: input.rating,
          message: input.message,
          pageUrl: pathname,
        });

        isHandledRef.current = true;
        apiTrackEvent("feedback.prompt_submitted", {
          rating: input.rating,
          hasMessage: Boolean(input.message?.trim()),
          length: input.message?.trim().length || 0,
        });

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
    openPrompt: () => setIsOpen(true),
    // Вспомогательный триггер для unit-тестов
    openForTesting: () => setIsOpen(true),
  };
}
