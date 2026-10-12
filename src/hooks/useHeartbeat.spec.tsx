import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

// Управляемый мок: значение токена в «памяти» (inMemoryToken)
let memoryToken: string | null = null;

vi.mock("@/lib/authApi", () => ({
  getAuthToken: () => memoryToken,
}));

vi.mock("@/lib/api-client", () => ({
  api: { post: vi.fn().mockResolvedValue({ ok: true }) },
}));

vi.mock("@/lib/analyticsApi", () => ({
  apiTrackEvent: vi.fn().mockResolvedValue(undefined),
}));

import { api } from "@/lib/api-client";
import { useHeartbeat } from "./useHeartbeat";

const apiPost = vi.mocked(api.post);

describe("useHeartbeat", () => {
  beforeEach(() => {
    memoryToken = null;
    apiPost.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("шлёт heartbeat сразу при монтировании, если токен уже в памяти", () => {
    memoryToken = "jwt-token";

    renderHook(() => useHeartbeat());

    expect(apiPost).toHaveBeenCalledWith("/users/heartbeat");
  });

  it("НЕ шлёт heartbeat без токена", () => {
    renderHook(() => useHeartbeat());

    vi.advanceTimersByTime(180_000);

    expect(apiPost).not.toHaveBeenCalled();
  });

  it("шлёт heartbeat через минуту, если токен появился в памяти ПОСЛЕ монтирования без перерендера", () => {
    // Регрессия React Compiler: при первом рендере токена в памяти нет
    // (restoreSession ещё не завершился), и memo-кэш замораживает null.
    // После refresh токен появляется без ререндера AuthProvider.
    renderHook(() => useHeartbeat());

    expect(apiPost).not.toHaveBeenCalled();

    memoryToken = "jwt-token-restored-later";

    vi.advanceTimersByTime(60_000);

    expect(apiPost).toHaveBeenCalledWith("/users/heartbeat");
  });

  it("шлёт heartbeat при скрытии страницы", () => {
    memoryToken = "jwt-token";

    renderHook(() => useHeartbeat());
    apiPost.mockClear();

    Object.defineProperty(document, "visibilityState", {
      writable: true,
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(apiPost).toHaveBeenCalledWith("/users/heartbeat");

    Object.defineProperty(document, "visibilityState", {
      writable: true,
      configurable: true,
      value: "visible",
    });
  });

  it("не шлёт heartbeat по интервалу, пока страница скрыта", () => {
    memoryToken = "jwt-token";

    renderHook(() => useHeartbeat());
    apiPost.mockClear();

    Object.defineProperty(document, "visibilityState", {
      writable: true,
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange")); // один heartbeat на закрытие
    apiPost.mockClear();

    vi.advanceTimersByTime(180_000);

    expect(apiPost).not.toHaveBeenCalled();

    Object.defineProperty(document, "visibilityState", {
      writable: true,
      configurable: true,
      value: "visible",
    });
  });
});
