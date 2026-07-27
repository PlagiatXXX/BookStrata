import {
  CloudRain,
  TreePine,
  Flame,
  Droplets,
  Moon,
  Wind,
  Bird,
  Turtle,
  CircleDot,
  Ear,
  Music,
  Moon as DarkAmbientIcon,
  Heart,
  Flower2,
  Globe,
  Zap,
  Sparkles,
  Sun,
  Radio,
  AudioLines,
  Palette,
  Leaf,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AmbientCategory = "noise" | "music";

export interface AmbientTrack {
  id: string;
  label: string;
  icon: LucideIcon;
  src: string;
  color: string;
  category: AmbientCategory;
  attribution?: string;
}

/* ─── 10 шумов ────────────────────────────── */

const NOISE: AmbientTrack[] = [
  {
    id: "rain",
    label: "Дождь",
    icon: CloudRain,
    src: "/audio/noise/rain.mp3",
    color: "#6b9fff",
    category: "noise",
  },
  {
    id: "forest",
    label: "Лес",
    icon: TreePine,
    src: "/audio/noise/forest.mp3",
    color: "#4ade80",
    category: "noise",
  },
  {
    id: "fireplace",
    label: "Камин",
    icon: Flame,
    src: "/audio/noise/fireplace.mp3",
    color: "#fb923c",
    category: "noise",
  },
  {
    id: "waves",
    label: "Морской прибой",
    icon: Droplets,
    src: "/audio/noise/waves.mp3",
    color: "#38bdf8",
    category: "noise",
  },
  {
    id: "night-city",
    label: "Ночной город",
    icon: Moon,
    src: "/audio/noise/night-city.mp3",
    color: "#a78bfa",
    category: "noise",
  },
  {
    id: "fan",
    label: "Вентилятор",
    icon: Wind,
    src: "/audio/noise/fan.mp3",
    color: "#94a3b8",
    category: "noise",
  },
  {
    id: "pink-noise",
    label: "Розовый шум",
    icon: Bird,
    src: "/audio/noise/pink-noise.mp3",
    color: "#fda4af",
    category: "noise",
  },
  {
    id: "brown-noise",
    label: "Коричневый шум",
    icon: Turtle,
    src: "/audio/noise/brown-noise.mp3",
    color: "#d4a373",
    category: "noise",
  },
];

/* ─── Музыка (12 треков) ────────────────────── */

const MUSIC: AmbientTrack[] = [
  {
    id: "dark-ambient",
    label: "Тёмная атмосфера",
    icon: DarkAmbientIcon,
    src: "/audio/music/dark-ambient.mp3",
    color: "#475569",
    category: "music",
  },
  {
    id: "honey-kisses",
    label: "Медовые поцелуи",
    icon: Heart,
    src: "/audio/music/honey-kisses.mp3",
    color: "#f472b6",
    category: "music",
  },
  {
    id: "perfect-beauty",
    label: "Совершенная красота",
    icon: Flower2,
    src: "/audio/music/perfect-beauty.mp3",
    color: "#a78bfa",
    category: "music",
  },
  {
    id: "wonders-of-earth",
    label: "Чудеса Земли",
    icon: Globe,
    src: "/audio/music/wonders-of-earth.mp3",
    color: "#34d399",
    category: "music",
  },
  {
    id: "epic",
    label: "Эпичная",
    icon: Zap,
    src: "/audio/music/epic.mp3",
    color: "#f59e0b",
    category: "music",
  },
  {
    id: "no-copyright",
    label: "Без границ",
    icon: Sparkles,
    src: "/audio/music/no-copyright.mp3",
    color: "#ec4899",
    category: "music",
  },
  {
    id: "moment-of-peace",
    label: "Момент покоя",
    icon: Sun,
    src: "/audio/music/moment-of-peace.mp3",
    color: "#fbbf24",
    category: "music",
  },
  {
    id: "music-promotion",
    label: "Вдохновение",
    icon: Radio,
    src: "/audio/music/music-promotion.mp3",
    color: "#818cf8",
    category: "music",
  },
  {
    id: "future-design",
    label: "Будущий дизайн",
    icon: AudioLines,
    src: "/audio/music/future-design.mp3",
    color: "#22d3ee",
    category: "music",
  },
  {
    id: "sigma-no-copyright",
    label: "Сигма",
    icon: Palette,
    src: "/audio/music/sigma-no-copyright.mp3",
    color: "#fb923c",
    category: "music",
  },
  {
    id: "new-age-nature",
    label: "Природа нью-эйдж",
    icon: Leaf,
    src: "/audio/music/new-age-nature.mp3",
    color: "#4ade80",
    category: "music",
  },
  {
    id: "lo-fi-jazzy",
    label: "Lo-Fi джаз",
    icon: CircleDot,
    src: "/audio/music/lo-fi-jazzy.mp3",
    color: "#a855f7",
    category: "music",
  },
  {
    id: "chill-vlog",
    label: "Chill Vlog",
    icon: Sun,
    src: "/audio/music/chill-vlog.mp3",
    color: "#fcd34d",
    category: "music",
  },
];

/* ─── Экспорт ──────────────────────────────── */

export const AMBIENT_TRACKS: AmbientTrack[] = [...NOISE, ...MUSIC];

export const TRACKS_BY_CATEGORY: Record<AmbientCategory, AmbientTrack[]> = {
  noise: NOISE,
  music: MUSIC,
};

export const CATEGORY_META: Record<
  AmbientCategory,
  { label: string; icon: LucideIcon }
> = {
  noise: { label: "Природа", icon: Ear },
  music: { label: "Музыка", icon: Music },
};
