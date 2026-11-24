export const ROAST_ATTEMPTS_KEY = "bs_roast_attempts";
export const ROAST_MAX_ATTEMPTS = 2;
export const ROAST_COOLDOWN_MS = 15 * 60 * 1000; // 15 минут

export function getRoastStorageKey(tierListId?: string | number | null, title?: string): string {
  if (tierListId && tierListId !== "new") return `bs_roast_id_${tierListId}`;
  return `bs_roast_title_${encodeURIComponent((title || "untitled").trim().toLowerCase())}`;
}

export function getRecentRoastAttempts(): number[] {
  try {
    const raw = localStorage.getItem(ROAST_ATTEMPTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter(
      (ts): ts is number => typeof ts === "number" && Number.isFinite(ts) && now - ts < ROAST_COOLDOWN_MS
    );
  } catch {
    return [];
  }
}

export function recordRoastAttempt(): void {
  try {
    const recent = getRecentRoastAttempts();
    recent.push(Date.now());
    localStorage.setItem(ROAST_ATTEMPTS_KEY, JSON.stringify(recent));
  } catch {
    // ignore
  }
}

export function getRoastCooldownRemaining(): number {
  const recent = getRecentRoastAttempts();
  if (recent.length < ROAST_MAX_ATTEMPTS) return 0;
  recent.sort((a, b) => a - b);
  const oldestInWindow = recent[recent.length - ROAST_MAX_ATTEMPTS];
  const remaining = oldestInWindow + ROAST_COOLDOWN_MS - Date.now();
  return remaining > 0 ? remaining : 0;
}

export function formatCooldownTime(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
