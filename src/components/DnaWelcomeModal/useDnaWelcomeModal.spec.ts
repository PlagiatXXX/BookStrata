import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useDnaWelcomeModal,
  DNA_WELCOME_DISMISSED_KEY,
  DNA_WELCOME_COMPLETED_KEY,
  BLOCKED_ROUTE_PREFIXES,
  isBotUserAgent,
  hasUserCompletedDna,
  isDismissedOnCooldown,
  isRouteBlocked,
} from "./useDnaWelcomeModal";

let mockPathname = "/";
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useLocation: () => ({ pathname: mockPathname }),
    useNavigate: () => mockNavigate,
  };
});

describe("useDnaWelcomeModal and helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    mockPathname = "/";
    mockNavigate.mockClear();
    delete window.__PRERENDER__;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.__PRERENDER__;
  });

  describe("Helper functions", () => {
    describe("isBotUserAgent", () => {
      it("detects search engine bots and crawlers", () => {
        expect(isBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
        expect(isBotUserAgent("Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 (compatible; Google-InspectionTool/1.0;)")).toBe(true);
        expect(isBotUserAgent("Mozilla/5.0 (compatible; GoogleOther)")).toBe(true);
        expect(isBotUserAgent("Storebot-Google/1.0")).toBe(true);
        expect(isBotUserAgent("APIs-Google (+https://developers.google.com/webmasters/APIs-Google.html)")).toBe(true);
        expect(isBotUserAgent("Mozilla/5.0 (compatible; Google-Read-Aloud)")).toBe(true);
        expect(isBotUserAgent("Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)")).toBe(true);
        expect(isBotUserAgent("Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)")).toBe(true);
        expect(isBotUserAgent("Mozilla/5.0 Chrome-Lighthouse")).toBe(true);
      });

      it("returns false for regular user agents", () => {
        expect(
          isBotUserAgent(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          )
        ).toBe(false);
        expect(
          isBotUserAgent(
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
          )
        ).toBe(false);
      });
    });

    describe("hasUserCompletedDna", () => {
      it("returns false when no completed flag or guest ticket in storage", () => {
        expect(hasUserCompletedDna()).toBe(false);
      });

      it("returns true when DNA_WELCOME_COMPLETED_KEY is 'true'", () => {
        localStorage.setItem(DNA_WELCOME_COMPLETED_KEY, "true");
        expect(hasUserCompletedDna()).toBe(true);
      });

      it("returns true when bs_reading_dna_ticket_guest exists in storage", () => {
        localStorage.setItem("bs_reading_dna_ticket_guest", JSON.stringify({ archetype: "The Architect" }));
        expect(hasUserCompletedDna()).toBe(true);
      });

      it("returns true when legacy bs_reading_dna_ticket exists in storage", () => {
        localStorage.setItem("bs_reading_dna_ticket", JSON.stringify({ archetype: "The Dreamer" }));
        expect(hasUserCompletedDna()).toBe(true);
      });

      it("returns true when ticket exists for specific userId", () => {
        localStorage.setItem("bs_reading_dna_ticket_user_42", JSON.stringify({ archetype: "The Scholar" }));
        expect(hasUserCompletedDna(42)).toBe(true);
      });

      it("returns true when any bs_reading_dna_ticket_user_ exists in storage as an extra safeguard", () => {
        localStorage.setItem("bs_reading_dna_ticket_user_99", JSON.stringify({ archetype: "The Critic" }));
        expect(hasUserCompletedDna()).toBe(true);
        expect(hasUserCompletedDna(123)).toBe(true);
      });
    });

    describe("isDismissedOnCooldown", () => {
      it("returns false when no cooldown is saved in localStorage", () => {
        expect(isDismissedOnCooldown()).toBe(false);
      });

      it("returns false when cooldown timestamp is invalid NaN or Infinity", () => {
        localStorage.setItem(DNA_WELCOME_DISMISSED_KEY, "invalid-timestamp");
        expect(isDismissedOnCooldown()).toBe(false);

        localStorage.setItem(DNA_WELCOME_DISMISSED_KEY, "Infinity");
        expect(isDismissedOnCooldown()).toBe(false);
      });

      it("returns true when cooldown timestamp is in the future", () => {
        const future = Date.now() + 100_000;
        localStorage.setItem(DNA_WELCOME_DISMISSED_KEY, String(future));
        expect(isDismissedOnCooldown()).toBe(true);
      });

      it("returns false when cooldown timestamp has already passed", () => {
        const past = Date.now() - 100_000;
        localStorage.setItem(DNA_WELCOME_DISMISSED_KEY, String(past));
        expect(isDismissedOnCooldown()).toBe(false);
      });
    });

    describe("isRouteBlocked and BLOCKED_ROUTE_PREFIXES", () => {
      it("includes forgot-password, reset-password, and oauth in BLOCKED_ROUTE_PREFIXES", () => {
        expect(BLOCKED_ROUTE_PREFIXES).toContain("/forgot-password");
        expect(BLOCKED_ROUTE_PREFIXES).toContain("/reset-password");
        expect(BLOCKED_ROUTE_PREFIXES).toContain("/oauth");
      });

      it("identifies blocked route prefixes correctly", () => {
        expect(isRouteBlocked("/reading-dna")).toBe(true);
        expect(isRouteBlocked("/reading-dna/test")).toBe(true);
        expect(isRouteBlocked("/admin")).toBe(true);
        expect(isRouteBlocked("/admin/users")).toBe(true);
        expect(isRouteBlocked("/auth")).toBe(true);
        expect(isRouteBlocked("/auth/login")).toBe(true);
        expect(isRouteBlocked("/forgot-password")).toBe(true);
        expect(isRouteBlocked("/reset-password")).toBe(true);
        expect(isRouteBlocked("/oauth")).toBe(true);
        expect(isRouteBlocked("/oauth/callback")).toBe(true);
        expect(isRouteBlocked("/rankings")).toBe(false);
        expect(isRouteBlocked("/")).toBe(false);
      });
    });
  });

  describe("useDnaWelcomeModal hook", () => {
    it("1. Opens after delay (default 3500ms) on a normal public route", () => {
      mockPathname = "/rankings";
      const { result } = renderHook(() => useDnaWelcomeModal());

      expect(result.current.isOpen).toBe(false);

      act(() => {
        vi.advanceTimersByTime(3499);
      });
      expect(result.current.isOpen).toBe(false);

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.isOpen).toBe(true);
    });

    it("2. Does NOT open if window.__PRERENDER__ === true", () => {
      window.__PRERENDER__ = true;
      mockPathname = "/rankings";
      const { result } = renderHook(() => useDnaWelcomeModal());

      act(() => {
        vi.advanceTimersByTime(10_000);
      });

      expect(result.current.isOpen).toBe(false);
    });

    it("3. Does NOT open on blocked routes: startsWith('/reading-dna'), startsWith('/admin'), startsWith('/auth'), startsWith('/forgot-password'), startsWith('/reset-password'), startsWith('/oauth'), startsWith('/books/'), startsWith('/blog/')", () => {
      const blockedRoutes = [
        "/reading-dna",
        "/reading-dna/test",
        "/admin",
        "/admin/books",
        "/auth",
        "/auth/login",
        "/forgot-password",
        "/reset-password",
        "/oauth",
        "/oauth/callback",
        "/books/1984",
        "/blog/kakoy-ya-chitatel",
      ];

      for (const route of blockedRoutes) {
        mockPathname = route;
        const { result, unmount } = renderHook(() => useDnaWelcomeModal());

        act(() => {
          vi.advanceTimersByTime(10_000);
        });

        expect(result.current.isOpen).toBe(false);
        unmount();
      }
    });

    it("4. Does NOT open if dismissed cooldown in localStorage (bs_dna_welcome_dismissed_until) is in the future", () => {
      mockPathname = "/collections";
      const futureCooldown = Date.now() + 500_000;
      localStorage.setItem(DNA_WELCOME_DISMISSED_KEY, String(futureCooldown));

      const { result } = renderHook(() => useDnaWelcomeModal());

      act(() => {
        vi.advanceTimersByTime(10_000);
      });

      expect(result.current.isOpen).toBe(false);
    });

    it("5. Does NOT open if completed in localStorage (bs_dna_welcome_completed === 'true' or ticket exists)", () => {
      // 5a. completed key set
      localStorage.setItem(DNA_WELCOME_COMPLETED_KEY, "true");
      mockPathname = "/";
      const { result: resultA, unmount: unmountA } = renderHook(() => useDnaWelcomeModal());

      act(() => {
        vi.advanceTimersByTime(10_000);
      });
      expect(resultA.current.isOpen).toBe(false);
      unmountA();

      // 5b. guest ticket set
      localStorage.clear();
      localStorage.setItem("bs_reading_dna_ticket_guest", JSON.stringify({ id: "guest_123" }));
      const { result: resultB, unmount: unmountB } = renderHook(() => useDnaWelcomeModal());

      act(() => {
        vi.advanceTimersByTime(10_000);
      });
      expect(resultB.current.isOpen).toBe(false);
      unmountB();

      // 5c. user ticket set with userId option
      localStorage.clear();
      localStorage.setItem("bs_reading_dna_ticket_user_77", JSON.stringify({ id: "user_77" }));
      const { result: resultC, unmount: unmountC } = renderHook(() => useDnaWelcomeModal({ userId: 77 }));

      act(() => {
        vi.advanceTimersByTime(10_000);
      });
      expect(resultC.current.isOpen).toBe(false);
      unmountC();
    });

    it("6. handleDismiss closes modal and saves timestamp (now + 14 days) in bs_dna_welcome_dismissed_until", () => {
      mockPathname = "/";
      const { result } = renderHook(() => useDnaWelcomeModal());

      act(() => {
        vi.advanceTimersByTime(3500);
      });
      expect(result.current.isOpen).toBe(true);

      const beforeDismissNow = Date.now();
      act(() => {
        result.current.handleDismiss();
      });

      expect(result.current.isOpen).toBe(false);

      const savedTimestamp = Number(localStorage.getItem(DNA_WELCOME_DISMISSED_KEY));
      const expectedTimestamp = beforeDismissNow + 14 * 24 * 60 * 60 * 1000;
      expect(savedTimestamp).toBe(expectedTimestamp);
    });

    it("7. handleAccept closes modal, saves 'true' in bs_dna_welcome_completed, and navigates to '/reading-dna?tab=test'", () => {
      mockPathname = "/";
      const { result } = renderHook(() => useDnaWelcomeModal());

      act(() => {
        vi.advanceTimersByTime(3500);
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.handleAccept();
      });

      expect(result.current.isOpen).toBe(false);
      expect(localStorage.getItem(DNA_WELCOME_COMPLETED_KEY)).toBe("true");
      expect(mockNavigate).toHaveBeenCalledWith("/reading-dna?tab=test");
    });

    it("8. Clears the timer on unmount and prevents state update", () => {
      mockPathname = "/";
      const { result, unmount } = renderHook(() => useDnaWelcomeModal());

      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(result.current.isOpen).toBe(false);

      unmount();

      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(result.current.isOpen).toBe(false);
    });

    it("9. Resets isOpenState when pathname changes", () => {
      mockPathname = "/";
      const { result, rerender } = renderHook(() => useDnaWelcomeModal());

      act(() => {
        vi.advanceTimersByTime(3500);
      });
      expect(result.current.isOpen).toBe(true);

      // Navigate to another page
      mockPathname = "/books";
      rerender();

      expect(result.current.isOpen).toBe(false);
    });
  });
});
