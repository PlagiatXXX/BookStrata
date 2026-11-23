/**
 * Утилиты для работы с ключами LocalStorage страницы Книжного ДНК.
 * Обеспечивают изоляцию данных между авторизованными пользователями и гостями,
 * исключая утечку чужих билетов и черновиков между сессиями.
 */

export const LEGACY_DNA_TICKET_KEY = "bs_reading_dna_ticket";
export const LEGACY_DNA_DRAFT_KEY = "bs_reading_dna_draft";
export const DNA_THEME_KEY = "bs_reading_dna_theme";
export const DNA_GUEST_TOKEN_KEY = "bs_reading_dna_guest_token";

/**
 * Возвращает существующий гостевой токен Reading DNA или создаёт новый.
 */
export function getOrCreateDnaGuestToken(): string {
  try {
    const existing = localStorage.getItem(DNA_GUEST_TOKEN_KEY);
    if (existing) return existing;
    const token =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `dna_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(DNA_GUEST_TOKEN_KEY, token);
    return token;
  } catch {
    return `dna_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function getDnaGuestToken(): string | null {
  try {
    return localStorage.getItem(DNA_GUEST_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearDnaGuestToken(): void {
  try {
    localStorage.removeItem(DNA_GUEST_TOKEN_KEY);
  } catch {
    // ignore
  }
}

/**
 * Ключ для сохранения билета читательского ДНК.
 * Для авторизованного пользователя привязывается к userId,
 * для неавторизованного используется гостевой ключ.
 */
export function getDnaTicketStorageKey(userId?: number | null): string {
  return userId ? `bs_reading_dna_ticket_user_${userId}` : "bs_reading_dna_ticket_guest";
}

/**
 * Ключ для сохранения черновика ответов теста.
 */
export function getDnaDraftStorageKey(userId?: number | null): string {
  return userId ? `bs_reading_dna_draft_user_${userId}` : "bs_reading_dna_draft_guest";
}

/**
 * Удаляет устаревшие глобальные неизолированные ключи,
 * предотвращая появление чужих билетов прошлых версий.
 */
export function cleanupLegacyDnaStorage(): void {
  try {
    localStorage.removeItem(LEGACY_DNA_TICKET_KEY);
    localStorage.removeItem(LEGACY_DNA_DRAFT_KEY);
  } catch {
    // игнорируем ошибки в средах без доступа к localStorage
  }
}
