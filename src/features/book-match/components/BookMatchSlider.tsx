// src/features/book-match/components/BookMatchSlider.tsx
// Один слайдер оси совместимости: непрерывный drag со snap на 11 точек.
// Доменный слой не зависит от этого компонента.

import { useCallback, useEffect, useRef, useState } from "react";
import type { MatchAxis } from "../domain/types";
import { AXIS_LABELS, SNAP_POINTS } from "../domain/types";

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

/** Определяет позицию ползунка (0–100) → процент трека. */
function thumbPercent(value: number | undefined): number {
  return value !== undefined ? value : 50;
}

export function BookMatchSlider({ axis, value, onChange }: BookMatchSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const labels = AXIS_LABELS[axis];

  const [draftValue, setDraftValue] = useState<number>(value ?? 50);
  const isActive = value !== undefined;

  /** Вычисляет snapped-значение по координате курсора. */
  const valueFromClientX = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return null;
    const rect = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return snap(pct * 100);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return; // только левая кнопка
      const track = trackRef.current;
      if (!track) return;
      isDragging.current = true;
      track.setPointerCapture(e.pointerId);

      const snapped = valueFromClientX(e.clientX);
      if (snapped !== null) {
        setDraftValue(snapped);
        onChange(axis, snapped);
      }
    },
    [axis, onChange, valueFromClientX],
  );

  // Глобальные move/up через capture-phase — работают даже если курсор ушёл за трек
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const snapped = valueFromClientX(e.clientX);
      if (snapped !== null) {
        setDraftValue(snapped);
        onChange(axis, snapped);
      }
    };
    const handleUp = () => {
      isDragging.current = false;
    };
    document.addEventListener("pointermove", handleMove, { capture: true });
    document.addEventListener("pointerup", handleUp, { capture: true });
    return () => {
      document.removeEventListener("pointermove", handleMove, { capture: true });
      document.removeEventListener("pointerup", handleUp, { capture: true });
    };
  }, [axis, onChange, valueFromClientX]);

  const currentVal = isActive ? value! : draftValue;
  const pct = thumbPercent(isActive ? value : undefined);

  return (
    <div className="flex flex-col gap-2">
      {/* Label row */}
      <div className="flex items-center justify-between text-xs">
        <span className={`transition-colors duration-200 ${isActive && currentVal <= 30 ? "text-white" : "text-white/40"}`}>
          {labels.left}
        </span>
        <span className={`transition-colors duration-200 ${isActive && currentVal >= 70 ? "text-white" : "text-white/40"}`}>
          {labels.right}
        </span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        className="relative h-2 md:h-2 w-full cursor-pointer select-none touch-none py-4 -my-4"
        role="slider"
        aria-label={`${labels.left} ↔ ${labels.right}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={currentVal}
      >
        {/* Background track */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-white/10" />

        {/* Active fill */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-2 rounded-full transition-all duration-150"
          style={{
            width: `${pct}%`,
            background: isActive
              ? "linear-gradient(90deg, var(--bp-primary), rgba(255,183,135,0.6))"
              : "rgba(255,255,255,0.15)",
          }}
        />

        {/* Thumb */}
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-150"
          style={{ left: `${pct}%` }}
        >
          <div
            className={`w-4 h-4 md:w-4 md:h-4 rounded-full border-2 shadow-lg transition-all duration-150 ${
              isActive
                ? "bg-(--bp-primary) border-white/80 scale-110"
                : "bg-white/30 border-white/20"
            }`}
          />
        </div>

        {/* Snap points (subtle) */}
        {SNAP_POINTS.map((point) => (
          <div
            key={point}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-white/20 pointer-events-none"
            style={{ left: `${point}%` }}
          />
        ))}
      </div>
    </div>
  );
}
