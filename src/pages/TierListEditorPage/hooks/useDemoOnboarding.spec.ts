import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDemoOnboarding } from "./useDemoOnboarding";

const SEEN_KEY = "bookstrata_demo_onboarding_seen";

describe("useDemoOnboarding", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("не показывает тур вне демо-режима и не ставит флаг", () => {
    const { result } = renderHook(() => useDemoOnboarding(false));
    expect(result.current.step).toBeNull();
    expect(localStorage.getItem(SEEN_KEY)).toBeNull();
  });

  it("показывает тур в демо-режиме, если флаг ещё не установлен", () => {
    const { result } = renderHook(() => useDemoOnboarding(true));
    expect(result.current.step).toBe(0);
  });

  it("тур показывается один раз: показ сразу помечается флагом", () => {
    renderHook(() => useDemoOnboarding(true));
    expect(localStorage.getItem(SEEN_KEY)).toBe("1");
  });

  it("не показывает тур повторно, если флаг уже установлен", () => {
    localStorage.setItem(SEEN_KEY, "1");
    const { result } = renderHook(() => useDemoOnboarding(true));
    expect(result.current.step).toBeNull();
  });

  it("флаг переживает размонтирование: после показа тур не появляется при новом визите", () => {
    // Первый визит — тур показан (флаг установлен)
    const first = renderHook(() => useDemoOnboarding(true));
    expect(first.result.current.step).toBe(0);
    first.unmount();

    // Второй визит (как после навигации по сайту) — тур скрыт
    const second = renderHook(() => useDemoOnboarding(true));
    expect(second.result.current.step).toBeNull();
  });

  it("next проходит по шагам 0→1→2→3 и закрывает тур на последнем", () => {
    const { result } = renderHook(() => useDemoOnboarding(true));

    act(() => result.current.next());
    expect(result.current.step).toBe(1);

    act(() => result.current.next());
    expect(result.current.step).toBe(2);

    act(() => result.current.next());
    expect(result.current.step).toBe(3);

    // Клик по «Начать!» закрывает тур
    act(() => result.current.next());
    expect(result.current.step).toBeNull();
  });

  it("skip закрывает тур немедленно", () => {
    const { result } = renderHook(() => useDemoOnboarding(true));

    act(() => result.current.skip());
    expect(result.current.step).toBeNull();
  });
});