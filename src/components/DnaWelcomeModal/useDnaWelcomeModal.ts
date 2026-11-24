import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getDnaTicketStorageKey,
  LEGACY_DNA_TICKET_KEY,
} from "@/pages/ReadingDnaPage/utils/dnaStorage";

export const DNA_WELCOME_DISMISSED_KEY = "bs_dna_welcome_dismissed_until";
export const DNA_WELCOME_COMPLETED_KEY = "bs_dna_welcome_completed";

export const DNA_WELCOME_COOLDOWN_DAYS = 14;
export const DNA_WELCOME_COOLDOWN_MS = DNA_WELCOME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
export const DEFAULT_DNA_WELCOME_DELAY_MS = 3500;

export const BLOCKED_ROUTE_PREFIXES = [
  "/reading-dna",
  "/admin",
  "/auth",
  "/forgot-password",
  "/reset-password",
  "/oauth",
] as const;

/**
 * Проверяет, является ли User-Agent поисковым роботом или краулером.
 */
export function isBotUserAgent(userAgent?: string): boolean {
  const ua =
    userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  if (!ua) return false;
  return /bot|crawler|spider|crawling|googlebot|yandex|bingbot|baiduspider|slurp|duckduckbot|facebookexternalhit|twitterbot|headless|lighthouse/i.test(
    ua
  );
}

/**
 * Проверяет, завершил ли пользователь прохождение теста Читательского ДНК
 * (флаг завершения или наличие сохранённого билета в localStorage).
 */
export function hasUserCompletedDna(userId?: number | null): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    if (localStorage.getItem(DNA_WELCOME_COMPLETED_KEY) === "true") {
      return true;
    }
    const guestTicket = localStorage.getItem(getDnaTicketStorageKey(null));
    if (guestTicket && guestTicket.trim() !== "") {
      return true;
    }
    const legacyTicket = localStorage.getItem(LEGACY_DNA_TICKET_KEY);
    if (legacyTicket && legacyTicket.trim() !== "") {
      return true;
    }
    if (userId) {
      const userTicket = localStorage.getItem(getDnaTicketStorageKey(userId));
      if (userTicket && userTicket.trim() !== "") {
        return true;
      }
    }
    // Дополнительная защита: проверка наличия билета любого авторизованного пользователя
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("bs_reading_dna_ticket_user_")) {
        const val = localStorage.getItem(key);
        if (val && val.trim() !== "") {
          return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Проверяет, активен ли кулдаун после скрытия модального окна.
 */
export function isDismissedOnCooldown(): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    const raw = localStorage.getItem(DNA_WELCOME_DISMISSED_KEY);
    if (!raw) return false;
    const timestamp = Number(raw);
    if (Number.isNaN(timestamp) || !Number.isFinite(timestamp)) return false;
    return timestamp > Date.now();
  } catch {
    return false;
  }
}

/**
 * Проверяет, относится ли маршрут к заблокированным для показа модалки.
 */
export function isRouteBlocked(pathname: string): boolean {
  return BLOCKED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export interface UseDnaWelcomeModalOptions {
  delayMs?: number;
  userId?: number | null;
}

export interface UseDnaWelcomeModalReturn {
  isOpen: boolean;
  handleDismiss: () => void;
  handleAccept: () => void;
}

/**
 * Хук для управления показом приветственного модального окна Читательского ДНК.
 * Открывается с задержкой (по умолчанию 3500 мс) на открытых публичных страницах.
 */
export function useDnaWelcomeModal(
  options: UseDnaWelcomeModalOptions = {}
): UseDnaWelcomeModalReturn {
  const { delayMs = DEFAULT_DNA_WELCOME_DELAY_MS, userId } = options;
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [isOpenState, setIsOpenState] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Сбрасываем isOpenState при смене pathname во время рендера (рекомендация React)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsOpenState(false);
  }

  const isBlocked = isRouteBlocked(pathname);

  useEffect(() => {
    // 1. Не открывать при пререндере (SSR / prerender.mjs)
    if (typeof window !== "undefined" && Boolean(window.__PRERENDER__)) {
      return;
    }

    // 2. Не открывать для ботов и краулеров
    if (isBotUserAgent()) {
      return;
    }

    // 3. Не открывать на исключенных роутах
    if (isRouteBlocked(pathname)) {
      return;
    }

    // 4. Не открывать, если тест уже пройден или билет уже создан
    if (hasUserCompletedDna(userId)) {
      return;
    }

    // 5. Не открывать, если действует кулдаун после отклонения
    if (isDismissedOnCooldown()) {
      return;
    }

    // Запускаем таймер показа
    const timer = setTimeout(() => {
      if (
        !hasUserCompletedDna(userId) &&
        !isDismissedOnCooldown() &&
        !isRouteBlocked(pathname)
      ) {
        setIsOpenState(true);
      }
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [pathname, delayMs, userId]);

  const handleDismiss = useCallback(() => {
    setIsOpenState(false);
    try {
      const cooldownUntil = Date.now() + DNA_WELCOME_COOLDOWN_MS;
      localStorage.setItem(DNA_WELCOME_DISMISSED_KEY, String(cooldownUntil));
    } catch {
      // Игнорируем ошибки квоты или приватного режима localStorage
    }
  }, []);

  const handleAccept = useCallback(() => {
    setIsOpenState(false);
    try {
      localStorage.setItem(DNA_WELCOME_COMPLETED_KEY, "true");
    } catch {
      // Игнорируем ошибки квоты или приватного режима localStorage
    }
    navigate("/reading-dna");
  }, [navigate]);

  return {
    isOpen: isOpenState && !isBlocked,
    handleDismiss,
    handleAccept,
  };
}
