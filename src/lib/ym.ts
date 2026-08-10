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
 * - не prerender (window.__PRERENDER__) — чтобы не грузить счётчик для ботов.
 */
declare global {
  interface Window {
    ym?: (id: number, action: string, ...args: unknown[]) => void;
  }
}

export function initYandexMetrika(): void {
  try {
    const counterId = import.meta.env.VITE_YM_COUNTER_ID;
    if (!counterId || window.__PRERENDER__) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metrikaLoader = (m: any, e: Document, t: string, r: string, i: string, k?: any, a?: any) => {
      m[i] = m[i] || function (...args: unknown[]) { (m[i].a = m[i].a || []).push(args); };
      m[i].l = Date.now();
      k = e.createElement(t);
      a = e.getElementsByTagName(t)[0];
      k.async = 1;
      k.src = r;
      a.parentNode.insertBefore(k, a);
    };
    metrikaLoader(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

    const ymFn: ((id: number, action: string, ...args: unknown[]) => void) | undefined = window.ym;
    if (!ymFn) return;

    ymFn(Number(counterId), "init", {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: true,
      defer: true,
      trackHash: true,
    });
  } catch {
    // Аналитика не должна ломать приложение — тихий fallback
  }
}