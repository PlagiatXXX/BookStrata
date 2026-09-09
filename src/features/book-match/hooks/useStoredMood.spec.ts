import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  MOOD_STORAGE_KEY,
  readStoredMood,
  writeStoredMood,
  clearStoredMood,
  useStoredMood,
} from "./useStoredMood";

describe("readStoredMood / writeStoredMood (чистые функции)", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("write → read возвращает записанное (перезапись целиком)", () => {
    writeStoredMood({ darkness: 90 });
    writeStoredMood({ storyFocus: 20, pace: 80 }); // перезаписывает прошлое
    expect(readStoredMood()).toEqual({ storyFocus: 20, pace: 80 });
    expect(readStoredMood().darkness).toBeUndefined();
  });

  it("read пустого/битого JSON → {}", () => {
    expect(readStoredMood()).toEqual({});
    localStorage.setItem(MOOD_STORAGE_KEY, "{не json");
    expect(readStoredMood()).toEqual({});
  });

  it("read отбрасывает невалидные оси и лишние ключи", () => {
    localStorage.setItem(
      MOOD_STORAGE_KEY,
      JSON.stringify({ darkness: 50, hackerKey: 1, storyFocus: "много" }),
    );
    expect(readStoredMood()).toEqual({ darkness: 50 });
  });

  it("clear удаляет значение", () => {
    writeStoredMood({ pace: 60 });
    clearStoredMood();
    expect(readStoredMood()).toEqual({});
  });

  it("write с пустым mood тоже перезаписывает (сброс до пустоты)", () => {
    writeStoredMood({ darkness: 90 });
    writeStoredMood({});
    expect(readStoredMood()).toEqual({});
  });

  it("read сохраняет scope и complexity (6 осей)", () => {
    writeStoredMood({ storyFocus: 20, darkness: 70, scope: 50, complexity: 80 });
    const mood = readStoredMood();
    expect(mood.scope).toBe(50);
    expect(mood.complexity).toBe(80);
    expect(mood.storyFocus).toBe(20);
    expect(mood.darkness).toBe(70);
  });
});

// Семантика перезаписи (не «чинить»!): writeStoredMood(next) / updateMood(next)
// сохраняет ровно next — полное затирание прошлого. Частичную смену одной оси
// (с сохранением прочих) обеспечивает вызывающий — BookMatch шлёт
// { ...userMood, [axis]: value }. Тест ниже проверяет низкоуровневый контракт.

describe("useStoredMood (хук)", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("инициализируется из localStorage", () => {
    writeStoredMood({ darkness: 80, pace: 20 });
    const { result } = renderHook(() => useStoredMood());
    expect(result.current.mood).toEqual({ darkness: 80, pace: 20 });
  });

  it("updateMood обновляет state и localStorage (перезапись)", () => {
    const { result } = renderHook(() => useStoredMood());
    act(() => result.current.updateMood({ darkness: 40 }));
    act(() => result.current.updateMood({ storyFocus: 10 }));
    expect(result.current.mood).toEqual({ storyFocus: 10 });
    expect(readStoredMood()).toEqual({ storyFocus: 10 });
  });

  it("resetMood чистит state и localStorage", () => {
    writeStoredMood({ darkness: 80 });
    const { result } = renderHook(() => useStoredMood());
    act(() => result.current.resetMood());
    expect(result.current.mood).toEqual({});
    expect(readStoredMood()).toEqual({});
  });
});
