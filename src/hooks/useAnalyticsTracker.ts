import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { apiTrackEvent } from "@/lib/analyticsApi";
import { capturePosthogEvent } from "@/lib/posthog";

// Минимальный интервал между page_view для одного и того же пути (сек)
const PAGE_VIEW_DEBOUNCE_MS = 10_000;

/**
 * Централизованный обработчик кликов по элементам с data-analytics.
 * Использует делегирование на document — работает для динамических элементов.
 *
 * Формат атрибута: `data-analytics="category.action"`
 * Пример: `data-analytics="cta.dashboard.create_tierlist"`
 *
 * Событие отправляется во внутреннюю аналитику (apiTrackEvent)
 * и, если доступна, в Яндекс.Метрику как цель.
 */
function setupAnalyticsClickListener() {
  const handler = (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest("[data-analytics]");
    if (!target) return;

    const eventName = target.getAttribute("data-analytics");
    if (!eventName) return;

    // Дополнительные данные из data-атрибутов
    const meta: Record<string, string> = {};
    const label = target.getAttribute("data-analytics-label");
    if (label) meta.label = label;
    const value = target.getAttribute("data-analytics-value");
    if (value) meta.value = value;

    // Отправка во внутреннюю аналитику
    apiTrackEvent(eventName, meta, window.location.href);

    // Отправка в PostHog (если инициализирован)
    capturePosthogEvent(eventName, meta);

    // Отправка в Яндекс.Метрику как цель (reachGoal)
    try {
      if (typeof window.ym === "function") {
        const counterId = import.meta.env.VITE_YM_COUNTER_ID as string | undefined;
        if (counterId) {
          // Нормализуем имя: cta.dashboard.create_tierlist → dashboard_create_tierlist
          const goalName = eventName.replace(/^[^.]+\./, "");
          window.ym(Number(counterId), "reachGoal", goalName, {
            params: { full_event: eventName, ...meta },
          });
        }
      }
    } catch {
      // Тихий fallback
    }
  };

  document.addEventListener("click", handler, { passive: true });
  return () => document.removeEventListener("click", handler);
}

export function useAnalyticsTracker() {
  const { pathname } = useLocation();
  const lastTrackedRef = useRef<{ path: string; time: number } | null>(null);

  // Централизованный слушатель data-analytics кликов (один раз на всё приложение)
  useEffect(() => {
    return setupAnalyticsClickListener();
  }, []);

  // Трекинг просмотра страницы — для всех пользователей,
  // не чаще раза в 10 секунд для одного и того же пути
  useEffect(() => {
    const now = Date.now();
    const last = lastTrackedRef.current;

    if (
      last &&
      last.path === pathname &&
      now - last.time < PAGE_VIEW_DEBOUNCE_MS
    ) {
      return;
    }

    lastTrackedRef.current = { path: pathname, time: now };

    // 1. Отправка во внутреннюю БД и PostHog
    apiTrackEvent("page_view", { path: pathname }, window.location.href);
    capturePosthogEvent("page_view", { path: pathname });

    // 2. Отправка хита в Яндекс.Метрику для отслеживания SPA-переходов
    try {
      if (typeof window.ym === "function") {
        const counterId = import.meta.env.VITE_YM_COUNTER_ID as string | undefined;
        if (counterId) {
          window.ym(Number(counterId), "hit", window.location.href);
        }
      }
    } catch {
      // Тихий fallback
    }
  }, [pathname]);
}
