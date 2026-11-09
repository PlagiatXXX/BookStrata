import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFeedbackPrompt, STORAGE_KEY } from "./useFeedbackPrompt";
import * as feedbackApi from "@/lib/feedbackApi";

// Мокаем зависимости
vi.mock("@/lib/feedbackApi", () => ({
  sendFeedback: vi.fn().mockResolvedValue({ id: 1 }),
  dismissFeedbackPrompt: vi.fn().mockResolvedValue({ success: true }),
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

  it("does not open if localStorage already has dismissed flag", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ status: "dismissed" }));
    const { result } = renderHook(() => useFeedbackPrompt());

    act(() => {
      vi.advanceTimersByTime(400_000);
    });

    expect(result.current.isOpen).toBe(false);
  });

  it("does not open if user profile already has feedbackDismissedAt", () => {
    mockUser = { userId: 1, username: "olduser", feedbackDismissedAt: "2026-01-01T00:00:00Z" };
    const { result } = renderHook(() => useFeedbackPrompt());

    act(() => {
      vi.advanceTimersByTime(400_000);
    });

    expect(result.current.isOpen).toBe(false);
  });

  it("does not open while on excluded routes like /auth or /editor", () => {
    mockPathname = "/auth";
    const { result } = renderHook(() => useFeedbackPrompt());

    act(() => {
      vi.advanceTimersByTime(400_000);
    });

    expect(result.current.isOpen).toBe(false);
  });

  it("opens after 2.5 minutes for an existing user (registered > 3 days ago)", () => {
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString();
    mockUser = { userId: 2, username: "veteran", createdAt: fourDaysAgo, feedbackDismissedAt: null };

    const { result } = renderHook(() => useFeedbackPrompt());

    expect(result.current.isOpen).toBe(false);

    // До истечения 150с не открывается
    act(() => {
      vi.advanceTimersByTime(140_000);
    });
    expect(result.current.isOpen).toBe(false);

    // Спустя 150с открывается
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(result.current.isOpen).toBe(true);
  });

  it("handleDismiss closes the prompt, sets localStorage and calls API for logged in user", async () => {
    mockUser = { userId: 5, username: "fedor", feedbackDismissedAt: null };
    const { result } = renderHook(() => useFeedbackPrompt());

    // Открываем принудительно или через таймер
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
  });

  it("handleSubmit sends survey feedback and marks as submitted", async () => {
    mockUser = { userId: 5, username: "fedor", feedbackDismissedAt: null };
    const { result } = renderHook(() => useFeedbackPrompt());

    act(() => {
      result.current.openForTesting?.();
    });

    await act(async () => {
      await result.current.handleSubmit({ rating: "great", message: "Отличный сайт!" });
    });

    expect(feedbackApi.sendFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "survey",
        rating: "great",
        message: "Отличный сайт!",
      })
    );
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"status":"submitted"');
  });
});
