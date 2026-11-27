import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFeedbackPrompt, STORAGE_KEY } from "./useFeedbackPrompt";
import * as feedbackApi from "@/lib/feedbackApi";
import * as analyticsApi from "@/lib/analyticsApi";

// Мокаем зависимости
vi.mock("@/lib/feedbackApi", () => ({
  sendFeedback: vi.fn().mockResolvedValue({ id: 1 }),
  dismissFeedbackPrompt: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/analyticsApi", () => ({
  apiTrackEvent: vi.fn(),
}));

let mockPathname = "/rankings";
vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: mockPathname }),
}));

let mockUser: any = null;
vi.mock("@/hooks/useAuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

describe("useFeedbackPrompt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    mockPathname = "/rankings";
    mockUser = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not open if localStorage dismissed flag is within 30-day cooldown", () => {
    const fiveDaysAgo = Date.now() - 5 * 24 * 3600 * 1000;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ status: "dismissed", timestamp: fiveDaysAgo }));
    const { result } = renderHook(() => useFeedbackPrompt());

    act(() => {
      vi.advanceTimersByTime(400_000);
    });

    expect(result.current.isOpen).toBe(false);
  });

  it("opens if localStorage dismissed flag has expired after 30-day cooldown", () => {
    const thirtyFiveDaysAgo = Date.now() - 35 * 24 * 3600 * 1000;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ status: "dismissed", timestamp: thirtyFiveDaysAgo }));
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString();
    mockUser = { userId: 2, username: "veteran", createdAt: fourDaysAgo, feedbackDismissedAt: null };

    const { result } = renderHook(() => useFeedbackPrompt());

    act(() => {
      vi.advanceTimersByTime(65_000);
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("does not open if user profile feedbackDismissedAt is within 30 days", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString();
    mockUser = { userId: 1, username: "olduser", feedbackDismissedAt: tenDaysAgo };
    const { result } = renderHook(() => useFeedbackPrompt());

    act(() => {
      vi.advanceTimersByTime(400_000);
    });

    expect(result.current.isOpen).toBe(false);
  });

  it("opens if user profile feedbackDismissedAt was more than 30 days ago", () => {
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString();
    mockUser = { userId: 1, username: "olduser", createdAt: fortyDaysAgo, feedbackDismissedAt: fortyDaysAgo };
    const { result } = renderHook(() => useFeedbackPrompt());

    act(() => {
      vi.advanceTimersByTime(65_000);
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("does not open while on excluded routes like /auth or /editor", () => {
    mockPathname = "/auth";
    const { result } = renderHook(() => useFeedbackPrompt());

    act(() => {
      vi.advanceTimersByTime(400_000);
    });

    expect(result.current.isOpen).toBe(false);
  });

  it("opens after 60 seconds for an existing user (registered > 3 days ago) and tracks shown event", () => {
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString();
    mockUser = { userId: 2, username: "veteran", createdAt: fourDaysAgo, feedbackDismissedAt: null };

    const { result } = renderHook(() => useFeedbackPrompt());

    expect(result.current.isOpen).toBe(false);

    // До 60 секунд не открывается
    act(() => {
      vi.advanceTimersByTime(55_000);
    });
    expect(result.current.isOpen).toBe(false);

    // Спустя 60с открывается
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.isOpen).toBe(true);
    expect(analyticsApi.apiTrackEvent).toHaveBeenCalledWith(
      "feedback.prompt_shown",
      expect.objectContaining({ isOldUser: true })
    );
  });

  it("handleDismiss closes the prompt, sets localStorage and calls API & analytics", async () => {
    mockUser = { userId: 5, username: "fedor", feedbackDismissedAt: null };
    const { result } = renderHook(() => useFeedbackPrompt());

    act(() => {
      result.current.openForTesting?.();
    });
    expect(result.current.isOpen).toBe(true);

    await act(async () => {
      result.current.handleDismiss();
    });

    expect(result.current.isOpen).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"status":"dismissed"');
    expect(feedbackApi.dismissFeedbackPrompt).toHaveBeenCalled();
    expect(analyticsApi.apiTrackEvent).toHaveBeenCalledWith(
      "feedback.prompt_dismissed",
      expect.any(Object)
    );
  });

  it("handleSubmit sends survey feedback and marks as submitted with analytics", async () => {
    mockUser = { userId: 5, username: "fedor", feedbackDismissedAt: null };
    const { result } = renderHook(() => useFeedbackPrompt());

    act(() => {
      result.current.openForTesting?.();
    });

    await act(async () => {
      await result.current.handleSubmit({ rating: 5, message: "Отличный сайт!" });
    });

    expect(feedbackApi.sendFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "survey",
        rating: 5,
        message: "Отличный сайт!",
      })
    );
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"status":"submitted"');
    expect(analyticsApi.apiTrackEvent).toHaveBeenCalledWith(
      "feedback.prompt_submitted",
      expect.objectContaining({ rating: 5, hasMessage: true })
    );
  });
});
