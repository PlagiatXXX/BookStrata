import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getAnonymousId, getSessionContext } from "./analyticsIdentity";

describe("analyticsIdentity", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-27T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("генерирует стабильный anonymousId в localStorage", () => {
    const id1 = getAnonymousId();
    const id2 = getAnonymousId();
    expect(id1).toBeTruthy();
    expect(id1).toBe(id2);
  });

  it("создаёт новую сессию с UTM-метками и внешним referrer, затем переиспользует её в пределах 30 минут", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        hostname: "bookstrata.ru",
        pathname: "/books/dune",
        search: "?utm_source=telegram&utm_medium=social&utm_campaign=books",
      },
    });
    Object.defineProperty(document, "referrer", {
      configurable: true,
      value: "https://t.me/bookstrata",
    });

    const first = getSessionContext();
    expect(first.isNewSession).toBe(true);
    expect(first.utmSource).toBe("telegram");
    expect(first.utmMedium).toBe("social");
    expect(first.utmCampaign).toBe("books");
    expect(first.referrer).toBe("https://t.me/bookstrata");

    // Через 10 минут — та же сессия
    vi.advanceTimersByTime(10 * 60 * 1000);
    const second = getSessionContext();
    expect(second.isNewSession).toBe(false);
    expect(second.sessionId).toBe(first.sessionId);

    // Через 31 минуту — новая сессия
    vi.advanceTimersByTime(31 * 60 * 1000);
    const third = getSessionContext();
    expect(third.isNewSession).toBe(true);
    expect(third.sessionId).not.toBe(first.sessionId);
  });

  it("игнорирует внутренний referrer того же домена", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        hostname: "bookstrata.ru",
        pathname: "/books/dune",
        search: "",
      },
    });
    Object.defineProperty(document, "referrer", {
      configurable: true,
      value: "https://bookstrata.ru/collections",
    });

    const ctx = getSessionContext();
    expect(ctx.referrer).toBeNull();
  });
});
