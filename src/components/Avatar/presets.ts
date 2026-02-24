export interface AvatarPreset {
  id: string;
  seed: string;
  thumbnail: string;
  full: string;
}

export interface PresetCategory {
  name: string;
  presets: AvatarPreset[];
}

export type PresetStyle = 'cartoon' | 'fantasy' | 'pixel';

function makePreset(style: PresetStyle, seed: string): AvatarPreset {
  const encodedSeed = encodeURIComponent(seed);
  return {
    id: `${style}-${seed}`,
    seed,
    thumbnail: `https://api.dicebear.com/9.x/${style}/svg?seed=${encodedSeed}&size=64`,
    full: `https://api.dicebear.com/9.x/${style}/svg?seed=${encodedSeed}&size=256`,
  };
}

const cartoonSeeds = ['alex', 'mike', 'sofia', 'nina', 'sam', 'luna', 'dima', 'kate'];
const fantasySeeds = ['wizard', 'ranger', 'elf', 'bard', 'paladin', 'druid', 'sage', 'rogue'];
const pixelSeeds = ['retro1', 'retro2', 'retro3', 'retro4', 'retro5', 'retro6', 'retro7', 'retro8'];

export const presetCategories: Record<PresetStyle, PresetCategory> = {
  cartoon: {
    name: 'Cartoon',
    presets: cartoonSeeds.map((seed) => makePreset('cartoon', seed)),
  },
  fantasy: {
    name: 'Fantasy',
    presets: fantasySeeds.map((seed) => makePreset('fantasy', seed)),
  },
  pixel: {
    name: 'Pixel',
    presets: pixelSeeds.map((seed) => makePreset('pixel', seed)),
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
