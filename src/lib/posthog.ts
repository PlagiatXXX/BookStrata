type PosthogClient = {
  init: (apiKey: string, config: Record<string, unknown>) => void;
  capture: (event: string, properties?: Record<string, unknown>) => void;
  startSessionRecording: () => void;
  __loaded: boolean;
};

/** Глобальный экземпляр posthog, заполняется после initPosthog() */
let _ph: PosthogClient | null = null;

/**
 * Инициализация PostHog (Session Replay + Product Analytics).
 * Загружается только после согласия пользователя на аналитику.
 *
 * Использует динамический import, чтобы не раздувать основной бандл.
 * Если VITE_POSTHOG_API_KEY не задан — инициализация не происходит.
 */
export async function initPosthog() {
  const apiKey = import.meta.env.VITE_POSTHOG_API_KEY as string | undefined;
  if (!apiKey) return;
  if (_ph) return;

  try {
    const { default: posthog } = await import("posthog-js") as { default: PosthogClient };

    const host =
      (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ||
      "https://app.posthog.com";

    posthog.init(apiKey, {
      api_host: host,
      capture_pageview: false,     // page_view трекаем через useAnalyticsTracker
      capture_performance: false,  // не грузим Performance API без нужды
      autocapture: false,          // используем свой data-analytics слой
      disable_session_recording: false,
      persistence: "localStorage",
      loaded: () => {
        posthog.startSessionRecording();
      },
    });

    _ph = posthog;
  } catch {
    // тихий fallback — аналитика не должна ломать UX
  }
}

/**
 * Захват кастомного события в PostHog.
 * Если PostHog не инициализирован — ничего не делает.
 */
export function capturePosthogEvent(
  eventName: string,
  meta?: Record<string, string>,
) {
  try {
    if (_ph?.capture) {
      _ph.capture(eventName, { ...meta });
    }
  } catch {
    // тихий fallback
  }
}
