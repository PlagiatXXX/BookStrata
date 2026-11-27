import { useEffect, useRef } from "react";
import { stepAndRenderBatches } from "./dustEngine";
import { getActiveDustBatches, subscribeDustWake } from "./dustController";

/**
 * Глобальный canvas-оверлей для анимации рассыпания элементов в пыль (Dust Delete).
 * Запускает requestAnimationFrame только при наличии активных частиц (0% нагрузки в покое).
 */
export function DustOverlay() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = 1;
    let width = 0;
    let height = 0;
    let frame: ImageData | null = null;
    let f32: Uint32Array | null = null;
    let rafId = 0;

    const fit = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      frame = ctx.createImageData(canvas.width, canvas.height);
      f32 = new Uint32Array(frame.data.buffer);
    };

    fit();
    window.addEventListener("resize", fit);

    const tick = (nowMs: number) => {
      rafId = 0;
      if (!frame || !f32) return;

      const currentSec =
        typeof performance !== "undefined" ? performance.now() / 1000 : nowMs / 1000;
      const batches = getActiveDustBatches();
      const active = stepAndRenderBatches(
        batches,
        currentSec,
        f32,
        canvas.width,
        canvas.height,
        dpr,
      );
      ctx.putImageData(frame, 0, 0);

      if (active > 0) {
        rafId = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    const wake = () => {
      if (!rafId) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const unsubscribe = subscribeDustWake(wake);
    if (getActiveDustBatches().some((b) => b.state === "dust" || b.state === "back")) {
      wake();
    }

    return () => {
      unsubscribe();
      window.removeEventListener("resize", fit);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[9998] pointer-events-none block h-full w-full"
      aria-hidden="true"
    />
  );
}
