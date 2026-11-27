export interface SpringState {
  x: number;
  v: number;
  t: number;
  k: number;
  c: number;
}

export interface DustRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type DustBatchState = "dust" | "gone" | "back" | "restored";

export interface DustBatch {
  id: string;
  rect: DustRect;
  stepPx: number;
  n: number;
  hx: Float32Array;
  hy: Float32Array;
  px: Float32Array;
  py: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  dl: Float32Array;
  sx: Float32Array;
  sy: Float32Array;
  d2: Float32Array;
  col: Uint32Array;
  t0: number;
  t1: number;
  reduceMotion: boolean;
  state: DustBatchState;
  onGone?: () => void;
  onRestored?: () => void;
}

export interface CreateDustBatchInput {
  id: string;
  rect: DustRect;
  stepPx: number;
  pixels: Float32Array;
  colors: Uint32Array;
  nowSec: number;
  reduceMotion: boolean;
  onGone?: () => void;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Пружина с параметрами по умолчанию 260 / 22 (entrance spring из Dust Delete). */
export function createSpring(x: number, k = 260, c = 22): SpringState {
  return { x, v: 0, t: x, k, c };
}

export function stepSpring(s: SpringState, dt: number): void {
  const a = -s.k * (s.x - s.t) - s.c * s.v;
  s.v += a * dt;
  s.x += s.v * dt;
}

/** Создаёт батч частиц из массива координат [x0, y0, x1, y1, ...] и цветов ABGR. */
export function createDustBatch({
  id,
  rect,
  stepPx,
  pixels,
  colors,
  nowSec,
  reduceMotion,
  onGone,
}: CreateDustBatchInput): DustBatch {
  const n = colors.length;
  const hx = new Float32Array(n);
  const hy = new Float32Array(n);
  const px = new Float32Array(n);
  const py = new Float32Array(n);
  const vx = new Float32Array(n);
  const vy = new Float32Array(n);
  const dl = new Float32Array(n);
  const sx = new Float32Array(n);
  const sy = new Float32Array(n);
  const d2 = new Float32Array(n);
  const col = new Uint32Array(colors);

  const x0 = rect.left;
  const w = Math.max(1, rect.width);
  const midY = rect.top + rect.height / 2;

  for (let i = 0; i < n; i++) {
    const x = pixels[i * 2];
    const y = pixels[i * 2 + 1];
    hx[i] = px[i] = x;
    hy[i] = py[i] = y;
    // Задержка старта растёт справа налево — эффект сдувания с правого края
    dl[i] = reduceMotion
      ? 0
      : ((x0 + w - x) / w) * 0.56 +
        Math.random() * 0.16 +
        Math.abs(y - midY) * 0.0012;
    vx[i] = -(50 + Math.random() * 150);
    vy[i] = -(25 + Math.random() * 75);
  }

  return {
    id,
    rect: { ...rect },
    stepPx,
    n,
    hx,
    hy,
    px,
    py,
    vx,
    vy,
    dl,
    sx,
    sy,
    d2,
    col,
    t0: nowSec,
    t1: nowSec,
    reduceMotion,
    state: n > 0 ? "dust" : "gone",
    onGone,
  };
}

/** Переводит батч в фазу обратной сборки (Undo), смещая цель на актуальный rect элемента. */
export function startBatchReassemble(
  batch: DustBatch,
  targetRect: DustRect | undefined,
  nowSec: number,
  reduceMotion: boolean,
  onRestored?: () => void,
): void {
  const dx = targetRect ? targetRect.left - batch.rect.left : 0;
  const dy = targetRect ? targetRect.top - batch.rect.top : 0;
  if (targetRect) {
    batch.rect = { ...targetRect };
  }

  const x0 = batch.rect.left;
  const w = Math.max(1, batch.rect.width);
  const vpW = typeof window !== "undefined" ? window.innerWidth : 1920;

  for (let i = 0; i < batch.n; i++) {
    if (dx !== 0 || dy !== 0) {
      batch.hx[i] += dx;
      batch.hy[i] += dy;
    }
    batch.sx[i] = clamp(batch.px[i], -30, vpW + 30);
    batch.sy[i] = batch.py[i];
    batch.d2[i] = reduceMotion
      ? 0
      : ((batch.hx[i] - x0) / w) * 0.38 + Math.random() * 0.12;
  }

  batch.t1 = nowSec;
  batch.reduceMotion = reduceMotion;
  batch.state = "back";
  batch.onRestored = onRestored;
}

/** Обновляет физику и рисует все активные батчи в буфер ImageData (Uint32Array). */
export function stepAndRenderBatches(
  batches: DustBatch[],
  nowSec: number,
  f32: Uint32Array,
  canvasW: number,
  canvasH: number,
  dpr: number,
): number {
  f32.fill(0);
  let activeCount = 0;

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    if (batch.state === "gone" || batch.state === "restored") continue;

    const sz = Math.max(1, Math.round(batch.stepPx * dpr));
    const fadeDuration = batch.reduceMotion ? 0.2 : 1.15;
    let alive = 0;

    for (let i = 0; i < batch.n; i++) {
      let x: number;
      let y: number;
      let a: number;

      if (batch.state === "back") {
        const u = clamp((nowSec - batch.t1 - batch.d2[i]) / 0.68, 0, 1);
        const e = 1 - Math.pow(1 - u, 3);
        x = batch.sx[i] + (batch.hx[i] - batch.sx[i]) * e;
        y =
          batch.sy[i] +
          (batch.hy[i] - batch.sy[i]) * e -
          Math.sin(u * Math.PI) * 18 * (((i * 7919) % 13) / 13);
        a = u > 0 ? Math.min(1, 0.15 + u * 1.6) : 0;
        if (u < 1) alive++;
      } else {
        const age = nowSec - batch.t0 - batch.dl[i];
        if (age <= 0) {
          x = batch.hx[i];
          y = batch.hy[i];
          a = 1;
          alive++;
        } else {
          x = batch.hx[i] + batch.vx[i] * age + Math.sin(age * 4 + i) * 10 * age;
          y = batch.hy[i] + batch.vy[i] * age + 60 * age * age;
          a = 1 - age / fadeDuration;
          if (a > 0) alive++;
        }
      }

      batch.px[i] = x;
      batch.py[i] = y;
      if (a <= 0) continue;

      const ix = Math.round(x * dpr);
      const iy = Math.round(y * dpr);
      if (ix < 0 || iy < 0 || ix + sz > canvasW || iy + sz > canvasH) continue;

      const col = batch.col[i];
      const cc = ((col & 0x00ffffff) | (Math.round((col >>> 24) * a) << 24)) >>> 0;

      for (let yy = 0; yy < sz; yy++) {
        const row = (iy + yy) * canvasW + ix;
        for (let xx = 0; xx < sz; xx++) {
          f32[row + xx] = cc;
        }
      }
    }

    if (batch.state === "dust" && alive === 0) {
      batch.state = "gone";
      batch.onGone?.();
    } else if (batch.state === "back" && alive === 0) {
      batch.state = "restored";
      batch.onRestored?.();
    } else {
      activeCount++;
    }
  }

  return activeCount;
}
