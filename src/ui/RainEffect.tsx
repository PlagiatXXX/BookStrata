import React, { useEffect, useState } from "react";

// Генерация на уровне модуля — вызывается ОДИН раз при импорте
const RAINDROPS = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  animationDelay: `${Math.random() * 2}s`,
  animationDuration: `${1.5 + Math.random() * 1.5}s`,
  opacity: 0.3 + Math.random() * 0.3,
}));

const reducedMotionQuery =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

export const RainEffect: React.FC = () => {
  const [reducedMotion, setReducedMotion] = useState(
    () => reducedMotionQuery?.matches ?? false,
  );

  useEffect(() => {
    if (!reducedMotionQuery) return;

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    reducedMotionQuery.addEventListener("change", handler);
    return () => reducedMotionQuery.removeEventListener("change", handler);
  }, []);

  if (reducedMotion) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {RAINDROPS.map((drop) => (
        <div
          key={drop.id}
          className="animate-rain absolute top-0 h-4 w-px bg-cyan-100/60 shadow-[0_0_8px_rgba(103,232,249,0.3)]"
          style={{
            left: drop.left,
            animationDelay: drop.animationDelay,
            animationDuration: drop.animationDuration,
            opacity: drop.opacity,
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
};
