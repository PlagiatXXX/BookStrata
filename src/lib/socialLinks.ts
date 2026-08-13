/**
 * Валидация и хелперы соцссылок профиля.
 * Вынесено из ProfileBioEditor, чтобы переиспользовать и тестировать отдельно.
 */

export const PLATFORM_OPTIONS = [
  "telegram",
  "twitter",
  "instagram",
  "vkontakte",
  "youtube",
  "github",
  "website",
] as const;

export type SocialPlatform = (typeof PLATFORM_OPTIONS)[number];

export const PLATFORM_PLACEHOLDERS: Record<SocialPlatform, string> = {
  telegram: "https://t.me/username",
  twitter: "https://twitter.com/username",
  instagram: "https://instagram.com/username",
  vkontakte: "https://vk.ru/id666666666",
  youtube: "https://youtube.com/@username",
  github: "https://github.com/username",
  website: "https://example.com",
};

export function getPlatformPlaceholder(platform: string): string {
  return (
    PLATFORM_PLACEHOLDERS[platform as SocialPlatform] || "https://example.com"
  );
}

/**
 * Нормализует ссылку на соцсеть:
 * - добавляет https://, если схема не указана (удобно: "t.me/user" → "https://t.me/user");
 * - проверяет, что это именно http(s)-ссылка на домен, а не произвольный текст.
 * Возвращает нормализованную ссылку или null, если ссылка невалидна.
 */
export function normalizeSocialUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  const withScheme = hasScheme ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname || !url.hostname.includes(".")) return null;
    // "https://mailto:test@example.com/" парсится как URL с логином — это не ссылка на соцсеть
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}