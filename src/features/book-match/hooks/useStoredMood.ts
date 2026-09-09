// src/features/book-match/hooks/useStoredMood.ts
// Persistance настроения читателя: localStorage — единственный источник правды
// между страницами. Движение слайдера перезаписывает значение оси
// (вызывающий формирует { ...userMood, [axis]: value }), сброс — удаляет ключ.
import { useState } from "react";
import type { UserMood } from "../domain/types";

export const MOOD_STORAGE_KEY = "bookstrata:mood";

const VALID_AXES = ["storyFocus", "emotionalWeight", "pace", "darkness", "scope", "complexity"] as const;

/** Читает mood из localStorage. Битый JSON / лишние ключи → {}. */
export function readStoredMood(): UserMood {
  try {
    const raw = localStorage.getItem(MOOD_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};

    const mood: UserMood = {};
    for (const axis of VALID_AXES) {
      const val = (parsed as Record<string, unknown>)[axis];
      if (typeof val === "number" && Number.isFinite(val)) {
        mood[axis] = val;
      }
    }
    return mood;
  } catch {
    return {};
  }
}

/** Перезаписывает сохранённый mood целиком. */
export function writeStoredMood(mood: UserMood): void {
  try {
    localStorage.setItem(MOOD_STORAGE_KEY, JSON.stringify(mood));
  } catch {
    // localStorage недоступен (приват-режим) — тихо живём без persistance
  }
}

/** Удаляет сохранённый mood. */
export function clearStoredMood(): void {
  try {
    localStorage.removeItem(MOOD_STORAGE_KEY);
  } catch {
    // игнорируем
  }
}

/** React-обёртка: state синхронизирован с localStorage. */
export function useStoredMood() {
  const [mood, setMood] = useState<UserMood>(readStoredMood);

  const updateMood = (next: UserMood) => {
    setMood(next);
    writeStoredMood(next);
  };

  const resetMood = () => {
    setMood({});
    clearStoredMood();
  };

  return { mood, updateMood, resetMood };
}
