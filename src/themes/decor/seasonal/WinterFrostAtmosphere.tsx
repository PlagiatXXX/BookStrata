import { useEffect, useRef } from "react";

interface Snowflake {
  x: number;
  y: number;
  size: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  wobblePhase: number;
  wobbleSpeed: number;
  opacity: number;
  strokeColor: string;
  coreColor: string;
}

const SNOWFLAKE_COUNT = 18;

function createSnowflakes(width: number, height: number): Snowflake[] {
  return Array.from({ length: SNOWFLAKE_COUNT }, () => {
    const opacity = 0.4 + Math.random() * 0.4;
    return {
      x: Math.random() * (width || 800),
      y: Math.random() * (height || 600),
      size: 3 + Math.random() * 4,
      vy: 0.6 + Math.random() * 0.8,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.02,
      opacity,
      strokeColor: `rgba(240, 249, 255, ${opacity.toFixed(2)})`,
      coreColor: `rgba(255, 255, 255, ${(opacity * 0.9).toFixed(2)})`,
    };
  });
}

function createFrostGradient(ctx: CanvasRenderingContext2D, width: number, height: number): CanvasGradient {
  const maxDim = Math.max(width, height);
  const grad = ctx.createRadialGradient(
    width / 2,
    height / 2,
    maxDim * 0.35,
    width / 2,
    height / 2,
    maxDim * 0.72,
  );
  grad.addColorStop(0, "rgba(224, 242, 254, 0)");
  grad.addColorStop(0.65, "rgba(224, 242, 254, 0.12)");
  grad.addColorStop(1, "rgba(240, 249, 255, 0.28)");
  return grad;
}

function drawFrostBase(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  gradient: CanvasGradient,
  alphaMultiplier = 1,
) {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = alphaMultiplier;
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawCrystal(ctx: CanvasRenderingContext2D, flake: Snowflake) {
  ctx.save();
  ctx.strokeStyle = flake.strokeColor;
  ctx.lineWidth = 1;
  ctx.beginPath();

  // 6-лучевой кристалл
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI) / 3;
    const cos = Math.cos(angle) * flake.size;
    const sin = Math.sin(angle) * flake.size;
    ctx.moveTo(-cos, -sin);
    ctx.lineTo(cos, sin);
  }
  ctx.stroke();

  // Маленькое ядро
  ctx.fillStyle = flake.coreColor;
  ctx.beginPath();
  ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function WinterFrostAtmosphere() {
  const frostCanvasRef = useRef<HTMLCanvasElement>(null);
  const snowCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const frostCanvas = frostCanvasRef.current;
    const snowCanvas = snowCanvasRef.current;
    if (!frostCanvas || !snowCanvas) return;

    const frostCtx = frostCanvas.getContext("2d");
    const snowCtx = snowCanvas.getContext("2d");
    if (!frostCtx || !snowCtx) return;

    let width = window.innerWidth || 800;
    let height = window.innerHeight || 600;

    const setupCanvases = () => {
      const currentDpr = Math.min(window.devicePixelRatio || 1, 2);
      frostCanvas.width = Math.floor(width * currentDpr);
      frostCanvas.height = Math.floor(height * currentDpr);
      frostCtx.setTransform(currentDpr, 0, 0, currentDpr, 0, 0);

      snowCanvas.width = Math.floor(width * currentDpr);
      snowCanvas.height = Math.floor(height * currentDpr);
      snowCtx.setTransform(currentDpr, 0, 0, currentDpr, 0, 0);
    };

    setupCanvases();

    const snowflakes = createSnowflakes(width, height);
    let animId: number | null = null;
    let cachedFrostGrad = createFrostGradient(frostCtx, width, height);

    drawFrostBase(frostCtx, width, height, cachedFrostGrad, 1);

    const isReducedMotion = () => {
      if (typeof window === "undefined" || !window.matchMedia) return false;
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    };

    const renderStaticFrame = () => {
      snowCtx.clearRect(0, 0, width, height);
      if (cachedFrostGrad) {
        drawFrostBase(frostCtx, width, height, cachedFrostGrad, 1);
      }
      for (const flake of snowflakes) {
        snowCtx.save();
        snowCtx.translate(flake.x, flake.y);
        snowCtx.rotate(flake.rotation);
        drawCrystal(snowCtx, flake);
        snowCtx.restore();
      }
    };

    const renderLoopFrame = () => {
      // 1. Медленная кристаллизация (намораживание) слоя инея за полками
      if (cachedFrostGrad) {
        drawFrostBase(frostCtx, width, height, cachedFrostGrad, 0.006);
      }

      // 2. Отрисовка снежинок поверх полок тир-листа
      snowCtx.clearRect(0, 0, width, height);
      for (const flake of snowflakes) {
        flake.wobblePhase += flake.wobbleSpeed;
        flake.x += Math.sin(flake.wobblePhase) * 0.6;
        flake.y += flake.vy;
        flake.rotation += flake.rotationSpeed;

        if (flake.y > height + 20) {
          flake.y = -10;
          flake.x = Math.random() * width;
        }

        snowCtx.save();
        snowCtx.translate(flake.x, flake.y);
        snowCtx.rotate(flake.rotation);
        drawCrystal(snowCtx, flake);
        snowCtx.restore();
      }
    };

    const loop = () => {
      renderLoopFrame();
      animId = window.requestAnimationFrame(loop);
    };

    const startAnimation = () => {
      if (isReducedMotion()) {
        renderStaticFrame();
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
      // Подтаивание инея под курсором: круг радиусом 50px
      frostCtx.save();
      frostCtx.globalCompositeOperation = "destination-out";
      const radius = 50;
      const meltGrad = frostCtx.createRadialGradient(
        e.clientX,
        e.clientY,
        0,
        e.clientX,
        e.clientY,
        radius,
      );
      meltGrad.addColorStop(0, "rgba(0, 0, 0, 0.85)");
      meltGrad.addColorStop(0.7, "rgba(0, 0, 0, 0.45)");
      meltGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

      frostCtx.fillStyle = meltGrad;
      frostCtx.beginPath();
      frostCtx.arc(e.clientX, e.clientY, radius, 0, Math.PI * 2);
      frostCtx.fill();
      frostCtx.restore();

      if (isReducedMotion()) {
        renderStaticFrame();
      }
    };

    const handleResize = () => {
      width = window.innerWidth || 800;
      height = window.innerHeight || 600;
      setupCanvases();
      cachedFrostGrad = createFrostGradient(frostCtx, width, height);
      drawFrostBase(frostCtx, width, height, cachedFrostGrad, 1);

      if (isReducedMotion()) {
        renderStaticFrame();
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
  }, []);

  return (
    <div
      aria-hidden="true"
      data-testid="winter-frost-atmosphere"
    >
      {/* 1. Слой за полками (z-0): виньетка инея и интерактивное подтаивание */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: "inset 0 0 100px rgba(186, 230, 253, 0.12)",
          }}
        />
        <canvas ref={frostCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      </div>

      {/* 2. Слой поверх полок тир-листа (z-20): парящие кристальные снежинки */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-20">
        <canvas ref={snowCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      </div>
    </div>
  );
}
