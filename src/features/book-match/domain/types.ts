// src/features/book-match/domain/types.ts
// Reading Match — доменные типы движка совместимости читателя и книги.
// Domain layer: не зависит от React, DOM или Framer Motion.

/** Оси совместимости (唯一 — без дублирования). */
export type MatchAxis = "storyFocus" | "emotionalWeight" | "pace" | "darkness";

/** Веса осей в формуле Match Score. Сумма = 1.0. */
export const AXIS_WEIGHTS: Record<MatchAxis, number> = {
  storyFocus:      0.25,
  emotionalWeight: 0.30,
  pace:            0.20,
  darkness:        0.25,
};

/** Snap-точки для UI-слайдеров (11 состояний). */
export const SNAP_POINTS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;

/** Профиль книги — нормализованные значения по 4 осям (0–100). */
export interface ReadingProfile {
  storyFocus: number;
  emotionalWeight: number;
  pace: number;
  darkness: number;

  /** Уверенность в данных по каждой оси (0–1). Для админки, не для Match Score. */
  confidence: {
    storyFocus: number;
    emotionalWeight: number;
    pace: number;
    darkness: number;
  };

  /** Источник данных. */
  source: "ai" | "manual" | "calibrated";
}

/** Настроение пользователя — все поля optional. */
export interface UserMood {
  storyFocus?: number;
  emotionalWeight?: number;
  pace?: number;
  darkness?: number;
}

/** Уровень совместимости. */
export type MatchLevelLabel =
  | "ПОПАЛО В ТОЧКУ"
  | "ПОХОЖЕ, ЭТО ТВОЁ"
  | "МОЖЕТ СРАБОТАТЬ"
  | "СОМНИТЕЛЬНО"
  | "НЕ СЕЙЧАС";

export interface MatchLevel {
  label: MatchLevelLabel;
  color: "emerald" | "amber" | "rose";
  range: string;
}

/** Разница по одной оси. */
export interface AxisDiff {
  axis: MatchAxis;
  label: string;
  userValue: number;
  bookValue: number;
  /** bookValue - userValue. Положительное = книга выше по оси. */
  diff: number;
  /** Разница по модулю. */
  absDiff: number;
  /** Направление расхождения (человеческое описание). */
  direction: string;
}

/** Результат сравнения. */
export interface MatchResult {
  score: number;
  level: MatchLevel;
  activeAxesCount: number;
  diffs: AxisDiff[];
  matches: AxisDiff[];
  mismatches: AxisDiff[];
}

/** Snap значение — ближайшая snap-точка. */
export function snapValue(value: number): number {
  let closest: number = SNAP_POINTS[0];
  let minDist = Math.abs(value - closest);
  for (const point of SNAP_POINTS) {
    const dist = Math.abs(value - point);
    if (dist < minDist) {
      closest = point;
      minDist = dist;
    }
  }
  return closest;
}

/** Человеческие названия осей (для UI). */
export const AXIS_LABELS: Record<MatchAxis, { left: string; right: string }> = {
  storyFocus:      { left: "Сюжет", right: "Рефлексия" },
  emotionalWeight: { left: "Легко", right: "Тяжело" },
  pace:            { left: "Быстро", right: "Погружение" },
  darkness:        { left: "Светло", right: "Мрачно" },
};

/** Описание расхождения по оси (направление + величина). */
export function describeAxisDiff(diff: AxisDiff): string {
  const { axis, absDiff, diff: signedDiff } = diff;

  const direction = signedDiff > 0 ? "right" : "left";

  // Направление: книга vs пользователь
  const axisDir: Record<MatchAxis, { right: string; left: string }> = {
    storyFocus:      { right: "более рефлексивная", left: "более сюжетная" },
    emotionalWeight: { right: "тяжелее", left: "легче" },
    pace:            { right: "медленнее", left: "быстрее" },
    darkness:        { right: "мрачнее", left: "светлее" },
  };

  const dir = axisDir[axis][direction];

  if (absDiff < 10) return "почти идеально";
  if (absDiff < 20) return "хорошее совпадение";
  if (absDiff < 30) return `книга ${dir}`;
  if (absDiff < 40) return `книга заметно ${dir}`;
  return `книга значительно ${dir}`;
}
