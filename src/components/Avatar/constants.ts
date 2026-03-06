import {
  Image as ImageIcon,
  Upload as UploadIcon,
  Sparkles,
} from 'lucide-react';
import type { TabConfig } from './types';

// === Tab configuration ===
export const TABS: TabConfig[] = [
  { id: 'presets', label: 'Пресеты', icon: ImageIcon },
  { id: 'ai', label: 'AI Генерация', icon: Sparkles },
  { id: 'upload', label: 'Загрузить', icon: UploadIcon },
];

// === Constants ===
export const GENERATION_TIMEOUT_MS = 120000; // 2 минуты
export const PREVIEW_POLLING_MAX_ATTEMPTS = 25;
export const PREVIEW_POLLING_DELAY_MS = 2000;
export const QUERY_STALE_TIME_MS = 5 * 60 * 1000;
export const QUERY_GC_TIME_MS = 30 * 60 * 1000;
export const MAX_FILE_SIZE_MB = 5;
