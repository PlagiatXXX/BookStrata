import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

const sendPresencePingMock = vi.fn().mockResolvedValue(undefined);
const sendPresenceLeaveMock = vi.fn();

vi.mock("@/lib/presenceApi", () => ({
  sendPresencePing: (...args: unknown[]) => sendPresencePingMock(...args),
  sendPresenceLeave: (...args: unknown[]) => sendPresenceLeaveMock(...args),
}));

vi.mock("@/lib/analyticsIdentity", () => ({
  getAnonymousId: () => "anon-test-1",
}));

import { usePresence } from "./usePresence";

describe("usePresence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-27T10:00:00.000Z"));
    Object.defineProperty(document, "visibilityState", {
      writable: true,
      configurable: true,
      value: "visible",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("отправляет active ping сразу при монтировании, когда auth разрешился", () => {
    renderHook(() => usePresence({ pathname: "/books/dune", userId: 42, isAuthLoading: false }));

    expect(sendPresencePingMock).toHaveBeenCalledTimes(1);
    expect(sendPresencePingMock).toHaveBeenCalledWith({
      anonId: "anon-test-1",
      page: "/books/dune",
      status: "active",
    });
  });

  it("не шлёт ping пока идёт restoreSession (isAuthLoading = true), но шлёт сразу после завершения", () => {
    const { rerender } = renderHook(
      ({ isAuthLoading, userId }) =>
        usePresence({ pathname: "/", userId, isAuthLoading }),
      { initialProps: { isAuthLoading: true, userId: null as number | null } },
    );

    expect(sendPresencePingMock).not.toHaveBeenCalled();

    rerender({ isAuthLoading: false, userId: 15 });
    expect(sendPresencePingMock).toHaveBeenCalledTimes(1);
    expect(sendPresencePingMock).toHaveBeenCalledWith({
      anonId: "anon-test-1",
      page: "/",
      status: "active",
    });
  });

  it("НЕ шлёт ping при скрытии вкладки (visibilitychange -> hidden) и в скрытом состоянии", () => {
    renderHook(() => usePresence({ pathname: "/", userId: 1, isAuthLoading: false }));
    sendPresencePingMock.mockClear();

    Object.defineProperty(document, "visibilityState", {
      writable: true,
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(120_000);

    expect(sendPresencePingMock).not.toHaveBeenCalled();
  });

  it("переходит в status=idle через 90с без действий пользователя", () => {
    renderHook(() => usePresence({ pathname: "/", userId: 1, isAuthLoading: false }));
    sendPresencePingMock.mockClear();

    // Через 95 секунд бездействия следующий тик шлёт idle
    vi.advanceTimersByTime(95_000);
    expect(sendPresencePingMock).toHaveBeenLastCalledWith({
      anonId: "anon-test-1",
      page: "/",
      status: "idle",
    });

    // Пользователь кликнул — мгновенный переход обратно в active
    sendPresencePingMock.mockClear();
    window.dispatchEvent(new Event("pointerdown"));
    expect(sendPresencePingMock).toHaveBeenCalledWith({
      anonId: "anon-test-1",
      page: "/",
      status: "active",
    });
  });

  it("шлёт leave при pagehide последней вкладки", () => {
    renderHook(() => usePresence({ pathname: "/books/1984", userId: 5, isAuthLoading: false }));

    window.dispatchEvent(new Event("pagehide"));
    expect(sendPresenceLeaveMock).toHaveBeenCalledWith("anon-test-1");
  });
});
