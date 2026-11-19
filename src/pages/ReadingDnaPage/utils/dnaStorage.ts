/**
 * Утилиты для работы с ключами LocalStorage страницы Книжного ДНК.
 * Обеспечивают изоляцию данных между авторизованными пользователями и гостями,
 * исключая утечку чужих билетов и черновиков между сессиями.
 */

export const LEGACY_DNA_TICKET_KEY = "bs_reading_dna_ticket";
export const LEGACY_DNA_DRAFT_KEY = "bs_reading_dna_draft";
export const DNA_THEME_KEY = "bs_reading_dna_theme";

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
