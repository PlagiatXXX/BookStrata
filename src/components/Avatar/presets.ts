export interface AvatarPreset {
  id: string;
  name: string;
  thumbnail: string;
  full: string;
  category: PresetStyle;
}

export interface PresetCategory {
  name: string;
  presets: AvatarPreset[];
}

export type PresetStyle = 
  | 'cartoon' 
  | 'fantasy' 
  | 'professional' 
  | 'minimalist' 
  | 'animals' 
  | 'abstract';

// Импорты аватарок из каждой категории
import { cartoonAvatars } from '@/assets/avatars/cartoon';
import { fantasyAvatars } from '@/assets/avatars/fantasy';
import { professionalAvatars } from '@/assets/avatars/professional';
import { minimalistAvatars } from '@/assets/avatars/minimalist';
import { animalsAvatars } from '@/assets/avatars/animals';
import { abstractAvatars } from '@/assets/avatars/abstract';

// Ключ для localStorage
const AVATAR_CACHE_KEY = 'avatar_cache_v2';
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 дней

interface CachedAvatar {
  url: string;
  timestamp: number;
}

/**
 * Создаёт пресет с локальным файлом
 */
function makeLocalPreset(
  category: PresetStyle,
  index: number,
  url: string,
  name: string
): AvatarPreset {
  return {
    id: `${category}-${index + 1}`,
    name,
    thumbnail: url,
    full: url,
    category,
  };
}

/**
 * Кэширует URL аватарки
 */
function cacheAvatarUrl(presetId: string, url: string): void {
  try {
    const cache: Record<string, CachedAvatar> = JSON.parse(
      localStorage.getItem(AVATAR_CACHE_KEY) || '{}'
    );
    cache[presetId] = {
      url,
      timestamp: Date.now(),
    };
    localStorage.setItem(AVATAR_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Игнорируем ошибки localStorage
  }
}

/**
 * Получает URL аватарки из кэша
 */
export function getCachedAvatarUrl(preset: AvatarPreset): string | null {
  try {
    const cached = localStorage.getItem(AVATAR_CACHE_KEY);
    if (cached) {
      const cache: Record<string, CachedAvatar> = JSON.parse(cached);
      const cachedItem = cache[preset.id];
      
      if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL) {
        return cachedItem.url;
      }
    }
  } catch {
    // Игнорируем ошибки localStorage
  }
  
  return null;
}

/**
 * Очищает кэш аватарок
 */
export function clearAvatarCache(): void {
  try {
    localStorage.removeItem(AVATAR_CACHE_KEY);
  } catch {
    // Игнорируем ошибки
  }
}

// === КАТЕГОРИИ ПРЕСЕТОВ ===
// По 6 аватарок в каждой категории (всего 36)

export const presetCategories: Record<PresetStyle, PresetCategory> = {
  cartoon: {
    name: 'Мультяшные',
    presets: cartoonAvatars.map((url, index) => 
      makeLocalPreset('cartoon', index, url, `Мультяшный ${index + 1}`)
    ),
  },
  fantasy: {
    name: 'Фэнтези',
    presets: fantasyAvatars.map((url, index) => 
      makeLocalPreset('fantasy', index, url, `Фэнтези ${index + 1}`)
    ),
  },
  professional: {
    name: 'Профессиональные',
    presets: professionalAvatars.map((url, index) => 
      makeLocalPreset('professional', index, url, `Профи ${index + 1}`)
    ),
  },
  minimalist: {
    name: 'Минимализм',
    presets: minimalistAvatars.map((url, index) => 
      makeLocalPreset('minimalist', index, url, `Минимализм ${index + 1}`)
    ),
  },
  animals: {
    name: 'Животные',
    presets: animalsAvatars.map((url, index) => 
      makeLocalPreset('animals', index, url, `Животное ${index + 1}`)
    ),
  },
  abstract: {
    name: 'Абстракции',
    presets: abstractAvatars.map((url, index) => 
      makeLocalPreset('abstract', index, url, `Абстракция ${index + 1}`)
    ),
  },
};

export const allPresets: AvatarPreset[] = Object.values(presetCategories).flatMap(
  (category) => category.presets
);

export function getPresetById(id: string): AvatarPreset | undefined {
  return allPresets.find((preset) => preset.id === id);
}

export function getInitials(username?: string | null): string {
  if (!username?.trim()) return 'U';

  const parts = username.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

/**
 * Генерирует цвет для инициалов на основе username
 */
export function getInitialsColor(username?: string | null): string {
  if (!username?.trim()) return 'from-violet-500/30 to-fuchsia-500/30';

  const colors = [
    'from-violet-500/30 to-fuchsia-500/30',
    'from-blue-500/30 to-cyan-500/30',
    'from-green-500/30 to-emerald-500/30',
    'from-orange-500/30 to-amber-500/30',
    'from-red-500/30 to-rose-500/30',
    'from-indigo-500/30 to-purple-500/30',
  ];

  const index = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
}
