import { useCallback, useEffect, useRef, useState } from "react";

interface RainStreak {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
}

interface WindowDrip {
  x: number;
  y: number;
  radius: number;
  speed: number;
  opacity: number;
  trailLength: number;
  fillStyle: string;
  trailStyle: string;
}

interface LightningBolt {
  id: number;
  startXPercent: number;
  mainPath: string;
  branches: string[];
  glowColor: string;
}

type LightningPhase = "pre" | "strike" | "afterglow" | null;

const STREAK_COUNT = 70;
const DRIP_COUNT = 28;

function createStreaks(width: number, height: number): RainStreak[] {
  return Array.from({ length: STREAK_COUNT }, () => ({
    x: Math.random() * (width || 800),
    y: Math.random() * (height || 600),
    length: 16 + Math.random() * 22,
    speed: 14 + Math.random() * 10,
    opacity: 0.15 + Math.random() * 0.25,
  }));
}

function createDrips(width: number, height: number): WindowDrip[] {
  return Array.from({ length: DRIP_COUNT }, () => {
    const opacity = 0.25 + Math.random() * 0.3;
    return {
      x: Math.random() * (width || 800),
      y: Math.random() * (height || 600),
      radius: 1.2 + Math.random() * 1.6,
      speed: 0.3 + Math.random() * 1.2,
      opacity,
      trailLength: 8 + Math.random() * 16,
      fillStyle: `rgba(203, 228, 249, ${opacity.toFixed(2)})`,
      trailStyle: `rgba(203, 228, 249, ${(opacity * 0.3).toFixed(2)})`,
    };
  });
}

function generateLightning(width: number, height: number): LightningBolt {
  const startXPercent = 15 + Math.random() * 70;
  const startX = (width || 800) * (startXPercent / 100);
  const startY = -15;
  const targetY = (height || 600) * (0.42 + Math.random() * 0.35);

  let curX = startX;
  let curY = startY;
  const segments = 12 + Math.floor(Math.random() * 5);
  const dy = (targetY - startY) / segments;

  const mainPoints: [number, number][] = [[curX, curY]];
  const branches: string[] = [];

  for (let i = 0; i < segments; i++) {
    curY += dy * (0.8 + Math.random() * 0.4);
    curX += (Math.random() - 0.5) * 46;
    mainPoints.push([curX, curY]);

    // Ответвление молнии
    if (i > 1 && i < segments - 2 && Math.random() < 0.42 && branches.length < 3) {
      let bX = curX;
      let bY = curY;
      const bPoints: [number, number][] = [[bX, bY]];
      const bSegments = 3 + Math.floor(Math.random() * 4);
      const bDir = Math.random() < 0.5 ? -1 : 1;
      for (let j = 0; j < bSegments; j++) {
        bY += (dy * 0.65) * (0.7 + Math.random() * 0.6);
        bX += bDir * (12 + Math.random() * 26);
        bPoints.push([bX, bY]);
      }
      branches.push(
        bPoints.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ")
      );
    }
  }

  const mainPath = mainPoints
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(" ");

  return {
    id: Date.now(),
    startXPercent,
    mainPath,
    branches,
    glowColor: Math.random() < 0.5 ? "rgba(186, 230, 253, 0.95)" : "rgba(224, 231, 255, 0.95)",
  };
}

