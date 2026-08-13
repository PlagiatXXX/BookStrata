// src/pages/BookPage/BookCover3D.tsx
// «Парящая» 3D-обложка книги: параллакс по курсору (rotateX/rotateY),
// float-анимация (keyframes, амплитуда ~20px), poster-glow (размытая копия
// обложки позади) и «корешок» 3D — по reference/code.html.
// prefers-reduced-motion → статичная обложка с тенью (доступность).
import { useEffect, useRef } from "react";

interface BookCover3DProps {
  coverImageUrl: string;
  title: string;
  className?: string;
}

export function BookCover3D({ coverImageUrl, title, className = "" }: BookCover3DProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (!wrapper || !inner) return;

    // prefers-reduced-motion: отключаем параллакс и float (float отключается CSS-медиа-запросом)
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onMouseMove = (e: MouseEvent) => {
      if (prefersReducedMotion) return;
      const rect = wrapper.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -15;
      const rotateY = ((x - centerX) / centerX) * 15;
      inner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const onMouseEnter = () => {
      if (prefersReducedMotion) return;
      inner.style.transition = "transform 0.1s ease-out";
    };

    const onMouseLeave = () => {
      if (prefersReducedMotion) return;
      inner.style.transform = "rotateX(0deg) rotateY(0deg)";
      // Плавный возврат после сброса
      window.setTimeout(() => {
        inner.style.transition = "transform 0.5s ease-out";
      }, 10);
    };

    wrapper.addEventListener("mousemove", onMouseMove);
    wrapper.addEventListener("mouseenter", onMouseEnter);
    wrapper.addEventListener("mouseleave", onMouseLeave);
    return () => {
      wrapper.removeEventListener("mousemove", onMouseMove);
      wrapper.removeEventListener("mouseenter", onMouseEnter);
      wrapper.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <div ref={wrapperRef} className={`book-3d-wrapper relative z-30 ${className}`}>
      {/* Poster-glow: размытая копия обложки позади (cinematic backlight) */}
      {coverImageUrl && (
        <div
          aria-hidden
          className="poster-glow pointer-events-none"
          style={{
            backgroundImage: `url(${coverImageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      <div
        ref={innerRef}
        className="book-3d-parallax-inner relative w-48 md:w-full max-w-[280px] aspect-[2/3]"
        style={{ transition: "transform 0.5s ease-out" }}
      >
        <div className="book-3d relative w-full h-full rounded-r-lg overflow-visible">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt={`Обложка книги «${title}»`}
              className="w-full h-full object-cover rounded-r-lg relative z-10"
              loading="eager"
            />
          ) : (
            <div className="w-full h-full rounded-r-lg relative z-10 bg-surface-container-high flex items-center justify-center border border-white/10">
              <span className="font-title-sm text-white/50 text-center px-4">{title}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
