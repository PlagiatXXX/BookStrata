import React, { useMemo, useEffect, useState } from "react";

export const RainEffect: React.FC = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const drops = useMemo(() => {
    if (prefersReducedMotion) return [];
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 2}s`,
      animationDuration: `${0.5 + Math.random() * 0.5}s`,
      opacity: 0.1 + Math.random() * 0.2,
    }));
  }, [prefersReducedMotion]);

  if (prefersReducedMotion) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {drops.map((drop) => (
        <div
          key={drop.id}
          className="animate-rain absolute top-0 h-4 w-[1px] bg-cyan-200/40"
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
