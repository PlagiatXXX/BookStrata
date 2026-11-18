import { useEffect, useRef } from "react";

interface AuroraFlake {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  opacity: number;
  layer: "deep" | "mid" | "bokeh";
  fillStyle: string;
}

const PARTICLE_COUNT = 45;

function createParticles(width: number, height: number): AuroraFlake[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    // Распределение по 3 слоям: 45% deep, 35% mid, 20% bokeh
    const ratio = i / PARTICLE_COUNT;
    let layer: "deep" | "mid" | "bokeh" = "deep";
    let radius = 1.2;
    let vy = 0.8;
    let vx = 0.5;
    let opacity = 0.4;

    if (ratio > 0.8) {
      layer = "bokeh";
      radius = 5 + Math.random() * 3.5;
      vy = 2.4 + Math.random() * 1.2;
      vx = 1.6 + Math.random() * 0.8;
      opacity = 0.22 + Math.random() * 0.12;
    } else if (ratio > 0.45) {
      layer = "mid";
      radius = 2.2 + Math.random() * 1.2;
      vy = 1.4 + Math.random() * 0.8;
      vx = 0.9 + Math.random() * 0.5;
      opacity = 0.5 + Math.random() * 0.2;
    } else {
      layer = "deep";
      radius = 1 + Math.random() * 0.6;
      vy = 0.7 + Math.random() * 0.5;
      vx = 0.4 + Math.random() * 0.4;
      opacity = 0.35 + Math.random() * 0.2;
    }

    return {
      x: Math.random() * (width + 200) - 100,
      y: Math.random() * (height || 600),
      radius,
      vx,
      vy,
      opacity,
      layer,
      fillStyle: `rgba(240, 249, 255, ${opacity.toFixed(2)})`,
    };
  });
}

interface WaveConfig {
  color: string;
  baseYFactor: number;
  amplitude1: number;
  amplitude2: number;
  freq1: number;
  freq2: number;
  speed: number;
}

const AURORA_WAVES: WaveConfig[] = [
  // Бирюзовая волна (#2dd4bf)
  {
    color: "rgba(45, 212, 191, 0.16)",
    baseYFactor: 0.18,
    amplitude1: 42,
    amplitude2: 22,
    freq1: 0.0028,
    freq2: 0.0055,
    speed: 0.007,
  },
  // Циановая волна (#06b6d4)
  {
    color: "rgba(6, 182, 212, 0.14)",
    baseYFactor: 0.24,
    amplitude1: 36,
    amplitude2: 26,
    freq1: 0.0032,
    freq2: 0.0062,
    speed: 0.0055,
  },
  // Аметистовая волна (#a855f7)
  {
    color: "rgba(168, 85, 247, 0.13)",
    baseYFactor: 0.14,
    amplitude1: 48,
    amplitude2: 28,
    freq1: 0.0025,
    freq2: 0.0048,
    speed: 0.0045,
  },
];

