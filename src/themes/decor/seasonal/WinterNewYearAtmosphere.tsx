import { useEffect, useRef, useState, useCallback } from "react";

// ── Типы и частицы для снега и конфетти ──
interface Particle {
  x: number;
  y: number;
  size: number;
  vy: number;
  vx: number;
  wobblePhase: number;
  wobbleSpeed: number;
  rotation: number;
  rotationSpeed: number;
  type: "snow" | "gold-confetti" | "red-confetti";
  color: string;
}

interface BurstParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  color: string;
  isStar: boolean;
}

const PARTICLE_COUNT = 34;

function createParticles(width: number, height: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const isConfetti = i % 3 === 0;
    const isRed = i % 6 === 0;
    const type = isConfetti
      ? isRed
        ? "red-confetti"
        : "gold-confetti"
      : "snow";

    let color = "rgba(255, 255, 255, 0.85)";
    if (type === "gold-confetti") {
      color = "rgba(251, 191, 36, 0.9)";
    } else if (type === "red-confetti") {
      color = "rgba(239, 68, 68, 0.85)";
    }

    return {
      x: Math.random() * (width || 800),
      y: Math.random() * (height || 600),
      size: type === "snow" ? 2.5 + Math.random() * 3.5 : 4 + Math.random() * 3,
      vy: type === "snow" ? 0.7 + Math.random() * 0.9 : 1.2 + Math.random() * 1.1,
      vx: (Math.random() - 0.5) * 0.5,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.03,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.04,
      type,
      color,
    };
  });
}

// ── Цвета праздничной гирлянды ──
const BULB_COLORS = [
  { color: "#ef4444", glow: "rgba(239, 68, 68, 0.75)" }, // рубиновый
  { color: "#fbbf24", glow: "rgba(251, 191, 36, 0.75)" }, // золотой
  { color: "#10b981", glow: "rgba(16, 185, 129, 0.75)" }, // изумрудный
  { color: "#38bdf8", glow: "rgba(56, 189, 248, 0.75)" }, // льдисто-синий
  { color: "#c084fc", glow: "rgba(192, 132, 252, 0.75)" }, // фиолетовый
];

export type SantaPhase =
  | "climbing"
  | "top_cheer"
  | "surprised"
  | "falling"
  | "impact"
  | "recovering";

