/**
 * Настройки пагинации по умолчанию
 */
export const DEFAULT_PAGE_SIZE = 10;
export const PUBLIC_CATALOG_PAGE_SIZE = 6;
export const PUBLIC_PAGE_SIZE = 6; // compatibility alias

// Template Library specific constants
export const COVER_HEIGHTS_MAP = {
  large: 400,
  tall: 400,
  wide: 200,
  standard: 200,
};

export const COVER_HEIGHTS = [200, 400]; // matching expected number[] type

export const PUBLIC_TIER_LISTS_STALE_TIME_MS = 1000 * 60 * 5; // 5 minutes
export const PUBLIC_TIER_LISTS_GC_TIME_MS = 1000 * 60 * 30; // 30 minutes
