import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getRoastStorageKey,
  getRecentRoastAttempts,
  recordRoastAttempt,
  getRoastCooldownRemaining,
  formatCooldownTime,
  ROAST_ATTEMPTS_KEY,
  ROAST_COOLDOWN_MS,
} from "./roastCooldownHelper";

describe("roastCooldownHelper", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("getRoastStorageKey returns id-based key or title-based fallback", () => {
    expect(getRoastStorageKey("tier-123", "Любимые книги")).toBe("bs_roast_id_tier-123");
    expect(getRoastStorageKey(42, "Любимые книги")).toBe("bs_roast_id_42");
    expect(getRoastStorageKey(null, "Любимые книги")).toBe("bs_roast_title_%D0%BB%D1%8E%D0%B1%D0%B8%D0%BC%D1%8B%D0%B5%20%D0%BA%D0%BD%D0%B8%D0%B3%D0%B8");
    expect(getRoastStorageKey("new", "Новый тир-лист")).toBe("bs_roast_title_%D0%BD%D0%BE%D0%B2%D1%8B%D0%B9%20%D1%82%D0%B8%D1%80-%D0%BB%D0%B8%D1%81%D1%82");
  });

  it("getRecentRoastAttempts returns empty array when empty or invalid", () => {
    expect(getRecentRoastAttempts()).toEqual([]);
    localStorage.setItem(ROAST_ATTEMPTS_KEY, "invalid-json");
    expect(getRecentRoastAttempts()).toEqual([]);
  });

  it("recordRoastAttempt records current timestamp and filters out old attempts", () => {
    const now = 1700000000000;
    vi.setSystemTime(now);

    recordRoastAttempt();
    expect(getRecentRoastAttempts()).toEqual([now]);

    // Добавляем старую попытку старше 15 минут
    const oldAttempt = now - ROAST_COOLDOWN_MS - 1000;
    localStorage.setItem(ROAST_ATTEMPTS_KEY, JSON.stringify([oldAttempt, now]));
    expect(getRecentRoastAttempts()).toEqual([now]);

    vi.useRealTimers();
  });

  it("getRoastCooldownRemaining returns 0 when under limit and positive ms when on cooldown", () => {
    const now = 1700000000000;
    vi.setSystemTime(now);

    // 0 или 1 попытка -> кулдауна нет
    expect(getRoastCooldownRemaining()).toBe(0);
    recordRoastAttempt();
    expect(getRoastCooldownRemaining()).toBe(0);

    // 2 попытки -> кулдаун включён
    recordRoastAttempt();
    expect(getRoastCooldownRemaining()).toBe(ROAST_COOLDOWN_MS);

    // Через 5 минут остаётся 10 минут
    vi.setSystemTime(now + 5 * 60 * 1000);
    expect(getRoastCooldownRemaining()).toBe(10 * 60 * 1000);

    vi.useRealTimers();
  });

  it("formatCooldownTime formats ms into MM:SS", () => {
    expect(formatCooldownTime(15 * 60 * 1000)).toBe("15:00");
    expect(formatCooldownTime(74 * 1000)).toBe("1:14");
    expect(formatCooldownTime(5 * 1000)).toBe("0:05");
  });
});
