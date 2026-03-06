// === Cover heights for masonry layout ===
export const COVER_HEIGHTS = [320, 420, 360, 500, 390, 460];

// === Pagination ===
export const PUBLIC_PAGE_SIZE = 6;
export const PUBLIC_TIER_LISTS_STALE_TIME_MS = 30000;
export const PUBLIC_TIER_LISTS_GC_TIME_MS = 300000;

// === Section labels ===
export const SECTION_LABELS: Record<string, string> = {
  private: 'Личные шаблоны',
  public: 'Публичные тир-листы',
  favorites: 'Избранное',
  archived: 'Архив',
};

// === Section descriptions ===
export const SECTION_DESCRIPTIONS: Record<string, string> = {
  private: 'Управляйте личной коллекцией шаблонов для рейтингов.',
  public: 'Подборка публичных рейтингов от сообщества.',
  favorites: 'Ваши избранные шаблоны.',
  archived: 'Архивированные шаблоны.',
};

// === View mode labels ===
export const VIEW_MODE_LABELS = {
  masonry: 'Плиточный вид',
  compact: 'Компактный вид',
};
