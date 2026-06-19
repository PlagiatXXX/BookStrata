/**
 * Форматирует ISO-дату как относительное время ("только что", "5 мин. назад", и т.д.)
 */
export function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "—";

  const now = Date.now();
  const then = new Date(isoString).getTime();

  if (Number.isNaN(then)) return "—";

  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 0) return "только что";
  if (diffSec < 60) return "только что";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} мин. назад`;

  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} ч. назад`;

  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "вчера";
  if (diffDays < 7) return `${diffDays} дн. назад`;

  return new Date(isoString).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Форматирует общее время (в минутах) в человекочитаемый вид
 * Например: 131 → "2 ч. 11 мин."
 */
export function formatTotalMinutes(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "—";

  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} дн.`);
  if (hours > 0) parts.push(`${hours} ч.`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins} мин.`);

  return parts.join(" ");
}
