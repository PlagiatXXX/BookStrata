import { useEffect, useRef } from "react";

interface Leaf {
  x: number;
  y: number;
  size: number;
  color: string;
  vy: number;
  windVx: number;
  windVy: number;
  rotation: number;
  rotationSpeed: number;
  wobblePhase: number;
  wobbleSpeed: number;
  wobbleAmp: number;
  type: number; // 0: кленовый, 1: дубовый/овальный
}

const LEAF_COLORS = ["#d97706", "#b45309", "#f59e0b", "#78350f", "#c2410c"];
const LEAF_COUNT = 18;

function createLeaves(width: number, height: number): Leaf[] {
  return Array.from({ length: LEAF_COUNT }, (_, i) => ({
    x: Math.random() * (width || 800),
    y: Math.random() * (height || 600),
    size: 14 + Math.random() * 12,
    color: LEAF_COLORS[i % LEAF_COLORS.length],
    vy: 0.7 + Math.random() * 0.9,
    windVx: 0,
    windVy: 0,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.03,
    wobblePhase: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.02 + Math.random() * 0.02,
    wobbleAmp: 0.8 + Math.random() * 1.2,
    type: i % 2,
  }));
}

function drawLeafShape(ctx: CanvasRenderingContext2D, size: number, color: string, type: number) {
  ctx.save();
  ctx.fillStyle = color;

  if (type === 0) {
    // Кленовый лист с 5 заостренными лучами
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(size * 0.35, -size * 0.7, size * 0.6, -size * 0.4);
    ctx.quadraticCurveTo(size * 0.35, -size * 0.2, size * 0.8, 0);
    ctx.quadraticCurveTo(size * 0.4, size * 0.3, size * 0.5, size * 0.6);
    ctx.quadraticCurveTo(size * 0.2, size * 0.5, 0, size * 0.85);
    ctx.quadraticCurveTo(-size * 0.2, size * 0.5, -size * 0.5, size * 0.6);
    ctx.quadraticCurveTo(-size * 0.4, size * 0.3, -size * 0.8, 0);
    ctx.quadraticCurveTo(-size * 0.35, -size * 0.2, -size * 0.6, -size * 0.4);
    ctx.quadraticCurveTo(-size * 0.35, -size * 0.7, 0, -size);
    ctx.fill();

    // Черешок
    ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
    ctx.lineWidth = Math.max(1, size * 0.08);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, size * 1.15);
    ctx.stroke();
  } else {
    // Дубовый / овальный резной лист
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.bezierCurveTo(size * 0.65, -size * 0.6, size * 0.65, size * 0.5, 0, size);
    ctx.bezierCurveTo(-size * 0.65, size * 0.5, -size * 0.65, -size * 0.6, 0, -size);
    ctx.fill();

    // Прожилка
    ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
    ctx.lineWidth = Math.max(1, size * 0.08);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.85);
    ctx.lineTo(0, size * 0.9);
    ctx.stroke();
  }

  ctx.restore();
}

export function AutumnLeavesAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth || 800;
    let height = window.innerHeight || 600;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const leaves = createLeaves(width, height);
    let animId: number | null = null;
    let lastPointerX: number | null = null;
    let lastPointerY: number | null = null;

    const isReducedMotion = () => {
      if (typeof window === "undefined" || !window.matchMedia) return false;
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    };

    const renderFrame = () => {
      ctx.clearRect(0, 0, width, height);

      for (const leaf of leaves) {
        ctx.save();
        ctx.translate(leaf.x, leaf.y);
        ctx.rotate(leaf.rotation);
        drawLeafShape(ctx, leaf.size, leaf.color, leaf.type);
        ctx.restore();
      }
    };

    const updateLeaves = () => {
      for (const leaf of leaves) {
        leaf.wobblePhase += leaf.wobbleSpeed;
        const wobble = Math.sin(leaf.wobblePhase) * leaf.wobbleAmp;

        leaf.x += wobble + leaf.windVx;
        leaf.y += leaf.vy + leaf.windVy;
        leaf.rotation += leaf.rotationSpeed + leaf.windVx * 0.03;

        // Затухание ветра
        leaf.windVx *= 0.95;
        leaf.windVy *= 0.95;

        // Перенос за границы
        if (leaf.y > height + 40) {
          leaf.y = -30;
          leaf.x = Math.random() * width;
          leaf.windVx = 0;
          leaf.windVy = 0;
        } else if (leaf.x < -60) {
          leaf.x = width + 30;
        } else if (leaf.x > width + 60) {
          leaf.x = -30;
        }
      }
    };

    const loop = () => {
      updateLeaves();
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
      if (lastPointerX !== null && lastPointerY !== null) {
        const dx = e.clientX - lastPointerX;
        const dy = e.clientY - lastPointerY;

        for (const leaf of leaves) {
          const distX = leaf.x - e.clientX;
          const distY = leaf.y - e.clientY;
          const dist = Math.hypot(distX, distY);

          if (dist < 180) {
            const impulse = (1 - dist / 180) * 1.5;
            leaf.windVx += Math.max(-8, Math.min(8, dx * 0.12 * impulse));
            leaf.windVy += Math.max(-5, Math.min(5, dy * 0.08 * impulse));
          }
        }
      }
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
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
  }, []);

  return (
    <>
      {/* Мягкий янтарный фон за полками */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden z-0"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.04] via-transparent to-amber-950/[0.07] pointer-events-none" />
      </div>

      {/* Парящие листья поверх полок тир-листа */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden z-20"
        aria-hidden="true"
        data-testid="autumn-leaves-atmosphere"
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      </div>
    </>
  );
}
