// src/utils/animatedCover.ts
// Утилиты разбора и форматирования параметров живых обложек книг.
// Позволяют сохранять смещение кадра (objectPosition) в URL видео (#pos=...).

export interface ParsedAnimatedCover {
  cleanUrl: string;
  positionY: number;
  objectPosition: string;
}

/**
 * Извлекает чистый URL видео и вертикальное смещение (0..100%).
 * Поддерживает суффиксы #pos=80 или ?pos=80. По умолчанию 50% (центр).
 */
export function parseAnimatedCoverUrl(rawUrl: string | null | undefined): ParsedAnimatedCover {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { cleanUrl: "", positionY: 50, objectPosition: "center 50%" };
  }

  const trimmed = rawUrl.trim();
  const match = trimmed.match(/[#?&]pos=(\d{1,3})/);
  const positionY = match ? Math.max(0, Math.min(100, parseInt(match[1], 10))) : 50;
  const cleanUrl = trimmed.replace(/[#?&]pos=\d{1,3}/, "").replace(/[#?]$/, "");

  return {
    cleanUrl,
    positionY,
    objectPosition: `center ${positionY}%`,
  };
}

/**
 * Сохраняет процент вертикального смещения в URL (через #pos=...).
 * Если 50% (центр) — оставляет чистый URL без суффиксов.
 */
export function formatAnimatedCoverUrl(cleanUrl: string, positionY: number): string {
  const base = cleanUrl.replace(/[#?&]pos=\d{1,3}/, "").replace(/[#?]$/, "").trim();
  if (!base) return "";
  const clamped = Math.max(0, Math.min(100, Math.round(positionY)));
  if (clamped === 50) return base;
  return `${base}#pos=${clamped}`;
}
