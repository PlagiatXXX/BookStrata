// src/pages/BookPage/BookCover3D.tsx
// «Парящая» 3D-обложка книги с поддержкой живого видео-оживления:
// - Десктоп: плавный кроссфейд в живое видео при наведении курсора на саму обложку (hover-to-play).
// - Мобильные: аккуратная кнопка «Оживить обложку» под книгой (1 цикл и гарантированная остановка).
// - Базовый слой: четкий статичный постер (retina) для мгновенного LCP.
// - prefers-reduced-motion: только статика без анимаций.
import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

interface BookCover3DProps {
  coverImageUrl: string;
  title: string;
  className?: string;
  liveVideoUrl?: string;
}

export function BookCover3D({
  coverImageUrl,
  title,
  className = "",
  liveVideoUrl,
}: BookCover3DProps) {
  const coverContainerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [isPlayingMobile, setIsPlayingMobile] = useState(false);
  const [reducedMotion] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  const [canHover, setCanHover] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(hover: hover) and (pointer: fine)").matches
      : true,
  );
  const [isVideoReady, setIsVideoReady] = useState(false);

  const mobileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Подписка на изменение режима указателя (мышь/тач)
  useEffect(() => {
    const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const onHoverChange = (e: MediaQueryListEvent) => setCanHover(e.matches);
    hoverQuery.addEventListener("change", onHoverChange);
    return () => hoverQuery.removeEventListener("change", onHoverChange);
  }, []);

  // 3D-параллакс и hover-эффект ТОЛЬКО на самой обложке (coverContainerRef)
  useEffect(() => {
    const coverEl = coverContainerRef.current;
    const inner = innerRef.current;
    if (!coverEl || !inner || reducedMotion) return;

    const onMouseMove = (e: MouseEvent) => {
      const rect = coverEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const normX = Math.max(-1, Math.min(1, (x - centerX) / centerX));
      const normY = Math.max(-1, Math.min(1, (y - centerY) / centerY));

      const rotateX = normY * -12;
      const rotateY = normX * 12;
      inner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const onMouseEnter = () => {
      // Hover воспроизведение только на десктопе с мышью, если мобильный режим не запущен
      if (canHover && !isPlayingMobile) {
        setIsHovered(true);
        const video = videoRef.current;
        if (video && liveVideoUrl) {
          video.loop = true;
          video.play().catch(() => {});
        }
      }
      inner.style.transition = "transform 0.1s ease-out";
    };

    const onMouseLeave = () => {
      if (canHover && !isPlayingMobile) {
        setIsHovered(false);
        const video = videoRef.current;
        if (video) {
          video.pause();
        }
      }
      inner.style.transform = "rotateX(0deg) rotateY(0deg)";
      window.setTimeout(() => {
        inner.style.transition = "transform 0.5s ease-out";
      }, 10);
    };

    coverEl.addEventListener("mousemove", onMouseMove);
    coverEl.addEventListener("mouseenter", onMouseEnter);
    coverEl.addEventListener("mouseleave", onMouseLeave);
    return () => {
      coverEl.removeEventListener("mousemove", onMouseMove);
      coverEl.removeEventListener("mouseenter", onMouseEnter);
      coverEl.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [reducedMotion, canHover, isPlayingMobile, liveVideoUrl]);

  // Завершение мобильного цикла
  const stopMobilePlayback = () => {
    if (mobileTimerRef.current) {
      clearTimeout(mobileTimerRef.current);
      mobileTimerRef.current = null;
    }
    setIsPlayingMobile(false);
    setIsHovered(false);

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
      video.loop = false;
    }
  };

  // Запуск строго 1 цикла по нажатию кнопки
  const handleMobilePlay = () => {
    const video = videoRef.current;
    if (!video || isPlayingMobile || reducedMotion) return;

    if (mobileTimerRef.current) {
      clearTimeout(mobileTimerRef.current);
    }

    // Принудительно отключаем loop на нативном DOM элементе
    video.loop = false;
    video.currentTime = 0;
    setIsHovered(false);
    setIsPlayingMobile(true);

    video.play().catch(() => {
      stopMobilePlayback();
    });

    // Страховочный таймер длительности видео
    const duration = ((video.duration && !isNaN(video.duration)) ? video.duration : 5.1) * 1000;
    mobileTimerRef.current = setTimeout(() => {
      stopMobilePlayback();
    }, duration + 300);
  };

  useEffect(() => {
    return () => {
      if (mobileTimerRef.current) {
        clearTimeout(mobileTimerRef.current);
      }
    };
  }, []);

  const isVideoVisible = (isHovered || isPlayingMobile) && isVideoReady && !reducedMotion;

  return (
    <div className={`book-3d-wrapper relative z-30 select-none flex flex-col items-center ${className}`}>
      {/* Poster-glow: мягкое размытое свечение позади книги */}
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

      {/* Зона обложки: mouseenter / mouseleave привязаны только к ней */}
      <div
        ref={coverContainerRef}
        className="relative cursor-pointer"
      >
        <div
          ref={innerRef}
          className="book-3d-parallax-inner relative w-48 md:w-52 lg:w-70 max-w-70 aspect-2/3"
          style={{ transition: "transform 0.5s ease-out" }}
        >
          <div className="book-3d relative w-full h-full rounded-r-lg overflow-visible group">
            {coverImageUrl ? (
              <>
                {/* Статичный четкий постер (всегда в DOM для мгновенного LCP) */}
                <img
                  src={coverImageUrl}
                  alt={`Обложка книги «${title}»`}
                  className="w-full h-full object-cover rounded-r-lg relative z-10"
                  loading="eager"
                />

                {/* Живое видео-оживление */}
                {liveVideoUrl && !reducedMotion && (
                  <video
                    ref={videoRef}
                    src={liveVideoUrl}
                    playsInline
                    muted
                    preload="auto"
                    onCanPlay={() => setIsVideoReady(true)}
                    onEnded={stopMobilePlayback}
                    className={`absolute inset-0 w-full h-full object-cover rounded-r-lg z-20 pointer-events-none transition-opacity duration-500 ease-out ${
                      isVideoVisible ? "opacity-100" : "opacity-0"
                    }`}
                  />
                )}
              </>
            ) : (
              <div className="w-full h-full rounded-r-lg relative z-10 bg-surface-container-high flex items-center justify-center border border-white/10">
                <span className="font-title-sm text-white/50 text-center px-4">{title}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Подсказка для десктопа: видна только при наличии живого видео */}
      {liveVideoUrl && !reducedMotion && (
        <div
          className={`hidden md:flex items-center justify-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-amber-300/90 transition-opacity duration-300 pointer-events-none ${
            isHovered ? "opacity-0" : "opacity-100"
          }`}
        >
          <span className="inline-block animate-pulse">👉</span>
          <span className="font-medium">Наведи мышь на обложку — она оживет!</span>
        </div>
      )}

      {/* Мобильная кнопка «Оживить обложку»: аккуратно расположена под книгой */}
      {liveVideoUrl && !reducedMotion && (
        <button
          type="button"
          onClick={handleMobilePlay}
          disabled={isPlayingMobile}
          className={`md:hidden mt-3.5 flex items-center justify-center gap-2 px-4 py-2 rounded-full border transition-all active:scale-95 cursor-pointer shadow-md select-none ${
            isPlayingMobile
              ? "bg-amber-400/20 border-amber-400/50 text-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.2)]"
              : "bg-white/10 hover:bg-white/15 border-white/20 text-white font-medium"
          }`}
          aria-label="Оживить обложку книги"
        >
          <Sparkles
            size={14}
            className={isPlayingMobile ? "text-amber-300 animate-spin" : "text-amber-400"}
          />
          <span className="text-xs tracking-wide">
            {isPlayingMobile ? "Обложка оживает..." : "Оживить обложку"}
          </span>
        </button>
      )}
    </div>
  );
}
