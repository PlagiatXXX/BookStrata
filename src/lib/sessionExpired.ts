/**
 * Модуль управления показом экрана «Сессия истекла».
 *
 * api-client.ts (не React-компонент) вызывает showSessionExpired(),
 * а React-компонент SessionExpiredOverlay подписывается через onSessionExpired().
 *
 * Это解耦两个世界: инфраструктурный слой не знает про React,
 * а React не знает про детали API-клиента.
 */

import { hasSession } from "./authApi";

let _listener: (() => void) | null = null;
let _shown = false;

/**
 * Показать экран «Сессия истекла». Вызывается из api-client при401 + failed refresh.
 * Идемпотентно: повторные вызовы игнорируются.
 *
 * НЕ показывается для гостей (нет ранее активной сессии) —
 * для них401 штатен, overlay только сбивает с толку.
 */
export function showSessionExpired(): void {
  if (_shown) return;
  if (!hasSession()) return; // гость — нет сессии, которую можно "истечь"
  _shown = true;
  _listener?.();
}

/**
 * Подписаться на показ экрана. Возвращает функцию отписки.
 * Используется в SessionExpiredOverlay.
 */
export function onSessionExpired(callback: () => void): () => void {
  _listener = callback;
  return () => {
    _listener = null;
  };
}

/**
 * Сбросить состояние (для тестов).
 */
export function __resetSessionExpired(): void {
  _shown = false;
  _listener = null;
}
