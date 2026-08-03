/**
 * Утилиты для Google Tag Manager.
 *
 * dataLayer — глобальный массив, который GTM слушает и перекладывает
 * входящие объекты в слой данных. События отсюда ловятся в GTM
 * триггерами "Custom Event" (например, sign_up, create_tier_list).
 */

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

/** Безопасный push события в dataLayer (не падает, если GTM не загрузился). */
export function pushDataLayerEvent(
  event: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}
