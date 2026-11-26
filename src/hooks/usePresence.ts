import { useEffect, useRef } from "react";
import { getAnonymousId } from "@/lib/analyticsIdentity";
import { sendPresenceLeave, sendPresencePing } from "@/lib/presenceApi";

const PING_INTERVAL_MS = 30_000;
const IDLE_TIMEOUT_MS = 90_000;
const INTERACTION_THROTTLE_MS = 5_000;
const TAB_STALE_MS = 45_000;
const GLOBAL_PING_DEDUP_MS = 25_000;

const TABS_STORAGE_KEY = "bookstrata_presence_tabs";
const LAST_PING_STORAGE_KEY = "bookstrata_presence_last_ping";

interface UsePresenceOptions {
  pathname: string;
  userId?: number | null;
  isAuthLoading: boolean;
}

type TabsMap = Record<string, number>;

function createTabId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readTabs(): TabsMap {
  try {
    const raw = localStorage.getItem(TABS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as TabsMap;
  } catch {
    return {};
  }
}

function writeTabs(tabs: TabsMap): void {
  try {
    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
  } catch {
    // приватный режим
  }
}

function pruneStaleTabs(tabs: TabsMap, now: number): TabsMap {
  const fresh: TabsMap = {};
  for (const [id, ts] of Object.entries(tabs)) {
    if (now - ts < TAB_STALE_MS) {
      fresh[id] = ts;
    }
  }
  return fresh;
}

function readLastGlobalPingTs(): number {
  try {
    return Number(localStorage.getItem(LAST_PING_STORAGE_KEY) || "0");
  } catch {
    return 0;
  }
}

function writeLastGlobalPingTs(ts: number): void {
  try {
    localStorage.setItem(LAST_PING_STORAGE_KEY, String(ts));
  } catch {
    // ignore
  }
}

interface PresenceState {
  tabId: string | null;
  lastInteraction: number;
  lastStatus: "active" | "idle" | null;
  lastThrottleTick: number;
  pathname: string;
  isAuthLoading: boolean;
}

function dispatchPing(state: PresenceState, force: boolean): void {
  if (state.isAuthLoading) return;
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

  const now = Date.now();
  if (!state.tabId) state.tabId = createTabId();
  if (state.lastInteraction === 0) state.lastInteraction = now;

  const tabs = pruneStaleTabs(readTabs(), now);
  tabs[state.tabId] = now;
  writeTabs(tabs);

  const status: "active" | "idle" =
    now - state.lastInteraction < IDLE_TIMEOUT_MS ? "active" : "idle";
  const statusChanged = state.lastStatus !== null && state.lastStatus !== status;
  const lastGlobalPing = readLastGlobalPingTs();

  if (!force && !statusChanged && now - lastGlobalPing < GLOBAL_PING_DEDUP_MS) {
    return;
  }

  state.lastStatus = status;
  writeLastGlobalPingTs(now);

  void sendPresencePing({
    anonId: getAnonymousId(),
    page: state.pathname || "/",
    status,
  });
}

/**
 * Отслеживает живое присутствие пользователя/гостя на сайте.
 * - Координирует несколько вкладок через localStorage (без дублей пингов).
 * - Определяет реальный статус active vs idle по взаимодействиям со страницей.
 * - Не отправляет пинг при скрытии вкладки и шлёт leave при закрытии последней вкладки.
 */
export function usePresence({ pathname, userId, isAuthLoading }: UsePresenceOptions) {
  const stateRef = useRef<PresenceState>({
    tabId: null,
    lastInteraction: 0,
    lastStatus: null,
    lastThrottleTick: 0,
    pathname,
    isAuthLoading,
  });

  // Реакция на смену страницы, авторизацию или завершение restoreSession
  useEffect(() => {
    const state = stateRef.current;
    state.pathname = pathname;
    state.isAuthLoading = isAuthLoading;
    if (isAuthLoading) return;
    state.lastInteraction = Date.now();
    dispatchPing(state, true);
  }, [pathname, userId, isAuthLoading]);

  // Слушатели взаимодействий, видимости вкладки, интервала и закрытия
  useEffect(() => {
    const state = stateRef.current;
    if (!state.tabId) state.tabId = createTabId();
    if (state.lastInteraction === 0) state.lastInteraction = Date.now();

    const handleInteraction = () => {
      const now = Date.now();
      if (now - state.lastThrottleTick < INTERACTION_THROTTLE_MS) {
        return;
      }
      state.lastThrottleTick = now;
      const wasIdle = state.lastStatus === "idle";
      state.lastInteraction = now;
      if (wasIdle) {
        dispatchPing(state, true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        state.lastInteraction = Date.now();
        dispatchPing(state, true);
      }
      // На hidden намеренно НЕ шлём пинг — не продлеваем «онлайн» при уходе
    };

    const handlePageHide = () => {
      const now = Date.now();
      if (!state.tabId) return;
      const tabs = pruneStaleTabs(readTabs(), now);
      delete tabs[state.tabId];
      writeTabs(tabs);

      if (Object.keys(tabs).length === 0) {
        sendPresenceLeave(getAnonymousId());
      }
    };

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        dispatchPing(state, false);
      }
    }, PING_INTERVAL_MS);

    window.addEventListener("pointerdown", handleInteraction, { passive: true });
    window.addEventListener("keydown", handleInteraction, { passive: true });
    window.addEventListener("scroll", handleInteraction, { passive: true });
    window.addEventListener("touchstart", handleInteraction, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      clearInterval(interval);
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      window.removeEventListener("scroll", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);
}