export function WinterNewYearAtmosphere() {
  const snowCanvasRef = useRef<HTMLCanvasElement>(null);

  // ── DOM refs для 60 FPS аппаратной анимации Деда Мороза ──
  const santaWrapperRef = useRef<HTMLDivElement>(null);
  const snowdriftRef = useRef<HTMLDivElement>(null);

  // ── Состояние фазы (для UI/мимики лица и плашек) ──
  const [phase, setPhase] = useState<SantaPhase>("climbing");
  const [speech, setSpeech] = useState<string | null>(null);

  // ── Эмоциональные состояния Деда Мороза ──
  const [isDizzy, setIsDizzy] = useState(false);
  const [musicNote, setMusicNote] = useState(false);

  // ── Частицы взрыва снега и звёздочек при ударе о сугроб ──
  const [burstParticles, setBurstParticles] = useState<BurstParticle[]>([]);

  // ── Состояние снеговика ──
  const [isSnowmanWinking, setIsSnowmanWinking] = useState(false);

  // ── Состояние саней с оленями ──
  const [sleighProgress, setSleighProgress] = useState(-20);
  const [isSleighFlying, setIsSleighFlying] = useState(false);

  // ── Состояние вспышек на гирлянде ──
  const [clickedBulbs, setClickedBulbs] = useState<Record<number, boolean>>({});

  // ── Внутреннее физическое состояние симуляции Деда Мороза ──
  const sim = useRef({
    phase: "climbing" as SantaPhase,
    progress: 0.1, // 0 = у нижнего сугроба, 1 = вверху лестницы
    currentY: 500,
    fallY: 0,
    velocity: 0,
    surprisedStartTime: 0,
    impactStartTime: 0,
    recoveringStartTime: 0,
    cheerStartTime: 0,
    dizzyTriggered: false,
    ladderTopY: 85,
    ladderBottomY: 600,
    ladderSpan: 515,
  });

  // ── Снег и конфетти на общем canvas (z-20) ──
  useEffect(() => {
    const canvas = snowCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth || 800;
    let height = window.innerHeight || 600;

    const setupCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    setupCanvas();
    const particles = createParticles(width, height);
    let animId: number | null = null;

    const isReducedMotion = () => {
      if (typeof window === "undefined" || !window.matchMedia) return false;
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.wobblePhase += p.wobbleSpeed;
        p.x += Math.sin(p.wobblePhase) * 0.8 + p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        if (p.y > height + 20) {
          p.y = -10;
          p.x = Math.random() * width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.type === "snow") {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
        }

        ctx.restore();
      }
    };

    const loop = () => {
      render();
      animId = window.requestAnimationFrame(loop);
    };

    if (!isReducedMotion()) {
      animId = window.requestAnimationFrame(loop);
    } else {
      render();
    }

    const handleResize = () => {
      width = window.innerWidth || 800;
      height = window.innerHeight || 600;
      setupCanvas();
      if (isReducedMotion()) render();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      if (animId !== null) window.cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // ── Генерация взрыва частиц при приземлении в сугроб ──
  const spawnImpactParticles = useCallback(() => {
    const newParticles: BurstParticle[] = Array.from({ length: 14 }, (_, i) => {
      const angle = -Math.PI * 0.85 + Math.random() * Math.PI * 0.7; // фонтан вверх и в стороны
      const speed = 3.5 + Math.random() * 5.5;
      const isStar = i % 2 === 0;
      return {
        id: Date.now() + i,
        x: 27,
        y: 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: isStar ? 12 : 5 + Math.random() * 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        opacity: 1,
        color: isStar ? "#fbbf24" : "#ffffff",
        isStar,
      };
    });

    setBurstParticles(newParticles);

    // Анимация затухания частиц
    const startTime = performance.now();
    const animParticles = () => {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / 700;

      if (progress < 1) {
        setBurstParticles((prev) =>
          prev.map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.25, // гравитация для снежинок
            rotation: p.rotation + p.rotationSpeed,
            opacity: Math.max(0, 1 - progress),
          })),
        );
        window.requestAnimationFrame(animParticles);
      } else {
        setBurstParticles([]);
      }
    };

    window.requestAnimationFrame(animParticles);
  }, []);

  // ── Главный кинематографичный RAF-цикл физики Деда Мороза ──
  useEffect(() => {
    let animId: number | null = null;

    const updateLadderDimensions = () => {
      const h = window.innerHeight || 800;
      sim.current.ladderTopY = 85;
      sim.current.ladderBottomY = Math.max(300, h - 90);
      sim.current.ladderSpan = sim.current.ladderBottomY - sim.current.ladderTopY;
    };

    updateLadderDimensions();
    window.addEventListener("resize", updateLadderDimensions);

    const isReducedMotion = () => {
      if (typeof window === "undefined" || !window.matchMedia) return false;
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    };

    const loop = (now: number) => {
      const s = sim.current;
      const wrapper = santaWrapperRef.current;

      if (!wrapper) {
        animId = window.requestAnimationFrame(loop);
        return;
      }

      // ── 1. ФАЗА ПОДЪЁМА (CLIMBING) ──
      if (s.phase === "climbing") {
        // Шаговый цикл карабкания (высота между перекладинами ~26px)
        const walkCycle = (s.currentY / 26) * Math.PI * 2;
        // Модуляция скорости: на перехвате перекладины замедляется (0.68x), на рывке подтягивания ускоряется (1.32x)
        const stepPacing = 1 + Math.sin(walkCycle) * 0.32;
        s.progress += 0.00062 * stepPacing;

        if (s.progress >= 0.88) {
          s.phase = "top_cheer";
          s.cheerStartTime = now;
          setPhase("top_cheer");
          setSpeech("Хо-хо-хо! 🎅");
        }

        s.currentY = s.ladderBottomY - s.progress * s.ladderSpan;

        // Плавная биомеханика: наклон корпуса, перенос веса на опорную руку и пружинящий шаг
        const swayAngle = Math.sin(walkCycle) * 6.5; // наклон влево-вправо
        const swayX = Math.sin(walkCycle) * 3.2; // смещение в сторону опорной руки
        const bounceY = Math.abs(Math.sin(walkCycle)) * 4.2; // толчок вверх при шаге
        const breath = Math.sin(now * 0.003) * 0.02; // лёгкое дыхание корпуса
        const stretch = 1 + Math.sin(walkCycle * 2) * 0.025 + breath;

        wrapper.style.transform = `translate3d(${swayX.toFixed(2)}px, ${(s.currentY - bounceY).toFixed(2)}px, 0) rotate(${swayAngle.toFixed(2)}deg) scale(${stretch.toFixed(3)}, ${(2 - stretch).toFixed(3)})`;
      }

      // ── 2. ФАЗА ВЕРШИНЫ (TOP CHEER) ──
      else if (s.phase === "top_cheer") {
        const elapsed = now - s.cheerStartTime;
        const cheerBounce = Math.abs(Math.sin(elapsed * 0.008)) * 6;
        const cheerWiggle = Math.sin(elapsed * 0.012) * 5;
        wrapper.style.transform = `translate3d(0, ${(s.currentY - cheerBounce).toFixed(2)}px, 0) rotate(${cheerWiggle.toFixed(2)}deg) scale(1.08)`;

        if (elapsed > 2600) {
          s.progress = 0.05;
          s.phase = "climbing";
          setPhase("climbing");
          setSpeech(null);
        }
      }

      // ── 3. ФАЗА ИСПУГА И БОРЬБЫ ЗА РАВНОВЕСИЕ (SURPRISED / ANTICIPATION) ──
      else if (s.phase === "surprised") {
        const elapsed = now - s.surprisedStartTime;

        if (elapsed < 160) {
          // Подскок от неожиданности и сжатие
          wrapper.style.transform = `translate3d(0, ${(s.currentY - 10).toFixed(2)}px, 0) scale(1.18, 0.92)`;
        } else if (elapsed < 620) {
          // Комичное раскачивание на канате: пытается поймать баланс!
          const balanceElapsed = elapsed - 160;
          const balanceAngle = Math.sin(balanceElapsed * 0.024) * 16;
          const balanceX = Math.sin(balanceElapsed * 0.024) * 5.5;
          wrapper.style.transform = `translate3d(${balanceX.toFixed(2)}px, ${(s.currentY - 6).toFixed(2)}px, 0) rotate(${balanceAngle.toFixed(2)}deg) scale(1.08, 1.04)`;
        } else {
          // Срыв с каната
          wrapper.style.transform = `translate3d(0, ${s.currentY.toFixed(2)}px, 0) rotate(-22deg) scale(0.96, 1.08)`;
        }

        if (elapsed >= 680) {
          s.phase = "falling";
          s.fallY = s.currentY;
          s.velocity = 1.2;
          setPhase("falling");
          setSpeech("Ой-ой-ой! 😱");
        }
      }

      // ── 4. ФАЗА СВОБОДНОГО ПАДЕНИЯ (AERODYNAMIC FREE FALL) ──
      else if (s.phase === "falling") {
        const terminalVelocity = 8.6;
        s.velocity += (terminalVelocity - s.velocity) * 0.065;
        s.fallY += s.velocity;

        // Мягкое парашютное покачивание от встречного ветра
        const tumbleAngle = Math.sin(s.fallY * 0.032) * 14;
        const windStretch = 1 + (s.velocity / terminalVelocity) * 0.12;
        wrapper.style.transform = `translate3d(0, ${s.fallY.toFixed(2)}px, 0) rotate(${tumbleAngle.toFixed(2)}deg) scale(${(1 / windStretch).toFixed(3)}, ${windStretch.toFixed(3)})`;

        if (s.fallY >= s.ladderBottomY) {
          s.phase = "impact";
          s.impactStartTime = now;
          setPhase("impact");
          setSpeech("*БУМС!* ❄️");
          spawnImpactParticles();
        }
      }

      // ── 5. ФАЗА ПРУЖИНЯЩЕГО УДАРА (SPRING IMPACT & SQUASH/STRETCH) ──
      else if (s.phase === "impact") {
        const elapsed = now - s.impactStartTime;
        const duration = 520;
        const t = Math.min(1, elapsed / duration);

        const spring = Math.sin(t * Math.PI * 2.6) * Math.exp(-t * 3.8);
        const scaleX = 1 + spring * 0.48;
        const scaleY = 1 - spring * 0.48;

        wrapper.style.transform = `translate3d(0, ${(s.ladderBottomY + 12).toFixed(2)}px, 0) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`;

        if (snowdriftRef.current) {
          const driftSquash = 1 - Math.max(0, spring) * 0.42;
          snowdriftRef.current.style.transform = `scaleY(${driftSquash.toFixed(2)})`;
        }

        if (t >= 1) {
          s.phase = "recovering";
          s.recoveringStartTime = now;
          s.dizzyTriggered = false;
          setPhase("recovering");
        }
      }

      // ── 6. ФАЗА ГОЛОВОКРУЖЕНИЯ, ОТРЯХИВАНИЯ И ПОДГОТОВКИ (RECOVERING) ──
      else if (s.phase === "recovering") {
        const elapsed = now - s.recoveringStartTime;
        const duration = 2100;
        const t = Math.min(1, elapsed / duration);

        if (snowdriftRef.current) {
          snowdriftRef.current.style.transform = "scaleY(1)";
        }

        // Подфаза 1 (0..950мс): сидит в сугробе, кружатся звёздочки головокружения
        if (elapsed < 950) {
          if (!s.dizzyTriggered) {
            s.dizzyTriggered = true;
            setIsDizzy(true);
            setSpeech("Ой... где я? 😵‍💫");
          }
          const dizzyWobble = Math.sin(elapsed * 0.008) * 8;
          wrapper.style.transform = `translate3d(0, ${(s.ladderBottomY + 10).toFixed(2)}px, 0) rotate(${dizzyWobble.toFixed(2)}deg) scale(1.12, 0.9)`;
        }
        // Подфаза 2 (950..1400мс): резко отряхивает снег (shake)
        else if (elapsed < 1400) {
          if (s.dizzyTriggered) {
            s.dizzyTriggered = false;
            setIsDizzy(false);
            setSpeech("Снова наверх! 🎄");
          }
          const shakeElapsed = elapsed - 950;
          const shake = Math.sin(shakeElapsed * 0.05) * Math.exp(-shakeElapsed * 0.006) * 18;
          wrapper.style.transform = `translate3d(0, ${(s.ladderBottomY + 6).toFixed(2)}px, 0) rotate(${shake.toFixed(2)}deg) scale(1, 1)`;
        }
        // Подфаза 3 (1400..2100мс): выпрямляется, готов к новому старту
        else {
          wrapper.style.transform = `translate3d(0, ${s.ladderBottomY}px, 0) scale(1, 1)`;
        }

        if (t >= 1) {
          s.progress = 0.05;
          s.phase = "climbing";
          s.dizzyTriggered = false;
          setIsDizzy(false);
          setPhase("climbing");
          setSpeech(null);
        }
      }

      animId = window.requestAnimationFrame(loop);
    };

    if (!isReducedMotion()) {
      animId = window.requestAnimationFrame(loop);
    } else {
      // Статичный показ внизу лестницы при reduced-motion
      if (santaWrapperRef.current) {
        santaWrapperRef.current.style.transform = `translate3d(0, ${sim.current.ladderBottomY - 120}px, 0)`;
      }
    }

    return () => {
      if (animId !== null) window.cancelAnimationFrame(animId);
      window.removeEventListener("resize", updateLadderDimensions);
    };
  }, [spawnImpactParticles]);

  // ── Периодическая весёлая нотка при подъёме (напевает новогодний мотив) ──
  useEffect(() => {
    if (phase !== "climbing") {
      return;
    }
    const interval = window.setInterval(() => {
      setMusicNote(true);
      window.setTimeout(() => setMusicNote(false), 2200);
    }, 7500);

    return () => {
      window.clearInterval(interval);
      setMusicNote(false);
    };
  }, [phase]);

  // ── Обработка наведения или клика по Деду Морозу ──
  const handleSantaInteract = useCallback(() => {
    if (sim.current.phase === "climbing" || sim.current.phase === "top_cheer") {
      sim.current.phase = "surprised";
      sim.current.surprisedStartTime = performance.now();
      setPhase("surprised");
      setSpeech("Ой-ой-ой! 😱");
    }
  }, []);

  // ── Периодический пролет саней с оленями раз в 45 секунд ──
  useEffect(() => {
    const triggerSleigh = () => {
      setIsSleighFlying(true);
      setSleighProgress(-15);

      const startTime = Date.now();
      const duration = 12000;

      const anim = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;

        if (progress <= 1) {
          setSleighProgress(-15 + progress * 130);
          window.requestAnimationFrame(anim);
        } else {
          setIsSleighFlying(false);
        }
      };

      window.requestAnimationFrame(anim);
    };

    const initialTimer = window.setTimeout(triggerSleigh, 4000);
    const recurringInterval = window.setInterval(triggerSleigh, 45000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(recurringInterval);
    };
  }, []);

  const handleBulbClick = (index: number) => {
    setClickedBulbs((prev) => ({ ...prev, [index]: true }));
    setTimeout(() => {
      setClickedBulbs((prev) => ({ ...prev, [index]: false }));
    }, 600);
  };

  return (
    <div aria-hidden="true" data-testid="winter-newyear-atmosphere">
      {/* ── СЛОЙ 1: За полками (z-0) ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/[0.18] via-emerald-950/[0.08] to-slate-950/[0.14] pointer-events-none" />

        {/* Пролетающие сани с оленями в небе */}
        {isSleighFlying && (
          <div
            className="absolute transition-transform will-change-transform pointer-events-none"
            style={{
              left: `${sleighProgress}%`,
              top: `${14 + Math.sin((sleighProgress / 100) * Math.PI) * 6}%`,
              transform: `scale(0.85) rotate(${Math.cos((sleighProgress / 100) * Math.PI) * 4}deg)`,
              opacity: sleighProgress < 0 || sleighProgress > 100 ? 0 : 0.8,
            }}
          >
            <svg width="140" height="48" viewBox="0 0 140 48" className="drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]">
              <circle cx="8" cy="24" r="2" fill="#fbbf24" opacity="0.6" />
              <circle cx="16" cy="22" r="1.5" fill="#fef08a" opacity="0.8" />
              <circle cx="24" cy="26" r="2.5" fill="#fbbf24" opacity="0.9" />

              <path d="M28 28 L48 28 L54 18 L32 18 Z" fill="#b91c1c" />
              <path d="M26 31 L52 31 L56 26" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <circle cx="34" cy="18" r="7" fill="#78350f" />
              <circle cx="44" cy="14" r="5" fill="#ef4444" />
              <circle cx="44" cy="10" r="4" fill="#fecaca" />
              <path d="M41 8 L47 8 L44 3 Z" fill="#ef4444" />
              <circle cx="44" cy="2" r="1.5" fill="#ffffff" />
              <circle cx="46" cy="12" r="2.5" fill="#ffffff" />

              <path d="M48 16 Q70 18 92 20" stroke="#fef08a" strokeWidth="1" strokeDasharray="2 2" fill="none" opacity="0.7" />

              <g transform="translate(85, 8)">
                <rect x="8" y="10" width="16" height="8" rx="2" fill="#92400e" />
                <rect x="20" y="4" width="6" height="8" rx="1" fill="#92400e" />
                <path d="M24 4 L26 -2 M24 1 L28 0" stroke="#fde68a" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="10" y1="18" x2="8" y2="28" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
                <line x1="14" y1="18" x2="16" y2="28" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
                <line x1="18" y1="18" x2="20" y2="28" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
                <circle cx="27" cy="7" r="1.8" fill="#ef4444" className="animate-pulse" />
              </g>

              <g transform="translate(112, 6)">
                <rect x="8" y="10" width="16" height="8" rx="2" fill="#92400e" />
                <rect x="20" y="4" width="6" height="8" rx="1" fill="#92400e" />
                <path d="M24 4 L26 -2 M24 1 L28 0" stroke="#fde68a" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="10" y1="18" x2="8" y2="28" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
                <line x1="14" y1="18" x2="16" y2="28" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
                <line x1="18" y1="18" x2="20" y2="28" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
              </g>
            </svg>
          </div>
        )}
      </div>

      {/* ── СЛОЙ 2: Падающий снег и золотые конфетти поверх полок (z-20) ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-20">
        <canvas ref={snowCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      </div>

      {/* ── СЛОЙ 3: Мерцающая гирлянда вдоль верха экрана (z-20) ── */}
      <div className="fixed top-0 left-0 right-0 pointer-events-none z-20 select-none overflow-visible">
        <svg
          viewBox="0 0 1200 48"
          preserveAspectRatio="none"
          className="w-full h-12 overflow-visible drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
        >
          <path
            d="M 0,4 Q 100,24 200,4 Q 300,24 400,4 Q 500,24 600,4 Q 700,24 800,4 Q 900,24 1000,4 Q 1100,24 1200,4"
            fill="none"
            stroke="#064e3b"
            strokeWidth="2.5"
          />

          {Array.from({ length: 18 }, (_, i) => {
            const x = 35 + i * 65;
            const arcProgress = (x % 200) / 200;
            const wireY = 4 + Math.sin(arcProgress * Math.PI) * 20;
            const bulb = BULB_COLORS[i % BULB_COLORS.length];
            const isClicked = clickedBulbs[i];

            return (
              <g
                key={i}
                className="pointer-events-auto cursor-pointer transition-transform duration-200 hover:scale-125"
                onClick={() => handleBulbClick(i)}
              >
                <rect x={x - 3} y={wireY} width="6" height="4" fill="#1e293b" rx="1" />
                <circle
                  cx={x}
                  cy={wireY + 8}
                  r={isClicked ? 7.5 : 5.5}
                  fill={bulb.color}
                  className="transition-all duration-300"
                  style={{
                    filter: `drop-shadow(0 0 ${isClicked ? "14px" : "6px"} ${bulb.glow})`,
                    opacity: isClicked ? 1 : 0.88,
                  }}
                />
                <circle cx={x - 1.5} cy={wireY + 6.5} r="1.5" fill="#ffffff" opacity="0.6" />
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── СЛОЙ 3.5: Снеговик у подножия лестницы (z-25, поверх фона и полок) ── */}
      <div
        className="fixed left-16 sm:left-20 md:left-24 bottom-1 z-25 pointer-events-auto cursor-pointer select-none transition-transform duration-300 hover:scale-110 drop-shadow-[0_4px_12px_rgba(0,0,0,0.55)]"
        onMouseEnter={() => setIsSnowmanWinking(true)}
        onMouseLeave={() => setIsSnowmanWinking(false)}
        onClick={() => setIsSnowmanWinking((v) => !v)}
        title="Снеговик! Нажми, чтобы он подмигнул ⛄"
      >
        {/* Сугроб под снеговиком */}
        <div className="absolute -bottom-2 -left-4 w-28 h-8 bg-emerald-100/40 blur-xs rounded-full pointer-events-none" />

        <svg width="68" height="88" viewBox="0 0 74 96" className="drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
          {/* Нижний ком */}
          <circle cx="37" cy="72" r="22" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.8" />
          <circle cx="37" cy="65" r="2.2" fill="#1e293b" />
          <circle cx="37" cy="75" r="2.2" fill="#1e293b" />

          {/* Ручки-веточки (при испуге поднимает руки в волнении) */}
          {phase === "falling" || phase === "surprised" ? (
            <>
              <line x1="18" y1="46" x2="6" y2="28" stroke="#78350f" strokeWidth="2.8" strokeLinecap="round" />
              <line x1="10" y1="34" x2="4" y2="24" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
              <line x1="56" y1="46" x2="68" y2="28" stroke="#78350f" strokeWidth="2.8" strokeLinecap="round" />
              <line x1="64" y1="34" x2="70" y2="24" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
            </>
          ) : (
            <>
              <line x1="18" y1="46" x2="4" y2="38" stroke="#78350f" strokeWidth="2.8" strokeLinecap="round" />
              <line x1="8" y1="40" x2="6" y2="32" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
              <line x1="56" y1="46" x2="70" y2="38" stroke="#78350f" strokeWidth="2.8" strokeLinecap="round" />
              <line x1="66" y1="40" x2="68" y2="32" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
            </>
          )}

          {/* Средний ком */}
          <circle cx="37" cy="46" r="16" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.8" />
          <circle cx="37" cy="42" r="2" fill="#1e293b" />
          <circle cx="37" cy="50" r="2" fill="#1e293b" />

          {/* Шарфик с развевающимся кончиком */}
          <path d="M26 38 C32 42 42 42 48 38 L49 43 C42 47 32 47 25 43 Z" fill="#ef4444" />
          <path d="M42 40 L46 56 L39 56 L38 41 Z" fill="#10b981" />

          {/* Голова */}
          <circle cx="37" cy="24" r="12" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.8" />

          {/* Глазки */}
          {phase === "falling" || phase === "surprised" ? (
            <>
              <circle cx="33" cy="22" r="2.2" fill="#0f172a" />
              <circle cx="41" cy="22" r="2.2" fill="#0f172a" />
            </>
          ) : isSnowmanWinking ? (
            <>
              <circle cx="33" cy="22" r="2" fill="#0f172a" />
              <line x1="39" y1="22" x2="43" y2="22" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="33" cy="22" r="2" fill="#0f172a" />
              <circle cx="41" cy="22" r="2" fill="#0f172a" />
            </>
          )}

          {/* Нос-морковка */}
          <polygon points="36,24 47,26 36,27" fill="#f97316" />

          {/* Улыбка */}
          <circle cx="32" cy="29" r="1.1" fill="#0f172a" />
          <circle cx="35" cy="30.5" r="1.1" fill="#0f172a" />
          <circle cx="39" cy="30.5" r="1.1" fill="#0f172a" />
          <circle cx="42" cy="29" r="1.1" fill="#0f172a" />

          {/* Ведёрко на голове */}
          <polygon points="28,14 46,14 44,2 30,2" fill="#475569" stroke="#334155" strokeWidth="1" />
          <line x1="26" y1="14" x2="48" y2="14" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
        </svg>

        {/* Облачко реплики снеговика при клике или реакциях на Деда Мороза */}
        {isSnowmanWinking && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-white text-slate-800 font-bold text-[11px] rounded-full shadow-md whitespace-nowrap pointer-events-none animate-bounce border border-slate-200">
            Привет! ⛄
          </div>
        )}
        {(phase === "falling" || phase === "surprised") && !isSnowmanWinking && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-amber-300 text-amber-950 font-black text-[11px] rounded-full shadow-md whitespace-nowrap pointer-events-none animate-pulse border border-amber-400">
            Держись! 😱
          </div>
        )}
        {phase === "impact" && !isSnowmanWinking && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-sky-200 text-sky-950 font-bold text-[11px] rounded-full shadow-md whitespace-nowrap pointer-events-none border border-sky-300">
            Ох, живой? ☃️
          </div>
        )}
        {phase === "recovering" && !isDizzy && !isSnowmanWinking && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-emerald-200 text-emerald-950 font-bold text-[11px] rounded-full shadow-md whitespace-nowrap pointer-events-none animate-bounce border border-emerald-300">
            Ты сможешь! 🌟
          </div>
        )}
      </div>

      {/* ── СЛОЙ 4: Дед Мороз на верёвочной лестнице слева (z-30) ── */}
      <div
        className="fixed left-2 sm:left-4 md:left-6 top-0 bottom-0 pointer-events-auto z-30 select-none flex flex-col items-center justify-between"
        style={{ width: "54px" }}
      >
        {/* Верёвочная лестница с деревянными перекладинами */}
        <div className="absolute inset-0 pointer-events-none flex justify-between px-1">
          <div className="w-[3.5px] h-full bg-gradient-to-b from-amber-950 via-amber-800 to-amber-950 shadow-[0_0_3px_rgba(0,0,0,0.6)]" />
          <div className="w-[3.5px] h-full bg-gradient-to-b from-amber-950 via-amber-800 to-amber-950 shadow-[0_0_3px_rgba(0,0,0,0.6)]" />

          {/* Перекладины лестницы каждые 26px */}
          <div className="absolute inset-0 flex flex-col justify-between py-6">
            {Array.from({ length: 30 }, (_, i) => (
              <div
                key={i}
                className="w-full h-[4px] bg-gradient-to-r from-amber-900 via-amber-700 to-amber-900 rounded-sm shadow-sm border-t border-amber-600/30"
              />
            ))}
          </div>
        </div>

        {/* Сугроб внизу лестницы с эффектом пружинящего проминания */}
        <div
          ref={snowdriftRef}
          className="absolute bottom-0 w-24 h-11 bg-gradient-to-t from-emerald-100 to-white/95 rounded-t-full shadow-lg border-t border-emerald-300/40 pointer-events-none transition-transform duration-100 will-change-transform"
        >
          <div className="absolute inset-x-2 -top-1.5 h-3.5 bg-white rounded-full blur-[1px]" />
        </div>

        {/* Интерактивный персонаж Деда Мороза (60 FPS субпиксельное позиционирование) */}
        <div
          ref={santaWrapperRef}
          className="absolute left-0 right-0 flex justify-center cursor-pointer will-change-transform"
          style={{
            top: 0,
            transformOrigin: "center center",
          }}
          onMouseEnter={handleSantaInteract}
          onClick={handleSantaInteract}
          title={
            phase === "climbing"
              ? "Дед Мороз усердно карабкается наверх! Наведи курсор или кликни :)"
              : phase === "falling"
                ? "Держись крепче!"
                : "Отдыхает в сугробе"
          }
        >
          {/* Фотореалистичный 3D Дед Мороз из santa.png */}
          <img
            src="/santa.png"
            alt="Дед Мороз"
            className="w-[74px] h-[74px] max-w-none object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.55)] pointer-events-none select-none"
          />

          {/* ── Оверлеи эмоций и визуальных эффектов ── */}
          {/* 1. Испуг: капля пота паники и восклицательный знак */}
          {phase === "surprised" && (
            <div className="absolute -top-3.5 right-0.5 flex items-center gap-0.5 pointer-events-none select-none animate-bounce">
              <span className="text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">💦</span>
              <span className="text-sm font-black text-amber-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">❗️</span>
            </div>
          )}

          {/* 2. Потоки ветра при стремительном падении */}
          {phase === "falling" && (
            <div className="absolute -top-5 inset-x-0 flex justify-center pointer-events-none select-none">
              <span className="text-base opacity-90 drop-shadow animate-pulse">💨</span>
            </div>
          )}

          {/* 3. Вращающиеся звёздочки головокружения в сугробе */}
          {phase === "recovering" && isDizzy && (
            <div className="absolute -top-5 inset-x-0 flex justify-center items-center gap-1 pointer-events-none select-none animate-pulse">
              <span className="text-xs animate-spin inline-block text-amber-300" style={{ animationDuration: "1s" }}>
                💫
              </span>
              <span className="text-sm text-amber-300 animate-bounce inline-block">
                ⭐
              </span>
              <span className="text-xs animate-spin inline-block text-yellow-200" style={{ animationDuration: "1.4s", animationDirection: "reverse" }}>
                ✨
              </span>
            </div>
          )}

          {/* 4. Весёлая нотка при подъёме (напевает новогодний мотив) */}
          {phase === "climbing" && musicNote && (
            <div className="absolute -top-3.5 right-1 text-xs text-amber-200/90 pointer-events-none select-none animate-bounce">
              🎵
            </div>
          )}

          {/* 5. Салют радости на вершине */}
          {phase === "top_cheer" && (
            <div className="absolute -top-4 inset-x-0 flex justify-center gap-1 text-xs pointer-events-none select-none animate-bounce">
              <span>🎉</span>
              <span>✨</span>
            </div>
          )}

          {/* Интерактивная плашка с репликой Деда Мороза */}
          {speech && (
            <div
              className={`absolute px-2.5 py-0.5 rounded-full font-black text-[11px] shadow-lg whitespace-nowrap transition-all duration-300 pointer-events-none ${
                phase === "recovering" && isDizzy
                  ? "-top-11 bg-amber-400 text-amber-950 scale-105"
                  : phase === "surprised" || phase === "falling"
                    ? "-top-9 bg-amber-400 text-amber-950 scale-110"
                    : phase === "impact"
                      ? "-top-8 bg-sky-400 text-sky-950 scale-120"
                      : "-top-8 bg-emerald-600 text-white"
              }`}
            >
              {speech}
            </div>
          )}
        </div>

        {/* Анимированный фонтан снежных брызг и звёздочек при приземлении */}
        {burstParticles.map((p) => (
          <div
            key={p.id}
            className="absolute bottom-5 pointer-events-none will-change-transform select-none"
            style={{
              transform: `translate3d(${p.x}px, ${p.y}px, 0) rotate(${p.rotation}deg)`,
              opacity: p.opacity,
              fontSize: `${p.size}px`,
              color: p.color,
            }}
          >
            {p.isStar ? "⭐" : "❄️"}
          </div>
        ))}
      </div>
    </div>
  );
}