export function WinterAuroraAtmosphere() {
  const auroraCanvasRef = useRef<HTMLCanvasElement>(null);
  const snowCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const auroraCanvas = auroraCanvasRef.current;
    const snowCanvas = snowCanvasRef.current;
    if (!auroraCanvas || !snowCanvas) return;

    const auroraCtx = auroraCanvas.getContext("2d");
    const snowCtx = snowCanvas.getContext("2d");
    if (!auroraCtx || !snowCtx) return;

    let width = window.innerWidth || 800;
    let height = window.innerHeight || 600;

    const setupCanvases = () => {
      const currentDpr = Math.min(window.devicePixelRatio || 1, 2);
      auroraCanvas.width = Math.floor(width * currentDpr);
      auroraCanvas.height = Math.floor(height * currentDpr);
      auroraCtx.setTransform(currentDpr, 0, 0, currentDpr, 0, 0);

      snowCanvas.width = Math.floor(width * currentDpr);
      snowCanvas.height = Math.floor(height * currentDpr);
      snowCtx.setTransform(currentDpr, 0, 0, currentDpr, 0, 0);
    };

    setupCanvases();

    const particles = createParticles(width, height);
    let time = 0;
    let animId: number | null = null;

    let waveGradients: CanvasGradient[] = [];
    const updateWaveGradients = () => {
      waveGradients = AURORA_WAVES.map((wave) => {
        const baseY = height * wave.baseYFactor;
        const grad = auroraCtx.createLinearGradient(0, 0, 0, baseY + wave.amplitude1 + wave.amplitude2);
        grad.addColorStop(0, "rgba(0, 0, 0, 0)");
        grad.addColorStop(0.3, wave.color);
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        return grad;
      });
    };
    updateWaveGradients();

    // Предрассчитанный offscreen спрайт для боке снежинок
    let bokehCanvas: HTMLCanvasElement | null = null;
    if (typeof document !== "undefined") {
      bokehCanvas = document.createElement("canvas");
      bokehCanvas.width = 32;
      bokehCanvas.height = 32;
      const bCtx = bokehCanvas.getContext("2d");
      if (bCtx) {
        const bGrad = bCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
        bGrad.addColorStop(0, "rgba(255, 255, 255, 1)");
        bGrad.addColorStop(0.5, "rgba(224, 242, 254, 0.6)");
        bGrad.addColorStop(1, "rgba(224, 242, 254, 0)");
        bCtx.fillStyle = bGrad;
        bCtx.beginPath();
        bCtx.arc(16, 16, 16, 0, Math.PI * 2);
        bCtx.fill();
      }
    }

    const isReducedMotion = () => {
      if (typeof window === "undefined" || !window.matchMedia) return false;
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    };

    const drawAuroraWave = (wave: WaveConfig, waveIndex: number, t: number) => {
      auroraCtx.save();
      auroraCtx.globalCompositeOperation = "screen";

      const baseY = height * wave.baseYFactor;
      const step = 20;

      auroraCtx.beginPath();
      auroraCtx.moveTo(0, 0);
      auroraCtx.lineTo(0, baseY);

      for (let x = 0; x <= width; x += step) {
        const y =
          baseY +
          Math.sin(x * wave.freq1 + t * wave.speed) * wave.amplitude1 +
          Math.cos(x * wave.freq2 + t * wave.speed * 0.7) * wave.amplitude2;
        auroraCtx.lineTo(x, y);
      }

      auroraCtx.lineTo(width, 0);
      auroraCtx.closePath();

      auroraCtx.fillStyle = waveGradients[waveIndex] || wave.color;
      auroraCtx.fill();
      auroraCtx.restore();
    };

    const drawSnowflake = (p: AuroraFlake) => {
      snowCtx.save();
      if (p.layer === "bokeh" && bokehCanvas) {
        snowCtx.globalAlpha = p.opacity;
        snowCtx.drawImage(bokehCanvas, p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
      } else {
        snowCtx.fillStyle = p.fillStyle;
        snowCtx.beginPath();
        snowCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        snowCtx.fill();
      }
      snowCtx.restore();
    };

    const renderFrame = (t: number) => {
      // 1. Волны северного сияния (за полками)
      auroraCtx.clearRect(0, 0, width, height);
      for (let i = 0; i < AURORA_WAVES.length; i++) {
        drawAuroraWave(AURORA_WAVES[i], i, t);
      }

      // 2. Метель из снежинок (поверх полок)
      snowCtx.clearRect(0, 0, width, height);
      for (const p of particles) {
        drawSnowflake(p);
      }
    };

    const updateParticles = () => {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.y > height + 20) {
          p.y = -15;
          p.x = Math.random() * (width + 200) - 100;
        }
        if (p.x > width + 50) {
          p.x = -30;
        }
      }
    };

    const loop = () => {
      time += 1;
      updateParticles();
      renderFrame(time);
      animId = window.requestAnimationFrame(loop);
    };

    const startAnimation = () => {
      if (isReducedMotion()) {
        renderFrame(0);
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

    const handleResize = () => {
      width = window.innerWidth || 800;
      height = window.innerHeight || 600;
      setupCanvases();
      updateWaveGradients();
      if (isReducedMotion()) {
        renderFrame(0);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAnimation();
      } else {
        startAnimation();
      }
    };

    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    startAnimation();

    return () => {
      stopAnimation();
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      data-testid="winter-aurora-atmosphere"
    >
      {/* 1. Слой за полками (z-0): базовый ночной градиент и волны северного сияния */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-950/[0.12] via-purple-950/[0.08] to-transparent pointer-events-none" />
        <canvas ref={auroraCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      </div>

      {/* 2. Слой поверх полок тир-листа (z-20): снежная метель и боке */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-20">
        <canvas ref={snowCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      </div>
    </div>
  );
}
