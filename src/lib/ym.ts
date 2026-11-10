/**
 * Инициализация Яндекс.Метрики.
 *
 * Вызывается в main.tsx до рендера React. Заменяет инлайн-скрипт, который
 * раньше жил в index.html с подстановкой %VITE_YM_COUNTER_ID% — из-за него
 * Vite ругался в dev (переменная не задана в .env.local, Метрика в dev
 * намеренно выключена).
 *
 * Условия запуска:
 * - VITE_YM_COUNTER_ID задан (production); в dev переменная закомментирована;
 * - не prerender (window.__PRERENDER__) — чтобы не грузить счётчик для ботов;
 * - hostname из продового allowlist — иначе локальные превью (vite preview на
 *   localhost) стреляют в продовый счётчик и портят поведенческую статистику
 *   (за лето 2026 накопилось ~500 фейковых сессий с 127.0.0.1).
 */
declare global {
  interface Window {
    ym?: ((id: number, action: string, ...args: unknown[]) => void) & {
      a?: unknown[][];
      l?: number;
    };
    _ymLoaded?: boolean;
  }
}

/** Хосты, на которых разрешена инициализация Метрики. */
const ALLOWED_HOSTNAMES = new Set(["bookstrata.ru", "www.bookstrata.ru"]);

export function isAnalyticsHost(hostname: string): boolean {
  return ALLOWED_HOSTNAMES.has(hostname);
}

export const DEFAULT_YM_COUNTER_ID = 109755750;

export function getYmCounterId(): number {
  const counterId = import.meta.env.VITE_YM_COUNTER_ID;
  return counterId ? Number(counterId) : DEFAULT_YM_COUNTER_ID;
}

export function reachYmGoal(goalId: number): void {
  try {
    if (typeof window !== "undefined" && typeof window.ym === "function") {
      window.ym(getYmCounterId(), "reachGoal", goalId);
    }
  } catch {
    // Аналитика не должна ломать UX — тихий fallback
  }
}

export interface InitYandexMetrikaOptions {
  /** Внедрить скрипт сразу без ожидания взаимодействия / idle (для тестов или форсированного режима) */
  immediate?: boolean;
  /** Задержка до фоновой загрузки при отсутствии взаимодействий (по умолчанию 3500 мс) */
  idleDelayMs?: number;
}

export function initYandexMetrika(options?: InitYandexMetrikaOptions): void {
  try {
    const counterId = import.meta.env.VITE_YM_COUNTER_ID;
    if (!counterId || window.__PRERENDER__ || !isAnalyticsHost(window.location.hostname)) return;

    // 1. Создаём функцию-очередь window.ym сразу, чтобы вызовы hit/reachGoal не терялись
    if (!window.ym) {
      type YmQueueFn = {
        (...args: unknown[]): void;
        a?: unknown[][];
        l?: number;
      };
      const queueFn: YmQueueFn = function (...args: unknown[]) {
        (queueFn.a = queueFn.a || []).push(args);
      };
      queueFn.l = Date.now();
      window.ym = queueFn as Window["ym"];
    }

    // Буферизируем параметры инициализации счётчика
    window.ym?.(Number(counterId), "init", {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: true,
      defer: true,
      trackHash: true,
    });

    // 2. Внедрение тяжелого скрипта tag.js (164ms Long Task) откладываем до первого
    // взаимодействия пользователя или до простоя браузера, снижая TBT на 160-230 мс.
    const loadScript = () => {
      if (window._ymLoaded) return;
      window._ymLoaded = true;

      const script = document.createElement("script");
      script.async = true;
      script.src = "https://mc.yandex.ru/metrika/tag.js";

      const firstScript = document.getElementsByTagName("script")[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
      } else {
        document.head.appendChild(script);
      }
    };

    if (options?.immediate) {
      loadScript();
      return;
    }

    const interactEvents = ["scroll", "keydown", "touchstart", "click"] as const;
    const onInteract = () => {
      interactEvents.forEach((event) => {
        window.removeEventListener(event, onInteract);
      });
      loadScript();
    };

    interactEvents.forEach((event) => {
      window.addEventListener(event, onInteract, { once: true, passive: true });
    });

    const delay = options?.idleDelayMs ?? 3500;
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => {
        setTimeout(loadScript, delay);
      });
    } else {
      setTimeout(loadScript, delay);
    }
  } catch {
    // Аналитика не должна ломать приложение — тихий fallback
  }
}