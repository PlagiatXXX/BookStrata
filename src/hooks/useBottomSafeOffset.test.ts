// src/hooks/useBottomSafeOffset.test.ts
// Хук нужен ТОЛЬКО для iOS: там клавиатура сжимает visualViewport, не меняя layout viewport,
// и fixed-элементы уезжают под клавиатуру. На Android сжатие visualViewport — это URL-бар
// при скролле (он не перекрывает контент), и подъём fixed-тулбара давал «подвешивание».
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useBottomSafeOffset } from "./useBottomSafeOffset";

type ViewportMock = {
  ua?: string;
  platform?: string;
  maxTouchPoints?: number;
  innerHeight: number;
  vvHeight: number;
};

function stubViewport({ ua, platform = "Linux armv8l", maxTouchPoints = 5, innerHeight, vvHeight }: ViewportMock) {
  vi.stubGlobal("innerHeight", innerHeight);
  vi.stubGlobal(
    "visualViewport",
    {
      height: vvHeight,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  );
  vi.stubGlobal("navigator", {
    userAgent: ua,
    platform,
    maxTouchPoints,
  });
}

describe("useBottomSafeOffset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("iOS: клавиатура сжала visualViewport → offset положительный (тулбар поднимается над клавиатурой)", async () => {
    stubViewport({ ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", innerHeight: 800, vvHeight: 500 });

    const { result } = renderHook(() => useBottomSafeOffset());

    await waitFor(() => {
      expect(result.current).toBe(300);
    });
  });

  it("iOS: вьюпорт не сжат → offset 0", async () => {
    stubViewport({ ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", innerHeight: 800, vvHeight: 800 });

    const { result } = renderHook(() => useBottomSafeOffset());

    await waitFor(() => {
      expect(result.current).toBe(0);
    });
  });

  it("Android: URL-бар сжал visualViewport при скролле → offset 0 (не подвешиваем тулбар)", async () => {
    stubViewport({ ua: "Mozilla/5.0 (Linux; Android 14; SM-S901B) Chrome/126.0.0.0 Mobile", innerHeight: 800, vvHeight: 500 });

    const { result } = renderHook(() => useBottomSafeOffset());

    await waitFor(() => {
      expect(result.current).toBe(0);
    });
  });

  it("десктоп: нет visualViewport → offset 0", async () => {
    vi.stubGlobal("innerHeight", 900);
    vi.stubGlobal("visualViewport", undefined);
    vi.stubGlobal("navigator", { userAgent: "Chrome/126.0.0.0", platform: "MacIntel", maxTouchPoints: 0 });

    const { result } = renderHook(() => useBottomSafeOffset());

    await waitFor(() => {
      expect(result.current).toBe(0);
    });
  });

  it("iPadOS 13+ (MacIntel + touch): считается как iOS", async () => {
    stubViewport({ ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15", platform: "MacIntel", maxTouchPoints: 5, innerHeight: 834, vvHeight: 500 });

    const { result } = renderHook(() => useBottomSafeOffset());

    await waitFor(() => {
      expect(result.current).toBe(334);
    });
  });
});