export function AutumnRainAtmosphere() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Состояние грозы и молнии ──
  const [lightningPhase, setLightningPhase] = useState<LightningPhase>(null);
  const [currentBolt, setCurrentBolt] = useState<LightningBolt | null>(null);
  const lightningPhaseRef = useRef<LightningPhase>(null);
  const timeoutsRef = useRef<number[]>([]);

  const isReducedMotion = useCallback(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // ── Запуск вспышки молнии ──
  const triggerLightning = useCallback(() => {
    if (document.hidden || isReducedMotion()) return;

    const width = window.innerWidth || 800;
    const height = window.innerHeight || 600;
    const bolt = generateLightning(width, height);

    setCurrentBolt(bolt);
    setLightningPhase("pre");
    lightningPhaseRef.current = "pre";

    // 1. Предвспышка туч (0..70ms)
    const t1 = window.setTimeout(() => {
      setLightningPhase("strike");
      lightningPhaseRef.current = "strike";

      // 2. Главный разряд и вспышка (70..280ms)
      const t2 = window.setTimeout(() => {
        setLightningPhase("afterglow");
        lightningPhaseRef.current = "afterglow";

        // 3. Атмосферное послесвечение (280..620ms)
        const t3 = window.setTimeout(() => {
          setLightningPhase(null);
          lightningPhaseRef.current = null;
          setCurrentBolt(null);
        }, 340);

        timeoutsRef.current.push(t3);
      }, 210);

      timeoutsRef.current.push(t2);
    }, 70);

    timeoutsRef.current.push(t1);
  }, [isReducedMotion]);

  // ── Периодический таймер грозы каждые ~10 секунд ──
  useEffect(() => {
    if (isReducedMotion()) return;

    // Первый раскат через 3.5 сек для быстрого знакомства с эффектом
    const initialTimer = window.setTimeout(triggerLightning, 3500);
    let nextTimer: number | null = null;

    const scheduleNext = () => {
      // Периодичность раз в ~10 секунд (9..11.5с для естественности)
      const delay = 9000 + Math.random() * 2500;
      nextTimer = window.setTimeout(() => {
        triggerLightning();
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    const currentActiveTimeouts = timeoutsRef.current;

    return () => {
      window.clearTimeout(initialTimer);
      if (nextTimer !== null) window.clearTimeout(nextTimer);
      for (const t of currentActiveTimeouts) {
        window.clearTimeout(t);
      }
    };
  }, [triggerLightning, isReducedMotion]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth || 800;
    let height = window.innerHeight || 600;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const streaks = createStreaks(width, height);
    const drips = createDrips(width, height);

    let targetX = width / 2;
    let targetY = height * 0.35;
    let currentX = targetX;
    let currentY = targetY;
    let animId: number | null = null;

    const updateLampStyle = (x: number, y: number) => {
      container.style.setProperty("--rain-lamp-x", `${x}px`);
      container.style.setProperty("--rain-lamp-y", `${y}px`);
    };

    updateLampStyle(currentX, currentY);

    const renderFrame = () => {
      ctx.clearRect(0, 0, width, height);

      const isStrike = lightningPhaseRef.current === "strike";

      // 1. Падающие косые штрихи дождя (во время молнии ярко блестят)
      ctx.strokeStyle = isStrike ? "rgba(224, 242, 254, 0.85)" : "rgba(186, 215, 233, 0.35)";
      ctx.lineWidth = isStrike ? 1.4 : 1;
      ctx.beginPath();
      for (const s of streaks) {
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + s.length * 0.12, s.y + s.length);
      }
      ctx.stroke();

      // 2. Медленно стекающие капли по стеклу (во время вспышки ловят блик)
      for (const d of drips) {
        ctx.fillStyle = isStrike ? "rgba(240, 249, 255, 0.9)" : d.fillStyle;
        ctx.beginPath();
        ctx.arc(d.x, d.y, isStrike ? d.radius * 1.15 : d.radius, 0, Math.PI * 2);
        ctx.fill();

        // След от капли
        if (d.trailLength > 0) {
          ctx.strokeStyle = isStrike ? "rgba(224, 242, 254, 0.6)" : d.trailStyle;
          ctx.lineWidth = Math.max(0.5, d.radius * 0.6);
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x, d.y - d.trailLength);
          ctx.stroke();
        }
      }
    };

    const updateParticles = () => {
      for (const s of streaks) {
        s.y += s.speed;
        s.x += s.speed * 0.12;
        if (s.y > height + 40) {
          s.y = -30;
          s.x = Math.random() * (width + 100) - 50;
        }
      }

      for (const d of drips) {
        d.y += d.speed;
        if (d.y > height + 30) {
          d.y = -10;
          d.x = Math.random() * width;
        }
      }

      // Плавное следование света фонаря (только при реальном движении указателя)
      const dx = targetX - currentX;
      const dy = targetY - currentY;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        currentX += dx * 0.14;
        currentY += dy * 0.14;
        updateLampStyle(currentX, currentY);
      }
    };

    const loop = () => {
      updateParticles();
      renderFrame();
      animId = window.requestAnimationFrame(loop);
    };

    const startAnimation = () => {
      if (isReducedMotion()) {
        renderFrame();
        return;
      }
      if (animId === null && !document.hidden) {
        animId = window.requestAnimationFrame(loop);
      }
    };

    const stopAnimation = () => {
      if (animId !== null) {
        window.cancelAnimationFrame(animId);
        animId = null;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (isReducedMotion()) {
        currentX = targetX;
        currentY = targetY;
        updateLampStyle(currentX, currentY);
      }
    };

    const handleResize = () => {
      const currentDpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth || 800;
      height = window.innerHeight || 600;
      canvas.width = Math.floor(width * currentDpr);
      canvas.height = Math.floor(height * currentDpr);
      ctx.setTransform(currentDpr, 0, 0, currentDpr, 0, 0);
      if (isReducedMotion()) {
        renderFrame();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAnimation();
      } else {
        startAnimation();
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    startAnimation();

    return () => {
      stopAnimation();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isReducedMotion]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      data-testid="autumn-rain-atmosphere"
    >
      {/* Стили кинематографичного медленного панорамирования фото-неба */}
      <style>{`
        @keyframes cloudPanSlow {
          0% { transform: scale(1.03) translate3d(-1.5%, 0, 0); }
          50% { transform: scale(1.03) translate3d(1.5%, 0, 0); }
          100% { transform: scale(1.03) translate3d(-1.5%, 0, 0); }
        }
      `}</style>

      {/* ── СЛОЙ 1: За полками (z-0) ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#0e131b]">
        {/* Мягкий рассеянный свет фонаря вокруг курсора */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            background:
              "radial-gradient(circle 280px at var(--rain-lamp-x, 50%) var(--rain-lamp-y, 35%), rgba(245, 158, 11, 0.12), transparent 80%)",
          }}
        />
        <div className="absolute inset-0 bg-slate-950/8 pointer-events-none" />

        {/* ── АУТЕНТИЧНОЕ ФОТОГРАФИЧЕСКОЕ ГРОЗОВОЕ НЕБО (Адаптировано под мобильные и десктоп) ── */}
        <div className="absolute inset-x-0 top-0 h-95 sm:h-120 md:h-150 lg:h-180 xl:h-195 2xl:h-210 pointer-events-none overflow-hidden select-none">
          {/* Базовый тяжелый градиент плотного неба */}
          <div className="absolute inset-0 bg-linear-to-b from-[#02050c] via-[#060d1b] via-45% to-transparent pointer-events-none" />

          {/* Фотографический холст грозовых туч: адаптивный источник для мобилок и больших экранов */}
          <picture className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Мобильные экраны: оптимизированный плотный кадр */}
            <source
              media="(max-width: 767px)"
              srcSet="/autumn-storm-clouds-mobile.webp"
              type="image/webp"
            />
            {/* Большие экраны: 2048px Ultra-HD с глубоким охватом кучевых облаков */}
            <source
              media="(min-width: 768px)"
              srcSet="/autumn-storm-clouds-hd.webp"
              type="image/webp"
            />
            <img
              src="/autumn-storm-clouds-hd.webp"
              alt=""
              className="absolute -top-3 sm:-top-6 md:-top-8 inset-x-[-4%] md:inset-x-[-3%] w-[108%] md:w-[106%] h-full object-cover object-top md:object-[50%_80%] lg:object-[50%_88%] max-w-none pointer-events-none opacity-95 will-change-transform transition-[filter] duration-150"
              style={{
                animation: isReducedMotion() ? "none" : "cloudPanSlow 55s ease-in-out infinite",
                filter:
                  lightningPhase === "strike"
                    ? "brightness(2.1) contrast(1.18) saturate(1.1) drop-shadow(0 0 45px rgba(186, 230, 253, 0.55))"
                    : lightningPhase === "pre"
                      ? "brightness(1.38) contrast(1.06)"
                      : lightningPhase === "afterglow"
                        ? "brightness(1.16)"
                        : "brightness(0.92)",
              }}
            />
          </picture>

          {/* Внутреннее озарение грозовых туч в эпицентре разряда молнии */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-150"
            style={{
              opacity:
                lightningPhase === "strike"
                  ? 0.95
                  : lightningPhase === "pre"
                    ? 0.45
                    : lightningPhase === "afterglow"
                      ? 0.22
                      : 0,
              background: `radial-gradient(ellipse 850px 380px at ${currentBolt?.startXPercent ?? 50}% 12%, rgba(224, 242, 254, 0.48), rgba(186, 230, 253, 0.2) 45%, transparent 85%)`,
              mixBlendMode: "screen",
            }}
          />

          {/* Мягкий переход нижнего края туч в дождь и мглу без резкого стыка с фоном */}
          <div
            className="absolute bottom-0 inset-x-0 h-72 sm:h-80 md:h-96 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, transparent 0%, rgba(14, 19, 27, 0.25) 25%, rgba(14, 19, 27, 0.75) 65%, #0e131b 100%)",
            }}
          />
        </div>

        {/* Грозовое небо: общая вспышка света в облаках */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-150"
          style={{
            opacity:
              lightningPhase === "strike"
                ? 0.78
                : lightningPhase === "pre"
                  ? 0.38
                  : lightningPhase === "afterglow"
                    ? 0.22
                    : 0,
            background:
              "radial-gradient(circle 950px at 50% 0%, rgba(224, 242, 254, 0.36), rgba(186, 230, 253, 0.16) 50%, transparent 85%)",
          }}
        />

        {/* Ветвистая неоновая молния, бьющая прямо из туч */}
        {currentBolt && (lightningPhase === "strike" || lightningPhase === "pre") && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            style={{
              filter: `drop-shadow(0 0 10px ${currentBolt.glowColor}) drop-shadow(0 0 24px rgba(147, 197, 253, 0.8))`,
              opacity: lightningPhase === "strike" ? 1 : 0.45,
            }}
          >
            {/* Ореол свечения основного ствола */}
            <path
              d={currentBolt.mainPath}
              fill="none"
              stroke="rgba(186, 230, 253, 0.85)"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="miter"
            />
            {/* Яркое электрическое белое ядро */}
            <path
              d={currentBolt.mainPath}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="miter"
            />
            {/* Ветви-разветвления молнии */}
            {currentBolt.branches.map((b, idx) => (
              <g key={idx}>
                <path
                  d={b}
                  fill="none"
                  stroke="rgba(186, 230, 253, 0.7)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <path
                  d={b}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </g>
            ))}
          </svg>
        )}
      </div>

      {/* ── СЛОЙ 2: Стекающие капли дождя и штрихи ливня поверх полок (z-20) ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-20">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      </div>

      {/* ── СЛОЙ 3: Мягкий отблеск молнии поверх полок и на стекле (z-25) ── */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden z-25 transition-opacity duration-200"
        style={{
          opacity:
            lightningPhase === "strike"
              ? 0.12
              : lightningPhase === "pre"
                ? 0.04
                : 0,
          background: "rgba(224, 242, 254, 0.85)",
        }}
      />
    </div>
  );
}
