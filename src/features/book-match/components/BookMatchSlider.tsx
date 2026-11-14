// src/features/book-match/components/BookMatchSlider.tsx
// Один слайдер оси совместимости: пружинный JellySlider со snap-точками.
// Доменный слой не зависит от этого компонента.

import { useCallback } from "react";
import type { MatchAxis } from "../domain/types";
import { AXIS_LABELS, SNAP_POINTS, getRubricLabel } from "../domain/types";
import { JellySlider } from "@/components/JellySlider/JellySlider";

interface BookMatchSliderProps {
  axis: MatchAxis;
  value: number | undefined;
  onChange: (axis: MatchAxis, value: number) => void;
}

/** Snap к ближайшей точке. */
function snap(value: number): number {
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

export function BookMatchSlider({ axis, value, onChange }: BookMatchSliderProps) {
  const labels = AXIS_LABELS[axis];
  const isActive = value !== undefined;
  const currentVal = value ?? 50;

  const handleChange = useCallback(
    (v: number) => {
      onChange(axis, snap(v));
    },
    [axis, onChange]
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Метки полюсов оси */}
      <div className="flex items-center justify-between text-xs">
        <span
          className={`transition-colors duration-200 ${
            isActive && currentVal <= 30 ? "text-white font-semibold" : "text-white/70"
          }`}
        >
          {labels.left}
        </span>
        <span
          className={`transition-colors duration-200 ${
            isActive && currentVal >= 70 ? "text-white font-semibold" : "text-white/70"
          }`}
        >
          {labels.right}
        </span>
      </div>

      {/* Jelly Slider с физикой пружин и всплывающей каплей */}
      <div className="py-1">
        <JellySlider
          value={currentVal}
          onChange={handleChange}
          theme="dark"
          ariaLabel={`${labels.left} ↔ ${labels.right}`}
        />
      </div>

      {/* Текстовое описание выбранного уровня (рубрикатор) */}
      {isActive && (
        <p className="text-center text-xs text-amber-300/90 leading-snug">
          {getRubricLabel(axis, currentVal)}
        </p>
      )}
    </div>
  );
}
