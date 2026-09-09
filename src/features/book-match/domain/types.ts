// src/features/book-match/domain/types.ts
// Reading Match — доменные типы движка совместимости читателя и книги.
// Domain layer: не зависит от React, DOM или Framer Motion.

/** Оси совместимости (唯一 — без дублирования). */
export type MatchAxis = "storyFocus" | "emotionalWeight" | "pace" | "darkness" | "scope" | "complexity";

/** Веса осей в формуле Match Score. Сумма = 1.0. */
export const AXIS_WEIGHTS: Record<MatchAxis, number> = {
  storyFocus:      0.20,
  emotionalWeight: 0.20,
  pace:            0.15,
  darkness:        0.15,
  scope:           0.15,
  complexity:      0.15,
};

/** Snap-точки для UI-слайдеров (11 состояний). */
export const SNAP_POINTS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;

/** Профиль книги — нормализованные значения по 6 осям (0–100). */
export interface ReadingProfile {
  storyFocus: number;
  emotionalWeight: number;
  pace: number;
  darkness: number;
  scope: number;
  complexity: number;

  /** Уверенность в данных по каждой оси (0–1). Для админки, не для Match Score. */
  confidence: {
    storyFocus: number;
    emotionalWeight: number;
    pace: number;
    darkness: number;
    scope: number;
    complexity: number;
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
  scope?: number;
  complexity?: number;
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
  scope:           { left: "Камерное", right: "Эпическое" },
  complexity:      { left: "Доступное", right: "Многослойное" },
};

/** Рубрики осей — диапазоны 0–100 с описанием зоны (для UI-подсказок). */
export interface RubricRow {
  min: number;
  max: number;
  label: string;
}

export const AXIS_RUBRICS: Record<MatchAxis, RubricRow[]> = {
  storyFocus: [
    { min: 0, max: 20, label: "Чистый экшн. Погони, интриги, twist за twist." },
    { min: 20, max: 40, label: "Сюжет ведёт, но есть место для дыхания." },
    { min: 40, max: 60, label: "Баланс. События и внутренний мир чередуются." },
    { min: 60, max: 80, label: "Рефлексия доминирует. События — повод для размышлений." },
    { min: 80, max: 100, label: "Чистая интроспекция. Поток сознания, эссеистика." },
  ],
  emotionalWeight: [
    { min: 0, max: 20, label: "Воздушное чтиво. Комедия, уют, лёгкость." },
    { min: 20, max: 40, label: "Мягкое. Есть грусть, но без надавливания." },
    { min: 40, max: 60, label: "Средний вес. Бывают и радость, и боль." },
    { min: 60, max: 80, label: "Тяжело. Боль, потеря, экзистенциальный кризис." },
    { min: 80, max: 100, label: "Надрыв. Катарсис через страдание." },
  ],
  pace: [
    { min: 0, max: 20, label: "Стрелочная скорость. Главы по 5 страниц." },
    { min: 20, max: 40, label: "Быстрое чтение. Динамичное, но не истеричное." },
    { min: 40, max: 60, label: "Размеренное. Средний темп." },
    { min: 60, max: 80, label: "Неторопливое. Длинные описания, паузы." },
    { min: 80, max: 100, label: "Медитативное. Каждое предложение — мир." },
  ],
  darkness: [
    { min: 0, max: 20, label: "Максимально светлое. Надежда, добро, порядок." },
    { min: 20, max: 40, label: "Преимущественно тёплое. Есть тревога, но свет побеждает." },
    { min: 40, max: 60, label: "Нейтрально-серое. Жизнь как она есть." },
    { min: 60, max: 80, label: "Преимущественно тёмное. Атмосфера тревоги, одиночества." },
    { min: 80, max: 100, label: "Максимально тёмное. Безысходность, абсурд, нигилизм." },
  ],
  scope: [
    { min: 0, max: 20, label: "Камерное. Одна комната, одна семья, локальный масштаб." },
    { min: 20, max: 40, label: "Небольшой мир. Узкий круг персонажей, локальный конфликт." },
    { min: 40, max: 60, label: "Средний масштаб. Несколько локаций, развёрнутый сюжет." },
    { min: 60, max: 80, label: "Широкий мир. Много персонажей, масштабные события." },
    { min: 80, max: 100, label: "Эпическое. Галактики, империи, десятки фракций и поколений." },
  ],
  complexity: [
    { min: 0, max: 20, label: "Доступное. Простой синтаксис, «проглатывается за вечер»." },
    { min: 20, max: 40, label: "Лёгкое чтение. Несложный язык, но интересная подача." },
    { min: 40, max: 60, label: "Средняя сложность. Есть стилистика, но без перегруза." },
    { min: 60, max: 80, label: "Многослойное. Богатая стилистика, метафоры, интертекст." },
    { min: 80, max: 100, label: "Высокая сложность. Модернистская форма, экспериментальный язык." },
  ],
};

/** Возвращает описание зоны по значению оси (0–100). */
export function getRubricLabel(axis: MatchAxis, value: number): string {
  const rubrics = AXIS_RUBRICS[axis];
  for (const row of rubrics) {
    if (value >= row.min && value <= row.max) return row.label;
  }
  return rubrics[rubrics.length - 1].label;
}

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
    scope:           { right: "эпичнее", left: "камернее" },
    complexity:      { right: "сложнее", left: "проще" },
  };

  const dir = axisDir[axis][direction];

  if (absDiff < 10) return "почти идеально";
  if (absDiff < 20) return "хорошее совпадение";
  if (absDiff < 30) return `книга ${dir}`;
  if (absDiff < 40) return `книга заметно ${dir}`;
  return `книга значительно ${dir}`;
}
